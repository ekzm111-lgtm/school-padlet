// Next.js API 라우트 간 실시간 퀴즈 룸 및 라이브 상태 인메모리 저장소

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
