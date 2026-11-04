import React, { useState, useEffect, useMemo } from 'react';
import type { QuizRoom, QuizParticipantResult } from '@/types/quiz';
import { QUIZ_AVATARS } from '@/types/quiz';
import {
  getAllQuizRooms,
  getRoomLeaderboard,
  clearRoomResults,
  deleteQuizRoom,
  subscribeToQuizUpdates,
  getAllQuizResults,
  createQuizRoom,
} from '@/utils/quizStorage';
import { calculateCompetitionRanks } from '@/utils/ranking';
import {
  Trophy,
  Users,
  Trash2,
  Download,
  QrCode,
  ArrowLeft,
  Search,
  Sparkles,
  List,
  Copy,
  Check,
  Layers,
  Code,
  Music,
  Play,
  PlusCircle,
} from 'lucide-react';

interface QuizLeaderboardBoardProps {
  initialPin?: string;
  onBackToHome: () => void;
  onOpenLobbyForPin: (pin: string) => void;
  onStartTeacherMode: (pin: string, reviewMode?: boolean) => void;
  onPlayPin?: (pin: string) => void;
}

export const QuizLeaderboardBoard: React.FC<QuizLeaderboardBoardProps> = ({
  initialPin,
  onBackToHome,
  onOpenLobbyForPin,
  onStartTeacherMode,
}) => {
  const [rooms, setRooms] = useState<Record<string, QuizRoom>>({});
  const [selectedPin, setSelectedPin] = useState<string>(initialPin || '');
  const [leaderboard, setLeaderboard] = useState<QuizParticipantResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 뷰 모드: 'board' (게시판 목록 형태) vs 'detail' (선택된 퀴즈 상세 성적 & 명예의 전당)
  const [viewMode, setViewMode] = useState<'board' | 'detail'>(initialPin ? 'detail' : 'board');

  // 게시판 검색 및 정렬 상태
  const [boardSearchTerm, setBoardSearchTerm] = useState('');
  const [boardSort, setBoardSort] = useState<'newest' | 'oldest' | 'participants' | 'questions'>('newest');
  const [selectedPinsToDelete, setSelectedPinsToDelete] = useState<string[]>([]);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);

  // 룸 데이터 로드
  const reloadData = () => {
    const all = getAllQuizRooms();
    setRooms(all);

    const pinKeys = Object.keys(all);
    if (!selectedPin && pinKeys.length > 0) {
      setSelectedPin(pinKeys[pinKeys.length - 1]);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  useEffect(() => {
    if (initialPin) {
      setSelectedPin(initialPin);
      setViewMode('detail');
    }
  }, [initialPin]);

  // 로컬 결과 맵 캐시
  const allResultsMap = useMemo(() => {
    return getAllQuizResults();
  }, [rooms, leaderboard]);

  // 선택된 방의 순위표 업데이트 (로컬 + 서버 실시간 머지)
  const fetchRankings = async (targetPin: string) => {
    const localList = getRoomLeaderboard(targetPin);
    setLeaderboard(localList);

    try {
      const res = await fetch(`/api/quiz/results?pin=${targetPin}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.results) && data.results.length > 0) {
          const map = new Map<string, QuizParticipantResult>();
          localList.forEach((r) => map.set(r.id, r));
          data.results.forEach((r: QuizParticipantResult) => {
            if (r && r.id) {
              const prev = map.get(r.id);
              if (!prev || (r.score || 0) > (prev.score || 0)) {
                map.set(r.id, r);
              }
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
          setLeaderboard(merged);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (selectedPin) {
      fetchRankings(selectedPin);
    } else {
      setLeaderboard([]);
    }
  }, [selectedPin, rooms]);

  // 실시간 BroadcastChannel 업데이트 구독
  useEffect(() => {
    const unsubscribe = subscribeToQuizUpdates(() => {
      reloadData();
      if (selectedPin) {
        fetchRankings(selectedPin);
      }
    });
    return () => unsubscribe();
  }, [selectedPin]);

  const currentRoom = selectedPin ? rooms[selectedPin] : null;

  // 표준 경쟁 순위 계산 적용 (동점자는 같은 등수, 다음 등수는 건너뜀)
  const rankedLeaderboard = calculateCompetitionRanks(leaderboard);

  // CSV 성적표 다운로드
  const handleDownloadCsv = () => {
    if (!currentRoom || rankedLeaderboard.length === 0) {
      alert('다운로드할 성적 기록이 없습니다.');
      return;
    }

    let csv = '\uFEFF순위,닉네임,익명여부,점수,정답수,전체문항,최대콤보,소요시간(초),제출일시\n';
    rankedLeaderboard.forEach((r) => {
      csv += `${r.rank},"${r.nickname}",${r.isAnonymous ? '익명' : '일반'},${r.score},${r.correctCount},${r.totalCount},${r.maxCombo},${r.totalTimeSpent},"${r.submittedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRoom.title}_퀴즈결과_${currentRoom.pin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 기록 초기화
  const handleClearResults = () => {
    if (!selectedPin) return;
    if (confirm('이 퀴즈방의 모든 참가자 성적 기록을 초기화하시겠습니까?')) {
      clearRoomResults(selectedPin);
      setLeaderboard([]);
    }
  };

  // 단일 룸 삭제
  const handleDeleteRoom = (pin: string) => {
    if (confirm(`PIN [${pin}] 퀴즈룸을 완전히 삭제하시겠습니까?`)) {
      deleteQuizRoom(pin);
      setSelectedPinsToDelete((prev) => prev.filter((p) => p !== pin));
      reloadData();
      if (selectedPin === pin) {
        const remaining = Object.keys(rooms).filter((p) => p !== pin);
        setSelectedPin(remaining[0] || '');
      }
    }
  };

  // 선택된 룸 일괄 삭제
  const handleDeleteSelectedRooms = () => {
    if (selectedPinsToDelete.length === 0) return;
    if (confirm(`선택한 ${selectedPinsToDelete.length}개의 퀴즈룸을 완전히 삭제하시겠습니까?`)) {
      selectedPinsToDelete.forEach((pin) => deleteQuizRoom(pin));
      setSelectedPinsToDelete([]);
      reloadData();
      if (selectedPinsToDelete.includes(selectedPin)) {
        const remaining = Object.keys(rooms).filter((p) => !selectedPinsToDelete.includes(p));
        setSelectedPin(remaining[0] || '');
      }
    }
  };

  // 참여자 0명인 테스트 룸 일괄 정리
  const handleCleanEmptyRooms = () => {
    const emptyPins = Object.values(rooms)
      .filter((r) => (allResultsMap[r.pin] || []).length === 0)
      .map((r) => r.pin);

    if (emptyPins.length === 0) {
      alert('참여자가 0명인 정리 대상 퀴즈룸이 없습니다.');
      return;
    }

    if (confirm(`참여자가 0명인 테스트 퀴즈룸 ${emptyPins.length}개를 일괄 정리(삭제)하시겠습니까?`)) {
      emptyPins.forEach((pin) => deleteQuizRoom(pin));
      setSelectedPinsToDelete([]);
      reloadData();
      if (emptyPins.includes(selectedPin)) {
        const remaining = Object.keys(rooms).filter((p) => !emptyPins.includes(p));
        setSelectedPin(remaining[0] || '');
      }
    }
  };

  // 새 PIN 생성하여 새 퀴즈룸 추가 (새로운 방 마련 후 초대 및 학생 입장 대기화면으로 이동)
  const handleCreateNewPinRoom = (targetRoom: QuizRoom) => {
    try {
      const newRoom = createQuizRoom(
        targetRoom.examInfo,
        targetRoom.questions,
        targetRoom.timePerQuestion || 20,
        targetRoom.allowAnonymous ?? true
      );
      reloadData();
      setSelectedPin(newRoom.pin);

      // 새 PIN 생성 후 '선생님과 풀이'가 아닌, 초대 QR과 학생 입장을 기다리는 대기화면(reviewMode = false)으로 바로 이동
      onStartTeacherMode(newRoom.pin, false);
    } catch {
      alert('새 퀴즈룸 생성 중 오류가 발생했습니다.');
    }
  };

  // PIN 복사
  const handleCopyPin = (pin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  // 아바타 이모지 찾기
  const getAvatarEmoji = (avatarId: string) => {
    const found = QUIZ_AVATARS.find((a) => a.id === avatarId);
    return found ? found.emoji : '👤';
  };

  // 필터링된 참가자 목록 (상세 뷰용)
  const filteredLeaderboard = rankedLeaderboard.filter((item) =>
    item.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 상위 3명 (시상대용)
  const top1 = rankedLeaderboard[0];
  const top2 = rankedLeaderboard[1];
  const top3 = rankedLeaderboard[2];

  // 게시판 룸 목록 필터링 및 정렬
  const roomList = Object.values(rooms);
  const filteredRooms = roomList
    .filter((r) => {
      const q = boardSearchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        r.pin.includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        r.createdAt.includes(q)
      );
    })
    .sort((a, b) => {
      if (boardSort === 'newest') {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (boardSort === 'oldest') {
        return a.createdAt.localeCompare(b.createdAt);
      }
      if (boardSort === 'participants') {
        const countA = (allResultsMap[a.pin] || []).length;
        const countB = (allResultsMap[b.pin] || []).length;
        return countB - countA;
      }
      if (boardSort === 'questions') {
        return (b.questions?.length || 0) - (a.questions?.length || 0);
      }
      return 0;
    });

  // 전체 통계
  const totalParticipantsCount = roomList.reduce(
    (acc, r) => acc + (allResultsMap[r.pin] || []).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* 1. 상단 네비게이션 & 뷰 모드 탭 툴바 */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="메인 편집 화면으로 돌아가기"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                🏆 퀴즈앤 성적 게시판 & 명예의 전당
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              개설된 모든 퀴즈룸을 게시판 형태로 조회하고, 실시간 순위와 명예의 전당을 확인합니다.
            </p>
          </div>
        </div>

        {/* 뷰 모드 세그먼트 스위처 */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              viewMode === 'board'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <List size={14} />
            <span>퀴즈 목록 게시판 ({roomList.length})</span>
          </button>

          <button
            onClick={() => {
              if (selectedPin || roomList.length > 0) {
                if (!selectedPin && roomList.length > 0) {
                  setSelectedPin(roomList[roomList.length - 1].pin);
                }
                setViewMode('detail');
              }
            }}
            disabled={roomList.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              viewMode === 'detail'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Trophy size={14} />
            <span>성적표 & 명예의 전당 {selectedPin ? `[${selectedPin}]` : ''}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* 2. 게시판 목록 뷰 (viewMode === 'board') */}
      {/* ========================================================================================= */}
      {viewMode === 'board' && (
        <div className="space-y-4">
          {/* 통계 요약 카드 3개 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400">총 개설 퀴즈룸</div>
                <div className="text-2xl font-black text-slate-800 font-mono mt-0.5">{roomList.length}개</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Layers size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400">총 누적 참여자 수</div>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{totalParticipantsCount}명</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400">최근 생성된 PIN</div>
                <div className="text-xl font-black text-amber-500 font-mono mt-1">
                  {roomList.length > 0 ? roomList[roomList.length - 1].pin : '-'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Sparkles size={20} />
              </div>
            </div>
          </div>

          {/* 게시판 검색 & 필터 & 일괄 작업 바 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* 검색창 & 정렬 */}
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={boardSearchTerm}
                  onChange={(e) => setBoardSearchTerm(e.target.value)}
                  placeholder="시험지 제목, 과목, PIN 번호 검색..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white"
                />
              </div>

              <select
                value={boardSort}
                onChange={(e: any) => setBoardSort(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 focus:outline-hidden"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="participants">참여자 많은 순</option>
                <option value="questions">문항수 많은 순</option>
              </select>
            </div>

            {/* 일괄 액션 버튼들 */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedPinsToDelete.length > 0 && (
                <button
                  onClick={handleDeleteSelectedRooms}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition border border-rose-200"
                >
                  <Trash2 size={13} />
                  <span>선택 {selectedPinsToDelete.length}개 삭제</span>
                </button>
              )}

              <button
                onClick={handleCleanEmptyRooms}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition"
                title="참여자가 0명인 테스트 룸들을 한꺼번에 정리합니다"
              >
                <span>참여자 0명 정리</span>
              </button>
            </div>
          </div>

          {/* 게시판 테이블 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredRooms.length > 0 &&
                          selectedPinsToDelete.length === filteredRooms.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPinsToDelete(filteredRooms.map((r) => r.pin));
                          } else {
                            setSelectedPinsToDelete([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                        title="전체 선택"
                      />
                    </th>
                    <th className="py-3 px-3 text-center w-12">순번</th>
                    <th className="py-3 px-3 text-center w-28">접속 PIN</th>
                    <th className="py-3 px-4">시험지 제목 & 과목</th>
                    <th className="py-3 px-3 text-center w-20">문항 수</th>
                    <th className="py-3 px-3 text-center w-24">참여자</th>
                    <th className="py-3 px-3 text-center w-36">출제 일시</th>
                    <th className="py-3 px-4 text-center w-80">관리 / 실행</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-slate-400">
                        {boardSearchTerm
                          ? '검색 조건에 맞는 퀴즈룸이 없습니다.'
                          : '개설된 퀴즈룸이 없습니다. 상단 [🎯 퀴즈앤 라이브]를 통해 시험을 시작해보세요!'}
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((r, idx) => {
                      const participantCount = (allResultsMap[r.pin] || []).length;
                      const isEntry =
                        r.subject?.includes('엔트리') ||
                        r.subject?.includes('정보') ||
                        r.title?.includes('엔트리') ||
                        r.title?.includes('코딩');
                      const isSelected = selectedPinsToDelete.includes(r.pin);

                      return (
                        <tr
                          key={r.pin}
                          onClick={() => {
                            setSelectedPin(r.pin);
                            setViewMode('detail');
                          }}
                          className={`hover:bg-indigo-50/40 transition cursor-pointer group ${
                            isSelected ? 'bg-indigo-50/60' : ''
                          }`}
                        >
                          {/* 선택 체크박스 */}
                          <td
                            className="py-3 px-3.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPinsToDelete((prev) => [...prev, r.pin]);
                                } else {
                                  setSelectedPinsToDelete((prev) => prev.filter((p) => p !== r.pin));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* 순번 */}
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>

                          {/* PIN 번호 & 복사 버튼 */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={(e) => handleCopyPin(r.pin, e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-mono font-bold text-xs transition"
                              title="PIN 복사하기"
                            >
                              <span>{r.pin}</span>
                              {copiedPin === r.pin ? (
                                <Check size={12} className="text-emerald-600 shrink-0" />
                              ) : (
                                <Copy size={11} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
                              )}
                            </button>
                          </td>

                          {/* 시험지 제목 & 과목 */}
                          <td className="py-3 px-4 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${
                                  isEntry
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {isEntry ? <Code size={10} /> : <Music size={10} />}
                                <span>{isEntry ? '엔트리 코딩' : '음악'}</span>
                              </span>
                              <span className="group-hover:text-indigo-600 transition truncate max-w-md">
                                {r.title}
                              </span>
                            </div>
                          </td>

                          {/* 문항 수 */}
                          <td className="py-3 px-3 text-center font-mono font-semibold text-slate-600">
                            {r.questions?.length || 0}문항
                          </td>

                          {/* 참여자 수 */}
                          <td className="py-3 px-3 text-center">
                            {participantCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full font-mono text-xs border border-emerald-200">
                                <Users size={11} />
                                <span>{participantCount}명 응시</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">0명</span>
                            )}
                          </td>

                          {/* 출제 일시 */}
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                            {r.createdAt}
                          </td>

                          {/* 관리 / 바로가기 버튼 그룹 */}
                          <td
                            className="py-2.5 px-4 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                              {/* 1. 성적표 보기 */}
                              <button
                                onClick={() => {
                                  setSelectedPin(r.pin);
                                  setViewMode('detail');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition"
                                title="명예의 전당 & 순위표 상세 보기"
                              >
                                <Trophy size={12} />
                                <span>성적보기</span>
                              </button>

                              {/* 2. 선생님과 풀이 */}
                              <button
                                onClick={() => onStartTeacherMode(r.pin, true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-lg text-[11px] shadow-2xs transition"
                                title="선생님 전용 전자칠판 문제 풀이 & 라이브 화면 열기"
                              >
                                <Play size={11} fill="white" />
                                <span>선생님과 풀이</span>
                              </button>

                              {/* 3. 새 PIN 생성 (게시판 늘리기 / 재출제) */}
                              <button
                                onClick={() => handleCreateNewPinRoom(r)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition border border-emerald-200"
                                title="새로운 6자리 PIN 번호를 생성하여 새 시험방으로 게시판에 추가합니다."
                              >
                                <PlusCircle size={12} />
                                <span>새 PIN 생성</span>
                              </button>

                              {/* 4. QR 초대창 */}
                              <button
                                onClick={() => onOpenLobbyForPin(r.pin)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition"
                                title="프로젝터용 QR 코드 초대장 열기"
                              >
                                <QrCode size={12} />
                                <span>QR</span>
                              </button>

                              {/* 5. 삭제 */}
                              <button
                                onClick={() => handleDeleteRoom(r.pin)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="이 퀴즈룸 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 3. 상세 성적표 & 명예의 전당 뷰 (viewMode === 'detail') */}
      {/* ========================================================================================= */}
      {viewMode === 'detail' && (
        <div className="space-y-6">
          {/* 상단 툴바: 목록으로 돌아가기 & 현재 방 액션 버튼들 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('board')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl text-xs transition border border-indigo-200"
              >
                <ArrowLeft size={14} />
                <span>← 퀴즈 목록 게시판으로</span>
              </button>

              {/* 룸 선택 드롭다운 (상세 뷰 내에서 빠른 전환 지원) */}
              {roomList.length > 1 && (
                <select
                  value={selectedPin}
                  onChange={(e) => setSelectedPin(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden max-w-xs truncate"
                >
                  {roomList.map((r) => (
                    <option key={r.pin} value={r.pin}>
                      [PIN: {r.pin}] {r.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {currentRoom && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* 선생님과 풀이 */}
                <button
                  onClick={() => onStartTeacherMode(currentRoom.pin, true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                  title="선생님 전용 전자칠판 문제 풀이 및 라이브 해설 모드 실행"
                >
                  <Play size={13} fill="white" />
                  <span>선생님과 풀이</span>
                </button>

                {/* 새 PIN 생성 (재출제 & 게시판 늘리기) */}
                <button
                  onClick={() => handleCreateNewPinRoom(currentRoom)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                  title="이 시험지의 문제들로 새로운 PIN 번호를 발급하여 새 퀴즈룸을 개설하고 게시판에 추가합니다."
                >
                  <PlusCircle size={13} />
                  <span>새 PIN으로 다시 출제</span>
                </button>

                {/* QR 초대창 */}
                <button
                  onClick={() => onOpenLobbyForPin(currentRoom.pin)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                  title="프로젝터용 QR 코드 및 초대 창 열기"
                >
                  <QrCode size={13} />
                  <span>QR 초대창</span>
                </button>

                {/* CSV 다운로드 */}
                <button
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  title="엑셀(CSV) 성적표 파일 다운로드"
                >
                  <Download size={13} />
                  <span>CSV 다운로드</span>
                </button>

                {/* 삭제 */}
                <button
                  onClick={() => handleDeleteRoom(currentRoom.pin)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="이 퀴즈룸 삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          {!currentRoom ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Trophy size={48} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">선택된 퀴즈룸이 없습니다.</h3>
              <p className="text-xs text-slate-400">
                상단의 [← 퀴즈 목록 게시판으로] 버튼을 눌러 시험지를 선택해주세요.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 룸 헤더 카드 */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-indigo-300 font-semibold mb-1">
                    <span>
                      PIN: <strong className="text-amber-400 font-mono text-sm">{currentRoom.pin}</strong>
                    </span>
                    <span>•</span>
                    <span>출제 일시: {currentRoom.createdAt}</span>
                    <span>•</span>
                    <span>
                      제한시간: {currentRoom.timePerQuestion > 0 ? `${currentRoom.timePerQuestion}초` : '무제한'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    {currentRoom.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/10 text-center">
                    <div className="text-[10px] text-indigo-200 uppercase font-bold">총 참여자</div>
                    <div className="text-2xl font-black text-white font-mono">{leaderboard.length}명</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/10 text-center">
                    <div className="text-[10px] text-indigo-200 uppercase font-bold">총 문항 수</div>
                    <div className="text-2xl font-black text-amber-300 font-mono">
                      {currentRoom.questions.length}개
                    </div>
                  </div>
                </div>
              </div>

              {/* 시상대 (Podium) - 1, 2, 3위 축하 영역 */}
              {leaderboard.length >= 1 && (
                <div className="bg-gradient-to-b from-indigo-50/60 to-white rounded-3xl border border-indigo-100 p-6 md:p-8 shadow-xs">
                  <div className="text-center mb-6">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                      <Sparkles size={12} className="text-amber-600" />
                      TOP 3 PODIUM
                    </span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">
                      명예의 전당 시상대 🏆
                    </h4>
                  </div>

                  <div className="grid grid-cols-3 gap-2 md:gap-6 max-w-lg mx-auto items-end pt-4">
                    {(() => {
                      const rankCounts = rankedLeaderboard.reduce((acc: Record<number, number>, curr) => {
                        acc[curr.rank] = (acc[curr.rank] || 0) + 1;
                        return acc;
                      }, {});

                      const getBoardPodiumStyle = (rank: number) => {
                        const isTie = (rankCounts[rank] || 0) > 1;
                        if (rank === 1) {
                          return {
                            py: 'py-10 md:py-14',
                            bg: 'bg-gradient-to-b from-amber-400 to-yellow-500 border-amber-300',
                            label: isTie ? '🥇 1위 (공동)' : '🥇 1위',
                            crown: true,
                            scoreColor: 'text-amber-600',
                          };
                        }
                        if (rank === 2) {
                          return {
                            py: 'py-6 md:py-8',
                            bg: 'bg-slate-300 border-slate-400',
                            label: isTie ? '🥈 2위 (공동)' : '🥈 2위',
                            crown: false,
                            scoreColor: 'text-indigo-600',
                          };
                        }
                        if (rank === 3) {
                          return {
                            py: 'py-4 md:py-6',
                            bg: 'bg-amber-700/60 border-amber-700',
                            label: isTie ? '🥉 3위 (공동)' : '🥉 3위',
                            crown: false,
                            scoreColor: 'text-indigo-600',
                          };
                        }
                        return {
                          py: 'py-3 md:py-4',
                          bg: 'bg-slate-200 border-slate-300',
                          label: `${rank}위`,
                          crown: false,
                          scoreColor: 'text-slate-600',
                        };
                      };

                      const top2Style = top2 ? getBoardPodiumStyle(top2.rank) : null;
                      const top1Style = top1 ? getBoardPodiumStyle(top1.rank) : null;
                      const top3Style = top3 ? getBoardPodiumStyle(top3.rank) : null;

                      return (
                        <>
                          {/* 2위 슬롯 (좌측) */}
                          <div className="text-center order-1">
                            {top2 && top2Style ? (
                              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="text-3xl md:text-4xl">{getAvatarEmoji(top2.avatarId)}</div>
                                <div className="text-xs font-bold text-slate-800 truncate">{top2.nickname}</div>
                                <div className={`text-xs font-black ${top2Style.scoreColor} font-mono`}>
                                  {(top2.score || 0).toLocaleString()}점
                                </div>
                                <div
                                  className={`${top2Style.bg} rounded-t-2xl ${top2Style.py} border-t-4 font-black text-white text-lg shadow-sm transition-all duration-300`}
                                >
                                  {top2Style.label}
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 bg-slate-100 rounded-t-2xl flex items-center justify-center text-xs text-slate-400">
                                -
                              </div>
                            )}
                          </div>

                          {/* 1위 슬롯 (중앙) */}
                          <div className="text-center order-2">
                            {top1 && top1Style ? (
                              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-4xl md:text-5xl animate-bounce">
                                  {getAvatarEmoji(top1.avatarId)}
                                </div>
                                <div className="text-xs md:text-sm font-black text-slate-900 truncate">
                                  {top1Style.crown ? '👑 ' : ''}
                                  {top1.nickname}
                                </div>
                                <div className={`text-sm font-black ${top1Style.scoreColor} font-mono`}>
                                  {(top1.score || 0).toLocaleString()}점
                                </div>
                                <div
                                  className={`${top1Style.bg} rounded-t-2xl ${top1Style.py} border-t-4 font-black text-white text-xl shadow-md transition-all duration-300`}
                                >
                                  {top1Style.label}
                                </div>
                              </div>
                            ) : (
                              <div className="h-32 bg-slate-100 rounded-t-2xl flex items-center justify-center text-xs text-slate-400">
                                -
                              </div>
                            )}
                          </div>

                          {/* 3위 슬롯 (우측) */}
                          <div className="text-center order-3">
                            {top3 && top3Style ? (
                              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="text-3xl md:text-4xl">{getAvatarEmoji(top3.avatarId)}</div>
                                <div className="text-xs font-bold text-slate-800 truncate">{top3.nickname}</div>
                                <div className={`text-xs font-black ${top3Style.scoreColor} font-mono`}>
                                  {(top3.score || 0).toLocaleString()}점
                                </div>
                                <div
                                  className={`${top3Style.bg} rounded-t-2xl ${top3Style.py} border-t-4 font-black text-white text-lg shadow-sm transition-all duration-300`}
                                >
                                  {top3Style.label}
                                </div>
                              </div>
                            ) : (
                              <div className="h-20 bg-slate-100 rounded-t-2xl flex items-center justify-center text-xs text-slate-400">
                                -
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 전체 순위표 테이블 */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    <h4 className="font-bold text-sm text-slate-800">
                      전체 참가자 순위표 ({filteredLeaderboard.length}명)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="참가자 닉네임 검색..."
                        className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                      />
                    </div>

                    {leaderboard.length > 0 && (
                      <button
                        onClick={handleClearResults}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="기록 전체 초기화"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4 text-center w-16">순위</th>
                        <th className="py-3 px-4">참가자 (캐릭터)</th>
                        <th className="py-3 px-4 text-right">총 획득 점수</th>
                        <th className="py-3 px-4 text-center">정답률</th>
                        <th className="py-3 px-4 text-center">최대 콤보</th>
                        <th className="py-3 px-4 text-center">소요 시간</th>
                        <th className="py-3 px-4 text-right">제출 일시</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            아직 제출된 퀴즈 성적이 없습니다. QR코드를 스캔하여 첫 번째 도전자가 되어보세요!
                          </td>
                        </tr>
                      ) : (
                        filteredLeaderboard.map((res, idx) => (
                          <tr
                            key={res.id}
                            className={`hover:bg-slate-50 transition ${
                              idx === 0
                                ? 'bg-amber-50/30 font-medium'
                                : idx === 1
                                ? 'bg-slate-50/50'
                                : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center">
                              {res.rank === 1 ? (
                                <span className="inline-block px-2 py-0.5 bg-amber-400 text-white rounded-md font-black text-xs">
                                  1위
                                </span>
                              ) : res.rank === 2 ? (
                                <span className="inline-block px-2 py-0.5 bg-slate-400 text-white rounded-md font-black text-xs">
                                  2위
                                </span>
                              ) : res.rank === 3 ? (
                                <span className="inline-block px-2 py-0.5 bg-amber-700/60 text-white rounded-md font-black text-xs">
                                  3위
                                </span>
                              ) : (
                                <span className="font-bold text-slate-500 font-mono">#{res.rank}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{getAvatarEmoji(res.avatarId)}</span>
                                <span>{res.nickname}</span>
                                {res.isAnonymous && (
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal">
                                    익명
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-sm text-indigo-600 font-mono">
                              {res.score.toLocaleString()}점
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-bold text-emerald-600">
                                {res.correctCount} / {res.totalCount}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({Math.round((res.correctCount / res.totalCount) * 100)}%)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-orange-600">
                              {res.maxCombo > 0 ? `${res.maxCombo} 🔥` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                              {res.totalTimeSpent}초
                            </td>
                            <td className="py-3.5 px-4 text-right text-[11px] text-slate-400 font-mono">
                              {res.submittedAt}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
