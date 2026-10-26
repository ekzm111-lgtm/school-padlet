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
  Loader2,
} from 'lucide-react';
import { getStoreData, saveStoreData } from '@/lib/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Board, User } from '@/lib/types';

function JoinPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = (params.code as string)?.trim();
  const bData = searchParams?.get('b');

  const [board, setBoard] = useState<Board | null>(null);
  const [studentName, setStudentName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isCancelled = false;

    async function resolveBoard() {
      if (!code) return;
      setIsLoading(true);
      setErrorMsg('');

      // 1. 로컬 저장소 우선 확인
      const data = getStoreData();
      let found = data.boards.find((b) => b.code === code);

      // 2. URL 파라미터 bData 백업 확인
      if (!found && bData) {
        try {
          const decoded = JSON.parse(decodeURIComponent(bData));
          if (decoded && decoded.code === code) {
            found = decoded;
            saveStoreData.boards([decoded, ...data.boards]);
          }
        } catch (e) {
          console.error('Failed to parse bData', e);
        }
      }

      // 3. Supabase 클라우드 실시간 데이터베이스 직접 조회 (핵심!)
      if (!found && isSupabaseConfigured && supabase) {
        try {
          const { data: dbBoard, error } = await supabase
            .from('boards')
            .select('*')
            .eq('code', code)
            .maybeSingle();

          if (dbBoard && !error) {
            found = {
              id: dbBoard.id,
              code: dbBoard.code,
              title: dbBoard.title,
              description: dbBoard.description || '',
              layout: 'kanban',
              theme: dbBoard.theme || 'blue',
              coverImageUrl:
                dbBoard.cover_image_url ||
                'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
              customBgUrl: '',
              authorId: dbBoard.author_id || 'user-admin',
              authorName: dbBoard.author_name || '선생님',
              authorRole: 'teacher',
              columns: Array.isArray(dbBoard.columns)
                ? dbBoard.columns
                : ['모둠 1', '모둠 2', '모둠 3'],
              allowStudentPost: true,
              allowComments: true,
              allowReactions: true,
              isLocked: false,
              isPublic: true,
              category: '수업자료',
              createdAt: dbBoard.created_at
                ? new Date(dbBoard.created_at).toISOString().split('T')[0]
                : '',
            };

            // 기기 로컬스토리지에도 저장하여 다음 방문 시 즉시 로드
            const updatedBoards = [
              found,
              ...data.boards.filter((b) => b.id !== found!.id),
            ];
            saveStoreData.boards(updatedBoards);
          }
        } catch (dbErr) {
          console.error('Supabase join query error', dbErr);
        }
      }

      if (isCancelled) return;

      if (found) {
        setBoard(found);
        setErrorMsg('');
      } else {
        setErrorMsg(`참여코드 [${code}]에 해당하는 수업 보드를 찾을 수 없습니다.`);
      }
      setIsLoading(false);
    }

    resolveBoard();

    // 전역 store_updated 이벤트 발생 시 재확인
    const handleStoreUpdated = () => {
      const data = getStoreData();
      const updated = data.boards.find((b) => b.code === code);
      if (updated) {
        setBoard(updated);
        setErrorMsg('');
        setIsLoading(false);
      }
    };
    window.addEventListener('store_updated', handleStoreUpdated);

    return () => {
      isCancelled = true;
      window.removeEventListener('store_updated', handleStoreUpdated);
    };
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

        {isLoading ? (
          <div className="py-8 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              클라우드에서 수업 보드를 안전하게 불러오고 있습니다...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-red-600">{errorMsg}</h3>
            <p className="text-xs text-slate-500">
              선생님께 올바른 6자리 참여 링크를 다시 확인해 주세요.
            </p>
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
              <span>개설자: {board.authorName || '선생님'}</span>
            </div>

            <form onSubmit={handleJoin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  학생 본인 이름 또는 모둠명을 입력해 주세요
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="예: 2반 김민우 (또는 3모둠)"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                    autoFocus
                  />
                  <UserCheck className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-98"
              >
                <span>수업 보드로 바로 입장하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
