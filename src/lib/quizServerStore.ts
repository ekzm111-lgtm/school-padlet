// Next.js API 라우트 간 실시간 퀴즈 및 Supabase 전용 테이블 연동 저장소
import { supabase } from '@/lib/supabase';
import { defaultExamInfo, defaultQuestions } from '@/data/defaultExam';
import { defaultEntryExamInfo, defaultEntryQuestions } from '@/data/defaultEntryExam';
import type { QuizRoom, LiveQuizState, QuizParticipantResult, SavedQuizPackage } from '@/types/quiz';

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

// 타임아웃 래퍼 (Supabase 쿼리가 지연되어도 0.8초 내 즉시 반환하여 API 멈춤 방지)
async function withTimeout<T>(promise: PromiseLike<T>, ms: number = 800): Promise<T | null> {
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

// 참가자 목록 중복 제거 및 누적 병합
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

// 라이브 상태 단조 증가(Monotonic) 병합 규칙: 이전 단계로의 역행 원천 차단
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

// =========================================================================
// 1. 퀴즈 룸 (public.quiz_rooms)
// =========================================================================
export async function getQuizRoomServer(pin: string): Promise<any> {
  let room = serverQuizStore.rooms.get(pin);
  if (room) return room;

  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('quiz_rooms')
          .select('*')
          .eq('pin', pin)
          .maybeSingle(),
        700
      );

      if (res && !res.error && res.data) {
        const row = res.data;
        room = {
          pin: row.pin,
          title: row.title,
          subject: row.subject,
          createdAt: row.created_at,
          examInfo: row.exam_info,
          questions: row.questions,
          timePerQuestion: row.time_per_question,
          allowAnonymous: row.allow_anonymous,
          isActive: row.is_active,
        };
        serverQuizStore.rooms.set(pin, room);
        return room;
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

  // 기본 엔트리 코딩 방 생성
  const defaultRoom: QuizRoom = {
    pin,
    title: '중학교 코딩 교육 엔트리(Entry) 지필평가',
    subject: 'entry',
    createdAt: new Date().toLocaleString(),
    examInfo: defaultEntryExamInfo,
    questions: defaultEntryQuestions,
    timePerQuestion: 20,
    allowAnonymous: true,
    isActive: true,
  };
  serverQuizStore.rooms.set(pin, defaultRoom);
  return defaultRoom;
}

export async function saveQuizRoomServer(pin: string, roomData: any): Promise<void> {
  serverQuizStore.rooms.set(pin, roomData);
  if (!supabase) return;
  try {
    await supabase.from('quiz_rooms').upsert({
      pin,
      title: roomData.title,
      subject: roomData.subject,
      exam_info: roomData.examInfo,
      questions: roomData.questions,
      time_per_question: roomData.timePerQuestion ?? 20,
      allow_anonymous: roomData.allowAnonymous ?? true,
      is_active: roomData.isActive ?? true,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('saveQuizRoomServer supabase error:', e);
  }
}

export async function getAllQuizRoomsServer(): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  serverQuizStore.rooms.forEach((r, pin) => {
    result[pin] = r;
  });

  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('quiz_rooms')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        800
      );
      if (res && !res.error && res.data) {
        res.data.forEach((row: any) => {
          result[row.pin] = {
            pin: row.pin,
            title: row.title,
            subject: row.subject,
            createdAt: row.created_at,
            examInfo: row.exam_info,
            questions: row.questions,
            timePerQuestion: row.time_per_question,
            allowAnonymous: row.allow_anonymous,
            isActive: row.is_active,
          };
          serverQuizStore.rooms.set(row.pin, result[row.pin]);
        });
      }
    } catch {}
  }
  return result;
}

export async function deleteQuizRoomServer(pin: string): Promise<void> {
  serverQuizStore.rooms.delete(pin);
  serverQuizStore.liveStates.delete(pin);
  if (!supabase) return;
  try {
    await Promise.all([
      supabase.from('quiz_rooms').delete().eq('pin', pin),
      supabase.from('quiz_live_states').delete().eq('pin', pin),
      supabase.from('quiz_results').delete().eq('pin', pin),
    ]);
  } catch (e) {
    console.warn('deleteQuizRoomServer supabase error:', e);
  }
}

// =========================================================================
// 2. 퀴즈 실시간 진행 상태 (public.quiz_live_states)
// =========================================================================
export async function getQuizLiveStateServer(pin: string): Promise<any> {
  let remoteState: any = null;

  // 1. Supabase에서 최신 상태 조회 (서버리스 인스턴스 간 실시간 단일 진실 공급원)
  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('quiz_live_states')
          .select('*')
          .eq('pin', pin)
          .maybeSingle(),
        600
      );

      if (res && !res.error && res.data) {
        const row = res.data;
        remoteState = {
          pin: row.pin,
          status: row.status,
          currentQuestionIndex: row.current_question_index,
          timeLeft: row.time_left,
          showExplanation: row.show_explanation,
          participants: row.participants || [],
          answersSubmitted: row.answers_submitted || [],
          questionStartedAt: row.question_started_at ? Number(row.question_started_at) : undefined,
          updatedAt: row.updated_at ? Number(row.updated_at) : Date.now(),
        };
      }
    } catch {}
  }

  const memoryState = serverQuizStore.liveStates.get(pin);
  // 메모리와 DB 중 더 최신 상태로 단조 증가 병합 (진행 상태가 절대 누락되거나 지연되지 않음)
  const finalState = mergeServerLiveStates(remoteState || memoryState, memoryState || remoteState);

  if (finalState) {
    serverQuizStore.liveStates.set(pin, finalState);
    return finalState;
  }

  // 둘 다 없으면 방 정보로부터 초기 생성
  const room = await getQuizRoomServer(pin);
  const initialState = {
    pin,
    status: 'waiting',
    currentQuestionIndex: 0,
    timeLeft: room?.timePerQuestion || 20,
    showExplanation: false,
    participants: [],
    answersSubmitted: [],
    updatedAt: Date.now(),
  };
  serverQuizStore.liveStates.set(pin, initialState);
  return initialState;
}

export async function saveQuizLiveStateServer(pin: string, patch: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  const merged = mergeServerLiveStates(current, patch);

  serverQuizStore.liveStates.set(pin, merged);

  if (supabase) {
    try {
      // 서버리스 프로세스가 중단되기 전에 Supabase DB 쓰기 완료를 반드시 보장 (await)
      await withTimeout(
        supabase
          .from('quiz_live_states')
          .upsert({
            pin,
            status: merged.status,
            current_question_index: merged.currentQuestionIndex,
            time_left: merged.timeLeft,
            show_explanation: merged.showExplanation,
            participants: merged.participants,
            answers_submitted: merged.answersSubmitted,
            question_started_at: merged.questionStartedAt,
            updated_at: merged.updatedAt,
          }),
        800
      );
    } catch (e) {
      console.warn('saveQuizLiveStateServer supabase error:', e);
    }
  }

  return merged;
}

export async function joinQuizParticipantServer(pin: string, participant: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  const merged = mergeServerLiveStates(current, {
    participants: [participant],
    updatedAt: Date.now(),
  });
  return saveQuizLiveStateServer(pin, merged);
}

export async function submitQuizAnswerServer(pin: string, answer: any): Promise<any> {
  const current = await getQuizLiveStateServer(pin);
  let updatedParticipants = Array.isArray(current?.participants) ? [...current.participants] : [];
  const scoreEarned = Number(answer.scoreEarned) || 0;
  const pIdx = updatedParticipants.findIndex((p: any) => p.id === answer.participantId);

  if (pIdx >= 0) {
    const prevP = updatedParticipants[pIdx];
    const explicitScore = typeof answer.score === 'number' ? answer.score : undefined;
    const computedScore = explicitScore !== undefined ? explicitScore : ((prevP.score || 0) + scoreEarned);
    updatedParticipants[pIdx] = {
      ...prevP,
      score: Math.max(prevP.score || 0, computedScore),
      lastAnswer: answer.selectedAnswer ?? prevP.lastAnswer,
    };
  } else if (answer.participantId) {
    updatedParticipants.push({
      id: answer.participantId,
      nickname: answer.nickname || '참가자',
      score: typeof answer.score === 'number' ? answer.score : scoreEarned,
      lastAnswer: answer.selectedAnswer,
    });
  }

  const answerEntry = {
    participantId: answer.participantId,
    questionIndex: answer.questionIndex,
    selectedAnswer: answer.selectedAnswer,
    isCorrect: !!answer.isCorrect,
    timeSpent: answer.timeSpent || 0,
    scoreEarned,
  };

  const merged = mergeServerLiveStates(current, {
    participants: updatedParticipants,
    answersSubmitted: [answerEntry],
    updatedAt: Date.now(),
  });
  return saveQuizLiveStateServer(pin, merged);
}

// =========================================================================
// 3. 현재 활성 퀴즈 편집/출제 상태 (public.quiz_current_active)
// =========================================================================
export async function getCurrentQuizServer(): Promise<{ examInfo: any; questions: any[]; subject?: string }> {
  if (serverQuizStore.currentQuiz) {
    return serverQuizStore.currentQuiz;
  }

  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('quiz_current_active')
          .select('*')
          .eq('id', 'current')
          .maybeSingle(),
        800
      );
      if (res && !res.error && res.data) {
        const row = res.data;
        if (row.questions && row.exam_info) {
          const loaded = {
            subject: row.subject || 'entry',
            examInfo: row.exam_info,
            questions: row.questions,
          };
          serverQuizStore.currentQuiz = loaded;
          return loaded;
        }
      }
    } catch {}
  }

  const defaultQuiz = {
    examInfo: defaultEntryExamInfo,
    questions: defaultEntryQuestions,
    subject: 'entry',
  };
  serverQuizStore.currentQuiz = defaultQuiz;
  return defaultQuiz;
}

export async function saveCurrentQuizServer(data: { examInfo: any; questions: any[]; subject?: string }): Promise<void> {
  serverQuizStore.currentQuiz = data;
  if (!supabase) return;
  try {
    await supabase.from('quiz_current_active').upsert({
      id: 'current',
      subject: data.subject || 'entry',
      exam_info: data.examInfo,
      questions: data.questions,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('saveCurrentQuizServer supabase error:', e);
  }
}

// =========================================================================
// 4. 퀴즈 결과 및 순위표 (public.quiz_results)
// =========================================================================
export async function getQuizResultsServer(pin: string): Promise<QuizParticipantResult[]> {
  if (!supabase) return [];
  try {
    const res = await withTimeout(
      supabase
        .from('quiz_results')
        .select('*')
        .eq('pin', pin)
        .order('score', { ascending: false }),
      800
    );
    if (res && !res.error && res.data) {
      return res.data.map((row: any) => ({
        id: row.participant_id || row.id,
        pin: row.pin,
        nickname: row.nickname,
        avatarId: row.avatar_id,
        isAnonymous: true,
        score: row.score,
        correctCount: row.correct_count,
        totalCount: row.total_count,
        maxCombo: row.max_combo,
        totalTimeSpent: 10,
        submittedAt: row.submitted_at,
        answers: row.answers || [],
      }));
    }
  } catch {}
  return [];
}

export async function getAllQuizResultsServer(): Promise<Record<string, QuizParticipantResult[]>> {
  const result: Record<string, QuizParticipantResult[]> = {};
  if (!supabase) return result;
  try {
    const res = await withTimeout(
      supabase
        .from('quiz_results')
        .select('*')
        .order('score', { ascending: false }),
      1000
    );
    if (res && !res.error && res.data) {
      res.data.forEach((row: any) => {
        if (!result[row.pin]) result[row.pin] = [];
        result[row.pin].push({
          id: row.participant_id || row.id,
          pin: row.pin,
          nickname: row.nickname,
          avatarId: row.avatar_id,
          isAnonymous: true,
          score: row.score,
          correctCount: row.correct_count,
          totalCount: row.total_count,
          maxCombo: row.max_combo,
          totalTimeSpent: 10,
          submittedAt: row.submitted_at,
          answers: row.answers || [],
        });
      });
    }
  } catch {}
  return result;
}

export async function saveQuizResultServer(data: any): Promise<void> {
  if (!supabase || !data || !data.pin) return;
  try {
    const id = data.id || `${data.pin}_${data.participantId || data.nickname || Date.now()}`;
    const incomingScore = Number(data.score) || 0;
    const incomingCorrect = Number(data.correctCount) || 0;
    const incomingCombo = Number(data.maxCombo) || 0;

    let finalScore = incomingScore;
    let finalCorrect = incomingCorrect;
    let finalCombo = incomingCombo;

    const existing = await withTimeout(
      supabase
        .from('quiz_results')
        .select('score, correct_count, max_combo')
        .eq('id', id)
        .maybeSingle(),
      400
    );

    if (existing && !existing.error && existing.data) {
      finalScore = Math.max(Number(existing.data.score) || 0, incomingScore);
      finalCorrect = Math.max(Number(existing.data.correct_count) || 0, incomingCorrect);
      finalCombo = Math.max(Number(existing.data.max_combo) || 0, incomingCombo);
    }

    await supabase.from('quiz_results').upsert({
      id,
      pin: data.pin,
      participant_id: data.participantId || data.id,
      nickname: data.nickname,
      avatar_id: data.avatarId,
      score: finalScore,
      correct_count: finalCorrect,
      total_count: data.totalCount || 0,
      max_combo: finalCombo,
      answers: data.answers || [],
      submitted_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('saveQuizResultServer supabase error:', e);
  }
}

export async function clearQuizResultsServer(pin: string): Promise<void> {
  if (!supabase || !pin) return;
  try {
    await supabase.from('quiz_results').delete().eq('pin', pin);
  } catch (e) {
    console.warn('clearQuizResultsServer supabase error:', e);
  }
}

// =========================================================================
// 5. 퀴즈 보관함 패키지 (public.quiz_packages)
// =========================================================================
export async function getQuizPackagesServer(): Promise<SavedQuizPackage[]> {
  if (supabase) {
    try {
      const res = await withTimeout(
        supabase
          .from('quiz_packages')
          .select('*')
          .order('created_at', { ascending: false }),
        800
      );
      if (res && !res.error && res.data && res.data.length > 0) {
        return res.data.map((row: any) => ({
          id: row.id,
          title: row.title,
          subject: row.subject,
          examInfo: row.exam_info,
          questions: row.questions,
          savedAt: row.created_at,
          questionCount: Array.isArray(row.questions) ? row.questions.length : 0,
          description: row.exam_info?.instructions?.join(' ') || '',
        }));
      }
    } catch {}
  }

  // 기본 패키지 반환 및 DB 시딩
  const defaultSets: SavedQuizPackage[] = [
    {
      id: 'pkg_entry_default',
      title: '중학교 1학년 엔트리(Entry) 코딩 지필평가 기본세트',
      subject: 'entry',
      examInfo: defaultEntryExamInfo,
      questions: defaultEntryQuestions,
      savedAt: '2026. 10. 08',
      questionCount: defaultEntryQuestions.length,
      description: '순차, 반복, 선택 구조 및 엔트리 블록 실행 결과를 평가하는 대표 지필평가 문제입니다.',
    },
    {
      id: 'pkg_music_default',
      title: '대한중학교 2학년 음악 지필평가 기본세트',
      subject: 'music',
      examInfo: defaultExamInfo,
      questions: defaultQuestions,
      savedAt: '2026. 10. 01',
      questionCount: defaultQuestions.length,
      description: '악곡의 형식, 빠르기말, 악보 기호와 리듬을 종합 평가하는 기본 음악 문제입니다.',
    },
  ];

  if (supabase) {
    try {
      for (const p of defaultSets) {
        await supabase.from('quiz_packages').upsert({
          id: p.id,
          title: p.title,
          subject: p.subject,
          exam_info: p.examInfo,
          questions: p.questions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}
  }

  return defaultSets;
}

export async function saveQuizPackageServer(pkg: any): Promise<void> {
  if (!supabase || !pkg || !pkg.id) return;
  try {
    await supabase.from('quiz_packages').upsert({
      id: pkg.id,
      title: pkg.title,
      subject: pkg.subject,
      exam_info: pkg.examInfo,
      questions: pkg.questions,
      created_at: pkg.savedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('saveQuizPackageServer supabase error:', e);
  }
}

export async function deleteQuizPackageServer(id: string): Promise<void> {
  if (!supabase || !id) return;
  try {
    await supabase.from('quiz_packages').delete().eq('id', id);
  } catch (e) {
    console.warn('deleteQuizPackageServer supabase error:', e);
  }
}
