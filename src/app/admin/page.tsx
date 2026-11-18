'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  School,
  Settings,
  Trash2,
  Clock,
  UserCheck,
  LayoutGrid,
  ArrowLeft,
  Search,
  KeyRound,
  ShieldCheck,
  Lock,
  Pencil,
  Globe,
  Megaphone,
  Image as ImageIcon,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NoticeModal from '@/components/NoticeModal';
import BannerSettingsModal from '@/components/BannerSettingsModal';
import { getStoreData, saveStoreData } from '@/lib/store';
import { User, SystemSettings, Board, Notice, BannerSettings } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  fetchRemoteUsers,
  saveRemoteUser,
  deleteRemoteUser,
  fetchRemoteSettings,
  saveRemoteSettings,
  fetchRemoteBoards,
  saveRemoteBoard,
  deleteRemoteBoard,
  deleteRemotePost,
  fetchRemoteNotice,
  saveRemoteNotice,
  fetchRemoteBannerSettings,
  saveRemoteBannerSettings,
  DEFAULT_BANNER_SETTINGS,
} from '@/lib/supabaseStore';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(getStoreData().settings);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>(DEFAULT_BANNER_SETTINGS);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [activeTab, setActiveTabState] = useState<'pending' | 'users' | 'boards' | 'adminPw'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('schoolpad_admin_active_tab');
        if (saved && ['pending', 'users', 'boards', 'adminPw'].includes(saved)) {
          return saved as any;
        }
      } catch (e) {}
    }
    return 'pending';
  });

  const setActiveTab = (tab: 'pending' | 'users' | 'boards' | 'adminPw') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('schoolpad_admin_active_tab', tab);
    } catch (e) {}
  };
  const [searchUser, setSearchUser] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // 관리자 본인 비번 변경 폼
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  // 특정 유저 비밀번호 재설정 모달 상태
  const [targetUserForPw, setTargetUserForPw] = useState<User | null>(null);
  const [resetPwInput, setResetPwInput] = useState('');

  // 🌟 관리자 회원 이름 수정 상태
  const [editingUserForName, setEditingUserForName] = useState<User | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const loadData = async () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    setUsers(data.users);
    setBoards(data.boards);
    setSettings(data.settings);

    // 로컬 배너 설정 로드
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

    // 🌟 원격 Supabase 클라우드에서 최신 사용자, 보드 및 시스템 설정 불러오기
    if (isSupabaseConfigured) {
      try {
        const [remoteUsers, remoteSettings, remoteBoards, remoteNotice, remoteBanner] = await Promise.all([
          fetchRemoteUsers(),
          fetchRemoteSettings(),
          fetchRemoteBoards(),
          fetchRemoteNotice(),
          fetchRemoteBannerSettings(),
        ]);

        if (remoteBanner && Array.isArray(remoteBanner.slides) && remoteBanner.slides.length > 0) {
          let localTime = 0;
          try {
            const cached = localStorage.getItem('schoolpad_banner_settings');
            if (cached) localTime = JSON.parse(cached).updatedAt || 0;
          } catch (e) {}
          if ((remoteBanner.updatedAt || 0) >= localTime) {
            setBannerSettings(remoteBanner);
            try {
              localStorage.setItem('schoolpad_banner_settings', JSON.stringify(remoteBanner));
            } catch (e) {}
          }
        }

        if (remoteNotice !== null) {
          let localTime = 0;
          try {
            const cached = localStorage.getItem('schoolpad_global_notice');
            if (cached) localTime = JSON.parse(cached).updatedAt || 0;
            const delTime = Number(localStorage.getItem('schoolpad_global_notice_deleted') || '0');
            localTime = Math.max(localTime, delTime);
          } catch (e) {}
          if ((remoteNotice.updatedAt || 0) >= localTime) {
            setNotice(remoteNotice);
            try {
              localStorage.setItem('schoolpad_global_notice', JSON.stringify(remoteNotice));
            } catch (e) {}
          }
        }

        if (remoteUsers && remoteUsers.length > 0) {
          const userMap = new Map<string, User>();
          data.users.forEach((u) => userMap.set(u.id, u));
          remoteUsers.forEach((u) => userMap.set(u.id, u));
          const merged = Array.from(userMap.values());
          setUsers(merged);
          // 로컬에도 동기화 저장
          saveStoreData.users(merged);
        }

        if (remoteSettings) {
          setSettings(remoteSettings);
          saveStoreData.settings(remoteSettings);
        }

        // 🗑️ 삭제된 보드 ID 목록 로드
        const deletedIds = new Set<string>();
        try {
          const rawDel = localStorage.getItem('schoolpad_deleted_boards');
          if (rawDel) {
            const parsed = JSON.parse(rawDel);
            if (Array.isArray(parsed)) parsed.forEach((id: string) => deletedIds.add(id));
          }
        } catch (e) {}

        if (remoteBoards && remoteBoards.length > 0) {
          const validRemote = remoteBoards.filter((b) => {
            if (deletedIds.has(b.id) || (b.code && deletedIds.has(b.code))) {
              deleteRemoteBoard(b.id).catch(() => {});
              return false;
            }
            return true;
          });

          const localBoards = data.boards.filter((b) => !deletedIds.has(b.id) && !deletedIds.has(b.code));
          const localMap = new Map(localBoards.map((b) => [b.id, b]));
          const remoteMap = new Map(validRemote.map((b) => [b.id, b]));
          const allIds = Array.from(new Set([...localBoards.map((b) => b.id), ...validRemote.map((b) => b.id)]));

          const mergedBoards: Board[] = [];
          for (const id of allIds) {
            if (deletedIds.has(id)) continue;
            const local = localMap.get(id);
            const rem = remoteMap.get(id);
            if (rem) {
              mergedBoards.push({
                ...rem,
                order: local?.order ?? rem.order,
                pinned: false,
              });
            } else if (local) {
              mergedBoards.push(local);
            }
          }

          setBoards(mergedBoards);
          localStorage.setItem('school_padlet_boards', JSON.stringify(mergedBoards));

          // 로컬에만 있는 보드가 있다면 원격 DB로 안전 동기화 (삭제된 보드는 제외)
          for (const b of localBoards) {
            if (!remoteMap.has(b.id) && !deletedIds.has(b.id) && !deletedIds.has(b.code)) {
              await saveRemoteBoard(b).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('Admin cloud load error:', err);
      }
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('store_updated', handleUpdate);

    // ⚡ 다른 PC나 스마트폰에서 가입한 사용자 및 보드 공개/비공개 변경을 즉각 감지하기 위한 Supabase 실시간 리스너 및 폴링
    let channel: any = null;
    let boardChannel: any = null;
    let pollTimer: any = null;

    if (isSupabaseConfigured && supabase) {
      // 1. 사용자 실시간 리스너
      channel = supabase
        .channel('admin-users-cloud-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: 'board_id=eq.__SYSTEM_USERS__',
          },
          () => {
            fetchRemoteUsers().then((ru) => {
              if (ru && ru.length > 0) {
                const data = getStoreData();
                const userMap = new Map<string, User>();
                data.users.forEach((u) => {
                  const key = (u.email || u.username || u.id).trim().toLowerCase();
                  userMap.set(key, u);
                });
                ru.forEach((u) => {
                  const key = (u.email || u.username || u.id).trim().toLowerCase();
                  userMap.set(key, u);
                });
                const merged = Array.from(userMap.values());
                setUsers(merged);
                saveStoreData.users(merged);
              }
            });
          }
        )
        .subscribe();

      // 2. 보드(공개/비공개 및 신규 개설) 실시간 리스너
      boardChannel = supabase
        .channel('admin-boards-cloud-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'boards',
          },
          () => {
            fetchRemoteBoards().then((rb) => {
              if (rb && rb.length > 0) {
                const deletedIds = new Set<string>();
                try {
                  const rawDel = localStorage.getItem('schoolpad_deleted_boards');
                  if (rawDel) {
                    const parsed = JSON.parse(rawDel);
                    if (Array.isArray(parsed)) parsed.forEach((id: string) => deletedIds.add(id));
                  }
                } catch (e) {}
                const validRb = rb.filter((b) => !deletedIds.has(b.id) && !(b.code && deletedIds.has(b.code)));

                const data = getStoreData();
                const boardMap = new Map<string, Board>();
                data.boards.filter((b) => !deletedIds.has(b.id) && !(b.code && deletedIds.has(b.code))).forEach((b) => boardMap.set(b.id, b));
                validRb.forEach((b) => {
                  const local = boardMap.get(b.id);
                  boardMap.set(
                    b.id,
                    local
                      ? {
                          ...local,
                          ...b,
                          isPublic: b.isPublic !== undefined ? b.isPublic : local.isPublic,
                          order: local.order ?? b.order,
                          pinned: local.pinned ?? b.pinned,
                        }
                      : b
                  );
                });
                const merged = Array.from(boardMap.values());
                setBoards(merged);
                saveStoreData.boards(merged);
              }
            });
          }
        )
        .subscribe();

      // 3. 주기적 동기화 폴링 (사용자, 보드 및 공지사항 최신화 100% 보장)
      pollTimer = setInterval(() => {
        fetchRemoteUsers().then((ru) => {
          if (ru && ru.length > 0) {
            setUsers((prev) => {
              if (ru.length !== prev.length || ru.some((r) => !prev.some((p) => p.id === r.id && p.status === r.status && p.role === r.role))) {
                const userMap = new Map<string, User>();
                prev.forEach((u) => {
                  const key = (u.email || u.username || u.id).trim().toLowerCase();
                  userMap.set(key, u);
                });
                ru.forEach((u) => {
                  const key = (u.email || u.username || u.id).trim().toLowerCase();
                  userMap.set(key, u);
                });
                const merged = Array.from(userMap.values());
                saveStoreData.users(merged);
                return merged;
              }
              return prev;
            });
          }
        });

        fetchRemoteNotice().then((rn) => {
          if (rn !== null) {
            let localTime = 0;
            try {
              const cached = localStorage.getItem('schoolpad_global_notice');
              if (cached) localTime = JSON.parse(cached).updatedAt || 0;
              const delTime = Number(localStorage.getItem('schoolpad_global_notice_deleted') || '0');
              localTime = Math.max(localTime, delTime);
            } catch (e) {}
            if ((rn.updatedAt || 0) >= localTime) {
              setNotice((prev) => {
                if (
                  prev &&
                  prev.id === rn.id &&
                  prev.isActive === rn.isActive &&
                  prev.title === rn.title &&
                  prev.content === rn.content &&
                  prev.category === rn.category &&
                  prev.expiresAt === rn.expiresAt &&
                  prev.updatedAt === rn.updatedAt
                ) return prev;
                return rn;
              });
              try {
                localStorage.setItem('schoolpad_global_notice', JSON.stringify(rn));
              } catch (e) {}
            }
          }
        });

        fetchRemoteBoards().then((rb) => {
          if (rb && rb.length > 0) {
            const deletedIds = new Set<string>();
            try {
              const rawDel = localStorage.getItem('schoolpad_deleted_boards');
              if (rawDel) {
                const parsed = JSON.parse(rawDel);
                if (Array.isArray(parsed)) parsed.forEach((id: string) => deletedIds.add(id));
              }
            } catch (e) {}
            const validRb = rb.filter((b) => !deletedIds.has(b.id) && !(b.code && deletedIds.has(b.code)));

            setBoards((prev) => {
              const prevMap = new Map(prev.filter((b) => !deletedIds.has(b.id) && !(b.code && deletedIds.has(b.code))).map((b) => [b.id, b]));
              let changed = validRb.length !== prevMap.size;
              for (const r of validRb) {
                const existing = prevMap.get(r.id);
                if (!existing || existing.isPublic !== r.isPublic || existing.title !== r.title) {
                  changed = true;
                  break;
                }
              }
              if (changed) {
                const mergedMap = new Map(prevMap);
                validRb.forEach((b) => {
                  const local = mergedMap.get(b.id);
                  mergedMap.set(
                    b.id,
                    local
                      ? {
                          ...local,
                          ...b,
                          isPublic: b.isPublic !== undefined ? b.isPublic : local.isPublic,
                          order: local.order ?? b.order,
                          pinned: local.pinned ?? b.pinned,
                        }
                      : b
                  );
                });
                const merged = Array.from(mergedMap.values());
                saveStoreData.boards(merged);
                return merged;
              }
              return prev;
            });
          }
        });
      }, 4000);
    }

    return () => {
      window.removeEventListener('store_updated', handleUpdate);
      if (channel && supabase) supabase.removeChannel(channel);
      if (boardChannel && supabase) supabase.removeChannel(boardChannel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  // 가입 승인 처리
  const handleApproveUser = (userId: string) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, status: 'approved' as const } : u));
    saveStoreData.users(updated);
    setUsers(updated);
    showToast('회원 가입이 승인되었습니다.');
  };

  // 가입 거절/반려 처리
  const handleRejectUser = (userId: string) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, status: 'rejected' as const } : u));
    saveStoreData.users(updated);
    setUsers(updated);
    showToast('회원 가입 요청을 반려했습니다.');
  };

  // 가입 상태 자유 변경 (승인완료 / 대기 / 반려)
  const handleStatusChange = (userId: string, newStatus: 'approved' | 'pending' | 'rejected') => {
    const updated = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
    saveStoreData.users(updated);
    setUsers(updated);
    const label = newStatus === 'approved' ? '승인완료' : newStatus === 'pending' ? '승인대기' : '반려';
    showToast(`회원 상태를 '${label}'(으)로 변경했습니다.`);
  };

  // 모든 대기자 일괄 승인
  const handleApproveAll = () => {
    const updated = users.map((u) => (u.status === 'pending' ? { ...u, status: 'approved' as const } : u));
    saveStoreData.users(updated);
    setUsers(updated);
    showToast('대기 중인 모든 회원을 일괄 승인했습니다.');
  };

  // 권한 레벨 변경
  const handleRoleChange = (userId: string, newRole: 'student' | 'teacher' | 'admin') => {
    const updated = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    saveStoreData.users(updated);
    setUsers(updated);

    // 만약 현재 브라우저에 로그인된 사용자의 권한이 변경된 경우 currentUser도 즉각 갱신
    const currentData = getStoreData();
    if (
      currentData.currentUser &&
      (currentData.currentUser.id === userId ||
        currentData.currentUser.username === updated.find((u) => u.id === userId)?.username ||
        currentData.currentUser.name === updated.find((u) => u.id === userId)?.name)
    ) {
      saveStoreData.currentUser({ ...currentData.currentUser, role: newRole });
    }
    const changedUser = updated.find((u) => u.id === userId);
    if (changedUser) {
      saveRemoteUser(changedUser).catch(() => {});
    }

    showToast(`권한이 '${newRole === 'admin' ? '관리자' : newRole === 'teacher' ? '교사' : '학생'}'(으)로 변경되었습니다.`);
  };

  // 🌟 관리자 회원 영구 삭제 처리 (계정 + 작성 보드 + 카드 일괄 영구 삭제)
  const handleDeleteUser = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (target.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
      alert('마지막 남은 최고 관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    if (
      confirm(
        `⚠️ [경고: 회원 영구 삭제 및 관련 데이터 완전 삭제]\n\n정말 '${target.name}' (${target.email || target.username}) 회원을 영구 삭제하시겠습니까?\n\n※ 삭제 시 해당 회원이 작성한 모든 보드, 쪽지/카드 등의 모든 활동 데이터가 DB에서 영구 삭제되며 절대 복구할 수 없습니다.`
      )
    ) {
      const data = getStoreData();

      // 1. 해당 사용자의 보드들 삭제
      const userBoards = data.boards.filter((b) => b.authorId === userId || b.authorName === target.name);
      const remainingBoards = data.boards.filter((b) => b.authorId !== userId && b.authorName !== target.name);
      saveStoreData.boards(remainingBoards);
      setBoards(remainingBoards);

      // 2. 해당 사용자의 카드들 삭제
      const userPosts = data.posts.filter((p) => p.authorId === userId || p.authorName === target.name);
      const remainingPosts = data.posts.filter((p) => p.authorId !== userId && p.authorName !== target.name);
      saveStoreData.posts(remainingPosts);

      // 3. 사용자 목록에서 삭제
      const updated = users.filter((u) => u.id !== userId);
      setUsers(updated);
      saveStoreData.users(updated);

      // 4. 원격 Supabase DB에서도 계정, 보드들, 카드들 일괄 삭제
      if (isSupabaseConfigured) {
        await deleteRemoteUser(userId, target.email).catch(() => {});
        for (const b of userBoards) {
          await deleteRemoteBoard(b.id).catch(() => {});
        }
        for (const p of userPosts) {
          await deleteRemotePost(p.id).catch(() => {});
        }
      }

      showToast(`'${target.name}' 회원 및 모든 관련 데이터가 완전 삭제되었습니다.`);
    }
  };

  // 회원 비밀번호 재설정 처리
  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPw || !resetPwInput.trim()) return;

    const updated = users.map((u) =>
      u.id === targetUserForPw.id ? { ...u, password: resetPwInput.trim() } : u
    );
    saveStoreData.users(updated);
    setUsers(updated);

    // 🌟 원격 클라우드 DB에도 변경된 비밀번호 즉시 영구 저장!
    const changedUser = updated.find((u) => u.id === targetUserForPw.id);
    if (changedUser) {
      saveRemoteUser(changedUser).catch(() => {});
    }

    showToast(`${targetUserForPw.name}님의 비밀번호가 변경되었습니다.`);
    setTargetUserForPw(null);
    setResetPwInput('');
  };

  // 🌟 관리자 회원 이름 수정 처리
  const handleSaveUserName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserForName || !newNameInput.trim()) return;

    const trimmedName = newNameInput.trim();
    const oldName = editingUserForName.name;

    const updated = users.map((u) =>
      u.id === editingUserForName.id ? { ...u, name: trimmedName } : u
    );
    saveStoreData.users(updated);
    setUsers(updated);

    // 본인 계정이면 currentUser도 즉시 동기화
    if (currentUser?.id === editingUserForName.id) {
      saveStoreData.currentUser({ ...currentUser, name: trimmedName });
    }

    const changedUser = updated.find((u) => u.id === editingUserForName.id);
    if (changedUser) {
      saveRemoteUser(changedUser).catch(() => {});
    }

    // 해당 사용자가 작성한 보드 및 포스트의 작성자명도 일괄 동기화
    const data = getStoreData();
    const updatedBoards = data.boards.map((b) =>
      b.authorId === editingUserForName.id ? { ...b, authorName: trimmedName } : b
    );
    saveStoreData.boards(updatedBoards);
    setBoards(updatedBoards);

    const updatedPosts = data.posts.map((p) =>
      p.authorId === editingUserForName.id ? { ...p, authorName: trimmedName } : p
    );
    saveStoreData.posts(updatedPosts);

    showToast(`'${oldName}'님의 이름이 '${trimmedName}'(으)로 변경되었습니다.`);
    setEditingUserForName(null);
    setNewNameInput('');
  };

  // 관리자 본인 비밀번호 변경 처리
  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword.trim()) {
      alert('새 비밀번호를 입력해 주세요.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      alert('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const updated = users.map((u) =>
      u.role === 'admin' ? { ...u, password: newAdminPassword.trim() } : u
    );
    saveStoreData.users(updated);
    setUsers(updated);

    if (currentUser?.role === 'admin') {
      saveStoreData.currentUser({ ...currentUser, password: newAdminPassword.trim() });
    }

    setNewAdminPassword('');
    setConfirmAdminPassword('');
    showToast('🎉 관리자 비밀번호가 성공적으로 변경되었습니다!');
  };

  // 시스템 설정 토글
  const handleToggleAutoApprove = () => {
    const updated: SystemSettings = { ...settings, autoApproveUsers: !settings.autoApproveUsers };
    saveStoreData.settings(updated);
    setSettings(updated);
    showToast(
      updated.autoApproveUsers
        ? '자동 가입 모드가 활성화되었습니다. (신규 가입 즉시 승인)'
        : '가입 승인제가 활성화되었습니다. (관리자 승인 필요)'
    );
  };

  // 보드 삭제
  const handleDeleteBoard = async (boardId: string) => {
    if (confirm('정말 이 보드를 삭제하시겠습니까? 관련된 모든 글이 함께 삭제됩니다.')) {
      // 1. 삭제된 보드 ID 영구 기록
      try {
        const raw = localStorage.getItem('schoolpad_deleted_boards');
        const deletedIds = raw ? JSON.parse(raw) : [];
        if (!deletedIds.includes(boardId)) {
          deletedIds.push(boardId);
          localStorage.setItem('schoolpad_deleted_boards', JSON.stringify(deletedIds));
        }
      } catch (e) {}

      // 2. 화면 및 로컬 스토어 즉시 반영
      const updated = boards.filter((b) => b.id !== boardId);
      setBoards(updated);
      saveStoreData.boards(updated);
      localStorage.setItem('school_padlet_boards', JSON.stringify(updated));

      // 3. Supabase 원격 DB에서도 관련 카드와 함께 완전 삭제
      if (isSupabaseConfigured) {
        await deleteRemoteBoard(boardId).catch(() => {});
      }
      showToast('보드가 삭제되었습니다.');
    }
  };

  // 🌟 관리자 개설 보드 공개 / 비공개 즉시 전환
  const handleToggleBoardPublic = async (board: Board) => {
    const newStatus = !(board.isPublic !== false);
    const updatedBoard: Board = { ...board, isPublic: newStatus, updatedAt: Date.now() };
    const updatedBoards = boards.map((b) => (b.id === board.id ? updatedBoard : b));
    setBoards(updatedBoards);
    const data = getStoreData();
    const storeBoards = data.boards.map((b) => (b.id === board.id ? updatedBoard : b));
    if (!storeBoards.some((b) => b.id === board.id)) storeBoards.push(updatedBoard);
    localStorage.setItem('school_padlet_boards', JSON.stringify(storeBoards));

    if (isSupabaseConfigured) {
      await saveRemoteBoard(updatedBoard).catch(() => {});
    }
    showToast(`'${board.title}' 보드가 '${newStatus ? '공개' : '비공개'}'(으)로 변경되었습니다.`);
  };

  // 📢 관리자 전체 공지사항 저장 및 동기화
  const handleSaveNotice = async (newNotice: Notice | null) => {
    const nowTime = Date.now();
    const stampedNotice = newNotice ? { ...newNotice, updatedAt: nowTime } : null;
    setNotice(stampedNotice);
    try {
      if (stampedNotice) {
        localStorage.setItem('schoolpad_global_notice', JSON.stringify(stampedNotice));
        localStorage.removeItem('schoolpad_global_notice_deleted');
      } else {
        localStorage.removeItem('schoolpad_global_notice');
        localStorage.setItem('schoolpad_global_notice_deleted', String(nowTime));
      }
    } catch (e) {}

    if (isSupabaseConfigured) {
      await saveRemoteNotice(stampedNotice).catch((err) => {
        console.error('Remote notice save error:', err);
      });
    }
    showToast('전체 공지사항 설정이 성공적으로 저장되었습니다.');
  };

  // 🖼️ 메인 배너 이미지 설정 저장
  const handleSaveBannerSettings = async (newSettings: BannerSettings) => {
    const nowTime = Date.now();
    const stamped = { ...newSettings, updatedAt: nowTime };
    setBannerSettings(stamped);
    try {
      localStorage.setItem('schoolpad_banner_settings', JSON.stringify(stamped));
    } catch (e) {}

    if (isSupabaseConfigured) {
      await saveRemoteBannerSettings(stamped).catch((err) => {
        console.error('Remote banner save error:', err);
      });
    }
    showToast('메인 배너 이미지 및 슬라이드 설정이 저장되었습니다.');
  };

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const rejectedUsers = users.filter((u) => u.status === 'rejected');
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchUser.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 관리자 헤더 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-semibold mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>메인 보드로 돌아가기</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">학교 관리자 센터</h1>
                <p className="text-xs text-slate-500 font-medium">
                  교사/학생 명단 확인, 권한 레벨 및 비밀번호 변경, 가입 승인 정책을 총괄 관리합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 메인 배너 이미지 관리 버튼 */}
            <button
              onClick={() => setShowBannerModal(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-indigo-200" />
              <span>메인 배너 이미지 관리</span>
            </button>

            {/* 전체 공지사항 관리 버튼 */}
            <button
              onClick={() => setShowNoticeModal(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-amber-900" />
              <span>{notice ? '전체 공지사항 관리' : '전체 공지사항 작성'}</span>
              {notice && notice.isActive && (!notice.expiresAt || new Date(notice.expiresAt).getTime() > Date.now()) && (
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse ml-0.5" />
              )}
            </button>

            {/* 자동 가입 토글 스위치 */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>가입 승인 정책:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      settings.autoApproveUsers
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {settings.autoApproveUsers ? '자동 가입 허용(기본)' : '수동 승인제'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {settings.autoApproveUsers
                    ? 'G메일/계정 가입 즉시 수업 참여'
                    : '관리자 승인 후 입장 가능'}
                </div>
              </div>

              <button
                onClick={handleToggleAutoApprove}
                className={`p-1 rounded-xl transition ${
                  settings.autoApproveUsers ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                }`}
                title="가입 방식 전환"
              >
                {settings.autoApproveUsers ? (
                  <ToggleRight className="w-8 h-8 fill-current" />
                ) : (
                  <ToggleLeft className="w-8 h-8 fill-current" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>가입 승인 대기</span>
            {pendingUsers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>학생 / 교사 명단 및 권한·비번 관리 ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('boards')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition ${
              activeTab === 'boards'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>개설 보드 관리 ({boards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('adminPw')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition ${
              activeTab === 'adminPw'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>관리자 비밀번호 변경</span>
          </button>
        </div>

        {/* [탭 1] 가입 승인 대기 목록 */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">가입 승인 대기 명단</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  수동 승인제 상태에서 가입 요청한 학생 및 교사의 목록입니다.
                </p>
              </div>

              {pendingUsers.length > 0 && (
                <button
                  onClick={handleApproveAll}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>전체 일괄 승인</span>
                </button>
              )}
            </div>

            {pendingUsers.length === 0 ? (
              <div className="py-12 text-center">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">현재 대기 중인 가입 요청이 없습니다.</h3>
                <p className="text-xs text-slate-400 mt-1">
                  자동 가입 모드가 켜져 있거나, 모든 가입 요청이 처리되었습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{user.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                            {user.role === 'teacher' ? '교사' : '학생'}
                          </span>
                          {user.grade && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({user.grade}학년 {user.classNum}반)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleRejectUser(user.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>반려</span>
                      </button>
                      <button
                        onClick={() => handleApproveUser(user.id)}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>승인하기</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 🌟 반려된 가입 신청 명단 (언제든지 다시 승인 가능) */}
            {rejectedUsers.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <span>반려된 가입 신청 명단 ({rejectedUsers.length}명)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      이전에 반려 처리되었으나, 언제든지 [다시 승인하기] 버튼을 눌러 바로 정상 회원으로 승인할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {rejectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-red-50/50 border border-red-200/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 font-bold flex items-center justify-center text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800">{user.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                              반려됨
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ID: {user.username || '없음'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleApproveUser(user.id)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>다시 승인하기</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* [탭 2] 학생/교사 명단, 권한 레벨, 비밀번호 재설정 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">학생 / 교사 명단 관리</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  권한 레벨(학생↔교사↔관리자) 조정 및 학생 비밀번호를 즉시 재설정할 수 있습니다.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="이름/아이디/이메일 검색..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-3 px-3">이름 (아이디)</th>
                    <th className="pb-3 px-3">이메일</th>
                    <th className="pb-3 px-3">현재 권한 레벨</th>
                    <th className="pb-3 px-3">가입 상태</th>
                    <th className="pb-3 px-3 text-center">비밀번호 관리</th>
                    <th className="pb-3 px-3 text-right">권한 레벨 변경</th>
                    <th className="pb-3 px-3 text-center">계정 삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="hover:text-blue-600 transition">{user.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserForName(user);
                              setNewNameInput(user.name);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                            title="이름 수정하기"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {user.grade && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({user.grade}-{user.classNum})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {user.username || 'google-user'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">{user.email}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : user.role === 'teacher'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {user.role === 'admin' ? '관리자' : user.role === 'teacher' ? '교사' : '학생'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <select
                            value={user.status}
                            onChange={(e) =>
                              handleStatusChange(
                                user.id,
                                e.target.value as 'approved' | 'pending' | 'rejected'
                              )
                            }
                            className={`rounded-lg text-[11px] font-bold py-1 px-2 border cursor-pointer transition ${
                              user.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : user.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            <option value="approved">✓ 승인완료</option>
                            <option value="pending">⏳ 승인대기</option>
                            <option value="rejected">✕ 반려</option>
                          </select>
                          {user.status === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleApproveUser(user.id)}
                              className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition shadow-xs whitespace-nowrap"
                              title="즉시 다시 승인하기"
                            >
                              다시 승인
                            </button>
                          )}
                          {user.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleApproveUser(user.id)}
                              className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition shadow-xs whitespace-nowrap"
                              title="즉시 승인하기"
                            >
                              승인
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setTargetUserForPw(user);
                            setResetPwInput('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                        >
                          <KeyRound className="w-3 h-3 text-slate-500" />
                          <span>비번 재설정</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as 'student' | 'teacher' | 'admin')
                          }
                          className="bg-slate-100 hover:bg-slate-200 border-none rounded-lg text-xs py-1.5 px-2.5 font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="student">학생 레벨</option>
                          <option value="teacher">교사 레벨</option>
                          <option value="admin">관리자 레벨</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="회원 및 데이터 영구 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* [탭 3] 개설 보드 관리 */}
        {activeTab === 'boards' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="pb-4 border-b border-slate-100 mb-6">
              <h2 className="text-base font-bold text-slate-800">학교 전체 개설 보드 모니터링</h2>
              <p className="text-xs text-slate-400 mt-0.5">부적절한 보드를 삭제하거나 수업 보드 현황을 확인합니다.</p>
            </div>

            <div className="space-y-3">
              {boards.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800">{b.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                        PIN: {b.code}
                      </span>
                      {/* 🌟 공개 / 비공개 뱃지 */}
                      {b.isPublic !== false ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 border border-emerald-200">
                          <Globe className="w-3 h-3 text-emerald-600" />
                          <span>공개 보드</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center gap-1 border border-slate-300">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>비공개</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      개설자: {b.authorName} · 개설일: {b.createdAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 공개 / 비공개 즉시 전환 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleToggleBoardPublic(b)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                        b.isPublic !== false
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                      }`}
                      title="클릭하여 공개/비공개 상태 전환"
                    >
                      {b.isPublic !== false ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>공개 중</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-600" />
                          <span>비공개</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/board/${b.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 text-xs font-bold transition"
                    >
                      보드 보기
                    </Link>
                    <button
                      onClick={() => handleDeleteBoard(b.id)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition"
                      title="보드 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* [탭 4] 관리자 비밀번호 변경 */}
        {activeTab === 'adminPw' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-lg">
            <div className="pb-4 border-b border-slate-100 mb-6">
              <h2 className="text-base font-bold text-slate-800">관리자 비밀번호 변경</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                현재 기본 비번(<code className="font-bold text-slate-600">admin</code>)을 새로운 비밀번호로 변경합니다.
              </p>
            </div>

            <form onSubmit={handleChangeAdminPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">새 비밀번호</label>
                <input
                  type="password"
                  required
                  placeholder="새로운 비밀번호 입력"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  required
                  placeholder="비밀번호 다시 입력"
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                비밀번호 저장하기
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 🌟 관리자 페이지 최하단 푸터 */}
      <Footer />

      {/* 🌟 관리자: 회원 이름 수정 모달 */}
      {editingUserForName && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-bold text-slate-800">
              회원 이름 수정
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              [{editingUserForName.username || editingUserForName.email}] 사용자의 표시 이름을 변경합니다.
            </p>

            <form onSubmit={handleSaveUserName} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">새 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동 (교사) 또는 김철수"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUserForName(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                >
                  변경 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 특정 사용자 비밀번호 재설정 모달 */}
      {targetUserForPw && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-bold text-slate-800">
              [{targetUserForPw.name}] 비밀번호 재설정
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              해당 사용자가 로그인할 수 있도록 새 비밀번호를 지정해 주세요.
            </p>

            <form onSubmit={handleSaveResetPassword} className="mt-4 space-y-4">
              <input
                type="text"
                required
                placeholder="새 비밀번호 입력 (예: 1234)"
                value={resetPwInput}
                onChange={(e) => setResetPwInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetUserForPw(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                >
                  재설정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📢 관리자 전체 공지사항 모달 */}
      <NoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        notice={notice}
        onSave={handleSaveNotice}
        isAdmin={true}
        isTeacherOrAdmin={true}
      />

      {/* 🖼️ 메인 배너 관리 모달 */}
      <BannerSettingsModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        settings={bannerSettings}
        onSave={handleSaveBannerSettings}
      />
    </div>
  );
}
