'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  ShieldAlert,
  User as UserIcon,
  LogIn,
  LogOut,
  Hash,
  Sparkles,
  School,
  CheckCircle2,
  Pencil,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { getStoreData, saveStoreData } from '@/lib/store';
import { User } from '@/lib/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saveRemoteUser, deleteRemoteUser, deleteRemoteBoard, deleteRemotePost } from '@/lib/supabaseStore';

interface HeaderProps {
  extraRight?: React.ReactNode;
}

export default function Header({ extraRight }: HeaderProps = {}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState(getStoreData().settings);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

  // 🌟 본인 이름 직접 수정 상태
  const [showNameModal, setShowNameModal] = useState(false);
  const [myNewName, setMyNewName] = useState('');

  // 🌟 본인 회원 탈퇴 모달 상태
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 🌟 회원 탈퇴 및 모든 관련 데이터 영구 삭제 처리
  const handleWithdrawAccount = async () => {
    if (!currentUser) return;
    setIsWithdrawing(true);

    try {
      const data = getStoreData();
      const userId = currentUser.id;
      const userName = currentUser.name;
      const userEmail = currentUser.email;

      // 1. 해당 사용자가 작성한 보드들 삭제
      const userBoards = data.boards.filter((b) => b.authorId === userId || b.authorName === userName);
      const remainingBoards = data.boards.filter((b) => b.authorId !== userId && b.authorName !== userName);
      saveStoreData.boards(remainingBoards);

      // 2. 해당 사용자가 작성한 모든 카드/포스트 삭제
      const userPosts = data.posts.filter((p) => p.authorId === userId || p.authorName === userName);
      const remainingPosts = data.posts.filter((p) => p.authorId !== userId && p.authorName !== userName);
      saveStoreData.posts(remainingPosts);

      // 3. 사용자 목록에서 본인 삭제
      const remainingUsers = data.users.filter((u) => u.id !== userId);
      saveStoreData.users(remainingUsers);

      // 4. 원격 Supabase DB에서도 계정, 보드들, 카드들 영구 완전 삭제
      if (isSupabaseConfigured) {
        await deleteRemoteUser(userId, userEmail).catch(() => {});
        for (const b of userBoards) {
          await deleteRemoteBoard(b.id).catch(() => {});
        }
        for (const p of userPosts) {
          await deleteRemotePost(p.id).catch(() => {});
        }
      }

      // 5. 로그인 세션 및 로컬스토리지 정리 후 로그인 페이지로 이동
      saveStoreData.currentUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('schoolpad_last_login_id');
        localStorage.removeItem('schoolpad_last_gmail');
        localStorage.removeItem('schoolpad_last_name');
      }

      alert('회원 탈퇴가 완료되었습니다. 모든 활동 데이터가 안전하게 삭제되었습니다.');
      setShowWithdrawModal(false);
      router.push('/login');
    } catch (e) {
      console.error('Withdraw error:', e);
      alert('회원 탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleUpdateMyName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !myNewName.trim()) return;

    const trimmed = myNewName.trim();
    const oldName = currentUser.name;

    const updatedUser: User = { ...currentUser, name: trimmed };
    const data = getStoreData();

    // 1. users 목록 갱신
    const updatedUsers = data.users.map((u) => (u.id === currentUser.id ? updatedUser : u));
    saveStoreData.users(updatedUsers);

    // 2. 현재 로그인 세션 갱신
    saveStoreData.currentUser(updatedUser);

    // 🌟 원격 클라우드에도 수정된 이름 영구 저장
    saveRemoteUser(updatedUser).catch(() => {});

    // 3. 내가 작성한 보드 및 포스트의 작성자명 동기화
    const updatedBoards = data.boards.map((b) =>
      b.authorId === currentUser.id ? { ...b, authorName: trimmed } : b
    );
    saveStoreData.boards(updatedBoards);

    const updatedPosts = data.posts.map((p) =>
      p.authorId === currentUser.id ? { ...p, authorName: trimmed } : p
    );
    saveStoreData.posts(updatedPosts);

    setShowNameModal(false);
  };

  const loadData = () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    setUsers(data.users);
    setSettings(data.settings);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('store_updated', handleUpdate);
    return () => window.removeEventListener('store_updated', handleUpdate);
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const code = pinInput.trim();
    if (!code) return;

    const data = getStoreData();
    const targetBoard = data.boards.find((b) => b.code === code);
    if (targetBoard) {
      setShowPinModal(false);
      setPinInput('');
      router.push(`/board/${targetBoard.id}`);
    } else {
      setPinError('해당 6자리 코드의 보드를 찾을 수 없습니다.');
    }
  };

  const pendingUsersCount = users.filter((u) => u.status === 'pending').length;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* 로고 & 학교 정보 (맨 왼쪽 배치) */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-1.5 font-black text-base sm:text-lg tracking-tight text-slate-800 whitespace-nowrap">
                  <span>스쿨패들</span>
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold hidden xs:inline-block">
                    SchoolPad
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                  <School className="w-3 h-3 text-slate-400" />
                  <span>{settings.schoolName}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* 우측 유저 및 관리 버튼 (맨 오른쪽 배치) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
            {/* 🔥 참여자 & 실시간 퀴즈 버튼 (관리자 버튼 바로 앞쪽 배치) */}
            {extraRight}

            {/* 관리자 링크 */}
            {currentUser?.role === 'admin' && (
              <Link
                href="/admin"
                className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold transition shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xs:inline">관리자 센터</span>
                <span className="xs:hidden">관리자</span>
                {pendingUsersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                    {pendingUsersCount}
                  </span>
                )}
              </Link>
            )}

            {/* 현재 로그인 유저 정보 */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-slate-200 shrink-0">
                <div className="text-right flex flex-col items-end shrink-0">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMyNewName(currentUser.name);
                        setShowNameModal(true);
                      }}
                      className="hover:text-blue-600 flex items-center gap-1 group transition max-w-[85px] xs:max-w-[110px] sm:max-w-[140px] truncate"
                      title="클릭하여 내 이름 변경"
                    >
                      <span className="truncate">{currentUser.name}</span>
                      <Pencil className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600 opacity-60 shrink-0" />
                    </button>
                    {currentUser.role === 'admin' && (
                      <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-medium shrink-0">관리자</span>
                    )}
                    {currentUser.role === 'teacher' && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-medium shrink-0">교사</span>
                    )}
                    {currentUser.role === 'student' && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.2 rounded font-medium shrink-0">학생</span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono truncate max-w-[140px] hidden sm:block">
                    {currentUser.email}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => {
                      saveStoreData.currentUser(null);
                      router.push('/login');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                    title="로그아웃"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition font-medium"
                    title="회원 탈퇴 및 모든 활동 데이터 삭제"
                  >
                    탈퇴
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>로그인 / 가입</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 6자리 참여 핀코드 입력 모달 */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Hash className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">수업 보드 참여코드 입력</h3>
              <p className="text-xs text-slate-500 mt-1">
                선생님께서 알려주신 6자리 숫자 코드를 입력해 주세요.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="예: 782914"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-3xl font-mono tracking-widest font-bold py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition"
                  autoFocus
                />
                {pinError && <p className="text-xs text-red-500 mt-2 text-center font-medium">{pinError}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pinInput.length < 4}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
                >
                  입장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 본인 이름 직접 수정 모달 */}
      {showNameModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-800">내 이름(닉네임) 변경</h3>
              </div>
              <button
                onClick={() => setShowNameModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              수업 보드 및 카드 작성자명으로 표시될 내 이름을 변경합니다.
            </p>

            <form onSubmit={handleUpdateMyName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">변경할 새 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동 (교사) 또는 김철수"
                  value={myNewName}
                  onChange={(e) => setMyNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                >
                  이름 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 회원 탈퇴 및 모든 활동 데이터 영구 삭제 확인 모달 */}
      {showWithdrawModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">회원 탈퇴 및 데이터 영구 삭제</h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">탈퇴 시 복구가 불가능합니다</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-2 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-rose-700">
                <span>⚠️ 탈퇴 시 삭제되는 데이터 안내</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                <li>현재 회원님의 로그인 계정 정보 영구 삭제</li>
                <li><strong>직접 개설하신 모든 수업 보드 완전 삭제</strong></li>
                <li><strong>다른 보드에 남기신 모든 쪽지, 메모, 댓글, 첨부파일 영구 삭제</strong></li>
                <li>삭제된 모든 데이터는 데이터베이스에서 즉시 말소되며 복구할 수 없습니다.</li>
              </ul>
            </div>

            <div className="text-xs text-slate-600 font-medium px-1">
              정말 <strong>{currentUser.name}</strong> 계정을 탈퇴하고 모든 관련 데이터를 삭제하시겠습니까?
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
              >
                취소하고 유지하기
              </button>
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={handleWithdrawAccount}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isWithdrawing ? '삭제 처리 중...' : '모든 데이터 삭제 후 탈퇴'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
