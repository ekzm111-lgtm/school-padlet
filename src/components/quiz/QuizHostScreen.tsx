import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import type { QuizRoom, LiveQuizState } from '@/types/quiz';
import { QUIZ_AVATARS } from '@/types/quiz';
import {
  getQuizRoom,
  loadQuizRoomAsync,
  getLiveQuizState,
  setLiveQuizState,
  fetchLiveQuizStateAsync,
  subscribeToQuizUpdates,
  submitQuizResult,
  getRoomLeaderboard,
  mergeParticipantsList,
  mergeAnswersList,
} from '@/utils/quizStorage';
import {
  hostStartQuiz,
  hostRevealAnswer,
  hostNextQuestion,
} from '@/utils/liveQuizSync';
import { getSavedCollectedAvatars } from '@/utils/avatarCollector';
import { getHostIp, setCustomHostIp, getStudentJoinUrl, getApiBaseUrl, isLocalFileProtocol } from '@/utils/hostNetwork';
import { calculateCompetitionRanks, getRankBadgeStyle, getPodiumStyle } from '@/utils/ranking';
import { ScoreViewer } from '@/components/quiz/ScoreViewer';
import { EntryBlockViewer } from '@/components/quiz/EntryBlockViewer';
import { QuizStudentScreen } from '@/components/quiz/QuizStudentScreen';
import {
  playVictorySound,
  playCorrectSound,
} from '@/utils/soundEffects';
import { bgmEngine } from '@/utils/bgmEngine';
import {
  Users,
  Clock,
  Play,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Trophy,
  QrCode,
  Smartphone,
  BookOpen,
  Copy,
  Check,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';

interface QuizHostScreenProps {
  pin: string;
  onExit: () => void;
  onViewLeaderboard?: (pin: string) => void;
  initialReviewMode?: boolean;
}

export const QuizHostScreen: React.FC<QuizHostScreenProps> = ({
  pin,
  onExit,
  onViewLeaderboard: _onViewLeaderboard,
  initialReviewMode = false,
}) => {
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [liveState, setLiveState] = useState<LiveQuizState | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  // 사용자 요청: 순위보기 눌렀을 때 튕겨나가지 않고 화면 안에서 모달로 순위표 보기
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  // 사용자 요청: 같이 문제 풀이는 따로 분리해서 제공 (선생님과 함께하는 전자칠판 풀이 모드)
  const [showReviewMode, setShowReviewMode] = useState<boolean>(Boolean(initialReviewMode));
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

  // pin 또는 initialReviewMode 변경 시 풀이 모드 상태 재설정
  useEffect(() => {
    setShowReviewMode(Boolean(initialReviewMode));
  }, [initialReviewMode, pin]);

  // 룸 및 실시간 상태 로드 (로컬 + 서버 비동기 동기화)
  const reload = async () => {
    let r = getQuizRoom(pin);
    if (!r) {
      r = await loadQuizRoomAsync(pin);
    }
    if (r) {
      setRoom(r);
      // 서버에 방 정보 무조건 즉시 동기화 (원격 스마트폰 학생 100% 즉시 입장 보장)
      fetch(`${getApiBaseUrl()}/api/quiz/room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      }).catch(() => {});
    }

    // 서버의 실시간 최신 상태(스마트폰 참가자 포함) 조회
    const s = await fetchLiveQuizStateAsync(pin);
    if (s) {
      setLiveState((prev) => {
        if (!prev) return s;
        return {
          ...s,
          participants: mergeParticipantsList(prev.participants, s.participants),
          answersSubmitted: mergeAnswersList(prev.answersSubmitted, s.answersSubmitted),
        };
      });
    } else {
      const localS = getLiveQuizState(pin);
      if (localS) {
        setLiveState((prev) => {
          if (!prev) return localS;
          return {
            ...localS,
            participants: mergeParticipantsList(prev.participants, localS.participants),
            answersSubmitted: mergeAnswersList(prev.answersSubmitted, localS.answersSubmitted),
          };
        });
      } else if (r) {
        const initialLive: LiveQuizState = {
          pin: r.pin,
          status: 'waiting',
          currentQuestionIndex: 0,
          timeLeft: r.timePerQuestion || 20,
          totalQuestions: r.questions ? r.questions.length : 0,
          showExplanation: false,
          participants: [],
          answersSubmitted: [],
        };
        setLiveQuizState(initialLive);
        setLiveState(initialLive);
      }
    }
  };

  useEffect(() => {
    reload();
    // activePin을 전달해야 서버 폴링(1초 주기)이 활성화되어 원격 스마트폰 참가자 실시간 감지 가능
    const unsub = subscribeToQuizUpdates((msg: any) => {
      if (msg && msg.state && msg.state.pin === pin) {
        setLiveState((prev) => {
          if (!prev) return msg.state;
          const mergedParticipants = mergeParticipantsList(prev.participants, msg.state.participants);
          const mergedAnswers = mergeAnswersList(prev.answersSubmitted, msg.state.answersSubmitted);
          return {
            ...msg.state,
            status: prev.status,
            currentQuestionIndex: prev.currentQuestionIndex,
            questionStartedAt: prev.questionStartedAt || msg.state.questionStartedAt,
            timeLeft: prev.timeLeft,
            participants: mergedParticipants,
            answersSubmitted: mergedAnswers,
          };
        });
      } else if (msg && msg.type === 'STORAGE_CHANGED') {
        const latestLive = getLiveQuizState(pin);
        if (latestLive) {
          setLiveState((prev) => {
            if (!prev) return latestLive;
            const mergedParticipants = mergeParticipantsList(prev.participants, latestLive.participants);
            const mergedAnswers = mergeAnswersList(prev.answersSubmitted, latestLive.answersSubmitted);
            return {
              ...latestLive,
              status: prev.status,
              currentQuestionIndex: prev.currentQuestionIndex,
              questionStartedAt: prev.questionStartedAt || latestLive.questionStartedAt,
              timeLeft: prev.timeLeft,
              participants: mergedParticipants,
              answersSubmitted: mergedAnswers,
            };
          });
        }
      } else {
        reload();
      }
    }, pin);
    return () => unsub();
  }, [pin]);

  // 배경음악(BGM) 상태 및 실시간 구독
  const [bgmState, setBgmState] = useState(bgmEngine.getStatus());

  useEffect(() => {
    const unsub = bgmEngine.subscribe(() => {
      setBgmState(bgmEngine.getStatus());
    });
    // 대기실 입장 시 기본 BGM 재생 시도 (사용자 상호작용 후 소리 시작)
    bgmEngine.play('lobby');

    return () => {
      unsub();
      bgmEngine.stop();
    };
  }, []);

  // 퀴즈 진행 상태에 따른 테마 BGM 자동 전환
  useEffect(() => {
    if (!liveState) return;
    if (liveState.status === 'waiting') {
      bgmEngine.play('lobby');
    } else if (liveState.status === 'question' || liveState.status === 'countdown') {
      bgmEngine.play('quiz'); // 문제 풀이 중에는 긴장감 넘치는 퀴즈 테마
    } else if (liveState.status === 'reveal') {
      bgmEngine.play('lobby'); // 정답 공개 시에는 차분한 멜로디
    } else if (liveState.status === 'finished') {
      bgmEngine.play('victory'); // 최종 시상대 및 결과 발표
    }
  }, [liveState?.status]);

  // 네트워크 IP 상태 및 URL 복사 피드백
  const [currentHostIp, setCurrentHostIp] = useState<string>(getHostIp());
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [tempIpInput, setTempIpInput] = useState<string>(getHostIp());
  const [copiedUrl, setCopiedUrl] = useState(false);

  // 로컬 서버 가동 여부 실시간 헬스체크 (스마트폰 접속 가능 여부 판별)
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/quiz/room?pin=${pin}`, { method: 'GET' });
        const online = res.ok || res.status === 404;
        if (isMounted) setIsServerOnline(online);
        // 서버가 연결된 상태라면 현재 방 정보가 서버에 누락되지 않도록 자동 동기화
        if (online && room) {
          fetch(`${getApiBaseUrl()}/api/quiz/room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(room),
          }).catch(() => {});
        }
      } catch {
        if (isMounted) setIsServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pin, room]);

  // 휴대폰 접속 URL (localhost가 아닌 실제 네트워크 IP 기반)
  const studentJoinUrl = room ? getStudentJoinUrl(room.pin, currentHostIp) : '';

  // QR 코드 생성 (IP 기반 URL)
  useEffect(() => {
    if (!room || !studentJoinUrl) return;
    QRCode.toDataURL(studentJoinUrl, {
      width: 280,
      margin: 1.5,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch((err) => {
        console.error('QR generation error:', err);
        // 실패 시 PIN 번호 전용 QR이라도 생성
        QRCode.toDataURL(`PIN:${room.pin}`, { width: 280, margin: 1.5 }).then(setQrDataUrl);
      });
  }, [room, studentJoinUrl]);

  const handleCopyStudentUrl = async () => {
    if (!studentJoinUrl) return;
    try {
      await navigator.clipboard.writeText(studentJoinUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      alert(`접속 주소:\n${studentJoinUrl}`);
    }
  };

  const handleSaveIp = () => {
    const trimmed = tempIpInput.trim();
    if (trimmed) {
      setCustomHostIp(trimmed);
      setCurrentHostIp(trimmed);
      setIsEditingIp(false);
    }
  };

  // 사용자 요청: 선생 시작 시 기본이 자동으로 문제 넘김 모드 (원할 때 수동 토글 가능)
  const [isAutoAdvance, setIsAutoAdvance] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number>(5);
  // 문항별 시작 시각 영구 보관 (학생 답안 제출/외부 메시지 수신/리렌더링 시에도 절대 리셋되지 않음)
  const questionStartTimesRef = useRef<Record<number, number>>({});
  const questionStartedAtRef = useRef<number>(Date.now());
  const [timerTick, setTimerTick] = useState<number>(0);

  // 퀴즈 시작 (첫 문제)
  const handleStartQuiz = () => {
    const now = Date.now();
    questionStartTimesRef.current[0] = now;
    const updated = hostStartQuiz(pin);
    if (updated) {
      updated.questionStartedAt = now;
      updated.updatedAt = now;
      setLiveState(updated);
    }
  };

  // 정답 및 문제풀이 공개
  const handleRevealAnswer = () => {
    const updated = hostRevealAnswer(pin);
    if (updated) {
      updated.updatedAt = Date.now();
      setLiveState(updated);
    }
    playCorrectSound();
  };

  // 다음 문제로 이동
  const handleNextQuestion = () => {
    const nextIdx = (liveState?.currentQuestionIndex ?? 0) + 1;
    const now = Date.now();
    questionStartTimesRef.current[nextIdx] = now;
    const updated = hostNextQuestion(pin);
    if (updated) {
      updated.questionStartedAt = now;
      updated.updatedAt = now;
      setLiveState(updated);
      if (updated.status === 'finished') {
        playVictorySound();
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });

        // 사용자 요청: 마지막 문제 끝나고 전체 순위가 확실히 나오도록 참가자 전원 결과 자동 저장
        if (room && updated.participants && updated.participants.length > 0) {
          const answersList = updated.answersSubmitted || [];
          const savedResults = getRoomLeaderboard(room.pin) || [];
          updated.participants.forEach((p) => {
            const answersSum = answersList
              .filter((a: any) => a.participantId === p.id)
              .reduce((sum: number, a: any) => sum + (Number(a.scoreEarned) || 0), 0);
            const savedItem = savedResults.find((r) => r.id === p.id);
            const savedScore = savedItem ? (savedItem.score || 0) : 0;
            const finalScore = Math.max(p.score || 0, answersSum, savedScore);
            const correctCount = answersList.filter((a: any) => a.participantId === p.id && a.isCorrect).length;

            submitQuizResult({
              id: p.id,
              pin: room.pin,
              nickname: p.nickname,
              avatarId: p.avatarId,
              isAnonymous: room.allowAnonymous,
              score: finalScore,
              correctCount: Math.max(correctCount, savedItem?.correctCount || 0, Math.floor(finalScore / 100)),
              totalCount: room.questions.length,
              maxCombo: Math.max(1, savedItem?.maxCombo || 1),
              totalTimeSpent: 10,
              submittedAt: new Date().toLocaleString(),
              answers: [],
            });
          });
        }
      }
    }
  };

  // 현재 문제의 제출자만 정확히 필터링 (이전 문제 제출자가 남아 오작동하는 현상 방지)
  const currentQAnswers = liveState
    ? (liveState.answersSubmitted || []).filter(
        (a: any) => a.questionIndex === undefined || a.questionIndex === liveState.currentQuestionIndex
      )
    : [];
  const participantCount = liveState ? (liveState.participants || []).length : 0;
  const submittedCount = currentQAnswers.length;

  // 실시간 점수 순위표 (표준 경쟁 순위: 동점자는 동일 등수, 다음 등수는 동점자 수만큼 건너뜀)
  // 참가자의 점수가 0으로 유실되지 않도록 answersSubmitted 합계 및 리더보드 저장 점수와 종합 병합
  const participantsWithComputedScores = (liveState?.participants || []).map((p) => {
    const answersSum = (liveState?.answersSubmitted || [])
      .filter((a: any) => a.participantId === p.id)
      .reduce((sum: number, a: any) => sum + (Number(a.scoreEarned) || 0), 0);
    const savedResults = getRoomLeaderboard(pin) || [];
    const saved = savedResults.find((r) => r.id === p.id);
    const savedScore = saved ? (saved.score || 0) : 0;
    const finalScore = Math.max(p.score || 0, answersSum, savedScore);
    return {
      ...p,
      score: finalScore,
    };
  });

  const sortedParticipants = liveState
    ? calculateCompetitionRanks(participantsWithComputedScores)
    : [];

  // 2. 호스트 타이머 틱 (questionStartTimesRef 절대 기준! 학생 답안 제출/네트워크 수신 시 절대 리셋되지 않음)
  useEffect(() => {
    if (!liveState || liveState.status !== 'question' || !room || room.timePerQuestion === 0) return;

    const qIdx = liveState.currentQuestionIndex;
    if (!questionStartTimesRef.current[qIdx]) {
      questionStartTimesRef.current[qIdx] = liveState.questionStartedAt || Date.now();
    }
    const startedAt = questionStartTimesRef.current[qIdx];
    questionStartedAtRef.current = startedAt;

    const computeRemaining = () => {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      return Math.min(room.timePerQuestion, Math.max(0, room.timePerQuestion - elapsedSec));
    };

    setTimerTick((t) => t + 1);

    const timer = setInterval(() => {
      const remainingSec = computeRemaining();
      setTimerTick((t) => t + 1);

      // 시간 초과 시 자동 정답 공개
      if (remainingSec <= 0) {
        clearInterval(timer);
        handleRevealAnswer();
        return;
      }
    }, 500);

    return () => clearInterval(timer);
  }, [liveState?.status, liveState?.currentQuestionIndex, room?.timePerQuestion]);

  // 전원 제출 시 자동 정답 공개 (타이머 리셋과 분리되어 학생 답안 제출 시 타이머가 튕기지 않음!)
  useEffect(() => {
    if (!liveState || liveState.status !== 'question') return;
    const elapsedMs = Date.now() - questionStartedAtRef.current;
    if (participantCount > 0 && submittedCount >= participantCount && elapsedMs > 1500) {
      handleRevealAnswer();
    }
  }, [submittedCount, participantCount, liveState?.status]);

  // 3. 정답 공개(reveal) 상태일 때 자동 진행 (isAutoAdvance가 켜져 있을 때만)
  useEffect(() => {
    if (!liveState || liveState.status !== 'reveal' || !isAutoAdvance) return;

    setAutoNextCountdown(5);
    const countdownInterval = setInterval(() => {
      setAutoNextCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          handleNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [liveState?.status, liveState?.currentQuestionIndex, isAutoAdvance]);

  if (!room || !liveState) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <HelpCircle size={40} className="text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold">퀴즈룸 정보를 불러오는 중입니다...</h2>
          <button onClick={onExit} className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-bold">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentQ = room.questions[liveState.currentQuestionIndex];

  // 보기별 제출자 수 통계 계산 (현재 문제 제출자 기준)
  const optionStats = (currentQ?.options || []).map((_, idx) => {
    const optStr = String(idx + 1);
    return currentQAnswers.filter((a) => a.selectedAnswer === optStr).length;
  });

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* 상단 교사용 제어 헤더 */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 md:px-6 h-14 flex items-center justify-between sticky top-0 z-40 shadow-md shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs">
            👨‍🏫
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white whitespace-nowrap">
                교사 라이브 (호스트)
              </span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap hidden lg:inline-block">
                전자칠판 모드
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[170px] sm:max-w-xs md:max-w-md mt-0.5 leading-tight">
              PIN: <strong className="text-amber-400 font-bold">{room.pin}</strong> · {room.title}
            </div>
          </div>
        </div>

        {/* 상단 우측 상태 및 컨트롤 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          {/* 자동 진행 ON/OFF 토글 스위치 */}
          <button
            onClick={() => setIsAutoAdvance(!isAutoAdvance)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border shrink-0 whitespace-nowrap ${
              isAutoAdvance
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="정답 공개 후 5초 뒤 자동으로 다음 문제로 넘어갑니다."
          >
            <span>{isAutoAdvance ? '⚡ 자동: ON' : '⏸️ 자동: OFF'}</span>
          </button>

          {/* 선생님과 함께하는 별도 문제 풀이 모드 버튼 */}
          <button
            onClick={() => {
              setReviewQuestionIndex(liveState?.currentQuestionIndex || 0);
              setShowReviewMode(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-400/30 rounded-lg text-xs font-bold text-white transition shadow-xs shrink-0 whitespace-nowrap"
            title="문제를 하나씩 칠판처럼 넘기며 상세 해설과 정답을 함께 풀이합니다."
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">📖 풀이</span>
          </button>

          {/* 접속자 수 뱃지 */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 shrink-0 whitespace-nowrap">
            <Users size={13} className="text-indigo-400" />
            <span>참여: <strong className="text-white text-xs">{participantCount}</strong>명</span>
          </div>

          {/* BGM 배경음악 컨트롤 */}
          <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 text-xs shadow-xs shrink-0 whitespace-nowrap">
            <button
              onClick={() => {
                if (!bgmState.isPlaying) {
                  bgmEngine.play(liveState.status === 'question' ? 'quiz' : liveState.status === 'finished' ? 'victory' : 'lobby');
                } else {
                  bgmEngine.toggleMute();
                }
              }}
              className={`flex items-center gap-1 font-bold transition ${
                bgmState.isMuted
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
              title={bgmState.isMuted ? '배경음악 켜기 (BGM ON)' : '배경음악 끄기 (음소거)'}
            >
              {bgmState.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span className="hidden md:inline text-[11px]">
                {bgmState.isMuted ? 'OFF' : 'ON'}
              </span>
            </button>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={bgmState.isMuted ? 0 : bgmState.volume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                if (bgmState.isMuted && vol > 0) {
                  bgmEngine.toggleMute();
                }
                bgmEngine.setVolume(vol);
              }}
              className="w-10 sm:w-14 accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              title={`BGM 볼륨: ${Math.round((bgmState.volume / 0.8) * 100)}%`}
            />
          </div>

          {/* QR 코드 보기 버튼 */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-indigo-300 transition shrink-0 whitespace-nowrap"
          >
            <QrCode size={13} />
            <span>QR</span>
          </button>

          {/* 학생 폰 시뮬레이터 분할 뷰 토글 */}
          <button
            onClick={() => setShowStudentPreview(!showStudentPreview)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border shrink-0 whitespace-nowrap ${
              showStudentPreview
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-300'
            }`}
            title="학생 스마트폰 화면을 우측에 분할 표시하여 시연합니다."
          >
            <Smartphone size={13} />
            <span>학생 폰</span>
          </button>

          <button
            onClick={onExit}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition shrink-0 whitespace-nowrap"
          >
            종료
          </button>
        </div>
      </header>

      {/* 메인 화면 (좌측: 선생님 대형 화면, 우측: 옵션 학생 폰 미리보기) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 교사 대형 화면 본문 (대기실 및 문제 진행 화면 유연한 스크롤 및 배치) */}
        <main
          className="flex-1 p-2.5 sm:p-3 md:p-4 flex flex-col overflow-y-auto justify-between max-w-5xl mx-auto w-full"
        >
          {/* 1. 대기실 상태 (학생 입장 대기 & 전원 입장 후 시작) */}
          {liveState.status === 'waiting' && (
            <div className="m-auto text-center space-y-4 sm:space-y-5 max-w-3xl mx-auto w-full py-2 pb-12 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>실시간 라이브 대기실 운영 중</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-keep">
                  학생들이 입장하기를 기다리는 중입니다
                </h1>
                <p className="text-xs md:text-sm text-slate-400 break-keep">
                  학생 스마트폰 카메라로 QR 코드를 비추거나 아래 주소로 접속하세요. 참여자가 전부 들어오면 <strong className="text-amber-400">퀴즈 시작 버튼</strong>을 누르세요!
                </p>
              </div>

              {/* 대형 PIN & QR 박스 (실제 LAN IP 적용) */}
              <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl relative">
                <div className="text-center md:text-left space-y-3 flex-1 w-full">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5">
                    <span>참여 PIN 번호</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">6자리</span>
                  </div>
                  <div className="text-5xl sm:text-6xl md:text-7xl font-black text-amber-400 font-mono tracking-wider select-all py-1">
                    {room.pin}
                  </div>

                  {/* 실제 스마트폰 접속 URL 및 복사 */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Smartphone size={13} className="text-indigo-400" />
                        스마트폰 직접 접속 주소:
                      </span>
                      <button
                        onClick={() => setIsEditingIp(!isEditingIp)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                      >
                        <Settings size={11} />
                        <span>IP 설정</span>
                      </button>
                    </div>

                    {isEditingIp ? (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={tempIpInput}
                          onChange={(e) => setTempIpInput(e.target.value)}
                          placeholder="예: 10.131.1.19"
                          className="bg-slate-900 border border-indigo-500 text-white text-xs px-2.5 py-1.5 rounded-lg flex-1 font-mono"
                        />
                        <button
                          onClick={handleSaveIp}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                        <code className="text-xs font-mono text-indigo-300 truncate select-all flex-1 text-left">
                          {studentJoinUrl}
                        </code>
                        <button
                          onClick={handleCopyStudentUrl}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                          title="주소 복사"
                        >
                          {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedUrl ? '복사됨!' : '복사'}</span>
                        </button>
                      </div>
                    )}

                    {/* 단일 파일(무의존성) 또는 웹 서버 구동 상태 배지 */}
                    {isLocalFileProtocol() ? (
                      <div className="space-y-2 p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-2xl text-left">
                        <div className="flex items-center gap-1.5 text-indigo-300 font-extrabold text-xs">
                          <Sparkles size={14} className="text-amber-400" />
                          <span>단일 파일 독립 구동 모드 (별도 서버 불필요)</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          별도 서버나 프로그램 실행 없이, 우측의 <strong className="text-white bg-purple-600 px-1.5 py-0.5 rounded font-bold">학생 폰</strong> 버튼을 누르면 서버 없이도 100% 실시간 퀴즈쇼가 진행됩니다!
                        </p>
                        <button
                          onClick={() => setShowStudentPreview(true)}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                        >
                          <Smartphone size={13} />
                          <span>📱 학생 폰 바로 열어 참가하기</span>
                        </button>
                      </div>
                    ) : isServerOnline === true ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span>외부 서버 정상 가동 중 (스마트폰 카메라로 QR을 스캔하면 바로 입장됩니다)</span>
                      </div>
                    ) : isServerOnline === false ? (
                      <div className="space-y-1.5 text-[11px] bg-amber-950/50 p-2.5 rounded-xl border border-amber-500/40 text-left">
                        <div className="flex items-center gap-1.5 text-amber-300 font-extrabold">
                          <span>⚠️ 로컬 서버(server.cjs) 미실행 상태</span>
                        </div>
                        <p className="text-slate-300 font-normal leading-relaxed text-[10px]">
                          스마트폰이나 다른 기기에서 참여하려면 <strong className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded">문제은행_실행하기.bat</strong>를 실행해주세요.
                        </p>
                        <p className="text-emerald-400 font-semibold text-[10px]">
                          💡 지금 즉시 테스트하려면 상단 우측 <strong className="text-white bg-purple-600 px-1 py-0.5 rounded">[학생 폰]</strong> 버튼을 누르면 서버 없이도 바로 참여 가능합니다!
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-2 pt-1 justify-center md:justify-start">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>현재 <strong className="text-white text-base font-extrabold">{participantCount}</strong>명 입장 완료</span>
                  </div>
                </div>

                {/* 선명한 QR 코드 영역 (항상 자리 유지) */}
                <div className="bg-white p-3 rounded-2xl shadow-2xl shrink-0 flex flex-col items-center justify-center gap-1.5 border-4 border-indigo-500/20 min-w-[170px] min-h-[170px]">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 sm:w-44 sm:h-44" />
                  ) : (
                    <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center text-xs text-slate-400 font-mono">
                      QR 코드 생성 중...
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                    <Smartphone size={11} className="text-indigo-600" />
                    스마트폰 기본 카메라로 스캔
                  </span>
                </div>
              </div>

              {/* 실시간 대기자 참여 명단 (사용자 요청: 참여명단 나오고 참여자가 전부 들어오면 시작) */}
              <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-300 font-extrabold flex items-center gap-2">
                    <Users size={15} className="text-amber-400" />
                    <span>실시간 입장 명단</span>
                    <span className="text-xs bg-indigo-600/30 text-indigo-300 px-2.5 py-0.5 rounded-full">
                      {participantCount}명 대기 중
                    </span>
                  </div>
                  {participantCount > 0 && (
                    <span className="text-[11px] text-emerald-400 font-medium">
                      ✓ 모든 참여자가 들어오면 아래 시작 버튼을 누르세요.
                    </span>
                  )}
                </div>

                {participantCount === 0 ? (
                  <div className="py-6 sm:py-8 text-center text-slate-500 text-xs space-y-1">
                    <p className="font-semibold">아직 입장한 학생이 없습니다.</p>
                    <p className="text-[11px] text-slate-600">
                      스마트폰 카메라로 위 QR 코드를 비추면 참가자 카드가 여기에 실시간으로 나타납니다.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {liveState.participants.map((p) => {
                      const allAvatars = [...getSavedCollectedAvatars(), ...QUIZ_AVATARS];
                      const avatarInfo = allAvatars.find((a) => a.id === p.avatarId) || QUIZ_AVATARS[0];
                      const avatarSrc = p.avatarUrl || avatarInfo.imageUrl;
                      return (
                        <div
                          key={p.id}
                          className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-md animate-in fade-in zoom-in-90 duration-200"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden ${avatarInfo.bgColor || 'bg-slate-700'}`}>
                            {avatarSrc ? (
                              <img src={avatarSrc} alt="" className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span>{p.avatarEmoji || avatarInfo.emoji}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-xs font-bold text-white truncate leading-tight">
                              {p.nickname}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                              <span>준비완료</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 서버 실행 버튼 (선생님 시작하기) */}
              <div className="pt-1 pb-4">
                <button
                  onClick={handleStartQuiz}
                  className="w-full sm:w-auto px-10 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white rounded-2xl sm:rounded-3xl text-base sm:text-lg font-black shadow-2xl hover:shadow-emerald-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0 inline-flex items-center justify-center gap-2.5 border-2 border-emerald-400/40 animate-pulse"
                >
                  <Play size={22} fill="white" />
                  <span>🚀 {participantCount > 0 ? `참여자 전원 확인 완료! (${participantCount}명) 퀴즈 시작` : '퀴즈 시작하기'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. 문제 출제 및 정답/문제풀이 진행 상태 */}
          {(liveState.status === 'question' || liveState.status === 'reveal') && currentQ && (
            <div className="flex-1 flex flex-col justify-between space-y-3">
              {/* 상단 정보 & 타이머 & 실시간 제출 현황 */}
              <div className="space-y-1 shrink-0">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-extrabold text-indigo-400 text-sm sm:text-base">
                    문제 {liveState.currentQuestionIndex + 1} / {room.questions.length}
                  </span>

                  {/* 실시간 제출자 카운터 */}
                  <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <span className="text-[11px] text-slate-400">제출 완료:</span>
                    <strong className="text-emerald-400 font-black text-xs sm:text-sm">
                      {submittedCount}
                    </strong>
                    <span className="text-[11px] text-slate-500">/ {participantCount}명</span>
                  </div>

                  {/* 타이머 / 상태 배지 */}
                  {room.timePerQuestion > 0 && (() => {
                    void timerTick;
                    const qIdx = liveState.currentQuestionIndex;
                    const startedAt = questionStartTimesRef.current[qIdx] || liveState.questionStartedAt || Date.now();
                    if (!questionStartTimesRef.current[qIdx]) {
                      questionStartTimesRef.current[qIdx] = startedAt;
                    }
                    const remainingSec = Math.min(room.timePerQuestion, Math.max(0, room.timePerQuestion - Math.floor((Date.now() - startedAt) / 1000)));

                    if (liveState.status === 'reveal') {
                      return (
                        <div className="flex items-center gap-1.5 font-mono font-black text-xs sm:text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                          <CheckCircle size={14} />
                          <span>정답 공개 중 ({autoNextCountdown}초 후 다음 문제)</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        className={`flex items-center gap-1 font-mono font-black text-base sm:text-lg ${
                          remainingSec <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                        }`}
                      >
                        <Clock size={16} />
                        <span>{remainingSec}초</span>
                      </div>
                    );
                  })()}
                </div>

                {/* 타이머 게이지 바 (남은 시간 숫자와 100% 동기화되는 부드러운 게이지) */}
                {room.timePerQuestion > 0 && (() => {
                  const qIdx = liveState.currentQuestionIndex;
                  const startedAt = questionStartTimesRef.current[qIdx] || liveState.questionStartedAt || Date.now();
                  const remainingSec = Math.min(room.timePerQuestion, Math.max(0, room.timePerQuestion - Math.floor((Date.now() - startedAt) / 1000)));

                  if (liveState.status === 'reveal') {
                    return (
                      <div className="w-full bg-slate-900/90 h-2.5 rounded-full overflow-hidden border border-emerald-500/40 p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-linear bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{
                            width: `${Math.max(0, Math.min(100, (autoNextCountdown / 5) * 100))}%`,
                          }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="w-full bg-slate-900/90 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                      <div
                        key={`host-timer-${liveState.currentQuestionIndex}`}
                        className={`h-full rounded-full transition-all duration-300 ease-linear ${
                          remainingSec <= 5
                            ? 'bg-rose-500 shadow-rose-500/50 shadow-sm'
                            : 'bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400'
                        }`}
                        style={{
                          width: `${Math.max(0, Math.min(100, (remainingSec / room.timePerQuestion) * 100))}%`,
                        }}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* 중앙 대형 문제 카드 (예시 블록과 악보가 잘림 없이 100% 한눈에 보이도록 공간 확장) */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-6 md:p-7 shadow-2xl flex-1 flex flex-col justify-between space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white leading-snug break-keep">
                  {liveState.currentQuestionIndex + 1}. {currentQ.title}
                </h2>

                {/* 엔트리 블록 코드 렌더링 (아이프레임처럼 좁게 갇히는 현상 제거: 전체 블록이 온전히 노출) */}
                {currentQ.entryBlocks && currentQ.entryBlocks.length > 0 && (
                  <div className="my-2 max-w-2xl mx-auto w-full overflow-x-auto rounded-2xl bg-slate-950/80 p-3 sm:p-4 border border-slate-800/80 shadow-inner">
                    <EntryBlockViewer blocks={currentQ.entryBlocks} />
                  </div>
                )}

                {/* 악보 렌더링 (높이 제한 해제로 전체 악보가 한눈에 시원하게 표시) */}
                {currentQ.hasScore && currentQ.scoreAbc && (
                  <div className="my-2 max-w-2xl mx-auto w-full overflow-x-auto bg-white p-3 sm:p-4 rounded-2xl shadow-inner">
                    <ScoreViewer abcNotation={currentQ.scoreAbc} scale={1.0} showAudioControls={currentQ.hasAudio} />
                  </div>
                )}

                {/* 첨부 이미지 렌더링 */}
                {currentQ.imageUrl && (
                  <div className="my-2 text-center max-w-2xl mx-auto w-full">
                    <img
                      src={currentQ.imageUrl}
                      alt="문제 예시 이미지"
                      className="max-h-72 mx-auto rounded-2xl border border-slate-700 max-w-full object-contain"
                    />
                  </div>
                )}

                {/* 보기 목록 (2열 컴팩트 그리드로 스크롤 0% 완전 제거) */}
                {currentQ.type === 'multiple-choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 shrink-0">
                    {currentQ.options.map((opt, optIdx) => {
                      const optNum = String(optIdx + 1);
                      const isCorrect = String(currentQ.correctAnswer) === optNum;
                      const responseCount = optionStats[optIdx] || 0;
                      const responseRate =
                        submittedCount > 0 ? Math.round((responseCount / submittedCount) * 100) : 0;

                      let borderClass = 'border-slate-800 bg-slate-800/80 text-slate-200';
                      if (liveState.status === 'reveal') {
                        if (isCorrect) {
                          borderClass = 'border-emerald-500 bg-emerald-950/80 text-emerald-100 ring-2 ring-emerald-400';
                        } else {
                          borderClass = 'border-slate-800/40 bg-slate-900/40 text-slate-500 opacity-60';
                        }
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-2 sm:p-2.5 md:p-3 rounded-xl border-2 font-bold transition flex items-center justify-between gap-2 text-xs sm:text-sm ${borderClass}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono shrink-0 ${
                                isCorrect && liveState.status === 'reveal'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {optIdx + 1}
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>

                          {/* 정답 공개 시 학생 응답자 수 및 비율 바 */}
                          {liveState.status === 'reveal' && (
                            <div className="text-right shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-xs shadow-xs transition ${
                                  isCorrect
                                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60'
                                    : responseCount > 0
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700/40'
                                }`}
                              >
                                <Users size={12} className={isCorrect ? 'text-emerald-400' : responseCount > 0 ? 'text-amber-400' : 'text-slate-500'} />
                                <span>{responseCount}명</span>
                                <span className="opacity-80">({responseRate}%)</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 퀴즈 진행 중 정답 알림 배너 & 자동 진행 카운트다운 */}
              {liveState.status === 'reveal' && (
                <div className="bg-gradient-to-r from-emerald-950/90 via-indigo-950/90 to-purple-950/90 border-2 border-emerald-500/60 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎉</span>
                    <div>
                      <div className="text-sm text-emerald-300 font-extrabold flex items-center gap-2">
                        <span>정답 공개</span>
                        <span className="text-white font-mono bg-emerald-600/60 px-2 py-0.5 rounded-md">
                          {currentQ.type === 'multiple-choice'
                            ? `${currentQ.correctAnswer}번 (${currentQ.options[Number(currentQ.correctAnswer) - 1] || ''})`
                            : currentQ.correctAnswer}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        상세 문제 풀이는 퀴즈 종료 후 [📖 함께 문제 풀이] 모드에서 모아서 복습할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  {/* 자동 진행 카운트다운 표시 */}
                  {isAutoAdvance ? (
                    <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold">자동 넘어가기</span>
                        <span className="text-xs text-amber-400 font-extrabold font-mono">
                          ⚡ {autoNextCountdown}초 뒤 다음 문제
                        </span>
                      </div>
                      <button
                        onClick={() => setIsAutoAdvance(false)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg font-bold transition"
                        title="자동 진행을 일시 정지합니다"
                      >
                        ⏸️ 멈춤
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">자동 진행 일시 정지됨</span>
                      <button
                        onClick={() => setIsAutoAdvance(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs rounded-xl font-black transition"
                      >
                        ▶ 자동 재개
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 하단 교사용 진행 제어 바 */}
              <div className="flex items-center justify-between gap-4 pt-2">
                {/* 사용자 요청: 순위보기 눌러도 튕겨나가지 않고 모달 팝업으로 보기 */}
                <button
                  onClick={() => setShowLeaderboardModal(true)}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition flex items-center gap-2 border border-slate-700"
                >
                  <Trophy size={16} className="text-amber-400" />
                  <span>실시간 랭킹 순위표 보기</span>
                </button>

                <div className="flex items-center gap-3">
                  {liveState.status === 'question' ? (
                    <button
                      onClick={handleRevealAnswer}
                      className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-sm font-black shadow-lg transition flex items-center gap-2"
                    >
                      <CheckCircle size={18} />
                      <span>즉시 정답 공개</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg transition flex items-center gap-2 animate-pulse"
                    >
                      <span>{liveState.currentQuestionIndex + 1 < room.questions.length ? '다음 문제로 바로 넘어가기' : '최종 결과 및 시상식'}</span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. 퀴즈 완주 시상식 상태 (사용자 요청: 전체 순위가 확실히 나오도록 바로 표시) */}
          {liveState.status === 'finished' && (
            <div className="my-auto text-center space-y-6 max-w-2xl mx-auto py-6">
              <div className="text-6xl animate-bounce">🏆</div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white">모든 퀴즈 완료! 시상식</h2>
                <p className="text-xs text-slate-400">
                  선생님과 학생들이 함께한 라이브 퀴즈 최종 순위표입니다.
                </p>
              </div>

              {/* 1~3위 메달 시상대 (Podium - 학생 화면과 동일한 고품질 입체 단상) */}
              {sortedParticipants.length >= 1 && (() => {
                const top1 = sortedParticipants[0];
                const top2 = sortedParticipants[1];
                const top3 = sortedParticipants[2];

                const allAvatars = [...getSavedCollectedAvatars(), ...QUIZ_AVATARS];
                const getAvatar = (avatarId?: string) => {
                  return allAvatars.find((a) => a.id === avatarId) || QUIZ_AVATARS[0];
                };

                return (
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Trophy size={20} className="text-amber-400" />
                        <span className="font-extrabold text-base text-white">🏆 명예의 전당 TOP 3 시상대</span>
                      </div>
                      <span className="text-xs bg-indigo-600/30 text-indigo-300 px-3 py-1 rounded-full font-bold">
                        총 {sortedParticipants.length}명 완주
                      </span>
                    </div>

                    {/* 시상대 단상 영역: 순위에 따라 동적으로 높이와 단상 스타일 적용 (하드코딩 제거) */}
                    <div className="flex items-end justify-center gap-3 sm:gap-6 pt-6 pb-2 max-w-lg mx-auto">
                      {(() => {
                        // 슬롯 배치: 2명 이상이면 [top2 (좌), top1 (중), top3 (우)] 순으로 배열하여 중앙 중심 시상대 형성
                        // 1명이면 [top1]만 렌더링
                        const displaySlots = [];
                        if (top2) displaySlots.push({ p: top2, key: 'slot-2' });
                        if (top1) displaySlots.push({ p: top1, key: 'slot-1' });
                        if (top3) displaySlots.push({ p: top3, key: 'slot-3' });

                        const rankCounts = sortedParticipants.reduce((acc: Record<number, number>, curr) => {
                          acc[curr.rank] = (acc[curr.rank] || 0) + 1;
                          return acc;
                        }, {});

                        return displaySlots.map(({ p, key }) => {
                          const isTie = (rankCounts[p.rank] || 0) > 1;
                          const style = getPodiumStyle(p.rank, isTie, true);
                          const avatar = getAvatar(p.avatarId);

                          return (
                            <div
                              key={key}
                              className={`flex-1 flex flex-col items-center max-w-[140px] ${style.marginClass} transition-all duration-300`}
                            >
                              {/* 1위 왕관 슬롯 (1위에게만 띄우며, 단 높이 정렬을 위해 영역 유지) */}
                              <div className="h-8 flex items-center justify-center">
                                {style.hasCrown ? (
                                  <span className="text-2xl animate-bounce">👑</span>
                                ) : (
                                  <div className="h-8" />
                                )}
                              </div>

                              {/* 아바타 아이콘 */}
                              <div
                                className={`${style.avatarSizeClass} rounded-3xl ${style.avatarRingClass} flex items-center justify-center overflow-hidden mb-1.5 transition-all duration-300`}
                              >
                                {avatar.imageUrl ? (
                                  <img
                                    src={avatar.imageUrl}
                                    alt=""
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <span className="text-4xl">{avatar.emoji}</span>
                                )}
                              </div>

                              {/* 참가자 닉네임 */}
                              <div
                                className={`text-xs sm:text-sm font-black truncate max-w-full text-center flex items-center justify-center gap-1 ${style.textColorClass}`}
                              >
                                <span>{p.nickname}</span>
                                {p.rank === 1 && (
                                  <span className="text-[10px] bg-amber-400/30 text-amber-300 px-1 py-0.5 rounded font-black">
                                    MVP
                                  </span>
                                )}
                              </div>

                              {/* 획득 점수 */}
                              <div className="text-xs sm:text-sm font-mono text-white font-black mb-1">
                                {(p.score || 0).toLocaleString()}점
                              </div>

                              {/* 동적 단상 받침대 (같은 순위면 완전히 동일한 높이와 동일한 스타일!) */}
                              <div
                                className={`w-full ${style.heightClass} ${style.bgClass} ${style.borderClass} rounded-t-3xl flex flex-col items-center justify-center text-white transition-all duration-300`}
                              >
                                <span className="text-3xl">{style.medal}</span>
                                <span className="text-xs sm:text-sm font-black tracking-tight">
                                  {style.label}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* 전체 참가자 실시간 순위표 리스트 */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white">📊 전체 참가자 순위표</span>
                    <span className="text-xs text-slate-400">({sortedParticipants.length}명)</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">획득 점수</span>
                </div>

                {sortedParticipants.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    참여 기록이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {sortedParticipants.map((p) => {
                      const allAvatars = [...getSavedCollectedAvatars(), ...QUIZ_AVATARS];
                      const av = allAvatars.find((a) => a.id === p.avatarId) || QUIZ_AVATARS[0];
                      const isTop1 = p.rank === 1;
                      const isTop2 = p.rank === 2;
                      const isTop3 = p.rank === 3;
                      const rankStyle = getRankBadgeStyle(p.rank);

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                            isTop1
                              ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-400/40'
                              : isTop2
                              ? 'bg-gradient-to-r from-slate-400/20 to-slate-300/10 border-slate-400/50'
                              : isTop3
                              ? 'bg-gradient-to-r from-amber-700/20 to-orange-700/10 border-amber-700/50'
                              : 'bg-slate-950/80 border-slate-800 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${rankStyle.badgeClass}`}
                            >
                              {p.rank}
                            </span>

                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                              {av.imageUrl ? (
                                <img src={av.imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <span className="text-xl">{av.emoji}</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="font-black text-sm text-white truncate flex items-center gap-1.5">
                                <span>{p.nickname}</span>
                                {isTop1 && (
                                  <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-md font-black shrink-0">
                                    👑 MVP
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 truncate block">{av.name}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-black font-mono text-amber-400">
                              {(p.score || 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">점</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 사용자 요청: 같이 문제 풀이는 따로 분리해서 제공 */}
              <div className="bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-2 border-indigo-500/50 rounded-3xl p-5 text-left space-y-3 shadow-2xl">
                <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
                  <BookOpen size={18} />
                  <span>선생님과 함께하는 전자칠판 복습 & 문제 풀이</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  시험이 끝났으니, 이제 칠판을 보며 한 문제씩 정답과 해설, 학생들의 선택 비율을 함께 분석해 보세요.
                </p>
                <button
                  onClick={() => {
                    setReviewQuestionIndex(0);
                    setShowReviewMode(true);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white rounded-2xl font-black text-sm shadow-xl transition flex items-center justify-center gap-2"
                >
                  <BookOpen size={18} />
                  <span>📖 선생님과 함께 1번부터 전체 문제 풀이하기</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  onClick={onExit}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition"
                >
                  메인 화면으로 돌아가기
                </button>
              </div>
            </div>
          )}
        </main>

        {/* 우측 스마트폰 시뮬레이터 (학생 뷰 분할 미리보기) */}
        {showStudentPreview && (
          <aside className="w-[410px] xl:w-[430px] bg-slate-900 border-l border-slate-800 p-3 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Smartphone size={15} />
                학생 스마트폰 화면 (실시간 동기화)
              </span>
              <button
                onClick={() => setShowStudentPreview(false)}
                className="text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-800 transition"
              >
                ✕ 닫기
              </button>
            </div>

            {/* 실제 스마트폰 프레임 목업 (아이폰/갤럭시 스타일 모바일 최적화) */}
            <div className="flex-1 mt-2.5 rounded-[2.5rem] overflow-hidden border-[6px] border-slate-700/80 shadow-2xl bg-slate-950 flex flex-col relative">
              {/* 스마트폰 상단 스피커 & 카메라 노치 바 */}
              <div className="h-5 bg-slate-950 flex items-center justify-center shrink-0 border-b border-slate-900 z-40">
                <div className="w-20 h-3 bg-slate-850 rounded-full flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span className="w-2 h-1 rounded-full bg-slate-700" />
                </div>
              </div>

              {/* 실제 학생 스크린 임베드 (isSidePreview=true로 모바일 최적화) */}
              <div className="flex-1 overflow-y-auto">
                <QuizStudentScreen pin={pin} isSidePreview={true} onExit={() => setShowStudentPreview(false)} />
              </div>

              {/* 스마트폰 하단 홈 바 */}
              <div className="h-4 bg-slate-950 flex items-center justify-center shrink-0 border-t border-slate-900">
                <div className="w-24 h-1 bg-slate-700 rounded-full" />
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* QR 코드 대형 팝업 모달 */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                참여 PIN 코드
              </div>
              <div className="text-6xl font-black text-amber-400 font-mono tracking-wider">
                {room.pin}
              </div>
            </div>

            {qrDataUrl && (
              <div className="bg-white p-4 rounded-2xl inline-block shadow-xl">
                <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left space-y-1">
              <div className="text-[10px] text-slate-400 font-bold">스마트폰 브라우저 접속 주소:</div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-indigo-300 truncate">{studentJoinUrl}</code>
                <button
                  onClick={handleCopyStudentUrl}
                  className="px-2 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold shrink-0"
                >
                  {copiedUrl ? '복사됨!' : '복사'}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              스마트폰 기본 카메라로 QR 코드를 비추면 즉시 참여됩니다.
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ★ 사용자 요청: 순위보기 눌렀을 때 나가지지 않고 화면 내에서 모달로 순위 확인 */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-left space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400 font-extrabold text-lg">
                <Trophy size={22} />
                <span className="text-white">실시간 참여자 랭킹 순위표</span>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800 transition"
              >
                ✕ 닫기
              </button>
            </div>

            {sortedParticipants.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                아직 점수를 획득한 참가자가 없습니다.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {sortedParticipants.map((p) => {
                  const allAvatars = [...getSavedCollectedAvatars(), ...QUIZ_AVATARS];
                  const av = allAvatars.find((a) => a.id === p.avatarId) || QUIZ_AVATARS[0];
                  const avatarSrc = p.avatarUrl || av.imageUrl;
                  const isTop1 = p.rank === 1;
                  const isTop2 = p.rank === 2;
                  const isTop3 = p.rank === 3;

                  let medal = <span className="font-mono text-slate-400 font-bold">{p.rank}위</span>;
                  let cardStyle = 'bg-slate-850/80 border-slate-800';

                  if (isTop1) {
                    medal = <span className="text-base">🥇 1위</span>;
                    cardStyle = 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-400/40';
                  } else if (isTop2) {
                    medal = <span className="text-base">🥈 2위</span>;
                    cardStyle = 'bg-slate-400/20 border-slate-400/50';
                  } else if (isTop3) {
                    medal = <span className="text-base">🥉 3위</span>;
                    cardStyle = 'bg-amber-700/20 border-amber-700/50';
                  }

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition ${cardStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 text-center font-bold text-xs">{medal}</div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden ${av.bgColor || 'bg-slate-800'}`}>
                          {avatarSrc ? (
                            <img src={avatarSrc} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span>{p.avatarEmoji || av.emoji}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-white flex items-center gap-1.5">
                            <span>{p.nickname}</span>
                            {isTop1 && <span className="text-xs text-amber-400">👑</span>}
                          </div>
                          <span className="text-[10px] text-slate-400">{av.name}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black font-mono text-amber-400">
                          {p.score.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">점</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                닫고 퀴즈 계속 진행하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 사용자 요청: 선생님과 함께하는 별도 [전자칠판 전체 문제 풀이 & 해설 모드] */}
      {showReviewMode && room && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* 상단 칠판 제어 바 */}
          <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xl shadow-md">
                👨‍🏫
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">
                    선생님과 함께하는 전자칠판 문제 풀이 & 총정리
                  </h3>
                  <span className="text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    상세 해설 모드
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {room.title} · 총 {room.questions.length}문항
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReviewMode(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>✕ 칠판 닫기</span>
              </button>
            </div>
          </header>

          {/* 문항 빠른 이동 탭 (1번 ~ N번) */}
          <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">문항 번호:</span>
            {room.questions.map((_, idx) => {
              const isCurrent = reviewQuestionIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setReviewQuestionIndex(idx)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center justify-center ${
                    isCurrent
                      ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-lg ring-2 ring-white/50 scale-105'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* 중앙 문제 풀이 전자칠판 뷰어 (스크롤바 없이 한 화면에 쏙 들어오는 2열 분할 레이아웃) */}
          <div className="flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3 sm:p-5 max-w-7xl w-full mx-auto flex flex-col justify-center">
            {(() => {
              const rq = room.questions[reviewQuestionIndex];
              if (!rq) return null;

              // 해당 문항에 대한 학생들의 응답 통계 집계 (성적표 + 실시간 상태 결합)
              const allResults = getRoomLeaderboard(pin);
              const qStats = (rq.options || []).map((_, optIdx) => {
                const optNum = String(optIdx + 1);
                let count = 0;

                // 1. 성적표(리더보드)에서 각 학생이 제출한 답안 조회
                if (allResults && allResults.length > 0) {
                  allResults.forEach((res) => {
                    const ans = res.answers?.find(
                      (a) => a.questionId === rq.id || a.questionId === String(reviewQuestionIndex)
                    ) || res.answers?.[reviewQuestionIndex];

                    if (ans && String(ans.selectedAnswer) === optNum) {
                      count++;
                    }
                  });
                }

                // 2. 만약 성적표에 아직 없거나 부족한 경우 liveState의 answersSubmitted에서 조회
                if (count === 0 && liveState?.answersSubmitted) {
                  count = liveState.answersSubmitted.filter((a: any) => {
                    const isThisQ = a.questionIndex === undefined || a.questionIndex === reviewQuestionIndex;
                    return isThisQ && String(a.selectedAnswer) === optNum;
                  }).length;
                }

                return count;
              });
              const totalQResponses = qStats.reduce((a, b) => a + b, 0);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch h-full">
                  {/* 좌측: 문제 지문 + 블록/악보 + 객관식 보기 (7열) */}
                  <div className="lg:col-span-7 bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="text-purple-400 font-extrabold text-sm sm:text-base">
                          Q{reviewQuestionIndex + 1} of {room.questions.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold">
                            총 {totalQResponses}명 응답
                          </span>
                          <span className="bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-300">
                            배점: {rq.points}점
                          </span>
                        </div>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-white leading-snug break-keep">
                        {reviewQuestionIndex + 1}. {rq.title}
                      </h2>

                      {/* 엔트리 블록 코드 (지문 잘림 방지: 전체 블록 코드가 온전히 다 보이도록 수정) */}
                      {rq.entryBlocks && rq.entryBlocks.length > 0 && (
                        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                          <div className="text-[11px] text-emerald-400 font-bold mb-1">💻 엔트리 블록 코드</div>
                          <div className="max-h-[520px] overflow-y-auto overflow-x-auto pr-1">
                            <EntryBlockViewer blocks={rq.entryBlocks} />
                          </div>
                        </div>
                      )}

                      {/* 악보 */}
                      {rq.hasScore && rq.scoreAbc && (
                        <div className="bg-white p-3 rounded-2xl">
                          <div className="text-[11px] text-slate-600 font-bold mb-1">🎼 악보 예시</div>
                          <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                            <ScoreViewer abcNotation={rq.scoreAbc} scale={0.9} showAudioControls={rq.hasAudio} />
                          </div>
                        </div>
                      )}

                      {/* 문제 첨부 이미지 */}
                      {rq.imageUrl && (
                        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                          <div className="text-[11px] text-indigo-400 font-bold mb-1">🖼️ 문제 그림</div>
                          <img src={rq.imageUrl} alt="문제 이미지" className="max-h-72 mx-auto rounded-xl object-contain" />
                        </div>
                      )}
                    </div>

                    {/* 객관식 보기 및 학생 정답률 표시 (크고 선명한 인원수 배지) */}
                    {rq.type === 'multiple-choice' && (
                      <div className="grid grid-cols-1 gap-2.5 pt-1">
                        {rq.options.map((opt, optIdx) => {
                          const optNum = String(optIdx + 1);
                          const isCorrect = String(rq.correctAnswer) === optNum;
                          const count = qStats[optIdx] || 0;
                          const percent = totalQResponses > 0 ? Math.round((count / totalQResponses) * 100) : 0;

                          return (
                            <div
                              key={optIdx}
                              className={`p-3 sm:p-3.5 rounded-2xl border-2 font-bold flex items-center justify-between gap-3 transition ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-950/80 text-emerald-100 ring-2 ring-emerald-400/50'
                                  : 'border-slate-800 bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm font-mono shrink-0 ${
                                    isCorrect ? 'bg-emerald-500 text-white font-black' : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {optIdx + 1}
                                </span>
                                <span className="text-sm sm:text-base truncate">{opt}</span>
                              </div>

                              {/* 사용자 요청: 몇 명이 선택했는지 조금 크게 표시 */}
                              <div className="text-right shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base shadow-md transition ${
                                    isCorrect
                                      ? 'bg-emerald-500/25 text-emerald-300 border-2 border-emerald-500/60 ring-2 ring-emerald-400/40'
                                      : count > 0
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                      : 'bg-slate-800 text-slate-500 border border-slate-700/40'
                                  }`}
                                >
                                  <Users size={16} className={isCorrect ? 'text-emerald-400' : count > 0 ? 'text-amber-400' : 'text-slate-500'} />
                                  <span>{count}명</span>
                                  <span className="text-xs font-semibold opacity-85">({percent}%)</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 우측: 선생님의 상세 핵심 문제풀이 & 해설 칠판 (5열) */}
                  <div className="lg:col-span-5 bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-slate-900 border-2 border-purple-500/60 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 text-amber-300 font-extrabold text-base sm:text-lg border-b border-purple-500/30 pb-3">
                        <BookOpen size={22} />
                        <span>선생님의 핵심 개념 강의 & 상세 해설</span>
                      </div>

                      {/* 정답 강조 카드 */}
                      <div className="bg-slate-900/90 p-4 rounded-2xl border-2 border-emerald-500/50 shadow-lg flex items-center gap-3">
                        <span className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-black shrink-0">
                          정답
                        </span>
                        <span className="text-base sm:text-lg font-black text-white">
                          {rq.type === 'multiple-choice'
                            ? `${rq.correctAnswer}번 : ${rq.options[Number(rq.correctAnswer) - 1] || ''}`
                            : rq.correctAnswer}
                        </span>
                      </div>

                      {/* 해설 본문 */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                          💡 문제 핵심 풀이 포인트
                        </span>
                        {rq.explanation ? (
                          <div className="bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-purple-500/30 text-slate-200 text-sm sm:text-base leading-relaxed break-keep font-medium shadow-inner">
                            {rq.explanation}
                          </div>
                        ) : (
                          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-slate-400 text-xs sm:text-sm">
                            이 문항은 기본 개념 문항으로, 지문의 조건과 핵심 규칙을 그대로 적용하면 정답을 찾을 수 있습니다.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 통계 요약 팁 */}
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-3 text-xs text-purple-200 flex items-center justify-between">
                      <span>🎯 정답 선택자: {qStats[Number(rq.correctAnswer) - 1] || 0}명</span>
                      <span>
                        정답률:{' '}
                        {totalQResponses > 0
                          ? Math.round(((qStats[Number(rq.correctAnswer) - 1] || 0) / totalQResponses) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 하단 내비게이션 바 */}
          <footer className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0">
            <button
              onClick={() => setReviewQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={reviewQuestionIndex === 0}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2"
            >
              <span>◀ 이전 문제</span>
            </button>

            <span className="text-xs sm:text-sm font-mono text-slate-300 font-extrabold bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700">
              {reviewQuestionIndex + 1} / {room.questions.length} 문제
            </span>

            <button
              onClick={() => setReviewQuestionIndex((prev) => Math.min(room.questions.length - 1, prev + 1))}
              disabled={reviewQuestionIndex === room.questions.length - 1}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2"
            >
              <span>다음 문제 ▶</span>
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};
