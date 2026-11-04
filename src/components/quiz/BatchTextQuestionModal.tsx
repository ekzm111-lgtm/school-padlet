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
} from 'lucide-react';

interface BatchTextQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestions: (questions: Question[]) => void;
  subject?: 'music' | 'entry';
}

// 🤖 ChatGPT, Claude, Gemini 등에 그대로 던지면 엔트리 문제를 완벽 생성해주는 프롬프트 템플릿
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
---

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
해설: 엔트리에서 오브젝트를 실행시키는 트리거는 '시작하기 버튼을 클릭했을 때'입니다.
---`;

const MUSIC_AI_PROMPT = `초/중등 음악 시험 객관식 문제를 아래 형식에 맞춰 3문항 출제해줘.

1. 다음 중 모차르트와 베토벤이 활약한 서양음악사 시대적 사조는? [4점]
① 중세음악
② 르네상스
③ 바로크
④ 고전주의
⑤ 낭만주의
정답: 4
해설: 모차르트와 베토벤은 고전주의 시대를 대표하는 거장입니다.`;

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
해설: 엔트리에서 코드를 시작시키는 트리거는 '시작하기 버튼을 클릭했을 때'입니다.

3. 다음 엔트리 블록 코드가 실행되었을 때, 엔트리봇이 최종적으로 이동한 총 거리(픽셀)는? [5점]
[블록코드]
시작하기 버튼을 클릭했을 때
  5번 반복하기
    이동 방향으로 (20)만큼 움직이기
[/블록코드]
1) 20
2) 50
3) 100
4) 120
5) 200
정답: 3
해설: 20 × 5 = 100이므로 총 이동 거리는 100입니다.`;

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

export const BatchTextQuestionModal: React.FC<BatchTextQuestionModalProps> = ({
  isOpen,
  onClose,
  onAddQuestions,
  subject = 'music',
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isOpen) return null;

  const isEntry = subject === 'entry';

  // 텍스트 스마트 파싱 로직 (태그 [블록코드]...[/블록코드] 내부 보존 및 "해설:" 종결 기준 완벽 파싱)
  const parseQuestionsFromText = (text: string): Question[] => {
    if (!text.trim()) return [];

    const lines = text.split('\n');
    const questionBlocks: string[][] = [];
    let currentBlock: string[] = [];
    let inCodeTag = false;
    let hasExplanation = false;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // [블록코드] 태그 감지
      const isCodeStart = /^\[(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```(?:entry|blocks?)?/i.test(trimmed);
      const isCodeEnd = /^\[\/(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```$/i.test(trimmed);

      if (isCodeStart) inCodeTag = true;

      // 구분선 기호 (---, === 등) 감지 시 이전 단락 즉시 분할 (코드 태그 밖에서만)
      const isDivider = !inCodeTag && /^(?:-{3,}|={3,}|\*{3,}|_{3,}|\[(?:구분|문제끝|END)\])$/i.test(trimmed);
      if (isDivider) {
        if (currentBlock.some((l) => l.trim().length > 0)) {
          questionBlocks.push(currentBlock);
          currentBlock = [];
          hasExplanation = false;
        }
        continue;
      }

      // 오직 해설이 완전히 나온 뒤에만 엔터(빈 줄) 또는 다음 문항에서 분할 (코드 태그 밖에서만)
      if (!inCodeTag && hasExplanation) {
        const isBlank = trimmed.length === 0;
        const isNextHeader = /^(?:[0-9]+[\.\)]|문제\s*[0-9]+|Q\s*[0-9]+|\[문제|다음|아래)/i.test(trimmed);

        if (isBlank) {
          if (currentBlock.some((l) => l.trim().length > 0)) {
            questionBlocks.push(currentBlock);
            currentBlock = [];
            hasExplanation = false;
          }
          continue;
        } else if (isNextHeader) {
          if (currentBlock.some((l) => l.trim().length > 0)) {
            questionBlocks.push(currentBlock);
            currentBlock = [];
            hasExplanation = false;
          }
        }
      }

      currentBlock.push(rawLine);

      if (isCodeEnd) inCodeTag = false;

      // 해설 라인 감지 (코드 태그 밖에서만)
      if (!inCodeTag && /^(?:해설|풀이|설명)\s*[:：]/i.test(trimmed)) {
        hasExplanation = true;
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

          // [블록코드] 시작 및 종료 태그 감지
          if (/^\[(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```(?:entry|blocks?)?/i.test(trimmed)) {
            inBlock = true;
            continue;
          }
          if (/^\[\/(?:블록코드|코드|entry|block)\]/i.test(trimmed) || /^```$/i.test(trimmed)) {
            inBlock = false;
            continue;
          }

          // 태그 내부인 경우 무조건 엔트리 블록으로 수집!
          if (inBlock) {
            entryBlocks.push(rawLine);
            continue;
          }

          // 정답 라인
          if (/^(?:정답|답)\s*[:：]?\s*(.*)$/i.test(trimmed)) {
            const match = trimmed.match(/^(?:정답|답)\s*[:：]?\s*(.*)$/i);
            let rawAns = match ? match[1].trim() : '';
            circNumbers.forEach((cn, cIdx) => {
              if (rawAns.includes(cn)) rawAns = String(cIdx + 1);
            });
            rawAns = rawAns.replace(/[\(\)\[\]번]/g, '').trim();
            correctAnswer = rawAns || '1';
            continue;
          }

          // 해설 라인
          if (/^(?:해설|풀이|설명)\s*[:：]?\s*(.*)$/i.test(trimmed)) {
            const match = trimmed.match(/^(?:해설|풀이|설명)\s*[:：]?\s*(.*)$/i);
            explanation = match ? match[1].trim() : '';
            continue;
          }
          if (explanation) {
            explanation += ' ' + trimmed;
            continue;
          }

          // 제목이 아직 없으면 첫 번째 유효 라인은 무조건 제목!
          if (!title) {
            title = trimmed;
            continue;
          }

          // 보기 라인 (제목이 이미 있는 상태에서만 인식)
          const optMatch = trimmed.match(/^(?:[①②③④⑤]|\(?[1-5]\)|\b[1-5]\.)\s*(.*)$/);
          if (optMatch && (entryBlocks.length > 0 || options.length > 0 || /^[①②③④⑤]/.test(trimmed))) {
            options.push(optMatch[1].trim());
            continue;
          }

          // 태그가 없더라도 보기가 시작되기 전에 나온 엔트리 블록 문법 라인 자동 인식
          if (options.length === 0 && (
            trimmed.includes('클릭했을 때') ||
            trimmed.includes('반복하기') ||
            trimmed.includes('움직이기') ||
            trimmed.includes('정하기') ||
            trimmed.includes('더하기') ||
            trimmed.includes('말하기') ||
            trimmed.includes('만약') ||
            trimmed.includes('만일') ||
            trimmed.includes('바꾸기') ||
            trimmed.includes('기다리기') ||
            trimmed.includes('닿았는가') ||
            /^\[\s*[㉠-㉭a-zA-Z0-9_\s]+\s*\]$/.test(trimmed) ||
            (isEntry && /^\s{2,}/.test(rawLine))
          )) {
            entryBlocks.push(rawLine);
            continue;
          }

          // 제목의 연장선인 경우 (보기나 블록코드가 시작되기 전)
          if (options.length === 0 && entryBlocks.length === 0) {
            title = title + ' ' + trimmed;
          }
        }

        // 제목에서 문항 번호 및 배점 추출
        let cleanTitle = title.replace(/^(?:[0-9]+[\.\)]|문제\s*[0-9]+[\.:]?|Q\s*[0-9]+[\.\)]?|\[문제\s*[0-9]+\]|[0-9]+\s*번[\.:]?)\s*/i, '');
        const pointsMatch = cleanTitle.match(/\[?([0-9]+)\s*점\]?/);
        if (pointsMatch) {
          points = parseInt(pointsMatch[1], 10) || 5;
          cleanTitle = cleanTitle.replace(/\[?[0-9]+\s*점\]?/, '').trim();
        }

        const isMultiple = options.length > 0;
        const qCategory: QuestionCategory = isEntry ? '엔트리 코딩' : '기초이론';

        return {
          id: `paste_${Date.now()}_${bIdx}_${Math.random().toString(36).substring(2, 6)}`,
          category: qCategory,
          type: isMultiple ? 'multiple-choice' : 'short-answer',
          points,
          difficulty: '중' as const,
          title: cleanTitle || `복사된 문항 #${bIdx + 1}`,
          hasScore: false,
          scoreAbc: '',
          hasAudio: false,
          entryBlocks: entryBlocks.length > 0 ? entryBlocks : undefined,
          options: isMultiple ? options : [],
          correctAnswer: correctAnswer || (isMultiple ? '1' : '정답'),
          explanation: explanation || '',
        };
      })
      .filter((q) => {
        return q.title.length > 1 && (q.options.length >= 2 || (q.entryBlocks && q.entryBlocks.length > 0) || Boolean(q.explanation));
      });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    setParsedQuestions(parseQuestionsFromText(val));
  };

  const handleApplySample = () => {
    const sample = isEntry ? SAMPLE_ENTRY_TEXT : SAMPLE_MUSIC_TEXT;
    setRawText(sample);
    setParsedQuestions(parseQuestionsFromText(sample));
  };

  // 🤖 AI 프롬프트 원클릭 복사
  const handleCopyAiPrompt = async () => {
    const prompt = isEntry ? ENTRY_AI_PROMPT : MUSIC_AI_PROMPT;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
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
              <h3 className="font-black text-lg sm:text-xl flex items-center gap-2">
                <span>📋 문제 텍스트 복사-붙여넣기 자동 출제</span>
                {isEntry && (
                  <span className="text-[11px] bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                    엔트리 블록코딩 지원
                  </span>
                )}
              </h3>
              <p className="text-xs text-indigo-100">
                ChatGPT, 한글, 워드 등에서 복사해 넣으면 번호, 블록코드 지문, 보기, 정답, 해설을 자동 인식합니다.
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
          {/* AI 프롬프트 복사 안내 바 (다른 AI에서 긁어오기 지원) */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border-2 border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot size={18} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <span>🤖 다른 AI (ChatGPT, Claude, Gemini)로 문제 만들기</span>
                </h4>
                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                  아래 버튼을 눌러 프롬프트를 복사한 후, ChatGPT나 Claude에 붙여넣고 나온 결과를 그대로 복사해 넣으세요!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyAiPrompt}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 ${
                copiedPrompt
                  ? 'bg-emerald-600 text-white border-2 border-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-indigo-500 hover:shadow-indigo-500/25'
              }`}
            >
              {copiedPrompt ? (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>프롬프트 복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>ChatGPT / Claude용 프롬프트 복사</span>
                </>
              )}
            </button>
          </div>

          {/* 입력창 상단 버튼 */}
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
            <span className="flex items-center gap-1.5">
              <span>✍️ 아래 입력창에 문제 텍스트를 붙여넣으세요:</span>
            </span>
            <button
              type="button"
              onClick={handleApplySample}
              className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-extrabold"
            >
              <Lightbulb size={13} className="text-amber-500" />
              <span>{isEntry ? '엔트리 블록코드 샘플 불러오기' : '샘플 텍스트 불러오기'}</span>
            </button>
          </div>

          {/* 텍스트 입력 에어리어 */}
          <textarea
            rows={7}
            value={rawText}
            onChange={handleTextChange}
            placeholder={
              isEntry
                ? `1. 다음 엔트리 블록 코드가 실행을 마친 후 변수 [점수]에 저장된 최종 값은? [5점]
[블록코드]
시작하기 버튼을 클릭했을 때
  [점수]를 (0)(으)로 정하기
  3번 반복하기
    [점수]에 (10)만큼 더하기
[/블록코드]
① 10
② 25
③ 30
④ 35
정답: 4
해설: 10씩 3번 더해진 뒤...`
                : `1. 다음 악곡의 박자표에 대한 설명으로 옳은 것은? [4점]
① 4분의 2박자
② 4분의 3박자
③ 4분의 4박자
정답: 3
해설: 한 마디에 4분음표가 4개 들어갑니다.`
            }
            className="w-full text-xs font-mono border-2 border-slate-300 rounded-2xl p-3.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none leading-relaxed resize-y shadow-inner"
          />

          {/* 실시간 파싱 미리보기 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                자동 인식된 문항 미리보기 ({parsedQuestions.length}개):
              </span>
              {parsedQuestions.length > 0 && (
                <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                  <Check size={12} className="stroke-[3]" />
                  <span>문항 구조 분석 성공</span>
                </span>
              )}
            </div>

            {parsedQuestions.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                텍스트를 붙여넣으면 여기에 실시간으로 블록 조립소와 번호, 보기가 자동 분리되어 표시됩니다.
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

                    {/* ✨ 2번째 이미지와 동일한 실시간 엔트리 블록 조립소 렌더링! ✨ */}
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
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
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
