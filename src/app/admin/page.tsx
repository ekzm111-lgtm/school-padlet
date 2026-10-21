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
} from 'lucide-react';
import Header from '@/components/Header';
import { getStoreData, saveStoreData } from '@/lib/store';
import { User, SystemSettings, Board } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(getStoreData().settings);
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'boards' | 'adminPw'>('pending');
  const [searchUser, setSearchUser] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // 관리자 본인 비번 변경 폼
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  // 특정 유저 비밀번호 재설정 모달 상태
  const [targetUserForPw, setTargetUserForPw] = useState<User | null>(null);
  const [resetPwInput, setResetPwInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const loadData = () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    setUsers(data.users);
    setBoards(data.boards);
    setSettings(data.settings);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('store_updated', handleUpdate);
    return () => window.removeEventListener('store_updated', handleUpdate);
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
    showToast(`권한이 '${newRole === 'admin' ? '관리자' : newRole === 'teacher' ? '교사' : '학생'}'(으)로 변경되었습니다.`);
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
    showToast(`${targetUserForPw.name}님의 비밀번호가 변경되었습니다.`);
    setTargetUserForPw(null);
    setResetPwInput('');
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
  const handleDeleteBoard = (boardId: string) => {
    if (confirm('정말 이 보드를 삭제하시겠습니까? 관련된 모든 글이 함께 삭제됩니다.')) {
      const updated = boards.filter((b) => b.id !== boardId);
      saveStoreData.boards(updated);
      setBoards(updated);
      showToast('보드가 삭제되었습니다.');
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'pending');
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{user.name}</span>
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
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-600'
                              : user.status === 'pending'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {user.status === 'approved' ? '승인완료' : user.status === 'pending' ? '승인대기' : '반려'}
                        </span>
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{b.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                        PIN: {b.code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      개설자: {b.authorName} · 개설일: {b.createdAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
    </div>
  );
}
