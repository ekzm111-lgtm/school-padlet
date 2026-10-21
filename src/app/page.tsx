'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Hash,
  Sparkles,
  Users,
  MessageSquare,
  Copy,
  Check,
  Search,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';
import Header from '@/components/Header';
import CreateBoardModal from '@/components/CreateBoardModal';
import { getStoreData } from '@/lib/store';
import { Board, User } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'my'>('all');

  const loadData = () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    setBoards(data.boards);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('store_updated', handleUpdate);
    return () => window.removeEventListener('store_updated', handleUpdate);
  }, []);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredBoards = boards.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.includes(searchTerm);
    if (filterTab === 'my') {
      return matchesSearch && currentUser && b.authorId === currentUser.id;
    }
    return matchesSearch;
  });

  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 상단 환영 히어로 영역 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white p-8 sm:p-10 shadow-xl mb-8">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>실시간 학교 협업 플랫폼</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              선생님과 학생이 함께 꾸미는<br />우리 반 실시간 참여 담벼락
            </h1>
            <p className="mt-3 text-sm sm:text-base text-blue-100 leading-relaxed font-normal">
              학생들은 회원가입 없이도 6자리 코드 하나로 참여 가능하며, <br className="hidden sm:inline" />
              구글 계정 자동 가입 및 관리자 승인 체계로 안전한 학교 환경을 제공합니다.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isTeacherOrAdmin ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-lg shadow-black/10 transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>새 협업 보드 만들기</span>
                </button>
              ) : (
                <div className="text-xs bg-white/20 px-4 py-2.5 rounded-xl font-medium">
                  💡 선생님 또는 관리자로 역할을 변경하시면 새 보드를 개설할 수 있습니다. (우측 상단 셀렉터)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 검색 및 탭 필터 바 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filterTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              전체 수업 보드 ({boards.length})
            </button>
            {currentUser && (
              <button
                onClick={() => setFilterTab('my')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  filterTab === 'my'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                내가 만든 보드
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="보드 제목 또는 6자리 코드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* 보드 카드 그리드 */}
        {filteredBoards.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">해당하는 보드가 없습니다.</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? '다른 검색어를 입력해 보세요.' : '새 보드를 개설해 수업 활동을 시작해 보세요!'}
            </p>
            {isTeacherOrAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>지금 새 보드 만들기</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((board) => {
              const themeGradients = {
                blue: 'from-blue-50 to-blue-100/70 border-blue-200',
                cork: 'from-amber-50 to-amber-100/70 border-amber-200',
                blackboard: 'from-emerald-900/90 to-emerald-950 text-white border-emerald-800',
                gradient: 'from-purple-50 to-pink-50 border-purple-200',
                warm: 'from-orange-50 to-amber-50 border-orange-200',
              };

              const layoutNames = {
                grid: '그리드',
                kanban: '칸반(열)',
                stream: '타임라인',
                wall: '벽면',
              };

              const isBlackboard = board.theme === 'blackboard';

              return (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className={`group relative rounded-3xl p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer bg-gradient-to-br ${
                    themeGradients[board.theme] || 'from-white to-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isBlackboard
                          ? 'bg-emerald-800/80 text-emerald-200'
                          : 'bg-white/80 text-slate-700 shadow-xs'
                      }`}
                    >
                      {layoutNames[board.layout]}
                    </span>

                    {/* 6자리 참여 핀코드 복사 뱃지 */}
                    <button
                      onClick={(e) => handleCopyCode(e, board.code)}
                      title="클릭하여 학생 참여 핀코드 복사"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition ${
                        isBlackboard
                          ? 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                          : 'bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <Hash className="w-3 h-3" />
                      <span>{board.code}</span>
                      {copiedCode === board.code ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-60" />
                      )}
                    </button>
                  </div>

                  <h3
                    className={`text-lg font-bold line-clamp-2 leading-snug group-hover:text-blue-600 transition ${
                      isBlackboard ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {board.title}
                  </h3>

                  <p
                    className={`mt-2 text-xs line-clamp-2 leading-relaxed ${
                      isBlackboard ? 'text-emerald-200/80' : 'text-slate-500'
                    }`}
                  >
                    {board.description || '선생님과 학생들이 실시간으로 글을 나누는 보드입니다.'}
                  </p>

                  <div
                    className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${
                      isBlackboard ? 'border-emerald-800/60 text-emerald-300/80' : 'border-slate-200/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-medium">
                      <span>개설: {board.authorName}</span>
                    </div>

                    <div className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition text-blue-600">
                      <span>입장</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 새 보드 만들기 모달 */}
      {currentUser && (
        <CreateBoardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          currentUser={currentUser}
          onCreated={(newBoard) => {
            loadData();
            router.push(`/board/${newBoard.id}`);
          }}
        />
      )}
    </div>
  );
}
