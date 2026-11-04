export interface MusicSymbolCategory {
  category: string;
  symbols: { symbol: string; label: string; desc?: string }[];
}

export const MUSIC_SYMBOLS: MusicSymbolCategory[] = [
  {
    category: '음표 (Notes)',
    symbols: [
      { symbol: '♩', label: '4분음표', desc: '1박' },
      { symbol: '♪', label: '8분음표', desc: '1/2박' },
      { symbol: '♫', label: '두 8분음표', desc: '1박' },
      { symbol: '♬', label: '16분음표', desc: '1/4박' },
      { symbol: '𝅝', label: '온음표', desc: '4박' },
      { symbol: '𝅗𝅥', label: '2분음표', desc: '2박' },
      { symbol: '♩.', label: '점4분음표', desc: '1.5박' },
      { symbol: '♪.', label: '점8분음표', desc: '0.75박' },
      { symbol: '𝅘𝅥𝅰', label: '32분음표', desc: '1/8박' },
    ],
  },
  {
    category: '쉼표 (Rests)',
    symbols: [
      { symbol: '𝄽', label: '4분쉼표', desc: '1박 쉬기' },
      { symbol: '𝄾', label: '8분쉼표', desc: '1/2박 쉬기' },
      { symbol: '𝄿', label: '16분쉼표', desc: '1/4박 쉬기' },
      { symbol: '𝄼', label: '2분쉼표', desc: '2박 쉬기' },
      { symbol: '𝄻', label: '온쉼표', desc: '4박 또는 한마디 전체' },
    ],
  },
  {
    category: '조표 및 임시표 (Accidentals)',
    symbols: [
      { symbol: '♯', label: '올림표 (Sharp)', desc: '반음 올림' },
      { symbol: '♭', label: '내림표 (Flat)', desc: '반음 내림' },
      { symbol: '♮', label: '제자리표 (Natural)', desc: '원래 음으로 환원' },
      { symbol: '𝄪', label: '겹올림표 (Double Sharp)', desc: '온음 올림' },
      { symbol: '𝄫', label: '겹내림표 (Double Flat)', desc: '온음 내림' },
    ],
  },
  {
    category: '박자표 (Time Signatures)',
    symbols: [
      { symbol: '4/4', label: '4분의 4박자' },
      { symbol: '3/4', label: '4분의 3박자' },
      { symbol: '2/4', label: '4분의 2박자' },
      { symbol: '6/8', label: '8분의 6박자' },
      { symbol: '3/8', label: '8분의 3박자' },
      { symbol: '𝄴', label: 'Common time (4/4)' },
      { symbol: '𝄵', label: 'Cut time (2/2)' },
    ],
  },
  {
    category: '셈여림표 (Dynamics)',
    symbols: [
      { symbol: 'pp', label: '피아니시모 (매우 여리게)' },
      { symbol: 'p', label: '피아노 (여리게)' },
      { symbol: 'mp', label: '메조피아노 (조금 여리게)' },
      { symbol: 'mf', label: '메조포르테 (조금 세게)' },
      { symbol: 'f', label: '포르테 (세게)' },
      { symbol: 'ff', label: '포르티시모 (매우 세게)' },
      { symbol: 'cresc.', label: '크레셴도 (점점 세게)' },
      { symbol: 'decresc.', label: '데크레셴도 (점점 여리게)' },
      { symbol: 'dim.', label: '디미누엔도 (점점 여리게)' },
    ],
  },
  {
    category: '연주 기호 및 도돌이표 (Articulations)',
    symbols: [
      { symbol: '𝄐', label: '페르마타 (늘임표)' },
      { symbol: '·', label: '스타카토' },
      { symbol: '>', label: '악센트' },
      { symbol: '-', label: '테누토' },
      { symbol: '𝄆', label: '도돌이표 (시작)' },
      { symbol: '𝄇', label: '도돌이표 (끝)' },
      { symbol: 'D.C.', label: '다 카포' },
      { symbol: 'D.S.', label: '달 세뇨' },
      { symbol: 'Fine', label: '피네 (끝)' },
      { symbol: 'Coda', label: '코다' },
    ],
  },
  {
    category: '원문자 및 기호 (Symbols)',
    symbols: [
      { symbol: '①', label: '1번' },
      { symbol: '②', label: '2번' },
      { symbol: '③', label: '3번' },
      { symbol: '④', label: '4번' },
      { symbol: '⑤', label: '5번' },
      { symbol: '㉠', label: '기역' },
      { symbol: '㉡', label: '니은' },
      { symbol: '㉢', label: '디귿' },
      { symbol: '㉣', label: '리을' },
      { symbol: '㉤', label: '미음' },
    ],
  },
];
