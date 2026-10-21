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
} from 'lucide-react';
import { getStoreData, saveStoreData } from '@/lib/store';
import { User } from '@/lib/types';

export default function Header() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState(getStoreData().settings);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* 로고 & 학교 정보 */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-black text-lg tracking-tight text-slate-800">
                  <span>스쿨패들</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                    SchoolPad
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <School className="w-3 h-3 text-slate-400" />
                  <span>{settings.schoolName}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* 중앙: 6자리 학생 핀코드 빠른 참여 버튼 */}
          <div className="hidden md:flex items-center">
            <button
              onClick={() => setShowPinModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-all shadow-inner"
            >
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              <span>학생 참여코드(PIN) 입장</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 font-mono shadow-xs">
                #
              </kbd>
            </button>
          </div>

          {/* 우측 유저 및 관리 버튼 */}
          <div className="flex items-center gap-2.5">
            {/* 모바일 핀 입장 버튼 */}
            <button
              onClick={() => setShowPinModal(true)}
              className="md:hidden p-2 rounded-lg bg-slate-100 text-slate-600"
              title="참여코드 입장"
            >
              <Hash className="w-4 h-4" />
            </button>

            {/* 관리자 링크 */}
            {currentUser?.role === 'admin' && (
              <Link
                href="/admin"
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold transition"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>관리자 센터</span>
                {pendingUsersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                    {pendingUsersCount}
                  </span>
                )}
              </Link>
            )}

            {/* 현재 로그인 유저 정보 & 빠른 전환 셀렉터 */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                    {currentUser.name}
                    {currentUser.role === 'admin' && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-medium">관리자</span>
                    )}
                    {currentUser.role === 'teacher' && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-medium">교사</span>
                    )}
                    {currentUser.role === 'student' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-medium">학생</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                    {currentUser.email}
                  </div>
                </div>

                {/* 빠른 계정 전환 (체험/테스트 용이성) */}
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const selected = users.find((u) => u.id === e.target.value);
                    if (selected) saveStoreData.currentUser(selected);
                  }}
                  className="text-xs bg-slate-100 hover:bg-slate-200 border-none rounded-lg py-1.5 px-2 text-slate-700 font-medium cursor-pointer focus:ring-2 focus:ring-blue-500"
                  title="테스트용 계정 전환"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.role === 'admin' ? '관리자' : u.role === 'teacher' ? '교사' : '학생'}] {u.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    saveStoreData.currentUser(null);
                    router.push('/login');
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
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
    </>
  );
}
