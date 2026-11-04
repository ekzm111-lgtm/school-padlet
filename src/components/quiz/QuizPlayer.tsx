import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { QuizRoom, QuizParticipantResult, QuizAvatar } from '@/types/quiz';
import { QUIZ_AVATARS } from '@/types/quiz';
import { getQuizRoom, submitQuizResult } from '@/utils/quizStorage';
import {
  playCorrectSound,
  playWrongSound,
  playComboSound,
  playTickSound,
  playVictorySound,
} from '@/utils/soundEffects';
import { bgmEngine } from '@/utils/bgmEngine';
import { ScoreViewer } from '@/components/quiz/ScoreViewer';
import { EntryBlockViewer } from '@/components/quiz/EntryBlockViewer';
import { CheeringCharacter } from '@/components/quiz/CheeringCharacter';
import {
  Sparkles,
  Trophy,
  Flame,
  Clock,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle,
  XCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';

interface QuizPlayerProps {
  pin: string;
  onExit: () => void;
  onViewLeaderboard: (pin: string) => void;
}

// 퀴즈앤 시그니처 5색 컬러 테마 (객관식 버튼)
const OPTION_COLORS = [
  { bg: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700', border: 'border-rose-600', icon: '🔺', text: 'text-white' },
  { bg: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700', border: 'border-blue-600', icon: '🔷', text: 'text-white' },
  { bg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700', border: 'border-amber-600', icon: '🟡', text: 'text-white' },
  { bg: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700', border: 'border-emerald-600', icon: '🟩', text: 'text-white' },
  { bg: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700', border: 'border-purple-600', icon: '⭐', text: 'text-white' },
];

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ pin, onExit, onViewLeaderboard }) => {
  const [room, setRoom] = useState<QuizRoom | null>(null);

  // 단계: 'join' (캐릭터/닉네임 선택) -> 'playing' (퀴즈 진행) -> 'result' (최종 결과)
  const [stage, setStage] = useState<'join' | 'playing' | 'result'>('join');

  // 참여자 정보
  const [selectedAvatar, setSelectedAvatar] = useState<QuizAvatar>(QUIZ_AVATARS[0]);
  const [nickname, setNickname] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // 진행 상태
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // 문제별 타이머 & 상호작용
  const [timeLeft, setTimeLeft] = useState(20);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 주관식 답안
  const [shortAnswerInput, setShortAnswerInput] = useState('');

  // 자동 넘김 (시간 지나면 자동으로 다음 문제 전환)
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(3);

  // 전체 소요 시간
  const totalStartTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);

  // 답안 기록 목록
  const recordedAnswersRef = useRef<QuizParticipantResult['answers']>([]);

  // 룸 데이터 로드
  useEffect(() => {
    const r = getQuizRoom(pin);
    if (r) {
      setRoom(r);
      setTimeLeft(r.timePerQuestion > 0 ? r.timePerQuestion : 999);
    }
  }, [pin]);

  // 배경음악(BGM) 자동 전환 및 정지
  useEffect(() => {
    if (!soundEnabled) {
      bgmEngine.stop();
      return;
    }
    if (stage === 'join') {
      bgmEngine.play('lobby');
    } else if (stage === 'playing') {
      bgmEngine.play('quiz');
    } else if (stage === 'result') {
      bgmEngine.play('victory');
    }
    return () => {
      bgmEngine.stop();
    };
  }, [stage, soundEnabled]);

  // 익명 닉네임 자동 생성
  const generateAnonymousNickname = () => {
    const adjectives = ['날쌘', '용감한', '영리한', '행복한', '빛나는', '신비한', '즐거운', '당당한'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const num = Math.floor(10 + Math.random() * 90);
    return `${adj} ${selectedAvatar.name.split(' ')[1] || '친구'} ${num}`;
  };

  // 게임 시작 (참여 완료)
  const handleStartGame = () => {
    let finalNick = nickname.trim();
    if (!finalNick) {
      if (isAnonymous || room?.allowAnonymous) {
        finalNick = generateAnonymousNickname();
        setNickname(finalNick);
      } else {
        alert('닉네임 또는 학번과 이름을 입력해주세요!');
        return;
      }
    }

    totalStartTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();
    setStage('playing');
    setCurrentIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    recordedAnswersRef.current = [];
    resetQuestionState();
  };

  const resetQuestionState = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);
    setIsCurrentCorrect(null);
    setShortAnswerInput('');
    setEarnedPoints(0);
    setAutoAdvanceCountdown(3);
    questionStartTimeRef.current = Date.now();

    const limit = room?.timePerQuestion || 0;
    setTimeLeft(limit > 0 ? limit : 999);
  };

  // 문제 풀이 후 자동 넘김 카운트다운 타이머 (3초 후 자동 다음 문제 이동)
  useEffect(() => {
    if (stage !== 'playing' || !isAnswered || !autoAdvance) return;

    if (autoAdvanceCountdown <= 0) {
      handleNextQuestion();
      return;
    }

    const timer = setInterval(() => {
      setAutoAdvanceCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, isAnswered, autoAdvance, autoAdvanceCountdown]);

  // 문제당 카운트다운 타이머
  useEffect(() => {
    if (stage !== 'playing' || isAnswered || !room || room.timePerQuestion === 0) return;

    if (timeLeft <= 0) {
      // 시간 초과 처리
      handleSelectAnswer('TIMEOUT');
      return;
    }

    if (timeLeft <= 3 && soundEnabled) {
      playTickSound();
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, isAnswered, timeLeft, room, soundEnabled]);

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-800 p-8 rounded-3xl text-center max-w-md w-full border border-slate-700 space-y-4">
          <HelpCircle size={48} className="text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">존재하지 않거나 종료된 퀴즈룸입니다.</h2>
          <p className="text-xs text-slate-400">PIN 번호({pin})를 다시 확인해주세요.</p>
          <button
            onClick={onExit}
            className="px-6 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentQ = room.questions[currentIdx];

  // 답안 선택 핸들러
  const handleSelectAnswer = (ans: string) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(ans);

    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));

    // 정답 체크
    let correct = false;
    if (ans !== 'TIMEOUT') {
      if (currentQ.type === 'multiple-choice') {
        correct = String(ans) === String(currentQ.correctAnswer);
      } else {
        const userClean = ans.trim().toLowerCase().replace(/\s+/g, '');
        const correctClean = currentQ.correctAnswer.trim().toLowerCase().replace(/\s+/g, '');
        correct = userClean === correctClean || correctClean.includes(userClean);
      }
    }

    setIsCurrentCorrect(correct);

    // 점수 계산 (기본 점수 + 스피드 보너스 + 콤보 보너스)
    let pointsThisTurn = 0;
    if (correct) {
      const basePoints = (currentQ.points || 5) * 100;
      // 시간 보너스: 빨리 맞힐수록 최대 200점 추가
      const limit = room.timePerQuestion || 20;
      const speedBonus = limit > 0 ? Math.round(Math.max(0, (limit - timeSpent) / limit) * 200) : 100;

      // 콤보 보너스: 연속 정답 시 콤보당 50점
      const newCombo = combo + 1;
      const comboBonus = (newCombo - 1) * 50;
      pointsThisTurn = basePoints + speedBonus + comboBonus;

      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);
      setCorrectCount((prev) => prev + 1);
      setScore((prev) => prev + pointsThisTurn);

      if (soundEnabled) {
        if (newCombo >= 2) {
          playComboSound();
        } else {
          playCorrectSound();
        }
      }

      // 2연속 정답 이상이면 신나는 미니 콘페티 폭죽 효과!
      if (newCombo >= 2) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
    } else {
      setCombo(0);
      if (soundEnabled) playWrongSound();
    }

    setEarnedPoints(pointsThisTurn);

    // 기록 저장
    recordedAnswersRef.current.push({
      questionId: currentQ.id,
      selectedAnswer: ans,
      isCorrect: correct,
      timeSpent,
      scoreEarned: pointsThisTurn,
    });
  };

  // 다음 문제로 이동
  const handleNextQuestion = () => {
    if (currentIdx + 1 < room.questions.length) {
      setCurrentIdx((prev) => prev + 1);
      resetQuestionState();
    } else {
      // 퀴즈 종료!
      finishGame();
    }
  };

  // 게임 종료 및 최종 결과 제출
  const finishGame = () => {
    const totalTimeSpent = Math.max(1, Math.round((Date.now() - totalStartTimeRef.current) / 1000));

    const finalResult: QuizParticipantResult = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pin: room.pin,
      nickname: nickname || generateAnonymousNickname(),
      avatarId: selectedAvatar.id,
      isAnonymous,
      score,
      correctCount,
      totalCount: room.questions.length,
      maxCombo,
      totalTimeSpent,
      submittedAt: new Date().toLocaleString(),
      answers: recordedAnswersRef.current,
    };

    submitQuizResult(finalResult);
    setStage('result');

    if (soundEnabled) playVictorySound();

    // 승리의 대형 폭죽 축하 애니메이션!
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 글로벌 상단 헤더 바 */}
      <header className="bg-slate-800/90 border-b border-slate-700/80 px-4 h-14 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-black text-white text-xs shadow-md">
            Q
          </span>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
              QuizN Live
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">PIN: {room.pin}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stage === 'playing' && (
            <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-700 text-xs">
              <span className="text-amber-400 font-black flex items-center gap-1">
                <Trophy size={13} /> {score}점
              </span>
              {combo >= 2 && (
                <span className="text-orange-400 font-black animate-bounce flex items-center gap-0.5">
                  <Flame size={13} /> {combo} COMBO!
                </span>
              )}
            </div>
          )}

          {/* 자동 넘김 토글 */}
          {stage === 'playing' && (
            <button
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                autoAdvance
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-700/60 text-slate-400 border-slate-600 hover:bg-slate-700'
              }`}
              title={autoAdvance ? '자동 넘김 켜짐 (3초 후 다음 문제)' : '자동 넘김 꺼짐 (수동 클릭)'}
            >
              <Zap size={12} className={autoAdvance ? 'text-emerald-400 fill-emerald-400' : ''} />
              <span className="hidden sm:inline">자동 넘김</span>
              <span>{autoAdvance ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* 소리 토글 */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
            title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={onExit}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition font-semibold"
          >
            나가기
          </button>
        </div>
      </header>

      {/* STAGE 1: 캐릭터 선택 및 닉네임 입력 (Lobby Entrance) */}
      {stage === 'join' && (
        <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center items-center my-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* 타이틀 */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30">
                <Sparkles size={12} />
                <span>스마트 퀴즈 챌린지 입장</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight pt-1">
                {room.title}
              </h1>
              <p className="text-xs text-slate-400">
                나만의 캐릭터를 고르고 닉네임을 정해 퀴즈에 참여하세요!
              </p>
            </div>

            {/* 재미 요소: 캐릭터 아바타 선택 그리드 */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>🎨 퀴즈 캐릭터 선택</span>
                <span className="text-[11px] text-indigo-400 font-normal">
                  선택됨: {selectedAvatar.emoji} {selectedAvatar.name}
                </span>
              </label>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-slate-900/50 p-3 rounded-2xl border border-slate-700/60 max-h-48 overflow-y-auto">
                {QUIZ_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => setSelectedAvatar(av)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition transform active:scale-90 ${
                      selectedAvatar.id === av.id
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-105 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{av.emoji}</span>
                    <span className="text-[9px] truncate w-full text-center mt-0.5 opacity-80 font-medium">
                      {av.name.split(' ')[1] || av.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 닉네임 입력란 (익명 모드 지원) */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  👤 참가자 닉네임 (또는 이름)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={
                      isAnonymous ? '익명 자동 생성 (예: 날쌘 호랑이 34)' : '이름 또는 닉네임 입력'
                    }
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 font-semibold focus:outline-hidden transition"
                  />
                  <div className="absolute right-3 top-3 text-2xl select-none">
                    {selectedAvatar.emoji}
                  </div>
                </div>
              </div>

              {/* 익명 참여 체크박스 */}
              {room.allowAnonymous && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => {
                        setIsAnonymous(e.target.checked);
                        if (e.target.checked && !nickname) {
                          setNickname(generateAnonymousNickname());
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>익명으로 참여하기 (랜덤 닉네임 사용)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNickname(generateAnonymousNickname())}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    🎲 랜덤 생성
                  </button>
                </div>
              )}
            </div>

            {/* 입장 버튼 */}
            <button
              onClick={handleStartGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-base shadow-xl hover:shadow-2xl transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <span>퀴즈 도전 시작하기!</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </main>
      )}

      {/* STAGE 2: 퀴즈앤 인터랙티브 게임 플레이 (Mobile / Tablet / PC 반응형) */}
      {stage === 'playing' && currentQ && (
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col justify-between">
          {/* 상단 프로그레스 및 제한시간 바 */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>
                문항 <strong className="text-white text-sm">{currentIdx + 1}</strong> / {room.questions.length}
              </span>
              <span className="text-[11px] bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full">
                {currentQ.category} · {currentQ.points}점
              </span>
              {room.timePerQuestion > 0 && (
                <span
                  className={`flex items-center gap-1 font-mono font-bold text-sm ${
                    timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
                  }`}
                >
                  <Clock size={14} /> {timeLeft}초
                </span>
              )}
            </div>

            {/* 시간 게이지 바 */}
            {room.timePerQuestion > 0 && (
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    timeLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                  }`}
                  style={{
                    width: `${Math.max(0, (timeLeft / room.timePerQuestion) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* 중앙 문제 카드 영역 (엔트리 블록 or 악보 포함) */}
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-3 sm:space-y-4 my-auto">
            {/* 문제 지문 (모바일 단어 쪼개짐 방지) */}
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white leading-relaxed break-keep">
              {currentIdx + 1}. {currentQ.title}
            </h2>

            {/* 엔트리 블록 코드 렌더링 (모바일 넘침 방지) */}
            {currentQ.entryBlocks && currentQ.entryBlocks.length > 0 && (
              <div className="my-2 max-w-full overflow-x-auto rounded-xl">
                <EntryBlockViewer blocks={currentQ.entryBlocks} />
              </div>
            )}

            {/* 악보 렌더링 */}
            {currentQ.hasScore && currentQ.scoreAbc && (
              <div className="my-2 bg-white p-2.5 sm:p-3 rounded-2xl max-w-full overflow-x-auto">
                <ScoreViewer abcNotation={currentQ.scoreAbc} scale={0.85} showAudioControls={currentQ.hasAudio} />
              </div>
            )}

            {/* 첨부 이미지 */}
            {currentQ.imageUrl && (
              <div className="my-2 text-center">
                <img
                  src={currentQ.imageUrl}
                  alt="문제 참고"
                  className="max-h-48 mx-auto rounded-xl border border-slate-700 max-w-full"
                />
              </div>
            )}
          </div>

          {/* 하단 보기 선택 영역 (퀴즈앤 시그니처 대형 5색 블록 버튼) */}
          <div className="mt-3 sm:mt-4">
            {currentQ.type === 'multiple-choice' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {currentQ.options.map((opt, optIdx) => {
                  const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];
                  const isSelected = selectedAnswer === String(optIdx + 1);
                  const isCorrectAnswer = String(currentQ.correctAnswer) === String(optIdx + 1);

                  // 답 제출 후 스타일 처리
                  let cardStyle = `${color.bg} ${color.border} text-white shadow-lg`;
                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      cardStyle = 'bg-emerald-600 border-emerald-400 ring-4 ring-emerald-300 text-white scale-[1.02] shadow-2xl';
                    } else if (isSelected) {
                      cardStyle = 'bg-rose-700 border-rose-500 opacity-60 text-white line-through';
                    } else {
                      cardStyle = 'bg-slate-800 border-slate-700 opacity-30 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isAnswered}
                      onClick={() => handleSelectAnswer(String(optIdx + 1))}
                      className={`p-3.5 sm:p-4 md:p-5 rounded-2xl border-b-4 font-bold text-left transition transform active:scale-98 flex items-center gap-3 sm:gap-3.5 w-full ${cardStyle}`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-xs sm:text-sm shrink-0 font-mono">
                        {color.icon}
                      </span>
                      <span className="text-xs sm:text-sm md:text-base leading-snug break-keep flex-1 min-w-0">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* 단답형 입력 */
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={isAnswered}
                    value={shortAnswerInput}
                    onChange={(e) => setShortAnswerInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectAnswer(shortAnswerInput)}
                    placeholder="정답을 입력하세요"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    disabled={isAnswered || !shortAnswerInput.trim()}
                    onClick={() => handleSelectAnswer(shortAnswerInput)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition"
                  >
                    제출
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 답안 채점 피드백 오버레이 바 */}
          {isAnswered && (
            <div
              className={`mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
                isCurrentCorrect
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/80 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {isCurrentCorrect ? (
                  <CheckCircle size={32} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={32} className="text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="font-black text-base flex items-center gap-2">
                    <span>{isCurrentCorrect ? '정답입니다! 🎉' : '아쉬워요! 😢'}</span>
                    {isCurrentCorrect && (
                      <span className="text-xs bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-full font-bold">
                        +{earnedPoints}점
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 line-clamp-1">
                    {currentQ.explanation || (isCurrentCorrect ? '훌륭한 순발력입니다!' : `정답: ${currentQ.correctAnswer}`)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {autoAdvance && (
                  <span className="text-[11px] font-bold text-slate-300 bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/10 shrink-0">
                    ⏱️ <span className="text-amber-400 font-mono">{autoAdvanceCountdown}초</span> 후 자동 이동
                  </span>
                )}
                <button
                  onClick={handleNextQuestion}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>{currentIdx + 1 < room.questions.length ? '다음 문제로' : '최종 결과 보기'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* 실시간 애니메이션 응원 캐릭터 (선택한 캐릭터가 말풍선으로 응원) */}
          <div className="fixed bottom-4 right-4 z-30 pointer-events-auto">
            <CheeringCharacter
              avatar={selectedAvatar}
              state={
                !isAnswered
                  ? timeLeft <= 5
                    ? 'hurry'
                    : 'thinking'
                  : isCurrentCorrect
                  ? combo >= 2
                    ? 'combo'
                    : 'cheer'
                  : 'sad'
              }
              comboCount={combo}
            />
          </div>
        </main>
      )}

      {/* STAGE 3: 최종 결과 & 시상대 리더보드 (Game Over) */}
      {stage === 'result' && (
        <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center items-center my-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* 상단 축하 배너 */}
            <div className="space-y-2">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-4xl shadow-lg ring-4 ring-amber-300/30">
                {selectedAvatar.emoji}
              </div>
              <h2 className="text-2xl font-black text-white">퀴즈 챌린지 완주! 🏆</h2>
              <p className="text-xs text-slate-400">
                <strong className="text-indigo-400">{nickname}</strong>님의 최종 성적표입니다.
              </p>
            </div>

            {/* 점수 요약 박스 */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-4 rounded-2xl border border-slate-700">
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">최종 점수</div>
                <div className="text-2xl font-black text-amber-400 font-mono">{score}</div>
              </div>
              <div className="space-y-1 border-x border-slate-700/80">
                <div className="text-[11px] text-slate-400 font-medium">정답률</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {Math.round((correctCount / room.questions.length) * 100)}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">최대 콤보</div>
                <div className="text-2xl font-black text-orange-400 font-mono">{maxCombo} 🔥</div>
              </div>
            </div>

            {/* 버튼 그룹 */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => onViewLeaderboard(room.pin)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl transition flex items-center justify-center gap-2"
              >
                <Trophy size={16} className="text-amber-300" />
                <span>명예의 전당 / 전체 순위표 보기</span>
              </button>

              <button
                onClick={handleStartGame}
                className="w-full py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                <span>다시 도전하기</span>
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
