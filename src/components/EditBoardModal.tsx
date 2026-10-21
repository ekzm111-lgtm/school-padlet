'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Pencil,
  Sparkles,
  LayoutGrid,
  Columns,
  Rows,
  Palette,
  ShieldCheck,
  ImageIcon,
  UploadCloud,
  Check,
  Trash2,
} from 'lucide-react';
import { Board, BoardLayout, BoardTheme } from '@/lib/types';
import { getStoreData, saveStoreData } from '@/lib/store';

interface EditBoardModalProps {
  board: Board;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedBoard: Board) => void;
  onDeleted?: (boardId: string) => void;
}

// 교실 및 학습에 어울리는 추천 커버/배경 이미지 프리셋
const PRESET_COVERS = [
  {
    name: '우리 교실',
    url: '/korean_classroom_banner.jpg',
  },
  {
    name: '도서관 서가',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: '창의 미술실',
    url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: '과학 연구',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: '푸른 잔디 교정',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&auto=format&fit=crop&q=80',
  },
];

export default function EditBoardModal({
  board,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: EditBoardModalProps) {
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description || '');
  const [layout, setLayout] = useState<BoardLayout>(board.layout || 'kanban');
  const [theme, setTheme] = useState<BoardTheme>(board.theme || 'blue');
  const [category, setCategory] = useState<'수업자료' | '모둠활동' | '학급회의' | '자유나눔' | '프로젝트'>(
    board.category || '수업자료'
  );
  const [customBgUrl, setCustomBgUrl] = useState<string>(board.customBgUrl || '');
  const [isPublic, setIsPublic] = useState<boolean>(board.isPublic !== false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allowStudentPost, setAllowStudentPost] = useState(board.allowStudentPost ?? true);
  const [allowComments, setAllowComments] = useState(board.allowComments ?? true);
  const [allowReactions, setAllowReactions] = useState(board.allowReactions ?? true);

  useEffect(() => {
    setTitle(board.title);
    setDescription(board.description || '');
    setLayout(board.layout || 'kanban');
    setTheme(board.theme || 'blue');
    setCategory(board.category || '수업자료');
    setCustomBgUrl(board.customBgUrl || '');
    setIsPublic(board.isPublic !== false);
    setAllowStudentPost(board.allowStudentPost ?? true);
    setAllowComments(board.allowComments ?? true);
    setAllowReactions(board.allowReactions ?? true);
  }, [board]);

  if (!isOpen) return null;

  // 이미지 파일 처리 (10MB 제한 및 Base64 인코딩)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(JPG, PNG, GIF, WebP 등)만 첨부할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 용량은 최대 10MB까지 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setCustomBgUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updatedBoard: Board = {
      ...board,
      title: title.trim(),
      description: description.trim(),
      layout,
      theme,
      customBgUrl: customBgUrl.trim() || undefined,
      category,
      isPublic,
      allowStudentPost,
      allowComments,
      allowReactions,
    };

    const currentData = getStoreData();
    saveStoreData.boards(
      currentData.boards.map((b) => (b.id === board.id ? updatedBoard : b))
    );
    onUpdated(updatedBoard);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`'${board.title}' 보드를 정말 삭제하시겠습니까? 보드 안의 모든 카드와 댓글도 함께 삭제됩니다.`)) {
      const currentData = getStoreData();
      saveStoreData.boards(currentData.boards.filter((b) => b.id !== board.id));
      saveStoreData.posts(currentData.posts.filter((p) => p.boardId !== board.id));
      if (onDeleted) onDeleted(board.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">협업 보드 정보 수정</h2>
              <p className="text-[11px] text-slate-400">보드 제목, 커버 사진, 테마 및 공개 설정을 변경합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* 보드 제목 & 설명 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">보드 제목 *</label>
            <input
              type="text"
              required
              placeholder="예: 3학년 2반 사회: 우리 고장의 문화유산 탐구"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-sm font-medium transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">수업 안내 및 설명</label>
            <textarea
              rows={2}
              placeholder="학생들에게 전달할 활동 안내나 지시사항을 적어주세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-sm transition"
            />
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">분류 카테고리</label>
            <div className="flex flex-wrap gap-2">
              {(['수업자료', '모둠활동', '학급회의', '자유나눔', '프로젝트'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    category === cat
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 🌟 보드 커버/배경 이미지 첨부 & 교체 */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>보드 커버 및 배경 사진 변경 (선택)</span>
              </label>
              {customBgUrl && (
                <button
                  type="button"
                  onClick={() => setCustomBgUrl('')}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  사진 삭제
                </button>
              )}
            </div>

            {/* 현재 적용된 사진 미리보기 */}
            {customBgUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/30 h-36 w-full shadow-inner group">
                <img
                  src={customBgUrl}
                  alt="Board cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-bold hover:bg-slate-100 shadow"
                  >
                    사진 교체
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomBgUrl('')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              /* 드래그 앤 드롭 업로드 영역 */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-100/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    새 사진을 여기로 드래그하거나 <span className="text-blue-600 underline">클릭하여 첨부</span>하세요
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    JPG, PNG, GIF, WebP (최대 10MB) • 보드 썸네일 및 배경으로 지정됩니다.
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* 추천 실사진 프리셋 선택 */}
            <div>
              <p className="text-[11px] font-bold text-slate-600 mb-1.5">또는 추천 학교·교실 테마 사진에서 선택:</p>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCustomBgUrl(preset.url)}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition group ${
                      customBgUrl === preset.url
                        ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-center p-1">
                      <span className="text-[9px] font-bold text-white tracking-tighter truncate">
                        {preset.name}
                      </span>
                    </div>
                    {customBgUrl === preset.url && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 테마 배경 색상 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              배경 색상 테마 {customBgUrl && <span className="text-slate-400 font-normal">(사진 첨부 시 사진 우선)</span>}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'blue', name: '맑은 하늘', bg: 'bg-blue-100 border-blue-400' },
                { id: 'cork', name: '코르크판', bg: 'bg-amber-200 border-amber-500' },
                { id: 'blackboard', name: '칠판', bg: 'bg-emerald-900 border-emerald-700 text-white' },
                { id: 'gradient', name: '파스텔', bg: 'bg-gradient-to-r from-purple-200 to-pink-200 border-purple-400' },
                { id: 'warm', name: '포근한 햇살', bg: 'bg-amber-50 border-amber-300' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as BoardTheme)}
                  className={`py-3 px-2 rounded-xl border-2 text-center text-[11px] font-bold transition ${t.bg} ${
                    theme === t.id ? 'ring-2 ring-blue-600 ring-offset-2 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* 공개 여부 & 권한 설정 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>공개 및 참여 권한</span>
            </div>

            <label className="flex items-center justify-between text-xs cursor-pointer">
              <div>
                <span className="text-slate-800 font-bold">학교 전체 공개 공유</span>
                <p className="text-[11px] text-slate-400">해제하면 나만 볼 수 있는 비공개 보드가 됩니다.</p>
              </div>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer pt-2 border-t border-slate-200">
              <span className="text-slate-700">학생들의 카드 작성 허용</span>
              <input
                type="checkbox"
                checked={allowStudentPost}
                onChange={(e) => setAllowStudentPost(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-slate-700">댓글 달기 허용</span>
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-slate-700">공감 반응(좋아요, 박수, 하트) 허용</span>
              <input
                type="checkbox"
                checked={allowReactions}
                onChange={(e) => setAllowReactions(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>보드 삭제</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition"
              >
                저장하기
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
