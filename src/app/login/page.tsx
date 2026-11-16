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
  UserPlus,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getStoreData, saveStoreData } from '@/lib/store';
import { User, UserRole, UserStatus } from '@/lib/types';
import { fetchRemoteUsers, saveRemoteUser } from '@/lib/supabaseStore';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'pin'>('login');

  // 로그인 상태
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [savedGmail, setSavedGmail] = useState('');
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    const currentStore = getStoreData();
    setSettings(currentStore.settings);

    // 🌟 1. 이미 로그인된 기록(세션)이 있으면 로그인창에 머물지 않고 메인페이지로 자동 입장!
    if (currentStore.currentUser) {
      router.push('/');
      return;
    }

    // 🌟 2. 기존 로그인 기록이 있으면 아이디 자동 불러오기
    if (typeof window !== 'undefined') {
      const savedLoginId = localStorage.getItem('schoolpad_last_login_id');
      if (savedLoginId) {
        setLoginId(savedLoginId);
      }
    }
    if (typeof window !== 'undefined') {
      const g = localStorage.getItem('schoolpad_last_gmail') || 'ekzm11133@gmail.com';
      const n = localStorage.getItem('schoolpad_last_name') || 'minwan1 kim';
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

    // 🌟 원격 클라우드 사용자 목록 동기화
    fetchRemoteUsers().then((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        const data = getStoreData();
        const userMap = new Map<string, User>();
        data.users.forEach((u) => userMap.set(u.id, u));
        remoteUsers.forEach((u) => userMap.set(u.id, u));
        const merged = Array.from(userMap.values());
        saveStoreData.users(merged);
      }
    }).catch(() => {});

    // 1) Supabase Google OAuth 리디렉션 로그인 감지
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && user.email) {
          const gName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email.split('@')[0];
          handleGoogleSubmit(user.email, gName);
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
                  handleGoogleSubmit(profile.email, googleName);
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
  }, []);

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

  // 1) 아이디/비밀번호 로그인 처리 (원격 DB 실시간 직접 조회 및 엄격 검증)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoggingIn(true);

    try {
      const trimmedId = loginId.trim();
      const trimmedPw = loginPw.trim();

      // 🌟 1순위: 클라우드 원격 DB(Supabase)에서 실시간 최신 사용자 목록을 직접 읽어옴!
      let remoteUsers: User[] | null = null;
      try {
        remoteUsers = await Promise.race([
          fetchRemoteUsers(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
      } catch (err) {
        console.warn('Remote user fetch error during login:', err);
      }

      // 원격 DB에서 읽어온 사용자 목록을 단일 진실 원천(Single Source of Truth)으로 사용
      let userListToVerify: User[] = [];
      if (remoteUsers && remoteUsers.length > 0) {
        userListToVerify = remoteUsers;
        // 로컬 스토어 캐시도 DB의 최신 데이터로 동기화
        const userMap = new Map<string, User>();
        getStoreData().users.forEach((u) => userMap.set(u.id, u));
        remoteUsers.forEach((u) => userMap.set(u.id, u));
        saveStoreData.users(Array.from(userMap.values()));
      } else {
        // 네트워크 오프라인 시 로컬 캐시 폴백
        userListToVerify = getStoreData().users;
      }

      // 🌟 2단계: DB에 저장된 아이디/이메일과 비밀번호를 1:1 엄격하게 정확히 대조!
      const matchedUser = userListToVerify.find(
        (u) =>
          (u.username && u.username.toLowerCase() === trimmedId.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === trimmedId.toLowerCase())
      );

      // 계정이 없거나 DB 비밀번호와 다를 때
      if (!matchedUser || matchedUser.password !== trimmedPw) {
        setErrorMsg('아이디 또는 비밀번호가 일치하지 않습니다.');
        return;
      }

      if (matchedUser.status === 'pending') {
        setErrorMsg('현재 관리자 승인 대기 중인 계정입니다.');
        return;
      }

      if (matchedUser.status === 'rejected') {
        setErrorMsg('관리자에 의해 이용이 제한된 계정입니다.');
        return;
      }

      // 🌟 3단계: DB 비밀번호와 정확히 일치할 때만 로그인 세션 발급 및 이동
      saveStoreData.currentUser(matchedUser);
      try {
        localStorage.setItem('schoolpad_last_login_id', matchedUser.username || matchedUser.email || '');
      } catch (e) {}
      router.push('/');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 관리자 admin/admin 자동 입력 버튼 (편의성 극대화)
  const handleQuickAdmin = () => {
    setLoginId('admin');
    setLoginPw('admin');
  };

  // 2) Google(Gmail) 원클릭 가입 및 로그인 모달 열기
  const handleGoogleAuth = () => {
    setShowGoogleModal(true);
    setTimeout(() => {
      handleAutoFillFromBrowser();
    }, 100);
  };

  // Google 모달에서 실제 로그인/가입 실행
  const handleGoogleSubmit = async (emailToUse?: string, nameToUse?: string) => {
    const finalEmail = (emailToUse || googleEmailInput).trim();
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

    // 1) 로컬 사용자 목록에서 먼저 확인
    let existing = data.users.find(
      (u) => u.email.toLowerCase() === finalEmail.toLowerCase()
    );

    // 2) 로컬에 없으면 원격 클라우드에서도 확인
    if (!existing) {
      try {
        const remoteUsers = await fetchRemoteUsers();
        if (remoteUsers && remoteUsers.length > 0) {
          existing = remoteUsers.find(
            (u) => u.email.toLowerCase() === finalEmail.toLowerCase()
          );
          if (existing) {
            const userMap = new Map<string, User>();
            data.users.forEach((u) => userMap.set(u.id, u));
            remoteUsers.forEach((u) => userMap.set(u.id, u));
            saveStoreData.users(Array.from(userMap.values()));
          }
        }
      } catch (err) {}
    }

    // 🌟 ekzm11133@gmail.com 계정은 무조건 교사(teacher) 권한 보장
    if (finalEmail.toLowerCase() === 'ekzm11133@gmail.com') {
      if (existing && existing.role === 'student') {
        existing.role = 'teacher';
        saveStoreData.users(data.users.map((u) => (u.id === existing!.id ? { ...u, role: 'teacher' } : u)));
        saveRemoteUser(existing).catch(() => {});
      }
    }

    // 🌟 이미 가입된 회원은 가입 시 결정된 기존 role(교사/학생/관리자) 그대로 로그인
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
      router.push('/');
      return;
    }

    // 🌟 신규 회원의 경우에만 최초 등록 (기본 선생님 권한 부여)
    const assignedRole: UserRole = 'teacher';

    const newUser: User = {
      id: `user-google-${Date.now()}`,
      username: finalEmail.split('@')[0],
      password: 'google-auth-auto',
      name: finalName,
      email: finalEmail,
      role: assignedRole,
      status: isAutoApprove ? 'approved' : 'pending',
      schoolName: data.settings.schoolName,
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveStoreData.users([...data.users, newUser]);
    // 🌟 원격 클라우드에 신규 가입 즉시 영구 저장
    await saveRemoteUser(newUser).catch(() => {});

    if (isAutoApprove) {
      saveStoreData.currentUser(newUser);
      alert(`🎉 [Google 로그인 완료] ${finalName}님 환영합니다!`);
      router.push('/');
    } else {
      setShowGoogleModal(false);
      setPendingMessage(true);
    }
  };

  // 3) 직접 회원가입 폼 제출
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const data = getStoreData();
    const isAutoApprove = data.settings.autoApproveUsers;

    if (!name.trim() || !email.trim()) {
      setErrorMsg('이름과 이메일을 입력해 주세요.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const targetUsername = (newUsername.trim() || email.split('@')[0]).toLowerCase();

    // 🌟 중복 가입 원천 차단 (로컬 + 원격 DB 실시간 확인)
    let duplicateUser = data.users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === trimmedEmail) ||
        (u.username && u.username.toLowerCase() === targetUsername)
    );

    if (!duplicateUser) {
      try {
        const remoteUsers = await fetchRemoteUsers();
        if (remoteUsers) {
          duplicateUser = remoteUsers.find(
            (u) =>
              (u.email && u.email.toLowerCase() === trimmedEmail) ||
              (u.username && u.username.toLowerCase() === targetUsername)
          );
        }
      } catch (err) {}
    }

    if (duplicateUser) {
      setErrorMsg('이미 가입된 이메일 또는 아이디입니다. (중복 가입 불가)');
      alert('이미 동일한 이메일 또는 아이디로 등록된 계정이 존재합니다. [로그인] 탭에서 로그인해 주세요.');
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
    // 🌟 원격 클라우드에 신규 가입 즉시 영구 저장
    await saveRemoteUser(newUser).catch(() => {});

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

              {errorMsg && activeTab !== 'login' && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-bold border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* [탭 1] 로그인 */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">


                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">아이디 또는 이메일</label>
                    <input
                      type="text"
                      required
                      placeholder="아이디 또는 이메일 입력"
                      value={loginId}
                      onChange={(e) => {
                        setLoginId(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
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
                      onChange={(e) => {
                        setLoginPw(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-bold border border-red-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>로그인 확인 중...</span>
                      </>
                    ) : (
                      <span>로그인하기</span>
                    )}
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
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 transition shadow-2xs active:scale-95"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>Google 계정으로 로그인</span>
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

      {/* 🌟 Google 공식 스타일 "계정 선택" 모달 */}
      {showGoogleModal && (
        <div
          onClick={() => setShowGoogleModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150 relative"
          >
            {/* 상단 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 상단 Google 로고 & 타이틀 */}
            <div className="text-center pt-1">
              <div className="w-11 h-11 mx-auto mb-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <h3 className="text-base font-extrabold text-slate-900">계정 선택</h3>
              <p className="text-xs text-slate-500 mt-0.5">스쿨패들로 이동할 계정을 선택하세요</p>
            </div>

            {/* 계정 목록 */}
            <div className="space-y-2 pt-1">
              {/* 1) 감지된 브라우저 Google 계정 */}
              {(() => {
                const targetEmail = (savedGmail || 'ekzm11133@gmail.com').toLowerCase();
                const matchedUser = getStoreData().users.find((u) => u.email.toLowerCase() === targetEmail);
                const roleLabel =
                  matchedUser?.role === 'admin'
                    ? '관리자'
                    : matchedUser?.role === 'teacher' || targetEmail === 'ekzm11133@gmail.com'
                    ? '선생님'
                    : '학생';
                const roleBadgeColor =
                  roleLabel === '선생님'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : roleLabel === '관리자'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <button
                    type="button"
                    onClick={() => handleGoogleSubmit(savedGmail || 'ekzm11133@gmail.com', savedName || 'minwan1 kim')}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-blue-200/80 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 transition group text-left shadow-2xs active:scale-98"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs uppercase shrink-0">
                        {savedName?.[0] || 'M'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700 leading-tight">
                            {savedName || 'minwan1 kim'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${roleBadgeColor}`}>
                            {roleLabel}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {savedGmail || 'ekzm11133@gmail.com'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-[11px] text-blue-600 font-bold bg-white/90 border border-blue-200 px-2 py-0.5 rounded-full">
                        선택
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                    </div>
                  </button>
                );
              })()}

              {/* 2) 다른 계정 사용 버튼 */}
              <button
                type="button"
                onClick={() => setShowCustomGoogleInput(!showCustomGoogleInput)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-left shadow-2xs active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm border border-slate-200 shrink-0">
                    <UserPlus className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">다른 Google 계정 사용</div>
                    <div className="text-[11px] text-slate-400">다른 Gmail 주소로 로그인 또는 신규 등록</div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showCustomGoogleInput ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* 다른 계정 직접 입력 폼 (토글 시 노출) */}
            {showCustomGoogleInput && (
              <form
                id="google-auth-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGoogleSubmit();
                }}
                className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150"
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
                  <input
                    id="google-email-input"
                    name="email"
                    type="email"
                    autoComplete="email webauthn username"
                    required
                    placeholder="student@gmail.com"
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

                <div>
                  <label htmlFor="google-name-input" className="block text-xs font-bold text-slate-700 mb-1">
                    성함 (이름)
                  </label>
                  <input
                    id="google-name-input"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="예: 김학생 또는 이선생님"
                    value={googleNameInput}
                    onChange={(e) => setGoogleNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-sm active:scale-95"
                >
                  이 계정으로 입장하기
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
