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
} from 'lucide-react';
import { getStoreData, saveStoreData } from '@/lib/store';
import { User, UserRole, UserStatus } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('1');
  const [classNum, setClassNum] = useState('1');
  const [pinCode, setPinCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [pendingMessage, setPendingMessage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [settings, setSettings] = useState(getStoreData().settings);

  useEffect(() => {
    setSettings(getStoreData().settings);
  }, []);

  // 구글 계정으로 원클릭 가입 및 로그인
  const handleGoogleAuth = () => {
    const data = getStoreData();
    const isAutoApprove = data.settings.autoApproveUsers;

    // 샘플 구글 프로필로 생성 또는 기존 유저 확인
    const googleEmail = prompt('사용할 구글(Gmail) 주소를 입력하세요:', 'student2026@gmail.com');
    if (!googleEmail) return;

    const userName = prompt('학생 또는 선생님 성함을 입력하세요:', '신규 사용자') || '사용자';

    const existing = data.users.find((u) => u.email === googleEmail);
    if (existing) {
      if (existing.status === 'pending') {
        alert('현재 관리자 승인 대기 중인 계정입니다. 승인 후 이용해 주세요.');
        return;
      }
      saveStoreData.currentUser(existing);
      router.push('/');
      return;
    }

    // 신규 가입 처리
    const newUser: User = {
      id: `user-google-${Date.now()}`,
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
      alert(`🎉 [자동 가입 완료] ${userName}님 환영합니다! 바로 이용하실 수 있습니다.`);
      router.push('/');
    } else {
      setPendingMessage(true);
    }
  };

  // 일반 이메일 가입/로그인 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const data = getStoreData();
    const isAutoApprove = data.settings.autoApproveUsers;

    if (!name.trim() || !email.trim()) {
      setErrorMsg('이름과 이메일을 입력해 주세요.');
      return;
    }

    // 기존 유저가 있는지 확인
    const existing = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      if (existing.status === 'pending') {
        setPendingMessage(true);
        return;
      }
      saveStoreData.currentUser(existing);
      router.push('/');
      return;
    }

    // 신규 회원 등록
    const newUser: User = {
      id: `user-${Date.now()}`,
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
      alert(`🎉 환영합니다! ${name}님 계정이 즉시 승인 및 생성되었습니다.`);
      router.push('/');
    } else {
      setPendingMessage(true);
    }
  };

  // 비로그인 6자리 핀코드 게스트 입장
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

    // 게스트 임시 유저
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
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition">
            <GraduationCap className="w-7 h-7" />
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tight">스쿨패들</span>
        </Link>
        <h2 className="text-xl font-bold text-slate-800">학교 계정 로그인 및 가입</h2>
        <p className="text-xs text-slate-500 mt-1">
          구글(Gmail) 계정으로 1초 만에 자동 가입하거나 학생 핀코드로 즉시 입장하세요.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-100 sm:px-10">
          {pendingMessage ? (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-200">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">가입 요청이 접수되었습니다!</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                현재 학교 정책에 따라 <strong>관리자(선생님)의 승인</strong> 후 입장이 가능합니다.<br />
                승인이 완료되면 동일한 이메일로 바로 로그인하실 수 있습니다.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setPendingMessage(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  다른 계정으로 로그인
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 구글 로그인 원클릭 버튼 */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 transition shadow-xs active:scale-[0.99]"
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
                <span>Google (Gmail) 계정으로 계속하기</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-400 font-medium">또는 직접 계정 입력</span>
                </div>
              </div>

              {/* 역할 선택 탭 (학생 / 교사) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎒 학생으로 가입
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    role === 'teacher' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👩‍🏫 교사로 가입
                </button>
              </div>

              {/* 가입/로그인 폼 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium">{errorMsg}</div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">이메일 주소</label>
                  <input
                    type="email"
                    required
                    placeholder="student@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
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
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95"
                >
                  계정 생성 및 로그인
                </button>
              </form>

              {/* 핀코드 비로그인 입장 접이식 */}
              <div className="pt-4 border-t border-slate-100">
                <details className="group">
                  <summary className="text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer flex items-center justify-between">
                    <span>💡 회원가입 없이 6자리 핀코드로만 입장하고 싶나요?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition">▼</span>
                  </summary>
                  <form onSubmit={handleGuestEntry} className="mt-3 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">참여 닉네임</label>
                      <input
                        type="text"
                        placeholder="예: 3반 김철수"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">6자리 참여 PIN 코드</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="782914"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
                    >
                      게스트로 바로 참여
                    </button>
                  </form>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
