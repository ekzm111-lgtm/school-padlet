'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Search,
  Sparkles,
  Bot,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  GraduationCap,
  School,
  FileText,
  UserCheck,
} from 'lucide-react';
import { User, UserRole } from '@/lib/types';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'teacher' | 'student'>('all');

  if (!isOpen) return null;

  const filtered = onlineUsers.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      filterRole === 'all' ||
      (filterRole === 'teacher' && (p.role === 'teacher' || p.role === 'admin')) ||
      (filterRole === 'student' && p.role === 'student');
    return matchesSearch && matchesRole;
  });

  const onlineCount = onlineUsers.filter((u) => u.isOnline).length;
  const botCount = onlineUsers.filter((u) => u.isBot).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  보드 실시간 참여자 명단
                </h3>
                <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>실시간 {onlineCount}명</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                [{boardTitle}] 보드에 현재 머물고 있는 학생 및 교사 목록입니다.
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

        {/* 교사용 100명 가상 테스트 도구 바 */}
        {isTeacherOrAdmin && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-indigo-100/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>100명 부하·화면 테스트 시뮬레이터</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAddBots(10)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition shadow-xs"
              >
                +10명 입장
              </button>
              <button
                type="button"
                onClick={() => onAddBots(100)}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-[11px] transition shadow-xs flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>🚀 100명 일괄 입장</span>
              </button>
              {botCount > 0 && (
                <button
                  type="button"
                  onClick={onClearBots}
                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition flex items-center gap-0.5"
                  title="가상 테스트 학생 퇴장"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>비우기({botCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 검색 및 필터 바 */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                filterRole === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              전체 ({onlineUsers.length})
            </button>
            <button
              onClick={() => setFilterRole('student')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                filterRole === 'student'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              학생 ({onlineUsers.filter((u) => u.role === 'student').length})
            </button>
            <button
              onClick={() => setFilterRole('teacher')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                filterRole === 'teacher'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              교사/관리자 ({onlineUsers.filter((u) => u.role !== 'student').length})
            </button>
          </div>
        </div>

        {/* 참여자 카드 그리드 (100명도 부드럽게 스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600">조건에 맞는 참여자가 없습니다.</p>
              <p>스마트폰 카메라로 QR 코드를 스캔하거나 참여 링크로 입장해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
              {filtered.map((user) => {
                const isTeacher = user.role === 'teacher' || user.role === 'admin';
                return (
                  <div
                    key={user.id}
                    className={`p-2.5 rounded-2xl border transition flex items-center gap-2.5 shadow-2xs ${
                      user.isBot
                        ? 'bg-purple-50/40 border-purple-200/60'
                        : isTeacher
                        ? 'bg-blue-50/50 border-blue-200/70'
                        : 'bg-white border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    {/* 아바타 */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                        user.isBot
                          ? 'bg-purple-100 text-purple-700'
                          : isTeacher
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {user.isBot ? '🤖' : isTeacher ? '👨‍🏫' : '🎒'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800 truncate">
                          {user.name}
                        </span>
                        {user.role === 'admin' ? (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                            관리자
                          </span>
                        ) : user.role === 'teacher' ? (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                            교사
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">
                            학생
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>접속 중</span>
                        </span>
                        {user.postCount > 0 && (
                          <span className="flex items-center gap-0.5 text-slate-500">
                            <FileText className="w-2.5 h-2.5 text-slate-400" />
                            <span>카드 {user.postCount}개</span>
                          </span>
                        )}
                        <span className="text-slate-300">·</span>
                        <span>{user.joinedAt}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 모달 하단 요약 바 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>총 참여자: <strong className="text-slate-800 font-bold">{onlineUsers.length}명</strong></span>
            {botCount > 0 && (
              <span className="text-[11px] text-purple-600 font-medium">
                (모의 봇: {botCount}명 포함)
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs"
          >
            확인 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
