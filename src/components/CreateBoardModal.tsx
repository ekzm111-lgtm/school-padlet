'use client';

import { useState, useRef } from 'react';
import {
  X,
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
import { Board, BoardLayout, BoardTheme, User } from '@/lib/types';
import { getStoreData, saveStoreData } from '@/lib/store';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCreated: (newBoard: Board) => void;
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

export default function CreateBoardModal({
  isOpen,
  onClose,
  currentUser,
  onCreated,
}: CreateBoardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [layout, setLayout] = useState<BoardLayout>('kanban'); // 기본 모둠 칸반
  const [theme, setTheme] = useState<BoardTheme>('blue');
  const [category, setCategory] = useState<'수업자료' | '모둠활동' | '학급회의' | '자유나눔' | '프로젝트'>('수업자료');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allowStudentPost, setAllowStudentPost] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);

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
        setCoverImageUrl(e.target.result);
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

    // 랜덤 6자리 숫자 코드 생성
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newBoard: Board = {
      id: `board-${Date.now()}`,
      code: randomCode,
      title: title.trim(),
      description: description.trim(),
      layout,
      theme,
      coverImageUrl: coverImageUrl.trim() || undefined,
      category,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      allowStudentPost,
      allowComments,
      allowReactions,
      isLocked: false,
      isPublic: true, // 기본 전체 공유
      columns: ['모둠 1', '모둠 2', '모둠 3'],
      createdAt: new Date().toISOString().split('T')[0],
      postCount: 0,
    };

    const currentData = getStoreData();
    saveStoreData.boards([newBoard, ...currentData.boards]);
    onCreated(newBoard);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">새 협업 보드 만들기</h2>
              <p className="text-[11px] text-slate-400">우리 반 학생들과 실시간으로 나눌 활동 보드를 개설합니다.</p>
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

          {/* 🌟 메인 화면 카드 대표 썸네일 사진 첨부 (메인 화면에서만 사용) */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>메인 카드 대표 사진 첨부 (선택)</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  * 메인 화면 카드에만 표시되며, 보드 안쪽 배경은 입장 후 [배경 꾸미기]에서 자유롭게 변경할 수 있습니다.
                </p>
              </div>
              {coverImageUrl && (
                <button
                  type="button"
                  onClick={() => setCoverImageUrl('')}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  사진 삭제
                </button>
              )}
            </div>

            {/* 첨부된 사진 미리보기 */}
            {coverImageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/30 h-36 w-full shadow-inner group">
                <img
                  src={coverImageUrl}
                  alt="Board cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-bold hover:bg-slate-100 shadow"
                  >
                    사진 변경
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
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
                    원하는 사진을 여기로 드래그하거나 <span className="text-blue-600 underline">클릭하여 첨부</span>하세요
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    JPG, PNG, GIF, WebP (최대 10MB) • 메인 화면 카드 썸네일로 사용됩니다.
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
                    onClick={() => setCoverImageUrl(preset.url)}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition group ${
                      coverImageUrl === preset.url
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
                    {coverImageUrl === preset.url && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 배치 방식 (레이아웃) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">배치 방식 (레이아웃)</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setLayout('kanban')}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                  layout === 'kanban'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Columns className="w-5 h-5 mb-2 text-indigo-600" />
                <div>
                  <div className="font-bold text-xs">칸반 (열 모둠)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">모둠별/단계별 열 분할</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLayout('canvas')}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                  layout === 'canvas'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <LayoutGrid className="w-5 h-5 mb-2 text-blue-600" />
                <div>
                  <div className="font-bold text-xs">자유 캔버스</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">마우스로 자유롭게 드래그</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLayout('grid')}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                  layout === 'grid'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Rows className="w-5 h-5 mb-2 text-teal-600" />
                <div>
                  <div className="font-bold text-xs">격자 그리드</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">정갈한 바둑판 배치</div>
                </div>
              </button>
            </div>
          </div>

          {/* 테마 배경 색상 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              배경 색상 테마 {coverImageUrl && <span className="text-slate-400 font-normal">(사진 미등록 시 메인 카드 색상)</span>}
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

          {/* 권한 및 학생 참여 옵션 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>학생 참여 및 소통 권한 설정</span>
            </div>

            <label className="flex items-center justify-between text-xs cursor-pointer">
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

          {/* 제출 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition"
            >
              보드 개설하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
