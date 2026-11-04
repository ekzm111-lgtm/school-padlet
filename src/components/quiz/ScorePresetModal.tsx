import React from 'react';
import { X, Music2 } from 'lucide-react';

interface ScorePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (abc: string) => void;
}

interface PresetItem {
  name: string;
  category: string;
  description: string;
  abc: string;
}

const PRESETS: PresetItem[] = [
  {
    name: '단일 음 (도 C4)',
    category: '음이름/계이름',
    description: '높은음자리표 가운데 도(가온다)',
    abc: `X:1\nM:C\nL:1/1\nK:C\nC |]`,
  },
  {
    name: '음계 스케일 (다장조 8음)',
    category: '음이름/계이름',
    description: '도-레-미-파-솔-라-시-도 8분음표 상행',
    abc: `X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |]`,
  },
  {
    name: '장 3도 음정 (C - E)',
    category: '음정(Interval)',
    description: '도(C)와 미(E) 동시 연주 화성 음정',
    abc: `X:1\nM:C\nL:1/1\nK:C\n[CE] |]`,
  },
  {
    name: '완전 5도 음정 (C - G)',
    category: '음정(Interval)',
    description: '도(C)와 솔(G) 완전5도 음정',
    abc: `X:1\nM:C\nL:1/1\nK:C\n[CG] |]`,
  },
  {
    name: '단 3도 음정 (C - Eb)',
    category: '음정(Interval)',
    description: '도(C)와 내림미(_E) 단3도 음정',
    abc: `X:1\nM:C\nL:1/1\nK:C\n[C_E] |]`,
  },
  {
    name: '다장조 으뜸화음 (C Major, C-E-G)',
    category: '화음/코드',
    description: 'C 3화음',
    abc: `X:1\nM:C\nL:1/1\nK:C\n[CEG] |]`,
  },
  {
    name: '사장조 딸림화음 (G Major, G-B-D)',
    category: '화음/코드',
    description: 'G 3화음',
    abc: `X:1\nM:C\nL:1/1\nK:C\n[GBd] |]`,
  },
  {
    name: '가단조 으뜸화음 (A minor, A-C-E)',
    category: '화음/코드',
    description: 'Am 3화음',
    abc: `X:1\nM:C\nL:1/1\nK:C\n[Ace] |]`,
  },
  {
    name: '올림표 1개 조표 (사장조 G Major)',
    category: '조표/박자',
    description: 'F# 조표가 붙은 2마디 예시',
    abc: `X:1\nM:4/4\nL:1/4\nK:G\nG A B c | d2 G2 |]`,
  },
  {
    name: '내림표 1개 조표 (바장조 F Major)',
    category: '조표/박자',
    description: 'Bb 조표가 붙은 2마디 예시',
    abc: `X:1\nM:4/4\nL:1/4\nK:F\nF G A B | c2 F2 |]`,
  },
  {
    name: '박자/쉼표 빈칸 문제 템플릿',
    category: '리듬/박자',
    description: '4분의 4박자 중 1박 쉼표(z) 자리 비우기',
    abc: `X:1\nM:4/4\nL:1/4\nK:C\nc2 c z |]`,
  },
  {
    name: '당김음(Syncopation) 리듬',
    category: '리듬/박자',
    description: '8분-4분-8분음표 당김음 패턴',
    abc: `X:1\nM:4/4\nL:1/8\nK:C\nc d2 c c4 |]`,
  },
  {
    name: '동요 멜로디 (비행기 청음용)',
    category: '청음/선율',
    description: '미-레-도-레-미-미-미',
    abc: `X:1\nM:4/4\nL:1/4\nK:C\ne d c d | e e e2 | d d d2 | e g g2 |]`,
  },
];

export const ScorePresetModal: React.FC<ScorePresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Music2 className="text-indigo-600" size={20} />
            <h2 className="font-semibold text-slate-800 text-lg">악보 프리셋 템플릿 선택</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 목록 */}
        <div className="p-6 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-500 mb-2">
            자주 출제되는 음악 시험용 악보 템플릿입니다. 원하는 항목을 클릭하면 ABC 코드가 자동으로 입력됩니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESETS.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSelectPreset(item.abc);
                  onClose();
                }}
                className="group border border-slate-200 rounded-lg p-3.5 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-sm text-slate-800 group-hover:text-indigo-700">
                      {item.name}
                    </span>
                    <span className="text-[11px] font-medium bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-800 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-400 truncate">
                  {item.abc.replace(/\n/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
