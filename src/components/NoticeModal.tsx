'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Megaphone, Bell, Sparkles, Check, Trash2, Eye, EyeOff, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Notice } from '@/lib/types';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice | null;
  onSave: (notice: Notice | null) => void;
  isAdmin?: boolean;
  isTeacherOrAdmin?: boolean;
}

type DurationType = 'unlimited' | '1day' | '3days' | '7days' | 'custom';

// Date 객체를 <input type="datetime-local" /> value 문자열(YYYY-MM-DDTHH:mm)로 변환
function toDatetimeLocalString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export default function NoticeModal({
  isOpen,
  onClose,
  notice,
  onSave,
  isAdmin,
  isTeacherOrAdmin,
}: NoticeModalProps) {
  // 오직 관리자(admin)만 공지 작성/수정/삭제 관리 가능 (교사/학생은 열람 전용)
  const canManageNotice = Boolean(isAdmin);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'urgent' | 'general' | 'event'>('general');
  const [isActive, setIsActive] = useState(true);

  // 게시 기간 설정
  const [durationType, setDurationType] = useState<DurationType>('unlimited');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');

  const prevIsOpenRef = useRef(false);

  // 모달이 처음 열릴 때만 상태 초기화 (백그라운드 5초 폴링 시 유저 입력/토글 상태 덮어쓰기 방지)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (notice) {
        setTitle(notice.title || '');
        setContent(notice.content || '');
        setCategory(notice.category || 'general');
        setIsActive(notice.isActive !== false);

        if (notice.expiresAt) {
          const expDate = new Date(notice.expiresAt);
          if (!isNaN(expDate.getTime())) {
            setDurationType('custom');
            setCustomExpiresAt(toDatetimeLocalString(expDate));
          } else {
            setDurationType('unlimited');
            setCustomExpiresAt('');
          }
        } else {
          setDurationType('unlimited');
          setCustomExpiresAt('');
        }
      } else {
        setTitle('');
        setContent('');
        setCategory('general');
        setIsActive(true);
        setDurationType('unlimited');
        setCustomExpiresAt('');
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, notice]);

  if (!isOpen) return null;

  // 게시 기간 프리셋 선택 처리
  const handleSelectDuration = (type: DurationType) => {
    setDurationType(type);
    const now = Date.now();
    if (type === '1day') {
      const d = new Date(now + 24 * 60 * 60 * 1000);
      setCustomExpiresAt(toDatetimeLocalString(d));
    } else if (type === '3days') {
      const d = new Date(now + 3 * 24 * 60 * 60 * 1000);
      setCustomExpiresAt(toDatetimeLocalString(d));
    } else if (type === '7days') {
      const d = new Date(now + 7 * 24 * 60 * 60 * 1000);
      setCustomExpiresAt(toDatetimeLocalString(d));
    } else if (type === 'custom') {
      if (!customExpiresAt) {
        const d = new Date(now + 24 * 60 * 60 * 1000);
        setCustomExpiresAt(toDatetimeLocalString(d));
      }
    } else {
      setCustomExpiresAt('');
    }
  };

  // 만료일시 계산
  const calculateFinalExpiresAt = (): string | null => {
    if (durationType === 'unlimited') return null;
    if (customExpiresAt) {
      const d = new Date(customExpiresAt);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
    return null;
  };

  const finalExpiresAt = calculateFinalExpiresAt();
  const isExpired = Boolean(finalExpiresAt && new Date(finalExpiresAt).getTime() <= Date.now());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('공지사항 제목을 입력해 주세요.');
      return;
    }

    if (durationType !== 'unlimited' && !customExpiresAt) {
      alert('게시 종료 날짜 및 시간을 선택해 주세요.');
      return;
    }

    const expiresAt = calculateFinalExpiresAt();

    const updatedNotice: Notice = {
      id: notice?.id || `notice-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      category,
      authorName: notice?.authorName || '선생님 (관리자)',
      isActive,
      expiresAt,
      createdAt: notice?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: Date.now(),
    };

    onSave(updatedNotice);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('공지사항을 완전히 삭제하시겠습니까?')) {
      onSave(null);
      onClose();
    }
  };

  const categoryMeta = {
    urgent: {
      label: '긴급 공지',
      icon: Megaphone,
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      badge: 'bg-rose-500 text-white',
    },
    general: {
      label: '수업 안내',
      icon: Bell,
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      badge: 'bg-blue-500 text-white',
    },
    event: {
      label: '이벤트·소식',
      icon: Sparkles,
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'bg-amber-500 text-white',
    },
  };

  // 종료 일시 남은 시간 텍스트 포맷
  const getRemainingTimeString = (isoDate: string | null) => {
    if (!isoDate) return '무기한 게시 (상시 노출)';
    const target = new Date(isoDate).getTime();
    const now = Date.now();
    const diff = target - now;
    if (isNaN(target)) return '무기한 게시';
    if (diff <= 0) return '게시 기간 만료됨 (현재 화면에 노출되지 않음)';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const dateStr = new Date(isoDate).toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (days > 0) return `${dateStr} 까지 (${days}일 ${hours}시간 남음)`;
    if (hours > 0) return `${dateStr} 까지 (${hours}시간 ${minutes}분 남음)`;
    return `${dateStr} 까지 (${minutes}분 남음)`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {canManageNotice ? '📢 전체 공지사항 설정' : '📢 전체 공지사항'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {canManageNotice
                  ? '모든 학생과 교사가 볼 수 있는 전역 공지를 작성하고 게시 기간을 관리합니다.'
                  : notice?.createdAt ? `등록일: ${notice.createdAt}` : '공지사항 안내'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 관리자 / 교사 작성 폼 */}
        {canManageNotice ? (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* 공지 카테고리 선택 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">공지 유형</label>
              <div className="grid grid-cols-3 gap-2">
                {(['urgent', 'general', 'event'] as const).map((cat) => {
                  const meta = categoryMeta[cat];
                  const Icon = meta.icon;
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all ${
                        isSelected
                          ? `${meta.bg} ring-2 ring-blue-500 font-bold shadow-xs`
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-xs">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 노출 여부 스위치 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                {isActive ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {isActive ? '공지사항 게시 중 (화면 노출)' : '공지사항 숨김 (보관)'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isActive ? '메인 화면 상단 띠 배너로 모든 사용자에게 표시됩니다.' : '메인 화면에서 숨겨집니다.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isActive ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* ⏰ 게시 기간 설정 (언제까지 게시할 것인지 선택) */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>게시 기간 설정 (언제까지 노출할지 선택)</span>
                </label>
                {finalExpiresAt && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isExpired ? 'bg-rose-100 text-rose-700' : 'bg-blue-200/70 text-blue-800'
                    }`}
                  >
                    {isExpired ? '만료됨' : '예약됨'}
                  </span>
                )}
              </div>

              {/* 프리셋 버튼 그룹 */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {[
                  { id: 'unlimited', label: '무기한' },
                  { id: '1day', label: '1일간' },
                  { id: '3days', label: '3일간' },
                  { id: '7days', label: '7일간' },
                  { id: 'custom', label: '직접지정' },
                ].map((item) => {
                  const isSelected = durationType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectDuration(item.id as DurationType)}
                      className={`py-1.5 px-1 text-center rounded-xl text-[11px] font-bold border transition ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* 직접 지정 또는 프리셋 계산 날짜 표시 및 입력 */}
              {durationType !== 'unlimited' && (
                <div className="pt-1 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <input
                      type="datetime-local"
                      value={customExpiresAt}
                      onChange={(e) => {
                        setCustomExpiresAt(e.target.value);
                        setDurationType('custom');
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {isExpired && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>설정된 날짜가 이미 지나 만료되었습니다. 미래 날짜를 지정하거나 무기한을 선택하세요.</span>
                    </div>
                  )}
                </div>
              )}

              {/* 현재 설정된 종료일 안내 문구 */}
              <div className="text-[11px] text-slate-600 bg-white/70 px-2.5 py-1.5 rounded-lg border border-blue-100/60">
                <span className="font-bold text-blue-900">게시 상태: </span>
                <span className={isExpired ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                  {getRemainingTimeString(finalExpiresAt)}
                </span>
              </div>
            </div>

            {/* 제목 입력 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">공지 제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2학기 모둠 프로젝트 활동 안내 및 제출 기한"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            {/* 내용 입력 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">상세 내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="공지할 상세 내용을 자유롭게 작성하세요..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal leading-relaxed"
              />
            </div>

            {/* 하단 버튼 액션 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {notice ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>공지 삭제</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>{notice ? '공지사항 수정 저장' : '새 공지사항 등록'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* 학생/일반 사용자 읽기 전용 뷰 */
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${categoryMeta[category].badge}`}>
                  {categoryMeta[category].label}
                </span>
                <span className="text-xs text-slate-500">작성자: {notice?.authorName || '선생님'}</span>
              </div>
              {notice?.expiresAt && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {getRemainingTimeString(notice.expiresAt)}
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-slate-900 leading-snug">
              {notice?.title || '등록된 공지사항이 없습니다.'}
            </h4>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {notice?.content || '상세 내용이 없습니다.'}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                확인 닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}