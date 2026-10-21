export type UserRole = 'student' | 'teacher' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
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

export type BoardLayout = 'grid' | 'wall' | 'stream' | 'kanban';
export type BoardTheme = 'blue' | 'cork' | 'blackboard' | 'gradient' | 'warm';

export interface Board {
  id: string;
  code: string; // 6자리 학생 참여 핀코드 (예: 482910)
  title: string;
  description: string;
  layout: BoardLayout;
  theme: BoardTheme;
  authorId: string;
  authorName: string;
  allowStudentPost: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  isLocked: boolean; // 수업 종료 후 읽기 전용
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
  fileAttachment?: {
    name: string;
    url: string;
    size?: string;
  };
  authorName: string;
  authorRole: UserRole;
  authorId: string;
  reactions: PostReaction;
  comments: PostComment[];
  pinned?: boolean;
  column?: string; // 칸반 레이아웃용 (예: '할 일', '진행 중', '완료')
  createdAt: string;
}

export interface SystemSettings {
  autoApproveUsers: boolean; // 기본값 true: 자동 가입
  allowGoogleLogin: boolean;
  allowGuestStudentCode: boolean; // 비로그인 PIN코드 참여 허용 여부
  schoolName: string;
}
