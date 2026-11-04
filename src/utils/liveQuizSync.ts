import type { LiveQuizState } from '@/types/quiz';
import { getLiveQuizState, setLiveQuizState, getQuizRoom } from './quizStorage';
import { getApiBaseUrl } from './hostNetwork';

/**
 * 실시간 교사(호스트)-학생(클라이언트) 동기화 액션 관리 모듈
 * BroadcastChannel과 localStorage를 통해 브라우저 간 0.01초 실시간 동기화
 */

// 1. 호스트: 퀴즈 시작 (첫 문제 출제)
export function hostStartQuiz(pin: string): LiveQuizState | null {
  const room = getQuizRoom(pin);
  const state = getLiveQuizState(pin);
  if (!room || !state) return null;

  const nextState: LiveQuizState = {
    ...state,
    status: 'question',
    currentQuestionIndex: 0,
    timeLeft: room.timePerQuestion > 0 ? room.timePerQuestion : 0,
    questionStartedAt: Date.now(),
    updatedAt: Date.now(),
    showExplanation: false,
    answersSubmitted: [],
  };

  setLiveQuizState(nextState);
  return nextState;
}

// 2. 호스트: 정답 및 문제풀이 해설 공개
export function hostRevealAnswer(pin: string): LiveQuizState | null {
  const state = getLiveQuizState(pin);
  if (!state) return null;

  const nextState: LiveQuizState = {
    ...state,
    status: 'reveal',
    updatedAt: Date.now(),
    showExplanation: true,
  };

  setLiveQuizState(nextState);
  return nextState;
}

// 3. 호스트: 다음 문제로 이동
export function hostNextQuestion(pin: string): LiveQuizState | null {
  const room = getQuizRoom(pin);
  const state = getLiveQuizState(pin);
  if (!room || !state) return null;

  const nextIndex = state.currentQuestionIndex + 1;
  if (nextIndex >= room.questions.length) {
    // 모든 문제 종료
    const finishState: LiveQuizState = {
      ...state,
      status: 'finished',
      updatedAt: Date.now(),
      showExplanation: false,
    };
    setLiveQuizState(finishState);
    return finishState;
  }

  const nextState: LiveQuizState = {
    ...state,
    status: 'question',
    currentQuestionIndex: nextIndex,
    timeLeft: room.timePerQuestion > 0 ? room.timePerQuestion : 0,
    questionStartedAt: Date.now(),
    updatedAt: Date.now(),
    showExplanation: false,
    // 이전 문제들의 답변 기록을 보존하여 복습 및 문제 풀이 시 통계 활용 가능
    answersSubmitted: state.answersSubmitted || [],
  };

  setLiveQuizState(nextState);
  return nextState;
}

// 4. 호스트: 타이머 시간 1초 차감 (호스트가 타이머 틱 주도)
export function hostTickTimer(pin: string, newTime: number): void {
  const state = getLiveQuizState(pin);
  if (!state || state.status !== 'question') return;

  const nextState: LiveQuizState = {
    ...state,
    timeLeft: newTime,
  };
  setLiveQuizState(nextState);
}

// 5. 클라이언트(학생): 방에 입장 등록
export async function clientJoinRoom(
  pin: string,
  participant: { id: string; nickname: string; avatarId: string; avatarUrl?: string; avatarEmoji?: string }
): Promise<LiveQuizState | null> {
  let serverUpdated: LiveQuizState | null = null;
  // 서버에 비동기 등록 (스마트폰 기기 지원)
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/quiz/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, participant }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.liveState) {
        serverUpdated = data.liveState;
      }
    }
  } catch {}

  let state = serverUpdated || getLiveQuizState(pin);
  if (!state) {
    const room = getQuizRoom(pin);
    if (room) {
      state = {
        pin: room.pin,
        status: 'waiting',
        currentQuestionIndex: 0,
        timeLeft: room.timePerQuestion || 20,
        totalQuestions: room.questions ? room.questions.length : 0,
        showExplanation: false,
        participants: [],
        answersSubmitted: [],
      };
    } else {
      return null;
    }
  }

  const exists = state.participants.some((p) => p.id === participant.id);
  const updatedParticipants = exists
    ? state.participants.map((p) => (p.id === participant.id ? { ...p, ...participant } : p))
    : [...state.participants, { ...participant, score: 0 }];

  const nextState: LiveQuizState = {
    ...state,
    participants: updatedParticipants,
  };

  setLiveQuizState(nextState);
  return nextState;
}

// 6. 클라이언트(학생): 답안 제출
export async function clientSubmitLiveAnswer(
  pin: string,
  participantId: string,
  selectedAnswer: string,
  isCorrect: boolean,
  timeSpent: number,
  pointsEarned: number,
  questionIndex?: number
): Promise<LiveQuizState | null> {
  let state = getLiveQuizState(pin);
  const qIdx = questionIndex !== undefined ? questionIndex : (state?.currentQuestionIndex ?? 0);

  // 서버에 비동기 제출 (스마트폰 기기 지원)
  try {
    await fetch(`${getApiBaseUrl()}/api/quiz/submit-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin,
        participantId,
        questionIndex: qIdx,
        selectedAnswer,
        isCorrect,
        timeSpent,
        scoreEarned: pointsEarned,
      }),
    });
  } catch {}

  state = getLiveQuizState(pin);
  if (!state) {
    const room = getQuizRoom(pin);
    if (room) {
      state = {
        pin,
        status: 'question',
        currentQuestionIndex: qIdx,
        timeLeft: 0,
        totalQuestions: room.questions.length,
        showExplanation: false,
        participants: [],
        answersSubmitted: [],
      };
    } else {
      return null;
    }
  }

  // 이미 제출했는지 확인 (참가자 ID 및 해당 문제 번호 기준)
  const alreadyIndex = state.answersSubmitted.findIndex(
    (a: any) => a.participantId === participantId && (a.questionIndex === undefined || a.questionIndex === qIdx)
  );

  const answerEntry = {
    participantId,
    questionIndex: qIdx,
    selectedAnswer,
    isCorrect,
    timeSpent,
  };

  const updatedAnswers = [...state.answersSubmitted];
  if (alreadyIndex >= 0) {
    updatedAnswers[alreadyIndex] = answerEntry;
  } else {
    updatedAnswers.push(answerEntry);
  }

  // 참가자 점수 누적
  const updatedParticipants = state.participants.map((p) => {
    if (p.id === participantId) {
      return {
        ...p,
        score: (p.score || 0) + pointsEarned,
        lastAnswer: selectedAnswer,
      };
    }
    return p;
  });

  const room = getQuizRoom(pin);
  const calculatedTimeLeft = state.questionStartedAt && room && room.timePerQuestion > 0
    ? Math.min(room.timePerQuestion, Math.max(0, room.timePerQuestion - Math.floor((Date.now() - state.questionStartedAt) / 1000)))
    : state.timeLeft;

  const nextState: LiveQuizState = {
    ...state,
    timeLeft: calculatedTimeLeft,
    updatedAt: Date.now(),
    answersSubmitted: updatedAnswers,
    participants: updatedParticipants,
  };

  setLiveQuizState(nextState);
  return nextState;
}
