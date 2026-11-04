import React, { useState, useRef } from 'react';
import type { Question, QuestionCategory, QuestionType, DifficultyLevel } from '@/types/exam';
import { ScoreViewer } from '@/components/quiz/ScoreViewer';
import { EntryBlockViewer } from '@/components/quiz/EntryBlockViewer';
import { ScorePresetModal } from '@/components/quiz/ScorePresetModal';
import { MusicSymbolPicker } from '@/components/quiz/MusicSymbolPicker';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Wand2,
  Image as ImageIcon,
  X,
  Upload,
  Code,
} from 'lucide-react';

interface QuestionEditorProps {
  initialQuestion?: Question;
  onSave: (q: Question) => void;
  onCancel: () => void;
  subject?: 'music' | 'entry';
}

const CATEGORIES: QuestionCategory[] = [
  '일반 퀴즈',
  '바이브 코딩',
  '컴퓨터/AI',
  '상식',
  '엔트리 코딩',
  '기초이론',
  '청음/감상',
  '악곡분석',
  '서양음악사',
  '국악',
];
const DIFFICULTIES: DifficultyLevel[] = ['하', '중', '상'];
const QUICK_SYMBOLS = ['♩', '♪', '♫', '♬', '𝄽', '𝄾', '♯', '♭', '♮', '𝄐', '4/4', '3/4', '①', '②', '③', '④', '⑤'];

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  initialQuestion,
  onSave,
  onCancel,
  subject = 'music',
}) => {
  const isEntryMode = subject === 'entry' || initialQuestion?.category === '엔트리 코딩';
  const [category, setCategory] = useState<QuestionCategory>(
    initialQuestion?.category || (isEntryMode ? '엔트리 코딩' : '기초이론')
  );
  const [type, setType] = useState<QuestionType>(initialQuestion?.type || 'multiple-choice');
  const [points, setPoints] = useState<number>(initialQuestion?.points || (isEntryMode ? 5 : 4));
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialQuestion?.difficulty || '중');
  const [title, setTitle] = useState<string>(initialQuestion?.title || '');
  
  const [hasScore, setHasScore] = useState<boolean>(
    initialQuestion ? initialQuestion.hasScore : !isEntryMode
  );
  const [scoreAbc, setScoreAbc] = useState<string>(
    initialQuestion?.scoreAbc || 'X:1\nM:C\nL:1/1\nK:C\n[CE] |]'
  );
  const [hasAudio, setHasAudio] = useState<boolean>(initialQuestion?.hasAudio ?? false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialQuestion?.imageUrl);
  const [entryBlocksText, setEntryBlocksText] = useState<string>(
    initialQuestion?.entryBlocks
      ? initialQuestion.entryBlocks.join('\n')
      : isEntryMode && !initialQuestion
      ? '시작하기 버튼을 클릭했을 때\n  5번 반복하기\n    이동 방향으로 (10)만큼 움직이기'
      : ''
  );

  const [options, setOptions] = useState<string[]>(
    initialQuestion?.options && initialQuestion.options.length > 0
      ? initialQuestion.options
      : ['보기 1', '보기 2', '보기 3', '보기 4', '보기 5']
  );
  const [correctAnswer, setCorrectAnswer] = useState<string>(initialQuestion?.correctAnswer || '1');
  const [explanation, setExplanation] = useState<string>(initialQuestion?.explanation || '');

  // 모달 상태
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isSymbolPickerOpen, setIsSymbolPickerOpen] = useState(false);
  
  // 현재 포커스된 입력란 추적 (기호 입력용: 'title' | number(보기 인덱스))
  const [activeTarget, setActiveTarget] = useState<'title' | number>('title');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기호 삽입 처리
  const handleInsertSymbol = (sym: string) => {
    if (activeTarget === 'title') {
      setTitle((prev) => prev + sym);
    } else if (typeof activeTarget === 'number') {
      const updated = [...options];
      updated[activeTarget] = (updated[activeTarget] || '') + sym;
      setOptions(updated);
    }
  };

  // 이미지 파일 업로드 (Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, `보기 ${options.length + 1}`]);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      const updated = options.filter((_, i) => i !== idx);
      setOptions(updated);
      if (correctAnswer === String(idx + 1)) {
        setCorrectAnswer('1');
      } else if (Number(correctAnswer) > idx + 1) {
        setCorrectAnswer(String(Number(correctAnswer) - 1));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('문제 지문을 입력해주세요.');
      return;
    }

    const newQuestion: Question = {
      id: initialQuestion?.id || `q_${Date.now()}`,
      category,
      type,
      points: Number(points) || 4,
      difficulty,
      title,
      hasScore,
      scoreAbc: hasScore ? scoreAbc : '',
      hasAudio: hasScore && hasAudio,
      imageUrl,
      entryBlocks:
        entryBlocksText.trim()
          ? entryBlocksText.split('\n').filter((l) => l.trim().length > 0)
          : undefined,
      options: type === 'multiple-choice' ? options : [],
      correctAnswer,
      explanation,
    };

    onSave(newQuestion);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            {isEntryMode ? (
              <>
                <Code className="text-emerald-600" size={20} />
                <span>{initialQuestion ? '엔트리 문항 수정' : '새로운 엔트리 코딩 문항 출제'}</span>
              </>
            ) : (
              <span>{initialQuestion ? '문항 수정' : '새로운 문항 출제'}</span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            {isEntryMode
              ? '엔트리 블록 코드 지문과 보기, 정답, 해설을 입력하여 컴퓨터/정보 시험 문제를 완성하세요.'
              : '지문, 악보, 기호, 보기를 자유롭게 편집하여 시험 문제를 완성하세요.'}
          </p>
        </div>

        {/* 음악 기호 팔레트 열기 버튼 (음악 모드 전용) */}
        {!isEntryMode && (
          <button
            type="button"
            onClick={() => setIsSymbolPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition"
          >
            <span className="text-sm">♩</span>
            <span>음악 기호/음표 팔레트</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 메타데이터 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">영역 / 분류</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as QuestionCategory)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">문제 형태</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="multiple-choice">객관식 (선다형)</option>
              <option value="short-answer">주관식 (단답형)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">배점</label>
            <input
              type="number"
              min={1}
              max={20}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">난이도</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 퀵 음악 기호 툴바 (음악 모드 전용) */}
        {!isEntryMode && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">빠른 음악 기호:</span>
            {QUICK_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => handleInsertSymbol(sym)}
                className="px-2 py-1 text-xs font-medium bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 border border-slate-200 rounded-md transition shadow-2xs"
              >
                {sym}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsSymbolPickerOpen(true)}
              className="text-[11px] text-indigo-600 hover:underline font-semibold ml-auto"
            >
              전체 기호 보기 &rarr;
            </button>
          </div>
        )}

        {/* 지문 입력 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              문제 지문 (발문) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {activeTarget === 'title' ? '👈 현재 기호 삽입 대상: 지문' : ''}
            </span>
          </div>
          <textarea
            rows={2}
            value={title}
            onFocus={() => setActiveTarget('title')}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isEntryMode
                ? '예: 다음 엔트리 블록 코드가 실행을 마친 후 변수 [점수]에 저장된 최종 값은?'
                : '예: 다음 악보의 음정을 올바르게 구한 것은?'
            }
            className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
            required
          />
        </div>

        {/* 이미지 첨부 영역 */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-indigo-600" />
              <span className="text-xs font-bold text-slate-700">문제 참고 이미지 첨부 (악보 사진, 자료 그림 등)</span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition"
            >
              <Upload size={13} />
              <span>이미지 업로드</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {imageUrl && (
            <div className="relative inline-block border border-slate-300 rounded-xl overflow-hidden bg-white p-1">
              <img src={imageUrl} alt="첨부 이미지" className="max-h-48 object-contain rounded-lg" />
              <button
                type="button"
                onClick={() => setImageUrl(undefined)}
                className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md"
                title="이미지 삭제"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* 엔트리 블록 코드 설정 영역 (엔트리 모드이거나 엔트리 코딩 카테고리일 때) */}
        {(isEntryMode || category === '엔트리 코딩') && (
          <div className="border-2 border-emerald-300 rounded-2xl p-5 bg-emerald-50/40 space-y-3 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-emerald-700" />
                <span className="text-sm font-extrabold text-emerald-950">엔트리(Entry) 블록 코드 입력 (블록 조립소)</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">한 줄에 1개 블록씩 입력 (공백 2칸 들여쓰기로 계층 표현)</span>
            </div>

            {/* 자주 쓰는 엔트리 블록 원클릭 삽입 팔레트 */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-emerald-800">⚡ 자주 쓰는 블록 원클릭 삽입:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '+ 시작하기', code: '시작하기 버튼을 클릭했을 때' },
                  { label: '+ 빈칸 [ ㉠ ]', code: '[ ㉠ ]' },
                  { label: '+ 반복문', code: '  5번 반복하기' },
                  { label: '+ 이동하기', code: '    이동 방향으로 (10)만큼 움직이기' },
                  { label: '+ 조건문', code: '  만일 < ㉠ > 라면' },
                  { label: '+ 변수 정하기', code: '  [점수]를 (0)(으)로 정하기' },
                  { label: '+ 변수 더하기', code: '  [점수]에 (10)만큼 더하기' },
                  { label: '+ 벽에 튕기기', code: '  화면 끝에 닿으면 튕기기' },
                  { label: '+ 말하기', code: '  안녕!을 (2)초 동안 말하기' },
                ].map((snip, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setEntryBlocksText((prev) => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed}\n${snip.code}` : snip.code;
                      });
                    }}
                    className="px-2.5 py-1 text-xs bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg shadow-2xs font-semibold transition hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {snip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  블록 텍스트 입력창
                </label>
                <textarea
                  rows={8}
                  value={entryBlocksText}
                  onChange={(e) => setEntryBlocksText(e.target.value)}
                  placeholder="시작하기 버튼을 클릭했을 때&#10;  5번 반복하기&#10;    이동 방향으로 (10)만큼 움직이기"
                  className="w-full font-mono text-xs border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-inner leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  실시간 엔트리 블록 조립소 미리보기
                </label>
                <div className="min-h-[180px] bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-center overflow-auto shadow-inner">
                  {entryBlocksText.trim() ? (
                    <EntryBlockViewer
                      blocks={entryBlocksText.split('\n').filter((l) => l.trim().length > 0)}
                      className="w-full my-0"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 space-y-1">
                      <Code size={24} className="mx-auto opacity-40 text-emerald-600" />
                      <p className="text-xs">왼쪽 창에 입력하면 엔트리 블록 모양으로 즉시 조립됩니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 악보 설정 영역 (음악 문제용) */}
        {!isEntryMode && category !== '엔트리 코딩' && (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasScore}
                  onChange={(e) => setHasScore(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-sm font-semibold text-slate-700">오선보 악보 포함</span>
              </label>

              {hasScore && (
                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={hasAudio}
                    onChange={(e) => setHasAudio(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm text-slate-600">청음용 오디오 재생 활성화</span>
                </label>
              )}
            </div>

            {hasScore && (
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                <Wand2 size={13} />
                <span>악보 템플릿 불러오기</span>
              </button>
            )}
          </div>

          {hasScore && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  ABC Notation 악보 코드
                </label>
                <textarea
                  rows={5}
                  value={scoreAbc}
                  onChange={(e) => setScoreAbc(e.target.value)}
                  placeholder="X:1&#10;M:4/4&#10;L:1/4&#10;K:C&#10;C D E F |]"
                  className="w-full font-mono text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  실시간 렌더링 미리보기
                </label>
                <div className="bg-white border border-slate-200 rounded-lg p-2 min-h-[120px] flex items-center justify-center">
                  <ScoreViewer abcNotation={scoreAbc} showAudioControls={hasAudio} />
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* 객관식 보기 vs 주관식 답안 */}
        {type === 'multiple-choice' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  객관식 보기 및 정답 지정 (라디오 버튼으로 정답 선택)
                </label>
                <span className="text-[11px] text-slate-400">
                  * 보기를 클릭한 뒤 위의 음악 기호를 누르면 해당 보기에 음표가 입력됩니다.
                </span>
              </div>
              {options.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  <Plus size={13} /> 보기 추가
                </button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => {
                const optNum = String(idx + 1);
                const isCorrect = correctAnswer === optNum;
                const isFocused = activeTarget === idx;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                      isCorrect
                        ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200'
                        : isFocused
                        ? 'border-indigo-400 bg-indigo-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="correct-answer"
                        value={optNum}
                        checked={isCorrect}
                        onChange={() => setCorrectAnswer(optNum)}
                        className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className={`text-xs font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {'①②③④⑤'[idx]}
                      </span>
                    </label>

                    <input
                      type="text"
                      value={opt}
                      onFocus={() => setActiveTarget(idx)}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`보기 ${idx + 1} 내용 (예: ♩ 4분음표)`}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="보기 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              주관식 / 단답형 정답 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="예: 세마치 장단"
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>
        )}

        {/* 정답 해설 */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            정답 및 해설 (시험 후 해설지에 출력됨)
          </label>
          <textarea
            rows={2}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="학생들이 이해하기 쉬운 정답 해설을 작성하세요."
            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
          />
        </div>

        {/* 버튼 영역 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            취소
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
          >
            <CheckCircle2 size={16} />
            <span>{initialQuestion ? '수정 완료' : '문항 추가'}</span>
          </button>
        </div>
      </form>

      {/* 프리셋 모달 */}
      <ScorePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={(presetAbc) => {
          setScoreAbc(presetAbc);
          setHasScore(true);
        }}
      />

      {/* 음악 기호 팔레트 모달 */}
      <MusicSymbolPicker
        isOpen={isSymbolPickerOpen}
        onClose={() => setIsSymbolPickerOpen(false)}
        onSelectSymbol={handleInsertSymbol}
      />
    </div>
  );
};
