import type { ExamInfo, Question } from '@/types/exam';

export const defaultExamInfo: ExamInfo = {
  schoolName: '대한중학교',
  grade: '제 2학년',
  term: '1학기 1차 지필평가',
  subject: '음악',
  date: '2026. 10. 08',
  totalTime: '45분',
  instructions: [
    '문제지의 문항 수와 인쇄 상태를 확인하십시오.',
    '객관식 답안은 OMR 카드 또는 답안란에 정확히 표기하십시오.',
    '배점은 각 문항 끝에 표시되어 있습니다.',
  ],
};

export const defaultQuestions: Question[] = [
  {
    id: 'q1',
    category: '기초이론',
    type: 'multiple-choice',
    points: 4,
    title: '다음 악보에 제시된 두 음 사이의 음정(Interval)으로 알맞은 것은?',
    hasScore: true,
    scoreAbc: `X:1
M:C
L:1/1
K:C
[CE] |]`,
    hasAudio: true,
    options: ['단 3도', '장 3도', '완전 4도', '완전 5도', '감 3도'],
    correctAnswer: '2',
    explanation: 'C(도)와 E(미)는 온음 2개로 이루어진 3도 음정이므로 "장 3도"입니다.',
    difficulty: '하',
  },
  {
    id: 'q2',
    category: '기초이론',
    type: 'multiple-choice',
    points: 4,
    title: '다음 악보의 조표(Key Signature)를 보고 으뜸음이 \'G(솔)\'인 장조(Major key)의 명칭으로 알맞은 것은?',
    hasScore: true,
    scoreAbc: `X:1
M:4/4
L:1/4
K:G
G A B c | d4 |]`,
    hasAudio: true,
    options: ['다장조 (C Major)', '바장조 (F Major)', '사장조 (G Major)', '라장조 (D Major)', '내림나장조 (Bb Major)'],
    correctAnswer: '3',
    explanation: '올림표(#)가 파(F#) 자리에 1개 붙은 조표는 사장조(G Major) 또는 마단조(E minor)입니다. 으뜸음이 솔(G)이므로 사장조입니다.',
    difficulty: '하',
  },
  {
    id: 'q3',
    category: '기초이론',
    type: 'multiple-choice',
    points: 5,
    title: '다음 4/4박자 악보에서 한 마디를 온전하게 완성하기 위해 빈칸(쉼표 자리)에 들어가야 할 쉼표로 알맞은 것은?',
    hasScore: true,
    scoreAbc: `X:1
M:4/4
L:1/4
K:C
c2 c z |]`,
    hasAudio: false,
    options: ['온쉼표', '2분쉼표', '4분쉼표', '8분쉼표', '16분쉼표'],
    correctAnswer: '3',
    explanation: '4/4박자는 한 마디에 4분음표 4개(4박)가 들어가야 합니다. 악보에는 2분음표(2박) + 4분음표(1박) = 3박이 채워져 있으므로 남은 박자는 1박, 즉 4분쉼표가 필요합니다.',
    difficulty: '중',
  },
  {
    id: 'q4',
    category: '청음/감상',
    type: 'multiple-choice',
    points: 5,
    title: '[청음 문제] 재생되는 멜로디를 듣고, 악보의 빈 마디에 연주된 올바른 리듬 및 음형을 고르시오.',
    hasScore: true,
    scoreAbc: `X:1
M:4/4
L:1/4
K:C
c d e f | g2 g2 |]`,
    hasAudio: true,
    options: [
      '도-레-미-파 | 솔--- (4박)',
      '도-레-미-파 | 솔-솔- (각 2박)',
      '도-미-솔-도 | 솔-솔- (각 2박)',
      '레-파-라-도 | 미--- (4박)',
      '도-도-레-레 | 미-솔- (각 2박)'
    ],
    correctAnswer: '2',
    explanation: '상행 4개 음(도-레-미-파) 후 솔 음이 2분음표 2개로 2박씩 유지됩니다.',
    difficulty: '중',
  },
  {
    id: 'q5',
    category: '악곡분석',
    type: 'multiple-choice',
    points: 5,
    title: '다음 제시된 화음의 종류(코드 네임)로 가장 적절한 것은?',
    hasScore: true,
    scoreAbc: `X:1
M:C
L:1/1
K:C
[CEG] |]`,
    hasAudio: true,
    options: ['C (C Major)', 'Cm (C minor)', 'Cdim (감화음)', 'Caug (증화음)', 'C7 (속7화음)'],
    correctAnswer: '1',
    explanation: '도(C)-미(E)-솔(G)로 구성된 기본 3화음은 장3도+단3도 결합인 C Major(장3화음)입니다.',
    difficulty: '하',
  },
  {
    id: 'q6',
    category: '국악',
    type: 'short-answer',
    points: 5,
    title: '우리나라 전통 장단 중 보통 빠르기의 3박자 계통으로, 민요 <아리랑>, <도라지타령>의 반주에 널리 쓰이는 장단의 이름을 쓰시오.',
    hasScore: false,
    scoreAbc: '',
    hasAudio: false,
    options: [],
    correctAnswer: '세마치 장단',
    explanation: '세마치 장단은 덩-덕 쿵덕덕 등의 구음으로 이루어진 대표적인 3박(9/8박자 체계) 장단이며 아리랑, 도라지타령 등에 쓰입니다.',
    difficulty: '중',
  },
];
