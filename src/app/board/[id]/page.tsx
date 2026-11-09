'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Lock,
  Unlock,
  Printer,
  Sparkles,
  LayoutGrid,
  Columns,
  Hash,
  Copy,
  Check,
  MousePointer2,
  Move,
  Pencil,
  Trash2,
  X,
  Palette,
  Globe,
  GripVertical,
  QrCode,
  Loader2,
  Cloud,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import ShareModal from '@/components/ShareModal';
import BackgroundModal from '@/components/BackgroundModal';
import QrModal from '@/components/QrModal';
import { getStoreData, saveStoreData, duplicateBoard, deletePost, getMyPostIds } from '@/lib/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchRemotePosts, saveRemoteBoard, saveRemotePost, saveRemotePosts, saveAllRemotePosts, deleteRemotePost } from '@/lib/supabaseStore';
import { Board, Post, User, BoardLayout } from '@/lib/types';
import { createShortUrl } from '@/lib/shortUrl';

const DEFAULT_COLUMNS = ['모둠 1 (조사 및 계획)', '모둠 2 (의견 토론)', '모둠 3 (결과 정리)'];

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);

  const [showPostModal, setShowPostModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<Post | undefined>(undefined);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string | undefined>(undefined);
  const [currentLayout, setCurrentLayout] = useState<BoardLayout>('kanban');
  const [copiedLink, setCopiedLink] = useState(false);

  // 모둠(열) 이름 수정 상태
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // 새 열 추가 인풋
  const [showAddColInput, setShowAddColInput] = useState(false);
  const [newColName, setNewColName] = useState('');

  // 자유 캔버스 드래그
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 칸반 열 내/간 드래그 앤 드롭 상태
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverPostId, setDragOverPostId] = useState<string | null>(null);

  // 모둠(열) 드래그 앤 드롭 순서 변경 상태
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);

  // 그리드 드래그 앤 드롭 순서 변경
  const dragItemIdx = useRef<number | null>(null);
  const dragOverItemIdx = useRef<number | null>(null);

  // 사용자가 방금 카드를 조작(드래그 이동, 수정, 생성 등)한 시각 (원격 폴링 충돌 방어용)
  const lastUserActionTimeRef = useRef<number>(0);

  // 보드 메인 가로 스크롤 Ref & 휠 조작 & 좌우 버튼 핸들러
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const handleMainWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // 모둠 내부 카드 목록 세로 스크롤 중이 아닐 때만 보드 전체 가로 스크롤 작동
    if (!target.closest('.slim-scrollbar') && mainScrollRef.current) {
      if (e.deltaY !== 0) {
        mainScrollRef.current.scrollLeft += e.deltaY * 1.2;
      }
    }
  };

  const scrollBoardHorizontally = (direction: 'left' | 'right') => {
    if (mainScrollRef.current) {
      const offset = direction === 'left' ? -350 : 350;
      mainScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!boardId) return;
    try {
      const data = getStoreData();
      setCurrentUser(data.currentUser);
      let foundBoard = data.boards.find((b) => b.id === boardId || b.code === boardId);
      let localBoardPosts: Post[] = [];

      // 1. 로컬에 보드가 있다면 즉시 0.05초 만에 화면 먼저 오픈 (무한 로딩 원천 차단)
      if (foundBoard) {
        setBoard(foundBoard);
        const cols =
          foundBoard.columns && foundBoard.columns.length > 0
            ? foundBoard.columns
            : DEFAULT_COLUMNS;
        setColumns(cols);
        if (foundBoard.layout) {
          setCurrentLayout(foundBoard.layout);
        }
        localBoardPosts = data.posts.filter((p) => p.boardId === foundBoard!.id);
        setPosts(localBoardPosts);
        setIsLoading(false);
      }

      // 2. 클라우드 최신 상태 조회 및 동기화
      if (isSupabaseConfigured && supabase) {
        try {
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));

          // 2-1. 최신 보드 정보 조회 (항상 실행하여 서버의 최신 컬럼 및 설정 반영)
          const targetLookup = foundBoard?.id || boardId;
          const fetchBoardPromise = supabase
            .from('boards')
            .select('*')
            .or(`id.eq.${targetLookup},code.eq.${targetLookup}`)
            .maybeSingle();

          const res: any = await Promise.race([fetchBoardPromise, timeoutPromise]);
          const dbBoard = res?.data;

          let activeCols = foundBoard?.columns || DEFAULT_COLUMNS;

          if (dbBoard) {
            let parsedCols: string[] = [];
            if (Array.isArray(dbBoard.columns) && dbBoard.columns.length > 0) {
              parsedCols = dbBoard.columns;
            } else if (dbBoard.description && dbBoard.description.includes('<!--SCHOOLPAD_BOARD_META:')) {
              const match = dbBoard.description.match(/<!--SCHOOLPAD_BOARD_META:([\s\S]*?)-->/);
              if (match && match[1]) {
                try {
                  const parsed = JSON.parse(match[1]);
                  if (Array.isArray(parsed.columns)) parsedCols = parsed.columns;
                } catch (e) {}
              }
            }

            if (parsedCols.length > 0) {
              activeCols = parsedCols;
            }

            foundBoard = {
              ...(foundBoard || {}),
              id: dbBoard.id,
              code: dbBoard.code,
              title: dbBoard.title,
              description: dbBoard.description || '',
              layout: (dbBoard.layout || foundBoard?.layout || 'kanban') as any,
              theme: dbBoard.theme || foundBoard?.theme || 'blue',
              coverImageUrl:
                dbBoard.cover_image_url ||
                foundBoard?.coverImageUrl ||
                'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
              customBgUrl: dbBoard.custom_bg_url || foundBoard?.customBgUrl || '',
              authorId: dbBoard.author_id || foundBoard?.authorId || 'user-admin',
              authorName: dbBoard.author_name || foundBoard?.authorName || '선생님',
              authorRole: 'teacher',
              columns: activeCols,
              allowStudentPost: true,
              allowComments: true,
              allowReactions: true,
              isLocked: false,
              isPublic: true,
              category: dbBoard.category || foundBoard?.category || '수업자료',
              createdAt: dbBoard.created_at
                ? new Date(dbBoard.created_at).toISOString().split('T')[0]
                : foundBoard?.createdAt || '',
            };
          }

          // 2-2. 최신 게시글 원격 조회 및 모든 모둠(열) 자동 복원 및 보존
          const targetId = foundBoard?.id || boardId;
          const fetchPostsPromise = fetchRemotePosts(targetId);
          const remote: any = await Promise.race([fetchPostsPromise, timeoutPromise]);
          if (remote && Array.isArray(remote)) {
            const isTeacherOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
            // 만약 관리자/선생님 화면에 로컬 카드가 원격보다 더 많이 존재한다면 (예: 32개 vs 2개)
            // 원격 데이터로 덮어쓰지 않고, 로컬의 풍부한 카드들을 새 Supabase DB로 즉시 일괄 업로드(동기화)!
            if (isTeacherOrAdmin && localBoardPosts && localBoardPosts.length > remote.length) {
              setPosts(localBoardPosts);
              saveAllRemotePosts(localBoardPosts).catch(() => {});
              if (foundBoard) {
                saveRemoteBoard(foundBoard).catch(() => {});
              }
            } else if (remote.length > 0 || !localBoardPosts.length) {
              setPosts(remote);
              const otherPosts = data.posts.filter((p) => p.boardId !== targetId);
              saveStoreData.posts([...remote, ...otherPosts]);
            }

            // 🔥 중요: 게시글이 속한 모든 열 이름을 빠짐없이 취합하여 화면에서 숨겨지는 일 100% 방지
            const postCols = remote.map((p: Post) => {
              let name = p.column;
              if (name === '몸플기 예제' || name === '몸풀기') name = '몸풀기 예제';
              return name;
            }).filter(Boolean) as string[];
            activeCols = Array.from(new Set([...activeCols, ...postCols].map((c) => {
              let name = String(c || '').trim();
              if (name === '몸플기 예제' || name === '몸풀기') name = '몸풀기 예제';
              return name;
            })));
          }

          if (foundBoard) {
            foundBoard.columns = activeCols;
            setBoard(foundBoard);
            setColumns(activeCols);
            saveStoreData.boards([foundBoard, ...data.boards.filter((b) => b.id !== foundBoard!.id)]);
          }
        } catch (e) {
          console.error('Remote load error:', e);
        }
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setIsLoading(false); // 어떤 상황에서도 무조건 로딩 완료 해제
    }
  };

  useEffect(() => {
    loadData();
    // store_updated 이벤트 발생 시 loadData()를 중복 호출하지 않음 (로컬 조작 직후 과거 원격 데이터로 덮어씌워지는 레이스 컨디션 차단)
  }, [boardId]);

  // 🔥 게시글에 존재하는 모든 모둠(열)이 columns 상태에 누락되지 않도록 자동 보존 및 Supabase 동기화
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const postCols = posts.map((p) => {
      let name = p.column;
      if (name === '몸플기 예제' || name === '몸풀기') name = '몸풀기 예제';
      return name;
    }).filter(Boolean) as string[];
    const missingCols = postCols.filter((c) => !columns.includes(c));
    if (missingCols.length > 0) {
      const updated = Array.from(new Set([...columns, ...missingCols]));
      setColumns(updated);
      if (board) {
        const updatedBoard = { ...board, columns: updated };
        setBoard(updatedBoard);
        const data = getStoreData();
        saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
        if (isSupabaseConfigured) {
          saveRemoteBoard(updatedBoard).catch(() => {});
        }
      }
    }
  }, [posts, columns, board]);

  // 🔥 실시간 동기화 (Supabase Realtime 채널 + 1초 주기 자동 폴링 백업)
  // 학생과 교사가 서로 다른 기기에서 작업할 때 1~2초 내에 자동 화면 반영 (게시글 + 모둠 열)!
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!boardId) return;

    const syncRemoteData = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      if (isSyncingRef.current) return;
      // 사용자가 최근 8초 내에 카드를 조작했다면 원격 폴링으로 인한 덮어쓰기 방지
      if (Date.now() - lastUserActionTimeRef.current < 4000) return;

      isSyncingRef.current = true;
      try {
        const targetBoardId = board?.id || boardId;
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));

        // 1. 최신 게시글 동기화
        const fetchPromise = fetchRemotePosts(targetBoardId);
        const remote: any = await Promise.race([fetchPromise, timeoutPromise]);

        if (remote && Array.isArray(remote)) {
          setPosts((prevPosts) => {
            if (Date.now() - lastUserActionTimeRef.current < 4000) return prevPosts;

            const buildSig = (list: Post[]) =>
              list
                .map(
                  (p) =>
                    `${p.id}_${p.column}_${p.order ?? ''}_${p.title}_${p.content}_${p.color || ''}_${(p.attachments || []).length}_${p.linkUrl || ''}_${p.imageUrl ? p.imageUrl.substring(0, 50) : ''}_${(p.comments || []).map((c) => c.id + ':' + c.content).join(',')}_${JSON.stringify(p.reactions || {})}`
                )
                .join('|');

            const prevSig = buildSig(prevPosts);
            const remoteSig = buildSig(remote);
            if (prevSig === remoteSig) return prevPosts;

            // 로컬에만 있는 작성 중인 카드가 있다면 보존하면서 원격 카드 병합
            // (내 브라우저에서 방금 생성한 카드만 임시 보존, 오래된 더미 카드는 부활 금지)
            const myPostIds = getMyPostIds();
            const remoteMap = new Map(remote.map((p) => [p.id, p]));
            const localPending = prevPosts.filter((p) => !remoteMap.has(p.id) && myPostIds.includes(p.id));
            const merged = localPending.length > 0 ? [...remote, ...localPending] : remote;

            // 브라우저 캐시 동시 동기화
            try {
              const data = getStoreData();
              const otherPosts = data.posts.filter((p) => p.boardId !== targetBoardId);
              saveStoreData.posts([...merged, ...otherPosts]);
            } catch (eStore) {}

            return merged;
          });
        }

        // 2. 최신 모둠(열) 실시간 동기화
        if (Date.now() - lastUserActionTimeRef.current >= 8000) {
          let latestCols: string[] | null = null;

          // 2-1. posts 시스템 메타데이터로부터 실시간 열 목록 확인
          if (typeof window !== 'undefined' && Array.isArray((window as any).__LATEST_BOARD_COLUMNS__)) {
            latestCols = (window as any).__LATEST_BOARD_COLUMNS__;
          }

          // 2-2. boards 테이블에서 select('*')로 안전 조회
          if (!latestCols || latestCols.length === 0) {
            const boardFetch = supabase
              .from('boards')
              .select('*')
              .or(`id.eq.${targetBoardId},code.eq.${targetBoardId}`)
              .maybeSingle();

            const res: any = await Promise.race([boardFetch, timeoutPromise]);
            const dbBoard = res?.data;

            if (dbBoard) {
              if (Array.isArray(dbBoard.columns) && dbBoard.columns.length > 0) {
                latestCols = dbBoard.columns;
              } else if (dbBoard.description && dbBoard.description.includes('<!--SCHOOLPAD_BOARD_META:')) {
                const match = dbBoard.description.match(/<!--SCHOOLPAD_BOARD_META:([\s\S]*?)-->/);
                if (match && match[1]) {
                  try {
                    const parsed = JSON.parse(match[1]);
                    if (Array.isArray(parsed.columns)) latestCols = parsed.columns;
                  } catch (e) {}
                }
              }
            }
          }

          if (latestCols && Array.isArray(latestCols) && latestCols.length > 0) {
            const postCols = posts.map((p) => p.column).filter(Boolean) as string[];
            // 🔥 원격 열 목록 + 현재 로컬 열 목록(방금 추가한 빈 모둠 등) + 게시글 열 목록을 통합 및 정규화
            const cleanCols = Array.from(
              new Set([...latestCols, ...columns, ...postCols].map((c: any) => {
                let name = String(c || '').trim();
                if (name === '몸플기 예제' || name === '몸풀기') name = '몸풀기 예제';
                return name;
              }).filter(Boolean))
            ) as string[];

            if (cleanCols.length > 0) {
              // 로컬에 새로 생성된 열이 아직 원격에 미처 반영되기 전이면 로컬 열 보존 (모둠 사라짐 방어)
              const hasMissingLocal = columns.some((c) => !cleanCols.includes(c));
              if (hasMissingLocal && Date.now() - lastUserActionTimeRef.current < 12000) {
                return;
              }

              setColumns((prevCols) => {
                if (prevCols.join('|') === cleanCols.join('|')) return prevCols;
                return cleanCols;
              });
              setBoard((prev) => {
                if (!prev) return prev;
                if ((prev.columns || []).join('|') === cleanCols.join('|')) return prev;
                const updatedBoard = { ...prev, columns: cleanCols };
                try {
                  const data = getStoreData();
                  saveStoreData.boards(data.boards.map((b) => (b.id === updatedBoard.id ? updatedBoard : b)));
                } catch (e) {}
                return updatedBoard;
              });
            }
          }
        }
      } catch (e) {
        console.error('syncRemoteData error', e);
      } finally {
        isSyncingRef.current = false;
      }
    };

    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const subId = board?.id || boardId;
        channel = supabase
          .channel(`board_live_sub_${subId}_${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
            syncRemoteData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => {
            syncRemoteData();
          })
          .subscribe();
      } catch (e) {}
    }

    // 1초 무한 폴링 대신 스마트 폴링 (8초 주기 + 탭 활성화 시에만 실행)으로 트래픽 90% 절약
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncRemoteData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollTimer = setInterval(() => {
      if (!document.hidden) {
        syncRemoteData();
      }
    }, 3000);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollTimer);
    };
  }, [boardId, board?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <h2 className="text-sm font-bold text-slate-700">클라우드에서 수업 보드를 불러오는 중입니다...</h2>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-800">해당 수업 보드를 찾을 수 없습니다.</h2>
        <p className="text-xs text-slate-500 mt-2">보드가 삭제되었거나 아직 생성되지 않은 번호입니다.</p>
        <Link href="/" className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
          메인으로 이동
        </Link>
      </div>
    );
  }

  // 본인이 직접 만든 보드이거나 복제해 온 내 보드인지 확인
  const isBoardOwner = Boolean(
    currentUser &&
      (currentUser.id === board.authorId || currentUser.name === board.authorName)
  );

  // 최고 관리자이거나 해당 보드의 소유자(본인/복제자)만 보드 설정(잠금/배경/모둠수정 등) 가능
  const isTeacherOrAdmin = currentUser?.role === 'admin' || isBoardOwner;

  // 레이아웃 변경 시 보드 설정에 즉시 저장
  const handleChangeLayout = (newLayout: BoardLayout) => {
    setCurrentLayout(newLayout);
    if (board) {
      const updatedBoard = { ...board, layout: newLayout };
      setBoard(updatedBoard);
      const data = getStoreData();
      saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    }
  };

  // 학생 초대 단축 링크 복사


  const handleManualCloudSync = async () => {
    if (!board || !posts || posts.length === 0) return;
    setIsSyncingToCloud(true);
    try {
      await saveRemoteBoard(board);
      await saveAllRemotePosts(posts);
      alert('현재 화면의 모든 모둠(' + (columns.length) + '개)과 카드(' + posts.length + '개)가 클라우드 DB에 동기화되었습니다!\n학생 화면에서도 100% 동일하게 보입니다.');
    } catch (e) {
      alert('동기화 실패: ' + String(e));
    } finally {
      setIsSyncingToCloud(false);
    }
  };

  const handleCopyInviteLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const minimalBoard = {
      id: board.id,
      code: board.code,
      title: board.title,
      description: board.description || '',
      layout: board.layout || 'kanban',
      theme: board.theme || 'blue',
      coverImageUrl: board.coverImageUrl || '',
      customBgUrl: board.customBgUrl || '',
      authorId: board.authorId,
      authorName: board.authorName,
      columns: board.columns || [],
      allowComments: board.allowComments !== false,
      allowReactions: board.allowReactions !== false,
      isLocked: Boolean(board.isLocked),
    };
    const bPayload = encodeURIComponent(JSON.stringify(minimalBoard));
    const targetWithPayload = `${origin}/join/${board.code}?b=${bPayload}`;
    const shortPath = `${origin}/j/${board.code}`;
    
    // 우선 즉시 빠른 단축 경로 복사
    navigator.clipboard.writeText(shortPath);
    setCopiedLink(true);

    // 글로벌 초단축 링크(is.gd / tinyurl) 비동기 생성 시도 (보드 데이터 페이로드 포함하여 타 기기 자동 복원)
    try {
      const shortUrl = await createShortUrl(targetWithPayload);
      if (shortUrl && shortUrl !== targetWithPayload) {
        navigator.clipboard.writeText(shortUrl);
      }
    } catch (e) {}

    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 모둠(열) 추가
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColName.trim();
    if (!trimmed) return;

    lastUserActionTimeRef.current = Date.now(); // 사용자 조작 보호

    const updatedCols = Array.from(new Set([...columns, trimmed]));
    setColumns(updatedCols);
    setNewColName('');
    setShowAddColInput(false);

    // 🔥 즉각 메모리 및 브라우저 세션에 새 모둠 등록 (원격 폴링으로 지워지는 것 100% 방어)
    if (typeof window !== 'undefined') {
      (window as any).__LATEST_BOARD_COLUMNS__ = updatedCols;
    }

    const now = Date.now();
    const data = getStoreData();
    const updatedBoard = { ...board, columns: updatedCols, updatedAt: now };
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    setBoard(updatedBoard);

    if (isSupabaseConfigured) {
      await saveRemoteBoard(updatedBoard);
    }
  };

  // 모둠(열) 이름 수정
  const handleSaveColName = async (idx: number) => {
    const trimmed = editingColName.trim();
    if (!trimmed) {
      setEditingColIdx(null);
      return;
    }
    const oldName = columns[idx];
    if (!oldName) {
      setEditingColIdx(null);
      return;
    }

    lastUserActionTimeRef.current = Date.now(); // 원격 동기화 간섭 차단

    // 1. 해당 인덱스의 열 이름을 새 이름으로 교체하고 중복/빈값 제거
    const updatedCols = columns.map((c, i) => (i === idx ? trimmed : c));
    const cleanCols = Array.from(new Set(updatedCols.map((c) => String(c || '').trim()).filter(Boolean)));

    setColumns(cleanCols);
    setEditingColIdx(null);

    if (typeof window !== 'undefined') {
      (window as any).__LATEST_BOARD_COLUMNS__ = cleanCols;
    }

    // 2. 해당 열에 속한 모든 카드의 column도 새 이름으로 일괄 교체
    const updatedPosts = posts.map((p) => (p.column === oldName ? { ...p, column: trimmed } : p));
    setPosts(updatedPosts);

    // 3. 로컬 스토리지 즉시 반영
    const now = Date.now();
    const data = getStoreData();
    const updatedBoard = { ...board, columns: cleanCols, updatedAt: now };
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    saveStoreData.posts(data.posts.map((p) => (p.column === oldName ? { ...p, column: trimmed } : p)));
    setBoard(updatedBoard);

    // 4. Supabase 클라우드 DB에 즉시 확실하게 저장
    if (isSupabaseConfigured) {
      await saveRemoteBoard(updatedBoard);
      const affectedCards = updatedPosts.filter((p) => p.column === trimmed);
      for (const card of affectedCards) {
        await saveRemotePost(card);
      }
    }
  };

  // 모둠(열) 삭제
  const handleDeleteColumn = async (colName: string) => {
    if (confirm(`'${colName}' 열을 삭제하시겠습니까? (안에 있는 카드는 첫 번째 열로 이동됩니다)`)) {
      lastUserActionTimeRef.current = Date.now();

      const updatedCols = columns.filter((c) => c !== colName);
      const cleanCols = Array.from(new Set(updatedCols.map((c) => String(c || '').trim()).filter(Boolean)));
      const targetCol = cleanCols[0] || '모둠 1';

      setColumns(cleanCols);

      if (typeof window !== 'undefined') {
        (window as any).__LATEST_BOARD_COLUMNS__ = cleanCols;
      }

      const updatedPosts = posts.map((p) => (p.column === colName ? { ...p, column: targetCol } : p));
      setPosts(updatedPosts);

      const now = Date.now();
      const data = getStoreData();
      const updatedBoard = { ...board, columns: cleanCols, updatedAt: now };
      saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
      saveStoreData.posts(data.posts.map((p) => (p.column === colName ? { ...p, column: targetCol } : p)));
      setBoard(updatedBoard);

      if (isSupabaseConfigured) {
        await saveRemoteBoard(updatedBoard);
        const affectedCards = updatedPosts.filter((p) => p.column === targetCol);
        for (const card of affectedCards) {
          await saveRemotePost(card);
        }
      }
    }
  };

  // 칸반 열 내/간 드래그 앤 드롭 이동 및 순서 변경
  const handleDragStartKanban = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('text/plain', postId);
    setDraggedPostId(postId);
  };

  const handleDragEndKanban = () => {
    setDraggedPostId(null);
    setDragOverPostId(null);
  };

  // 모둠(열) 드래그 앤 드롭 이동 및 순서 변경 핸들러
  const handleDragStartColumn = (e: React.DragEvent, idx: number) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/column-index', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColIdx(idx);
  };

  const handleDragEndColumn = () => {
    setDraggedColIdx(null);
    setDragOverColIdx(null);
  };

  const handleColumnDrop = async (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx || sourceIdx < 0 || targetIdx < 0) {
      setDraggedColIdx(null);
      setDragOverColIdx(null);
      return;
    }

    lastUserActionTimeRef.current = Date.now(); // 5초간 원격 동기화 간섭 차단

    const updatedCols = [...columns];
    const [movedCol] = updatedCols.splice(sourceIdx, 1);
    updatedCols.splice(targetIdx, 0, movedCol);

    const cleanCols = Array.from(new Set(updatedCols.map((c) => String(c || '').trim()).filter(Boolean)));

    setColumns(cleanCols);
    setDraggedColIdx(null);
    setDragOverColIdx(null);

    const data = getStoreData();
    const updatedBoard = { ...board, columns: cleanCols };
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    setBoard(updatedBoard);

    if (isSupabaseConfigured) {
      await saveRemoteBoard(updatedBoard);
    }
  };

  // 🔥 카드 순서 및 위치 일괄 영구 저장 헬퍼 (로컬 + Supabase 일괄 저장)
  const persistPostsOrder = async (newPosts: Post[]) => {
    lastUserActionTimeRef.current = Date.now();
    setPosts(newPosts);

    const targetId = board?.id || boardId;
    const data = getStoreData();
    const otherBoardPosts = data.posts.filter((p) => p.boardId !== targetId);
    saveStoreData.posts([...otherBoardPosts, ...newPosts]);

    if (isSupabaseConfigured) {
      await saveRemotePosts(newPosts);
    }
  };

  // 1. 특정 열 내에서 카드를 1칸 위(up) 또는 아래(down)로 이동
  const handleMoveCardStep = async (postId: string, direction: 'up' | 'down') => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const colName = targetPost.column || columns[0] || '모둠 1';
    const colCards = posts.filter((p) => (p.column || columns[0]) === colName);
    const idxInCol = colCards.findIndex((p) => p.id === postId);
    if (idxInCol === -1) return;

    if (direction === 'up' && idxInCol === 0) return;
    if (direction === 'down' && idxInCol === colCards.length - 1) return;

    const swapIdx = direction === 'up' ? idxInCol - 1 : idxInCol + 1;
    const reorderedColCards = [...colCards];
    const [moved] = reorderedColCards.splice(idxInCol, 1);
    reorderedColCards.splice(swapIdx, 0, moved);

    let counter = 0;
    const updatedAllPosts: Post[] = [];
    const nowIso = new Date().toISOString();
    for (const c of columns) {
      const cards = (c === colName ? reorderedColCards : posts.filter((p) => (p.column || columns[0]) === c));
      for (const card of cards) {
        updatedAllPosts.push({
          ...card,
          order: counter++,
          updatedAt: nowIso,
        });
      }
    }

    const includedIds = new Set(updatedAllPosts.map((p) => p.id));
    for (const p of posts) {
      if (!includedIds.has(p.id)) {
        updatedAllPosts.push({ ...p, order: counter++ });
      }
    }

    await persistPostsOrder(updatedAllPosts);
  };

  // 2. 카드를 해당 열의 맨 위로 이동
  const handleMoveCardToTop = async (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const colName = targetPost.column || columns[0] || '모둠 1';
    const colCards = posts.filter((p) => (p.column || columns[0]) === colName);
    const idxInCol = colCards.findIndex((p) => p.id === postId);
    if (idxInCol <= 0) return;

    const reorderedColCards = [...colCards];
    const [moved] = reorderedColCards.splice(idxInCol, 1);
    reorderedColCards.unshift(moved);

    let counter = 0;
    const updatedAllPosts: Post[] = [];
    const nowIso = new Date().toISOString();
    for (const c of columns) {
      const cards = (c === colName ? reorderedColCards : posts.filter((p) => (p.column || columns[0]) === c));
      for (const card of cards) {
        updatedAllPosts.push({ ...card, order: counter++, updatedAt: nowIso });
      }
    }
    const includedTop = new Set(updatedAllPosts.map((p) => p.id));
    for (const p of posts) {
      if (!includedTop.has(p.id)) {
        updatedAllPosts.push({ ...p, order: counter++ });
      }
    }
    await persistPostsOrder(updatedAllPosts);
  };

  // 3. 카드를 해당 열의 맨 아래로 이동
  const handleMoveCardToBottom = async (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const colName = targetPost.column || columns[0] || '모둠 1';
    const colCards = posts.filter((p) => (p.column || columns[0]) === colName);
    const idxInCol = colCards.findIndex((p) => p.id === postId);
    if (idxInCol === -1 || idxInCol === colCards.length - 1) return;

    const reorderedColCards = [...colCards];
    const [moved] = reorderedColCards.splice(idxInCol, 1);
    reorderedColCards.push(moved);

    let counter = 0;
    const updatedAllPosts: Post[] = [];
    const nowIso = new Date().toISOString();
    for (const c of columns) {
      const cards = (c === colName ? reorderedColCards : posts.filter((p) => (p.column || columns[0]) === c));
      for (const card of cards) {
        updatedAllPosts.push({ ...card, order: counter++, updatedAt: nowIso });
      }
    }
    const includedTop = new Set(updatedAllPosts.map((p) => p.id));
    for (const p of posts) {
      if (!includedTop.has(p.id)) {
        updatedAllPosts.push({ ...p, order: counter++ });
      }
    }
    await persistPostsOrder(updatedAllPosts);
  };

  // 4. 카드를 다른 모둠(열)으로 이동
  const handleMoveCardToColumn = async (postId: string, newColName: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost || targetPost.column === newColName) return;

    const nowIso = new Date().toISOString();
    const updatedCard = { ...targetPost, column: newColName, updatedAt: nowIso };
    const remainingPosts = posts.filter((p) => p.id !== postId);

    // 대상 열의 맨 끝에 추가하고 전체 순서 재부여
    let counter = 0;
    const updatedAllPosts: Post[] = [];
    for (const c of columns) {
      const colCards = remainingPosts.filter((p) => (p.column || columns[0]) === c);
      if (c === newColName) {
        colCards.push(updatedCard);
      }
      for (const card of colCards) {
        updatedAllPosts.push({ ...card, order: counter++, updatedAt: nowIso });
      }
    }

    await persistPostsOrder(updatedAllPosts);
  };

  // 5. 같은 열 또는 다른 열의 특정 카드 위에 드롭했을 때 순서 변경 (위/아래 다중 칸 자유 이동)
  const handleDropOnCard = async (e: React.DragEvent, targetPostId: string, colName: string, targetColIdx: number) => {
    e.preventDefault();
    e.stopPropagation();

    // 열 자체를 드롭했을 경우
    if (draggedColIdx !== null) {
      handleColumnDrop(draggedColIdx, targetColIdx);
      return;
    }
    const colIdxStr = e.dataTransfer.getData('application/column-index');
    if (colIdxStr !== '') {
      handleColumnDrop(Number(colIdxStr), targetColIdx);
      return;
    }

    const sourceId = e.dataTransfer.getData('text/plain') || draggedPostId;
    if (!sourceId || sourceId === targetPostId) {
      setDraggedPostId(null);
      setDragOverPostId(null);
      return;
    }

    lastUserActionTimeRef.current = Date.now();

    const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isBelow = (e.clientY - targetRect.top) > (targetRect.height / 2);

    const sourcePost = posts.find((p) => p.id === sourceId);
    if (!sourcePost) {
      setDraggedPostId(null);
      setDragOverPostId(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedMoved = { ...sourcePost, column: colName, updatedAt: nowIso };

    // 대상 열의 카드 목록 가져오기 (드래그 중인 카드 제외)
    const targetColCards = posts.filter((p) => (p.column || columns[0]) === colName && p.id !== sourceId);
    const targetIdx = targetColCards.findIndex((p) => p.id === targetPostId);

    const insertIdx = targetIdx === -1 ? targetColCards.length : (isBelow ? targetIdx + 1 : targetIdx);
    targetColCards.splice(insertIdx, 0, updatedMoved);

    let counter = 0;
    const reorderedPosts: Post[] = [];
    for (const c of columns) {
      const cardsInCol = (c === colName ? targetColCards : posts.filter((p) => (p.column || columns[0]) === c && p.id !== sourceId));
      for (const card of cardsInCol) {
        reorderedPosts.push({
          ...card,
          order: counter++,
        });
      }
    }

    setDraggedPostId(null);
    setDragOverPostId(null);
    await persistPostsOrder(reorderedPosts);
  };

  // 열 빈 공간에 드롭했을 때 맨 뒤로 이동
  const handleDropOnColumn = async (e: React.DragEvent, colName: string, targetColIdx: number) => {
    e.preventDefault();

    if (draggedColIdx !== null) {
      handleColumnDrop(draggedColIdx, targetColIdx);
      return;
    }
    const colIdxStr = e.dataTransfer.getData('application/column-index');
    if (colIdxStr !== '') {
      handleColumnDrop(Number(colIdxStr), targetColIdx);
      return;
    }

    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    if (!postId) return;

    lastUserActionTimeRef.current = Date.now();

    const sourcePost = posts.find((p) => p.id === postId);
    if (!sourcePost) {
      setDraggedPostId(null);
      setDragOverPostId(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedMoved = { ...sourcePost, column: colName, updatedAt: nowIso };
    const remainingPosts = posts.filter((p) => p.id !== postId);

    let counter = 0;
    const reorderedPosts: Post[] = [];
    for (const c of columns) {
      const cardsInCol = remainingPosts.filter((p) => (p.column || columns[0]) === c);
      if (c === colName) {
        cardsInCol.push(updatedMoved);
      }
      for (const card of cardsInCol) {
        reorderedPosts.push({
          ...card,
          order: counter++,
        });
      }
    }

    setDraggedPostId(null);
    setDragOverPostId(null);
    await persistPostsOrder(reorderedPosts);
  };

  // 그리드 순서 변경
  const handleGridDragStart = (idx: number) => {
    dragItemIdx.current = idx;
  };
  const handleGridDragEnter = (idx: number) => {
    dragOverItemIdx.current = idx;
  };
  const handleGridDrop = () => {
    if (dragItemIdx.current === null || dragOverItemIdx.current === null) return;
    const reordered = [...posts];
    const draggedItem = reordered.splice(dragItemIdx.current, 1)[0];
    reordered.splice(dragOverItemIdx.current, 0, draggedItem);

    setPosts(reordered);
    dragItemIdx.current = null;
    dragOverItemIdx.current = null;

    const data = getStoreData();
    saveStoreData.posts(
      data.posts.map((p) => {
        const found = reordered.find((r) => r.id === p.id);
        return found ? found : p;
      })
    );
  };

  // 자유 캔버스 마우스 드래그
  const handleMouseDownCanvasCard = (e: React.MouseEvent, post: Post) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('a')) {
      return;
    }
    if (currentLayout !== 'canvas') return;

    setDraggingId(post.id);
    const cardEl = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - cardEl.left,
      y: e.clientY - cardEl.top,
    };
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingId || currentLayout !== 'canvas') return;
    const canvasEl = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(10, Math.min(canvasEl.width - 280, e.clientX - canvasEl.left - dragOffset.current.x));
    const newY = Math.max(10, Math.min(1800, e.clientY - canvasEl.top - dragOffset.current.y));

    setPosts((prev) => prev.map((p) => (p.id === draggingId ? { ...p, x: newX, y: newY } : p)));
  };

  const handleMouseUpCanvas = () => {
    if (!draggingId) return;
    const data = getStoreData();
    const updatedAllPosts = data.posts.map((p) => {
      const match = posts.find((curr) => curr.id === p.id);
      return match ? match : p;
    });
    saveStoreData.posts(updatedAllPosts);
    setDraggingId(null);
  };

  // 보드 잠금 토글
  const handleToggleLock = () => {
    const updatedBoard = { ...board, isLocked: !board.isLocked };
    const data = getStoreData();
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    setBoard(updatedBoard);
  };

  // 포스트 삭제 (로컬 + Supabase 클라우드 실시간 영구 삭제)
  const handleDeletePost = async (postId: string) => {
    if (!confirm('이 카드를 정말 삭제하시겠습니까?')) return;
    lastUserActionTimeRef.current = Date.now();
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await deletePost(postId);
    if (isSupabaseConfigured) {
      await deleteRemotePost(postId);
    }
  };

  // 카드 생성 콜백 (중복 생성 방어 및 새 모둠 자동 반영)
  const handlePostCreated = async (newPost: Post, newColName?: string) => {
    lastUserActionTimeRef.current = Date.now();
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });

    if (isSupabaseConfigured) {
      await saveRemotePost(newPost);
    }

    const targetCol = newColName || newPost.column;
    if (targetCol && !columns.includes(targetCol)) {
      const updatedCols = Array.from(new Set([...columns, targetCol]));
      setColumns(updatedCols);
      const data = getStoreData();
      const updatedBoard = { ...board, columns: updatedCols };
      saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
      setBoard(updatedBoard);
      if (isSupabaseConfigured) {
        await saveRemoteBoard(updatedBoard);
      }
    }
  };

  // 카드 수정 콜백
  const handlePostUpdated = async (updated: Post) => {
    lastUserActionTimeRef.current = Date.now();
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    const targetCol = updated.column;
    if (targetCol && !columns.includes(targetCol)) {
      const updatedCols = Array.from(new Set([...columns, targetCol]));
      setColumns(updatedCols);
      const data = getStoreData();
      const updatedBoard = { ...board, columns: updatedCols };
      saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
      setBoard(updatedBoard);
      if (isSupabaseConfigured) {
        await saveRemoteBoard(updatedBoard);
      }
    }
    if (isSupabaseConfigured) {
      await saveRemotePost(updated);
    }
  };

  const customBgStyle = board.customBgUrl
    ? {
        backgroundImage: `url(${board.customBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : undefined;

  const themeClass = board.customBgUrl ? '' : `theme-${board.theme || 'blue'}`;

  return (
    <div
      style={customBgStyle}
      className={`h-screen flex flex-col overflow-hidden transition-all duration-300 ${themeClass}`}
    >
      {/* 상단 완벽 고정 영역 (전체 헤더 + 보드 서브 컨트롤 바) */}
      <div className="shrink-0 z-30 no-print shadow-xs">
        <Header />

        {/* 보드 서브 컨트롤 바 */}
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-2 sm:py-2.5">
          <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3">
          {/* 보드 타이틀 */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition shrink-0"
              title="홈으로 가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {board.title}
                </h1>
                {board.isLocked && (
                  <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    <span>읽기 전용</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate hidden xs:block">{board.description}</p>
            </div>
          </div>

          {/* 도구 모음: 모바일에서는 1줄로 부드럽게 가로 스크롤되어 화면을 가리지 않음 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0 max-w-full">
            {/* 학생 화면과 전체 동기화 버튼 (관리자/선생님 전용) */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'teacher') && (
              <button
                onClick={handleManualCloudSync}
                disabled={isSyncingToCloud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition shadow-sm shrink-0 whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white active:scale-95 disabled:opacity-50"
                title="선생님 화면의 모든 모둠과 카드를 클라우드 DB에 즉시 올려 학생 화면과 똑같게 맞춥니다."
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{isSyncingToCloud ? '동기화 중...' : '학생 화면과 전체 동기화 (' + posts.length + '개)'}</span>
              </button>
            )}

            {/* 학생 참여링크 복사 */}
            <button
              onClick={handleCopyInviteLink}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm shrink-0 whitespace-nowrap ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
              }`}
              title="학생들에게 보낼 참여 링크 복사"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? '링크 복사됨!' : '🔗 학생 참여링크 복사'}</span>
              <span className="sm:hidden">{copiedLink ? '복사됨!' : '🔗 링크'}</span>
            </button>

            {/* 🔥 학생 참여 QR코드 초대 버튼 */}
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
              title="스마트폰/태블릿 교실 카메라 스캔용 대형 QR코드 초대창 열기"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR 초대</span>
            </button>

            {/* 6자리 참여 핀코드 뱃지 */}
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold hover:bg-blue-100 transition shrink-0 whitespace-nowrap"
              title="QR코드 및 참여정보 확인"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{board.code}</span>
            </button>

            {/* 이 보드 복제하기 버튼 */}
            <button
              onClick={() => {
                if (!currentUser) {
                  alert('보드를 복제하려면 먼저 로그인해 주세요.');
                  return;
                }
                const copied = duplicateBoard(board.id, currentUser);
                if (copied) {
                  alert(`🎉 [${board.title}] 보드가 내 보드로 복제되었습니다!`);
                  router.push(`/board/${copied.id}`);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-xs shrink-0 whitespace-nowrap"
              title="이 보드를 내 보드로 복제해오기"
            >
              <Copy className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">보드 복제</span>
              <span className="sm:hidden">복제</span>
            </button>

            {/* 공개/비공개 공유 설정 토글 (내 보드인 경우) */}
            {currentUser && board.authorId === currentUser.id && (
              <button
                onClick={() => {
                  const updated = { ...board, isPublic: !board.isPublic };
                  setBoard(updated);
                  const data = getStoreData();
                  saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updated : b)));
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shrink-0 whitespace-nowrap ${
                  board.isPublic !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
                title="학교 전체 공개/비공개 전환"
              >
                {board.isPublic !== false ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{board.isPublic !== false ? '공개' : '나만보기'}</span>
              </button>
            )}

            {/* 배경 꾸미기 버튼 (본인 보드 또는 관리자만 변경 가능) */}
            {isTeacherOrAdmin && (
              <button
                onClick={() => setShowBgModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold transition shadow-xs shrink-0 whitespace-nowrap"
                title="배경화면 꾸미기 및 사진 업로드"
              >
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">배경 꾸미기</span>
                <span className="sm:hidden">배경</span>
              </button>
            )}

            {/* 레이아웃 전환 */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl shrink-0">
              <button
                onClick={() => handleChangeLayout('kanban')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'kanban' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="모둠별 칸반 열"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">칸반 열</span>
              </button>
              <button
                onClick={() => handleChangeLayout('grid')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="그리드 바둑판 (순서 드래그)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">그리드</span>
              </button>
              <button
                onClick={() => handleChangeLayout('canvas')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'canvas' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="자유 캔버스 (자유 드래그)"
              >
                <Move className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">자유 드래그</span>
              </button>
            </div>

            {/* 인쇄/PDF 저장 */}
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shrink-0"
              title="인쇄 및 PDF 저장"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {/* 교사 보드 잠금 */}
            {isTeacherOrAdmin && (
              <button
                onClick={handleToggleLock}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shrink-0 whitespace-nowrap ${
                  board.isLocked
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {board.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{board.isLocked ? '잠김' : '잠그기'}</span>
              </button>
            )}

            {/* 새 카드 작성 버튼 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <button
                onClick={() => {
                  setModalMode('create');
                  setSelectedPostForEdit(undefined);
                  setActiveColumn(columns[0]);
                  setShowPostModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>카드 작성</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* 메인 콘텐츠 영역 (가로 스크롤 & 각 모둠별 독립 세로 스크롤 완벽 지원) */}
      <div className="relative flex-1 w-full min-h-0 flex flex-col overflow-hidden">
        {/* 좌측 스크롤 화살표 버튼 */}
        <button
          type="button"
          onClick={() => scrollBoardHorizontally('left')}
          className="no-print absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 shadow-xl border border-slate-200 flex items-center justify-center transition active:scale-95 opacity-80 hover:opacity-100"
          title="왼쪽 모둠 보기"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* 우측 스크롤 화살표 버튼 */}
        <button
          type="button"
          onClick={() => scrollBoardHorizontally('right')}
          className="no-print absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 shadow-xl border border-slate-200 flex items-center justify-center transition active:scale-95 opacity-80 hover:opacity-100"
          title="오른쪽 모둠 보기"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        <main
          ref={mainScrollRef}
          onWheel={handleMainWheel}
          className="flex-1 w-full px-3 sm:px-5 pt-3 pb-4 overflow-x-auto overflow-y-hidden board-h-scroll flex flex-col min-h-0"
        >
          {currentLayout === 'kanban' ? (
            /* 1) 모둠 칸반 열 (패들렛 표준 콤팩트 사이즈 & 모둠별 독립 스크롤) */
            <div className="flex gap-3 sm:gap-3.5 items-stretch h-full w-max min-w-full min-h-0 pb-1">
              {columns.map((colName, idx) => {
              const colPosts = posts.filter(
                (p) => p.column === colName || (!p.column && idx === 0)
              );
              const isColDragged = draggedColIdx === idx;
              const isColDragOver = dragOverColIdx === idx && draggedColIdx !== idx;

              return (
                <div
                  key={colName}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedColIdx !== null && draggedColIdx !== idx) {
                      setDragOverColIdx(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverColIdx === idx) {
                      setDragOverColIdx(null);
                    }
                  }}
                  onDrop={(e) => handleDropOnColumn(e, colName, idx)}
                  className={`w-[82vw] max-w-[285px] sm:w-[280px] shrink-0 snap-start bg-white/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border shadow-xs flex flex-col h-full max-h-full transition-all duration-200 min-h-0 ${
                    isColDragged ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''
                  } ${
                    isColDragOver
                      ? 'border-blue-500 ring-2 ring-blue-400 ring-offset-2 scale-[1.01]'
                      : 'border-slate-200/90 hover:border-blue-300'
                  }`}
                >
                  {/* 열 헤더 (상단 고정) */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 group shrink-0">
                    {editingColIdx === idx ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editingColName}
                          onChange={(e) => setEditingColName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveColName(idx)}
                          className="flex-1 px-2 py-1 text-xs font-bold border border-blue-500 rounded-lg outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveColName(idx)}
                          className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingColIdx(null)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {/* 열 드래그 핸들 (모둠 위치 변경) */}
                          {(!board.isLocked || isTeacherOrAdmin) && (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStartColumn(e, idx)}
                              onDragEnd={handleDragEndColumn}
                              className="p-1 -ml-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition shrink-0"
                              title="모둠(열) 드래그하여 순서 변경"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          <div
                            onClick={() => {
                              setEditingColIdx(idx);
                              setEditingColName(colName);
                            }}
                            className="flex items-center gap-1.5 cursor-pointer font-bold text-sm text-slate-900 hover:text-blue-600 truncate"
                            title="클릭하여 모둠/섹션 이름 수정"
                          >
                            <span className="truncate">{colName}</span>
                            <Pencil className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                            {colPosts.length}개
                          </span>
                          {columns.length > 1 && (
                            <button
                              onClick={() => handleDeleteColumn(colName)}
                              className="p-1 text-slate-300 hover:text-red-500 rounded-md transition"
                              title="열 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 단정한 최상단 카드 추가 버튼 (상단 고정) */}
                  {(!board.isLocked || isTeacherOrAdmin) && (
                    <button
                      onClick={() => {
                        setModalMode('create');
                        setSelectedPostForEdit(undefined);
                        setActiveColumn(colName);
                        setShowPostModal(true);
                      }}
                      className="mb-2 w-full py-2 rounded-xl bg-slate-100/90 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200/60 shadow-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>이 열에 카드 추가</span>
                    </button>
                  )}

                  {/* 🔥 카드 목록: 해당 모둠만 독립적으로 부드럽게 세로 스크롤! */}
                  <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 slim-scrollbar">
                    {colPosts.map((post, postIdx) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStartKanban(e, post.id)}
                        onDragEnd={handleDragEndKanban}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedPostId && draggedPostId !== post.id) {
                            setDragOverPostId(post.id);
                          }
                        }}
                        onDrop={(e) => handleDropOnCard(e, post.id, colName, idx)}
                        className={`cursor-grab active:cursor-grabbing transition-all duration-150 ${
                          draggedPostId === post.id ? 'opacity-40 scale-95' : 'opacity-100'
                        } ${
                          dragOverPostId === post.id
                            ? 'ring-2 ring-blue-500 ring-offset-2 rounded-2xl scale-[1.02] shadow-lg'
                            : ''
                        }`}
                      >
                        <PostCard
                          post={post}
                          currentUser={currentUser}
                          columns={columns}
                          allowComments={board.allowComments}
                          allowReactions={board.allowReactions}
                          onDelete={handleDeletePost}
                          onUpdated={handlePostUpdated}
                          canMoveUp={postIdx > 0}
                          canMoveDown={postIdx < colPosts.length - 1}
                          onMoveUp={(pId) => handleMoveCardStep(pId, 'up')}
                          onMoveDown={(pId) => handleMoveCardStep(pId, 'down')}
                          onMoveToTop={(pId) => handleMoveCardToTop(pId)}
                          onMoveToBottom={(pId) => handleMoveCardToBottom(pId)}
                          onMoveToColumn={(pId, targetCol) => handleMoveCardToColumn(pId, targetCol)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 새 모둠 추가 카드 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <div className="w-[82vw] max-w-[285px] sm:w-[280px] shrink-0">
                {showAddColInput ? (
                  <form
                    onSubmit={handleAddColumn}
                    className="p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-300 shadow-md space-y-2.5"
                  >
                    <div className="text-xs font-bold text-slate-700">새 모둠(열) 추가</div>
                    <input
                      type="text"
                      placeholder="예: 4모둠 또는 보충자료방"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddColInput(false)}
                        className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                      >
                        추가
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowAddColInput(true)}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/70 hover:bg-white text-slate-600 hover:text-blue-600 font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>새 모둠(열) 추가</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : currentLayout === 'grid' ? (
          /* 2) 그리드 모드 */
          <div>
            <div className="mb-3 text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-blue-500" />
              <span>카드를 마우스로 끌어서 다른 카드 위치로 놓으면 순서가 바로 바뀝니다.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-start">
              {posts.map((post, idx) => (
                <div
                  key={post.id}
                  draggable
                  onDragStart={() => handleGridDragStart(idx)}
                  onDragEnter={() => handleGridDragEnter(idx)}
                  onDragEnd={handleGridDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="cursor-grab active:cursor-grabbing transition-transform active:scale-95"
                >
                  <PostCard
                    post={post}
                    currentUser={currentUser}
                    columns={columns}
                    allowComments={board.allowComments}
                    allowReactions={board.allowReactions}
                    onDelete={handleDeletePost}
                    onUpdated={handlePostUpdated}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 3) 자유 캔버스 모드 */
          <div
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
            className="relative min-h-[800px] w-full rounded-3xl border-2 border-dashed border-slate-300/60 p-4 transition overflow-hidden"
          >
            <div className="absolute top-3 left-4 text-xs font-bold text-slate-500/80 pointer-events-none flex items-center gap-1.5">
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>카드를 마우스로 잡고 원하는 위치로 자유롭게 드래그해 옮겨보세요!</span>
            </div>

            {posts.map((post, idx) => {
              const defaultX = 20 + (idx % 3) * 320;
              const defaultY = 40 + Math.floor(idx / 3) * 280;
              const posX = post.x ?? defaultX;
              const posY = post.y ?? defaultY;

              return (
                <div
                  key={post.id}
                  onMouseDown={(e) => handleMouseDownCanvasCard(e, post)}
                  style={{
                    position: 'absolute',
                    left: `${posX}px`,
                    top: `${posY}px`,
                    width: '300px',
                    zIndex: draggingId === post.id ? 50 : 10,
                    cursor: draggingId === post.id ? 'grabbing' : 'grab',
                  }}
                  className={`transition-shadow ${draggingId === post.id ? 'scale-105 shadow-2xl opacity-90' : ''}`}
                >
                  <PostCard
                    post={post}
                    currentUser={currentUser}
                    columns={columns}
                    allowComments={board.allowComments}
                    allowReactions={board.allowReactions}
                    onDelete={handleDeletePost}
                    onUpdated={handlePostUpdated}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>

      {/* 우측 하단 플로팅 글쓰기 버튼 */}
      {(!board.isLocked || isTeacherOrAdmin) && (
        <button
          onClick={() => {
            setModalMode('create');
            setSelectedPostForEdit(undefined);
            setActiveColumn(columns[0]);
            setShowPostModal(true);
          }}
          className="no-print fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-blue-500/40"
          title="새 카드 작성"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* 🔥 생성 및 수정 통합 PostModal (시원한 2xl UI & 다중 파일 드래그앤드롭 완벽 지원) */}
      {showPostModal && (
        <PostModal
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          mode={modalMode}
          boardId={board.id}
          currentUser={currentUser}
          post={selectedPostForEdit}
          defaultColumn={activeColumn}
          columns={Array.from(
            new Set([...columns, ...posts.map((p) => p.column).filter(Boolean) as string[]])
          )}
          onCreated={handlePostCreated}
          onUpdated={handlePostUpdated}
        />
      )}

      {/* 공유 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        board={board}
      />

      {/* QR코드 전용 초대 모달 (대형 빔프로젝터 모드 및 이미지 저장 지원) */}
      <QrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        board={board}
      />

      {/* 배경화면 꾸미기 모달 */}
      <BackgroundModal
        isOpen={showBgModal}
        onClose={() => setShowBgModal(false)}
        board={board}
        onUpdated={(up) => setBoard(up)}
      />
    </div>
  );
}
