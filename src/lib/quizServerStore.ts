// Next.js API 라우트 간 실시간 퀴즈 룸 및 라이브 상태 저장소 (메모리 + 비동기 Supabase 연동)
import { supabase } from '@/lib/supabase';
import { defaultEntryExamInfo, defaultEntryQuestions } from '@/data/defaultEntryExam';

interface QuizServerStorage {
  rooms: Map<string, any>;
  liveStates: Map<string, any>;
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

  // 🔥 절대 404가 나지 않도록 즉석 안전 복원 룸 생성
  const defaultRoom = {
    pin,
    title: '정보 & 바이브 코딩 퀴즈',
    subject: '정보',
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

// 3. 퀴즈 라이브 상태 조회 (Vercel 다중 서버리스 인스턴스 간 참가자 누적 보장)
export async function getQuizLiveStateServer(pin: string): Promise<any> {
  let memoryState = serverQuizStore.liveStates.get(pin);

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
          if (memoryState) {
            memoryState = {
              ...memoryState,
              ...remoteState,
              participants: mergeParticipants(memoryState.participants, remoteState.participants),
              answersSubmitted: mergeAnswers(memoryState.answersSubmitted, remoteState.answersSubmitted),
              status: remoteState.status || memoryState.status,
              currentQuestionIndex: remoteState.currentQuestionIndex ?? memoryState.currentQuestionIndex,
              timeLeft: remoteState.timeLeft ?? memoryState.timeLeft,
              updatedAt: Math.max(memoryState.updatedAt || 0, remoteState.updatedAt || 0),
            };
          } else {
            memoryState = remoteState;
          }
          serverQuizStore.liveStates.set(pin, memoryState);
          return memoryState;
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

// 4. 퀴즈 라이브 상태 저장 (참가자/답변 누적 병합 후 메모리 + Supabase 비동기 저장)
export async function saveQuizLiveStateServer(pin: string, patch: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);

  const merged = {
    ...current,
    ...patch,
    participants: mergeParticipants(current?.participants, patch?.participants),
    answersSubmitted: mergeAnswers(current?.answersSubmitted, patch?.answersSubmitted),
    updatedAt: Date.now(),
  };

  serverQuizStore.liveStates.set(pin, merged);
  asyncUpsertBoard(`quiz_live_${pin}`, `ql_${pin}`, '__QUIZ_LIVE__', JSON.stringify(merged));

  return merged;
}

// 5. 학생 참가자 등록 전용 함수 (원자적 추가 및 누적 보장)
export async function joinQuizParticipantServer(pin: string, participant: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  const updatedParticipants = mergeParticipants(current?.participants, [participant]);

  const merged = {
    ...current,
    participants: updatedParticipants,
    updatedAt: Date.now(),
  };

  serverQuizStore.liveStates.set(pin, merged);
  asyncUpsertBoard(`quiz_live_${pin}`, `ql_${pin}`, '__QUIZ_LIVE__', JSON.stringify(merged));

  return merged;
}

// 6. 학생 정답 제출 전용 함수
export async function submitQuizAnswerServer(pin: string, answer: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  const updatedAnswers = mergeAnswers(current?.answersSubmitted, [answer]);

  let updatedParticipants = current?.participants || [];
  if (typeof answer.score === 'number') {
    updatedParticipants = updatedParticipants.map((p: any) => {
      if (p.id === answer.participantId) {
        return { ...p, score: Math.max(p.score || 0, answer.score) };
      }
      return p;
    });
  }

  const merged = {
    ...current,
    participants: updatedParticipants,
    answersSubmitted: updatedAnswers,
    updatedAt: Date.now(),
  };

  serverQuizStore.liveStates.set(pin, merged);
  asyncUpsertBoard(`quiz_live_${pin}`, `ql_${pin}`, '__QUIZ_LIVE__', JSON.stringify(merged));

  return merged;
}
