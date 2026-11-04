import React, { useRef, useState, useLayoutEffect } from 'react';

interface EntryBlockViewerProps {
  blocks: string[];
  className?: string;
}

// 블록 카테고리별 엔트리 정품 공식 색상 팔레트 (playentry.org 공식 theme)
export function getBlockStyle(line: string) {
  const trimmed = line.trim();

  // 0. 빈칸 블록 (시험 문제용 ㉠, ㉡ 등)
  if (/^(\[?\s*㉠\s*\]?|\(?\s*㉠\s*\)?|㉠|㉡|㉢|__+)$/.test(trimmed)) {
    return {
      bg: '#FEF9C3', // 연한 노란색
      border: '#D97706', // 주황 테두리
      isDashed: true,
      isHat: false,
      isBlank: true,
      type: 'blank',
    };
  }

  // 1. 시작 블록 (엔트리 공식 초록색)
  if (
    trimmed.includes('클릭했을 때') ||
    trimmed.includes('키를 눌렀을 때') ||
    trimmed.includes('시작하기') ||
    trimmed.includes('신호를 받았을 때')
  ) {
    return {
      bg: '#10D35E',
      border: '#13BF68',
      isHat: true,
      isBlank: false,
      type: 'start',
    };
  }

  // 2. 흐름 블록 (반복문, 조건문 등 - 엔트리 공식 파란색/하늘색)
  if (
    trimmed.includes('반복하기') ||
    trimmed.includes('만일') ||
    trimmed.includes('만약') ||
    trimmed.includes('기다리기') ||
    trimmed.includes('멈추기') ||
    trimmed.includes('아니면')
  ) {
    return {
      bg: '#31C1EC',
      border: '#08ACDD',
      isHat: false,
      isBlank: false,
      type: 'flow',
    };
  }

  // 3. 움직임 블록 (엔트리 공식 보라색)
  if (
    trimmed.includes('움직이기') ||
    trimmed.includes('이동') ||
    trimmed.includes('좌표') ||
    trimmed.includes('회전') ||
    trimmed.includes('방향') ||
    trimmed.includes('튕기기')
  ) {
    return {
      bg: '#BF63FF',
      border: '#B13EFE',
      isHat: false,
      isBlank: false,
      type: 'motion',
    };
  }

  // 4. 생김새 블록 (엔트리 공식 분홍색/다홍색)
  if (
    trimmed.includes('말하기') ||
    trimmed.includes('모양') ||
    trimmed.includes('숨기기') ||
    trimmed.includes('보이기') ||
    trimmed.includes('크기')
  ) {
    return {
      bg: '#FF5174',
      border: '#EE3157',
      isHat: false,
      isBlank: false,
      type: 'looks',
    };
  }

  // 5. 소리 블록 (엔트리 공식 연두/라임색)
  if (trimmed.includes('소리') || trimmed.includes('연주') || trimmed.includes('음')) {
    return {
      bg: '#82D214',
      border: '#6EBC02',
      isHat: false,
      isBlank: false,
      type: 'sound',
    };
  }

  // 6. 자료(변수) 블록 (엔트리 공식 마젠타/보라분홍색)
  if (trimmed.includes('변수') || trimmed.includes('정하기') || trimmed.includes('더하기')) {
    return {
      bg: '#F57DF1',
      border: '#EC52E7',
      isHat: false,
      isBlank: false,
      type: 'variable',
    };
  }

  // 7. 계산 블록 (엔트리 공식 주황/노란색)
  if (
    trimmed.includes('계산') ||
    trimmed.includes('빼기') ||
    trimmed.includes('곱하기') ||
    trimmed.includes('나누기') ||
    trimmed.includes('난수')
  ) {
    return {
      bg: '#FEB71A',
      border: '#FF9C00',
      isHat: false,
      isBlank: false,
      type: 'calc',
    };
  }

  // 8. 판단 블록 (엔트리 공식 인디고/블루바이올렛)
  return {
    bg: '#7E8EFE',
    border: '#1B3AD8',
    isHat: false,
    isBlank: false,
    type: 'judgement',
  };
}

// 한국어 조사((으)로 등) 보호 및 엔트리 변수/값/조건 인라인 슬롯 렌더링
export function renderBlockContent(text: string) {
  const safeText = text
    .replace(/\(으\)로/g, '___EU_RO___')
    .replace(/\(이\)가/g, '___I_GA___')
    .replace(/\(을\)를/g, '___EUL_REUL___')
    .replace(/\(은\)는/g, '___EUN_NEUN___');

  const parts = safeText.split(/(<[^>]+>|\[[^\]]+\]|\([^\)]+\))/g);

  return parts.map((rawPart, idx) => {
    const part = rawPart
      .replace(/___EU_RO___/g, '(으)로')
      .replace(/___I_GA___/g, '(이)가')
      .replace(/___EUL_REUL___/g, '(을)를')
      .replace(/___EUN_NEUN___/g, '(은)는');

    if (!part) return null;

    // 1. 육각형 판단 블록 < ... >
    if (part.startsWith('<') && part.endsWith('>')) {
      const inner = part.slice(1, -1).trim();
      const isBlank = !inner || inner.includes('㉠') || inner.includes('㉡') || inner.includes('㉢');
      return (
        <span
          key={idx}
          className={`inline-flex items-center px-2 py-0.5 mx-1 font-bold text-xs shadow-2xs ${
            isBlank
              ? 'bg-amber-300 text-amber-950 border-2 border-dashed border-amber-600'
              : 'bg-[#7E8EFE] text-white border border-[#1B3AD8]'
          }`}
          style={{
            clipPath: 'polygon(6px 0%, calc(100% - 6px) 0%, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0% 50%)',
            paddingLeft: '8px',
            paddingRight: '8px',
          }}
        >
          {inner || '㉠'}
        </span>
      );
    }

    // 2. 변수 또는 빈칸 슬롯 [ ... ]
    if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1).trim();
      const isBlank = !inner || inner.includes('㉠') || inner.includes('㉡') || inner.includes('㉢');

      if (isBlank) {
        return (
          <span
            key={idx}
            className="inline-flex items-center justify-center px-2.5 py-0.5 mx-1 font-black text-amber-950 bg-amber-300 border-2 border-dashed border-amber-600 rounded-[4px] shadow-2xs text-xs tracking-wider animate-pulse"
          >
            {inner || '㉠'}
          </span>
        );
      }

      // 변수 슬롯 (엔트리 공식 변수 라벨 박스)
      return (
        <span
          key={idx}
          className="inline-flex items-center justify-center px-2 py-0.5 mx-1 font-bold text-xs rounded-[4px] bg-black/20 text-white border border-white/20 shadow-inner tracking-tight"
        >
          {inner}
        </span>
      );
    }

    // 3. 숫자 또는 둥근 입력값 슬롯 ( ... )
    if (part.startsWith('(') && part.endsWith(')')) {
      const inner = part.slice(1, -1).trim();
      const isBlank = !inner || inner.includes('㉠') || inner.includes('㉡') || inner.includes('㉢');

      if (isBlank) {
        return (
          <span
            key={idx}
            className="inline-flex items-center justify-center px-2.5 py-0.5 mx-1 font-black text-amber-950 bg-amber-300 border-2 border-dashed border-amber-600 rounded-full shadow-2xs text-xs tracking-wider animate-pulse"
          >
            {inner || '㉠'}
          </span>
        );
      }

      // 일반 숫자/문자열 입력 필드 (엔트리 공식 흰색 타원 알약)
      return (
        <span
          key={idx}
          className="inline-flex items-center justify-center px-2.5 py-0.5 mx-1 font-bold text-xs rounded-full bg-white text-slate-800 shadow-2xs border border-slate-300 tracking-tight"
        >
          {inner}
        </span>
      );
    }

    // 일반 본문 텍스트
    return <span key={idx}>{part}</span>;
  });
}

// -------------------------------------------------------------
// [엔트리 공식 SVG 지오메트리 상수 및 패스 생성 함수]
// -------------------------------------------------------------
const NOTCH_X = 14;   // 결합 홈/돌기 시작 X좌표 (블록 좌측 모서리에서 14px 떨어짐)
const NOTCH_W = 14;   // 결합 홈/돌기 가로 폭
const NOTCH_H = 4.5;  // 결합 홈/돌기 깊이/높이
const CORNER_R = 5;   // 블록 네 모서리 곡률 반경

/**
 * 1. 일반 명령 블록 SVG 패스 (좌우 둥근 모서리 + 상단 홈 + 하단 돌기)
 * 시작/끝 모서리가 부드럽게 둥글어서 꼬리 튀어나옴 현상이 없습니다.
 */
function getBasicBlockPath(W: number, H: number): string {
  const r = CORNER_R;
  const nx = NOTCH_X;
  const nw = NOTCH_W;
  const nh = NOTCH_H;

  return `
    M 0 ${r}
    a ${r} ${r} 0 0 1 ${r} -${r}
    L ${nx} 0
    L ${nx + 3} ${nh}
    L ${nx + nw - 3} ${nh}
    L ${nx + nw} 0
    L ${W - r} 0
    a ${r} ${r} 0 0 1 ${r} ${r}
    L ${W} ${H - r}
    a ${r} ${r} 0 0 1 -${r} ${r}
    L ${nx + nw} ${H}
    L ${nx + nw - 3} ${H + nh}
    L ${nx + 3} ${H + nh}
    L ${nx} ${H}
    L ${r} ${H}
    a ${r} ${r} 0 0 1 -${r} -${r}
    Z
  `;
}

/**
 * 2. 시작 이벤트 블록 SVG 패스 (상단 아치 모자 캡 + 하단 돌기)
 * 하단 돌기 X좌표가 일반 블록의 상단 홈과 100% 동일한 위치(NOTCH_X)에 정확히 정렬됩니다.
 */
function getEventBlockPath(W: number, bodyH: number): string {
  const r = CORNER_R;
  const nx = NOTCH_X;
  const nw = NOTCH_W;
  const nh = NOTCH_H;
  const hatTop = 10; // 모자 아치 상단선 y좌표
  const totalH = hatTop + bodyH;

  return `
    M 0 14
    C 0 4 8 0 20 0
    L 38 0
    C 50 0 56 7 62 ${hatTop}
    L ${W - r} ${hatTop}
    a ${r} ${r} 0 0 1 ${r} ${r}
    L ${W} ${totalH - r}
    a ${r} ${r} 0 0 1 -${r} ${r}
    L ${nx + nw} ${totalH}
    L ${nx + nw - 3} ${totalH + nh}
    L ${nx + 3} ${totalH + nh}
    L ${nx} ${totalH}
    L ${r} ${totalH}
    a ${r} ${r} 0 0 1 -${r} -${r}
    L 0 14
    Z
  `;
}

// -------------------------------------------------------------
// [블록 컴포넌트들]
// -------------------------------------------------------------

/**
 * 1. 일반 명령 블록 컴포넌트
 */
const EntryBasicBlockItem: React.FC<{
  text: string;
  style: ReturnType<typeof getBlockStyle>;
}> = ({ text, style }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(130);
  const height = 30;

  useLayoutEffect(() => {
    if (contentRef.current) {
      const measured = contentRef.current.getBoundingClientRect().width;
      setContentWidth(Math.max(80, Math.ceil(measured) + 24));
    }
  }, [text]);

  const totalW = contentWidth;
  const pathD = getBasicBlockPath(totalW, height);

  const isDashed = (style as any).isDashed;
  const isBlank = (style as any).isBlank;

  return (
    <div className="relative inline-flex items-center select-none -mt-[4.5px] first:mt-0 drop-shadow-xs">
      <svg
        width={totalW + 2}
        height={height + NOTCH_H + 2}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <path
          d={pathD}
          fill={style.bg}
          stroke={style.border}
          strokeWidth={isDashed ? '2' : '1.5'}
          strokeDasharray={isDashed ? '4 3' : 'none'}
          strokeLinejoin="round"
        />
      </svg>
      <div
        ref={contentRef}
        style={{ height: `${height}px`, minWidth: `${contentWidth}px` }}
        className={`relative z-10 flex items-center pl-4 pr-3 text-xs font-bold tracking-tight whitespace-nowrap ${
          isBlank ? 'text-amber-950 font-black' : 'text-white'
        }`}
      >
        <span className="flex items-center flex-wrap gap-0.5 drop-shadow-2xs">
          {renderBlockContent(text)}
        </span>
      </div>
    </div>
  );
};

/**
 * 2. 시작 이벤트 블록 컴포넌트
 */
const EntryEventBlockItem: React.FC<{
  text: string;
  style: ReturnType<typeof getBlockStyle>;
}> = ({ text, style }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(140);
  const bodyHeight = 28;
  const hatTop = 10;

  useLayoutEffect(() => {
    if (contentRef.current) {
      const measured = contentRef.current.getBoundingClientRect().width;
      setContentWidth(Math.max(110, Math.ceil(measured) + 28));
    }
  }, [text]);

  const totalW = contentWidth;
  const pathD = getEventBlockPath(totalW, bodyHeight);

  return (
    <div className="relative inline-flex items-center select-none first:mt-0 drop-shadow-xs">
      <svg
        width={totalW + 2}
        height={hatTop + bodyHeight + NOTCH_H + 2}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <path
          d={pathD}
          fill={style.bg}
          stroke={style.border}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div
        ref={contentRef}
        style={{
          height: `${hatTop + bodyHeight}px`,
          paddingTop: `${hatTop}px`,
          minWidth: `${contentWidth}px`,
        }}
        className="relative z-10 flex items-center pl-5 pr-4 text-white text-xs font-bold tracking-tight whitespace-nowrap"
      >
        <span className="flex items-center flex-wrap gap-0.5 drop-shadow-2xs">
          {renderBlockContent(text)}
        </span>
      </div>
    </div>
  );
};

/**
 * 3. 반복문 C자형 컨테이너 블록 컴포넌트
 */
const EntryLoopBlockItem: React.FC<{
  node: BlockNode;
}> = ({ node }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(130);
  const headerHeight = 30;
  const r = CORNER_R;
  const nx = NOTCH_X;
  const nw = NOTCH_W;
  const nh = NOTCH_H;

  useLayoutEffect(() => {
    if (contentRef.current) {
      const measured = contentRef.current.getBoundingClientRect().width;
      setContentWidth(Math.max(90, Math.ceil(measured) + 24));
    }
  }, [node.trimmed]);

  const totalW = contentWidth;

  // 상단 바 패스: 바깥 홈(nx..nx+nw) -> 우상단 둥근모서리 -> 안쪽 돌기(nx+14..nx+14+nw)
  const innerNx = nx + 14;
  const topBarPath = `
    M 0 ${r}
    a ${r} ${r} 0 0 1 ${r} -${r}
    L ${nx} 0
    L ${nx + 3} ${nh}
    L ${nx + nw - 3} ${nh}
    L ${nx + nw} 0
    L ${totalW - r} 0
    a ${r} ${r} 0 0 1 ${r} ${r}
    L ${totalW} ${headerHeight - r}
    a ${r} ${r} 0 0 1 -${r} ${r}
    L ${innerNx + nw} ${headerHeight}
    L ${innerNx + nw - 3} ${headerHeight + nh}
    L ${innerNx + 3} ${headerHeight + nh}
    L ${innerNx} ${headerHeight}
    L 14 ${headerHeight}
    L 0 ${headerHeight}
    Z
  `;

  // 하단 턱 패스: 안쪽 홈(innerNx..innerNx+nw) -> 우측 둥근모서리 -> 바닥 돌기(nx..nx+nw)
  const bottomBarW = Math.max(75, totalW - 15);
  const bottomH = 16;
  const bottomBarPath = `
    M 14 0
    L ${innerNx} 0
    L ${innerNx + 3} ${nh}
    L ${innerNx + nw - 3} ${nh}
    L ${innerNx + nw} 0
    L ${bottomBarW - r} 0
    a ${r} ${r} 0 0 1 ${r} ${r}
    L ${bottomBarW} ${bottomH - r}
    a ${r} ${r} 0 0 1 -${r} ${r}
    L ${nx + nw} ${bottomH}
    L ${nx + nw - 3} ${bottomH + nh}
    L ${nx + 3} ${bottomH + nh}
    L ${nx} ${bottomH}
    L 0 ${bottomH}
    L 0 0
    Z
  `;

  return (
    <div className="relative flex flex-col select-none -mt-[4.5px] first:mt-0 drop-shadow-xs">
      {/* 1. 루프 상단 바 */}
      <div className="relative inline-flex items-center">
        <svg
          width={totalW + 2}
          height={headerHeight + nh + 2}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <path
            d={topBarPath}
            fill={node.style.bg}
            stroke={node.style.border}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <div
          ref={contentRef}
          style={{ height: `${headerHeight}px`, minWidth: `${contentWidth}px` }}
          className="relative z-10 flex items-center pl-4 pr-3 text-white text-xs font-bold tracking-tight whitespace-nowrap"
        >
          <span className="flex items-center flex-wrap gap-0.5 drop-shadow-2xs">
            {renderBlockContent(node.trimmed)}
          </span>
        </div>
      </div>

      {/* 2. 루프 내부 몸체 (좌측 14px 일체형 등뼈 기둥 + 내부 자식 블록들) */}
      <div className="relative flex">
        <div
          style={{
            backgroundColor: node.style.bg,
            borderColor: node.style.border,
            width: '14px',
          }}
          className="shrink-0 border-l-[1.5px] border-r-[1.5px] -mt-[1px] -mb-[1px]"
        />

        <div className="flex flex-col min-h-[24px]">
          {node.children && node.children.length > 0 ? (
            node.children.map((child) => <BlockNodeRenderer key={child.id} node={child} />)
          ) : (
            <div className="h-6 w-16" />
          )}
        </div>
      </div>

      {/* 3. 루프 하단 턱 */}
      <div className="relative inline-flex items-center">
        <svg
          width={bottomBarW + 2}
          height={bottomH + nh + 2}
          className="pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <path
            d={bottomBarPath}
            fill={node.style.bg}
            stroke={node.style.border}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// [블록 계층 구조 파서 및 트리 빌더]
// -------------------------------------------------------------

interface BlockNode {
  id: string;
  trimmed: string;
  indentLevel: number;
  isHat: boolean;
  isLoop: boolean;
  style: ReturnType<typeof getBlockStyle>;
  children: BlockNode[];
}

function parseBlocksToTree(rawBlocks: string[]): BlockNode[] {
  if (!Array.isArray(rawBlocks)) return [];

  const isContainer = (str: string) => {
    return (
      str.includes('반복하기') ||
      (str.includes('라면') && (str.includes('만약') || str.includes('만일')))
    );
  };

  const isHat = (str: string) => {
    // 단독 ㉠ 빈칸은 시작 모자 블록이 아님
    if (/^(\[?\s*㉠\s*\]?|\(?\s*㉠\s*\)?|㉠|㉡|㉢|__+)$/.test(str)) {
      return false;
    }
    return (
      str.includes('클릭했을 때') ||
      str.includes('키를 눌렀을 때') ||
      str.includes('신호를 받았을 때') ||
      str.includes('시작하기')
    );
  };

  const lines = rawBlocks
    .map((b) => (typeof b === 'string' ? b : String(b || '')))
    .map((b) => ({
      trimmed: b.trim(),
      spaces: b.match(/^\s*/)?.[0].length || 0,
    }))
    .filter((b) => b.trimmed.length > 0);

  if (lines.length === 0) return [];

  const hasIndent = lines.some((l) => l.spaces >= 2);
  let baseSpaces = 0;
  if (hasIndent) {
    const firstNonHat = lines.find((l, idx) => idx > 0 && !isHat(l.trimmed));
    if (firstNonHat && isHat(lines[0].trimmed) && firstNonHat.spaces > 0) {
      baseSpaces = firstNonHat.spaces;
    }
  }

  let inferredLevel = 0;
  const flatNodes: BlockNode[] = lines.map((item, idx) => {
    const trimmed = item.trimmed;
    const hat = isHat(trimmed);
    const loop = isContainer(trimmed);

    let level = 0;
    if (hasIndent) {
      if (!hat) {
        const relSpaces = Math.max(0, item.spaces - baseSpaces);
        level = Math.floor(relSpaces / 2);
      }
    } else {
      if (hat) {
        inferredLevel = 0;
        level = 0;
      } else {
        level = inferredLevel;
        if (loop) {
          inferredLevel++;
        }
      }
    }

    return {
      id: `block-${idx}-${trimmed.slice(0, 10)}`,
      trimmed,
      indentLevel: level,
      isHat: hat,
      isLoop: loop,
      style: getBlockStyle(trimmed),
      children: [],
    };
  });

  const rootNodes: BlockNode[] = [];
  const stack: BlockNode[] = [];

  for (const node of flatNodes) {
    while (stack.length > 0 && stack[stack.length - 1].indentLevel >= node.indentLevel) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootNodes.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    if (node.isLoop) {
      stack.push(node);
    }
  }

  return rootNodes;
}

const BlockNodeRenderer: React.FC<{ node: BlockNode }> = ({ node }) => {
  if (node.isHat) {
    return <EntryEventBlockItem text={node.trimmed} style={node.style} />;
  }
  if (node.isLoop) {
    return <EntryLoopBlockItem node={node} />;
  }
  return <EntryBasicBlockItem text={node.trimmed} style={node.style} />;
};

// -------------------------------------------------------------
// [메인 엔트리 블록 뷰어 컴포넌트]
// -------------------------------------------------------------

export const EntryBlockViewer: React.FC<EntryBlockViewerProps> = ({ blocks, className = '' }) => {
  if (!blocks) return null;
  const blockList: string[] = Array.isArray(blocks)
    ? blocks.map((b) => (typeof b === 'string' ? b : String(b ?? '')))
    : typeof blocks === 'string'
      ? (blocks as string).split('\n')
      : [];
  if (blockList.length === 0) return null;

  const rootNodes = parseBlocksToTree(blockList);

  return (
    <div
      className={`entry-block-workspace bg-[#f0f4f8] border border-[#cbd5e1] rounded-2xl p-4 my-2.5 font-sans shadow-sm inline-block min-w-[280px] max-w-full overflow-x-auto ${className}`}
    >
      {/* 엔트리 작업공간 헤더 */}
      <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 mb-3 text-xs text-slate-500 font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#00c73c] inline-block shadow-2xs" />
          <span className="text-slate-700 font-extrabold tracking-tight">엔트리(Entry) 블록 코딩</span>
        </div>
        <span className="text-[11px] text-slate-400 font-normal">블록 조립소</span>
      </div>

      {/* 정품 엔트리 퍼즐 블록 조립 체인 */}
      <div className="flex flex-col items-start pt-1 pb-2">
        {rootNodes.map((node) => (
          <BlockNodeRenderer key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};
