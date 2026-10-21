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
  Palette,
  Globe,
} from 'lucide-react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import ShareModal from '@/components/ShareModal';
import BackgroundModal from '@/components/BackgroundModal';
import { getStoreData, saveStoreData, duplicateBoard } from '@/lib/store';
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

  const [showPostModal, setShowPostModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<Post | undefined>(undefined);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string | undefined>(undefined);
  const [currentLayout, setCurrentLayout] = useState<BoardLayout>('kanban');
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

  // 칸반 열 내/간 드래그 앤 드롭 상태
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverPostId, setDragOverPostId] = useState<string | null>(null);

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
      if (foundBoard.layout) {
        setCurrentLayout(foundBoard.layout);
      }
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

  // 본인이 직접 만든 보드이거나 복제해 온 내 보드인지 확인
  const isBoardOwner = Boolean(
    currentUser &&
      (currentUser.id === board.authorId || currentUser.name === board.authorName)
  );

  // 최고 관리자이거나 해당 보드의 소유자(본인/복제자)만 보드 설정(잠금/배경/모둠수정 등) 가능
  const isTeacherOrAdmin = currentUser?.role === 'admin' || isBoardOwner;

  // 레이아웃 변경 시 보드 설정에 즉시 저장
  const handleChangeLayout = (newLayout: BoardLayout) => {
    setCurrentLayout(newLayout);
    if (board) {
      const updatedBoard = { ...board, layout: newLayout };
      setBoard(updatedBoard);
      const data = getStoreData();
      saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    }
  };

  // 학생 초대 링크 복사
  const handleCopyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/join/${board.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 모둠(열) 추가
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const updatedCols = [...columns, newColName.trim()];
    setColumns(updatedCols);
    setNewColName('');
    setShowAddColInput(false);

    const data = getStoreData();
    const updatedBoard = { ...board, columns: updatedCols };
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    setBoard(updatedBoard);
  };

  // 모둠(열) 이름 수정
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

    const updatedPosts = posts.map((p) => (p.column === oldName ? { ...p, column: newName } : p));
    setPosts(updatedPosts);

    const data = getStoreData();
    const updatedBoard = { ...board, columns: updatedCols };
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
    saveStoreData.posts(data.posts.map((p) => (p.column === oldName ? { ...p, column: newName } : p)));
    setBoard(updatedBoard);
  };

  // 모둠(열) 삭제
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

  // 칸반 열 내/간 드래그 앤 드롭 이동 및 순서 변경
  const handleDragStartKanban = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('text/plain', postId);
    setDraggedPostId(postId);
  };

  const handleDragEndKanban = () => {
    setDraggedPostId(null);
    setDragOverPostId(null);
  };

  // 같은 열 또는 다른 열의 특정 카드 위에 드롭했을 때 순서 변경
  const handleDropOnCard = (e: React.DragEvent, targetPostId: string, colName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedPostId;
    if (!sourceId || sourceId === targetPostId) {
      setDraggedPostId(null);
      setDragOverPostId(null);
      return;
    }

    const currentPosts = [...posts];
    const sourceIdx = currentPosts.findIndex((p) => p.id === sourceId);
    const targetIdx = currentPosts.findIndex((p) => p.id === targetPostId);

    if (sourceIdx === -1 || targetIdx === -1) {
      setDraggedPostId(null);
      setDragOverPostId(null);
      return;
    }

    // 소스 카드 꺼내서 해당 모둠(열)으로 배정
    const [draggedCard] = currentPosts.splice(sourceIdx, 1);
    const updatedCard = { ...draggedCard, column: colName };

    // 타겟 카드의 인덱스 앞쪽에 삽입하여 순서 변경
    const newTargetIdx = currentPosts.findIndex((p) => p.id === targetPostId);
    currentPosts.splice(newTargetIdx, 0, updatedCard);

    setPosts(currentPosts);
    setDraggedPostId(null);
    setDragOverPostId(null);

    const data = getStoreData();
    const otherBoardPosts = data.posts.filter((p) => p.boardId !== boardId);
    saveStoreData.posts([...otherBoardPosts, ...currentPosts]);
  };

  // 열 빈 공간에 드롭했을 때 맨 뒤로 이동
  const handleDropOnColumn = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    if (!postId) return;

    const currentPosts = [...posts];
    const sourceIdx = currentPosts.findIndex((p) => p.id === postId);
    if (sourceIdx === -1) {
      setDraggedPostId(null);
      setDragOverPostId(null);
      return;
    }

    const [draggedCard] = currentPosts.splice(sourceIdx, 1);
    const updatedCard = { ...draggedCard, column: colName };
    currentPosts.push(updatedCard);

    setPosts(currentPosts);
    setDraggedPostId(null);
    setDragOverPostId(null);

    const data = getStoreData();
    const otherBoardPosts = data.posts.filter((p) => p.boardId !== boardId);
    saveStoreData.posts([...otherBoardPosts, ...currentPosts]);
  };

  // 그리드 순서 변경
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

  // 자유 캔버스 마우스 드래그
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

  // 카드 생성 콜백 (중복 생성 방어)
  const handlePostCreated = (newPost: Post, newColName?: string) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
    if (newColName && !columns.includes(newColName)) {
      const updatedCols = [...columns, newColName];
      setColumns(updatedCols);
      const data = getStoreData();
      const updatedBoard = { ...board, columns: updatedCols };
      saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updatedBoard : b)));
      setBoard(updatedBoard);
    }
  };

  // 카드 수정 콜백
  const handlePostUpdated = (updated: Post) => {
    setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
  };

  const customBgStyle = board.customBgUrl
    ? {
        backgroundImage: `url(${board.customBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : undefined;

  const themeClass = board.customBgUrl ? '' : `theme-${board.theme || 'blue'}`;

  return (
    <div
      style={customBgStyle}
      className={`h-screen flex flex-col overflow-hidden transition-all duration-300 ${themeClass}`}
    >
      {/* 상단 완벽 고정 영역 (전체 헤더 + 보드 서브 컨트롤 바) */}
      <div className="shrink-0 z-30 no-print shadow-xs">
        <Header />

        {/* 보드 서브 컨트롤 바 */}
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-2.5">
          <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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

            {/* 이 보드 복제하기 버튼 */}
            <button
              onClick={() => {
                if (!currentUser) {
                  alert('보드를 복제하려면 먼저 로그인해 주세요.');
                  return;
                }
                const copied = duplicateBoard(board.id, currentUser);
                if (copied) {
                  alert(`🎉 [${board.title}] 보드가 내 보드로 복제되었습니다!`);
                  router.push(`/board/${copied.id}`);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-xs"
              title="이 보드를 내 보드로 복제해오기"
            >
              <Copy className="w-3.5 h-3.5 text-blue-500" />
              <span>보드 복제</span>
            </button>

            {/* 공개/비공개 공유 설정 토글 (내 보드인 경우) */}
            {currentUser && board.authorId === currentUser.id && (
              <button
                onClick={() => {
                  const updated = { ...board, isPublic: !board.isPublic };
                  setBoard(updated);
                  const data = getStoreData();
                  saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updated : b)));
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                  board.isPublic !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
                title="학교 전체 공개/비공개 전환"
              >
                {board.isPublic !== false ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{board.isPublic !== false ? '공개 공유중' : '나만보기(비공개)'}</span>
              </button>
            )}

            {/* 배경 꾸미기 버튼 (본인 보드 또는 관리자만 변경 가능) */}
            {isTeacherOrAdmin && (
              <button
                onClick={() => setShowBgModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold transition shadow-xs"
                title="배경화면 꾸미기 및 사진 업로드"
              >
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <span>배경 꾸미기</span>
              </button>
            )}

            {/* 레이아웃 전환 */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => handleChangeLayout('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'kanban' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="모둠별 칸반 열"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>칸반 열</span>
              </button>
              <button
                onClick={() => handleChangeLayout('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="그리드 바둑판 (순서 드래그)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>그리드</span>
              </button>
              <button
                onClick={() => handleChangeLayout('canvas')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  currentLayout === 'canvas' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="자유 캔버스 (자유 드래그)"
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

            {/* 새 카드 작성 버튼 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <button
                onClick={() => {
                  setModalMode('create');
                  setSelectedPostForEdit(undefined);
                  setActiveColumn(columns[0]);
                  setShowPostModal(true);
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
    </div>

      {/* 메인 콘텐츠 영역 (가로/세로 독립 스크롤이 매끄럽게 발생) */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-5 pb-16 overflow-x-auto overflow-y-auto select-none">
        {currentLayout === 'kanban' ? (
          /* 1) 모둠 칸반 열 (단정한 카드 추가 버튼 + 우측 무한 확장) */
          <div className="flex gap-5 items-start pb-12 w-max min-w-full">
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
                  {/* 열 헤더 */}
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 group">
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

                  {/* 단정한 최상단 카드 추가 버튼 */}
                  {(!board.isLocked || isTeacherOrAdmin) && (
                    <button
                      onClick={() => {
                        setModalMode('create');
                        setSelectedPostForEdit(undefined);
                        setActiveColumn(colName);
                        setShowPostModal(true);
                      }}
                      className="mb-3 w-full py-2.5 rounded-xl bg-slate-100/90 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200/60 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>이 열에 카드 추가</span>
                    </button>
                  )}

                  {/* 카드 목록 (같은 모둠 내 드래그 앤 드롭 순서 변경 지원) */}
                  <div className="space-y-4 flex-1 min-h-[80px]">
                    {colPosts.map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStartKanban(e, post.id)}
                        onDragEnd={handleDragEndKanban}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedPostId && draggedPostId !== post.id) {
                            setDragOverPostId(post.id);
                          }
                        }}
                        onDrop={(e) => handleDropOnCard(e, post.id, colName)}
                        className={`cursor-grab active:cursor-grabbing transition-all duration-150 ${
                          draggedPostId === post.id ? 'opacity-40 scale-95' : 'opacity-100'
                        } ${
                          dragOverPostId === post.id
                            ? 'ring-2 ring-blue-500 ring-offset-2 rounded-2xl scale-[1.02] shadow-lg'
                            : ''
                        }`}
                      >
                        <PostCard
                          post={post}
                          currentUser={currentUser}
                          columns={columns}
                          allowComments={board.allowComments}
                          allowReactions={board.allowReactions}
                          onDelete={handleDeletePost}
                          onUpdated={handlePostUpdated}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 새 모둠 추가 카드 */}
            {(!board.isLocked || isTeacherOrAdmin) && (
              <div className="w-72 shrink-0">
                {showAddColInput ? (
                  <form
                    onSubmit={handleAddColumn}
                    className="p-4 bg-white/95 backdrop-blur-md rounded-3xl border border-blue-300 shadow-md space-y-3"
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
                    className="w-full py-4 rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/70 hover:bg-white text-slate-600 hover:text-blue-600 font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>새 모둠(열) 추가</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : currentLayout === 'grid' ? (
          /* 2) 그리드 모드 */
          <div>
            <div className="mb-3 text-xs font-bold text-slate-500 flex items-center gap-1.5">
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
                    columns={columns}
                    allowComments={board.allowComments}
                    allowReactions={board.allowReactions}
                    onDelete={handleDeletePost}
                    onUpdated={handlePostUpdated}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 3) 자유 캔버스 모드 */
          <div
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
            className="relative min-h-[800px] w-full rounded-3xl border-2 border-dashed border-slate-300/60 p-4 transition overflow-hidden"
          >
            <div className="absolute top-3 left-4 text-xs font-bold text-slate-500/80 pointer-events-none flex items-center gap-1.5">
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
                    columns={columns}
                    allowComments={board.allowComments}
                    allowReactions={board.allowReactions}
                    onDelete={handleDeletePost}
                    onUpdated={handlePostUpdated}
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
            setModalMode('create');
            setSelectedPostForEdit(undefined);
            setActiveColumn(columns[0]);
            setShowPostModal(true);
          }}
          className="no-print fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-blue-500/40"
          title="새 카드 작성"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* 🔥 생성 및 수정 통합 PostModal (시원한 2xl UI & 다중 파일 드래그앤드롭 완벽 지원) */}
      {showPostModal && (
        <PostModal
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          mode={modalMode}
          boardId={board.id}
          currentUser={currentUser}
          post={selectedPostForEdit}
          defaultColumn={activeColumn}
          columns={columns}
          onCreated={handlePostCreated}
          onUpdated={handlePostUpdated}
        />
      )}

      {/* 공유 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        board={board}
      />

      {/* 배경화면 꾸미기 모달 */}
      <BackgroundModal
        isOpen={showBgModal}
        onClose={() => setShowBgModal(false)}
        board={board}
        onUpdated={(up) => setBoard(up)}
      />
    </div>
  );
}
