/**
 * 표준 경쟁 순위(Standard Competition Ranking, "1224" 순위제) 유틸리티
 * 
 * 규칙:
 * 1. 점수 내림차순으로 정렬합니다.
 * 2. 동점자는 동일한 순위를 받습니다.
 * 3. 다음 점수의 참가자는 앞서 나온 동점자 수만큼 순위가 밀립니다.
 *    (예: 1위가 2명이면 다음 사람은 2위 없이 '3위'가 됨)
 */

export interface RankedItem<T> {
  item: T;
  rank: number;
}

export function calculateCompetitionRanks<T extends { score?: number }>(
  items: T[]
): (T & { rank: number })[] {
  if (!items || items.length === 0) return [];

  // 1. 점수 기준 내림차순 정렬 (점수 같을 때 원래 순서 유지)
  const sorted = [...items].sort((a, b) => (b.score || 0) - (a.score || 0));

  // 2. 표준 경쟁 순위 계산
  let currentRank = 1;
  return sorted.map((entry, index) => {
    if (index > 0) {
      const prevScore = sorted[index - 1].score || 0;
      const currentScore = entry.score || 0;
      if (currentScore < prevScore) {
        // 앞 사람보다 점수가 낮으면 (앞선 인원수 = index) + 1 이 순위
        currentRank = index + 1;
      }
      // 점수가 같으면 이전 currentRank 그대로 유지
    }
    return {
      ...entry,
      rank: currentRank,
    };
  });
}

/**
 * 순위에 따른 뱃지 스타일 및 메달 정보
 */
export function getRankBadgeStyle(rank: number) {
  if (rank === 1) {
    return {
      label: '1위',
      medal: '🥇',
      badgeClass: 'bg-amber-400 text-slate-950 font-black',
      textClass: 'text-amber-400',
      podiumBg: 'bg-gradient-to-b from-amber-400 to-yellow-500',
      podiumBorder: 'border-amber-300',
      isChampion: true,
    };
  }
  if (rank === 2) {
    return {
      label: '2위',
      medal: '🥈',
      badgeClass: 'bg-slate-300 text-slate-950 font-black',
      textClass: 'text-slate-300',
      podiumBg: 'bg-gradient-to-b from-slate-300 to-slate-400',
      podiumBorder: 'border-slate-200',
      isChampion: false,
    };
  }
  if (rank === 3) {
    return {
      label: '3위',
      medal: '🥉',
      badgeClass: 'bg-amber-700 text-white font-black',
      textClass: 'text-amber-600',
      podiumBg: 'bg-gradient-to-b from-amber-600/80 to-amber-800',
      podiumBorder: 'border-amber-600',
      isChampion: false,
    };
  }
  return {
    label: `${rank}위`,
    medal: '🎖️',
    badgeClass: 'bg-slate-800 text-slate-400 font-mono',
    textClass: 'text-slate-400',
    podiumBg: 'bg-slate-800',
    podiumBorder: 'border-slate-700',
    isChampion: false,
  };
}

/**
 * 순위에 따른 시상대(Podium) 단상 동적 높이 및 스타일 설정
 * - 같은 순위(동점자)인 참가자는 반드시 동일한 높이와 동일한 랭크 스타일 단상에 위치함
 */
export interface PodiumStyleConfig {
  rank: number;
  label: string;
  medal: string;
  hasCrown: boolean;
  heightClass: string;
  marginClass: string;
  bgClass: string;
  borderClass: string;
  avatarRingClass: string;
  avatarSizeClass: string;
  textColorClass: string;
}

export function getPodiumStyle(
  rank: number,
  isTie: boolean = false,
  isDesktop: boolean = true
): PodiumStyleConfig {
  if (rank === 1) {
    return {
      rank: 1,
      label: isTie ? '1위 (공동)' : '1위 (챔피언)',
      medal: '🥇',
      hasCrown: true,
      heightClass: isDesktop ? 'h-28' : 'h-24',
      marginClass: isDesktop ? '-mt-6' : '-mt-4',
      bgClass: 'bg-gradient-to-t from-amber-600 to-yellow-500 shadow-2xl',
      borderClass: 'border-t-2 border-yellow-200',
      avatarRingClass: 'border-4 border-white bg-gradient-to-tr from-amber-400 to-yellow-300 ring-4 ring-amber-400/40 shadow-2xl',
      avatarSizeClass: isDesktop ? 'w-20 h-20' : 'w-16 h-16',
      textColorClass: 'text-amber-300',
    };
  }
  if (rank === 2) {
    return {
      rank: 2,
      label: isTie ? '2위 (공동)' : '2위',
      medal: '🥈',
      hasCrown: false,
      heightClass: isDesktop ? 'h-20' : 'h-16',
      marginClass: 'mt-0',
      bgClass: 'bg-gradient-to-t from-slate-700 to-slate-600 shadow-inner',
      borderClass: 'border-t border-slate-400',
      avatarRingClass: 'border-2 border-slate-400 bg-slate-800 shadow-lg',
      avatarSizeClass: isDesktop ? 'w-16 h-16' : 'w-12 h-12',
      textColorClass: 'text-slate-200',
    };
  }
  if (rank === 3) {
    return {
      rank: 3,
      label: isTie ? '3위 (공동)' : '3위',
      medal: '🥉',
      hasCrown: false,
      heightClass: isDesktop ? 'h-16' : 'h-12',
      marginClass: 'mt-0',
      bgClass: 'bg-gradient-to-t from-amber-900 to-amber-800 shadow-inner',
      borderClass: 'border-t border-amber-600',
      avatarRingClass: 'border-2 border-amber-700 bg-slate-800 shadow-md',
      avatarSizeClass: isDesktop ? 'w-16 h-16' : 'w-12 h-12',
      textColorClass: 'text-amber-500',
    };
  }
  return {
    rank,
    label: isTie ? `${rank}위 (공동)` : `${rank}위`,
    medal: '🎖️',
    hasCrown: false,
    heightClass: isDesktop ? 'h-14' : 'h-10',
    marginClass: 'mt-0',
    bgClass: 'bg-gradient-to-t from-slate-800 to-slate-700 shadow-inner',
    borderClass: 'border-t border-slate-600',
    avatarRingClass: 'border-2 border-slate-600 bg-slate-800',
    avatarSizeClass: isDesktop ? 'w-14 h-14' : 'w-10 h-10',
    textColorClass: 'text-slate-400',
  };
}
