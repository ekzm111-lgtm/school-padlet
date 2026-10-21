'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Share2,
  Lock,
  Unlock,
  Printer,
  Sparkles,
  LayoutGrid,
  Columns,
  Rows,
  Hash,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import ShareModal from '@/components/ShareModal';
import { getStoreData, saveStoreData } from '@/lib/store';
import { Board, Post, User, BoardLayout } from '@/lib/types';

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string | undefined>(undefined);
  const [currentLayout, setCurrentLayout] = useState<BoardLayout>('grid');

  const loadData = () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    const foundBoard = data.boards.find((b) => b.id === boardId);
    if (foundBoard) {
      setBoard(foundBoard);
      setCurrentLayout(foundBoard.layout);
    }
    const boardPosts = data.posts.filter((p) => p.boardId === boardId);
    setPosts(boardPosts);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('store_updated', handleUpdate);
    return () => window.removeEventListener('store_updated', handleUpdate);
  }, [boardId]);

  if (!board) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-800">해당 수업 보드를 찾을 수 없습니다.</h2>
        <Link href="/" className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
          메인으로 이동
        </Link>
      </div>
    );
  }

  const isTeacherOrAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'teacher' ||
    (currentUser && currentUser.id === board.authorId);

  // 보드 잠금 토글 (수업 종료 후 읽기 전용)
  const handleToggleLock = () => {
    const updatedBoard = { ...board, isLocked: !board.isLocked };
    const data = getStoreData();
    const updatedBoards = data.boards.map((b) => (b.id === board.id ? updatedBoard : b));
    saveStoreData.boards(updatedBoards);
    setBoard(updatedBoard);
  };

  // 포스트 삭제
  const handleDeletePost = (postId: string) => {
    const data = getStoreData();
    const updated = data.posts.filter((p) => p.id !== postId);
    saveStoreData.posts(updated);
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const kanbanColumns = ['모둠 1 (조사 및 계획)', '모둠 2 (의견 토론)', '모둠 3 (결과 정리)'];

  // 테마별 배경 스타일 클래스
  const themeClass = `theme-${board.theme || 'blue'}`;

  return (
    <div className={`min-h-screen flex flex-col ${themeClass}`}>
      <div className="no-print">
        <Header />
      </div>

      {/* 보드 상단 제어 바 */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 no-print shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 보드 타이틀 및 개설 정보 */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="홈으로 가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {board.title}
                </h1>
                {board.isLocked && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <Lock className="w-3 h-3" />
                    <span>읽기 전용(잠김)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{board.description}</p>
            </div>
          </div>

          {/* 도구 모음: 핀코드, 레이아웃 변경, 인쇄, 공유, 글쓰기 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 6자리 참여 핀코드 버튼 */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold hover:bg-blue-100 transition"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{board.code}</span>
            </button>

            {/* 레이아웃 전환 */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCurrentLayout('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="그리드"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentLayout('kanban')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'kanban' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="칸반 열"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentLayout('stream')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'stream' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="피드"
              >
                <Rows className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 인쇄/PDF 저장 버튼 */}
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition"
              title="인쇄 및 PDF로 내보내기"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* 교사/관리자 전용 잠금 토글 */}
            {isTeacherOrAdmin && (
              <button
                onClick={handleToggleLock}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  board.isLocked
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title={board.isLocked ? '잠금 해제' : '수업 종료 후 쓰기 잠금'}
              >
                {board.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{board.isLocked ? '잠김 상태' : '보드 잠그기'}</span>
              </button>
            )}

            {/* 공유 모달 열기 */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>공유 / QR</span>
            </button>

            {/* 글쓰기 버튼 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <button
                onClick={() => {
                  setActiveColumn(undefined);
                  setShowCreatePost(true);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>카드 작성</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 보드 메인 콘텐츠 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {posts.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center border border-slate-200 shadow-md max-w-md mx-auto my-16">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">아직 작성된 카드가 없습니다.</h3>
            <p className="text-xs text-slate-500 mt-1">
              우측 상단의 <strong>[+ 카드 작성]</strong> 버튼을 눌러 첫 번째 생각이나 과제를 올려보세요!
            </p>
            {(!board.isLocked || isTeacherOrAdmin) && (
              <button
                onClick={() => setShowCreatePost(true)}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>첫 카드 작성하기</span>
              </button>
            )}
          </div>
        ) : currentLayout === 'kanban' ? (
          /* 칸반 레이아웃 (열 분할) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {kanbanColumns.map((colName) => {
              const colPosts = posts.filter((p) => p.column === colName || (!p.column && colName === kanbanColumns[0]));
              return (
                <div key={colName} className="bg-white/80 backdrop-blur-md rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col max-h-[85vh]">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <span className="font-bold text-xs text-slate-800">{colName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                      {colPosts.length}
                    </span>
                  </div>

                  <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                    {colPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUser={currentUser}
                        allowComments={board.allowComments}
                        allowReactions={board.allowReactions}
                        onDelete={handleDeletePost}
                      />
                    ))}
                  </div>

                  {(!board.isLocked || isTeacherOrAdmin) && (
                    <button
                      onClick={() => {
                        setActiveColumn(colName);
                        setShowCreatePost(true);
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>이 열에 카드 추가</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : currentLayout === 'stream' ? (
          /* 타임라인 피드 레이아웃 */
          <div className="max-w-2xl mx-auto space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                allowComments={board.allowComments}
                allowReactions={board.allowReactions}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
        ) : (
          /* 기본 그리드 레이아웃 */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-start">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                allowComments={board.allowComments}
                allowReactions={board.allowReactions}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
        )}
      </main>

      {/* 플로팅 글쓰기 버튼 (화면 우측 하단) */}
      {(!board.isLocked || isTeacherOrAdmin) && (
        <button
          onClick={() => {
            setActiveColumn(undefined);
            setShowCreatePost(true);
          }}
          className="no-print fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-blue-500/40"
          title="새 카드 작성"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* 카드 작성 모달 */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        boardId={board.id}
        currentUser={currentUser}
        defaultColumn={activeColumn}
        onCreated={(newPost) => setPosts([newPost, ...posts])}
      />

      {/* 공유 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        board={board}
      />
    </div>
  );
}
