import type { ExamInfo, Question } from '@/types/exam';
import { defaultGeneralExamInfo, defaultGeneralQuestions } from './defaultGeneralExam';
import { defaultEntryExamInfo, defaultEntryQuestions } from './defaultEntryExam';
import { defaultFormativeExamInfo, defaultFormativeQuestions } from './defaultFormativeExam';
import { defaultExamInfo, defaultQuestions } from './defaultExam';

export interface QuizPresetItem {
  id: string;
  title: string;
  description: string;
  category: string;
  badge: string;
  badgeColor: string;
  icon: string;
  examInfo: ExamInfo;
  questions: Question[];
}

export const QUIZ_PRESETS: QuizPresetItem[] = [
  {
    id: 'general',
    title: '💡 교실 상식 & 두뇌 워밍업 퀴즈 (추천 기본값)',
    description: '수도 맞추기, 빛의 속도, 식물 광합성, 역사 상식 등 전 학년 흥미 유발 5문항',
    category: '상식 / 창의체험',
    badge: '추천 기본',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'Sparkles',
    examInfo: defaultGeneralExamInfo,
    questions: defaultGeneralQuestions,
  },
  {
    id: 'formative',
    title: '✏️ 수업 1분 핵심 형성평가 (OX + 객관식)',
    description: '수업 후 학생들의 이해도를 1분 만에 점검할 수 있는 표준 교과 템플릿',
    category: '형성평가 / 수업확인',
    badge: '수업 확인',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'CheckCircle2',
    examInfo: defaultFormativeExamInfo,
    questions: defaultFormativeQuestions,
  },
  {
    id: 'entry',
    title: '💻 정보 & 엔트리 블록 코딩 기초',
    description: '시작 블록, 반복문, 이동 거리 등 정보/SW 수업용 블록 코딩 5문항',
    category: '정보 / 소프트웨어',
    badge: 'SW/코딩',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: 'Code',
    examInfo: defaultEntryExamInfo,
    questions: defaultEntryQuestions,
  },
  {
    id: 'music',
    title: '🎵 감성 음악 & 기초 음악 이론',
    description: '음정 계산, 조표, 장조와 단조 등 실시간 악보와 음원이 포함된 음악 퀴즈',
    category: '음악 / 예술',
    badge: '음악/예술',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: 'Music',
    examInfo: defaultExamInfo,
    questions: defaultQuestions,
  },
];

// 선생님이 복사해서 메모장에서 편집 후 붙여넣을 수 있는 표준 출제 양식 샘플
export const SAMPLE_BATCH_TEXT = `1. 다음 중 빛의 삼원색에 해당하지 않는 색깔은 무엇일까요? [5점]
① 빨강(Red)
② 초록(Green)
③ 파랑(Blue)
④ 노랑(Yellow)
정답: 4
💡 해설: 빛의 삼원색은 RGB(빨강, 초록, 파랑)이며, 노랑은 빛의 합성으로 만들어지는 색상입니다.
---
2. (OX 퀴즈) 식물은 낮 동안 햇빛을 받아 광합성을 진행하여 산소를 배출한다. [5점]
① O (그렇다)
② X (아니다)
정답: 1
💡 해설: 식물은 낮에 이산화탄소를 흡수하고 산소를 방출하는 광합성을 수행합니다.
---
3. 컴퓨터의 두뇌 역할을 하며 모든 연산과 제어를 총괄하는 핵심 부품의 명칭은? [5점]
① 모니터(Monitor)
② 중앙처리장치(CPU)
③ 키보드(Keyboard)
④ 마우스(Mouse)
⑤ 전원 공급 장치(Power)
정답: 2
💡 해설: CPU는 Central Processing Unit의 약자로 컴퓨터의 모든 두뇌 연산을 담당합니다.`;

// 생성형 AI(ChatGPT, Claude, 뤼튼 등) 프롬프트 템플릿
export const AI_QUIZ_PROMPT_TEMPLATE = `[과목 및 주제: {과목 또는 단원명}]과 관련된 4~5지선다 또는 OX 퀴즈를 아래 형식에 맞춰 5문항 출제해줘.

[작성 규칙]
1. 각 문제 번호와 배점을 작성한다. (예: 1. 문제 내용? [5점])
2. 보기는 ①, ②, ③, ④ 또는 ①, ②(OX인 경우) 형식으로 쓴다.
3. 문항 끝에는 반드시 "정답: 번호"와 "💡 해설: 설명내용"을 포함한다.
4. 문항 사이는 '---'로 구분한다.

[출력 형식 예시]
1. 대한민국 헌법상 수도의 명칭은? [5점]
① 부산 ② 서울특별시 ③ 대전 ④ 광주
정답: 2
💡 해설: 대한민국의 수도는 서울특별시입니다.
---
2. (OX 퀴즈) 물의 끓는점은 1기압에서 100℃이다. [5점]
① O (그렇다) ② X (아니다)
정답: 1
💡 해설: 1기압에서 순수한 물은 100도에서 끓습니다.`;
