export type QuestionType = 'multiple-choice' | 'short-answer';

export type QuestionCategory = '기초이론' | '청음/감상' | '악곡분석' | '서양음악사' | '국악' | '엔트리 코딩';

export type DifficultyLevel = '하' | '중' | '상';

export interface Question {
  id: string;
  category: QuestionCategory;
  type: QuestionType;
  points: number;
  title: string;
  hasScore: boolean;
  scoreAbc: string; // ABC Notation
  hasAudio: boolean; // 청음 문제 여부
  imageUrl?: string; // 첨부된 이미지 데이터 (Base64)
  entryBlocks?: string[]; // 엔트리 블록 코드 라인들
  options: string[]; // 객관식 보기 (보통 4~5개)
  correctAnswer: string; // 객관식은 1~5, 주관식은 텍스트 정답
  explanation: string; // 해설
  difficulty: DifficultyLevel;
}

export interface ExamInfo {
  schoolName: string;
  grade: string;
  term: string;
  subject: string;
  date: string;
  totalTime: string;
  instructions: string[];
}
