import React, { useState } from 'react';
import type { Question, QuestionCategory } from '@/types/exam';
import { EntryBlockViewer } from '@/components/quiz/EntryBlockViewer';
import {
  Clipboard,
  X,
  Sparkles,
  Copy,
  Check,
  Bot,
  Lightbulb,
  Code,
  Globe,
} from 'lucide-react';

interface BatchTextQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestions: (questions: Question[]) => void;
  subject?: 'music' | 'entry';
}

// 🤖 1. 일반 / 바이브 코딩 / 인공지능 / 상식 퀴즈용 범용 프롬프트
const GENERAL_AI_PROMPT = `[원하는 과목 또는 주제: 바이브 코딩 / AI 상식 / 컴퓨터 일반 등]에 관련된 객관식 5지선다 시험 문제를 아래 형식에 맞춰 5문항 출제해줘.

[작성 규칙]
1. 각 문제 번호와 지문, [배점]을 작성한다. (예: 1. 다음 중 바이브 코딩(Vibe Coding)의 특징으로 알맞은 것은? [5점])
2. 보기는 (1), (2), (3), (4), (5) 또는 ①, ②, ③, ④, ⑤ 형식으로 5지선다로 작성한다.
3. 각 문항 끝에는 "정답: 번호"와 "💡 해설: 설명내용"을 반드시 포함한다.
4. 문항 간 구분을 위해 문항 사이에 빈 줄 또는 '---' 구분선을 넣는다.

[출력 형식 예시]
1. 사람이 직접 복잡한 프로그래밍 언어를 입력하지 않고, AI에게 자연어로 대화하며 소프트웨어를 개발하는 최신 방식을 무엇이라고 할까요? [5점]
(1) 블록 코딩
(2) 바이브 코딩
(3) 모스 부호
(4) 바코드 스캔
(5) 하드 코딩
정답: 2
💡 해설: 인공지능에게 자연어로 명령을 내려 프로그램을 만드는 새로운 개발 방식을 바이브 코딩이라고 합니다.
---

2. 바이브 코딩을 진행할 때 가장 중요한 역량으로 알맞은 것은? [5점]
(1) 복잡한 수학 공식 암기
(2) 타자 속도
(3) 내가 원하는 기능과 요구사항을 구체적으로 설명하는 프롬프트 작성 역량
(4) 기계어 문법 공부
(5) 에러 발생 시 즉시 포기하기
정답: 3
💡 해설: 인공지능이 정확한 코드를 작성할 수 있도록 맥락과 요구사항을 명확히 전달하는 소통 능력이 가장 중요합니다.
---`;

// 🤖 2. 엔트리 블록 코딩 전문 프롬프트
const ENTRY_AI_PROMPT = `중학교 1학년 정보 (엔트리 블록 코딩) 시험 객관식 문제를 아래 형식에 맞춰 3문항 출제해줘.

[작성 규칙]
1. 문제 번호와 지문, [배점]을 작성한다.
2. 블록 코딩 지문은 반드시 [블록코드] 와 [/블록코드] 태그 사이에 한 줄에 한 블록씩 들여쓰기와 함께 작성한다.
3. 보기는 ①, ②, ③, ④, ⑤ 형식으로 5지선다로 작성한다.
4. "정답: 번호"와 "해설: 풀이내용"을 반드시 포함한다.
5. 각 문항의 끝에는 확실한 구분을 위해 '---' 구분선을 넣는다.

[출력 형식 예시]
1. 다음 엔트리 블록 코드가 실행을 마친 후 변수 [점수]에 저장된 최종 값은? [5점]
[블록코드]
시작하기 버튼을 클릭했을 때
  [점수]를 (0)(으)로 정하기
  3번 반복하기
    [점수]에 (10)만큼 더하기
  [점수]에 (5)만큼 더하기
[/블록코드]
① 10
② 25
③ 30
④ 35
⑤ 45
정답: 4
해설: 점수가 처음에 0이고 10씩 3번 더해진 뒤 5를 더하므로 30 + 5 = 35가 됩니다.
---`;

// 🤖 3. 음악 시험 퀴즈 프롬프트
const MUSIC_AI_PROMPT = `초/중등 음악 시험 객관식 문제를 아래 형식에 맞춰 3문항 출제해줘.

1. 다음 중 모차르트와 베토벤이 활약한 서양음악사 시대적 사조는? [4점]
① 중세음악
② 르네상스
③ 바로크
④ 고전주의
⑤ 낭만주의
정답: 4
해설: 모차르트와 베토벤은 고전주의 시대를 대표하는 거장입니다.
---`;

// 샘플 텍스트들
const SAMPLE_GENERAL_TEXT = `1. 최근 사람이 직접 복잡한 프로그래밍 언어를 입력하지 않고, 인공지능(AI)에게 일상적인 말이나 글로 명령을 내려서 프로그램을 만드는 방식을 무엇이라고 할까요? [5점]
(1) 블록 코딩
(2) 바이브 코딩
(3) 모스 부호
(4) 바코드 스캔
(5) 하드 코딩
정답: 2
💡 해설: AI에게 자연어로 명령을 내려 소프트웨어를 만드는 방식을 바이브 코딩이라고 합니다.

2. 바이브 코딩을 잘하기 위해 가장 중요한 능력은 다음 중 무엇일까요? [5점]
(1) 복잡한 수학 공식 암기하기
(2) 키보드를 보지 않고 빠르게 치는 타자 실력
(3) 인공지능에게 내가 원하는 것을 구체적이고 정확하게 설명하는 능력
(4) 어셈블리어 등 기계어 문법 공부하기
(5) 에러가 한 번이라도 나면 포기하고 컴퓨터를 끈다.
정답: 3
💡 해설: 인공지능이 내가 원하는 결과를 도출할 수 있도록 의도와 요구사항을 명확히 전달하는 프롬프트 작성 역량이 가장 중요합니다.

3. 바이브 코딩 시 주의해야 할 점으로 알맞지 않은 것은? [5점]
(1) 인공지능이 만든 코드도 오류가 있을 수 있으므로 반드시 확인한다.
(2) 비밀번호나 개인정보를 인공지능에게 알려주지 않는다.
(3) 에러가 발생하면 에러 내용을 그대로 인공지능에게 전달하여 수정을 요청한다.
(4) 인공지능에게는 무조건 짧게 한 단어로만 질문해야 한다.
(5) 내가 만들고자 하는 결과물의 구조를 머릿속으로 먼저 구상한다.
정답: 4
💡 해설: 인공지능에게 구체적인 맥락과 원하는 요구사항을 상세히 설명할수록 고품질의 결과물이 나옵니다.`;

const SAMPLE_ENTRY_TEXT = `1. 다음 엔트리 블록 코드가 실행을 마친 후 변수 [점수]에 저장된 최종 값은? [5점]
[블록코드]
시작하기 버튼을 클릭했을 때
  [점수]를 (0)(으)로 정하기
  3번 반복하기
    [점수]에 (10)만큼 더하기
  [점수]에 (5)만큼 더하기
[/블록코드]
① 10
② 25
③ 30
④ 35
⑤ 45
정답: 4
해설: 점수가 처음에 0이고, 10씩 3번 더해지면 30이 됩니다. 반복문이 끝난 뒤 5를 더하므로 최종 값은 30 + 5 = 35가 됩니다.

2. 다음 엔트리 블록 코드에서 프로그램이 시작될 수 있도록 맨 위 빈칸 ㉠에 들어갈 알맞은 [시작] 블록은? [4점]
[블록코드]
[ ㉠ ]
  5번 반복하기
    이동 방향으로 (10)만큼 움직이기
[/블록코드]
① 시작하기 버튼을 클릭했을 때
② 10번 반복하기
③ 이동 방향으로 (10)만큼 움직이기
④ 안녕!을 (2)초 동안 말하기
⑤ 모든 스크립트 멈추기
정답: 1
해설: 엔트리에서 코드를 시작시키는 트리거는 '시작하기 버튼을 클릭했을 때'입니다.`;

const SAMPLE_MUSIC_TEXT = `1. 다음 중 서양음악사 고전주의 시대를 대표하는 작곡가로 바르게 짝지어진 것은? [4점]
① 바흐, 헨델
② 비발디, 팔레스트리나
③ 하이든, 모차르트
④ 쇼팽, 리스트
⑤ 드뷔시, 라벨
정답: 3
해설: 하이든과 모차르트는 고전주의 시대를 대표하는 거장입니다.

2. 한 마디 안에 4분음표가 4개 들어가는 기준 박자표는? [4점]
① 2/4박자
② 3/4박자
③ 4/4박자
④ 6/8박자
⑤ 12/8박자
정답: 3
해설: 4/4박자는 한 마디에 4분음표가 4개 들어갑니다.`;

const CATEGORY_OPTIONS: QuestionCategory[] = [
  '일반 퀴즈',
  '바이브 코딩',
  '컴퓨터/AI',
  '상식',
  '엔트리 코딩',
  '기초이론',
  '음악',
];

export const BatchTextQuestionModal: React.FC<BatchTextQuestionModalProps> = ({
  isOpen,
  onClose,
  onAddQuestions,
  subject = 'music',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory>(
    subject === 'entry' ? '엔트리 코딩' : '바이브 코딩'
  );
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  // 텍스트 스마트 파싱 로직: 해설(💡 해설, 해설, 설명 등) 종결 기준 완벽 분할 및 일반 퀴즈 완벽 지원
  const parseQuestionsFromText = (text: string, category: QuestionCategory): Question[] => {
    if (!text || !text.trim()) return [];

    const lines = text.split('\n');
    const questionBlocks: string[][] = [];
    let currentBlock: string[] = [];
    let inCodeTag = false;
    let hasAnswerOrExp = false;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // [블록코드] 태그 감지
      const isCodeStart = /^\[(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```(?:entry|blocks?)?/i.test(trimmed);
      const isCodeEnd = /^\[\/(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```$/i.test(trimmed);

      if (isCodeStart) inCodeTag = true;

      // 구분선 기호 (---, ===, *** 등)
      const isDivider = !inCodeTag && /^(?:-{3,}|={3,}|\*{3,}|_{3,}|\[(?:구분|문제끝|END)\])$/i.test(trimmed);
      if (isDivider) {
        if (currentBlock.some((l) => l.trim().length > 0)) {
          questionBlocks.push(currentBlock);
          currentBlock = [];
          hasAnswerOrExp = false;
        }
        continue;
      }

      // 새 문항 시작 패턴 감지 (예: "1.", "2)", "문제 1", "Q1.", "[문제 1]", "1번")
      const isQuestionNumberHeader =
        !inCodeTag &&
        /^(?:(?:문제|문항|Q)\s*[0-9]+[\.:\)]?|\[(?:문제|문항|Q)\s*[0-9]+\]|[0-9]+\s*번[\.:]?|^[0-9]+[\.\)][\s\S]+)/i.test(trimmed);

      // 해설이나 정답이 나온 뒤에는 빈 줄이거나 새 문항 헤더를 만나면 이전 문항 종료 및 새 문항 분할!
      if (!inCodeTag && hasAnswerOrExp) {
        const isBlank = trimmed.length === 0;
        if (isBlank || isQuestionNumberHeader) {
          if (currentBlock.some((l) => l.trim().length > 0)) {
            questionBlocks.push(currentBlock);
            currentBlock = [];
            hasAnswerOrExp = false;
          }
          if (isBlank) continue;
        }
      }

      // 만약 이전 문항에 이미 충분한 보기(2개 이상)가 수집된 상태에서 새 문제 번호가 등장하면 즉시 분할
      if (!inCodeTag && currentBlock.length >= 3 && isQuestionNumberHeader) {
        const hasEnoughOptions = currentBlock.filter((l) =>
          /^(?:[①②③④⑤]|\(?[1-5]\)|\b[1-5][\.\)])\s*/.test(l.trim())
        ).length >= 2;

        const isNewQuestionTitle = /^(?:[0-9]+[\.\)]\s+|(?:문제|문항|Q)\s*[0-9]+|[0-9]+\s*번)/i.test(trimmed);
        if (hasEnoughOptions && isNewQuestionTitle) {
          questionBlocks.push(currentBlock);
          currentBlock = [];
          hasAnswerOrExp = false;
        }
      }

      currentBlock.push(rawLine);

      if (isCodeEnd) inCodeTag = false;

      // 정답 또는 해설 라인 감지 (💡, ✅, 🎯, 특수문자 대응)
      if (!inCodeTag && /^(?:[💡✅🎯\s\[\(])*(?:정답|답|해설|풀이|설명|정답\s*해설)[\s\]\)]*[:：]?/i.test(trimmed)) {
        hasAnswerOrExp = true;
      }
    }

    if (currentBlock.some((l) => l.trim().length > 0)) {
      questionBlocks.push(currentBlock);
    }

    const circNumbers = ['①', '②', '③', '④', '⑤'];

    return questionBlocks
      .filter((blockLines) => blockLines.some((l) => l.trim().length > 0))
      .map((blockLines, bIdx): Question => {
        let title = '';
        const entryBlocks: string[] = [];
        const options: string[] = [];
        let correctAnswer = '1';
        let explanation = '';
        let points = 5;
        let inBlock = false;

        for (let i = 0; i < blockLines.length; i++) {
          const rawLine = blockLines[i];
          const trimmed = rawLine.trim();
          if (!trimmed) continue;

          // 태그 감지
          if (/^\[(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```(?:entry|blocks?)?/i.test(trimmed)) {
            inBlock = true;
            continue;
          }
          if (/^\[\/(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```$/i.test(trimmed)) {
            inBlock = false;
            continue;
          }

          if (inBlock) {
            entryBlocks.push(rawLine);
            continue;
          }

          // 정답 라인
          const ansMatch = trimmed.match(/^(?:[✅🎯\s\[\(])*(?:정답|답|정\s*답)[\s\]\)]*[:：]?\s*(.*)$/i);
          if (ansMatch) {
            let rawAns = ansMatch[1].trim();
            circNumbers.forEach((cn, cIdx) => {
              if (rawAns.includes(cn)) rawAns = String(cIdx + 1);
            });
            rawAns = rawAns.replace(/[\(\)\[\]번\.]/g, '').trim();
            correctAnswer = rawAns || '1';
            continue;
          }

          // 해설 라인 (이모지 💡 등 완벽 지원)
          const expMatch = trimmed.match(/^(?:[💡\s\[\(])*(?:해설|풀이|설명|정답\s*해설)[\s\]\)]*[:：]?\s*(.*)$/i);
          if (expMatch) {
            explanation = expMatch[1].trim();
            continue;
          }
          if (explanation) {
            explanation += ' ' + trimmed;
            continue;
          }

          // 제목 첫 라인
          if (!title) {
            title = trimmed;
            continue;
          }

          // 보기 라인 (①, (1), 1., 1), A. 등)
          const optMatch = trimmed.match(/^(?:[①②③④⑤]|\(?([1-5])\)|\b([1-5])[\.\)]|\b([A-Ea-e])[\.\)]|[1-5]번[\.\s])\s*(.*)$/);
          if (optMatch && options.length < 5) {
            const content = optMatch[4] || optMatch[1] || '';
            options.push(content.trim());
            continue;
          }

          // 엔트리 블록 태그 없는 경우 키워드로 자동 수집 (보기가 나오기 전)
          if (
            options.length === 0 &&
            (trimmed.includes('클릭했을 때') ||
              trimmed.includes('반복하기') ||
              trimmed.includes('움직이기') ||
              trimmed.includes('정하기') ||
              trimmed.includes('더하기') ||
              trimmed.includes('말하기') ||
              trimmed.includes('만약') ||
              trimmed.includes('만일') ||
              trimmed.includes('기다리기') ||
              /^\[\s*[㉠-㉭a-zA-Z0-9_\s]+\s*\]$/.test(trimmed))
          ) {
            entryBlocks.push(rawLine);
            continue;
          }

          // 보기 시작 전이면 제목 확장
          if (options.length === 0 && entryBlocks.length === 0) {
            title = title + ' ' + trimmed;
          }
        }

        // 제목에서 번호 및 [5점] 추출
        let cleanTitle = title.replace(
          /^(?:[0-9]+[\.\)]|문제\s*[0-9]+[\.:]?|Q\s*[0-9]+[\.\)]?|\[문제\s*[0-9]+\]|[0-9]+\s*번[\.:]?)\s*/i,
          ''
        );
        const pointsMatch = cleanTitle.match(/\[?([0-9]+)\s*점\]?/);
        if (pointsMatch) {
          points = parseInt(pointsMatch[1], 10) || 5;
          cleanTitle = cleanTitle.replace(/\[?[0-9]+\s*점\]?/, '').trim();
        }

        const isMultiple = options.length > 0;
        // 엔트리 블록 코드가 있을 때만 '엔트리 코딩', 없으면 선택된 카테고리(바이브 코딩, 일반 퀴즈 등)
        const finalCategory = entryBlocks.length > 0 ? '엔트리 코딩' : category;

        return {
          id: `paste_${Date.now()}_${bIdx}_${Math.random().toString(36).substring(2, 6)}`,
          category: finalCategory,
          type: isMultiple ? 'multiple-choice' : 'short-answer',
          points,
          difficulty: '중' as const,
          title: cleanTitle || `문항 #${bIdx + 1}`,
          hasScore: false,
          scoreAbc: '',
          hasAudio: false,
          entryBlocks: entryBlocks.length > 0 ? entryBlocks : undefined,
          options: isMultiple ? options : [],
          correctAnswer: correctAnswer || (isMultiple ? '1' : '정답'),
          explanation: explanation || '',
        };
      })
      .filter((q) => q.title.length > 1);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    setParsedQuestions(parseQuestionsFromText(val, selectedCategory));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value as QuestionCategory;
    setSelectedCategory(cat);
    if (rawText.trim()) {
      setParsedQuestions(parseQuestionsFromText(rawText, cat));
    }
  };

  const handleApplySample = (type: 'vibe' | 'entry' | 'music') => {
    let sample = SAMPLE_GENERAL_TEXT;
    let cat: QuestionCategory = '바이브 코딩';
    if (type === 'entry') {
      sample = SAMPLE_ENTRY_TEXT;
      cat = '엔트리 코딩';
    } else if (type === 'music') {
      sample = SAMPLE_MUSIC_TEXT;
      cat = '음악';
    }
    setSelectedCategory(cat);
    setRawText(sample);
    setParsedQuestions(parseQuestionsFromText(sample, cat));
  };

  const handleCopyPrompt = async (type: 'general' | 'entry') => {
    const prompt = type === 'general' ? GENERAL_AI_PROMPT : ENTRY_AI_PROMPT;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      alert('프롬프트 복사에 실패했습니다.');
    }
  };

  const handleApplyQuestions = () => {
    if (parsedQuestions.length === 0) {
      alert('인식된 문제가 없습니다. 텍스트를 입력해주세요.');
      return;
    }
    onAddQuestions(parsedQuestions);
    onClose();
    alert(`총 ${parsedQuestions.length}개의 문제가 시험지에 성공적으로 반영되었습니다!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
              <Clipboard size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl flex items-center gap-2 flex-wrap">
                <span>📋 문제 복사-붙여넣기 자동 출제</span>
                <span className="text-[11px] bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black shadow-xs">
                  일반 퀴즈 & 엔트리 코딩 지원
                </span>
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                ChatGPT, Claude 등에서 복사해 넣으면 해설 뒤 다음 문제가 자동 분리되며, 번호/보기/정답/해설을 완벽 인식합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* AI 프롬프트 원클릭 복사 바 */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border-2 border-indigo-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot size={16} />
                </div>
                <h4 className="text-xs font-black text-indigo-950">
                  🤖 ChatGPT / Claude용 프롬프트 복사하기 (클릭 후 AI에 붙여넣기만 하면 끝!)
                </h4>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopyPrompt('general')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                  copiedType === 'general'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300'
                }`}
              >
                {copiedType === 'general' ? <Check size={14} className="stroke-[3]" /> : <Globe size={14} />}
                <span>{copiedType === 'general' ? '복사 완료!' : '일반 / 바이브 코딩 퀴즈 프롬프트 복사'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyPrompt('entry')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                  copiedType === 'entry'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300'
                }`}
              >
                {copiedType === 'entry' ? <Check size={14} className="stroke-[3]" /> : <Code size={14} />}
                <span>{copiedType === 'entry' ? '복사 완료!' : '엔트리 블록코딩 전용 프롬프트 복사'}</span>
              </button>
            </div>
          </div>

          {/* 분류 선택 및 샘플 불러오기 버튼 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span>문제 영역 분류:</span>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">예시:</span>
              <button
                type="button"
                onClick={() => handleApplySample('vibe')}
                className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                바이브 코딩 예시
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => handleApplySample('entry')}
                className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline"
              >
                엔트리 블록 예시
              </button>
            </div>
          </div>

          {/* 텍스트 입력 에어리어 */}
          <textarea
            rows={7}
            value={rawText}
            onChange={handleTextChange}
            placeholder={`1. 다음 중 바이브 코딩(Vibe Coding)의 특징으로 알맞은 것은? [5점]
(1) 복잡한 문법을 외워 직접 타이핑한다.
(2) AI에게 자연어로 아이디어를 설명하여 코드를 생성한다.
(3) C 언어만을 사용해야 한다.
(4) 종이에만 알고리즘을 작성한다.
(5) 에러 발생 시 포기한다.
정답: 2
💡 해설: 바이브 코딩은 AI에게 자연어로 대화하며 원하는 소프트웨어를 개발하는 최신 방식입니다.

2. 다음 문제...`}
            className="w-full text-xs font-mono border-2 border-slate-300 rounded-2xl p-3.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none leading-relaxed resize-y shadow-inner"
          />

          {/* 실시간 파싱 미리보기 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                자동 분리된 문제 미리보기 ({parsedQuestions.length}개):
              </span>
              {parsedQuestions.length > 0 && (
                <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                  <Check size={12} className="stroke-[3]" />
                  <span>{parsedQuestions.length}문항 자동 분리 성공</span>
                </span>
              )}
            </div>

            {parsedQuestions.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                텍스트를 붙여넣으면 해설 뒤 다음 문항이 자동으로 분리되어 여기에 실시간으로 표시됩니다.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                {parsedQuestions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-indigo-700">
                          #{qIdx + 1} {q.type === 'multiple-choice' ? '객관식' : '단답형'} [{q.points}점]
                        </span>
                        {q.category && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                            {q.category}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        정답: {q.correctAnswer}
                      </span>
                    </div>

                    <p className="font-black text-sm text-slate-800 leading-snug">{q.title}</p>

                    {/* 엔트리 블록이 있을 때만 블록 렌더링 */}
                    {q.entryBlocks && q.entryBlocks.length > 0 && (
                      <div className="my-2 max-w-full">
                        <EntryBlockViewer blocks={q.entryBlocks} />
                      </div>
                    )}

                    {/* 보기 목록 */}
                    {q.options.length > 0 && (
                      <div className="text-[11px] text-slate-700 pl-2 space-y-1 pt-1 bg-slate-50/70 p-2 rounded-xl">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-500">({oIdx + 1})</span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 해설 */}
                    {q.explanation && (
                      <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        💡 해설: {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 푸터 버튼 */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            총 <strong className="text-indigo-600 font-bold">{parsedQuestions.length}</strong>개 문제 인식됨
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              취소
            </button>
            <button
              disabled={parsedQuestions.length === 0}
              onClick={handleApplyQuestions}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-indigo-500/25 transition"
            >
              + 시험지에 일괄 반영하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
