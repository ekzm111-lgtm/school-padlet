import React, { useState, useEffect, useRef } from 'react';
import type { QuizRoom, LiveQuizState, QuizAvatar } from '@/types/quiz';
import { QUIZ_AVATARS } from '@/types/quiz';
import {
  getQuizRoom,
  loadQuizRoomAsync,
  getLiveQuizState,
  fetchLiveQuizStateAsync,
  subscribeToQuizUpdates,
  submitQuizResult,
} from '@/utils/quizStorage';
import {
  getSavedCollectedAvatars,
  collectNewChibiAvatar,
  CHIBI_WEB_KEYWORDS,
} from '@/utils/avatarCollector';
import { clientJoinRoom, clientSubmitLiveAnswer } from '@/utils/liveQuizSync';
import { getApiBaseUrl } from '@/utils/hostNetwork';
import { calculateCompetitionRanks, getRankBadgeStyle, getPodiumStyle } from '@/utils/ranking';
import { CheeringCharacter } from '@/components/quiz/CheeringCharacter';
import {
  playCorrectSound,
  playWrongSound,
  playComboSound,
} from '@/utils/soundEffects';
import { ScoreViewer } from '@/components/quiz/ScoreViewer';
import { EntryBlockViewer } from '@/components/quiz/EntryBlockViewer';
import {
  CheckCircle,
  HelpCircle,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  Award,
} from 'lucide-react';

interface QuizStudentScreenProps {
  pin: string;
  onExit: () => void;
  isSidePreview?: boolean;
}

const OPTION_COLORS = [
  { bg: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700', border: 'border-rose-600', icon: '🔺' },
  { bg: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700', border: 'border-blue-600', icon: '🔷' },
  { bg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700', border: 'border-amber-600', icon: '🟡' },
  { bg: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700', border: 'border-emerald-600', icon: '🟩' },
  { bg: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700', border: 'border-purple-600', icon: '⭐' },
];

export const QuizStudentScreen: React.FC<QuizStudentScreenProps> = ({ pin, onExit, isSidePreview = false }) => {
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [liveState, setLiveState] = useState<LiveQuizState | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);

  // 기기 감지 (PC / 모바일)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (isSidePreview) return false;
    if (typeof window === 'undefined') return false;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return !isMobileUA && window.innerWidth >= 768;
  });

  useEffect(() => {
    if (isSidePreview) {
      setIsDesktop(false);
      return;
    }
    const handleResize = () => {
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsDesktop(!isMobileUA && window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidePreview]);

  // 학생 등록 상태
  const [collectedAvatars, setCollectedAvatars] = useState<QuizAvatar[]>(() => getSavedCollectedAvatars());
  const [isCollectingWeb, setIsCollectingWeb] = useState(false);
  const [isResultCommitted, setIsResultCommitted] = useState(false);

  // 웹 2등신 치비 캐릭터 실시간 수집 핸들러
  const handleCollectRandomChibi = (keywordInfo?: typeof CHIBI_WEB_KEYWORDS[0]) => {
    setIsCollectingWeb(true);
    setTimeout(() => {
      const target =
        keywordInfo || CHIBI_WEB_KEYWORDS[Math.floor(Math.random() * CHIBI_WEB_KEYWORDS.length)];
      const cleanName = target.label.replace(/^[^\s]+\s*/, '');
      const newAv = collectNewChibiAvatar(cleanName, target.category, target.style as any);
      setCollectedAvatars((prev) => [newAv, ...prev]);
      setSelectedAvatar(newAv);
      setIsCollectingWeb(false);
    }, 300);
  };

  const allAvailableAvatars = [...collectedAvatars, ...QUIZ_AVATARS];

  const [isJoined, setIsJoined] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<QuizAvatar>(QUIZ_AVATARS[0]);
  const [avatarCategory, setAvatarCategory] = useState<'all' | 'anime' | 'animal' | 'hero'>('all');
  const [nickname, setNickname] = useState('');
  const studentIdRef = useRef<string>(`s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

  // 현재 문제 풀이 상호작용
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [shortInput, setShortInput] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // 캐릭터 응원 상태 ('thinking' | 'hurry' | 'correct' | 'wrong' | 'combo')
  const [cheerState, setCheerState] = useState<'thinking' | 'hurry' | 'correct' | 'wrong' | 'combo'>('thinking');

  // 방 및 라이브 상태 로드 & 원격 서버 동기화
  const reload = async () => {
    let r = getQuizRoom(pin);
    if (!r) {
      r = await loadQuizRoomAsync(pin);
    }
    if (r) {
      setRoom(r);
      const s = await fetchLiveQuizStateAsync(pin);
      if (s) {
        setLiveState(s);
      } else {
        const localS = getLiveQuizState(pin);
        if (localS) {
          setLiveState(localS);
        } else {
          // 서버에서 라이브 상태가 없어도 대기실 상태로 즉시 입장 허용
          setLiveState({
            pin: r.pin,
            status: 'waiting',
            currentQuestionIndex: 0,
            timeLeft: r.timePerQuestion || 20,
            totalQuestions: r.questions ? r.questions.length : 0,
            showExplanation: false,
            participants: [],
            answersSubmitted: [],
          });
        }
      }
    }
  };

  useEffect(() => {
    reload();
    // activePin을 전달하여 원격 스마트폰에서도 1초마다 실시간 서버 폴링이 작동하도록 설정
    const unsub = subscribeToQuizUpdates((msg: any) => {
      if (msg && msg.state && msg.state.pin === pin) {
        setLiveState((prev) => {
          if (!prev) return msg.state;
          if (prev.status !== 'waiting' && msg.state.status === 'waiting') {
            return { ...msg.state, status: prev.status, currentQuestionIndex: prev.currentQuestionIndex };
          }
          return msg.state;
        });
      } else if (msg && msg.type === 'STORAGE_CHANGED') {
        const latestLive = getLiveQuizState(pin);
        if (latestLive) {
          setLiveState((prev) => {
            if (!prev) return latestLive;
            if (prev.status !== 'waiting' && latestLive.status === 'waiting') {
              return { ...latestLive, status: prev.status, currentQuestionIndex: prev.currentQuestionIndex };
            }
            return latestLive;
          });
        }
      } else {
        reload();
      }
    }, pin);

    // 방 정보가 들어올 때까지 최대 8초간 1.5초 주기로 재시도
    let attempts = 0;
    const retryInterval = setInterval(async () => {
      attempts++;
      const current = getQuizRoom(pin);
      if (current) {
        setRoom(current);
        clearInterval(retryInterval);
        return;
      }
      const fetched = await loadQuizRoomAsync(pin);
      if (fetched) {
        setRoom(fetched);
        clearInterval(retryInterval);
        return;
      }
      if (attempts >= 5) {
        clearInterval(retryInterval);
        setConnectionFailed(true);
      }
    }, 1500);

    return () => {
      unsub();
      clearInterval(retryInterval);
    };
  }, [pin]);

  // 학생 타이머: 문제 번호가 바뀌거나 문제가 시작되면 학생 기기 로컬 기준 시각을 설정하여
  // 기기 간 시계 오차(145초 버그)와 네트워크 멈춤 현상 없이 정확히 1초씩 카운트다운
  const [studentTimeLeft, setStudentTimeLeft] = useState<number>(room?.timePerQuestion || 20);
  const questionStartLocalTimeRef = useRef<number>(Date.now());
  const currentQIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!liveState || liveState.status !== 'question' || !room || room.timePerQuestion <= 0) return;

    // 문제 번호가 변경되었거나 새로 시작된 경우 학생 로컬 시작 기준 시각 리셋
    if (currentQIndexRef.current !== liveState.currentQuestionIndex) {
      currentQIndexRef.current = liveState.currentQuestionIndex;
      const serverElapsed = (liveState as any).serverElapsedSec;
      const initialElapsedSec = typeof serverElapsed === 'number'
        ? Math.min(room.timePerQuestion, Math.max(0, serverElapsed))
        : 0;
      questionStartLocalTimeRef.current = Date.now() - (initialElapsedSec * 1000);
    }

    const computeRemaining = () => {
      const elapsedSec = Math.floor((Date.now() - questionStartLocalTimeRef.current) / 1000);
      return Math.min(room.timePerQuestion, Math.max(0, room.timePerQuestion - elapsedSec));
    };

    setStudentTimeLeft(computeRemaining());

    const timer = setInterval(() => {
      const rem = computeRemaining();
      setStudentTimeLeft(rem);
    }, 250);

    return () => clearInterval(timer);
  }, [liveState?.status, liveState?.currentQuestionIndex, room?.timePerQuestion]);

  // 새로운 문제가 시작되었을 때 학생 답안 리셋
  const lastQIdxRef = useRef<number>(-1);
  useEffect(() => {
    if (!liveState) return;

    if (liveState.status === 'question' && liveState.currentQuestionIndex !== lastQIdxRef.current) {
      lastQIdxRef.current = liveState.currentQuestionIndex;
      setMyAnswer(null);
      setShortInput('');
      setCheerState('thinking');
    }

    // 마감 5초 전 응원 캐릭터 반응
    if (liveState.status === 'question' && studentTimeLeft <= 5 && !myAnswer) {
      setCheerState('hurry');
    }
  }, [liveState?.status, liveState?.currentQuestionIndex, studentTimeLeft, myAnswer]);

  // 퀴즈 종료 시 학생 본인 최종 점수 및 순위 영구 저장 커밋
  useEffect(() => {
    if (liveState?.status === 'finished' && room && isJoined && !isResultCommitted) {
      setIsResultCommitted(true);
      const studentResult = {
        id: studentIdRef.current,
        pin,
        nickname: nickname || selectedAvatar.name,
        avatarId: selectedAvatar.id,
        isAnonymous: true,
        score,
        correctCount,
        totalCount: room.questions.length,
        maxCombo: combo,
        totalTimeSpent: 10,
        submittedAt: new Date().toLocaleTimeString(),
        answers: [],
      };
      // 1. 로컬 저장소 커밋
      submitQuizResult(studentResult);
      // 2. 서버 커밋
      fetch(`${getApiBaseUrl()}/api/quiz/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentResult),
      }).catch(() => {});
    }
  }, [liveState?.status, room, isJoined, isResultCommitted, nickname, score, correctCount, combo, selectedAvatar]);

  const currentQ = (room && liveState && liveState.currentQuestionIndex >= 0)
    ? room.questions[liveState.currentQuestionIndex]
    : null;

  // 1. 학생 입장 등록 핸들러
  const handleJoin = async () => {
    let finalNick = nickname.trim();
    if (!finalNick) {
      finalNick = `${selectedAvatar.name.split(' ')[0]} ${Math.floor(10 + Math.random() * 90)}`;
      setNickname(finalNick);
    }

    await clientJoinRoom(pin, {
      id: studentIdRef.current,
      nickname: finalNick,
      avatarId: selectedAvatar.id,
      avatarUrl: selectedAvatar.imageUrl,
      avatarEmoji: selectedAvatar.emoji,
    });
    setIsJoined(true);
  };

  // 2. 답안 제출 핸들러
  const handleSubmitAnswer = async (ans: string) => {
    if (myAnswer || !currentQ || !liveState || !room || liveState.status !== 'question') return;
    setMyAnswer(ans);

    let isCorrect = false;
    if (currentQ.type === 'multiple-choice') {
      isCorrect = String(ans) === String(currentQ.correctAnswer);
    } else {
      const u = ans.trim().toLowerCase().replace(/\s+/g, '');
      const c = currentQ.correctAnswer.trim().toLowerCase().replace(/\s+/g, '');
      isCorrect = u === c || c.includes(u);
    }

    let pointsEarned = 0;
    const accurateRemaining = studentTimeLeft;

    if (isCorrect) {
      const basePoints = (currentQ.points || 5) * 100;
      const speedBonus = accurateRemaining > 0 ? accurateRemaining * 10 : 50;
      const newCombo = combo + 1;
      pointsEarned = basePoints + speedBonus + (newCombo - 1) * 50;

      setCombo(newCombo);
      setCorrectCount((prev) => prev + 1);
      setScore((prev) => prev + pointsEarned);

      if (newCombo >= 2) {
        setCheerState('combo');
        playComboSound();
      } else {
        setCheerState('correct');
        playCorrectSound();
      }
    } else {
      setCombo(0);
      setCheerState('wrong');
      playWrongSound();
    }

    await clientSubmitLiveAnswer(
      pin,
      studentIdRef.current,
      ans,
      isCorrect,
      Math.max(0, Math.min(room.timePerQuestion, room.timePerQuestion - accurateRemaining)),
      pointsEarned,
      liveState.currentQuestionIndex
    );
  };

  // 3. 키보드 숫자키 (1~5) 단축키 이벤트 리스너 (조건부 return 이전에 항상 등록)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (!liveState || liveState.status !== 'question' || myAnswer) return;
      if (!currentQ || currentQ.type !== 'multiple-choice') return;

      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= currentQ.options.length) {
        e.preventDefault();
        handleSubmitAnswer(String(keyNum));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [liveState?.status, liveState?.currentQuestionIndex, myAnswer, currentQ]);

  // 방 로딩 실패 또는 연결 중 뷰
  if (!room || !liveState) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-sm w-full space-y-4 shadow-2xl">
          {connectionFailed ? (
            <>
              <HelpCircle size={48} className="text-amber-400 mx-auto" />
              <h2 className="text-lg font-bold">존재하지 않거나 종료된 퀴즈룸입니다.</h2>
              <p className="text-xs text-slate-400">PIN 번호({pin})를 다시 확인해주세요.</p>
              <button
                onClick={() => {
                  setConnectionFailed(false);
                  reload();
                }}
                className="w-full py-2.5 bg-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-500 transition shadow-sm"
              >
                🔄 다시 연결 시도
              </button>
              <button
                onClick={onExit}
                className="w-full py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-700 transition"
              >
                돌아가기
              </button>
            </>
          ) : (
            <>
              <Loader2 size={44} className="text-indigo-400 mx-auto animate-spin" />
              <h2 className="text-lg font-bold">선생님 퀴즈룸에 연결하는 중...</h2>
              <p className="text-xs text-slate-400 font-mono">PIN: {pin}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // 필터링된 아바타 목록 (웹 수집 아바타 포함)
  const displayedAvatars = allAvailableAvatars.filter((av) => {
    if (avatarCategory === 'all') return true;
    if (avatarCategory === 'anime') return av.category === 'anime';
    if (avatarCategory === 'animal') return av.category === 'animal';
    if (avatarCategory === 'hero') return av.category === 'hero';
    return true;
  });

  // 입장 전 화면 (캐릭터 & 닉네임 선택)
  if (!isJoined) {
    return (
      <div className={`bg-slate-950 text-white flex flex-col items-center justify-center ${
        isSidePreview ? 'h-full overflow-y-auto p-3' : 'min-h-screen p-4'
      }`}>
        <div className={`bg-slate-900 border border-slate-800 rounded-3xl w-full shadow-2xl space-y-4 ${
          isSidePreview ? 'p-4 my-auto max-w-sm' : 'p-6 sm:p-8 max-w-md space-y-5'
        }`}>
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold">
              {isDesktop && !isSidePreview ? (
                <>
                  <Monitor size={14} className="text-indigo-400" />
                  <span>컴퓨터(PC) 참가자 모드</span>
                </>
              ) : (
                <>
                  <Smartphone size={14} className="text-indigo-400" />
                  <span>스마트폰 참가자 모드</span>
                </>
              )}
            </span>
            <h1 className={`${isSidePreview ? 'text-xl' : 'text-2xl'} font-black text-white pt-1`}>
              선생님 라이브 퀴즈 입장
            </h1>
            <p className="text-xs text-slate-400">
              PIN: <strong className="text-amber-400 font-mono text-sm">{room.pin}</strong> · {room.title}
            </p>
          </div>

          {/* 애니메이션 & 마스코트 캐릭터 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>🎨 내 응원 캐릭터 ({allAvailableAvatars.length}종)</span>
              <span className="text-amber-400 font-extrabold text-[11px] bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                {selectedAvatar.imageUrl ? (
                  <img src={selectedAvatar.imageUrl} alt="" className="w-4 h-4 rounded-full inline" />
                ) : (
                  <span>{selectedAvatar.emoji}</span>
                )}
                <span>{selectedAvatar.name}</span>
              </span>
            </div>

            {/* 🌐 웹 2등신 캐릭터 자동 수집 버튼 */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isCollectingWeb}
                onClick={() => handleCollectRandomChibi()}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                {isCollectingWeb ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>웹에서 캐릭터 수집 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-amber-300" />
                    <span>🌐 웹 2등신 캐릭터 자동 수집/뽑기!</span>
                  </>
                )}
              </button>
            </div>

            {/* 카테고리 필터 탭 */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl text-[11px] font-bold border border-slate-800">
              <button
                type="button"
                onClick={() => setAvatarCategory('all')}
                className={`py-1.5 rounded-lg transition ${avatarCategory === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('anime')}
                className={`py-1.5 rounded-lg transition ${avatarCategory === 'anime' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🌟 인기만화
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('animal')}
                className={`py-1.5 rounded-lg transition ${avatarCategory === 'animal' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🐾 귀요미
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('hero')}
                className={`py-1.5 rounded-lg transition ${avatarCategory === 'hero' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🎮 영웅·과목
              </button>
            </div>

            {/* 아바타 선택 그리드 (2등신 고화질 일러스트 렌더링) */}
            <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 max-h-56 overflow-y-auto">
              {displayedAvatars.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center transition active:scale-95 overflow-hidden ${
                    selectedAvatar.id === av.id
                      ? `${av.bgColor} ring-2 ring-white scale-105 shadow-lg`
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {av.imageUrl ? (
                    <img
                      src={av.imageUrl}
                      alt={av.name}
                      className="w-10 h-10 object-contain drop-shadow-sm pointer-events-none"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{av.emoji}</span>
                  )}
                  <span className="text-[10px] truncate w-full text-center mt-0.5 font-bold">
                    {av.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-300 italic text-center bg-slate-800/40 py-1.5 px-3 rounded-lg border border-slate-800">
              &quot;{selectedAvatar.catchphrase}&quot;
            </p>
          </div>

          {/* 닉네임 입력 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              닉네임 (또는 이름/학번)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 3반 김엔트리"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-bold"
            />
          </div>

          <button
            onClick={handleJoin}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl transition"
          >
            퀴즈룸 입장하기!
          </button>
        </div>
      </div>
    );
  }

  // 입장 후 라이브 화면
  return (
    <div className={`w-full bg-slate-950 text-white flex flex-col justify-between font-sans select-none overflow-x-hidden ${
      isSidePreview ? 'h-full overflow-y-auto' : 'min-h-screen'
    }`}>
      {/* 상단 학생 헤더 */}
      <header className={`bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 shrink-0 ${
        isSidePreview ? 'px-3 h-12' : 'px-4 h-14'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
            {selectedAvatar.imageUrl ? (
              <img src={selectedAvatar.imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
            ) : (
              <span className="text-lg sm:text-xl">{selectedAvatar.emoji}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-black text-xs text-white leading-tight truncate">
              {nickname}
            </div>
            <div className="text-[10px] text-amber-400 font-mono font-bold truncate">
              {score}점 {combo >= 2 ? `🔥 ${combo} COMBO` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0 whitespace-nowrap">
            {isDesktop && !isSidePreview ? (
              <>
                <Monitor size={11} className="text-cyan-400" />
                <span>PC</span>
              </>
            ) : (
              <>
                <Smartphone size={11} className="text-emerald-400" />
                <span>스마트폰</span>
              </>
            )}
          </span>

          {liveState.status === 'question' && room.timePerQuestion > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black shrink-0 whitespace-nowrap min-w-[38px] text-center ${
              studentTimeLeft <= 5 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-amber-400 border border-slate-700'
            }`}>
              {studentTimeLeft}초
            </span>
          )}
          {liveState.status === 'reveal' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse shrink-0 whitespace-nowrap">
              정답 공개
            </span>
          )}
          <button
            onClick={() => {
              try {
                window.close();
              } catch {}
              onExit();
            }}
            className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition shrink-0 whitespace-nowrap"
          >
            나가기
          </button>
        </div>
      </header>

      {/* 상단 60fps 부드러운 시간 진행 바 */}
      {liveState.status === 'question' && room.timePerQuestion > 0 && (
        <div className="w-full bg-slate-900 h-1.5 overflow-hidden sticky top-12 sm:top-14 z-20 shrink-0">
          <div
            key={`student-timer-${liveState.currentQuestionIndex}`}
            className={`h-full transition-[width] duration-300 ease-linear ${
              studentTimeLeft <= 5 ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
            }`}
            style={{
              width: `${Math.max(0, Math.min(100, (studentTimeLeft / room.timePerQuestion) * 100))}%`,
            }}
          />
        </div>
      )}

      {/* 중앙 콘텐츠: 교사의 라이브 상태에 따라 동기화 */}
      <main className={`flex-1 w-full mx-auto flex flex-col justify-between ${
        isSidePreview ? 'p-2.5 max-w-full space-y-3' : isDesktop ? 'max-w-3xl p-5 space-y-4' : 'max-w-lg p-3 sm:p-4 space-y-3'
      }`}>
        {/* 1. 교사 시작 대기 중 (실시간 대기실) */}
        {liveState.status === 'waiting' && (
          <div className="my-auto text-center space-y-4 animate-in fade-in duration-300 py-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 border border-indigo-500/40 flex items-center justify-center overflow-hidden shadow-2xl animate-bounce p-2">
              {selectedAvatar.imageUrl ? (
                <img src={selectedAvatar.imageUrl} alt="" className="w-full h-full object-contain drop-shadow-md" />
              ) : (
                <span className="text-5xl sm:text-6xl">{selectedAvatar.emoji}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>입장 완료! 준비되었습니다</span>
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white break-keep leading-snug">
                선생님이 퀴즈를 시작하기를 기다리는 중입니다...
              </h2>
              <p className="text-xs text-slate-400 break-keep leading-relaxed px-2">
                선생님이 칠판/화면에서 <strong className="text-amber-400">시작 버튼</strong>을 누르면 곧바로 첫 번째 문제가 시작됩니다!
              </p>
            </div>

            {/* 현재 대기 중인 친구들 인원 배지 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 inline-flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="text-indigo-400">👥</span>
              <span>대기 중인 친구: <strong className="text-amber-400 font-mono text-sm">{liveState.participants.length}</strong>명</span>
            </div>

            {/* 응원 캐릭터 대기 말풍선 */}
            <div className="pt-1 flex justify-center">
              <CheeringCharacter
                avatar={selectedAvatar}
                state="thinking"
                comboCount={0}
              />
            </div>
          </div>
        )}

        {/* 2. 문제 출제 중: 상하 1열 모바일 전용 반응형 레이아웃 */}
        {liveState.status === 'question' && currentQ && (
          <div className="flex-1 flex flex-col justify-between space-y-3">
            {/* 상단 문제 카드: 100% 전폭으로 지문과 블록이 세로로 찌그러지지 않음 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="text-indigo-400 font-black">
                  문제 {liveState.currentQuestionIndex + 1} / {room.questions.length}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-full text-[11px] text-slate-300 font-mono">
                  {currentQ.points}점
                </span>
              </div>

              {/* 지문: 단어 단위 줄바꿈 유지 break-keep */}
              <h3 className="text-sm sm:text-base font-bold text-white leading-relaxed break-keep">
                {currentQ.title}
              </h3>

              {/* 엔트리 블록 or 악보 (가로 스크롤 허용으로 찌그러짐 원천 차단) */}
              {currentQ.entryBlocks && currentQ.entryBlocks.length > 0 && (
                <div className="my-2 max-w-full overflow-x-auto rounded-xl bg-slate-950/60 p-2 border border-slate-800/80">
                  <EntryBlockViewer blocks={currentQ.entryBlocks} />
                </div>
              )}
              {currentQ.hasScore && currentQ.scoreAbc && (
                <div className="my-2 bg-white p-2 rounded-xl max-w-full overflow-x-auto">
                  <ScoreViewer abcNotation={currentQ.scoreAbc} scale={isDesktop && !isSidePreview ? 1.0 : 0.75} showAudioControls={currentQ.hasAudio} />
                </div>
              )}
              {currentQ.imageUrl && (
                <div className="my-2 text-center max-w-full">
                  <img
                    src={currentQ.imageUrl}
                    alt="문제 예시"
                    className="max-h-56 mx-auto rounded-xl border border-slate-700 max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* 하단 답안 선택 버튼 또는 제출 완료 안내 */}
            <div className="space-y-2 flex-1 flex flex-col justify-end">
              {!myAnswer ? (
                currentQ.type === 'multiple-choice' ? (
                  <div className="grid grid-cols-1 gap-2">
                    {isDesktop && !isSidePreview && (
                      <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between px-1">
                        <span>보기 선택 (클릭 또는 키보드 숫자키)</span>
                        <span className="text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800">
                          단축키: 1 ~ {currentQ.options.length}번
                        </span>
                      </div>
                    )}
                    {currentQ.options.map((opt, optIdx) => {
                      const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSubmitAnswer(String(optIdx + 1))}
                          className={`p-3 rounded-xl sm:rounded-2xl border-b-4 font-bold text-left transition transform active:scale-98 flex items-center gap-2.5 text-white ${color.bg} ${color.border} w-full shadow-md`}
                        >
                          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/25 flex items-center justify-center text-xs sm:text-sm font-mono shrink-0">
                            {color.icon}
                          </span>
                          <span className="text-xs sm:text-sm flex-1 leading-snug break-keep min-w-0 font-medium">
                            {opt}
                          </span>
                          {isDesktop && !isSidePreview && (
                            <span className="text-[11px] font-mono font-black bg-black/30 px-2 py-1 rounded-lg border border-white/20 shrink-0">
                              [{optIdx + 1}]
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shortInput}
                        onChange={(e) => setShortInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSubmitAnswer(shortInput);
                        }}
                        placeholder="정답을 입력하세요 (엔터로 제출)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500 font-bold"
                      />
                      <button
                        onClick={() => handleSubmitAnswer(shortInput)}
                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm transition shrink-0"
                      >
                        제출
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">엔터(Enter) 키를 누르면 바로 제출됩니다.</p>
                  </div>
                )
              ) : (
                /* 제출 완료 대기 상태 */
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-center space-y-2 animate-in zoom-in-95 duration-200">
                  <CheckCircle size={32} className="text-emerald-400 mx-auto animate-bounce" />
                  <div className="font-black text-sm sm:text-base text-white">답안 제출 완료!</div>
                  <p className="text-xs text-slate-400 break-keep">
                    선생님이 정답을 공개할 때까지 잠시 기다려주세요.
                  </p>
                </div>
              )}

              {/* 실시간 캐릭터 응원 */}
              <div className="pt-1 flex justify-end">
                <CheeringCharacter
                  avatar={selectedAvatar}
                  state={cheerState}
                  comboCount={combo}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. 선생님이 정답 & 문제풀이 공개했을 때 */}
        {liveState.status === 'reveal' && currentQ && (
          <div className="my-auto space-y-5 animate-in fade-in duration-300">
            <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 text-center space-y-3 shadow-2xl">
              <div className="text-5xl">
                {String(myAnswer) === String(currentQ.correctAnswer) ? '🎉' : '🥺'}
              </div>
              <h3 className="text-xl font-black text-white">
                {String(myAnswer) === String(currentQ.correctAnswer)
                  ? '정답입니다! 대단해요!'
                  : '아쉬워요! 다음 문제 파이팅!'}
              </h3>
              <div className="text-xs text-emerald-400 font-bold bg-emerald-950/80 py-2 px-3 rounded-xl border border-emerald-500/40 inline-block">
                정답: {currentQ.type === 'multiple-choice' ? `${currentQ.correctAnswer}번 (${currentQ.options[Number(currentQ.correctAnswer) - 1] || ''})` : currentQ.correctAnswer}
              </div>
              <p className="text-xs text-slate-300 pt-1">
                칠판(선생님 화면)에 띄워진 <strong className="text-indigo-400 font-bold">선생님의 문제풀이 해설</strong>을 함께 확인하세요!
              </p>
            </div>

            {/* 응원 캐릭터가 축하 또는 위로 대사 전달 */}
            <div className="flex justify-end">
              <CheeringCharacter
                avatar={selectedAvatar}
                state={String(myAnswer) === String(currentQ.correctAnswer) ? 'correct' : 'wrong'}
                comboCount={combo}
              />
            </div>
          </div>
        )}

        {/* 4. 최종 종료 (실시간 순위, 1~3위 시상대, 내 등수 및 전원 순위표) */}
        {liveState.status === 'finished' && (() => {
          // 순위 계산
          const rawList = Array.isArray(liveState.participants) ? [...liveState.participants] : [];
          // 내가 목록에 없으면 추가, 있으면 내 최신 점수 반영
          const myParticipantIndex = rawList.findIndex((p) => p.id === studentIdRef.current);
          if (myParticipantIndex >= 0) {
            rawList[myParticipantIndex] = {
              ...rawList[myParticipantIndex],
              score: Math.max(rawList[myParticipantIndex].score || 0, score),
              correctCount: Math.max(rawList[myParticipantIndex].correctCount || 0, correctCount),
            };
          } else {
            rawList.push({
              id: studentIdRef.current,
              nickname: nickname || selectedAvatar.name,
              avatarId: selectedAvatar.id,
              score,
              correctCount,
            } as any);
          }

          // 표준 경쟁 순위 계산 (동점자는 동일 등수, 다음 등수는 동점자 수만큼 건너뜀)
          const ranked = calculateCompetitionRanks(rawList);
          const myEntry = ranked.find((p) => p.id === studentIdRef.current);
          const myRank = myEntry ? myEntry.rank : 1;
          const totalCount = ranked.length;

          const top1 = ranked[0];
          const top2 = ranked[1];
          const top3 = ranked[2];

          // 아바타 검색 헬퍼
          const getAvatarForP = (avatarId?: string) => {
            return allAvailableAvatars.find((a) => a.id === avatarId) || selectedAvatar;
          };

          return (
            <div className="py-4 space-y-6 max-w-xl w-full mx-auto animate-in zoom-in-95 duration-300">
              {/* 상단 축하 배너 & 내 최종 순위 배지 */}
              <div className="text-center space-y-2">
                <div className="text-5xl animate-bounce">
                  {myRank === 1 ? '👑' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🏆'}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  퀴즈 챌린지 완주!
                </h2>

                {/* 내 순위 하이라이트 박스 */}
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 border-2 border-amber-400/50 shadow-xl">
                  <Award size={20} className="text-amber-400" />
                  <span className="text-sm sm:text-base font-extrabold text-white">
                    내 순위:{' '}
                    <strong className="text-amber-300 text-lg sm:text-xl font-black">
                      {myRank === 1
                        ? '🥇 1위 (챔피언!)'
                        : myRank === 2
                        ? '🥈 2위 (준우승!)'
                        : myRank === 3
                        ? '🥉 3위'
                        : `${myRank}위`}
                    </strong>
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / 전체 {totalCount}명 중
                    </span>
                  </span>
                </div>

                <div className="flex justify-center gap-4 text-xs pt-1 font-bold">
                  <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-amber-400 font-mono">
                    내 점수: {score}점
                  </span>
                  <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-emerald-400">
                    맞힌 문제: {correctCount} / {room.questions.length}문항
                  </span>
                </div>
              </div>

              {/* 1~3위 메달 시상대 (Podium) */}
              {totalCount >= 1 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl">
                  <h3 className="text-xs font-black text-slate-400 text-center uppercase tracking-wider mb-4">
                    🏆 명예의 전당 Top 3
                  </h3>

                  <div className="flex items-end justify-center gap-2 sm:gap-3 pt-6 pb-2">
                    {(() => {
                      const displaySlots = [];
                      if (top2) displaySlots.push({ p: top2, key: 'student-slot-2' });
                      if (top1) displaySlots.push({ p: top1, key: 'student-slot-1' });
                      if (top3) displaySlots.push({ p: top3, key: 'student-slot-3' });

                      const rankCounts = ranked.reduce((acc: Record<number, number>, curr: any) => {
                        acc[curr.rank] = (acc[curr.rank] || 0) + 1;
                        return acc;
                      }, {});

                      return displaySlots.map(({ p, key }) => {
                        const isTie = (rankCounts[p.rank] || 0) > 1;
                        const style = getPodiumStyle(p.rank, isTie, false);
                        const avatar = getAvatarForP(p.avatarId);

                        return (
                          <div
                            key={key}
                            className={`flex-1 flex flex-col items-center max-w-[120px] ${style.marginClass} transition-all duration-300`}
                          >
                            {/* 왕관 영역 */}
                            <div className="h-6 flex items-center justify-center">
                              {style.hasCrown ? (
                                <span className="text-xl animate-bounce">👑</span>
                              ) : (
                                <div className="h-6" />
                              )}
                            </div>

                            {/* 아바타 */}
                            <div
                              className={`${style.avatarSizeClass} rounded-2xl ${style.avatarRingClass} flex items-center justify-center overflow-hidden mb-1 shadow-md transition-all duration-300`}
                            >
                              {avatar.imageUrl ? (
                                <img
                                  src={avatar.imageUrl}
                                  alt=""
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <span className="text-2xl">{avatar.emoji}</span>
                              )}
                            </div>

                            {/* 닉네임 */}
                            <div
                              className={`text-[11px] font-bold truncate max-w-full text-center ${style.textColorClass}`}
                            >
                              {p.nickname}
                            </div>

                            {/* 점수 */}
                            <div className="text-[10px] font-mono text-slate-300 font-bold mb-1">
                              {(p.score || 0).toLocaleString()}점
                            </div>

                            {/* 동적 단상 받침대 (순위가 같으면 동일한 높이와 동일한 스타일!) */}
                            <div
                              className={`w-full ${style.heightClass} ${style.bgClass} ${style.borderClass} rounded-t-xl flex flex-col items-center justify-center text-white transition-all duration-300`}
                            >
                              <span className="text-xl">{style.medal}</span>
                              <span className="text-[10px] font-black tracking-tight">
                                {style.label}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* 전체 참가자 실시간 순위표 리스트 */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span>📊 전체 참가자 순위표 ({totalCount}명)</span>
                  <span>획득 점수</span>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {ranked.map((p, idx) => {
                    const isMe = p.id === studentIdRef.current;
                    const pAvatar = getAvatarForP(p.avatarId);
                    const rankStyle = getRankBadgeStyle(p.rank);
                    return (
                      <div
                        key={p.id || idx}
                        className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition ${
                          isMe
                            ? 'bg-indigo-600/30 border-2 border-indigo-500 shadow-md ring-1 ring-indigo-400'
                            : 'bg-slate-950/80 border border-slate-800 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${rankStyle.badgeClass}`}
                          >
                            {p.rank}
                          </span>

                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                            {pAvatar.imageUrl ? (
                              <img src={pAvatar.imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="text-base">{pAvatar.emoji}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                              <span>{p.nickname}</span>
                              {isMe && (
                                <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.2 rounded-md font-black shrink-0">
                                  👑 나
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {pAvatar.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm sm:text-base font-black text-amber-400 font-mono">
                            {p.score || 0}점
                          </div>
                          {p.correctCount !== undefined && (
                            <div className="text-[10px] text-slate-400">
                              {p.correctCount}문항 정답
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 하단 나가기 버튼 */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={onExit}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl border border-slate-700 transition shadow-lg"
                >
                  퀴즈 종료 및 나가기
                </button>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
};
