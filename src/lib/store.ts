import { Board, Post, User, SystemSettings } from './types';
import { fileStorage } from './fileStorage';

const INITIAL_SETTINGS: SystemSettings = {
  autoApproveUsers: true,
  allowGoogleLogin: true,
  allowGuestStudentCode: true,
  schoolName: '미래한국초·중·고등학교',
};

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin',
    name: '김관리 (정보부장)',
    email: 'admin@school.ac.kr',
    role: 'admin',
    status: 'approved',
    schoolName: '미래한국고등학교',
    createdAt: '2026-10-01',
  },
  {
    id: 'user-teacher-1',
    username: 'teacher',
    password: '1234',
    name: '이수학 선생님',
    email: 'math.lee@school.ac.kr',
    role: 'teacher',
    status: 'approved',
    schoolName: '미래한국고등학교',
    createdAt: '2026-10-05',
  },
  {
    id: 'user-student-1',
    username: 'student',
    password: '1234',
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
    username: 'jiwoo',
    password: '1234',
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
    layout: 'kanban',
    theme: 'blue',
    customBgUrl: '/korean_classroom_banner.jpg',
    authorId: 'user-teacher-1',
    authorName: '이수학 선생님',
    authorRole: 'teacher',
    allowStudentPost: true,
    allowComments: true,
    allowReactions: true,
    isLocked: false,
    isPublic: true,
    category: '수업자료',
    columns: ['태양광 조사', '풍력/수력 조사', '아이디어 제안'],
    createdAt: '2026-10-18',
  },
  {
    id: 'board-2',
    code: '304918',
    title: '📚 1학기 온작품 읽기 독서 나눔방 (모둠 협업 템플릿)',
    description: '책을 읽고 인상 깊었던 구절과 나의 생각을 모둠별로 정리해 봅시다. 다른 반 선생님도 복제해서 사용하실 수 있습니다.',
    layout: 'kanban',
    theme: 'warm',
    authorId: 'user-teacher-1',
    authorName: '이수학 선생님',
    authorRole: 'teacher',
    allowStudentPost: true,
    allowComments: true,
    allowReactions: true,
    isLocked: false,
    isPublic: true,
    category: '모둠활동',
    columns: ['1장 생각나누기', '2장 토론질문', '전체 서평'],
    createdAt: '2026-10-19',
  },
  {
    id: 'board-3',
    code: '519283',
    title: '🎨 우리 반 미술 갤러리: 캡처 및 일러스트 작품 전시회',
    description: '태블릿으로 그린 디지털 드로잉이나 미술 과제를 자유롭게 게시하는 온라인 전시관입니다.',
    layout: 'canvas',
    theme: 'gradient',
    authorId: 'user-student-1',
    authorName: '박민우 (학생)',
    authorRole: 'student',
    allowStudentPost: true,
    allowComments: true,
    allowReactions: true,
    isLocked: false,
    isPublic: true,
    category: '자유나눔',
    createdAt: '2026-10-20',
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
    column: '태양광 조사',
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
    column: '풍력/수력 조사',
    reactions: { like: 9, clap: 7, heart: 3, insight: 6 },
    comments: [],
    createdAt: '2026-10-20 11:05',
  },
];

const STORAGE_KEYS = {
  SETTINGS: 'school_padlet_settings',
  USERS: 'school_padlet_users',
  BOARDS: 'school_padlet_boards',
  POSTS: 'school_padlet_posts',
  CURRENT_USER: 'school_padlet_current_user',
  MY_POST_IDS: 'school_padlet_my_post_ids',
};

export const getMyPostIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.MY_POST_IDS);
  return stored ? JSON.parse(stored) : [];
};

export const addMyPostId = (postId: string) => {
  if (typeof window === 'undefined') return;
  const list = getMyPostIds();
  if (!list.includes(postId)) {
    localStorage.setItem(STORAGE_KEYS.MY_POST_IDS, JSON.stringify([...list, postId]));
  }
};

export interface StoreData {
  settings: SystemSettings;
  users: User[];
  boards: Board[];
  posts: Post[];
  currentUser: User | null;
}

// 대용량 파일(10MB) 첨부 시 localStorage 5MB 한계 극복을 위한 메모리 캐시 및 IndexedDB 연동
let memoryPostsCache: Post[] | null = null;

if (typeof window !== 'undefined') {
  fileStorage.get('school_padlet_posts_full').then((fullJson) => {
    if (fullJson) {
      try {
        const parsed = JSON.parse(fullJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryPostsCache = parsed;
          window.dispatchEvent(new Event('store_updated'));
        }
      } catch (e) {}
    }
  });
}

export const getStoreData = (): StoreData => {
  if (typeof window === 'undefined') {
    return {
      settings: INITIAL_SETTINGS,
      users: INITIAL_USERS,
      boards: INITIAL_BOARDS,
      posts: INITIAL_POSTS,
      currentUser: null,
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
    posts: memoryPostsCache || (storedPosts ? JSON.parse(storedPosts) : INITIAL_POSTS),
    currentUser: storedCurrentUser ? JSON.parse(storedCurrentUser) : null,
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
      // 1. 메모리 캐시 즉시 갱신
      memoryPostsCache = data;

      // 2. 대용량 파일(10MB) 저장을 위해 브라우저 내장 IndexedDB에 영구 저장 (용량 한도 수백 MB)
      fileStorage.set('school_padlet_posts_full', JSON.stringify(data));

      // 3. localStorage에도 저장 시도 (5MB 초과 시 메타데이터 백업)
      try {
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(data));
      } catch (quotaErr) {
        console.warn('LocalStorage quota reached (5MB limit). Using IndexedDB storage instead.');
        try {
          const lightweight = data.map((p) => ({
            ...p,
            attachments: p.attachments?.map((a) => ({ ...a, dataUrl: '' })),
          }));
          localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(lightweight));
        } catch (e2) {}
      }

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

// 🔥 보드 복제(Copy/Remix) 함수: 다른 사람이 공유한 보드를 내 보드로 통째로 가져오기
export const duplicateBoard = (sourceBoardId: string, currentUser: User): Board | null => {
  const data = getStoreData();
  const source = data.boards.find((b) => b.id === sourceBoardId);
  if (!source) return null;

  const newBoardId = `board-copy-${Date.now()}`;
  const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

  const copiedBoard: Board = {
    ...source,
    id: newBoardId,
    code: randomCode,
    title: `[복제본] ${source.title}`,
    authorId: currentUser.id,
    authorName: currentUser.name,
    authorRole: currentUser.role,
    copiedFromTitle: source.title,
    createdAt: new Date().toISOString().split('T')[0],
  };

  // 원본 보드의 게시글들도 복사하여 새 보드로 연결
  const sourcePosts = data.posts.filter((p) => p.boardId === sourceBoardId);
  const copiedPosts = sourcePosts.map((p) => ({
    ...p,
    id: `post-copy-${Date.now()}-${Math.random()}`,
    boardId: newBoardId,
    authorId: currentUser.id,
    reactions: { like: 0, clap: 0, heart: 0, insight: 0 },
    comments: [],
  }));

  saveStoreData.boards([copiedBoard, ...data.boards]);
  saveStoreData.posts([...copiedPosts, ...data.posts]);

  return copiedBoard;
};
