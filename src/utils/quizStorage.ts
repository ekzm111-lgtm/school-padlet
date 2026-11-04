import type { QuizRoom, QuizParticipantResult, SavedQuizPackage, LiveQuizState } from '@/types/quiz';
import type { ExamInfo, Question } from '@/types/exam';
import { defaultExamInfo, defaultQuestions } from '@/data/defaultExam';
import { defaultEntryExamInfo, defaultEntryQuestions } from '@/data/defaultEntryExam';
import { getApiBaseUrl } from './hostNetwork';

const ROOMS_KEY = 'quizn_rooms';
const RESULTS_KEY = 'quizn_results';
const PACKAGES_KEY = 'quizn_saved_packages';
const LIVE_STATE_KEY_PREFIX = 'quizn_live_state_';
const BROADCAST_CHANNEL_NAME = 'quizn_live_channel';

// 6자리 랜덤 PIN 생성기
export function generateQuizPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 퀴즈 룸 생성 및 저장
export function createQuizRoom(
  examInfo: ExamInfo,
  questions: Question[],
  timePerQuestion: number = 20,
  allowAnonymous: boolean = true
): QuizRoom {
  const rooms = getAllQuizRooms();
  const pin = generateQuizPin();

  const now = new Date();
  const createdAt = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newRoom: QuizRoom = {
    pin,
    title: `${examInfo.grade} ${examInfo.term} (${examInfo.subject})`,
    subject: examInfo.subject,
    createdAt,
    examInfo,
    questions,
    timePerQuestion,
    allowAnonymous,
    isActive: true,
  };

  rooms[pin] = newRoom;
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));

  // 서버 API에도 동기화 (원격 모바일 기기 접속 지원)
  try {
    fetch(`${getApiBaseUrl()}/api/quiz/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoom),
    }).catch(() => {});
  } catch {}

  // 초기 라이브 상태 생성
  const initialLiveState: LiveQuizState = {
    pin,
    status: 'waiting',
    currentQuestionIndex: 0,
    timeLeft: timePerQuestion > 0 ? timePerQuestion : 0,
    totalQuestions: questions.length,
    showExplanation: false,
    participants: [],
    answersSubmitted: [],
  };
  setLiveQuizState(initialLiveState);

  // 브로드캐스트 알림
  notifyChannel({ type: 'ROOM_CREATED', room: newRoom });

  return newRoom;
}

// 모든 퀴즈 룸 불러오기
export function getAllQuizRooms(): Record<string, QuizRoom> {
  const data = localStorage.getItem(ROOMS_KEY);
  return data ? JSON.parse(data) : {};
}

// 특정 PIN의 퀴즈 룸 가져오기 (로컬 캐시)
export function getQuizRoom(pin: string): QuizRoom | null {
  const rooms = getAllQuizRooms();
  return rooms[pin] || null;
}

// 원격 서버로부터 퀴즈 룸 가져오기 (스마트폰 기기용 필수 비동기 로더)
export async function loadQuizRoomAsync(pin: string): Promise<QuizRoom | null> {
  const local = getQuizRoom(pin);
  if (local) return local;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/quiz/room?pin=${pin}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.room) {
        const rooms = getAllQuizRooms();
        rooms[pin] = data.room;
        localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
        notifyChannel({ type: 'ROOM_CREATED', room: data.room });
        return data.room;
      }
    }
  } catch (e) {
    console.warn('Failed to load room from server:', e);
  }
  return null;
}

// 퀴즈 결과 제출 및 저장
export function submitQuizResult(result: QuizParticipantResult): void {
  const results = getAllQuizResults();
  if (!results[result.pin]) {
    results[result.pin] = [];
  }
  const existingIdx = results[result.pin].findIndex((r) => r.id === result.id);
  if (existingIdx >= 0) {
    const prev = results[result.pin][existingIdx];
    results[result.pin][existingIdx] = {
      ...result,
      score: Math.max(prev.score || 0, result.score || 0),
      correctCount: Math.max(prev.correctCount || 0, result.correctCount || 0),
    };
  } else {
    results[result.pin].push(result);
  }

  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));

  // 브로드캐스트 알림
  notifyChannel({ type: 'RESULT_SUBMITTED', result });
}

// 모든 퀴즈 결과 불러오기
export function getAllQuizResults(): Record<string, QuizParticipantResult[]> {
  const data = localStorage.getItem(RESULTS_KEY);
  return data ? JSON.parse(data) : {};
}

// 특정 방의 리더보드 순위표 가져오기
export function getRoomLeaderboard(pin: string): QuizParticipantResult[] {
  const allResults = getAllQuizResults();
  const list = allResults[pin] || [];

  return [...list].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.totalTimeSpent - b.totalTimeSpent;
  });
}

// 특정 방의 결과 기록 초기화
export function clearRoomResults(pin: string): void {
  const allResults = getAllQuizResults();
  delete allResults[pin];
  localStorage.setItem(RESULTS_KEY, JSON.stringify(allResults));
  notifyChannel({ type: 'RESULTS_CLEARED', pin });
}

// 특정 방 삭제
export function deleteQuizRoom(pin: string): void {
  const rooms = getAllQuizRooms();
  delete rooms[pin];
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  clearRoomResults(pin);
  localStorage.removeItem(`${LIVE_STATE_KEY_PREFIX}${pin}`);
  notifyChannel({ type: 'ROOM_DELETED', pin });
}

// ==========================================
// 퀴즈 문제 세트 보관함 (게시판 라이브러리 저장/불러오기)
// ==========================================

export function getAllSavedQuizPackages(): SavedQuizPackage[] {
  const data = localStorage.getItem(PACKAGES_KEY);
  if (data) {
    return JSON.parse(data);
  }

  // 기본 기본 세트 2종 (음악 1종, 엔트리 1종) 자동 등록
  const defaultSets: SavedQuizPackage[] = [
    {
      id: 'pkg_default_entry',
      title: '중학교 1학년 정보 (엔트리 블록 코딩 기초 모의고사)',
      subject: 'entry',
      examInfo: defaultEntryExamInfo,
      questions: defaultEntryQuestions,
      savedAt: '2026. 10. 08 10:00',
      questionCount: defaultEntryQuestions.length,
      description: '순차/반복/선택 구조 및 엔트리 블록 알고리즘 기본 문제 세트',
    },
    {
      id: 'pkg_default_music',
      title: '초등 5학년 음악 기초 (리듬 & 오선보 계이름)',
      subject: 'music',
      examInfo: defaultExamInfo,
      questions: defaultQuestions,
      savedAt: '2026. 10. 08 09:30',
      questionCount: defaultQuestions.length,
      description: '오선보 음자리표와 계이름, 박자표 계산 문제 세트',
    },
  ];

  localStorage.setItem(PACKAGES_KEY, JSON.stringify(defaultSets));
  return defaultSets;
}

export function saveQuizPackage(
  title: string,
  subject: 'music' | 'entry' | string,
  examInfo: ExamInfo,
  questions: Question[],
  description?: string
): SavedQuizPackage {
  const list = getAllSavedQuizPackages();
  const now = new Date();
  const savedAt = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newPkg: SavedQuizPackage = {
    id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    subject,
    examInfo,
    questions,
    savedAt,
    questionCount: questions.length,
    description: description || `${examInfo.schoolName} ${examInfo.grade} ${examInfo.term}`,
  };

  const updated = [newPkg, ...list];
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(updated));
  notifyChannel({ type: 'PACKAGE_SAVED', package: newPkg });
  return newPkg;
}

export function deleteSavedQuizPackage(id: string): void {
  const list = getAllSavedQuizPackages();
  const updated = list.filter((p) => p.id !== id);
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(updated));
  notifyChannel({ type: 'PACKAGE_DELETED', id });
}

// ==========================================
// 실시간 선생님(호스트/서버)-학생(클라이언트) 동기화 상태
// ==========================================

export function getLiveQuizState(pin: string): LiveQuizState | null {
  const data = localStorage.getItem(`${LIVE_STATE_KEY_PREFIX}${pin}`);
  return data ? JSON.parse(data) : null;
}

export async function fetchLiveQuizStateAsync(pin: string): Promise<LiveQuizState | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/quiz/live?pin=${pin}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.liveState) {
        if (typeof data.serverElapsedSec === 'number') {
          (data.liveState as any).serverElapsedSec = data.serverElapsedSec;
        }
        localStorage.setItem(`${LIVE_STATE_KEY_PREFIX}${pin}`, JSON.stringify(data.liveState));
        return data.liveState;
      }
    }
  } catch {}
  return getLiveQuizState(pin);
}

export function setLiveQuizState(state: LiveQuizState): void {
  const stateWithTime: LiveQuizState = {
    ...state,
    updatedAt: state.updatedAt || Date.now(),
  };
  localStorage.setItem(`${LIVE_STATE_KEY_PREFIX}${stateWithTime.pin}`, JSON.stringify(stateWithTime));
  notifyChannel({ type: 'LIVE_STATE_CHANGED', state: stateWithTime });

  // 서버 API에도 동기화 (원격 모바일 기기 접속 지원)
  try {
    fetch(`${getApiBaseUrl()}/api/quiz/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateWithTime),
    }).catch(() => {});
  } catch {}
}

// ==========================================
// BroadcastChannel & Storage Event & Server Polling 동기화
// ==========================================

let channel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
}

function notifyChannel(data: unknown) {
  if (channel) {
    try {
      channel.postMessage(data);
    } catch (e) {
      console.warn('BroadcastChannel postMessage failed:', e);
    }
  }
  // 동일 창 내부 컴포넌트(호스트 화면과 우측 학생 미리보기 등) 간 즉각 동기화 지원
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quiz_internal_sync', { detail: data }));
  }
}

export function subscribeToQuizUpdates(
  callback: (msg: unknown) => void,
  activePin?: string
): () => void {
  const handler = (event: MessageEvent) => {
    callback(event.data);
  };

  if (channel) {
    channel.addEventListener('message', handler);
  }

  const internalHandler = (e: any) => {
    callback(e.detail);
  };
  window.addEventListener('quiz_internal_sync', internalHandler);

  const storageHandler = (e: StorageEvent) => {
    if (
      e.key === RESULTS_KEY ||
      e.key === ROOMS_KEY ||
      e.key === PACKAGES_KEY ||
      e.key?.startsWith(LIVE_STATE_KEY_PREFIX)
    ) {
      callback({ type: 'STORAGE_CHANGED', key: e.key });
    }
  };
  window.addEventListener('storage', storageHandler);

  // 원격 스마트폰-PC 간 실시간 동기화를 위한 가벼운 1초 주기 서버 폴링
  let pollTimer: any = null;
  if (activePin && typeof window !== 'undefined') {
    pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/quiz/live?pin=${activePin}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.liveState) {
            if (typeof data.serverElapsedSec === 'number') {
              (data.liveState as any).serverElapsedSec = data.serverElapsedSec;
            }
            localStorage.setItem(`${LIVE_STATE_KEY_PREFIX}${activePin}`, JSON.stringify(data.liveState));
            callback({ type: 'LIVE_STATE_POLL', state: data.liveState, serverElapsedSec: data.serverElapsedSec });
          }
        }
      } catch {}
    }, 1000);
  }

  return () => {
    channel?.removeEventListener('message', handler);
    window.removeEventListener('quiz_internal_sync', internalHandler);
    window.removeEventListener('storage', storageHandler);
    if (pollTimer) clearInterval(pollTimer);
  };
}
