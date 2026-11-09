import React, { useState, useEffect } from 'react';
import type { SavedQuizPackage } from '@/types/quiz';
import type { ExamInfo, Question } from '@/types/exam';
import {
  getAllSavedQuizPackages,
  fetchQuizPackagesAsync,
  saveQuizPackage,
  deleteSavedQuizPackage,
  subscribeToQuizUpdates,
} from '@/utils/quizStorage';
import {
  FolderOpen,
  Trash2,
  Calendar,
  BookOpen,
  Play,
  QrCode,
  Music,
  Code,
  Search,
  FileText,
  Save,
  Laptop,
} from 'lucide-react';

interface QuizLibraryBoardProps {
  currentExamInfo: ExamInfo;
  currentQuestions: Question[];
  currentSubject?: 'music' | 'entry';
  onLoadPackage: (pkg: SavedQuizPackage) => void;
  onLaunchQuizRoom?: (examInfo: ExamInfo, questions: Question[]) => void;
  onStartTeacherMode?: (examInfo: ExamInfo, questions: Question[]) => void;
  onStartHostQuiz?: (pkg: SavedQuizPackage) => void;
  onStartCbt?: (pkg: SavedQuizPackage) => void;
  onClose?: () => void;
}

export const QuizLibraryBoard: React.FC<QuizLibraryBoardProps> = ({
  currentExamInfo,
  currentQuestions,
  currentSubject = 'music',
  onLoadPackage,
  onLaunchQuizRoom,
  onStartTeacherMode,
  onStartHostQuiz,
  onStartCbt,
  onClose,
}) => {
  const [packages, setPackages] = useState<SavedQuizPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'music' | 'entry'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 저장 모달 상태
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  const reload = async () => {
    setPackages(getAllSavedQuizPackages());
    const remote = await fetchQuizPackagesAsync();
    setPackages(remote);
  };

  useEffect(() => {
    reload();
    const unsub = subscribeToQuizUpdates(() => reload());
    return () => unsub();
  }, []);

  // 현재 시험지 저장 핸들러
  const handleSaveCurrentExam = () => {
    if (!saveTitle.trim()) {
      alert('저장할 퀴즈 제목을 입력해주세요.');
      return;
    }
    saveQuizPackage(saveTitle.trim(), currentSubject, currentExamInfo, currentQuestions, saveDesc.trim());
    setIsSaveModalOpen(false);
    setSaveTitle('');
    setSaveDesc('');
    reload();
    alert('현재 시험지가 문제 보관함에 성공적으로 저장되었습니다!');
  };

  // 삭제 핸들러
  const handleDelete = (id: string, title: string) => {
    if (confirm(`'${title}' 퀴즈 세트를 보관함에서 삭제하시겠습니까?`)) {
      deleteSavedQuizPackage(id);
      reload();
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    const matchSubject = subjectFilter === 'all' || pkg.subject === subjectFilter;
    const matchSearch =
      pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSubject && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* 상단 툴바 및 신규 저장 버튼 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-pulse" />
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              📚 퀴즈 문제 보관함 게시판 (라이브러리)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            출제한 퀴즈를 보관해두고 언제든 다시 불러와 편집하거나 바로 QR 퀴즈로 진행할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 현재 시험지 보관함에 저장 버튼 */}
          <button
            onClick={() => {
              setSaveTitle(`${currentExamInfo.grade} ${currentExamInfo.term} (${currentExamInfo.subject})`);
              setSaveDesc(`${currentExamInfo.schoolName} 출제본 · 총 ${currentQuestions.length}문항`);
              setIsSaveModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Save size={15} />
            <span>현재 문제 세트 보관함에 저장</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              문항 편집기로 돌아가기
            </button>
          )}
        </div>
      </div>

      {/* 필터 및 검색창 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/70 p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subjectFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 보기 ({packages.length})
          </button>
          <button
            onClick={() => setSubjectFilter('entry')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              subjectFilter === 'entry'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code size={13} />
            <span>엔트리 코딩</span>
          </button>
          <button
            onClick={() => setSubjectFilter('music')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              subjectFilter === 'music'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Music size={13} />
            <span>음악</span>
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="퀴즈 세트 제목 검색..."
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden w-64"
          />
        </div>
      </div>

      {/* 퀴즈 세트 카드 리스트 (게시판 형태) */}
      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <FolderOpen size={48} className="text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">저장된 퀴즈 세트가 없습니다.</h3>
            <p className="text-xs text-slate-400">
              상단의 [현재 문제 세트 보관함에 저장] 버튼을 눌러 첫 번째 시험지를 등록해보세요!
            </p>
          </div>
        ) : (
          filteredPackages.map((pkg) => {
            const isEntry = pkg.subject === 'entry';
            const isExpanded = expandedId === pkg.id;

            return (
              <div
                key={pkg.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow transition space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* 좌측 정보 */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isEntry
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {isEntry ? '🤖 엔트리 코딩' : '🎵 음악 시험'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> {pkg.savedAt}
                      </span>
                      <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                        총 {pkg.questionCount}문항
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 hover:text-indigo-600 transition">
                      {pkg.title}
                    </h3>

                    {pkg.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{pkg.description}</p>
                    )}
                  </div>

                  {/* 우측 액션 버튼 그룹 */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* 선생님과 함께 풀기 (해설 / 호스트 모드) */}
                    {(onStartTeacherMode || onStartHostQuiz) && (
                      <button
                        onClick={() => {
                          if (onStartHostQuiz) onStartHostQuiz(pkg);
                          else if (onStartTeacherMode) onStartTeacherMode(pkg.examInfo, pkg.questions);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                        title="선생님이 화면을 띄우고 학생들과 함께 문제를 풀고 해설합니다."
                      >
                        <Play size={14} fill="white" />
                        <span>선생님과 함께 풀기</span>
                      </button>
                    )}

                    {/* 온라인 CBT로 풀기 */}
                    {onStartCbt && (
                      <button
                        onClick={() => onStartCbt(pkg)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                        title="온라인 CBT 화면으로 이동하여 바로 시험을 봅니다."
                      >
                        <Laptop size={14} />
                        <span>온라인 CBT 응시</span>
                      </button>
                    )}

                    {/* QR 퀴즈앤 룸 바로 개설 */}
                    {onLaunchQuizRoom && (
                      <button
                        onClick={() => onLaunchQuizRoom(pkg.examInfo, pkg.questions)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                        title="스마트폰 참여용 QR코드 및 PIN을 즉시 발급합니다."
                      >
                        <QrCode size={14} />
                        <span>QR 퀴즈룸 개설</span>
                      </button>
                    )}

                    {/* 편집기로 불러오기 */}
                    <button
                      onClick={() => {
                        if (confirm(`'${pkg.title}' 문제들을 현재 편집기로 불러오시겠습니까?`)) {
                          onLoadPackage(pkg);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                      title="현재 시험지 편집기로 불러와 수정하거나 인쇄합니다."
                    >
                      <BookOpen size={14} />
                      <span>편집기로 불러오기</span>
                    </button>

                    {/* 미리보기 토글 */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : pkg.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                      title="문항 미리보기 펼치기/접기"
                    >
                      <FileText size={16} />
                    </button>

                    {/* 삭제 */}
                    <button
                      onClick={() => handleDelete(pkg.id, pkg.title)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="보관함에서 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* 문항 목록 아코디언 미리보기 */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-2 bg-slate-50/70 p-4 rounded-2xl animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      📋 포함된 문항 목록 ({pkg.questions.length}개):
                    </div>
                    {pkg.questions.map((q, qIdx) => (
                      <div
                        key={q.id || qIdx}
                        className="text-xs bg-white p-2.5 rounded-xl border border-slate-200 flex items-start gap-2 text-slate-800"
                      >
                        <span className="font-bold text-indigo-600 shrink-0">#{qIdx + 1}</span>
                        <div className="flex-1">
                          <span className="font-semibold">{q.title}</span>
                          <span className="text-[11px] text-slate-400 ml-2">[{q.points}점]</span>
                          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                            정답: {q.type === 'multiple-choice' ? `${q.correctAnswer}번` : q.correctAnswer}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 시험지 저장 팝업 모달 */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 border-b pb-3">
              💾 퀴즈 문제 세트 보관함에 저장
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">퀴즈 세트 제목</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="예: 2학기 정보 엔트리 중간고사"
                  className="w-full border rounded-xl p-2.5 text-sm font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">설명 및 메모 (선택)</label>
                <input
                  type="text"
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder="예: 초등 6학년 실과 3단원 블록코딩 단원평가"
                  className="w-full border rounded-xl p-2.5 text-sm text-slate-700 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-slate-600 space-y-1">
                <div>• 과목: <strong className="text-slate-800">{currentSubject === 'entry' ? '엔트리 코딩' : '음악'}</strong></div>
                <div>• 총 문항 수: <strong className="text-indigo-600">{currentQuestions.length}문항</strong></div>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleSaveCurrentExam}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                보관함에 저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
