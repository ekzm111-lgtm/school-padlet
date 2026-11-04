import type { QuizAvatar } from '@/types/quiz';

const STORAGE_KEY_COLLECTED_AVATARS = 'quiz_collected_chibi_avatars';

// 2등신 치비(Chibi) 캐릭터 웹 수집 프리셋 키워드
export const CHIBI_WEB_KEYWORDS = [
  { label: '🐸 귀요미 개구리', keyword: 'cute-frog', style: 'bottts', category: 'animal' as const },
  { label: '🐱 하얀 아기 고양이', keyword: 'white-cat', style: 'adventurer', category: 'animal' as const },
  { label: '🔥 열혈 치비 파이터', keyword: 'anime-fighter', style: 'adventurer', category: 'anime' as const },
  { label: '⚔️ 귀살대 검사', keyword: 'demon-slayer', style: 'adventurer', category: 'anime' as const },
  { label: '🌟 별빛 마법소녀', keyword: 'sailor-magic', style: 'adventurer', category: 'anime' as const },
  { label: '🎧 스트리트 힙합 소년', keyword: 'street-boy', style: 'adventurer', category: 'anime' as const },
  { label: '🎀 양갈래 후드 소녀', keyword: 'hoodie-girl', style: 'adventurer', category: 'anime' as const },
  { label: '🤖 미니 사이버 로봇', keyword: 'cyber-bot', style: 'bottts', category: 'hero' as const },
  { label: '🦖 아기 공룡', keyword: 'baby-dino', style: 'fun-emoji', category: 'animal' as const },
  { label: '⚡ 번개 히어로', keyword: 'thunder-hero', style: 'adventurer', category: 'hero' as const },
];

/**
 * 웹 DiceBear 2등신(Chibi/Anime) 벡터 일러스트 URL 생성기
 */
export function buildChibiAvatarUrl(
  style: 'adventurer' | 'lorelei' | 'bottts' | 'fun-emoji' | 'big-smile',
  seed: string,
  bgColors = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf']
): string {
  const bg = bgColors.join(',');
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&radius=20`;
}

/**
 * 사용자가 웹상에서 새로운 2등신 캐릭터를 자동 수집/생성할 때 호출
 */
export function collectNewChibiAvatar(
  customName: string,
  category: 'anime' | 'animal' | 'hero' = 'anime',
  style: 'adventurer' | 'lorelei' | 'bottts' | 'fun-emoji' | 'big-smile' = 'adventurer'
): QuizAvatar {
  const seed = `${customName}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const imageUrl = buildChibiAvatarUrl(style, seed);

  const emojiMap: Record<string, string> = {
    anime: '🌟',
    animal: '🐾',
    hero: '⚡',
  };

  const newAvatar: QuizAvatar = {
    id: `web_chibi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    emoji: emojiMap[category] || '✨',
    imageUrl,
    name: customName || '2등신 치비',
    title: '웹 수집 2등신 캐릭터',
    category,
    bgColor: 'bg-indigo-600 text-white',
    catchphrase: `${customName}! 퀴즈 함께 만점 받자! ✨`,
    quotes: {
      thinking: [
        `${customName}와 함께 차근차근 읽어보자! 🔍`,
        '지문 속에 정답의 단서가 있어! 집중! ✨',
        '우린 최고의 짝꿍이야! 잘 풀 수 있어!',
      ],
      hurry: [
        '시간이 얼마 안 남았어! 빠르게 콕 찍어! ⏰',
        '서둘러! 직감으로 첫 번째로 떠오른 것!',
      ],
      correct: [
        `와아아!! ${customName}가 전하는 완벽한 정답! 🎉`,
        '대단해! 100점 만점에 100점이야! ✨🏆',
      ],
      wrong: [
        '아쉽지만 괜찮아! 다음 문제는 꼭 맞히자! 💪',
        `${customName}가 곁에서 끝까지 응원할게! 🌱`,
      ],
      combo: [
        `🔥 슈퍼 콤보 대폭발! ${customName} 파워업!! 🚀`,
        '연속 정답 질주다! 아무도 우릴 막을 수 없어! 👑',
      ],
    },
  };

  // 로컬스토리지에 저장
  saveCollectedAvatar(newAvatar);
  return newAvatar;
}

/**
 * 로컬스토리지에서 웹 수집 캐릭터 불러오기
 */
export function getSavedCollectedAvatars(): QuizAvatar[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLLECTED_AVATARS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 웹 수집 캐릭터 영구 저장
 */
export function saveCollectedAvatar(avatar: QuizAvatar): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getSavedCollectedAvatars();
    const updated = [avatar, ...list.filter((a) => a.id !== avatar.id)];
    localStorage.setItem(STORAGE_KEY_COLLECTED_AVATARS, JSON.stringify(updated.slice(0, 30)));
  } catch {}
}
