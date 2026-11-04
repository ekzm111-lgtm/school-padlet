import React, { useState, useEffect } from 'react';
import type { QuizAvatar } from '@/types/quiz';
import { Sparkles, Flame } from 'lucide-react';

export type CheeringState = 'thinking' | 'hurry' | 'correct' | 'wrong' | 'combo' | 'cheer' | 'sad';

interface CheeringCharacterProps {
  avatar: QuizAvatar;
  state: CheeringState;
  comboCount?: number;
  className?: string;
}

export const CheeringCharacter: React.FC<CheeringCharacterProps> = ({
  avatar,
  state: rawState,
  comboCount = 0,
  className = '',
}) => {
  // 상태 정규화: 'cheer' -> 'correct', 'sad' -> 'wrong'
  const state: 'thinking' | 'hurry' | 'correct' | 'wrong' | 'combo' =
    rawState === 'cheer' ? 'correct' : rawState === 'sad' ? 'wrong' : rawState;

  const [bubbleText, setBubbleText] = useState<string>('');
  const [isWiggling, setIsWiggling] = useState(false);

  // 상태 변화 시 말풍선 대사 업데이트
  useEffect(() => {
    const quoteList =
      avatar.quotes[state] ||
      avatar.quotes.thinking ||
      [`${avatar.name}가 응원하고 있어!`];
    const picked = quoteList[Math.floor(Math.random() * quoteList.length)];
    setBubbleText(picked);

    // 상태 변화 애니메이션 트리거
    setIsWiggling(true);
    const t = setTimeout(() => setIsWiggling(false), 800);
    return () => clearTimeout(t);
  }, [state, avatar]);

  // 상태별 이모지 및 애니메이션 효과
  let emotionIcon = '✨';
  let badgeText = '생각 중...';
  let borderGlow = 'border-slate-700/60 shadow-lg';

  if (state === 'hurry') {
    emotionIcon = '⏰';
    badgeText = '서둘러!';
    borderGlow = 'border-rose-500 shadow-rose-500/20 shadow-xl animate-pulse';
  } else if (state === 'correct') {
    emotionIcon = '🎉';
    badgeText = '정답!!';
    borderGlow = 'border-emerald-400 shadow-emerald-400/30 shadow-2xl';
  } else if (state === 'wrong') {
    emotionIcon = '🥺';
    badgeText = '힘내!';
    borderGlow = 'border-slate-600 shadow-md';
  } else if (state === 'combo') {
    emotionIcon = '🔥';
    badgeText = `${comboCount} 콤보!`;
    borderGlow = 'border-amber-400 shadow-amber-400/40 shadow-2xl';
  }

  return (
    <div className={`relative flex items-end gap-3 select-none ${className}`}>
      {/* 1. 말풍선 (동적 대사) */}
      <div className="relative bg-white text-slate-900 px-3.5 py-2.5 rounded-2xl shadow-xl border-2 border-indigo-200 text-xs font-bold max-w-[210px] sm:max-w-xs animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-extrabold uppercase mb-0.5">
          <Sparkles size={11} />
          <span>{avatar.name}</span>
          <span className="text-slate-400 font-normal">({avatar.title})</span>
        </div>
        <p className="leading-snug text-slate-800 text-[11px] sm:text-xs tracking-tight font-medium">
          {bubbleText}
        </p>

        {/* 말풍선 꼬리표 */}
        <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r-2 border-b-2 border-indigo-200 transform rotate-45" />
      </div>

      {/* 2. 캐릭터 본체 (아바타 이모지 & 모션 연출) */}
      <div className="relative shrink-0 flex flex-col items-center">
        {/* 상태 배지 */}
        <div className="absolute -top-3 z-10 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-black border border-slate-700 shadow-sm flex items-center gap-1">
          {state === 'combo' ? <Flame size={10} className="text-orange-400" /> : <span>{emotionIcon}</span>}
          <span>{badgeText}</span>
        </div>

        {/* 원형 아바타 박스 (2등신 고화질 일러스트 우선 렌더링) */}
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center overflow-hidden transition transform ${avatar.bgColor} ${borderGlow} ${
            isWiggling ? 'scale-110 -rotate-6' : 'hover:scale-105'
          } ${state === 'correct' ? 'animate-bounce' : ''}`}
        >
          {avatar.imageUrl ? (
            <img
              src={avatar.imageUrl}
              alt={avatar.name}
              className="w-full h-full object-cover p-1 drop-shadow-md select-none pointer-events-none"
              onError={(e) => {
                // 이미지 로드 실패 시 이모지로 fallback
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-3xl sm:text-4xl">{avatar.emoji}</span>
          )}
        </div>

        {/* 하단 그림자 */}
        <div className="w-12 h-2 bg-black/25 rounded-full blur-2xs mt-1" />
      </div>
    </div>
  );
};
