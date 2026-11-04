import React, { useState } from 'react';
import { MUSIC_SYMBOLS } from '@/utils/musicSymbols';
import { X, Sparkles, Check } from 'lucide-react';

interface MusicSymbolPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
}

export const MusicSymbolPicker: React.FC<MusicSymbolPickerProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(MUSIC_SYMBOLS[0].category);
  const [recentInserted, setRecentInserted] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInsert = (sym: string) => {
    onSelectSymbol(sym);
    setRecentInserted(sym);
    setTimeout(() => setRecentInserted(null), 1200);
  };

  const currentCategory = MUSIC_SYMBOLS.find((c) => c.category === activeCategory) || MUSIC_SYMBOLS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              ♩
            </span>
            <h3 className="font-bold text-slate-800 text-sm">음악 기호 및 음표 입력기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex overflow-x-auto border-b border-slate-200 px-3 pt-2 gap-1 bg-slate-50/50 scrollbar-none">
          {MUSIC_SYMBOLS.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(cat.category)}
              className={`px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-t-lg transition border-b-2 ${
                activeCategory === cat.category
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat.category.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* 기호 그리드 목록 */}
        <div className="p-5 max-h-[340px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">{currentCategory.category}</span>
            {recentInserted && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-pulse">
                <Check size={13} /> '{recentInserted}' 삽입됨
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {currentCategory.symbols.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsert(item.symbol)}
                className="group flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/60 hover:shadow-sm transition active:scale-95 text-center"
              >
                <span className="text-2xl font-serif text-slate-900 group-hover:text-indigo-700 group-hover:scale-110 transition h-8 flex items-center justify-center">
                  {item.symbol}
                </span>
                <span className="text-[11px] font-medium text-slate-600 mt-1 truncate max-w-full">
                  {item.label}
                </span>
                {item.desc && (
                  <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                    {item.desc}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" />
            클릭하면 커서 위치 또는 선택된 보기에 바로 입력됩니다
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
