'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Hash,
  Sparkles,
  Users,
  Copy,
  Check,
  Search,
  BookOpen,
  ArrowRight,
  Globe,
  Lock,
  Layers,
  Heart,
  FileCheck,
  FolderOpen,
  TrendingUp,
  Share2,
} from 'lucide-react';
import Header from '@/components/Header';
import CreateBoardModal from '@/components/CreateBoardModal';
import { getStoreData, saveStoreData, duplicateBoard } from '@/lib/store';
import { Board, User } from '@/lib/types';
import confetti from 'canvas-confetti';

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // 탭: 'public'(학교 전체 공유 보드) / 'my'(내 보드) / 'template'(추천 템플릿)
  const [activeTab, setActiveTab] = useState<'public' | 'my' | 'template'>('public');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

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

  // 로그인되지 않은 경우 로그인 페이지로 자동 안내
  useEffect(() => {
    const data = getStoreData();
    if (!data.currentUser) {
      router.push('/login');
    }
  }, [router]);

  // 1) 6자리 핀코드 복사
  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 2) 전역 공유 링크 복사
  const handleCopyLink = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/join/${code}`);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // 3) 보드 복제하기 (다른 사람의 보드를 내 보드로 가져오기)
  const handleDuplicateBoard = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('보드를 복제하려면 먼저 로그인해 주세요.');
      return;
    }
    const copied = duplicateBoard(board.id, currentUser);
    if (copied) {
      loadData();
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      } catch (err) {}
      alert(`🎉 [${board.title}] 보드가 내 보드로 성공적으로 복제되었습니다!`);
      router.push(`/board/${copied.id}`);
    }
  };

  // 4) 보드 공개/비공개 공유 상태 토글
  const handleTogglePublic = (e: React.MouseEvent, targetBoard: Board) => {
    e.stopPropagation();
    const isPublicNow = targetBoard.isPublic !== false;
    const updated = { ...targetBoard, isPublic: !isPublicNow };
    const data = getStoreData();
    saveStoreData.boards(data.boards.map((b) => (b.id === targetBoard.id ? updated : b)));
    loadData();
  };

  // 필터링
  const filteredBoards = boards.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.includes(searchTerm) ||
      b.authorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === '전체' || b.category === selectedCategory;

    if (activeTab === 'public') {
      // 학교 전체 공유된 보드만
      return matchesSearch && matchesCategory && b.isPublic !== false;
    }
    if (activeTab === 'my') {
      // 내가 만든 보드
      return matchesSearch && matchesCategory && currentUser && b.authorId === currentUser.id;
    }
    if (activeTab === 'template') {
      // 추천 템플릿
      return matchesSearch && matchesCategory && (b.category === '수업자료' || b.category === '모둠활동');
    }
    return matchesSearch && matchesCategory;
  });

  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
  const totalPostsCount = getStoreData().posts.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 🔥 최고급 다이나믹 히어로 배너 */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-blue-700 to-sky-500 text-white p-8 sm:p-12 shadow-2xl mb-10 border border-white/10">
          {/* 배경 발광 블러 효과 */}
          <div className="absolute -right-12 -top-12 w-96 h-96 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold mb-4 border border-white/20 shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span className="tracking-wide">우리 학교 실시간 협업 & 템플릿 공유 플랫폼</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.15]">
                생각을 붙이고, 나누고, <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-sky-200">
                  함께 카피하며 성장하는 교실
                </span>
              </h1>

              <p className="mt-4 text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
                학생들은 6자리 PIN 링크로 1초 만에 참여하고, <br className="hidden sm:inline" />
                선생님들은 다른 학급의 수업 보드를 클릭 한 번으로 내 보드로 복제(Copy)해 활용하세요.
              </p>

              {/* 히어로 빠른 액션 버튼 */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-blue-800 hover:bg-blue-50 font-black text-sm shadow-xl shadow-black/15 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>새 협업 보드 만들기</span>
                </button>

                <button
                  onClick={() => setActiveTab('template')}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white font-bold text-sm transition"
                >
                  <Layers className="w-4 h-4 text-amber-300" />
                  <span>추천 템플릿 복제하기</span>
                </button>
              </div>
            </div>

            {/* 우측 다이나믹 통계 위젯 카드 */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-80 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col justify-between">
                <div className="text-[11px] font-bold text-blue-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-300" />
                  <span>공유된 보드</span>
                </div>
                <div className="text-3xl font-black text-white mt-2 font-mono">
                  {boards.filter((b) => b.isPublic !== false).length}
                  <span className="text-xs text-blue-200 font-normal ml-1">개</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col justify-between">
                <div className="text-[11px] font-bold text-blue-200 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>나눈 메모/카드</span>
                </div>
                <div className="text-3xl font-black text-white mt-2 font-mono">
                  {totalPostsCount}
                  <span className="text-xs text-blue-200 font-normal ml-1">건</span>
                </div>
              </div>

              <div className="col-span-2 bg-gradient-to-r from-amber-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-200 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                    <span>실시간 협업 상태</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/80 text-white font-bold animate-pulse">
                    LIVE 연결됨
                  </span>
                </div>
                <div className="text-[11px] text-white/80 mt-1.5">
                  수업 중 학생들의 카드와 모둠 활동이 실시간 동기화 중입니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 탭바 & 검색 바 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* 3대 탭: [공유 보드] / [내 보드] / [수업 템플릿] */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab('public')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'public'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>학교 전체 공유 보드</span>
            </button>

            <button
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'my'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>내가 만든 보드</span>
              {currentUser && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px]">
                  {boards.filter((b) => b.authorId === currentUser.id).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('template')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'template'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>추천 템플릿 모음</span>
            </button>
          </div>

          {/* 검색창 */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="보드 제목, 개설자, 6자리 코드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>

        {/* 카테고리 필터 뱃지들 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 text-xs font-bold">
          {['전체', '수업자료', '모둠활동', '학급회의', '자유나눔', '프로젝트'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 보드 카드 그리드 */}
        {filteredBoards.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">해당 조건의 보드가 없습니다.</h3>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'my'
                ? '아직 개설하신 보드가 없습니다. [+ 새 협업 보드 만들기]를 눌러보세요!'
                : '다른 검색어를 입력해 보거나 새 보드를 생성해 보세요.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>새 보드 만들기</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((board) => {
              const themeStyles = {
                blue: 'from-blue-50 to-indigo-50/70 border-blue-200/80',
                cork: 'from-amber-50 to-orange-50/70 border-amber-200/80',
                blackboard: 'from-emerald-950 to-emerald-900 text-white border-emerald-800',
                gradient: 'from-purple-50 to-pink-50/80 border-purple-200/80',
                warm: 'from-orange-50 to-yellow-50/80 border-orange-200/80',
              };

              const isBlackboard = board.theme === 'blackboard';
              const isMyBoard = currentUser && board.authorId === currentUser.id;

              return (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className={`group relative rounded-3xl p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer bg-gradient-to-br flex flex-col justify-between ${
                    themeStyles[board.theme] || 'from-white to-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    {/* 상단 태그 & 공유/복제 액션 바 */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {board.category && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isBlackboard ? 'bg-emerald-800 text-emerald-200' : 'bg-white text-blue-700 shadow-xs'
                            }`}
                          >
                            {board.category}
                          </span>
                        )}

                        {/* 복제본 배지 */}
                        {board.copiedFromTitle && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            카피본
                          </span>
                        )}

                        {/* 공개 / 비공개 상태 배지 */}
                        {isMyBoard ? (
                          <button
                            onClick={(e) => handleTogglePublic(e, board)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                              board.isPublic !== false
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title="클릭하여 공개/비공개 전환"
                          >
                            {board.isPublic !== false ? (
                              <>
                                <Globe className="w-2.5 h-2.5" />
                                <span>공개중</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                <span>나만보기</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isBlackboard ? 'bg-emerald-900/80 text-emerald-300' : 'bg-white/80 text-slate-600'
                            }`}
                          >
                            <Globe className="w-2.5 h-2.5 text-blue-500" />
                            <span>공유됨</span>
                          </span>
                        )}
                      </div>

                      {/* 6자리 참여 핀코드 복사 뱃지 */}
                      <button
                        onClick={(e) => handleCopyCode(e, board.code)}
                        title="클릭하여 학생 참여 핀코드 복사"
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition ${
                          isBlackboard
                            ? 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                            : 'bg-white hover:bg-blue-50 text-blue-600 border border-slate-200'
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
                        isBlackboard ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {board.title}
                    </h3>

                    <p
                      className={`mt-2 text-xs line-clamp-2 leading-relaxed ${
                        isBlackboard ? 'text-emerald-200/80' : 'text-slate-500'
                      }`}
                    >
                      {board.description || '선생님과 학생들이 실시간으로 생각을 나누는 보드입니다.'}
                    </p>
                  </div>

                  {/* 하단 공유 & 복제 액션 버튼들 */}
                  <div
                    className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${
                      isBlackboard ? 'border-emerald-800/60 text-emerald-300/80' : 'border-slate-200/70 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-medium text-[11px]">
                      <span>{board.authorName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* 🔥 보드 복제(Copy/Remix) 버튼 */}
                      <button
                        onClick={(e) => handleDuplicateBoard(e, board)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition shadow-xs ${
                          isBlackboard
                            ? 'bg-emerald-800 hover:bg-emerald-700 text-white'
                            : 'bg-white hover:bg-blue-50 text-blue-700 border border-slate-200'
                        }`}
                        title="이 보드를 내 보드로 통째로 복사해오기"
                      >
                        <Copy className="w-3 h-3 text-blue-500" />
                        <span>복제하기</span>
                      </button>

                      {/* 링크 복사 버튼 */}
                      <button
                        onClick={(e) => handleCopyLink(e, board.code)}
                        className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                        title="학생 참여 링크 복사"
                      >
                        {copiedLink === board.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition text-blue-600 ml-1">
                        <span>입장</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
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
