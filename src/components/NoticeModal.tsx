'use client';

import { useState, useEffect } from 'react';
import { X, Megaphone, Bell, Sparkles, Check, Trash2, Eye, EyeOff } from 'lucide-react';
import { Notice } from '@/lib/types';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice | null;
  onSave: (notice: Notice | null) => void;
  isTeacherOrAdmin: boolean;
}

export default function NoticeModal({
  isOpen,
  onClose,
  notice,
  onSave,
  isTeacherOrAdmin,
}: NoticeModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'urgent' | 'general' | 'event'>('general');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (notice) {
      setTitle(notice.title || '');
      setContent(notice.content || '');
      setCategory(notice.category || 'general');
      setIsActive(notice.isActive !== false);
    } else {
      setTitle('');
      setContent('');
      setCategory('general');
      setIsActive(true);
    }
  }, [notice, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('공지사항 제목을 입력해 주세요.');
      return;
    }

    const updatedNotice: Notice = {
      id: notice?.id || `notice-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      category,
      authorName: notice?.authorName || '선생님 (관리자)',
      isActive,
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
                {isTeacherOrAdmin ? '📢 관리자 공지사항 설정' : '📢 전체 공지사항'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isTeacherOrAdmin
                  ? '모든 학생과 교사가 볼 수 있는 전역 공지를 작성하고 관리합니다.'
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

        {/* 관리자 작성 폼 */}
        {isTeacherOrAdmin ? (
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
                    {isActive ? '메인 화면 상단 띠 배너로 모든 학생에게 표시됩니다.' : '메인 화면에서 숨겨집니다.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${categoryMeta[category].badge}`}>
                {categoryMeta[category].label}
              </span>
              <span className="text-xs text-slate-500">작성자: {notice?.authorName || '선생님'}</span>
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
