'use client';

import { useState, useEffect, useRef } from 'react';
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
  Copy,
  Check,
  MousePointer2,
  Move,
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
  const [currentLayout, setCurrentLayout] = useState<BoardLayout>('canvas');
  const [copiedLink, setCopiedLink] = useState(false);

  // 자유 캔버스 드래그 중인 카드 상태
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const loadData = () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    const foundBoard = data.boards.find((b) => b.id === boardId);
    if (foundBoard) {
      setBoard(foundBoard);
      // 기본 레이아웃이 설정되어 있으면 적용
      if (!currentLayout) setCurrentLayout(foundBoard.layout || 'canvas');
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

  // 1) 전역 학생 참여 초대 링크 복사
  const handleCopyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/join/${board.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 2) 자유 캔버스 마우스 드래그 이동 시작
  const handleMouseDownCard = (e: React.MouseEvent, post: Post) => {
    // 버튼, 인풋, 링크 클릭 시에는 드래그 방지
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('a')) {
      return;
    }

    if (currentLayout !== 'canvas') return;

    setDraggingId(post.id);
    const cardEl = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - cardEl.left,
      y: e.clientY - cardEl.top,
    };
  };

  // 캔버스 마우스 이동
  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingId || currentLayout !== 'canvas') return;

    const canvasEl = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(10, Math.min(canvasEl.width - 280, e.clientX - canvasEl.left - dragOffset.current.x));
    const newY = Math.max(10, Math.min(1800, e.clientY - canvasEl.top - dragOffset.current.y));

    setPosts((prev) =>
      prev.map((p) => (p.id === draggingId ? { ...p, x: newX, y: newY } : p))
    );
  };

  // 캔버스 드래그 종료 및 저장
  const handleMouseUpCanvas = () => {
    if (!draggingId) return;
    const data = getStoreData();
    const updatedAllPosts = data.posts.map((p) => {
      const match = posts.find((curr) => curr.id === p.id);
      return match ? match : p;
    });
    saveStoreData.posts(updatedAllPosts);
    setDraggingId(null);
  };

  // 3) 칸반 열 드래그 앤 드롭
  const handleDragStartKanban = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('text/plain', postId);
  };

  const handleDropOnColumn = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain');
    if (!postId) return;

    const updated = posts.map((p) => (p.id === postId ? { ...p, column: colName } : p));
    setPosts(updated);

    const data = getStoreData();
    const updatedAll = data.posts.map((p) => (p.id === postId ? { ...p, column: colName } : p));
    saveStoreData.posts(updatedAll);
  };

  // 보드 잠금 토글
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

  // 포스트 수정 콜백
  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const kanbanColumns = ['모둠 1 (조사 및 계획)', '모둠 2 (의견 토론)', '모둠 3 (결과 정리)'];
  const themeClass = `theme-${board.theme || 'blue'}`;

  return (
    <div className={`min-h-screen flex flex-col ${themeClass}`}>
      <div className="no-print">
        <Header />
      </div>

      {/* 보드 상단 컨트롤 바 */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 no-print shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 보드 타이틀 */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="홈으로 가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {board.title}
                </h1>
                {board.isLocked && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <Lock className="w-3 h-3" />
                    <span>읽기 전용(잠김)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{board.description}</p>
            </div>
          </div>

          {/* 도구 모음: 전역 참여 링크 복사, 드래그 모드 전환, 글쓰기 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 🔥 전역 학생 참여 초대 링크 복사 버튼 (요구사항 강조) */}
            <button
              onClick={handleCopyInviteLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'
              }`}
              title="학생들에게 보낼 참여 링크 복사"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '참여 링크 복사됨!' : '🔗 학생 참여링크 복사'}</span>
            </button>

            {/* 6자리 참여 핀코드 뱃지 */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold hover:bg-blue-100 transition"
              title="QR코드 및 참여코드 확인"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{board.code}</span>
            </button>

            {/* 패들렛 레이아웃 전환: 자유 캔버스(드래그) / 칸반(모둠) / 그리드(바둑판) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCurrentLayout('canvas')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'canvas' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="자유 캔버스 (마우스로 자유롭게 드래그 이동)"
              >
                <Move className="w-3.5 h-3.5" />
                <span>자유 드래그</span>
              </button>
              <button
                onClick={() => setCurrentLayout('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'kanban' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="칸반 (열 간 드래그 앤 드롭)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>칸반 열</span>
              </button>
              <button
                onClick={() => setCurrentLayout('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="바둑판 그리드 정렬"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>그리드</span>
              </button>
            </div>

            {/* 인쇄/PDF 저장 */}
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition"
              title="인쇄 및 PDF 저장"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* 교사 보드 잠금 */}
            {isTeacherOrAdmin && (
              <button
                onClick={handleToggleLock}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                  board.isLocked
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title={board.isLocked ? '잠금 해제' : '수업 종료 후 쓰기 잠금'}
              >
                {board.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{board.isLocked ? '잠김' : '잠그기'}</span>
              </button>
            )}

            {/* 글쓰기 버튼 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <button
                onClick={() => {
                  setActiveColumn(undefined);
                  setShowCreatePost(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>카드 작성</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 보드 메인 영역 */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 select-none">
        {posts.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center border border-slate-200 shadow-md max-w-md mx-auto my-16">
            <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">아직 작성된 카드가 없습니다.</h3>
            <p className="text-xs text-slate-500 mt-1">
              우측 상단의 <strong>[+ 카드 작성]</strong>을 눌러 첫 번째 메모를 붙여보세요!
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
        ) : currentLayout === 'canvas' ? (
          /* 🔥 1) 패들렛 대표 모드: 자유 캔버스 (마우스로 원하는 곳에 드래그) */
          <div
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
            className="relative min-h-[800px] w-full rounded-3xl border-2 border-dashed border-slate-300/60 p-4 transition overflow-hidden"
          >
            <div className="absolute top-3 left-4 text-xs font-bold text-slate-400/80 pointer-events-none flex items-center gap-1.5">
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>카드를 마우스로 잡고 원하는 위치로 자유롭게 드래그해 옮겨보세요!</span>
            </div>

            {posts.map((post, idx) => {
              const defaultX = 20 + (idx % 3) * 320;
              const defaultY = 40 + Math.floor(idx / 3) * 280;
              const posX = post.x ?? defaultX;
              const posY = post.y ?? defaultY;

              return (
                <div
                  key={post.id}
                  onMouseDown={(e) => handleMouseDownCard(e, post)}
                  style={{
                    position: 'absolute',
                    left: `${posX}px`,
                    top: `${posY}px`,
                    width: '300px',
                    zIndex: draggingId === post.id ? 50 : 10,
                    cursor: draggingId === post.id ? 'grabbing' : 'grab',
                  }}
                  className={`transition-shadow ${draggingId === post.id ? 'scale-105 shadow-2xl opacity-90' : ''}`}
                >
                  <PostCard
                    post={post}
                    currentUser={currentUser}
                    allowComments={board.allowComments}
                    allowReactions={board.allowReactions}
                    onDelete={handleDeletePost}
                    onUpdated={handlePostUpdated}
                  />
                </div>
              );
            })}
          </div>
        ) : currentLayout === 'kanban' ? (
          /* 🔥 2) 칸반 열 간 드래그 앤 드롭 모드 */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {kanbanColumns.map((colName) => {
              const colPosts = posts.filter(
                (p) => p.column === colName || (!p.column && colName === kanbanColumns[0])
              );
              return (
                <div
                  key={colName}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnColumn(e, colName)}
                  className="bg-white/85 backdrop-blur-md rounded-3xl p-4 border border-slate-200/90 shadow-sm flex flex-col min-h-[600px] transition hover:border-blue-300"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <span className="font-bold text-xs text-slate-800">{colName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                      {colPosts.length}개
                    </span>
                  </div>

                  <div className="space-y-4 flex-1">
                    {colPosts.map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStartKanban(e, post.id)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <PostCard
                          post={post}
                          currentUser={currentUser}
                          allowComments={board.allowComments}
                          allowReactions={board.allowReactions}
                          onDelete={handleDeletePost}
                          onUpdated={handlePostUpdated}
                        />
                      </div>
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
        ) : (
          /* 🔥 3) 깔끔한 그리드(바둑판) 모드 */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-start">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                allowComments={board.allowComments}
                allowReactions={board.allowReactions}
                onDelete={handleDeletePost}
                onUpdated={handlePostUpdated}
              />
            ))}
          </div>
        )}
      </main>

      {/* 우측 하단 플로팅 글쓰기 버튼 */}
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
