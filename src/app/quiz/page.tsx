'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ExamInfo, Question } from '@/types/exam';
import type { SavedQuizPackage } from '@/types/quiz';
import { defaultEntryExamInfo, defaultEntryQuestions } from '@/data/defaultEntryExam';
import { defaultExamInfo, defaultQuestions } from '@/data/defaultExam';
import { QuestionEditor } from '@/components/quiz/QuestionEditor';
import { BatchTextQuestionModal } from '@/components/quiz/BatchTextQuestionModal';
import { QuizLobbyModal } from '@/components/quiz/QuizLobbyModal';
import { QuizHostScreen } from '@/components/quiz/QuizHostScreen';
import { QuizStudentScreen } from '@/components/quiz/QuizStudentScreen';
import { QuizLeaderboardBoard } from '@/components/quiz/QuizLeaderboardBoard';
import { QuizLibraryBoard } from '@/components/quiz/QuizLibraryBoard';
import { EntryBlockViewer } from '@/components/quiz/EntryBlockViewer';
import { ScoreViewer } from '@/components/quiz/ScoreViewer';
import { bgmEngine } from '@/utils/bgmEngine';
import {
  Sparkles,
  Plus,
  Play,
  Users,
  Trophy,
  FolderArchive,
  ClipboardPaste,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  ArrowLeft,
  GraduationCap,
  Gamepad2,
  HelpCircle,
  Hash,
  School,
  CheckCircle2,
} from 'lucide-react';

function QuizAppContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 과목 선택 ('entry': 엔트리/코딩, 'music': 음악/기타) - 기본 엔트리 코딩
  const [activeSubject, setActiveSubject] = useState<'entry' | 'music'>('entry');

  // 시험 정보 및 문제 목록 (기본 엔트리 코딩 시험 지필평가)
  const [examInfo, setExamInfo] = useState<ExamInfo>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quiz_exam_info');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return defaultEntryExamInfo;
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quiz_questions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return defaultEntryQuestions;
  });

  // DB 최초 로드 완료 플래그 (로드 전에 기본값으로 DB를 덮어쓰는 버그 원천 차단)
  const isInitialLoaded = React.useRef(false);

  // DB(서버)에서 최신 퀴즈 동기화
  useEffect(() => {
    let isMounted = true;
    async function loadFromDb() {
      try {
        const res = await fetch('/api/quiz/current');
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data && isMounted) {
            if (json.data.examInfo) {
              setExamInfo(json.data.examInfo);
              localStorage.setItem('quiz_exam_info', JSON.stringify(json.data.examInfo));
            }
            if (json.data.questions && json.data.questions.length > 0) {
              setQuestions(json.data.questions);
              localStorage.setItem('quiz_questions', JSON.stringify(json.data.questions));
            }
            if (json.data.subject) {
              setActiveSubject(json.data.subject);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load quiz from DB/server:', e);
      } finally {
        if (isMounted) {
          isInitialLoaded.current = true;
        }
      }
    }
    loadFromDb();
    return () => { isMounted = false; };
  }, []);

  // 활성 탭: 'questions' (문제 출제 및 관리) | 'lobby' (퀴즈앤 대기실) | 'student' (학생 참여) | 'leaderboard' (순위표) | 'library' (보관함)
  const [activeTab, setActiveTab] = useState<'questions' | 'student' | 'leaderboard' | 'library'>('questions');

  // 모달 및 화면 상태
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>(undefined);
  const [isBatchTextOpen, setIsBatchTextOpen] = useState(false);

  // 라이브 퀴즈 실행 상태
  const [activeHostPin, setActiveHostPin] = useState<string | null>(null);
  const [activeStudentPin, setActiveStudentPin] = useState<string | null>(null);
  const [selectedBoardPin, setSelectedBoardPin] = useState<string | undefined>(undefined);

  // 학생 PIN 직접 입력 상태
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // BGM 상태
  const [bgmState, setBgmState] = useState(bgmEngine.getStatus());

  useEffect(() => {
    const unsub = bgmEngine.subscribe(() => {
      setBgmState(bgmEngine.getStatus());
    });
    return () => unsub();
  }, []);

  // URL 쿼리 파라미터 감지 (?pin=... &role=host/student)
  useEffect(() => {
    const pin = searchParams.get('pin');
    const role = searchParams.get('role');
    const tab = searchParams.get('tab');

    if (pin) {
      if (role === 'host') {
        setActiveHostPin(pin);
      } else {
        setActiveStudentPin(pin);
      }
    }

    if (tab && ['questions', 'student', 'leaderboard', 'library'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // 로컬 저장 및 DB(서버) 자동 동기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz_exam_info', JSON.stringify(examInfo));
    }
  }, [examInfo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz_questions', JSON.stringify(questions));
    }
  }, [questions]);

  // DB(서버)로 실시간 저장 (디바운스 800ms) - 초기 DB 로드 완료 이후에만 실행
  useEffect(() => {
    if (!isInitialLoaded.current) return;
    if (!examInfo || !questions || questions.length === 0) return;
    const timer = setTimeout(() => {
      fetch('/api/quiz/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examInfo,
          questions,
          subject: activeSubject,
        }),
      }).catch((e) => console.warn('Failed to sync quiz to DB:', e));
    }, 800);

    return () => clearTimeout(timer);
  }, [examInfo, questions, activeSubject]);

  // 과목 변경 (즉시 DB에 영구 반영)
  const handleSwitchSubject = (subj: 'entry' | 'music') => {
    setActiveSubject(subj);
    const nextExam = subj === 'entry' ? defaultEntryExamInfo : defaultExamInfo;
    const nextQuestions = subj === 'entry' ? defaultEntryQuestions : defaultQuestions;
    setExamInfo(nextExam);
    setQuestions(nextQuestions);

    // 즉시 DB에 저장
    fetch('/api/quiz/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examInfo: nextExam,
        questions: nextQuestions,
        subject: subj,
      }),
    }).catch((e) => console.warn('Failed to switch subject in DB:', e));
  };

  // 문항 추가/수정/삭제/순서변경
  const handleAddNewQuestion = () => {
    setEditingQuestion(undefined);
    setIsEditing(true);
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setIsEditing(true);
  };

  const handleSaveQuestion = (q: Question) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((item) => item.id === q.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = q;
        return next;
      }
      return [...prev, q];
    });
    setIsEditing(false);
    setEditingQuestion(undefined);
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm('이 문제를 삭제하시겠습니까?')) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  // 학생 PIN 입력 제출
  const handleStudentJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const trimmed = pinInput.trim();
    if (!trimmed || trimmed.length !== 6) {
      setPinError('6자리 PIN 번호를 정확히 입력해주세요.');
      return;
    }
    setActiveStudentPin(trimmed);
  };

  // 라이브 호스트 시작
  const handleStartHost = (pin: string) => {
    setIsLobbyOpen(false);
    setActiveHostPin(pin);
  };

  // 라이브 학생 시작
  const handleStartPlayer = (pin: string) => {
    setIsLobbyOpen(false);
    setActiveStudentPin(pin);
  };

  // 1. 교사용 대형 빔프로젝터 호스트 화면이 활성화된 경우
  if (activeHostPin) {
    return (
      <QuizHostScreen
        pin={activeHostPin}
        onExit={() => setActiveHostPin(null)}
        onViewLeaderboard={(pin) => {
          setSelectedBoardPin(pin);
          setActiveHostPin(null);
          setActiveTab('leaderboard');
        }}
      />
    );
  }

  // 2. 학생용 실시간 응시 화면이 활성화된 경우
  if (activeStudentPin) {
    return (
      <QuizStudentScreen
        pin={activeStudentPin}
        onExit={() => setActiveStudentPin(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 text-slate-900 flex flex-col">
      {/* 상단 네비게이션 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
              title="스쿨패들 메인으로 이동"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">스쿨패들 홈</span>
            </Link>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span>스쿨패들 퀴즈앤</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs">
                    QuizN Live
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  선생님 출제 & 학생 실시간 모바일 퀴즈 대결 시스템
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 사운드/BGM 토글 버튼 */}
            <button
              onClick={() => bgmEngine.toggleMute()}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
                bgmState.isMuted
                  ? 'border-slate-200 text-slate-400 hover:bg-slate-100'
                  : 'border-purple-200 bg-purple-50 text-purple-700 shadow-xs'
              }`}
              title={bgmState.isMuted ? '사운드 켜기' : '사운드 음소거'}
            >
              {bgmState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden md:inline">{bgmState.isMuted ? '소리 꺼짐' : 'BGM 켜짐'}</span>
            </button>

            {/* 실시간 퀴즈 시작 (교사/호스트 대기실 열기) */}
            <button
              onClick={() => setIsLobbyOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-md shadow-purple-500/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>라이브 퀴즈 시작</span>
            </button>
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 바 */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'questions'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit2 className="w-4 h-4" />
              <span>문제 출제 및 관리 ({questions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'student'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>학생 참여 모드</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>명예의 전당 / 순위표</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'library'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              <span>퀴즈 보관함</span>
            </button>
          </div>

          {/* 과목 모드 토글 */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-400 px-2">과목 프리셋:</span>
            <button
              onClick={() => handleSwitchSubject('entry')}
              className={`px-2.5 py-1 rounded-xl font-bold transition ${
                activeSubject === 'entry' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              💻 정보 (엔트리 코딩)
            </button>
            <button
              onClick={() => handleSwitchSubject('music')}
              className={`px-2.5 py-1 rounded-xl font-bold transition ${
                activeSubject === 'music' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🎵 음악 / 일반
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* 탭 1: 문제 출제 및 관리 */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {/* 상단 액션 바 */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {examInfo.grade} {examInfo.term} - {examInfo.subject}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  총 {questions.length}문항 | 총점 {questions.reduce((sum, q) => sum + (q.points || 0), 0)}점
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsBatchTextOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition flex items-center gap-1.5"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>텍스트 일괄 붙여넣기 (AI 지원)</span>
                </button>

                <button
                  onClick={handleAddNewQuestion}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>새 문제 직접 만들기</span>
                </button>
              </div>
            </div>

            {/* 문항 카드 리스트 */}
            {questions.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">등록된 문제가 없습니다</h3>
                <p className="text-xs text-slate-400 mt-1">
                  위의 &apos;새 문제 직접 만들기&apos; 또는 &apos;텍스트 일괄 붙여넣기&apos;로 문제를 추가해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                          {q.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold">
                          {q.points}점
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold">
                          난이도: {q.difficulty}
                        </span>
                      </div>

                      {/* 순서 이동 & 수정 / 삭제 버튼 */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          disabled={idx === questions.length - 1}
                          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition ml-1"
                          title="문제 수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="문제 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 문제 본문 */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug whitespace-pre-wrap">
                      {q.title}
                    </h3>

                    {/* 첨부 이미지 */}
                    {q.imageUrl && (
                      <div className="max-w-md max-h-56 overflow-hidden rounded-2xl border border-slate-200">
                        <img src={q.imageUrl} alt="문제 이미지" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* 엔트리 블록 코드 지문 */}
                    {q.entryBlocks && q.entryBlocks.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-w-xl">
                        <EntryBlockViewer blocks={q.entryBlocks} />
                      </div>
                    )}

                    {/* 악보 지문 */}
                    {q.hasScore && q.scoreAbc && (
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 max-w-xl">
                        <ScoreViewer abcNotation={q.scoreAbc} scale={0.9} />
                      </div>
                    )}

                    {/* 4~5지선다 보기 리스트 */}
                    {q.type === 'multiple-choice' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = String(optIdx + 1) === String(q.correctAnswer).trim();
                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {optIdx + 1}
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 주관식 정답 */}
                    {q.type === 'short-answer' && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold inline-block">
                        정답: {q.correctAnswer}
                      </div>
                    )}

                    {/* 해설 */}
                    {q.explanation && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700">💡 해설:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 탭 2: 학생 참여 모드 */}
        {activeTab === 'student' && (
          <div className="max-w-md mx-auto py-10">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
                <Gamepad2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  학생 퀴즈앤 참여
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  선생님이 칠판에 띄운 6자리 PIN 번호를 입력하세요!
                </p>
              </div>

              <form onSubmit={handleStudentJoin} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="6자리 PIN 번호 (예: 123456)"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/[^0-9]/g, ''));
                      setPinError('');
                    }}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-center text-2xl font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition"
                  />
                </div>

                {pinError && <p className="text-xs text-rose-500 font-bold">{pinError}</p>}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-base shadow-lg shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition"
                >
                  퀴즈 입장하기
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 탭 3: 순위표 / 명예의 전당 */}
        {activeTab === 'leaderboard' && (
          <QuizLeaderboardBoard
            initialPin={selectedBoardPin}
            onBackToHome={() => setActiveTab('questions')}
            onOpenLobbyForPin={(pin) => {
              setActiveHostPin(pin);
            }}
            onStartTeacherMode={(pin) => {
              setActiveHostPin(pin);
            }}
            onPlayPin={(pin) => {
              setActiveStudentPin(pin);
            }}
          />
        )}

        {/* 탭 4: 퀴즈 보관함 */}
        {activeTab === 'library' && (
          <QuizLibraryBoard
            onLoadPackage={(pkg: SavedQuizPackage) => {
              setExamInfo(pkg.examInfo);
              setQuestions(pkg.questions);
              setActiveTab('questions');
              alert(`'${pkg.title}' 퀴즈가 성공적으로 불러와졌습니다!`);
            }}
            currentExamInfo={examInfo}
            currentQuestions={questions}
          />
        )}
      </main>

      {/* 문제 출제 및 수정 모달 */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
            <QuestionEditor
              initialQuestion={editingQuestion}
              subject={activeSubject}
              onSave={handleSaveQuestion}
              onCancel={() => {
                setIsEditing(false);
                setEditingQuestion(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* 텍스트 일괄 붙여넣기 모달 (AI 연동) */}
      {isBatchTextOpen && (
        <BatchTextQuestionModal
          isOpen={isBatchTextOpen}
          subject={activeSubject}
          onClose={() => setIsBatchTextOpen(false)}
          onAddQuestions={(newQuestions) => {
            setQuestions((prev) => [...prev, ...newQuestions]);
            setIsBatchTextOpen(false);
          }}
        />
      )}

      {/* 퀴즈앤 로비 & PIN 생성 대기실 모달 */}
      {isLobbyOpen && (
        <QuizLobbyModal
          isOpen={isLobbyOpen}
          onClose={() => setIsLobbyOpen(false)}
          examInfo={examInfo}
          questions={questions}
          onStartAsHost={handleStartHost}
          onStartAsPlayer={handleStartPlayer}
          onOpenLeaderboard={(pin) => {
            setSelectedBoardPin(pin);
            setIsLobbyOpen(false);
            setActiveTab('leaderboard');
          }}
        />
      )}
    </div>
  );
}

export default function QuizAppPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">퀴즈앤 불러오는 중...</div>}>
      <QuizAppContent />
    </Suspense>
  );
}
