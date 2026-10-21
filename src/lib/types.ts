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
  allowStudentPost: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  isLocked: boolean;
  columns?: string[];
  customBgUrl?: string; // 사용자가 직접 올린 배경화면 URL
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
