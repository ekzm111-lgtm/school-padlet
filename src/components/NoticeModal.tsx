'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Megaphone, Bell, Sparkles, Check, Trash2, Eye, EyeOff, Calendar, Clock, ShieldAlert, GraduationCap } from 'lucide-react';
import { Notice } from '@/lib/types';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice?: Notice | null;
  onSave?: (notice: Notice | null) => void;
  adminNotice?: Notice | null;
  teacherNotice?: Notice | null;
  onSaveAdminNotice?: (notice: Notice | null) => void;
  onSaveTeacherNotice?: (notice: Notice | null) => void;
  isAdmin?: boolean;
  isTeacherOrAdmin?: boolean;
  initialTab?: 'admin' | 'teacher';
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
  adminNotice,
  teacherNotice,
  onSaveAdminNotice,
  onSaveTeacherNotice,
  isAdmin,
  isTeacherOrAdmin,
  initialTab = 'teacher',
}: NoticeModalProps) {
  // 현재 활성화된 탭 ('admin': 교직원 대상 공지, 'teacher': 학생 대상 공지)
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher'>('teacher');

  // 관리 권한:
  // - 학생 대상 공지(teacher): 교사 및 관리자 모두 관리 가능
  // - 교직원 대상 공지(admin): 최고 관리자(admin)만 작성/수정 가능 (교사는 열람 가능)
  const canManageCurrentTab = activeTab === 'admin' ? Boolean(isAdmin) : Boolean(isAdmin || isTeacherOrAdmin);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'urgent' | 'general' | 'event'>('general');
  const [isActive, setIsActive] = useState(true);

  // 게시 기간 설정
  const [durationType, setDurationType] = useState<DurationType>('unlimited');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');

  const prevIsOpenRef = useRef(false);

  // 현재 탭에 해당하는 공지 객체 가져오기
  const getCurrentTargetNotice = (tab: 'admin' | 'teacher'): Notice | null => {
    if (tab === 'admin') {
      return adminNotice || (notice?.noticeType === 'admin' ? notice : null);
    }
    return teacherNotice || notice || null;
  };

  // 탭 변경 시 폼 입력값 재설정
  const loadNoticeIntoForm = (targetNotice: Notice | null, tab: 'admin' | 'teacher') => {
    if (targetNotice) {
      setTitle(targetNotice.title || '');
      setContent(targetNotice.content || '');
      setCategory(targetNotice.category || 'general');
      setIsActive(targetNotice.isActive !== false);

      if (targetNotice.expiresAt) {
        const expDate = new Date(targetNotice.expiresAt);
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
  };

  // 모달이 열릴 때 초기 탭 및 데이터 설정
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const defaultTab = isAdmin && initialTab === 'admin' ? 'admin' : (initialTab || 'teacher');
      setActiveTab(defaultTab);
      loadNoticeIntoForm(getCurrentTargetNotice(defaultTab), defaultTab);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTab, isAdmin, adminNotice, teacherNotice, notice]);

  // 탭을 사용자가 전환했을 때
  const handleSwitchTab = (tab: 'admin' | 'teacher') => {
    setActiveTab(tab);
    loadNoticeIntoForm(getCurrentTargetNotice(tab), tab);
  };

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

    const currentNotice = getCurrentTargetNotice(activeTab);
    const expiresAt = calculateFinalExpiresAt();

    const updatedNotice: Notice = {
      id: currentNotice?.id || (activeTab === 'admin' ? 'schoolpad_admin_notice' : 'schoolpad_teacher_notice'),
      title: title.trim(),
      content: content.trim(),
      category,
      authorName: currentNotice?.authorName || (activeTab === 'admin' ? '학교 관리자' : '선생님'),
      isActive,
      expiresAt,
      createdAt: currentNotice?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: Date.now(),
      targetAudience: activeTab === 'admin' ? 'teachers' : 'students',
      noticeType: activeTab,
    };

    if (activeTab === 'admin') {
      if (onSaveAdminNotice) {
        onSaveAdminNotice(updatedNotice);
      } else if (onSave) {
        onSave(updatedNotice);
      }
    } else {
      if (onSaveTeacherNotice) {
        onSaveTeacherNotice(updatedNotice);
      } else if (onSave) {
        onSave(updatedNotice);
      }
    }

    onClose();
  };

  const handleDelete = () => {
    if (confirm(`${activeTab === 'admin' ? '교직원 공지' : '학생 공지'}를 완전히 삭제(비활성화)하시겠습니까?`)) {
      if (activeTab === 'admin') {
        if (onSaveAdminNotice) onSaveAdminNotice(null);
        else if (onSave) onSave(null);
      } else {
        if (onSaveTeacherNotice) onSaveTeacherNotice(null);
        else if (onSave) onSave(null);
      }
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
      label: activeTab === 'admin' ? '교무 안내' : '수업 안내',
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

  const currentNotice = getCurrentTargetNotice(activeTab);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
              activeTab === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {activeTab === 'admin' ? <ShieldAlert className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {activeTab === 'admin' ? '🏫 교직원 대상 공지사항' : '📢 학생 대상 공지사항'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {activeTab === 'admin'
                  ? '선생님과 관리자에게만 노출되며, 학생에게는 표시되지 않습니다.'
                  : '학생 홈 화면 메인 상단에 눈에 띄게 노출되는 공지입니다.'}
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

        {/* 🌟 교사/관리자 전용: 공지 대상 선택 탭 (교직원 vs 학생) */}
        {(isAdmin || isTeacherOrAdmin) && (
          <div className="mt-4 grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => handleSwitchTab('admin')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>교직원 공지 {isAdmin ? '(관리자 전용)' : '(열람)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('teacher')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'teacher'
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>학생 공지 (수업 안내)</span>
            </button>
          </div>
        )}

        {/* 안내 배너 */}
        <div className={`mt-3 p-3 rounded-2xl border text-xs flex items-start gap-2 ${
          activeTab === 'admin'
            ? 'bg-indigo-50/70 border-indigo-200/60 text-indigo-900'
            : 'bg-blue-50/70 border-blue-200/60 text-blue-900'
        }`}>
          <div className="mt-0.5 shrink-0">
            {activeTab === 'admin' ? '🔒' : '📢'}
          </div>
          <div>
            <span className="font-bold">
              {activeTab === 'admin' ? '수신 대상: 교사 및 교직원' : '수신 대상: 전교생 (학생 홈 메인 노출)'}
            </span>
            <p className="text-[11px] opacity-80 mt-0.5">
              {activeTab === 'admin'
                ? '관리자가 교무 업무 및 학사 운영 안내를 전달하며, 학생 화면에는 절대 보이지 않습니다.'
                : '선생님이 수업 및 학급 협업 소식을 학생들에게 직접 공지합니다.'}
            </p>
          </div>
        </div>

        {/* 작성 폼 (권한이 있는 경우) */}
        {canManageCurrentTab ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                    {isActive
                      ? (activeTab === 'admin' ? '교사 화면 상단 배너에 노출됩니다.' : '학생 홈 화면 상단 배너에 노출됩니다.')
                      : '화면에서 숨겨집니다.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 게시 기간 설정 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>게시 기간 설정</span>
                </div>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  {getRemainingTimeString(finalExpiresAt)}
                </span>
              </div>

              {/* 프리셋 버튼 */}
              <div className="grid grid-cols-5 gap-1 text-[11px]">
                {[
                  { id: 'unlimited', label: '무기한' },
                  { id: '1day', label: '1일' },
                  { id: '3days', label: '3일' },
                  { id: '7days', label: '7일' },
                  { id: 'custom', label: '직접지정' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectDuration(item.id as DurationType)}
                    className={`py-1.5 px-1 rounded-xl font-bold transition-all border ${
                      durationType === item.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* 직접 지정 datetime-local 인풋 */}
              {durationType !== 'unlimited' && (
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-500 mb-1">종료 일시 지정</label>
                  <input
                    type="datetime-local"
                    value={customExpiresAt}
                    onChange={(e) => {
                      setDurationType('custom');
                      setCustomExpiresAt(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* 공지 제목 입력 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                공지사항 제목 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={activeTab === 'admin' ? "예: [교직원] 2학기 수업 평가 및 원격 연수 안내" : "예: 2학기 팀 프로젝트 활동 안내 및 규칙"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            {/* 공지 상세 내용 입력 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                공지사항 상세 내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder={activeTab === 'admin' ? "교직원 분들께 전달할 상세 공지 내용을 입력하세요." : "학생들에게 전달할 상세 안내 및 과제 지침을 입력하세요."}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium leading-relaxed"
              />
            </div>

            {/* 하단 버튼 액션 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {currentNotice ? (
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
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>{currentNotice ? '수정 내용 저장' : '공지사항 등록'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* 권한 없는 탭 (교사의 교직원 공지 열람 또는 학생 열람 뷰) */
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${categoryMeta[category].badge}`}>
                  {categoryMeta[category].label}
                </span>
                <span className="text-xs text-slate-500">작성자: {currentNotice?.authorName || (activeTab === 'admin' ? '학교 관리자' : '선생님')}</span>
              </div>
              {currentNotice?.expiresAt && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {getRemainingTimeString(currentNotice.expiresAt)}
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-slate-900 leading-snug">
              {currentNotice?.title || '등록된 공지사항이 없습니다.'}
            </h4>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {currentNotice?.content || '상세 내용이 없습니다.'}
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
