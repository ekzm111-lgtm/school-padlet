'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  School,
  ArrowRight,
  UserCheck,
  Hash,
  BookOpen,
} from 'lucide-react';
import { getStoreData, saveStoreData } from '@/lib/store';
import { Board, User } from '@/lib/types';

function JoinPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const bData = searchParams?.get('b');

  const [board, setBoard] = useState<Board | null>(null);
  const [studentName, setStudentName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const data = getStoreData();
    let found = data.boards.find((b) => b.code === code);

    // 타 기기나 시크릿 창이라 로컬스토리지에 없는 경우, URL에 전달된 압축 보드 데이터(b)로 자동 복원
    if (!found && bData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(bData));
        if (decoded && decoded.code === code) {
          found = decoded;
          // 이 기기의 로컬 저장소에도 보드 등록
          const updatedBoards = [decoded, ...data.boards];
          saveStoreData.boards(updatedBoards);
        }
      } catch (e) {
        console.error('Failed to parse board payload', e);
      }
    }

    if (found) {
      setBoard(found);
      setErrorMsg('');
    } else {
      setErrorMsg(`참여코드 [${code}]에 해당하는 수업 보드를 찾을 수 없습니다.`);
    }
  }, [code, bData]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !board) return;

    const data = getStoreData();

    // 간편 학생 세션 생성
    const guestUser: User = {
      id: `student-${Date.now()}`,
      name: studentName.trim(),
      email: `${Date.now()}@student.local`,
      role: 'student',
      status: 'approved',
      schoolName: data.settings.schoolName,
      createdAt: new Date().toISOString().split('T')[0],
    };

    saveStoreData.currentUser(guestUser);
    router.push(`/board/${board.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 text-center animate-in fade-in zoom-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
          <GraduationCap className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3">
          <Hash className="w-3.5 h-3.5" />
          <span>수업 참여 코드: {code}</span>
        </div>

        {errorMsg ? (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-red-600">{errorMsg}</h3>
            <p className="text-xs text-slate-500">선생님께 올바른 6자리 참여 링크를 다시 확인해 주세요.</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
            >
              메인으로 이동
            </Link>
          </div>
        ) : board ? (
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
              {board.title}
            </h2>
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
              {board.description || '선생님과 학생들이 실시간으로 글을 나누는 보드입니다.'}
            </p>

            <div className="my-6 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-center gap-2">
              <School className="w-4 h-4 text-blue-600" />
              <span>개설 선생님: <strong>{board.authorName}</strong></span>
            </div>

            <form onSubmit={handleJoin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  수업에서 사용할 이름 (또는 모둠명) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 2학년 3반 홍길동 또는 1모둠"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-sm font-bold text-slate-800 transition"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span>수업 보드 바로 입장하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function GlobalJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-bold">로딩 중...</div>}>
      <JoinPageContent />
    </Suspense>
  );
}
