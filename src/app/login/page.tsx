'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  X,
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

  // 🌟 Google(Gmail) 모달 및 자동입력 상태
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [googleRoleInput, setGoogleRoleInput] = useState<UserRole>('student');
  const [savedGmail, setSavedGmail] = useState('');
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    setSettings(getStoreData().settings);
    if (typeof window !== 'undefined') {
      const g = localStorage.getItem('schoolpad_last_gmail') || '';
      const n = localStorage.getItem('schoolpad_last_name') || '';
      if (g) {
        setSavedGmail(g);
        setGoogleEmailInput(g);
        setEmail((prev) => prev || g);
      }
      if (n) {
        setSavedName(n);
        setGoogleNameInput(n);
        setName((prev) => prev || n);
      }
    }

    // 1) Supabase Google OAuth 리디렉션 로그인 감지
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && user.email) {
          const gName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email.split('@')[0];
          handleGoogleSubmit(user.email, gName, 'student');
        }
      }).catch(() => {});
    }
  }, []);

  // 2) Google Identity Services (GSI) One Tap 및 버튼 초기화
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const initGsi = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id || !clientId) return;

      try {
        g.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response?.credential) {
              try {
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const profile = JSON.parse(jsonPayload);
                if (profile?.email) {
                  const googleName = profile.name || profile.given_name || profile.email.split('@')[0];
                  setGoogleEmailInput(profile.email);
                  setGoogleNameInput(googleName);
                  handleGoogleSubmit(profile.email, googleName, googleRoleInput);
                }
              } catch (err) {
                console.error('Failed to parse Google credential', err);
              }
            }
          },
          auto_select: true,
          cancel_on_tap_outside: true,
        });

        g.accounts.id.prompt();

        const btnEl = document.getElementById('google-official-btn');
        if (btnEl) {
          g.accounts.id.renderButton(btnEl, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            locale: 'ko',
          });
        }
      } catch (err) {
        console.warn('GSI init error:', err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGsi();
    } else {
      const timer = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(timer);
          initGsi();
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, [googleRoleInput]);

  // 브라우저 자격 증명(Web Credential API) 자동 감지
  const handleAutoFillFromBrowser = async () => {
    try {
      if (typeof window !== 'undefined' && 'credentials' in navigator && (navigator as any).credentials?.get) {
        const cred = await (navigator as any).credentials.get({
          password: true,
          mediation: 'optional',
        });
        if (cred && (cred as any).id) {
          const userEmail = (cred as any).id;
          setGoogleEmailInput(userEmail);
          const prefix = userEmail.split('@')[0];
          setGoogleNameInput((cred as any).name || prefix);
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    const inputEl = document.getElementById('google-email-input') as HTMLInputElement;
    if (inputEl) {
      inputEl.focus();
    }
  };

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

  // 2) Google(Gmail) 원클릭 가입 및 로그인 모달 열기
  const handleGoogleAuth = async () => {
    // 1) Supabase에 Google OAuth Provider가 활성화되어 있을 경우 원클릭 이동
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
          },
        });
        if (!error && data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (e) {}
    }
    // 2) 브라우저 계정 자동 감지 & 완성 모달 열기
    setShowGoogleModal(true);
    setTimeout(() => {
      handleAutoFillFromBrowser();
    }, 150);
  };

  // Google 모달에서 실제 로그인/가입 실행
  const handleGoogleSubmit = (emailToUse?: string, nameToUse?: string, roleToUse?: UserRole) => {
    const finalEmail = (emailToUse || googleEmailInput).trim();
    const finalRole = roleToUse || googleRoleInput;
    let finalName = (nameToUse || googleNameInput).trim();

    if (!finalEmail) {
      alert('Google(Gmail) 주소를 입력해 주세요.');
      return;
    }

    if (!finalName) {
      finalName = finalEmail.split('@')[0];
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('schoolpad_last_gmail', finalEmail);
      localStorage.setItem('schoolpad_last_name', finalName);
      setSavedGmail(finalEmail);
      setSavedName(finalName);
    }

    const data = getStoreData();
    const isAutoApprove = data.settings.autoApproveUsers;

    const existing = data.users.find(
      (u) => u.email.toLowerCase() === finalEmail.toLowerCase()
    );

    if (existing) {
      if (existing.status === 'pending') {
        alert('현재 관리자 승인 대기 중인 계정입니다. 관리자 승인 후 이용 가능합니다.');
        return;
      }
      if (existing.status === 'rejected') {
        alert('관리자에 의해 가입이 반려된 계정입니다. 관리자에게 재승인을 요청해주세요.');
        return;
      }
      saveStoreData.currentUser(existing);
      router.push(existing.role === 'admin' ? '/admin' : '/');
      return;
    }

    // 신규 가입 처리
    const newUser: User = {
      id: `user-google-${Date.now()}`,
      username: finalEmail.split('@')[0],
      password: 'google-auth-auto',
      name: finalName,
      email: finalEmail,
      role: finalRole,
      status: isAutoApprove ? 'approved' : 'pending',
      schoolName: data.settings.schoolName,
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveStoreData.users([...data.users, newUser]);

    if (isAutoApprove) {
      saveStoreData.currentUser(newUser);
      alert(`🎉 [Gmail 자동 가입 완료] ${finalName}님 환영합니다!`);
      router.push(finalRole === 'admin' ? '/admin' : '/');
    } else {
      setShowGoogleModal(false);
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
                  {/* Google (Gmail) 1초 자동 가입 및 로그인 버튼 */}
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-slate-800 font-bold text-xs transition shadow-xs"
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
                    <span>Google (Gmail) 계정으로 1초 자동 가입</span>
                  </button>

                  <div className="relative pt-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[11px]">
                      <span className="px-3 bg-white text-slate-400 font-medium">또는 직접 입력하여 가입</span>
                    </div>
                  </div>

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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">이메일 (G메일 자동 완성)</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const base = email.split('@')[0] || 'student';
                            setEmail(base + '@gmail.com');
                            if (!newUsername) setNewUsername(base);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition"
                        >
                          + @gmail.com
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const base = email.split('@')[0] || 'teacher';
                            setEmail(base + '@school.ac.kr');
                            if (!newUsername) setNewUsername(base);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium border border-slate-200 transition"
                        >
                          + @school.ac.kr
                        </button>
                      </div>
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="student@gmail.com"
                      value={email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmail(val);
                        if (!newUsername && val.includes('@')) {
                          setNewUsername(val.split('@')[0]);
                        }
                      }}
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

      {/* Google Identity Services 스크립트 비동기 로드 */}
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

      {/* 🌟 Google (Gmail) 원클릭 로그인 & 가입 모달 */}
      {showGoogleModal && (
        <div
          onClick={() => setShowGoogleModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Google 계정으로 시작</h3>
                  <p className="text-[11px] text-slate-400">브라우저 구글 계정으로 1초 자동 완성</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Google Identity Services 원탭/공식 버튼 (클라이언트 ID 등록 시 자동 렌더링) */}
            <div id="google-official-btn" className="flex justify-center w-full empty:hidden" />

            {/* 최근 저장된 Gmail이 있는 경우 원클릭 빠른 로그인 */}
            {savedGmail ? (
              <div className="p-3 bg-blue-50/90 rounded-2xl border border-blue-200/80 space-y-2">
                <div className="text-[11px] font-bold text-blue-900 flex items-center justify-between">
                  <span>내 구글 계정 감지됨</span>
                  <span className="text-blue-600 text-[10px] font-extrabold">자동 기억됨</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGoogleSubmit(savedGmail, savedName, googleRoleInput)}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-between shadow-xs active:scale-95"
                >
                  <span className="truncate">{savedGmail} {savedName ? `(${savedName})` : ''}</span>
                  <span className="text-[11px] opacity-90 shrink-0 font-extrabold">1초 만에 바로 입장 &gt;</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAutoFillFromBrowser}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>현재 브라우저 Google 계정 자동 감지</span>
              </button>
            )}

            <form
              id="google-auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleGoogleSubmit();
              }}
              className="space-y-3 pt-1"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="google-email-input" className="block text-xs font-bold text-slate-700">
                    구글(Gmail) 주소 입력
                  </label>
                  {!googleEmailInput.includes('@') && googleEmailInput.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const filled = googleEmailInput + '@gmail.com';
                        setGoogleEmailInput(filled);
                        if (!googleNameInput) setGoogleNameInput(googleEmailInput);
                      }}
                      className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200"
                    >
                      + @gmail.com
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="google-email-input"
                    name="email"
                    type="email"
                    autoComplete="email webauthn username"
                    autoFocus
                    required
                    placeholder="student@gmail.com (클릭 시 브라우저 자동완성)"
                    value={googleEmailInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGoogleEmailInput(val);
                      if (!googleNameInput && val.length > 2) {
                        setGoogleNameInput(val.split('@')[0]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="google-name-input" className="block text-xs font-bold text-slate-700 mb-1">
                  성함 (이름)
                </label>
                <input
                  id="google-name-input"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="예: 김학생 또는 이선생님 (미입력 시 자동 생성)"
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">신분 선택</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setGoogleRoleInput('student')}
                    className={`py-1 text-xs font-bold rounded-lg transition ${
                      googleRoleInput === 'student' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    🎒 학생
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoogleRoleInput('teacher')}
                    className={`py-1 text-xs font-bold rounded-lg transition ${
                      googleRoleInput === 'teacher' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    👩‍🏫 선생님
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Google 계정으로 자동 기입 & 입장하기</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
