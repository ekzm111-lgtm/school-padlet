'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Sparkles,
  School,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Hash,
  Mail,
  UserCheck,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { getStoreData, saveStoreData } from '@/lib/store';
import { User, UserRole, UserStatus } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'pin'>('login');

  // 로그인 상태
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // 회원가입 상태
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [grade, setGrade] = useState('1');
  const [classNum, setClassNum] = useState('1');

  // 핀코드 게스트
  const [pinCode, setPinCode] = useState('');
  const [guestName, setGuestName] = useState('');

  const [pendingMessage, setPendingMessage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [settings, setSettings] = useState(getStoreData().settings);

  useEffect(() => {
    setSettings(getStoreData().settings);
  }, []);

  // 1) 아이디/비밀번호 로그인 처리
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const data = getStoreData();

    const user = data.users.find(
      (u) =>
        (u.username === loginId.trim() || u.email === loginId.trim()) &&
        (u.password === loginPw.trim() || (!u.password && loginPw.trim() === 'admin'))
    );

    if (!user) {
      setErrorMsg('아이디 또는 비밀번호가 일치하지 않습니다. (초기 관리자: admin / admin)');
      return;
    }

    if (user.status === 'pending') {
      setErrorMsg('현재 관리자 승인 대기 중인 계정입니다.');
      return;
    }

    saveStoreData.currentUser(user);
    if (user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  // 관리자 admin/admin 자동 입력 버튼 (편의성 극대화)
  const handleQuickAdmin = () => {
    setLoginId('admin');
    setLoginPw('admin');
  };

  // 2) 구글 계정으로 원클릭 가입 및 로그인
  const handleGoogleAuth = () => {
    const data = getStoreData();
    const isAutoApprove = data.settings.autoApproveUsers;

    const googleEmail = prompt('사용할 구글(Gmail) 주소를 입력하세요:', 'student2026@gmail.com');
    if (!googleEmail) return;

    const userName = prompt('학생 또는 선생님 성함을 입력하세요:', '김학생') || '학생';

    const existing = data.users.find((u) => u.email === googleEmail);
    if (existing) {
      if (existing.status === 'pending') {
        alert('현재 관리자 승인 대기 중인 계정입니다. 관리자 승인 후 이용 가능합니다.');
        return;
      }
      saveStoreData.currentUser(existing);
      router.push('/');
      return;
    }

    // 신규 가입 처리
    const newUser: User = {
      id: `user-google-${Date.now()}`,
      username: googleEmail.split('@')[0],
      password: '1234',
      name: userName,
      email: googleEmail,
      role: 'student',
      status: isAutoApprove ? 'approved' : 'pending',
      schoolName: data.settings.schoolName,
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveStoreData.users([...data.users, newUser]);

    if (isAutoApprove) {
      saveStoreData.currentUser(newUser);
      alert(`🎉 [자동 가입 승인] ${userName}님 환영합니다!`);
      router.push('/');
    } else {
      setPendingMessage(true);
    }
  };

  // 3) 직접 회원가입 폼 제출
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const data = getStoreData();
    const isAutoApprove = data.settings.autoApproveUsers;

    if (!name.trim() || !email.trim()) {
      setErrorMsg('이름과 이메일을 입력해 주세요.');
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: newUsername.trim() || email.split('@')[0],
      password: newPassword.trim() || '1234',
      name: name.trim(),
      email: email.trim(),
      role,
      status: isAutoApprove ? 'approved' : 'pending',
      schoolName: data.settings.schoolName,
      grade: role === 'student' ? grade : undefined,
      classNum: role === 'student' ? classNum : undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveStoreData.users([...data.users, newUser]);

    if (isAutoApprove) {
      saveStoreData.currentUser(newUser);
      alert(`🎉 계정이 생성되어 바로 로그인되었습니다.`);
      router.push('/');
    } else {
      setPendingMessage(true);
    }
  };

  // 4) 핀코드 게스트 입장
  const handleGuestEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim() || !guestName.trim()) {
      setErrorMsg('참여 코드와 이름을 입력해 주세요.');
      return;
    }

    const data = getStoreData();
    const targetBoard = data.boards.find((b) => b.code === pinCode.trim());
    if (!targetBoard) {
      setErrorMsg('일치하는 6자리 참여 코드의 보드가 없습니다.');
      return;
    }

    const guestUser: User = {
      id: `guest-${Date.now()}`,
      name: `${guestName} (학생)`,
      email: 'guest@school.local',
      role: 'student',
      status: 'approved',
      schoolName: data.settings.schoolName,
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveStoreData.currentUser(guestUser);
    router.push(`/board/${targetBoard.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2 group mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="w-7 h-7" />
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tight">스쿨패들</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">우리 학교 실시간 협업 공간</h2>
        <p className="text-xs text-slate-500 mt-1">
          수업 참여를 위해 로그인하거나 6자리 PIN 코드로 바로 입장하세요.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-100 sm:px-8">
          {pendingMessage ? (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-200">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">가입 요청이 접수되었습니다!</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                현재 학교 정책에 따라 <strong>선생님(관리자)의 승인</strong> 후 입장이 가능합니다.<br />
                승인이 완료되면 바로 로그인하실 수 있습니다.
              </p>
              <button
                onClick={() => setPendingMessage(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                로그인 화면으로 돌아가기
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 상단 탭 3종: [로그인] / [회원가입] / [핀코드 입장] */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg('');
                  }}
                  className={`py-2 rounded-xl transition ${
                    activeTab === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg('');
                  }}
                  className={`py-2 rounded-xl transition ${
                    activeTab === 'signup' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  회원가입
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pin');
                    setErrorMsg('');
                  }}
                  className={`py-2 rounded-xl transition ${
                    activeTab === 'pin' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PIN 입장
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}

              {/* [탭 1] 로그인 */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* 관리자 원클릭 자동완성 편의 배너 */}
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>초기 관리자 계정</span>
                      </div>
                      <div className="text-[10px] text-amber-700 mt-0.5">
                        아이디: <code className="font-bold">admin</code> / 비번: <code className="font-bold">admin</code>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickAdmin}
                      className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-bold transition shadow-xs"
                    >
                      자동 채우기
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">아이디 또는 이메일</label>
                    <input
                      type="text"
                      required
                      placeholder="admin 또는 아이디 입력"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
                    <input
                      type="password"
                      required
                      placeholder="비밀번호 입력"
                      value={loginPw}
                      onChange={(e) => setLoginPw(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
                  >
                    로그인하기
                  </button>

                  <div className="relative pt-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-white text-slate-400 font-medium">또는</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Google (Gmail) 원클릭 로그인</span>
                  </button>
                </form>
              )}

              {/* [탭 2] 회원가입 */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition ${
                        role === 'student' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      🎒 학생 가입
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition ${
                        role === 'teacher' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      👩‍🏫 교사 가입
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">성명</label>
                    <input
                      type="text"
                      required
                      placeholder="홍길동"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">이메일(G메일 권장)</label>
                    <input
                      type="email"
                      required
                      placeholder="student@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">희망 아이디</label>
                      <input
                        type="text"
                        placeholder="영문/숫자"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
                      <input
                        type="password"
                        placeholder="4자리 이상"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  {role === 'student' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">학년</label>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        >
                          {[1, 2, 3, 4, 5, 6].map((g) => (
                            <option key={g} value={g}>
                              {g}학년
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">반</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={classNum}
                          onChange={(e) => setClassNum(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
                  >
                    가입 완료하기
                  </button>
                </form>
              )}

              {/* [탭 3] 6자리 PIN 코드 게스트 입장 */}
              {activeTab === 'pin' && (
                <form onSubmit={handleGuestEntry} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">수업 중 사용할 닉네임</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 3반 김철수"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">6자리 참여 PIN 코드</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="예: 782914"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-3 rounded-xl border-2 border-slate-200 text-xl font-mono tracking-widest text-center font-bold focus:border-blue-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
                  >
                    해당 보드로 즉시 입장
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
