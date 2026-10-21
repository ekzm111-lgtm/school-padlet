'use client';

import { useState } from 'react';
import { X, Sparkles, LayoutGrid, Columns, Rows, Palette, ShieldCheck } from 'lucide-react';
import { Board, BoardLayout, BoardTheme, User } from '@/lib/types';
import { getStoreData, saveStoreData } from '@/lib/store';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCreated: (newBoard: Board) => void;
}

export default function CreateBoardModal({
  isOpen,
  onClose,
  currentUser,
  onCreated,
}: CreateBoardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [layout, setLayout] = useState<BoardLayout>('grid');
  const [theme, setTheme] = useState<BoardTheme>('blue');
  const [allowStudentPost, setAllowStudentPost] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);

  if (!isOpen) return null;

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
      authorId: currentUser.id,
      authorName: currentUser.name,
      allowStudentPost,
      allowComments,
      allowReactions,
      isLocked: false,
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
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">새 수업 협업 보드 만들기</h2>
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
              placeholder="예: 3학년 2반 사회 수업: 우리 고장의 문화유산 탐구"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-sm transition"
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

          {/* 레이아웃 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">배치 방식 (레이아웃)</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setLayout('canvas')}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                  layout === 'canvas'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900'
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
                onClick={() => setLayout('kanban')}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                  layout === 'kanban'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900'
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
                onClick={() => setLayout('grid')}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                  layout === 'grid'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900'
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

          {/* 테마 배경 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">배경 테마</label>
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
