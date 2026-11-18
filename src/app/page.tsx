'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Hash,
  Sparkles,
  Users,
  Copy,
  Check,
  Search,
  BookOpen,
  ArrowRight,
  Globe,
  Lock,
  Layers,
  Heart,
  FileCheck,
  FolderOpen,
  TrendingUp,
  Share2,
  Pencil,
  QrCode,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Move,
  Megaphone,
  X,
  Bell,
  Pin,
  PinOff,
  Image as ImageIcon,
} from 'lucide-react';
import Header from '@/components/Header';
import StudentHomeView from '@/components/StudentHomeView';
import CreateBoardModal from '@/components/CreateBoardModal';
import EditBoardModal from '@/components/EditBoardModal';
import QrModal from '@/components/QrModal';
import NoticeModal from '@/components/NoticeModal';
import BannerSettingsModal from '@/components/BannerSettingsModal';
import Footer from '@/components/Footer';
import { getStoreData, saveStoreData, duplicateBoard, getMyBoardIds } from '@/lib/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  fetchRemoteBoards,
  saveRemoteBoard,
  deleteRemoteBoard,
  fetchRemoteNotice,
  fetchRemoteNoticeResult,
  saveRemoteNotice,
  saveRemoteNoticeByType,
  fetchRemoteNoticeByTypeResult,
  fetchRemoteUsers,
  fetchRemoteUserPrefs,
  saveRemoteUserPrefs,
  fetchRemoteBannerSettings,
  saveRemoteBannerSettings,
  DEFAULT_BANNER_SETTINGS,
  DEFAULT_NOTICE,
  DEFAULT_ADMIN_NOTICE,
  DEFAULT_TEACHER_NOTICE,
} from '@/lib/supabaseStore';
import { Board, User, Notice, BannerSettings } from '@/lib/types';
import confetti from 'canvas-confetti';

// 🔑 사용자 계정별(ID/이메일/아이디) 고유 식별 키 추출 헬퍼
const getUserStorageKey = (user: User | null): string => {
  if (!user) return 'guest';
  return (user.id || user.username || user.email || 'user').trim().toLowerCase();
};

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getStoreData().currentUser;
      } catch (e) {}
    }
    return null;
  });
  const [boards, setBoards] = useState<Board[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getStoreData().boards;
      } catch (e) {}
    }
    return [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [qrBoard, setQrBoard] = useState<Board | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // 📢 1) 관리자 공지사항: 교직원/선생님 대상 (학생에게는 절대 보이지 않음)
  const [adminNotice, setAdminNotice] = useState<Notice | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('schoolpad_admin_notice');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.title && parsed.title !== '__DELETED__' && parsed.isActive !== false) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return DEFAULT_ADMIN_NOTICE;
  });

  // 📢 2) 선생님 공지사항: 학생 대상 (학생 홈 화면 메인 상단 노출)
  const [teacherNotice, setTeacherNotice] = useState<Notice | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('schoolpad_teacher_notice') || localStorage.getItem('schoolpad_global_notice');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.title && parsed.title !== '__DELETED__' && parsed.isActive !== false) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return DEFAULT_TEACHER_NOTICE;
  });

  const [noticeModalTab, setNoticeModalTab] = useState<'admin' | 'teacher'>('teacher');
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [dismissedAdminNoticeId, setDismissedAdminNoticeId] = useState<string | null>(null);
  const [dismissedTeacherNoticeId, setDismissedTeacherNoticeId] = useState<string | null>(null);

  // 하위 호환용 alias
  const notice = teacherNotice;
  const setNotice = setTeacherNotice;

  // 📌 각 사용자(ID)별 독립적인 상단 고정(Pin) 목록 및 순서(Order) 상태
  const [userPinnedIds, setUserPinnedIds] = useState<string[]>([]);
  const [userOrderMap, setUserOrderMap] = useState<Record<string, number>>({});

  // 🖼️ 메인 배너 이미지 및 슬라이드쇼 상태
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>(DEFAULT_BANNER_SETTINGS);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [showBannerModal, setShowBannerModal] = useState<boolean>(false);

  // 🎛️ 메인 페이지 보드 카드 크기 유동 조절 상태: 'auto'(개수에 따라 유동 조절) | 'large'(크게) | 'medium'(보통) | 'compact'(작게)
  const [cardDensity, setCardDensity] = useState<'auto' | 'large' | 'medium' | 'compact'>('auto');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('schoolpad_card_density');
        if (saved && ['auto', 'large', 'medium', 'compact'].includes(saved)) {
          setCardDensity(saved as any);
        }
      } catch (e) {}
    }
  }, []);

  // 🖼️ 배너 자동 슬라이드 롤링 타이머
  useEffect(() => {
    if (!bannerSettings.autoSlide || !bannerSettings.slides || bannerSettings.slides.length <= 1) return;
    const intervalMs = Math.max(2, bannerSettings.intervalSeconds || 5) * 1000;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % bannerSettings.slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [bannerSettings.autoSlide, bannerSettings.intervalSeconds, bannerSettings.slides?.length]);

  const handleChangeCardDensity = (density: 'auto' | 'large' | 'medium' | 'compact') => {
    setCardDensity(density);
    try {
      localStorage.setItem('schoolpad_card_density', density);
    } catch (e) {}
  };

  // 🔥 보드 개수에 따른 반응형 유동 사이즈 & 리미트 계산 헬퍼
  const getDynamicGridConfig = (count: number) => {
    if (cardDensity === 'large') {
      return {
        gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
        thumbHeight: 'h-32 sm:h-36',
        padding: 'p-4 sm:p-4.5',
        titleSize: 'text-sm sm:text-base font-black',
        descLineClamp: 'line-clamp-2',
      };
    }
    if (cardDensity === 'medium') {
      return {
        gridClass: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5',
        thumbHeight: 'h-24 sm:h-28',
        padding: 'p-3.5',
        titleSize: 'text-xs sm:text-sm font-black',
        descLineClamp: 'line-clamp-1',
      };
    }
    if (cardDensity === 'compact') {
      return {
        gridClass: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5',
        thumbHeight: 'h-18 sm:h-20',
        padding: 'p-2.5 sm:p-3',
        titleSize: 'text-xs font-bold',
        descLineClamp: 'line-clamp-1',
      };
    }

    // cardDensity === 'auto': 카드 개수에 맞춰 자동으로 최적화 (적으면 키우고, 많으면 줄이되 리미트 적용)
    if (count <= 2) {
      return {
        gridClass: 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl',
        thumbHeight: 'h-32 sm:h-36',
        padding: 'p-4 sm:p-5',
        titleSize: 'text-sm sm:text-base font-black',
        descLineClamp: 'line-clamp-2',
      };
    }
    if (count <= 4) {
      return {
        gridClass: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 max-w-5xl',
        thumbHeight: 'h-28 sm:h-32',
        padding: 'p-3.5 sm:p-4',
        titleSize: 'text-xs sm:text-sm font-black',
        descLineClamp: 'line-clamp-2',
      };
    }
    if (count <= 8) {
      // 5~8개: 4열 리미트 (8개일 때 4개씩 2줄로 빈틈없는 대칭 균형)
      return {
        gridClass: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5',
        thumbHeight: 'h-24 sm:h-28',
        padding: 'p-3.5',
        titleSize: 'text-xs sm:text-sm font-black',
        descLineClamp: 'line-clamp-1',
      };
    }
    if (count <= 14) {
      // 9~14개: 5열 리미트
      return {
        gridClass: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3',
        thumbHeight: 'h-20 sm:h-24',
        padding: 'p-3',
        titleSize: 'text-xs font-black',
        descLineClamp: 'line-clamp-1',
      };
    }
    // 15개 이상으로 매우 많을 때: 콤팩트 6열 리미트 (7열 이상 억지 축소 방지)
    return {
      gridClass: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5',
      thumbHeight: 'h-18 sm:h-20',
      padding: 'p-2.5 sm:p-3',
      titleSize: 'text-xs font-bold',
      descLineClamp: 'line-clamp-1',
    };
  };

  // 탭: 'all'(전체 섹터 분리 보기) / 'my'(내가 만든 자료) / 'public'(다른 사람이 공유한 자료) / 'template'(추천 템플릿)
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'public' | 'template'>('all');
  const [draggedBoardId, setDraggedBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  // 🔥 보드 순서 맵 로컬 캐시 조회 및 적용 헬퍼 (새로고침/재진입 시 순서 100% 영구 보존)
  const getSavedOrderMap = (): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('schoolpad_board_orders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const applySavedOrders = (boardList: Board[]): Board[] => {
    const savedOrders = getSavedOrderMap();
    return boardList.map((b) => {
      if (savedOrders[b.id] !== undefined) {
        return { ...b, order: savedOrders[b.id] };
      }
      return b;
    });
  };

  const loadData = async () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    const initialBoards = applySavedOrders(data.boards);
    setBoards(initialBoards);

    const userKey = getUserStorageKey(data.currentUser);

    // 📌 아이디별 독립적인 상단 고정(Pin) 목록 로컬 로드
    try {
      const localPins = localStorage.getItem('schoolpad_user_pinned_' + userKey);
      if (localPins) {
        setUserPinnedIds(JSON.parse(localPins));
      } else {
        setUserPinnedIds([]);
      }
    } catch (e) {}

    // 🔢 아이디별 독립적인 보드 순서(Order) 로컬 로드
    try {
      const localOrders = localStorage.getItem('schoolpad_user_orders_' + userKey);
      if (localOrders) {
        setUserOrderMap(JSON.parse(localOrders));
      } else {
        setUserOrderMap({});
      }
    } catch (e) {}

    // 🖼️ 로컬 메인 배너 이미지 및 슬라이드 설정 로드
    try {
      const cachedBanner = localStorage.getItem('schoolpad_banner_settings');
      if (cachedBanner) {
        const parsed = JSON.parse(cachedBanner);
        if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          setBannerSettings(parsed);
        }
      }
    } catch (e) {}

    // 로컬 공지사항 로드
    try {
      const cachedNotice = localStorage.getItem('schoolpad_global_notice');
      if (cachedNotice) {
        setNotice(JSON.parse(cachedNotice));
      }
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      try {
        // 🖼️ 메인 배너 이미지 원격 동기화
        fetchRemoteBannerSettings()
          .then((remBanner) => {
            if (remBanner && Array.isArray(remBanner.slides) && remBanner.slides.length > 0) {
              let localTime = 0;
              try {
                const cached = localStorage.getItem('schoolpad_banner_settings');
                if (cached) localTime = JSON.parse(cached).updatedAt || 0;
              } catch (e) {}

              if ((remBanner.updatedAt || 0) >= localTime) {
                setBannerSettings(remBanner);
                try {
                  localStorage.setItem('schoolpad_banner_settings', JSON.stringify(remBanner));
                } catch (e) {}
              }
            }
          })
          .catch(() => {});

        // 📌 사용자별 원격 고정(Pin) 및 순서(Order) 실시간 동기화
        fetchRemoteUserPrefs(userKey)
          .then((remPrefs) => {
            if (remPrefs) {
              if (Array.isArray(remPrefs.pinnedIds)) {
                setUserPinnedIds(remPrefs.pinnedIds);
                try {
                  localStorage.setItem('schoolpad_user_pinned_' + userKey, JSON.stringify(remPrefs.pinnedIds));
                } catch (e) {}
              }
              if (remPrefs.orderMap && typeof remPrefs.orderMap === 'object') {
                setUserOrderMap(remPrefs.orderMap);
                try {
                  localStorage.setItem('schoolpad_user_orders_' + userKey, JSON.stringify(remPrefs.orderMap));
                } catch (e) {}
              }
            }
          })
          .catch(() => {});

        // 📢 1) 관리자 공지사항(교직원 대상) 비동기 조회
        fetchRemoteNoticeByTypeResult('admin')
          .then(({ notice: remNotice, error }) => {
            if (error) return;
            const activeNotice = (remNotice && remNotice.isActive !== false && remNotice.title !== '__DELETED__')
              ? remNotice
              : DEFAULT_ADMIN_NOTICE;

            setAdminNotice((prev) => {
              if (
                prev &&
                prev.id === activeNotice.id &&
                prev.isActive === activeNotice.isActive &&
                prev.title === activeNotice.title &&
                prev.content === activeNotice.content &&
                prev.category === activeNotice.category &&
                prev.expiresAt === activeNotice.expiresAt &&
                prev.updatedAt === activeNotice.updatedAt
              ) {
                return prev;
              }
              return activeNotice;
            });
            try {
              localStorage.setItem('schoolpad_admin_notice', JSON.stringify(activeNotice));
            } catch (e) {}
          })
          .catch(() => {});

        // 📢 2) 선생님 공지사항(학생 대상) 비동기 조회
        fetchRemoteNoticeByTypeResult('teacher')
          .then(({ notice: remNotice, error }) => {
            if (error) return;
            const activeNotice = (remNotice && remNotice.isActive !== false && remNotice.title !== '__DELETED__')
              ? remNotice
              : DEFAULT_TEACHER_NOTICE;

            setTeacherNotice((prev) => {
              if (
                prev &&
                prev.id === activeNotice.id &&
                prev.isActive === activeNotice.isActive &&
                prev.title === activeNotice.title &&
                prev.content === activeNotice.content &&
                prev.category === activeNotice.category &&
                prev.expiresAt === activeNotice.expiresAt &&
                prev.updatedAt === activeNotice.updatedAt
              ) {
                return prev;
              }
              return activeNotice;
            });
            try {
              localStorage.setItem('schoolpad_teacher_notice', JSON.stringify(activeNotice));
              localStorage.setItem('schoolpad_global_notice', JSON.stringify(activeNotice));
            } catch (e) {}
          })
          .catch(() => {});

        // 👥 원격 사용자 목록 조회하여 현재 로그인한 유저의 최신 권한(교사/관리자 등) 실시간 동기화
        fetchRemoteUsers()
          .then((remUsers) => {
            if (remUsers && remUsers.length > 0) {
              const cur = getStoreData().currentUser;
              if (cur) {
                const matched = remUsers.find(
                  (u) =>
                    u.id === cur.id ||
                    (u.username && u.username === cur.username) ||
                    (u.name && u.name === cur.name)
                );
                if (matched && (matched.role !== cur.role || matched.status !== cur.status)) {
                  const updatedUser = {
                    ...cur,
                    role: matched.role,
                    status: matched.status,
                    name: matched.name,
                  };
                  setCurrentUser(updatedUser);
                  saveStoreData.currentUser(updatedUser);
                }
              }
            }
          })
          .catch(() => {});

        // 🗑️ 삭제된 보드 ID 목록 로드 (원격 캐시나 구버전 데이터로 인한 재부활 차단)
        const deletedIds = new Set<string>();
        try {
          const rawDel = localStorage.getItem('schoolpad_deleted_boards');
          if (rawDel) {
            const parsed = JSON.parse(rawDel);
            if (Array.isArray(parsed)) parsed.forEach((id: string) => deletedIds.add(id));
          }
        } catch (e) {}

        const remote = await fetchRemoteBoards();
        if (remote && remote.length > 0) {
          // 삭제된 보드가 원격에 남아있다면 즉각 비동기 삭제 처리 및 뷰에서 영구 제외
          const validRemote = remote.filter((b) => {
            if (deletedIds.has(b.id) || (b.code && deletedIds.has(b.code))) {
              deleteRemoteBoard(b.id).catch(() => {});
              return false;
            }
            return true;
          });

          const currentLocal = getStoreData().boards.filter((b) => !deletedIds.has(b.id) && !deletedIds.has(b.code));
          const localMap = new Map(currentLocal.map((b) => [b.id, b]));
          const remoteMap = new Map(validRemote.map((b) => [b.id, b]));
          const allIds = Array.from(new Set([...currentLocal.map((b) => b.id), ...validRemote.map((b) => b.id)]));

          const merged: Board[] = [];
          for (const id of allIds) {
            if (deletedIds.has(id)) continue;
            const local = localMap.get(id);
            const rem = remoteMap.get(id);
            if (rem) {
              // 🔥 원격 클라우드 DB가 공유 여부(isPublic) 및 내용의 단일 진실 소스(Single Source of Truth)!
              merged.push({
                ...rem,
                order: local?.order ?? rem.order,
                pinned: false,
              });
            } else if (local) {
              // 원격에 아직 없는 로컬 신규 보드
              merged.push(local);
            }
          }

          // 🔥 원격 DB에 아직 없는 로컬 보드만 최초 1회 안전 업로드 (삭제된 것은 절대 업로드 안함)
          for (const b of currentLocal) {
            if (!remoteMap.has(b.id) && isMyBoard(b) && !deletedIds.has(b.id) && !deletedIds.has(b.code)) {
              await saveRemoteBoard(b).catch(() => {});
            }
          }

          const finalBoards = applySavedOrders(merged);
          setBoards(finalBoards);
          localStorage.setItem('school_padlet_boards', JSON.stringify(finalBoards));
        }
      } catch (e) {
        console.error('Remote board fetch error', e);
      }
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();
    const handleUpdate = () => {
      // 로컬 스토어 변경 시 로컬 순서 유지하며 반영
      const data = getStoreData();
      setCurrentUser(data.currentUser);
      setBoards(applySavedOrders(data.boards));
    };
    window.addEventListener('store_updated', handleUpdate);

    // ⚡ 브라우저 내 다른 탭에서 공지사항 저장 시 즉각 동기화 (새로고침 없이도 즉시 반영)
    const handleNoticeCrossTabSync = () => {
      try {
        const cachedAdmin = localStorage.getItem('schoolpad_admin_notice');
        if (cachedAdmin) {
          const parsed = JSON.parse(cachedAdmin);
          if (parsed && parsed.title && parsed.title !== '__DELETED__' && parsed.isActive !== false) {
            setAdminNotice(parsed);
          }
        }
        const cachedTeacher = localStorage.getItem('schoolpad_teacher_notice') || localStorage.getItem('schoolpad_global_notice');
        if (cachedTeacher) {
          const parsed = JSON.parse(cachedTeacher);
          if (parsed && parsed.title && parsed.title !== '__DELETED__' && parsed.isActive !== false) {
            setTeacherNotice(parsed);
          }
        }
      } catch (e) {}
    };
    window.addEventListener('storage', handleNoticeCrossTabSync);
    window.addEventListener('schoolpad_notice_updated', handleNoticeCrossTabSync);

    // ⚡ 다른 사용자의 보드 개설 및 공개/비공개 토글, 공지사항/배너 변경 실시간 감지
    let boardChannel: any = null;
    let pollTimer: any = null;
    if (isSupabaseConfigured && supabase) {
      boardChannel = supabase
        .channel('main-boards-cloud-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          loadData();
        })
        .subscribe();

      pollTimer = setInterval(() => {
        loadData();
      }, 4000);
    }

    return () => {
      window.removeEventListener('store_updated', handleUpdate);
      window.removeEventListener('storage', handleNoticeCrossTabSync);
      window.removeEventListener('schoolpad_notice_updated', handleNoticeCrossTabSync);
      if (boardChannel && supabase) supabase.removeChannel(boardChannel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  // 로그인되지 않은 경우 로그인 페이지로 자동 안내
  useEffect(() => {
    const data = getStoreData();
    if (!data.currentUser) {
      router.push('/login');
    }
  }, [router]);

  // 1) 6자리 핀코드 복사
  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 2) 전역 공유 링크 복사
  const handleCopyLink = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/join/${code}`);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // 3) 보드 복제하기 (다른 사람의 보드를 내 보드로 가져오기)
  const handleDuplicateBoard = async (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('보드를 복제하려면 먼저 로그인해 주세요.');
      return;
    }
    const copied = duplicateBoard(board.id, currentUser);
    if (copied) {
      if (isSupabaseConfigured) {
        await saveRemoteBoard(copied).catch(() => {});
      }
      loadData();
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch (err) {}
      alert(`🎉 [${board.title}] 보드가 내 보드로 성공적으로 복제되었습니다!`);
      router.push(`/board/${copied.id}`);
    }
  };

  // 4) 보드 공개/비공개 공유 상태 토글
  const handleTogglePublic = async (e: React.MouseEvent, targetBoard: Board) => {
    e.stopPropagation();
    const isPublicNow = targetBoard.isPublic !== false;
    const newStatus = !isPublicNow;
    const updated: Board = { ...targetBoard, isPublic: newStatus, updatedAt: Date.now() };

    // 1. 화면 UI 즉시 반응 (낙관적 업데이트)
    setBoards((prev) => prev.map((b) => (b.id === targetBoard.id ? updated : b)));

    // 2. 로컬 스토리지에 즉시 동기화
    const data = getStoreData();
    const updatedBoards = data.boards.map((b) => (b.id === targetBoard.id ? updated : b));
    if (!updatedBoards.some((b) => b.id === targetBoard.id)) {
      updatedBoards.push(updated);
    }
    localStorage.setItem('school_padlet_boards', JSON.stringify(updatedBoards));

    // 3. Supabase 원격 DB에 즉시 확정 저장 (모든 기기에 실시간 반영)
    if (isSupabaseConfigured) {
      await saveRemoteBoard(updated);
    }
  };

  // 5) 보드 상단 고정(Pin) 상태 토글 (각 사용자/아이디별 독립 저장)
  const handleTogglePinBoard = async (e: React.MouseEvent, targetBoard: Board) => {
    e.stopPropagation();
    const userKey = getUserStorageKey(currentUser);
    const isPinned = userPinnedIds.includes(targetBoard.id);
    const newPinnedIds = isPinned
      ? userPinnedIds.filter((id) => id !== targetBoard.id)
      : [...userPinnedIds, targetBoard.id];

    setUserPinnedIds(newPinnedIds);

    try {
      localStorage.setItem('schoolpad_user_pinned_' + userKey, JSON.stringify(newPinnedIds));
    } catch (err) {}

    if (isSupabaseConfigured) {
      saveRemoteUserPrefs(userKey, { pinnedIds: newPinnedIds, orderMap: userOrderMap }).catch(() => {});
    }
  };

  // 🔥 내가 만든 보드 판정 (직접 생성한 보드 + 다른 사람 보드에서 복사해 온 복사본 100% 내 자료로 분류)
  const isMyBoard = (b: Board) => {
    const cur = currentUser || getStoreData().currentUser;
    if (!cur) return false;
    const myBoardIds = getMyBoardIds();
    return Boolean(
      myBoardIds.includes(b.id) ||
      (b.authorId && b.authorId === cur.id) ||
      (b.authorName && (b.authorName === cur.name || b.authorName === cur.username)) ||
      (b.copiedFromTitle && (b.authorId === cur.id || b.authorName === cur.name || myBoardIds.includes(b.id))) ||
      (cur.name === 'minwan1 kim' && (b.authorName === 'minwan1 kim' || b.title.includes('테스트')))
    );
  };

  // 🔥 보드 순서 영구 저장 및 동기화 함수
  const saveReorderedBoards = async (updatedBoards: Board[]) => {
    const savedOrders = getSavedOrderMap();
    const now = Date.now();
    const finalBoards = updatedBoards.map((b) => {
      if (typeof b.order === 'number') {
        savedOrders[b.id] = b.order;
        return { ...b, updatedAt: now };
      }
      return b;
    });

    try {
      localStorage.setItem('schoolpad_board_orders', JSON.stringify(savedOrders));
      localStorage.setItem('school_padlet_boards', JSON.stringify(finalBoards));
    } catch (e) {}

    setBoards(finalBoards);
    const data = getStoreData();
    saveStoreData.boards(finalBoards);

    if (isSupabaseConfigured) {
      for (const b of finalBoards) {
        await saveRemoteBoard(b).catch(() => {});
      }
    }
  };

  // 📢 1) 관리자 공지 (교직원/선생님 대상) 저장
  const handleSaveAdminNotice = async (newNotice: Notice | null) => {
    if (currentUser?.role !== 'admin') {
      alert('교직원 대상 공지 관리는 학교 관리자(admin) 전용 권한입니다.');
      return;
    }
    const nowTime = Date.now();
    const finalNotice: Notice = newNotice
      ? { ...newNotice, noticeType: 'admin', targetAudience: 'teachers', updatedAt: nowTime }
      : { ...DEFAULT_ADMIN_NOTICE, isActive: false, updatedAt: nowTime };

    setAdminNotice(finalNotice);
    setDismissedAdminNoticeId(null);
    try {
      if (finalNotice.isActive !== false && finalNotice.title) {
        localStorage.setItem('schoolpad_admin_notice', JSON.stringify(finalNotice));
      } else {
        localStorage.removeItem('schoolpad_admin_notice');
      }
      window.dispatchEvent(new Event('schoolpad_notice_updated'));
    } catch (e) {}

    if (isSupabaseConfigured) {
      await saveRemoteNoticeByType('admin', finalNotice).catch((err) => {
        console.error('Remote admin notice save error:', err);
      });
    }
    alert('교직원 대상 공지사항이 성공적으로 저장되었습니다.');
  };

  // 📢 2) 선생님 공지 (학생 대상) 저장
  const handleSaveTeacherNotice = async (newNotice: Notice | null) => {
    if (!isTeacherOrAdmin) {
      alert('학생 대상 공지사항 관리는 선생님 및 학교 관리자 전용 권한입니다.');
      return;
    }
    const nowTime = Date.now();
    const finalNotice: Notice = newNotice
      ? { ...newNotice, noticeType: 'teacher', targetAudience: 'students', updatedAt: nowTime }
      : { ...DEFAULT_TEACHER_NOTICE, isActive: false, updatedAt: nowTime };

    setTeacherNotice(finalNotice);
    setDismissedTeacherNoticeId(null);
    try {
      if (finalNotice.isActive !== false && finalNotice.title) {
        localStorage.setItem('schoolpad_teacher_notice', JSON.stringify(finalNotice));
        localStorage.setItem('schoolpad_global_notice', JSON.stringify(finalNotice));
      } else {
        localStorage.removeItem('schoolpad_teacher_notice');
        localStorage.removeItem('schoolpad_global_notice');
      }
      window.dispatchEvent(new Event('schoolpad_notice_updated'));
    } catch (e) {}

    if (isSupabaseConfigured) {
      await saveRemoteNoticeByType('teacher', finalNotice).catch((err) => {
        console.error('Remote teacher notice save error:', err);
      });
    }
    alert('학생 대상 공지사항이 성공적으로 저장되었습니다.');
  };

  // 하위 호환용 단일 저장 핸들러
  const handleSaveNotice = async (newNotice: Notice | null) => {
    if (newNotice?.noticeType === 'admin' || newNotice?.targetAudience === 'teachers') {
      await handleSaveAdminNotice(newNotice);
    } else {
      await handleSaveTeacherNotice(newNotice);
    }
  };

  // 🖼️ 메인 배너 이미지 및 슬라이드 설정 저장 (관리자 admin 전용)
  const handleSaveBannerSettings = async (newSettings: BannerSettings) => {
    if (currentUser?.role !== 'admin') {
      alert('메인 배너 이미지 설정은 학교 관리자(admin) 전용 권한입니다.');
      return;
    }
    const nowTime = Date.now();
    const stamped = { ...newSettings, updatedAt: nowTime };
    setBannerSettings(stamped);
    setCurrentSlideIndex(0);
    try {
      localStorage.setItem('schoolpad_banner_settings', JSON.stringify(stamped));
    } catch (e) {}

    if (isSupabaseConfigured) {
      await saveRemoteBannerSettings(stamped).catch((err) => {
        console.error('Remote banner save error:', err);
      });
    }
  };

  // 1) 좌/우 화살표 버튼으로 한 칸씩 순서 이동 (아이디별 독립 순서 저장)
  const handleMoveBoardStep = async (e: React.MouseEvent, boardId: string, direction: 'prev' | 'next', currentList: Board[]) => {
    e.stopPropagation();
    const idx = currentList.findIndex((b) => b.id === boardId);
    if (idx === -1) return;
    const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const isPinned = userPinnedIds.includes(boardId);
    const targetIsPinned = userPinnedIds.includes(currentList[targetIdx].id);

    // 고정된 카드는 고정된 카드끼리만, 일반 카드는 일반 카드끼리만 교환
    if (isPinned !== targetIsPinned) return;

    // 현재 리스트에서 순서 스왑
    const newList = [...currentList];
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;

    const newOrderMap = { ...userOrderMap };
    newList.forEach((b, i) => {
      newOrderMap[b.id] = i;
    });

    setUserOrderMap(newOrderMap);
    const userKey = getUserStorageKey(currentUser);
    try {
      localStorage.setItem('schoolpad_user_orders_' + userKey, JSON.stringify(newOrderMap));
    } catch (e) {}

    if (isSupabaseConfigured) {
      saveRemoteUserPrefs(userKey, { pinnedIds: userPinnedIds, orderMap: newOrderMap }).catch(() => {});
    }
  };

  // 2) 마우스 드래그 앤 드롭으로 순서 변경 (고정된 카드끼리 순서 변경 포함 & 아이디별 독립 저장)
  const handleDropBoard = async (targetBoardId: string, currentList: Board[]) => {
    if (!draggedBoardId || draggedBoardId === targetBoardId) {
      setDraggedBoardId(null);
      setDragOverBoardId(null);
      return;
    }

    const fromIdx = currentList.findIndex((b) => b.id === draggedBoardId);
    const toIdx = currentList.findIndex((b) => b.id === targetBoardId);

    if (fromIdx === -1 || toIdx === -1) {
      setDraggedBoardId(null);
      setDragOverBoardId(null);
      return;
    }

    const fromIsPinned = userPinnedIds.includes(draggedBoardId);
    const toIsPinned = userPinnedIds.includes(targetBoardId);

    // 고정된 카드끼리 드래그 시 고정된 카드 사이에서 순서 변경,
    // 일반 카드끼리 드래그 시 일반 카드 사이에서 순서 변경
    const newList = [...currentList];
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, moved);

    const newOrderMap = { ...userOrderMap };
    newList.forEach((b, i) => {
      newOrderMap[b.id] = i;
    });

    setUserOrderMap(newOrderMap);
    const userKey = getUserStorageKey(currentUser);
    try {
      localStorage.setItem('schoolpad_user_orders_' + userKey, JSON.stringify(newOrderMap));
    } catch (e) {}

    if (isSupabaseConfigured) {
      saveRemoteUserPrefs(userKey, { pinnedIds: userPinnedIds, orderMap: newOrderMap }).catch(() => {});
    }

    setDraggedBoardId(null);
    setDragOverBoardId(null);
  };

  // 필터링
  const filteredBoards = boards.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.includes(searchTerm) ||
      b.authorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === '전체' || b.category === selectedCategory;

    const isAuthor = isMyBoard(b);

    if (activeTab === 'all') {
      // 전체 보기 (공개 보드이거나 내가 만든 보드)
      return matchesSearch && matchesCategory && (b.isPublic !== false || isAuthor);
    }
    if (activeTab === 'public') {
      // 다른 사람이 공유한 보드만
      return matchesSearch && matchesCategory && !isAuthor && b.isPublic !== false;
    }
    if (activeTab === 'my') {
      // 내가 만든 보드 (직접 생성 + 복제해 온 자료 포함)
      return matchesSearch && matchesCategory && isAuthor;
    }
    if (activeTab === 'template') {
      // 🌟 추천 템플릿 명확한 기준:
      // 1. 개인 복제본([복제본] 또는 copiedFromTitle) 제외
      // 2. 비공개 보드(isPublic === false) 제외
      // 3. 학교/관리자 공식 인증 보드 및 수업/모둠 활동에 바로 복제해 쓸 수 있는 표준 템플릿 원본만 선별
      const isCopy = b.title.includes('복제본') || Boolean(b.copiedFromTitle) || b.id.startsWith('board-copy-');
      const isPublic = b.isPublic !== false;
      const isOfficial =
        b.id === 'board-useful-school-links' ||
        b.id === 'board-entry-middle-school' ||
        b.id === 'board-vibecoding' ||
        b.id === 'board-1' ||
        b.authorRole === 'admin' ||
        b.authorName?.includes('관리자');

      return matchesSearch && matchesCategory && !isCopy && isPublic && (isOfficial || b.category === '수업자료' || b.category === '모둠활동');
    }
    return matchesSearch && matchesCategory;
  });

  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
  const totalPostsCount = getStoreData().posts.length;

  // 🌟 세션 로딩 중이거나 아직 마운트되기 전에는 성급하게 학생 뷰를 노출하지 않고 부드러운 로딩 상태 유지
  if (!isMounted || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-500 font-bold">화면을 불러오는 중입니다...</span>
      </div>
    );
  }

  // 🌟 학생 전용 뷰: 오직 currentUser.role === 'student'인 경우에만 렌더링!
  // 교사/관리자는 0.1초도 학생 화면이 깜빡이지 않고 본인 대시보드가 즉시 노출됩니다.
  // 🔒 학생 화면에는 관리자 공지(adminNotice)가 절대 노출되지 않으며 오직 선생님 공지(teacherNotice)만 전달됩니다!
  if (currentUser.role === 'student') {
    return (
      <StudentHomeView
        currentUser={currentUser}
        boards={boards}
        onCopyCode={handleCopyCode}
        onCopyLink={handleCopyLink}
        notice={teacherNotice}
        onOpenNotice={() => {
          setNoticeModalTab('teacher');
          setShowNoticeModal(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      <Header />

      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
        {/* 🏫 교직원 대상 관리자 공지 배너 (선생님 및 관리자에게만 노출되며, 학생에게는 절대 보이지 않음) */}
        {adminNotice &&
          adminNotice.isActive !== false &&
          (!adminNotice.expiresAt || new Date(adminNotice.expiresAt).getTime() > Date.now()) &&
          dismissedAdminNoticeId !== adminNotice.id && (
          <div
            onClick={() => {
              setNoticeModalTab('admin');
              setShowNoticeModal(true);
            }}
            className={`cursor-pointer mb-6 rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all hover:shadow-md flex items-center justify-between gap-3 ${
              adminNotice.category === 'urgent'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : adminNotice.category === 'event'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                : 'bg-indigo-50/95 border-indigo-200 text-indigo-900'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <span
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                  adminNotice.category === 'urgent'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : adminNotice.category === 'event'
                    ? 'bg-amber-500 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {adminNotice.category === 'urgent' ? '🚨 교직원 긴급' : adminNotice.category === 'event' ? '🎉 교무 행사소식' : '🏫 교직원 공지'}
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 overflow-hidden">
                <span className="font-bold text-xs sm:text-sm truncate">{adminNotice.title}</span>
                {adminNotice.content && (
                  <span className="text-[11px] sm:text-xs opacity-75 truncate max-w-md hidden sm:inline">
                    - {adminNotice.content}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold underline underline-offset-2 opacity-80 hover:opacity-100 hidden sm:inline">
                자세히 보기
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedAdminNoticeId(adminNotice.id);
                }}
                className="p-1 hover:bg-black/5 rounded-lg transition text-slate-400 hover:text-slate-700"
                title="공지 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 학교/교실 실사진 배경의 단정하고 깔끔한 프리미엄 배너 (여러 장 슬라이드쇼 회전 지원) */}
        <div className="relative overflow-hidden rounded-[2rem] text-white p-7 sm:p-10 shadow-xl mb-8 border border-white/20 min-h-[300px] flex items-center group">
          {/* 슬라이드 이미지들 (부드러운 크로스페이드 전환 & 개별 사진 위치 반영) */}
          {(bannerSettings.slides && bannerSettings.slides.length > 0
            ? bannerSettings.slides
            : DEFAULT_BANNER_SETTINGS.slides
          ).map((slide, sIdx) => {
            const isCurrent = sIdx === currentSlideIndex;
            return (
              <div
                key={slide.id || sIdx}
                className={`absolute inset-0 bg-cover transition-opacity duration-1000 ease-in-out ${
                  isCurrent ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
                }`}
                style={{
                  backgroundImage: `url('${slide.url}')`,
                  backgroundPosition: slide.position || 'center 25%',
                }}
              />
            );
          })}

          {/* 선명한 텍스트 가독성을 위한 고급 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-blue-950/85 to-indigo-950/70 backdrop-blur-[0.5px] z-1 pointer-events-none" />

          {/* 좌 / 우 슬라이드 이동 화살표 버튼 (2장 이상일 때 노출) */}
          {bannerSettings.slides && bannerSettings.slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex((prev) => (prev - 1 + bannerSettings.slides.length) % bannerSettings.slides.length);
                }}
                className="absolute left-3 sm:left-4 z-20 p-2 rounded-full bg-black/35 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition opacity-0 group-hover:opacity-100 shadow-md active:scale-90"
                title="이전 배경 사진"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex((prev) => (prev + 1) % bannerSettings.slides.length);
                }}
                className="absolute right-3 sm:right-4 z-20 p-2 rounded-full bg-black/35 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition opacity-0 group-hover:opacity-100 shadow-md active:scale-90"
                title="다음 배경 사진"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* 하단 슬라이드 인디케이터 점(Dots) */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                {bannerSettings.slides.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlideIndex(dotIdx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      dotIdx === currentSlideIndex ? 'w-5 bg-white shadow-xs' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                    title={`${dotIdx + 1}번째 이미지`}
                  />
                ))}
              </div>
            </>
          )}

          {/* 학교 관리자(admin) 전용 [🖼️ 배너 이미지 변경] 버튼 */}
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBannerModal(true);
              }}
              className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white/90 hover:text-white text-[11px] font-bold backdrop-blur-md border border-white/20 transition shadow-md active:scale-95 cursor-pointer"
              title="메인 배경 이미지 변경 및 슬라이드 관리"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>배너 이미지 변경</span>
              {bannerSettings.slides && bannerSettings.slides.length > 1 && (
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full font-mono text-[9px]">
                  {currentSlideIndex + 1}/{bannerSettings.slides.length}
                </span>
              )}
            </button>
          )}

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="tracking-wide">우리 학교 실시간 협업 & 템플릿 공유 플랫폼</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
                생각을 붙이고, 나누고, <br />
                함께 카피하며 성장하는 교실
              </h1>

              <p className="mt-3 text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal">
                학생들은 6자리 참여 링크로 1초 만에 참여하고, <br className="hidden sm:inline" />
                선생님들은 다른 학급의 수업 보드를 클릭 한 번으로 내 보드로 복제(Copy)해 활용하세요.
              </p>

              {/* 히어로 빠른 액션 버튼 */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-800 hover:bg-blue-50 font-black text-xs shadow-lg transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>새 협업 보드 만들기</span>
                </button>

                <button
                  onClick={() => setActiveTab('template')}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/20 hover:bg-white/30 border border-white/25 backdrop-blur-md text-white font-bold text-xs transition active:scale-95"
                >
                  <Layers className="w-4 h-4 text-amber-300" />
                  <span>추천 템플릿 복제하기</span>
                </button>

                {/* 📢 학교 선생님 & 관리자 공지사항 관리 버튼 */}
                {isTeacherOrAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setDismissedAdminNoticeId(null);
                        setDismissedTeacherNoticeId(null);
                        setNoticeModalTab(currentUser?.role === 'admin' ? 'admin' : 'teacher');
                        setShowNoticeModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Megaphone className="w-4 h-4 text-amber-900" />
                      <span>
                        {currentUser?.role === 'admin'
                          ? '공지사항 관리'
                          : (teacherNotice && teacherNotice.isActive ? '학생 공지 관리' : '학생 공지 작성')}
                      </span>
                      {((adminNotice?.isActive && (!adminNotice.expiresAt || new Date(adminNotice.expiresAt).getTime() > Date.now())) ||
                        (teacherNotice?.isActive && (!teacherNotice.expiresAt || new Date(teacherNotice.expiresAt).getTime() > Date.now()))) && (
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse ml-0.5" />
                      )}
                    </button>

                    {/* 교사용: 현재 학생들에게 노출 중인 공지 칩 미리보기 */}
                    {teacherNotice && teacherNotice.isActive && (!teacherNotice.expiresAt || new Date(teacherNotice.expiresAt).getTime() > Date.now()) && (
                      <button
                        onClick={() => {
                          setNoticeModalTab('teacher');
                          setShowNoticeModal(true);
                        }}
                        className="hidden md:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/20 text-white text-xs font-medium transition cursor-pointer text-left"
                        title="학생들에게 노출 중인 공지 확인/수정"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="font-bold text-amber-300 shrink-0">학생 노출 공지:</span>
                        <span className="truncate max-w-[160px] lg:max-w-[220px] opacity-90">{teacherNotice.title}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 우측 다이나믹 통계 위젯 카드 (글래스모피즘 & 호버 인터랙션) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-80 shrink-0">
              <div className="bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-1">
                <div className="text-[11px] font-bold text-blue-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-300" />
                  <span>공유된 보드</span>
                </div>
                <div className="text-3xl font-black text-white mt-2 font-mono">
                  {boards.filter((b) => b.isPublic !== false).length}
                  <span className="text-xs text-blue-200 font-normal ml-1">개</span>
                </div>
              </div>

              <div className="bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-1">
                <div className="text-[11px] font-bold text-blue-200 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>나눈 메모/카드</span>
                </div>
                <div className="text-3xl font-black text-white mt-2 font-mono">
                  {totalPostsCount}
                  <span className="text-xs text-blue-200 font-normal ml-1">건</span>
                </div>
              </div>

              <div className="col-span-2 bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                    <span>실시간 협업 상태</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-black shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>LIVE 연결됨</span>
                  </span>
                </div>
                <div className="text-[11px] text-white/90 mt-1.5 font-medium leading-relaxed">
                  수업 중 학생들의 카드와 모둠 활동이 실시간 동기화 중입니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 탭바 & 검색 바 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* 4대 탭: [전체 보기(섹터별)] / [내가 만든 자료] / [다른 사람 자료] / [추천 템플릿] */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                activeTab === 'all'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>전체 섹터 보기</span>
            </button>

            <button
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                activeTab === 'my'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>내가 만든 자료</span>
              {currentUser && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px] font-mono">
                  {boards.filter(isMyBoard).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('public')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                activeTab === 'public'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>선생님 & 다른 사람 자료</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-mono">
                {boards.filter((b) => !isMyBoard(b) && b.isPublic !== false).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('template')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                activeTab === 'template'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>추천 템플릿 모음</span>
            </button>
          </div>

          {/* 검색창 */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="보드 제목, 개설자, 6자리 코드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>

        {/* 카테고리 필터 뱃지 & 카드 크기 유동 조절 버튼 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 text-xs font-bold">
          <div className="flex items-center gap-2 overflow-x-auto">
            {['전체', '수업자료', '모둠활동', '학급회의', '자유나눔', '프로젝트'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 카드 크기 유동 조절 버튼 그룹 (스마트 자동 / 크게 / 보통 / 작게) */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-[11px] font-bold text-slate-600 shrink-0 ml-auto">
            <span className="px-1 text-slate-400 text-[10px] hidden sm:inline">카드 크기:</span>
            <button
              onClick={() => handleChangeCardDensity('auto')}
              className={`px-2.5 py-1 rounded-lg transition ${
                cardDensity === 'auto'
                  ? 'bg-white text-blue-700 font-black shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
              title="보드 개수에 맞춰 크기와 열 수를 유동적으로 자동 조절 (스마트 리미트)"
            >
              자동 (유동)
            </button>
            <button
              onClick={() => handleChangeCardDensity('large')}
              className={`px-2 py-1 rounded-lg transition ${
                cardDensity === 'large'
                  ? 'bg-white text-blue-700 font-black shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              크게
            </button>
            <button
              onClick={() => handleChangeCardDensity('medium')}
              className={`px-2 py-1 rounded-lg transition ${
                cardDensity === 'medium'
                  ? 'bg-white text-blue-700 font-black shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              보통
            </button>
            <button
              onClick={() => handleChangeCardDensity('compact')}
              className={`px-2 py-1 rounded-lg transition ${
                cardDensity === 'compact'
                  ? 'bg-white text-blue-700 font-black shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              작게
            </button>
          </div>
        </div>

        {/* 보드 카드 그리드 & 섹터 분리 (내가 만든 자료 vs 다른 사람 자료) */}
        {(() => {
          // 정렬 헬퍼 (📌 현재 로그인 사용자 기준 상단 고정 및 개별 순서 적용)
          const sortList = (items: Board[]) => {
            return [...items].sort((a, b) => {
              const pa = userPinnedIds.includes(a.id) ? 0 : 1;
              const pb = userPinnedIds.includes(b.id) ? 0 : 1;
              if (pa !== pb) return pa - pb; // 📌 고정된 카드가 최상단 그룹 유지

              const oa = userOrderMap[a.id] !== undefined ? userOrderMap[a.id] : (typeof a.order === 'number' ? a.order : 999999);
              const ob = userOrderMap[b.id] !== undefined ? userOrderMap[b.id] : (typeof b.order === 'number' ? b.order : 999999);
              if (oa !== ob) return oa - ob;
              const ta = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
              const tb = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
              return tb - ta;
            });
          };

          const myBoards = sortList(filteredBoards.filter(isMyBoard));
          const sharedBoards = sortList(filteredBoards.filter((b) => !isMyBoard(b)));

          // 개별 보드 카드 렌더러 (순서 이동 버튼 & 드래그 앤 드롭 내장)
          const renderBoardCard = (board: Board, idx: number, list: Board[]) => {
            const cfg = getDynamicGridConfig(list.length);
            const themeStyles = {
              blue: 'from-blue-50 to-indigo-50/70 border-blue-200/80',
              cork: 'from-amber-50 to-orange-50/70 border-amber-200/80',
              blackboard: 'from-emerald-950 to-emerald-900 text-white border-emerald-800',
              gradient: 'from-purple-50 to-pink-50/80 border-purple-200/80',
              warm: 'from-orange-50 to-yellow-50/80 border-orange-200/80',
            };

            const isBlackboard = board.theme === 'blackboard';
            const isMine = isMyBoard(board);
            const canEditBoard = Boolean(currentUser && (isMine || currentUser.role === 'admin'));
            const isDragging = draggedBoardId === board.id;
            const isDragOver = dragOverBoardId === board.id;
            const isPinned = userPinnedIds.includes(board.id);

            return (
              <div
                key={board.id}
                draggable
                onDragStart={(e) => {
                  setDraggedBoardId(board.id);
                  e.dataTransfer.effectAllowed = 'move';
                  try {
                    e.dataTransfer.setData('text/plain', board.id);
                  } catch (err) {}
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverBoardId !== board.id) {
                    setDragOverBoardId(board.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverBoardId === board.id) setDragOverBoardId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropBoard(board.id, list);
                }}
                onDragEnd={() => {
                  setDraggedBoardId(null);
                  setDragOverBoardId(null);
                }}
                onClick={() => router.push(`/board/${board.id}`)}
                className={`group relative rounded-2xl ${cfg.padding} border transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer bg-gradient-to-br flex flex-col justify-between select-none ${
                  themeStyles[board.theme] || 'from-white to-slate-50 border-slate-200'
                } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'} ${
                  isDragOver
                    ? userPinnedIds.includes(draggedBoardId || '') && isPinned
                      ? 'ring-2 ring-amber-500 ring-offset-2 scale-[1.02] shadow-lg bg-amber-50/40'
                      : 'ring-2 ring-blue-500 ring-offset-2 scale-[1.02] shadow-lg'
                    : ''
                } ${isPinned ? 'ring-2 ring-amber-400/90 shadow-md border-amber-300' : ''}`}
              >
                <div>
                  {/* 상단 태그 & 순서 변경 컨트롤 바 */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                      {/* 📌 상단 고정 / 고정 풀림 토글 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePinBoard(e, board)}
                        className={`p-1 rounded-lg transition shrink-0 ${
                          isPinned
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 shadow-2xs font-bold'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-black/5 opacity-60 hover:opacity-100'
                        }`}
                        title={isPinned ? '상단 고정 해제하기' : '이 보드를 맨 위쪽으로 항상 고정하기'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500 text-amber-600 rotate-45' : ''}`} />
                      </button>

                      {/* 드래그 핸들 */}
                      <span
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5 rounded transition shrink-0"
                        title="카드를 마우스로 끌어서 순서를 변경하세요 (고정된 카드끼리 드래그 순서 변경 가능)"
                      >
                        <GripVertical className="w-3 h-3" />
                      </span>

                      {/* 고정 배지 */}
                      {isPinned && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 shrink-0 flex items-center gap-0.5 shadow-2xs">
                          <span>📌 고정</span>
                        </span>
                      )}

                      {board.category && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full truncate ${
                            isBlackboard ? 'bg-emerald-800 text-emerald-200' : 'bg-white text-blue-700 shadow-2xs'
                          }`}
                        >
                          {board.category}
                        </span>
                      )}

                      {/* 복제본 배지 */}
                      {board.copiedFromTitle && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 shrink-0">
                          내 복사본
                        </span>
                      )}

                      {/* 공개 / 비공개 상태 배지 */}
                      {canEditBoard && (
                        <button
                          type="button"
                          onClick={(e) => handleTogglePublic(e, board)}
                          className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition shadow-2xs shrink-0 ${
                            board.isPublic !== false
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                          title="클릭하여 학교 전체 공개 / 비공개 전환"
                        >
                          {board.isPublic !== false ? (
                            <>
                              <Globe className="w-2.5 h-2.5 text-emerald-600" />
                              <span>공개</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                              <span>비공개</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* 순서 이동 화살표 (◀ / ▶) - 고정된 카드끼리 및 일반 카드끼리 각각 순서 이동 */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-black/5 rounded-lg p-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={idx === 0 || (isPinned !== userPinnedIds.includes(list[idx - 1]?.id))}
                        onClick={(e) => handleMoveBoardStep(e, board.id, 'prev', list)}
                        className={`p-0.5 rounded transition ${
                          idx === 0 || (isPinned !== userPinnedIds.includes(list[idx - 1]?.id))
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-white hover:text-blue-600 shadow-2xs'
                        }`}
                        title="앞으로 순서 이동 (◀)"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === list.length - 1 || (isPinned !== userPinnedIds.includes(list[idx + 1]?.id))}
                        onClick={(e) => handleMoveBoardStep(e, board.id, 'next', list)}
                        className={`p-0.5 rounded transition ${
                          idx === list.length - 1 || (isPinned !== userPinnedIds.includes(list[idx + 1]?.id))
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-white hover:text-blue-600 shadow-2xs'
                        }`}
                        title="뒤로 순서 이동 (▶)"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* 메인 화면 보드 카드 대표 썸네일 이미지 */}
                  {(board.coverImageUrl || board.customBgUrl) && (
                    <div className={`relative w-full ${cfg.thumbHeight} rounded-xl overflow-hidden mb-2 border border-black/5 shadow-2xs bg-slate-100`}>
                      <img
                        src={board.coverImageUrl || board.customBgUrl}
                        alt={board.title}
                        draggable={false}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                      />
                    </div>
                  )}

                  <h3
                    className={`${cfg.titleSize} line-clamp-1 leading-snug group-hover:text-blue-600 transition ${
                      isBlackboard ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {board.title}
                  </h3>

                  <p
                    className={`mt-0.5 text-[10px] sm:text-[11px] ${cfg.descLineClamp} leading-relaxed ${
                      isBlackboard ? 'text-emerald-200/80' : 'text-slate-500'
                    }`}
                  >
                    {board.description || '선생님과 학생들이 실시간으로 생각을 나누는 보드입니다.'}
                  </p>
                </div>

                {/* 하단 작성자 및 액션 버튼 바 */}
                <div
                  className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] gap-1 ${
                    isBlackboard ? 'border-emerald-800/60 text-emerald-300/80' : 'border-slate-200/70 text-slate-500'
                  }`}
                >
                  {/* 작성자 이름 */}
                  <div
                    className="flex items-center gap-1 font-medium text-[9px] min-w-0 flex-1"
                    title={board.title === '내 테스트' ? 'minwan1 kim' : board.authorName}
                  >
                    <span className="truncate">
                      {board.title === '내 테스트' ? 'minwan1 kim' : board.authorName}
                    </span>
                  </div>

                  {/* 액션 버튼 그룹 */}
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* 보드 정보 수정 버튼 */}
                    {canEditBoard && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBoard(board);
                        }}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition shadow-2xs whitespace-nowrap shrink-0 ${
                          isBlackboard
                            ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100'
                            : 'bg-white hover:bg-amber-50 text-amber-700 border border-slate-200'
                        }`}
                        title="보드 제목, 커버 사진, 설정 수정"
                      >
                        <Pencil className="w-2.5 h-2.5 text-amber-600" />
                        <span>수정</span>
                      </button>
                    )}

                    {/* 보드 복제 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => handleDuplicateBoard(e, board)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition shadow-2xs whitespace-nowrap shrink-0 ${
                        isBlackboard
                          ? 'bg-emerald-800 hover:bg-emerald-700 text-white'
                          : 'bg-white hover:bg-blue-50 text-blue-700 border border-slate-200'
                      }`}
                      title="이 보드를 내 보드로 복제하여 가져오기"
                    >
                      <Copy className="w-2.5 h-2.5 text-blue-500" />
                      <span>복제</span>
                    </button>

                    {/* 링크 복사 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, board.code)}
                      className="p-1 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shrink-0"
                      title="학생 참여 링크 복사"
                    >
                      {copiedLink === board.code ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-2.5 h-2.5" />
                      )}
                    </button>

                    {/* QR 코드 초대 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrBoard(board);
                      }}
                      className="p-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition shrink-0"
                      title="스마트폰/태블릿 카메라 스캔용 QR코드"
                    >
                      <QrCode className="w-2.5 h-2.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/board/${board.id}`)}
                      className="flex items-center gap-0.5 font-bold hover:translate-x-0.5 transition text-blue-600 ml-0.5 shrink-0 whitespace-nowrap text-[10px]"
                    >
                      <span>입장</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          };

          // 1) 내가 만든 자료 섹터 단독 보기
          if (activeTab === 'my') {
            return (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900">내가 만든 자료</h2>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {myBoards.length}개
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        직접 만들거나 다른 사람의 보드에서 복제해 온 내 수업 자료입니다. (◀ ▶ 또는 드래그로 순서 변경 가능)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 보드 만들기</span>
                  </button>
                </div>

                {myBoards.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-md mx-auto my-6">
                    <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">아직 만든 보드가 없습니다.</p>
                    <p className="text-xs text-slate-400 mt-1">[+ 새 보드 만들기] 또는 다른 사람의 보드를 [복제]해 보세요!</p>
                  </div>
                ) : (
                  <div className={getDynamicGridConfig(myBoards.length).gridClass}>
                    {myBoards.map((b, idx) => renderBoardCard(b, idx, myBoards))}
                  </div>
                )}
              </section>
            );
          }

          // 2) 다른 사람 공유 자료 섹터 단독 보기
          if (activeTab === 'public') {
            return (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900">선생님 & 다른 사람이 공유한 자료</h2>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {sharedBoards.length}개
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        학교 구성원들이 공유한 보드입니다. 카드의 [복제]를 누르면 내 자료로 바로 가져올 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                {sharedBoards.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-md mx-auto my-6">
                    <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">공유된 다른 사람의 보드가 없습니다.</p>
                  </div>
                ) : (
                  <div className={getDynamicGridConfig(sharedBoards.length).gridClass}>
                    {sharedBoards.map((b, idx) => renderBoardCard(b, idx, sharedBoards))}
                  </div>
                )}
              </section>
            );
          }

          // 3) 추천 템플릿 탭
          if (activeTab === 'template') {
            const templateBoards = sortList(filteredBoards);
            return (
              <section className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900">추천 템플릿 모음</h2>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {templateBoards.length}개
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        💡 <strong>선정 기준:</strong> 학교/관리자가 공식 검증하고 모둠·교과 수업에 바로 복제해 활용할 수 있는 표준 원본 템플릿입니다. (개인 복제본은 제외됩니다)
                      </p>
                    </div>
                  </div>
                </div>

                <div className={getDynamicGridConfig(templateBoards.length).gridClass}>
                  {templateBoards.map((b, idx) => renderBoardCard(b, idx, templateBoards))}
                </div>
              </section>
            );
          }

          // 4) 기본: '전체 섹터 보기' (내가 만든 자료 + 다른 사람 자료를 위아래 2개 섹터로 분리)
          return (
            <div className="space-y-10">
              {/* 섹터 1: 내가 만든 자료 (보드) */}
              <section className="space-y-3.5">
                <div className="flex items-center justify-between gap-3 border-b-2 border-blue-500/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          📁 내가 만든 자료 (보드)
                        </h2>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shadow-2xs">
                          {myBoards.length}개
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        직접 개설하거나 다른 보드에서 복제해 온 내 자료입니다. <strong>◀ ▶ 버튼이나 드래그</strong>로 원하는 순서대로 자유롭게 배치하세요.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 보드 만들기</span>
                  </button>
                </div>

                {myBoards.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 text-center border-2 border-dashed border-slate-200 shadow-2xs my-3">
                    <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-bold text-slate-700">아직 내가 만든 보드가 없습니다.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      우측 상단의 [+ 새 보드 만들기]를 누르거나, 아래 공유 자료에서 [복제]를 눌러 가져와 보세요!
                    </p>
                  </div>
                ) : (
                  <div className={getDynamicGridConfig(myBoards.length).gridClass}>
                    {myBoards.map((b, idx) => renderBoardCard(b, idx, myBoards))}
                  </div>
                )}
              </section>

              {/* 섹터 2: 선생님 & 다른 사람이 공유한 자료 */}
              <section className="space-y-3.5 pt-4">
                <div className="flex items-center justify-between gap-3 border-b-2 border-emerald-500/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black shadow-xs">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          🌐 선생님 & 다른 사람이 공유한 자료
                        </h2>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shadow-2xs">
                          {sharedBoards.length}개
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        다른 선생님과 학생들이 공유한 보드입니다. 카드의 <strong>[복제]</strong> 버튼을 누르면 즉시 내 자료로 복사되어 자유롭게 수정할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                {sharedBoards.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 text-center border-2 border-dashed border-slate-200 shadow-2xs my-3">
                    <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-bold text-slate-700">공유된 다른 자료가 없습니다.</p>
                  </div>
                ) : (
                  <div className={getDynamicGridConfig(sharedBoards.length).gridClass}>
                    {sharedBoards.map((b, idx) => renderBoardCard(b, idx, sharedBoards))}
                  </div>
                )}
              </section>
            </div>
          );
        })()}
      </main>

      {/* 🌟 페이지 최하단 푸터 */}
      <Footer />

      {/* 새 보드 만들기 모달 (선생님/관리자 전용) */}
      {currentUser && isTeacherOrAdmin && (
        <CreateBoardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          currentUser={currentUser}
          onCreated={(newBoard) => {
            loadData();
            router.push(`/board/${newBoard.id}`);
          }}
        />
      )}

      {/* 🌟 메인 화면 보드 정보 및 사진 수정 모달 */}
      {editingBoard && (
        <EditBoardModal
          board={editingBoard}
          isOpen={!!editingBoard}
          onClose={() => setEditingBoard(null)}
          onUpdated={(updated) => {
            loadData();
            setEditingBoard(null);
          }}
          onDeleted={(deletedId) => {
            setBoards((prev) => prev.filter((b) => b.id !== deletedId));
            setEditingBoard(null);
            loadData();
          }}
        />
      )}

      {/* 🔥 대형 QR코드 초대 모달 (다운로드 & 빔프로젝터 모드 지원) */}
      {qrBoard && (
        <QrModal
          isOpen={Boolean(qrBoard)}
          onClose={() => setQrBoard(null)}
          board={qrBoard}
        />
      )}

      {/* 📢 관리자(교직원 대상) 및 선생님(학생 대상) 공지사항 작성/수정/열람 모달 */}
      <NoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        adminNotice={adminNotice}
        teacherNotice={teacherNotice}
        onSaveAdminNotice={handleSaveAdminNotice}
        onSaveTeacherNotice={handleSaveTeacherNotice}
        isAdmin={currentUser?.role === 'admin'}
        isTeacherOrAdmin={isTeacherOrAdmin}
        initialTab={noticeModalTab}
      />

      {/* 🖼️ 메인 배너 이미지 및 슬라이드쇼 관리 모달 */}
      <BannerSettingsModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        settings={bannerSettings}
        onSave={handleSaveBannerSettings}
      />
    </div>
  );
}
