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
  isPublic: boolean; // 학교 전체 공유 여부 (On: 누구나 조회/복제 가능, Off: 비공개)
  columns?: string[];
  customBgUrl?: string;
  category?: '수업자료' | '모둠활동' | '학급회의' | '자유나눔' | '프로젝트';
  copiedFromTitle?: string; // 복제 출처
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

export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'white';
  imageUrl?: string;
  linkUrl?: string;
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
