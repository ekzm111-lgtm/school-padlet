'use client';

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  X,
  Play,
  Sparkles,
  ClipboardPaste,
  Copy,
  Check,
  CheckCircle2,
  Code,
  Music,
  HelpCircle,
  Users,
  Bot,
  BookOpen,
  History,
  Edit3,
  Trash2,
  RotateCcw,
  Search,
  Plus,
  Save,
  ArrowLeft,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import { ExamInfo, Question } from '@/types/exam';
import { Board, User } from '@/lib/types';
import { SavedQuizPackage } from '@/types/quiz';
import {
  QUIZ_PRESETS,
  QuizPresetItem,
  SAMPLE_BATCH_TEXT,
  AI_QUIZ_PROMPT_TEMPLATE,
} from '@/data/quizPresets';
import {
  createQuizRoom,
  getAllSavedQuizPackages,
  fetchQuizPackagesAsync,
  saveQuizPackage,
  updateSavedQuizPackage,
  deleteSavedQuizPackage,
} from '@/utils/quizStorage';

interface BoardQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  currentUser: User | null;
  isTeacherOrAdmin: boolean;
  activeQuizPin?: string | null;
  onStartLive: (pin: string, with100Bots?: boolean) => void;
  onJoinAsStudent: (pin: string) => void;
}

export default function BoardQuizModal({
  isOpen,
  onClose,
  board,
  currentUser,
  isTeacherOrAdmin,
  activeQuizPin,
  onStartLive,
  onJoinAsStudent,
}: BoardQuizModalProps) {
  // 모달 메인 탭: 'new'(새 퀴즈 출제) | 'history'(진행 기록 및 보관함 게시판)
  const [mainTab, setMainTab] = useState<'new' | 'history'>('new');
  
  // 새 퀴즈 출제 상태
  const [selectedPresetId, setSelectedPresetId] = useState<string>('general');
  const [showBatchText, setShowBatchText] = useState(false);
  const [batchText, setBatchText] = useState(SAMPLE_BATCH_TEXT);
  const [copiedSample, setCopiedSample] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<Question[] | null>(null);
  const [with100Bots, setWith100Bots] = useState(false);

  // 퀴즈 기록 보관함 상태
  const [savedPackages, setSavedPackages] = useState<SavedQuizPackage[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [editingPackage, setEditingPackage] = useState<SavedQuizPackage | null>(null);

  // 패키지 목록 동기화
  const loadSavedPackages = async () => {
    try {
      const local = getAllSavedQuizPackages();
      setSavedPackages(local);
      const remote = await fetchQuizPackagesAsync();
      if (remote && remote.length > 0) {
        setSavedPackages(remote);
      }
    } catch (e) {
      console.warn('Failed to load packages:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedPackages();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPreset = QUIZ_PRESETS.find((p) => p.id === selectedPresetId) || QUIZ_PRESETS[0];
  const activeQuestions = customQuestions || currentPreset.questions;
  const activeExamInfo = currentPreset.examInfo;

  // 텍스트 일괄 붙여넣기 파싱
  const handleApplyBatchText = () => {
    if (!batchText.trim()) return;
    try {
      const blocks = batchText.split(/---|\n\n\n/).map((b) => b.trim()).filter(Boolean);
      const parsedQuestions: Question[] = [];

      blocks.forEach((block, idx) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) return;

        let title = lines[0].replace(/^\d+[\.\)]\s*/, '');
        let points = 5;
        const ptMatch = title.match(/\[(\d+)점\]/);
        if (ptMatch) {
          points = parseInt(ptMatch[1], 10);
          title = title.replace(/\[\d+점\]/, '').trim();
        }

        const options: string[] = [];
        let correctAnswer = '1';
        let explanation = '';

        lines.slice(1).forEach((line) => {
          if (line.startsWith('정답:') || line.startsWith('답:') || line.startsWith('정답 :')) {
            const num = line.replace(/[^0-9]/g, '');
            if (num) correctAnswer = num;
          } else if (line.includes('해설:') || line.includes('💡')) {
            explanation = line.replace(/^[💡\s]*해설:\s*/, '').trim();
          } else if (line.match(/^[\(①②③④⑤\d]/)) {
            const opt = line.replace(/^[\(①②③④⑤\d\)\.\s]+/, '').trim();
            if (opt) options.push(opt);
          }
        });

        if (options.length === 0) {
          options.push('O (그렇다)', 'X (아니다)');
        }

        parsedQuestions.push({
          id: `custom_q_${Date.now()}_${idx}`,
          category: '사용자 출제',
          type: 'multiple-choice',
          points,
          title,
          hasScore: false,
          scoreAbc: '',
          hasAudio: false,
          options,
          correctAnswer,
          explanation: explanation || '선생님이 출제하신 문제의 정답입니다.',
          difficulty: '중',
        });
      });

      if (parsedQuestions.length > 0) {
        setCustomQuestions(parsedQuestions);
        setShowBatchText(false);
        alert(`🎉 ${parsedQuestions.length}문항이 성공적으로 파싱되어 준비되었습니다!`);
      } else {
        alert('문제를 인식하지 못했습니다. 표준 샘플 양식을 확인해 주세요.');
      }
    } catch (e) {
      alert('문제 파싱 중 오류가 발생했습니다.');
    }
  };

  // 🚀 새 라이브 퀴즈 시작 (동시에 퀴즈 보관함에 자동 기록 저장)
  const handleStart = () => {
    const examInfoToUse: ExamInfo = {
      ...activeExamInfo,
      schoolName: board.title,
      subject: customQuestions ? '사용자 맞춤 출제' : currentPreset.title,
    };
    const room = createQuizRoom(examInfoToUse, activeQuestions, 20, true);

    // 🔥 진행 퀴즈 자동 보관함/기록 저장 (다시 풀기 및 열람 지원)
    try {
      const quizTitle = customQuestions
        ? `[${board.title}] 직접 출제 퀴즈 (${activeQuestions.length}문항)`
        : `[${board.title}] ${currentPreset.title}`;
      saveQuizPackage(
        quizTitle,
        'quiz',
        examInfoToUse,
        activeQuestions,
        `[${board.title}] 보드에서 진행된 실시간 퀴즈 (참여 PIN: ${room.pin})`,
        {
          boardId: board.id,
          authorName: currentUser?.name || '선생님',
          lastPin: room.pin,
        }
      );
    } catch (e) {}

    onStartLive(room.pin, with100Bots);
    onClose();
  };

  // 🚀 보관함의 퀴즈로 바로 다시 풀기 / 재출제
  const handleStartFromPackage = (pkg: SavedQuizPackage) => {
    if (!pkg.questions || pkg.questions.length === 0) {
      alert('해당 퀴즈에 문제가 없습니다.');
      return;
    }
    const examInfoToUse: ExamInfo = {
      ...pkg.examInfo,
      schoolName: board.title,
    };
    const room = createQuizRoom(examInfoToUse, pkg.questions, 20, true);

    // 최근 진행 PIN 업데이트
    updateSavedQuizPackage(pkg.id, { lastPin: room.pin });

    alert(`🎉 '${pkg.title}' 퀴즈가 새로운 방(PIN: ${room.pin})으로 시작되었습니다!`);
    onStartLive(room.pin, with100Bots);
    onClose();
  };

  // 🗑️ 보관함 퀴즈 삭제
  const handleDeletePackage = (id: string, title: string) => {
    if (confirm(`'${title}' 퀴즈 기록을 삭제하시겠습니까?`)) {
      deleteSavedQuizPackage(id);
      setSavedPackages((prev) => prev.filter((p) => p.id !== id));
      if (editingPackage?.id === id) {
        setEditingPackage(null);
      }
    }
  };

  // ✏️ 보관함 퀴즈 수정 저장
  const handleSavePackageEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    const updated = updateSavedQuizPackage(editingPackage.id, {
      title: editingPackage.title,
      description: editingPackage.description,
      questions: editingPackage.questions,
    });

    if (updated) {
      setSavedPackages((prev) =>
        prev.map((p) => (p.id === editingPackage.id ? updated : p))
      );
      setEditingPackage(null);
      alert('퀴즈 내용이 성공적으로 수정 및 저장되었습니다!');
    }
  };

  // 검색 필터링된 기록 패키지 목록
  const filteredPackages = savedPackages.filter((pkg) => {
    const q = historySearchTerm.toLowerCase();
    return (
      pkg.title.toLowerCase().includes(q) ||
      (pkg.description && pkg.description.toLowerCase().includes(q)) ||
      (pkg.savedAt && pkg.savedAt.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  이 보드 전용 실시간 퀴즈
                </h3>
                <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-black">
                  QuizN Live
                </span>
                {activeQuizPin && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>진행 중 PIN: {activeQuizPin}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md mt-0.5">
                [{board.title}] 보드 참여 학생들과 실시간 퀴즈를 출제하고 기록을 관리합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 (교사/관리자 전용) */}
        {isTeacherOrAdmin && !editingPackage && (
          <div className="px-5 pt-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMainTab('new')}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-black text-xs transition whitespace-nowrap ${
                mainTab === 'new'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>새 퀴즈 출제</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMainTab('history');
                loadSavedPackages();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-black text-xs transition whitespace-nowrap ${
                mainTab === 'history'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>📜 퀴즈 진행 기록 및 보관함 ({savedPackages.length}개)</span>
            </button>
          </div>
        )}

        {/* 학생 화면: 현재 진행 중인 퀴즈가 있는 경우 바로 입장 */}
        {!isTeacherOrAdmin && activeQuizPin ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 animate-bounce">
              <Gamepad2 className="w-9 h-9" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                선생님이 퀴즈를 시작했습니다!
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                지금 바로 퀴즈 대결에 입장하세요!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                별도의 PIN 번호 입력 없이 버튼 하나로 1초 만에 입장합니다.
              </p>
            </div>

            <button
              onClick={() => {
                onJoinAsStudent(activeQuizPin);
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>🎮 퀴즈 대결 입장하기</span>
            </button>
          </div>
        ) : !isTeacherOrAdmin ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Gamepad2 className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">현재 진행 중인 퀴즈가 없습니다.</p>
            <p className="text-slate-400">선생님이 이 보드에서 실시간 퀴즈를 시작하면 화면에 알림이 나타납니다.</p>
          </div>
        ) : editingPackage ? (
          /* ======================================================== */
          /* ✏️ 퀴즈 수정 에디터 화면 (게시판 항목 편집)                */
          /* ======================================================== */
          <form onSubmit={handleSavePackageEdit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>기록 목록으로 돌아가기</span>
              </button>
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                퀴즈 편집 모드
              </span>
            </div>

            {/* 기본 정보 */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  퀴즈 제목
                </label>
                <input
                  type="text"
                  value={editingPackage.title}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, title: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  퀴즈 설명 / 비고
                </label>
                <input
                  type="text"
                  value={editingPackage.description || ''}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 문항 목록 수정 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>문항 목록 ({editingPackage.questions.length}문항)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const newQ: Question = {
                      id: `q_edit_${Date.now()}`,
                      category: '직접 추가',
                      type: 'multiple-choice',
                      points: 5,
                      title: '새로운 퀴즈 질문을 입력하세요.',
                      hasScore: false,
                      scoreAbc: '',
                      hasAudio: false,
                      options: ['1번 보기', '2번 보기', '3번 보기', '4번 보기'],
                      correctAnswer: '1',
                      explanation: '',
                      difficulty: '중',
                    };
                    setEditingPackage({
                      ...editingPackage,
                      questions: [...editingPackage.questions, newQ],
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>문항 추가</span>
                </button>
              </div>

              <div className="space-y-3">
                {editingPackage.questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-indigo-600">
                        Q{qIdx + 1}.
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                          <span>배점:</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={q.points || 5}
                            onChange={(e) => {
                              const pts = parseInt(e.target.value, 10) || 5;
                              const updatedQs = [...editingPackage.questions];
                              updatedQs[qIdx] = { ...updatedQs[qIdx], points: pts };
                              setEditingPackage({ ...editingPackage, questions: updatedQs });
                            }}
                            className="w-12 px-1.5 py-0.5 rounded border border-slate-200 text-xs font-bold text-center"
                          />
                          <span>점</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingPackage.questions.length <= 1) {
                              alert('최소 1문항은 유지되어야 합니다.');
                              return;
                            }
                            const updatedQs = editingPackage.questions.filter((_, idx) => idx !== qIdx);
                            setEditingPackage({ ...editingPackage, questions: updatedQs });
                          }}
                          className="p-1 rounded text-rose-400 hover:text-rose-600 transition"
                          title="문항 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 질문 내용 */}
                    <input
                      type="text"
                      value={q.title}
                      onChange={(e) => {
                        const updatedQs = [...editingPackage.questions];
                        updatedQs[qIdx] = { ...updatedQs[qIdx], title: e.target.value };
                        setEditingPackage({ ...editingPackage, questions: updatedQs });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="질문을 입력하세요..."
                    />

                    {/* 4개 보기 및 정답 체크 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || ['1', '2', '3', '4']).map((opt, oIdx) => {
                        const isCorrect = String(q.correctAnswer) === String(oIdx + 1);
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                              isCorrect
                                ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const updatedQs = [...editingPackage.questions];
                                updatedQs[qIdx] = {
                                  ...updatedQs[qIdx],
                                  correctAnswer: String(oIdx + 1),
                                };
                                setEditingPackage({ ...editingPackage, questions: updatedQs });
                              }}
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 transition ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title={isCorrect ? '정답' : '정답으로 지정'}
                            >
                              {oIdx + 1}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...(q.options || [])];
                                newOpts[oIdx] = e.target.value;
                                const updatedQs = [...editingPackage.questions];
                                updatedQs[qIdx] = { ...updatedQs[qIdx], options: newOpts };
                                setEditingPackage({ ...editingPackage, questions: updatedQs });
                              }}
                              className="flex-1 bg-transparent text-xs outline-none"
                              placeholder={`보기 ${oIdx + 1}`}
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-black text-emerald-700 shrink-0">
                                정답
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 해설 */}
                    <div>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => {
                          const updatedQs = [...editingPackage.questions];
                          updatedQs[qIdx] = { ...updatedQs[qIdx], explanation: e.target.value };
                          setEditingPackage({ ...editingPackage, questions: updatedQs });
                        }}
                        className="w-full px-3 py-1 rounded-lg border border-slate-100 text-[11px] text-slate-500 bg-slate-50 focus:bg-white outline-none"
                        placeholder="정답 해설 (선택 사항)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 저장/취소 버튼 */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white/95 backdrop-blur-xs py-2">
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>수정 완료 저장</span>
              </button>
            </div>
          </form>
        ) : mainTab === 'history' ? (
          /* ======================================================== */
          /* 📜 지난 퀴즈 진행 기록 및 보관함 (게시판 형태 화면)        */
          /* ======================================================== */
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            {/* 검색 바 및 헤더 요약 */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="퀴즈 제목, 진행 일시 검색..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                보관된 퀴즈 총 <strong className="text-slate-800">{filteredPackages.length}개</strong>
              </div>
            </div>

            {/* 퀴즈 기록 목록 (게시판 카드 리스트) */}
            {filteredPackages.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs space-y-2">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-600 text-sm">보관된 퀴즈 기록이 없습니다.</p>
                <p>
                  새 퀴즈를 출제하여 시작하면 여기에 자동으로 기록되어 언제든 다시 풀 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => setMainTab('new')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold transition text-xs inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 퀴즈 출제하러 가기</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredPackages.map((pkg) => {
                  const isCurrentBoard = pkg.boardId === board.id;
                  return (
                    <div
                      key={pkg.id}
                      className={`p-4 rounded-2xl border transition shadow-xs hover:shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isCurrentBoard
                          ? 'bg-gradient-to-r from-purple-50/50 to-white border-purple-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900 truncate">
                            {pkg.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                            {pkg.questionCount || (pkg.questions ? pkg.questions.length : 0)}문항
                          </span>
                          {isCurrentBoard && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">
                              현재 보드 진행
                            </span>
                          )}
                          {pkg.lastPin && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
                              PIN #{pkg.lastPin}
                            </span>
                          )}
                        </div>

                        {pkg.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{pkg.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            <span>{pkg.savedAt || '기록됨'}</span>
                          </span>
                          {pkg.authorName && (
                            <>
                              <span>·</span>
                              <span>출제: {pkg.authorName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 액션 버튼 그룹: [🚀 다시 풀기] [✏️ 수정] [🗑️ 삭제] */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartFromPackage(pkg)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1 active:scale-95"
                          title="이 문제 세트로 새로운 퀴즈 대결 방을 열어 다시 풀기"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>다시 풀기</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPackage(pkg)}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition"
                          title="퀴즈 제목 및 문항 수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg.id, pkg.title)}
                          className="p-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition"
                          title="퀴즈 기록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* 🎯 새 퀴즈 출제 화면 (공식 프리셋 / 텍스트 일괄 붙여넣기) */
          /* ======================================================== */
          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {/* 1. 프리셋 퀴즈 선택 (4종 공식 샘플) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>수업 맞춤 퀴즈 패키지 선택</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowBatchText(!showBatchText)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{showBatchText ? '패키지 목록 보기' : '📝 텍스트 일괄 붙여넣기 출제'}</span>
                </button>
              </div>

              {!showBatchText ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUIZ_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id && !customQuestions;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setCustomQuestions(null);
                        }}
                        className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between gap-2 shadow-2xs ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-300/60'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${preset.badgeColor}`}>
                              {preset.badge}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {preset.questions.length}문항
                            </span>
                          </div>
                          <div className="font-extrabold text-xs text-slate-800 line-clamp-1">
                            {preset.title}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                            {preset.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>선택됨 (준비 완료)</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* 텍스트 일괄 붙여넣기 에디터 */
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      메모장 문제 텍스트 복사/붙여넣기
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(SAMPLE_BATCH_TEXT);
                          setCopiedSample(true);
                          setTimeout(() => setCopiedSample(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        {copiedSample ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSample ? '복사됨!' : '표준 양식 복사'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(AI_QUIZ_PROMPT_TEMPLATE);
                          setCopiedAiPrompt(true);
                          setTimeout(() => setCopiedAiPrompt(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        {copiedAiPrompt ? <Check className="w-3 h-3 text-emerald-500" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                        <span>{copiedAiPrompt ? '복사됨!' : 'AI 프롬프트 복사'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder="여기에 문제 텍스트를 붙여넣으세요..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={handleApplyBatchText}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition active:scale-98"
                  >
                    붙여넣은 텍스트 문제로 1초 적용하기
                  </button>
                </div>
              )}
            </div>

            {/* 2. 문제 미리보기 요약 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>선택된 문제 세트: {customQuestions ? '사용자 직접 출제' : currentPreset.title}</span>
                <span className="text-indigo-600 font-extrabold">{activeQuestions.length}문항</span>
              </div>
              <div className="space-y-1 text-slate-500 text-[11px]">
                {activeQuestions.slice(0, 3).map((q, i) => (
                  <div key={q.id} className="truncate">
                    {i + 1}. {q.title}
                  </div>
                ))}
                {activeQuestions.length > 3 && (
                  <div className="text-slate-400">... 외 {activeQuestions.length - 3}문항 더 있음</div>
                )}
              </div>
            </div>

            {/* 3. 100명 모의 학생 시뮬레이션 체크박스 */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border border-purple-200/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-purple-600" />
                  <span>100명 가상 학생 동시 응시 시뮬레이션</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  컴퓨터 100대 없이도 100명의 가상 학생이 자동 입장하고 랜덤 응시하여 순위표를 테스트합니다.
                </p>
              </div>
              <input
                type="checkbox"
                checked={with100Bots}
                onChange={(e) => setWith100Bots(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0 ml-3"
              />
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {with100Bots
                  ? '🚀 100명 가상 학생과 함께 라이브 퀴즈 시작하기'
                  : '🚀 이 보드에서 실시간 라이브 퀴즈 시작하기'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
