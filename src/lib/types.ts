export type UserRole = 'student' | 'teacher' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  username?: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  schoolName?: string;
  grade?: string;
  classNum?: string;
  createdAt: string;
}

export type BoardLayout = 'kanban' | 'canvas' | 'grid' | 'stream';
export type BoardTheme = 'blue' | 'cork' | 'blackboard' | 'gradient' | 'warm';

export interface Board {
  id: string;
  code: string;
  title: string;
  description: string;
  layout: BoardLayout;
  theme: BoardTheme;
  authorId: string;
  authorName: string;
  authorRole?: UserRole;
  allowStudentPost: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  isLocked: boolean;
  isPublic: boolean;
  columns?: string[];
  coverImageUrl?: string; // 메인 화면 카드 대표 썸네일 이미지
  customBgUrl?: string;   // 보드 내부 전체 배경화면 이미지
  category?: '수업자료' | '모둠활동' | '학급회의' | '자유나눔' | '프로젝트';
  copiedFromTitle?: string;
  createdAt: string;
  postCount?: number;
}

export interface PostReaction {
  like: number;
  clap: number;
  heart: number;
  insight: number;
}

export interface PostComment {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface FileAttachment {
  name: string;
  size: string;
  type?: string;
  dataUrl: string;
}

export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'white';
  imageUrl?: string;
  linkUrl?: string;
  fileAttachment?: FileAttachment; // 단일 호환
  attachments?: FileAttachment[]; // 여러 파일 첨부 (HWP, PDF, PPT, Word 등)
  authorName: string;
  authorRole: UserRole;
  authorId: string;
  reactions: PostReaction;
  comments: PostComment[];
  pinned?: boolean;
  column?: string;
  order?: number;
  x?: number;
  y?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemSettings {
  autoApproveUsers: boolean;
  allowGoogleLogin: boolean;
  allowGuestStudentCode: boolean;
  schoolName: string;
}
