import { Board, Post, User, SystemSettings } from './types';
import { fileStorage } from './fileStorage';
import { isSupabaseConfigured, supabase } from './supabase';
import {
  fetchRemoteBoards,
  fetchRemotePosts,
  saveRemoteBoard,
  saveRemotePost,
  deleteRemoteBoard,
  deleteRemotePost,
} from './supabaseStore';

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
    id: 'board-vibecoding',
    code: '999190',
    title: '바이브코딩 교육자료',
    description: '바이브코딩 실습 및 교육 자료 공유를 위한 수업 보드입니다.',
    layout: 'kanban',
    theme: 'blue',
    coverImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
    authorId: 'user-vibecoding',
    authorName: '바이브코딩',
    authorRole: 'teacher',
    allowStudentPost: true,
    allowComments: true,
    allowReactions: true,
    isLocked: false,
    isPublic: true,
    category: '수업자료',
    columns: ['모둠 1', '모둠 2', '모둠 3'],
    createdAt: '2026-10-25',
  },
  {
    id: 'board-digital-tutor-2025',
    code: '202501',
    title: '2025. 디지털튜터 강의의 복제물',
    description: '디지털튜터 양성 및 역량 강화 실습 강의를 위한 수업 협업 및 실습 보드입니다.',
    layout: 'kanban',
    theme: 'blue',
    coverImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
    authorId: 'user-admin',
    authorName: 'minwan kim (디지털튜터 강사)',
    authorRole: 'teacher',
    allowStudentPost: true,
    allowComments: true,
    allowReactions: true,
    isLocked: false,
    isPublic: true,
    category: '수업자료',
    columns: [
      '[1강] 디지털 기초 & 기기 활용',
      '[2강] 에듀테크 도구 탐구',
      '[3강] 수업 실습 & 교안 제작',
      '[4강] 디지털튜터 코칭 사례',
      '자료 나눔 & Q&A',
    ],
    createdAt: '2025-11-08',
  },
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
    id: 'post-vibe-1',
    boardId: 'board-vibecoding',
    title: 'QR 동의서 샘플',
    content: '구글 앱스스크립트를 활용한 학생/학부모 QR 모바일 동의서 실습 양식입니다.',
    color: 'yellow',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60',
    linkUrl: 'https://script.google.com/macros/s/AKfycbz_sample',
    authorId: 'user-vibecoding',
    authorName: '바이브',
    authorRole: 'teacher',
    column: '모둠 1',
    reactions: { like: 5, clap: 3, heart: 2, insight: 1 },
    comments: [],
    createdAt: '방금 전',
  },
  {
    id: 'post-vibe-2',
    boardId: 'board-vibecoding',
    title: '엑셀시트 데이터',
    content: '실시간 응답 데이터를 취합하고 분석하는 스프레드시트 예시 자료입니다.',
    color: 'blue',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
    linkUrl: 'https://docs.google.com/spreadsheets/d/sample',
    authorId: 'user-vibecoding',
    authorName: '바이브',
    authorRole: 'teacher',
    column: '모둠 1',
    reactions: { like: 4, clap: 2, heart: 1, insight: 0 },
    comments: [],
    createdAt: '방금 전',
  },
  {
    id: 'post-vibe-3',
    boardId: 'board-vibecoding',
    title: '교육자료 유인물',
    content: '수업에 필요한 필수 활동지 및 참고 유인물 모음입니다.',
    color: 'white',
    authorId: 'user-vibecoding',
    authorName: '바이브',
    authorRole: 'teacher',
    column: '모둠 2',
    reactions: { like: 3, clap: 1, heart: 0, insight: 0 },
    comments: [],
    createdAt: '방금 전',
  },
  {
    id: 'dt-post-1',
    boardId: 'board-digital-tutor-2025',
    title: '📱 [1강] 태블릿 기기 기본 설정 & 미러링 가이드',
    content: '수업 시작 5분 전 교실 와이파이 연결 상태 및 미러링(무선 화면 전송) 점검 체크리스트입니다.',
    color: 'blue',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    linkUrl: 'https://padlet.com/ekzm111/2025-4bqdzenxzjr0mjty',
    authorName: 'minwan kim (강사)',
    authorRole: 'teacher',
    authorId: 'user-admin',
    column: '[1강] 디지털 기초 & 기기 활용',
    reactions: { like: 8, clap: 5, heart: 6, insight: 4 },
    comments: [],
    createdAt: '2025-11-08 09:30',
  },
  {
    id: 'dt-post-2',
    boardId: 'board-digital-tutor-2025',
    title: '🎨 [2강] 패들릿 & 캔바 협업 템플릿 실습',
    content: '학생들이 직접 아이디어를 카드에 적고, 실시간으로 생각을 공유하는 상호작용 수업 설계 기법을 배웁니다.',
    color: 'yellow',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80',
    linkUrl: 'https://padlet.com',
    authorName: 'minwan kim (강사)',
    authorRole: 'teacher',
    authorId: 'user-admin',
    column: '[2강] 에듀테크 도구 탐구',
    reactions: { like: 12, clap: 9, heart: 7, insight: 5 },
    comments: [],
    createdAt: '2025-11-08 11:15',
  },
  {
    id: 'dt-post-3',
    boardId: 'board-digital-tutor-2025',
    title: '📄 [3강] 모둠별 협업 수업계획서 서식 (HWP/PDF)',
    content: '실습용 협업 수업계획서 양식 파일입니다. 다운로드받아 모둠별로 작성 후 이 열에 업로드해 주세요.',
    color: 'purple',
    authorName: 'minwan kim (강사)',
    authorRole: 'teacher',
    authorId: 'user-admin',
    column: '[3강] 수업 실습 & 교안 제작',
    reactions: { like: 6, clap: 4, heart: 5, insight: 3 },
    comments: [],
    createdAt: '2025-11-08 14:00',
  },
  {
    id: 'dt-post-4',
    boardId: 'board-digital-tutor-2025',
    title: '🌟 [4강] 디지털 기기 장애 대처 & 1:1 맞춤 코칭 팁',
    content: '소리가 안 나거나 앱이 튕길 때 3초 해결법, 기기 조작이 서툰 학생을 격려하며 이끄는 튜터링 노하우입니다.',
    color: 'green',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    authorName: 'minwan kim (강사)',
    authorRole: 'teacher',
    authorId: 'user-admin',
    column: '[4강] 디지털튜터 코칭 사례',
    reactions: { like: 15, clap: 8, heart: 11, insight: 9 },
    comments: [],
    createdAt: '2025-11-08 15:45',
  },
  {
    id: 'dt-post-5',
    boardId: 'board-digital-tutor-2025',
    title: '💬 강의 참여 소감 및 질문 나눔방',
    content: '오늘 강의에서 가장 인상 깊었던 내용이나 현장 적용 시 궁금한 점을 자유롭게 적어주세요!',
    color: 'pink',
    authorName: 'minwan kim (강사)',
    authorRole: 'teacher',
    authorId: 'user-admin',
    column: '자료 나눔 & Q&A',
    reactions: { like: 9, clap: 12, heart: 8, insight: 6 },
    comments: [],
    createdAt: '2025-11-08 17:00',
  },
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

  // Supabase 클라우드 실시간 자동 동기화
  if (isSupabaseConfigured && supabase) {
    fetchRemoteBoards().then((remoteBoards) => {
      if (remoteBoards && remoteBoards.length > 0) {
        localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(remoteBoards));
        window.dispatchEvent(new Event('store_updated'));
      }
    });

    fetchRemotePosts().then((remotePosts) => {
      if (remotePosts && remotePosts.length > 0) {
        memoryPostsCache = remotePosts;
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(remotePosts));
        window.dispatchEvent(new Event('store_updated'));
      }
    });

    try {
      supabase
        .channel('schoolpad_live_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          fetchRemotePosts().then((posts) => {
            if (posts) {
              memoryPostsCache = posts;
              localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
              window.dispatchEvent(new Event('store_updated'));
            }
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => {
          fetchRemoteBoards().then((boards) => {
            if (boards) {
              localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boards));
              window.dispatchEvent(new Event('store_updated'));
            }
          });
        })
        .subscribe();
    } catch (e) {}
  }
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

  let boardsList: Board[] = storedBoards ? JSON.parse(storedBoards) : INITIAL_BOARDS;
  // '바이브코딩 교육자료' (999190) 및 '2025. 디지털튜터' 보드 자동 동기화
  const vibeBoard = INITIAL_BOARDS.find((b) => b.code === '999190');
  const dtBoard = INITIAL_BOARDS.find((b) => b.code === '202501');

  if (vibeBoard && !boardsList.some((b) => b.code === '999190')) {
    boardsList = [vibeBoard, ...boardsList];
    try {
      localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boardsList));
    } catch (e) {}
  }

  if (dtBoard && !boardsList.some((b) => b.code === '202501')) {
    boardsList = [dtBoard, ...boardsList];
    try {
      localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boardsList));
    } catch (e) {}
  }

  let postsList: Post[] = memoryPostsCache || (storedPosts ? JSON.parse(storedPosts) : INITIAL_POSTS);
  const hasVibePost = postsList.some((p) => p.boardId === 'board-vibecoding');
  if (!hasVibePost) {
    const vibePosts = INITIAL_POSTS.filter((p) => p.boardId === 'board-vibecoding');
    postsList = [...vibePosts, ...postsList];
  }

  const hasDtPost = postsList.some((p) => p.boardId === 'board-digital-tutor-2025');
  if (!hasDtPost) {
    const dtPosts = INITIAL_POSTS.filter((p) => p.boardId === 'board-digital-tutor-2025');
    postsList = [...dtPosts, ...postsList];
  }

  return {
    settings: storedSettings ? JSON.parse(storedSettings) : INITIAL_SETTINGS,
    users: storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS,
    boards: boardsList,
    posts: postsList,
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

// 🔥 개별 쪽지/카드 영구 삭제 함수 (로컬 + Supabase 클라우드 DB 연동)
export const deletePost = async (postId: string) => {
  if (typeof window !== 'undefined') {
    const data = getStoreData();
    const updated = data.posts.filter((p) => p.id !== postId);
    memoryPostsCache = updated;
    fileStorage.set('school_padlet_posts_full', JSON.stringify(updated));
    try {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
    } catch (e) {}
    window.dispatchEvent(new Event('store_updated'));
  }
  if (isSupabaseConfigured) {
    await deleteRemotePost(postId);
  }
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
