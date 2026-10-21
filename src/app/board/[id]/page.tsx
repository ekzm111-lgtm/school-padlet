'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Lock,
  Unlock,
  Printer,
  Sparkles,
  LayoutGrid,
  Columns,
  Hash,
  Copy,
  Check,
  MousePointer2,
  Move,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import ShareModal from '@/components/ShareModal';
import { getStoreData, saveStoreData } from '@/lib/store';
import { Board, Post, User, BoardLayout } from '@/lib/types';

const DEFAULT_COLUMNS = ['모둠 1 (조사 및 계획)', '모둠 2 (의견 토론)', '모둠 3 (결과 정리)'];

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);

  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string | undefined>(undefined);
  const [currentLayout, setCurrentLayout] = useState<BoardLayout>('kanban'); // 기본: 칸반 열 형태
  const [copiedLink, setCopiedLink] = useState(false);

  // 모둠(열) 이름 수정 상태
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // 새 열 추가 인풋
  const [showAddColInput, setShowAddColInput] = useState(false);
  const [newColName, setNewColName] = useState('');

  // 자유 캔버스 드래그
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 그리드 드래그 앤 드롭 순서 변경
  const dragItemIdx = useRef<number | null>(null);
  const dragOverItemIdx = useRef<number | null>(null);

  const loadData = () => {
    const data = getStoreData();
    setCurrentUser(data.currentUser);
    const foundBoard = data.boards.find((b) => b.id === boardId);
    if (foundBoard) {
      setBoard(foundBoard);
      const cols = foundBoard.columns && foundBoard.columns.length > 0 ? foundBoard.columns : DEFAULT_COLUMNS;
      setColumns(cols);
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

  // 1) 학생 초대 전역 링크 복사
  const handleCopyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/join/${board.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 2) 모둠(열) 추가
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const updatedCols = [...columns, newColName.trim()];
    setColumns(updatedCols);
    setNewColName('');
    setShowAddColInput(false);

    // 보드 객체에 저장
    const data = getStoreData();
    const updatedBoard = { ...board, columns: updatedCols };
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    setBoard(updatedBoard);
  };

  // 3) 모둠(열) 이름 수정 완료
  const handleSaveColName = (idx: number) => {
    if (!editingColName.trim()) {
      setEditingColIdx(null);
      return;
    }
    const oldName = columns[idx];
    const newName = editingColName.trim();

    const updatedCols = [...columns];
    updatedCols[idx] = newName;
    setColumns(updatedCols);
    setEditingColIdx(null);

    // 기존 카드의 column 필드도 새 이름으로 업데이트
    const updatedPosts = posts.map((p) => (p.column === oldName ? { ...p, column: newName } : p));
    setPosts(updatedPosts);

    const data = getStoreData();
    const updatedBoard = { ...board, columns: updatedCols };
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    saveStoreData.posts(data.posts.map((p) => (p.column === oldName ? { ...p, column: newName } : p)));
    setBoard(updatedBoard);
  };

  // 4) 모둠(열) 삭제
  const handleDeleteColumn = (colName: string) => {
    if (confirm(`'${colName}' 열을 삭제하시겠습니까? (안에 있는 카드는 첫 번째 열로 이동됩니다)`)) {
      const updatedCols = columns.filter((c) => c !== colName);
      setColumns(updatedCols);

      const targetCol = updatedCols[0] || '기본 모둠';
      const updatedPosts = posts.map((p) => (p.column === colName ? { ...p, column: targetCol } : p));
      setPosts(updatedPosts);

      const data = getStoreData();
      const updatedBoard = { ...board, columns: updatedCols };
      saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
      saveStoreData.posts(data.posts.map((p) => (p.column === colName ? { ...p, column: targetCol } : p)));
      setBoard(updatedBoard);
    }
  };

  // 5) 칸반 열 드래그 앤 드롭 이동
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

  // 6) 그리드 모드 드래그 앤 드롭 순서 변경 (Reorder)
  const handleGridDragStart = (idx: number) => {
    dragItemIdx.current = idx;
  };

  const handleGridDragEnter = (idx: number) => {
    dragOverItemIdx.current = idx;
  };

  const handleGridDrop = () => {
    if (dragItemIdx.current === null || dragOverItemIdx.current === null) return;
    const reordered = [...posts];
    const draggedItem = reordered.splice(dragItemIdx.current, 1)[0];
    reordered.splice(dragOverItemIdx.current, 0, draggedItem);

    setPosts(reordered);
    dragItemIdx.current = null;
    dragOverItemIdx.current = null;

    const data = getStoreData();
    saveStoreData.posts(
      data.posts.map((p) => {
        const found = reordered.find((r) => r.id === p.id);
        return found ? found : p;
      })
    );
  };

  // 7) 자유 캔버스 마우스 드래그
  const handleMouseDownCanvasCard = (e: React.MouseEvent, post: Post) => {
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

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingId || currentLayout !== 'canvas') return;
    const canvasEl = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(10, Math.min(canvasEl.width - 280, e.clientX - canvasEl.left - dragOffset.current.x));
    const newY = Math.max(10, Math.min(1800, e.clientY - canvasEl.top - dragOffset.current.y));

    setPosts((prev) => prev.map((p) => (p.id === draggingId ? { ...p, x: newX, y: newY } : p)));
  };

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

  // 보드 잠금 토글
  const handleToggleLock = () => {
    const updatedBoard = { ...board, isLocked: !board.isLocked };
    const data = getStoreData();
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    setBoard(updatedBoard);
  };

  // 포스트 삭제
  const handleDeletePost = (postId: string) => {
    const data = getStoreData();
    saveStoreData.posts(data.posts.filter((p) => p.id !== postId));
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const themeClass = `theme-${board.theme || 'blue'}`;

  return (
    <div className={`min-h-screen flex flex-col ${themeClass}`}>
      <div className="no-print">
        <Header />
      </div>

      {/* 상단 컨트롤 바 */}
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
                    <span>읽기 전용</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{board.description}</p>
            </div>
          </div>

          {/* 도구 모음 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 학생 참여링크 복사 */}
            <button
              onClick={handleCopyInviteLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
              }`}
              title="학생들에게 보낼 참여 링크 복사"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '링크 복사됨!' : '🔗 학생 참여링크 복사'}</span>
            </button>

            {/* 6자리 참여 핀코드 뱃지 */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold hover:bg-blue-100 transition"
              title="QR코드 확인"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{board.code}</span>
            </button>

            {/* 패들렛 레이아웃 전환 */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCurrentLayout('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'kanban' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="모둠별 칸반 열 (드래그 앤 드롭 이동)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>칸반 열</span>
              </button>
              <button
                onClick={() => setCurrentLayout('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="그리드 바둑판 (드래그 순서 변경)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>그리드</span>
              </button>
              <button
                onClick={() => setCurrentLayout('canvas')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'canvas' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="자유 캔버스 (마우스 자유 드래그)"
              >
                <Move className="w-3.5 h-3.5" />
                <span>자유 드래그</span>
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
              >
                {board.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{board.isLocked ? '잠김' : '잠그기'}</span>
              </button>
            )}

            {/* 새 카드 작성 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <button
                onClick={() => {
                  setActiveColumn(columns[0]);
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

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 overflow-x-auto">
        {currentLayout === 'kanban' ? (
          /* 🔥 1) 기본 모드: 모둠별 칸반 열 (열 무한 추가 & 이름 수정 & 드래그 앤 드롭) */
          <div className="flex gap-5 items-start pb-8 min-w-full">
            {columns.map((colName, idx) => {
              const colPosts = posts.filter(
                (p) => p.column === colName || (!p.column && idx === 0)
              );

              return (
                <div
                  key={colName}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnColumn(e, colName)}
                  className="w-80 shrink-0 bg-white/85 backdrop-blur-md rounded-3xl p-4 border border-slate-200/90 shadow-sm flex flex-col min-h-[620px] transition hover:border-blue-300"
                >
                  {/* 열 헤더 (이름 수정 및 삭제) */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 group">
                    {editingColIdx === idx ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editingColName}
                          onChange={(e) => setEditingColName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveColName(idx)}
                          className="flex-1 px-2 py-1 text-xs font-bold border border-blue-500 rounded-lg outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveColName(idx)}
                          className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingColIdx(null)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={() => {
                            setEditingColIdx(idx);
                            setEditingColName(colName);
                          }}
                          className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-800 hover:text-blue-600"
                          title="클릭하여 모둠/섹션 이름 수정"
                        >
                          <span>{colName}</span>
                          <Pencil className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                            {colPosts.length}개
                          </span>
                          {columns.length > 1 && (
                            <button
                              onClick={() => handleDeleteColumn(colName)}
                              className="p-1 text-slate-300 hover:text-red-500 rounded-md transition"
                              title="열 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 카드 목록 (드래그 앤 드롭 이동) */}
                  <div className="space-y-4 flex-1">
                    {colPosts.map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStartKanban(e, post.id)}
                        className="cursor-grab active:cursor-grabbing transition-transform active:scale-98"
                      >
                        <PostCard
                          post={post}
                          currentUser={currentUser}
                          allowComments={board.allowComments}
                          allowReactions={board.allowReactions}
                          onDelete={handleDeletePost}
                          onUpdated={(up) => setPosts(posts.map((p) => (p.id === up.id ? up : p)))}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 이 열에 카드 추가 버튼 */}
                  {(!board.isLocked || isTeacherOrAdmin) && (
                    <button
                      onClick={() => {
                        setActiveColumn(colName);
                        setShowCreatePost(true);
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-slate-100/90 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>이 열에 카드 추가</span>
                    </button>
                  )}
                </div>
              );
            })}

            {/* 🔥 새 모둠/섹션 열 추가 카드 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <div className="w-72 shrink-0">
                {showAddColInput ? (
                  <form
                    onSubmit={handleAddColumn}
                    className="p-4 bg-white/90 backdrop-blur-md rounded-3xl border border-blue-300 shadow-sm space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-700">새 모둠(열) 추가</div>
                    <input
                      type="text"
                      placeholder="예: 4모둠 또는 보충자료방"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddColInput(false)}
                        className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
                      >
                        추가
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowAddColInput(true)}
                    className="w-full py-3.5 rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/60 hover:bg-white text-slate-600 hover:text-blue-600 font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ 새 모둠(열) 계속 추가</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : currentLayout === 'grid' ? (
          /* 🔥 2) 그리드 모드: 마우스 드래그 앤 드롭으로 카드 순서 변경 (Reorder) */
          <div>
            <div className="mb-3 text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-blue-500" />
              <span>카드를 마우스로 끌어서 다른 카드 위치로 놓으면 순서가 바로 바뀝니다.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-start">
              {posts.map((post, idx) => (
                <div
                  key={post.id}
                  draggable
                  onDragStart={() => handleGridDragStart(idx)}
                  onDragEnter={() => handleGridDragEnter(idx)}
                  onDragEnd={handleGridDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="cursor-grab active:cursor-grabbing transition-transform active:scale-95"
                >
                  <PostCard
                    post={post}
                    currentUser={currentUser}
                    allowComments={board.allowComments}
                    allowReactions={board.allowReactions}
                    onDelete={handleDeletePost}
                    onUpdated={(up) => setPosts(posts.map((p) => (p.id === up.id ? up : p)))}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 🔥 3) 자유 캔버스 모드 (마우스 자유 좌표 드래그) */
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
                  onMouseDown={(e) => handleMouseDownCanvasCard(e, post)}
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
                    onUpdated={(up) => setPosts(posts.map((p) => (p.id === up.id ? up : p)))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 우측 하단 플로팅 글쓰기 버튼 */}
      {(!board.isLocked || isTeacherOrAdmin) && (
        <button
          onClick={() => {
            setActiveColumn(columns[0]);
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
