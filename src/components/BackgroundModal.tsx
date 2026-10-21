'use client';

import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Upload, Sparkles, Check, Palette } from 'lucide-react';
import { Board, BoardTheme } from '@/lib/types';
import { getStoreData, saveStoreData } from '@/lib/store';

interface BackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  onUpdated: (updatedBoard: Board) => void;
}

export const PRESET_BACKGROUNDS = [
  {
    id: 'blackboard',
    name: '교실 칠판',
    type: 'theme',
    theme: 'blackboard',
    preview: 'bg-emerald-900 text-white',
  },
  {
    id: 'cork',
    name: '코르크 보드',
    type: 'theme',
    theme: 'cork',
    preview: 'bg-amber-200 text-amber-900',
  },
  {
    id: 'blue',
    name: '맑은 하늘',
    type: 'theme',
    theme: 'blue',
    preview: 'bg-blue-200 text-blue-900',
  },
  {
    id: 'warm',
    name: '포근한 노을',
    type: 'theme',
    theme: 'warm',
    preview: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'gradient',
    name: '파스텔 그라데이션',
    type: 'theme',
    theme: 'gradient',
    preview: 'bg-gradient-to-r from-purple-200 to-pink-200 text-purple-900',
  },
  {
    id: 'nature',
    name: '초록 숲과 자연',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&auto=format&fit=crop&q=80',
    preview: 'bg-emerald-800 text-white',
  },
  {
    id: 'galaxy',
    name: '우주 은하수',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80',
    preview: 'bg-slate-900 text-white',
  },
  {
    id: 'library',
    name: '도서관 서재',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1600&auto=format&fit=crop&q=80',
    preview: 'bg-amber-900 text-white',
  },
  {
    id: 'ocean',
    name: '시원한 바다',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
    preview: 'bg-sky-700 text-white',
  },
];

export default function BackgroundModal({
  isOpen,
  onClose,
  board,
  onUpdated,
}: BackgroundModalProps) {
  const [customUrl, setCustomUrl] = useState(board.customBgUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 프리셋 선택
  const handleSelectPreset = (preset: typeof PRESET_BACKGROUNDS[0]) => {
    let updated: Board;
    if (preset.type === 'image' && preset.url) {
      updated = { ...board, customBgUrl: preset.url };
    } else {
      updated = { ...board, theme: preset.theme as BoardTheme, customBgUrl: undefined };
    }

    const data = getStoreData();
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updated : b)));
    onUpdated(updated);
    onClose();
  };

  // 내 컴퓨터 사진 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const bgDataUrl = event.target.result as string;
          const updated: Board = { ...board, customBgUrl: bgDataUrl };
          const data = getStoreData();
          saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updated : b)));
          onUpdated(updated);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 직접 URL 입력 적용
  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    const updated: Board = { ...board, customBgUrl: customUrl.trim() };
    const data = getStoreData();
    saveStoreData.boards(data.boards.map((b) => (b.id === board.id ? updated : b)));
    onUpdated(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">보드 배경화면 꾸미기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* 내 사진 직접 올리기 */}
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 text-center space-y-2">
            <div className="text-xs font-bold text-purple-900">
              🖼️ 내 컴퓨터 사진으로 배경 지정 (개인 맞춤)
            </div>
            <p className="text-[11px] text-purple-700">
              학급 단체사진, 동아리 로고, 예쁜 풍경 사진 등을 올려 우리 반만의 보드를 꾸며보세요.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>내 컴퓨터에서 사진 선택하기</span>
            </button>
          </div>

          {/* 기본 추천 고화질 배경 프리셋 */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>기본 추천 배경 (원클릭 적용)</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {PRESET_BACKGROUNDS.map((p) => {
                const isSelected =
                  p.type === 'image'
                    ? board.customBgUrl === p.url
                    : board.theme === p.theme && !board.customBgUrl;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`relative p-3 rounded-2xl border-2 text-center text-xs font-bold transition flex flex-col items-center justify-center min-h-[70px] ${
                      p.preview
                    } ${
                      isSelected
                        ? 'ring-2 ring-blue-600 ring-offset-2 scale-102 shadow-md'
                        : 'opacity-85 hover:opacity-100 hover:scale-102'
                    }`}
                  >
                    <span>{p.name}</span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 p-0.5 bg-blue-600 text-white rounded-full">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 웹 이미지 URL 입력 */}
          <form onSubmit={handleApplyCustomUrl} className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-bold text-slate-600">
              인터넷 이미지 링크(URL)로 지정하기
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://... 이미지 웹 주소 입력"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                적용
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
