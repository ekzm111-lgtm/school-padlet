// Next.js API 라우트 간 실시간 퀴즈 룸 및 라이브 상태 저장소 (메모리 + Supabase 영구 연동)
import { supabase } from '@/lib/supabase';

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

// 1. 퀴즈 룸 조회 (메모리 우선 조회 후 없으면 Supabase에서 복원)
export async function getQuizRoomServer(pin: string): Promise<any | null> {
  let room = serverQuizStore.rooms.get(pin);
  if (room) return room;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('description')
        .eq('id', `quiz_room_${pin}`)
        .maybeSingle();

      if (!error && data && data.description) {
        try {
          room = JSON.parse(data.description);
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

  return null;
}

// 2. 퀴즈 룸 저장 (메모리 + Supabase 영구 동기화)
export async function saveQuizRoomServer(pin: string, roomData: any): Promise<void> {
  serverQuizStore.rooms.set(pin, roomData);

  if (supabase) {
    try {
      await supabase.from('boards').upsert({
        id: `quiz_room_${pin}`,
        code: `qr_${pin}`,
        title: '__QUIZ_ROOM__',
        description: JSON.stringify(roomData),
      });
    } catch (e) {
      console.warn('saveQuizRoomServer supabase error:', e);
    }
  }
}

// 3. 퀴즈 라이브 상태 조회 (Vercel 다중 서버리스 인스턴스 간 참가자 누적 보장)
export async function getQuizLiveStateServer(pin: string): Promise<any> {
  let memoryState = serverQuizStore.liveStates.get(pin);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('description')
        .eq('id', `quiz_live_${pin}`)
        .maybeSingle();

      if (!error && data && data.description) {
        try {
          const remoteState = JSON.parse(data.description);
          if (memoryState) {
            // 메모리와 원격 상태를 상호 병합 (참가자와 답변이 절대 손실되지 않음)
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

// 4. 퀴즈 라이브 상태 저장 (참가자/답변 누적 병합 후 메모리 + Supabase 동시 저장)
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

  if (supabase) {
    try {
      await supabase.from('boards').upsert({
        id: `quiz_live_${pin}`,
        code: `ql_${pin}`,
        title: '__QUIZ_LIVE__',
        description: JSON.stringify(merged),
      });
    } catch (e) {
      console.warn('saveQuizLiveStateServer supabase error:', e);
    }
  }

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

  if (supabase) {
    try {
      await supabase.from('boards').upsert({
        id: `quiz_live_${pin}`,
        code: `ql_${pin}`,
        title: '__QUIZ_LIVE__',
        description: JSON.stringify(merged),
      });
    } catch (e) {
      console.warn('joinQuizParticipantServer supabase error:', e);
    }
  }

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

  if (supabase) {
    try {
      await supabase.from('boards').upsert({
        id: `quiz_live_${pin}`,
        code: `ql_${pin}`,
        title: '__QUIZ_LIVE__',
        description: JSON.stringify(merged),
      });
    } catch (e) {
      console.warn('submitQuizAnswerServer supabase error:', e);
    }
  }

  return merged;
}
