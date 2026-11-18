'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Hash,
  ArrowRight,
  BookOpen,
  Sparkles,
  School,
  Globe,
  Clock,
  Play,
  Share2,
  Check,
  Search,
  Megaphone,
  X,
} from 'lucide-react';
import { Board, User, Notice } from '@/lib/types';

interface StudentHomeViewProps {
  currentUser: User | null;
  boards: Board[];
  onCopyCode: (e: React.MouseEvent, code: string) => void;
  onCopyLink: (e: React.MouseEvent, code: string) => void;
  notice?: Notice | null;
  onOpenNotice?: () => void;
}

export default function StudentHomeView({
  currentUser,
  boards,
  onCopyCode,
  onCopyLink,
  notice,
  onOpenNotice,
}: StudentHomeViewProps) {
  const router = useRouter();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [dismissedNotice, setDismissedNotice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('schoolpad_dismissed_notice_id');
        return Boolean(saved && notice?.id && saved === notice.id);
      } catch (e) {}
    }
    return false;
  });

  // 6자리 참여 PIN 코드 제출
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().replace(/\s+/g, '');
    if (!cleanPin) {
      setPinError('선생님이 알려주신 6자리 코드를 입력해 주세요.');
      return;
    }

    setPinError('');
    // 로컬 보드 중 일치하는 보드가 있는지 확인
    const found = boards.find(
      (b) => b.code.toLowerCase() === cleanPin.toLowerCase() || b.id === cleanPin
    );

    if (found) {
      router.push(`/board/${found.id}`);
    } else {
      // 클라우드 Supabase에 있을 수 있으므로 /join/[code] 로 이동
      router.push(`/join/${cleanPin}`);
    }
  };

  // 학교 전체 공개 수업 자료 필터링
  const publicBoards = boards.filter((b) => {
    if (b.isPublic === false) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.title.toLowerCase().includes(term) ||
      b.description.toLowerCase().includes(term) ||
      b.code.includes(term) ||
      b.authorName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* 📢 선생님 전체 공지사항 배너 (학생 뷰) */}
        {notice &&
          notice.isActive !== false &&
          (!notice.expiresAt || new Date(notice.expiresAt).getTime() > Date.now()) &&
          !dismissedNotice &&
          (typeof window === 'undefined' || sessionStorage.getItem('schoolpad_dismissed_notice_id') !== notice.id) && (
            <div
              onClick={onOpenNotice}
              className={`cursor-pointer rounded-2xl p-3.5 sm:p-4 border shadow-sm transition-all hover:shadow-md flex items-center justify-between gap-3 ${
                notice.category === 'urgent'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : notice.category === 'event'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                    notice.category === 'urgent'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : notice.category === 'event'
                      ? 'bg-amber-500 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {notice.category === 'urgent' ? '🚨 긴급 공지' : notice.category === 'event' ? '🎉 이벤트·새소식' : '📢 선생님 공지'}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 overflow-hidden">
                  <span className="font-bold text-xs sm:text-sm truncate">{notice.title}</span>
                  {notice.content && (
                    <span className="text-[11px] sm:text-xs opacity-75 truncate max-w-md hidden sm:inline">
                      - {notice.content}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold underline underline-offset-2 opacity-80 hover:opacity-100 hidden sm:inline">
                  공지 전체보기
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissedNotice(true);
                    if (typeof window !== 'undefined' && notice?.id) {
                      try {
                        sessionStorage.setItem('schoolpad_dismissed_notice_id', notice.id);
                      } catch (err) {}
                    }
                  }}
                  className="p-1 hover:bg-black/5 rounded-lg transition text-slate-400 hover:text-slate-700"
                  title="공지 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        {/* 1. 카훗 & 패들렛 공식 스타일: 대형 6자리 수업 참여 PIN 입력 히어로 섹션 */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white p-7 sm:p-12 shadow-xl border border-white/20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>학생 전용 빠른 수업 입장</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {currentUser?.name ? `${currentUser.name} 학생, 반갑습니다! 👋` : '수업에 오신 것을 환영합니다! 👋'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-normal">
              선생님이 칠판이나 화면에 공유해 주신 <strong>6자리 초대 코드</strong>를 입력하세요.
            </p>

            {/* 6자리 PIN 입력 폼 */}
            <form onSubmit={handlePinSubmit} className="pt-3 max-w-md mx-auto space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-white/15 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner">
                <div className="flex items-center gap-2 px-3 py-2 w-full sm:flex-1">
                  <Hash className="w-5 h-5 text-white/80 shrink-0" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="초대 코드 6자리 (예: 582194)"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                    className="w-full bg-transparent text-white placeholder-white/60 font-mono font-black text-center sm:text-left text-base sm:text-lg outline-none tracking-widest uppercase"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-blue-800 font-black text-sm transition shadow-lg flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                >
                  <span>수업 입장</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {pinError && (
                <p className="text-xs font-bold text-rose-200 animate-in fade-in">
                  {pinError}
                </p>
              )}
            </form>

            <div className="text-[11px] text-blue-200/80 pt-1">
              💡 <strong>안내:</strong> 새 보드 개설은 선생님이 직접 준비해 주십니다. 초대 코드를 받았다면 바로 입장해 보세요!
            </div>
          </div>
        </div>

        {/* 2. 선생님이 공유해 주신 추천 수업 자료 및 공개 보드 둘러보기 */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  선생님이 공유해 주신 수업 자료 & 보드
                </h2>
                <p className="text-[11px] text-slate-500">
                  학교 수업 보드와 유용한 추천 학습 자료를 클릭하여 자유롭게 열람하세요.
                </p>
              </div>
            </div>

            {/* 검색창 */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="수업명, 선생님 이름 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* 보드 카드 그리드 */}
          {publicBoards.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm max-w-md mx-auto my-6">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">공개된 수업 보드가 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">상단의 6자리 코드를 입력하여 수업에 참여해 보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {publicBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="group relative rounded-2xl p-4 border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      {board.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {board.category}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                        <Hash className="w-2.5 h-2.5" />
                        <span>{board.code}</span>
                      </span>
                    </div>

                    {(board.coverImageUrl || board.customBgUrl) && (
                      <div className="relative w-full h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                        <img
                          src={board.coverImageUrl || board.customBgUrl}
                          alt={board.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                      {board.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {board.description || '선생님과 함께하는 수업 보드입니다.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-600 truncate">
                      {board.authorName} 선생님
                    </span>
                    <span className="font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition shrink-0">
                      <span>입장하기</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
