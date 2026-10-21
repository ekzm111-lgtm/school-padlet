import { Board, Post, User, SystemSettings } from './types';

const INITIAL_SETTINGS: SystemSettings = {
  autoApproveUsers: true, // 기본값: 자동 가입
  allowGoogleLogin: true,
  allowGuestStudentCode: true,
  schoolName: '미래한국초·중·고등학교',
};

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: '김관리 (정보부장)',
    email: 'admin@school.ac.kr',
    role: 'admin',
    status: 'approved',
    schoolName: '미래한국고등학교',
    createdAt: '2026-10-01',
  },
  {
    id: 'user-teacher-1',
    name: '이수학 선생님',
    email: 'math.lee@school.ac.kr',
    role: 'teacher',
    status: 'approved',
    schoolName: '미래한국고등학교',
    createdAt: '2026-10-05',
  },
  {
    id: 'user-student-1',
    name: '박민우 (학생)',
    email: 'minwoo2026@gmail.com',
    role: 'student',
    status: 'approved',
    schoolName: '미래한국고등학교',
    grade: '2',
    classNum: '3',
    createdAt: '2026-10-10',
  },
  {
    id: 'user-student-pending',
    name: '최지우 (신규가입 학생)',
    email: 'jiwoo.student@gmail.com',
    role: 'student',
    status: 'pending',
    schoolName: '미래한국고등학교',
    grade: '1',
    classNum: '5',
    createdAt: '2026-10-21',
  },
];

const INITIAL_BOARDS: Board[] = [
  {
    id: 'board-1',
    code: '782914',
    title: '🌿 2학년 3반 과학 탐구: 신재생 에너지 아이디어 보드',
    description: '각자 조사한 친환경 에너지 기술과 일상생활 적용 방안을 카드와 이미지로 공유해 봅시다.',
    layout: 'grid',
    theme: 'blue',
    authorId: 'user-teacher-1',
    authorName: '이수학 선생님',
    allowStudentPost: true,
    allowComments: true,
    allowReactions: true,
    isLocked: false,
    createdAt: '2026-10-18',
  },
  {
    id: 'board-2',
    code: '304918',
    title: '📚 1학기 온작품 읽기 독서 나눔방 (칸반 모둠 활동)',
    description: '책을 읽고 인상 깊었던 구절과 나의 생각을 모둠별로 정리해 봅시다.',
    layout: 'kanban',
    theme: 'warm',
    authorId: 'user-teacher-1',
    authorName: '이수학 선생님',
    allowStudentPost: true,
    allowComments: true,
    allowReactions: true,
    isLocked: false,
    createdAt: '2026-10-19',
  },
];

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    boardId: 'board-1',
    title: '태양광 페로브스카이트 전지 조사',
    content: '기존 실리콘 전지보다 유연하고 건물 창문에도 바를 수 있어서 학교 창문에 적용하면 좋을 것 같습니다!',
    color: 'yellow',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=60',
    linkUrl: 'https://ko.wikipedia.org/wiki/페로브스카이트_태양전지',
    authorName: '박민우 (2-3)',
    authorRole: 'student',
    authorId: 'user-student-1',
    reactions: { like: 12, clap: 5, heart: 8, insight: 4 },
    comments: [
      {
        id: 'c-1',
        postId: 'post-1',
        authorName: '이수학 선생님',
        content: '민우 학생 아주 훌륭한 접근입니다! 설치 비용 면도 추가 조사해보면 좋겠네요.',
        createdAt: '10분 전',
      },
    ],
    createdAt: '2026-10-20 10:20',
  },
  {
    id: 'post-2',
    boardId: 'board-1',
    title: '바람이 많이 부는 옥상 풍력 발전기',
    content: '우리 학교 강당 옥상 바람을 이용해서 야간 비상등을 켜는 소형 풍력 터빈 아이디어입니다.',
    color: 'green',
    imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=60',
    authorName: '이지은 (2-3)',
    authorRole: 'student',
    authorId: 'user-student-2',
    reactions: { like: 9, clap: 7, heart: 3, insight: 6 },
    comments: [],
    createdAt: '2026-10-20 11:05',
  },
  {
    id: 'post-3',
    boardId: 'board-1',
    title: '📌 [공지] 오늘 발표 순서 안내',
    content: '1모둠 태양광 -> 2모둠 풍력 -> 3모둠 조력 순서로 3분씩 발표합니다. 친구들 글에 좋아요와 칭찬 댓글을 달아주세요!',
    color: 'pink',
    pinned: true,
    authorName: '이수학 선생님',
    authorRole: 'teacher',
    authorId: 'user-teacher-1',
    reactions: { like: 24, clap: 15, heart: 18, insight: 10 },
    comments: [],
    createdAt: '2026-10-20 09:00',
  },
  // 칸반 보드용 포스트들
  {
    id: 'post-k1',
    boardId: 'board-2',
    title: '1장: 소년이 온다 배경 조사',
    content: '5.18 민주화운동 당시의 광주 상황과 역사적 배경 요약',
    color: 'blue',
    column: '조사/준비 중',
    authorName: '1모둠 김민재',
    authorRole: 'student',
    authorId: 'user-student-3',
    reactions: { like: 4, clap: 2, heart: 1, insight: 3 },
    comments: [],
    createdAt: '2026-10-20 14:00',
  },
  {
    id: 'post-k2',
    boardId: 'board-2',
    title: '인상 깊은 구절 발췌',
    content: '"당신이 죽은 뒤 장례식을 치르지 못해, 내 삶이 장례식이 되었습니다." 이 문장이 가장 가슴에 와닿았습니다.',
    color: 'yellow',
    column: '토론/생각 나누기',
    authorName: '2모둠 정서윤',
    authorRole: 'student',
    authorId: 'user-student-4',
    reactions: { like: 15, clap: 8, heart: 12, insight: 9 },
    comments: [],
    createdAt: '2026-10-20 14:15',
  },
];

// 로컬 스토리지 헬퍼 함수
const STORAGE_KEYS = {
  SETTINGS: 'school_padlet_settings',
  USERS: 'school_padlet_users',
  BOARDS: 'school_padlet_boards',
  POSTS: 'school_padlet_posts',
  CURRENT_USER: 'school_padlet_current_user',
};

export interface StoreData {
  settings: SystemSettings;
  users: User[];
  boards: Board[];
  posts: Post[];
  currentUser: User | null;
}

export const getStoreData = (): StoreData => {
  if (typeof window === 'undefined') {
    return {
      settings: INITIAL_SETTINGS,
      users: INITIAL_USERS,
      boards: INITIAL_BOARDS,
      posts: INITIAL_POSTS,
      currentUser: INITIAL_USERS[0], // 기본 김관리(어드민)
    };
  }

  const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  const storedBoards = localStorage.getItem(STORAGE_KEYS.BOARDS);
  const storedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
  const storedCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);

  return {
    settings: storedSettings ? JSON.parse(storedSettings) : INITIAL_SETTINGS,
    users: storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS,
    boards: storedBoards ? JSON.parse(storedBoards) : INITIAL_BOARDS,
    posts: storedPosts ? JSON.parse(storedPosts) : INITIAL_POSTS,
    currentUser: storedCurrentUser ? JSON.parse(storedCurrentUser) : INITIAL_USERS[0],
  };
};

export const saveStoreData = {
  settings: (data: SystemSettings) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
      window.dispatchEvent(new Event('store_updated'));
    }
  },
  users: (data: User[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data));
      window.dispatchEvent(new Event('store_updated'));
    }
  },
  boards: (data: Board[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(data));
      window.dispatchEvent(new Event('store_updated'));
    }
  },
  posts: (data: Post[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(data));
      window.dispatchEvent(new Event('store_updated'));
    }
  },
  currentUser: (data: User | null) => {
    if (typeof window !== 'undefined') {
      if (data) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
      window.dispatchEvent(new Event('store_updated'));
    }
  },
};
