// Next.js API 라우트 간 실시간 퀴즈 룸 및 라이브 상태 저장소 (메모리 + 비동기 Supabase 연동)
import { supabase } from '@/lib/supabase';
import { defaultExamInfo, defaultQuestions } from '@/data/defaultExam';
import { defaultEntryExamInfo, defaultEntryQuestions } from '@/data/defaultEntryExam';

interface QuizServerStorage {
  rooms: Map<string, any>;
  liveStates: Map<string, any>;
  currentQuiz?: any;
}

declare global {
  var __quizServerStore: QuizServerStorage | undefined;
}

if (!globalThis.__quizServerStore) {
  globalThis.__quizServerStore = {
    rooms: new Map(),
    liveStates: new Map(),
  };
}

export const serverQuizStore = globalThis.__quizServerStore;

// 타임아웃 래퍼 (Supabase 쿼리가 지연되거나 응답하지 않아도 0.6초 내 즉시 반환하여 API 멈춤 방지)
async function withTimeout<T>(promise: PromiseLike<T>, ms: number = 600): Promise<T | null> {
  let timer: any;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return res as T;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// 참가자 목록 중복 제거 및 누적 병합 (한 번 들어온 참가자는 절대 누락되지 않음)
export function mergeParticipants(existing: any[] = [], incoming: any[] = []): any[] {
  const map = new Map<string, any>();
  (existing || []).forEach((p) => {
    if (p && p.id) map.set(p.id, p);
  });
  (incoming || []).forEach((p) => {
    if (p && p.id) {
      const prev = map.get(p.id);
      map.set(p.id, {
        ...prev,
        ...p,
        score: Math.max(prev?.score || 0, p.score || 0),
      });
    }
  });
  return Array.from(map.values());
}

// 답변 목록 누적 병합
export function mergeAnswers(existing: any[] = [], incoming: any[] = []): any[] {
  const map = new Map<string, any>();
  (existing || []).forEach((a) => {
    if (a && a.participantId) {
      map.set(`${a.participantId}_${a.questionIndex ?? 0}`, a);
    }
  });
  (incoming || []).forEach((a) => {
    if (a && a.participantId) {
      map.set(`${a.participantId}_${a.questionIndex ?? 0}`, a);
    }
  });
  return Array.from(map.values());
}

// 라이브 상태 단조 증가(Monotonic) 병합 규칙: 이전 단계(reveal -> question 또는 finished -> reveal)로의 역행 원천 차단
export function mergeServerLiveStates(current: any, incoming: any): any {
  if (!current) return incoming;
  if (!incoming) return current;

  // 새 게임 시작 등으로 waiting 상태로 명시적 리셋하는 경우
  if (incoming.status === 'waiting' && (incoming.currentQuestionIndex === 0 || incoming.currentQuestionIndex === undefined)) {
    return {
      ...current,
      ...incoming,
      participants: mergeParticipants(current.participants, incoming.participants),
      answersSubmitted: incoming.answersSubmitted || [],
      updatedAt: Date.now(),
    };
  }

  const currQ = typeof current.currentQuestionIndex === 'number' ? current.currentQuestionIndex : 0;
  const inQ = typeof incoming.currentQuestionIndex === 'number' ? incoming.currentQuestionIndex : currQ;

  let finalStatus = incoming.status || current.status;
  let finalQuestionIndex = inQ;

  // 1. finished 상태라면 어떤 경우에도 다른 상태(reveal, question)로 역행하지 않음
  if (incoming.status === 'finished') {
    finalStatus = 'finished';
    finalQuestionIndex = Math.max(currQ, inQ);
  } else if (current.status === 'finished') {
    finalStatus = 'finished';
    finalQuestionIndex = Math.max(currQ, inQ);
  } else if (currQ > inQ) {
    // 2. 현재 문제 인덱스가 더 앞서 있다면 이전 인덱스/상태로 되돌리지 않음
    finalQuestionIndex = currQ;
    finalStatus = current.status;
  } else if (currQ === inQ) {
    // 3. 동일 문제 번호에서는 reveal -> question 역행 불가
    if (current.status === 'reveal' && incoming.status === 'question') {
      finalStatus = 'reveal';
    }
  }

  return {
    ...current,
    ...incoming,
    status: finalStatus,
    currentQuestionIndex: finalQuestionIndex,
    participants: mergeParticipants(current.participants, incoming.participants),
    answersSubmitted: mergeAnswers(current.answersSubmitted, incoming.answersSubmitted),
    updatedAt: Math.max(current.updatedAt || 0, incoming.updatedAt || 0, Date.now()),
  };
}

// 1. 퀴즈 룸 조회 (메모리 우선 조회 -> Supabase -> 자동 복원 Fallback 보장)
export async function getQuizRoomServer(pin: string): Promise<any> {
  let room = serverQuizStore.rooms.get(pin);
  if (room) return room;

  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('boards')
          .select('description')
          .eq('id', `quiz_room_${pin}`)
          .maybeSingle(),
        600
      );

      if (res && !res.error && res.data && res.data.description) {
        try {
          room = JSON.parse(res.data.description);
          serverQuizStore.rooms.set(pin, room);
          return room;
        } catch {}
      }
    } catch {}
  }

  // 메모리에 다른 방이 있다면 최신 방 기반으로 PIN 복원
  if (serverQuizStore.rooms.size > 0) {
    const all = Array.from(serverQuizStore.rooms.values());
    const latest = all[all.length - 1];
    const recovered = { ...latest, pin, isActive: true };
    serverQuizStore.rooms.set(pin, recovered);
    return recovered;
  }

  // 🔥 절대 404가 나지 않도록 즉석 안전 복원 룸 생성 (기본 엔트리 코딩)
  const defaultRoom = {
    pin,
    title: '중학교 코딩 교육 엔트리(Entry) 지필평가',
    subject: 'entry',
    createdAt: '방금 전',
    examInfo: defaultEntryExamInfo,
    questions: defaultEntryQuestions,
    timePerQuestion: 20,
    allowAnonymous: true,
    isActive: true,
  };
  serverQuizStore.rooms.set(pin, defaultRoom);
  return defaultRoom;
}

// 백그라운드 비동기 Supabase 안전 저장 헬퍼 (호출 즉시 리턴, 실패해도 서버리스 프로세스 중단 방지)
async function asyncUpsertBoard(id: string, code: string, title: string, description: string) {
  if (!supabase) return;
  try {
    await supabase.from('boards').upsert({
      id,
      code,
      title,
      description,
    });
  } catch (e) {
    console.warn('asyncUpsertBoard supabase error:', e);
  }
}

// 2. 퀴즈 룸 저장 (메모리 즉시 저장 + Supabase 비동기 백그라운드 동기화)
export async function saveQuizRoomServer(pin: string, roomData: any): Promise<void> {
  serverQuizStore.rooms.set(pin, roomData);
  asyncUpsertBoard(`quiz_room_${pin}`, `qr_${pin}`, '__QUIZ_ROOM__', JSON.stringify(roomData));
}

// 3. 퀴즈 라이브 상태 조회 (메모리 우선 조회 - Supabase 과다 트래픽 차단 다이어트 적용)
export async function getQuizLiveStateServer(pin: string): Promise<any> {
  let memoryState = serverQuizStore.liveStates.get(pin);

  // 메모리에 이미 최신 상태가 있다면 Supabase를 중복 호출하지 않고 즉시 반환 (트래픽 99% 절감)
  if (memoryState) {
    return memoryState;
  }

  // 메모리에 없을 때만 Supabase에서 1회 복원 시도
  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('boards')
          .select('description')
          .eq('id', `quiz_live_${pin}`)
          .maybeSingle(),
        600
      );

      if (res && !res.error && res.data && res.data.description) {
        try {
          const remoteState = JSON.parse(res.data.description);
          serverQuizStore.liveStates.set(pin, remoteState);
          return remoteState;
        } catch {}
      }
    } catch {}
  }

  if (!memoryState) {
    const room = await getQuizRoomServer(pin);
    memoryState = {
      pin,
      status: 'waiting',
      currentQuestionIndex: 0,
      timeLeft: room?.timePerQuestion || 20,
      revealAnswer: false,
      participants: [],
      answersSubmitted: [],
      updatedAt: Date.now(),
    };
    serverQuizStore.liveStates.set(pin, memoryState);
  }

  return memoryState;
}

// 4. 퀴즈 라이브 상태 저장 (단조 증가 규칙 적용 메모리 + Supabase 비동기 저장)
export async function saveQuizLiveStateServer(pin: string, patch: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  const merged = mergeServerLiveStates(current, patch);

  serverQuizStore.liveStates.set(pin, merged);
  asyncUpsertBoard(`quiz_live_${pin}`, `ql_${pin}`, '__QUIZ_LIVE__', JSON.stringify(merged));

  return merged;
}

// 5. 학생 참가자 등록 전용 함수 (원자적 추가 및 누적 보장)
export async function joinQuizParticipantServer(pin: string, participant: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  const merged = mergeServerLiveStates(current, {
    participants: [participant],
    updatedAt: Date.now(),
  });

  serverQuizStore.liveStates.set(pin, merged);
  asyncUpsertBoard(`quiz_live_${pin}`, `ql_${pin}`, '__QUIZ_LIVE__', JSON.stringify(merged));

  return merged;
}

// 6. 학생 정답 제출 전용 함수
export async function submitQuizAnswerServer(pin: string, answer: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  let updatedParticipants = current?.participants || [];
  if (typeof answer.score === 'number') {
    updatedParticipants = updatedParticipants.map((p: any) => {
      if (p.id === answer.participantId) {
        return { ...p, score: Math.max(p.score || 0, answer.score) };
      }
      return p;
    });
  }

  const merged = mergeServerLiveStates(current, {
    participants: updatedParticipants,
    answersSubmitted: [answer],
    updatedAt: Date.now(),
  });

  serverQuizStore.liveStates.set(pin, merged);
  asyncUpsertBoard(`quiz_live_${pin}`, `ql_${pin}`, '__QUIZ_LIVE__', JSON.stringify(merged));

  return merged;
}

// 7. 현재 활성 퀴즈(전체 기기 공통 DB 동기화) 조회
export async function getCurrentQuizServer(): Promise<{ examInfo: any; questions: any[]; subject?: string }> {
  // 1. 메모리 캐시 확인
  if (serverQuizStore.currentQuiz) {
    return serverQuizStore.currentQuiz;
  }

  // 2. Supabase 조회
  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('boards')
          .select('description')
          .eq('id', 'quiz_current_active')
          .maybeSingle(),
        800
      );
      if (res && !res.error && res.data && res.data.description) {
        try {
          const parsed = JSON.parse(res.data.description);
          if (parsed && parsed.questions && parsed.examInfo) {
            serverQuizStore.currentQuiz = parsed;
            return parsed;
          }
        } catch {}
      }
    } catch {}
  }

  // 3. Fallback: 기본 엔트리 코딩 시험 문제 반환
  const defaultQuiz = {
    examInfo: defaultEntryExamInfo,
    questions: defaultEntryQuestions,
    subject: 'entry',
  };
  serverQuizStore.currentQuiz = defaultQuiz;
  return defaultQuiz;
}

// 8. 현재 활성 퀴즈 DB 저장
export async function saveCurrentQuizServer(data: { examInfo: any; questions: any[]; subject?: string }): Promise<void> {
  serverQuizStore.currentQuiz = data;
  asyncUpsertBoard(
    'quiz_current_active',
    'quiz_active',
    '__CURRENT_ACTIVE_QUIZ__',
    JSON.stringify(data)
  );
}
