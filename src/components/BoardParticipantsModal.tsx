'use client';

import React, { useState } from 'react';
import {
  Users,
  X,
  Search,
  Sparkles,
  Bot,
  Trash2,
  FileText,
  Clock,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

export interface BoardParticipant {
  id: string;
  name: string;
  role: UserRole;
  isOnline: boolean;
  joinedAt: string;
  postCount: number;
  isBot?: boolean;
}

interface BoardParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  onlineUsers: BoardParticipant[];
  onAddBots: (count: number) => void;
  onClearBots: () => void;
  isTeacherOrAdmin: boolean;
}

export default function BoardParticipantsModal({
  isOpen,
  onClose,
  boardTitle,
  onlineUsers,
  onAddBots,
  onClearBots,
  isTeacherOrAdmin,
}: BoardParticipantsModalProps) {
  // 기본 탭을 'online'(실시간 접속자)으로 설정하여 바깥 툴바의 인원수와 일치시킴
  const [activeTab, setActiveTab] = useState<'online' | 'all'>('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'teacher' | 'student'>('all');

  if (!isOpen) return null;

  const onlineList = onlineUsers.filter((u) => u.isOnline);
  const botCount = onlineUsers.filter((u) => u.isBot).length;
  const currentBaseList = activeTab === 'online' ? onlineList : onlineUsers;

  const filtered = currentBaseList.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      filterRole === 'all' ||
      (filterRole === 'teacher' && (p.role === 'teacher' || p.role === 'admin')) ||
      (filterRole === 'student' && p.role === 'student');
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  보드 참여자 명단
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  실시간 접속: {onlineList.length}명
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md mt-0.5">
                [{boardTitle}] 보드의 실시간 참여자 및 작성자 목록입니다.
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

        {/* 100명 가상 학생 부하 테스트 시뮬레이터 (교사/관리자 전용) */}
        {isTeacherOrAdmin && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 whitespace-nowrap">
              <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>100명 화면·접속 테스트 시뮬레이터</span>
            </div>

            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <button
                type="button"
                onClick={() => onAddBots(10)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs active:scale-95"
              >
                +10명 입장
              </button>
              <button
                type="button"
                onClick={() => onAddBots(100)}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>100명 일괄 입장</span>
              </button>
              {botCount > 0 && (
                <button
                  type="button"
                  onClick={onClearBots}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1 active:scale-95"
                  title="가상 테스트 학생 퇴장"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>비우기({botCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 탭 전환: [실시간 접속 중 (N명)] vs [전체 카드 작성자 (M명)] */}
        <div className="px-5 pt-3 border-b border-slate-100 bg-slate-50/40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-black text-xs transition whitespace-nowrap ${
              activeTab === 'online'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>실시간 접속 중 ({onlineList.length}명)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-black text-xs transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>전체 참여자 ({onlineUsers.length}명)</span>
          </button>
        </div>

        {/* 검색 및 역할 필터 바 */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="참여자 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs shrink-0">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs whitespace-nowrap ${
                filterRole === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              전체 ({currentBaseList.length})
            </button>
            <button
              onClick={() => setFilterRole('student')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs whitespace-nowrap ${
                filterRole === 'student'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              학생 ({currentBaseList.filter((u) => u.role === 'student').length})
            </button>
            <button
              onClick={() => setFilterRole('teacher')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs whitespace-nowrap ${
                filterRole === 'teacher'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              교사 ({currentBaseList.filter((u) => u.role !== 'student').length})
            </button>
          </div>
        </div>

        {/* 참여자 카드 그리드 (2열로 여유있게 배치하여 줄바꿈 문제 해결) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 no-scrollbar bg-slate-50/30">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600 text-sm">해당 조건의 참여자가 없습니다.</p>
              <p className="text-slate-400">
                {activeTab === 'online'
                  ? '현재 실시간으로 접속 중인 참가자가 없습니다.'
                  : '등록된 참가자가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filtered.map((user) => {
                const isTeacher = user.role === 'teacher' || user.role === 'admin';
                return (
                  <div
                    key={user.id}
                    className={`p-3 rounded-2xl border transition flex items-center gap-3 shadow-xs hover:shadow-sm ${
                      user.isBot
                        ? 'bg-purple-50/50 border-purple-200'
                        : isTeacher
                        ? 'bg-blue-50/60 border-blue-200'
                        : user.isOnline
                        ? 'bg-white border-slate-200 hover:border-blue-200'
                        : 'bg-slate-50/80 border-slate-200 opacity-75'
                    }`}
                  >
                    {/* 아바타 아이콘 */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                        user.isBot
                          ? 'bg-purple-100 text-purple-700'
                          : isTeacher
                          ? 'bg-blue-600 text-white'
                          : user.isOnline
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {user.isBot ? '🤖' : isTeacher ? '👨‍🏫' : '🎒'}
                    </div>

                    {/* 유저 정보 (정렬 및 줄바꿈 보강) */}
                    <div className="min-w-0 flex-1">
                      {/* 상단 라인: 이름 + 역할 뱃지 + 접속 상태 */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-xs sm:text-sm text-slate-800 truncate">
                            {user.name}
                          </span>
                          {user.role === 'admin' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 whitespace-nowrap shrink-0">
                              관리자
                            </span>
                          ) : user.role === 'teacher' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 whitespace-nowrap shrink-0">
                              교사
                            </span>
                          ) : user.isBot ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 whitespace-nowrap shrink-0">
                              가상봇
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 whitespace-nowrap shrink-0">
                              학생
                            </span>
                          )}
                        </div>

                        {/* 온라인 여부 뱃지 */}
                        {user.isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>접속 중</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                            <span>오프라인</span>
                          </span>
                        )}
                      </div>

                      {/* 하단 메타 정보: 카드 수 & 참여/접속 시간 */}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 whitespace-nowrap">
                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>카드 {user.postCount}개</span>
                        </span>
                        <span className="text-slate-300 font-light">|</span>
                        <span className="inline-flex items-center gap-1 text-slate-400 whitespace-nowrap truncate">
                          <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                          <span>{user.joinedAt}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 모달 하단 요약 바 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              현재 탭 목록: <strong className="text-slate-800 font-extrabold">{filtered.length}명</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-bold">
              실시간 접속: {onlineList.length}명
            </span>
            {botCount > 0 && (
              <span className="text-purple-600 font-medium whitespace-nowrap">
                (가상 봇 {botCount}명 포함)
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs active:scale-95 whitespace-nowrap"
          >
            확인 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
