'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Check,
  Sparkles,
  Link as LinkIcon,
  Play,
  Pause,
  Clock,
} from 'lucide-react';
import { BannerSettings, BannerSlide } from '@/lib/types';
import { DEFAULT_BANNER_SETTINGS } from '@/lib/supabaseStore';

interface BannerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BannerSettings;
  onSave: (newSettings: BannerSettings) => void;
}

// 추천 고화질 교실/학교 프리셋 이미지 목록
const PRESET_IMAGES = [
  {
    title: '한국형 교실 풍경',
    url: '/korean_classroom_banner.jpg',
    tag: '기본 교실',
    position: 'center 25%',
  },
  {
    title: '밝고 쾌적한 교실',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&auto=format&fit=crop&q=80',
    tag: '모던 교실',
    position: 'center 25%',
  },
  {
    title: '도서관과 북카페',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1600&auto=format&fit=crop&q=80',
    tag: '도서관',
    position: 'center 40%',
  },
  {
    title: '열정적인 수업과 발표',
    url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&auto=format&fit=crop&q=80',
    tag: '수업 참여',
    position: 'center 30%',
  },
  {
    title: '함께 탐구하는 학생들',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&auto=format&fit=crop&q=80',
    tag: '모둠 활동',
    position: 'center 35%',
  },
  {
    title: '창의 과학 실험실',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1600&auto=format&fit=crop&q=80',
    tag: '과학실',
    position: 'center 30%',
  },
];

// 사진 세로 위치 백분율(0%~100%) 추출 헬퍼
function getPositionPercent(pos?: string): number {
  if (!pos) return 25;
  if (pos.includes('top')) return 0;
  if (pos.includes('bottom')) return 100;
  if (pos.includes('center center') || pos === 'center') return 50;
  const match = pos.match(/(\d+)%/);
  if (match) return Math.min(100, Math.max(0, parseInt(match[1], 10)));
  return 25;
}

export default function BannerSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: BannerSettingsModalProps) {
  const [slides, setSlides] = useState<BannerSlide[]>(settings.slides || DEFAULT_BANNER_SETTINGS.slides);
  const [autoSlide, setAutoSlide] = useState<boolean>(settings.autoSlide ?? true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(settings.intervalSeconds || 5);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSlides(settings.slides && settings.slides.length > 0 ? settings.slides : DEFAULT_BANNER_SETTINGS.slides);
      setAutoSlide(settings.autoSlide ?? true);
      setIntervalSeconds(settings.intervalSeconds || 5);
      setInputUrl('');
      setInputTitle('');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // 1. 파일 직접 업로드 처리 (Canvas 리사이징으로 최적화)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1600;
        const maxH = 900;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          if (w / h > maxW / maxH) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          } else {
            w = Math.round((w * maxH) / h);
            h = maxH;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          const newSlide: BannerSlide = {
            id: `slide-${Date.now()}`,
            url: compressedDataUrl,
            title: file.name.replace(/\.[^/.]+$/, ''),
            position: 'center 25%',
          };

          setSlides((prev) => [...prev, newSlide]);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 2. 프리셋 이미지 추가
  const handleAddPreset = (preset: { title: string; url: string; position?: string }) => {
    const newSlide: BannerSlide = {
      id: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: preset.url,
      title: preset.title,
      position: preset.position || 'center 25%',
    };
    setSlides((prev) => [...prev, newSlide]);
  };

  // 3. 웹 URL 직접 추가
  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const newSlide: BannerSlide = {
      id: `slide-${Date.now()}`,
      url: inputUrl.trim(),
      title: inputTitle.trim() || '웹 배너 이미지',
      position: 'center 25%',
    };
    setSlides((prev) => [...prev, newSlide]);
    setInputUrl('');
    setInputTitle('');
  };

  // 슬라이드 보이는 위치(포커스/정렬) 변경
  const handleUpdatePosition = (id: string, newPos: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, position: newPos } : s))
    );
  };

  // 순서 위로
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSlides((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  // 순서 아래로
  const handleMoveDown = (index: number) => {
    if (index === slides.length - 1) return;
    setSlides((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  // 슬라이드 삭제
  const handleDeleteSlide = (id: string) => {
    if (slides.length <= 1) {
      alert('배너 이미지는 최소 1개 이상 유지되어야 합니다.');
      return;
    }
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  // 기본값 복원
  const handleResetDefault = () => {
    if (confirm('기본 추천 이미지 및 슬라이드 설정으로 복원하시겠습니까?')) {
      setSlides(DEFAULT_BANNER_SETTINGS.slides);
      setAutoSlide(DEFAULT_BANNER_SETTINGS.autoSlide);
      setIntervalSeconds(DEFAULT_BANNER_SETTINGS.intervalSeconds);
    }
  };

  // 최종 저장
  const handleSave = () => {
    if (slides.length === 0) {
      alert('최소 1개 이상의 배너 이미지가 필요합니다.');
      return;
    }
    const updated: BannerSettings = {
      slides,
      autoSlide,
      intervalSeconds,
      updatedAt: Date.now(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                🖼️ 메인 배너 이미지 및 슬라이드쇼 관리
              </h3>
              <p className="text-[11px] text-slate-500">
                메인 상단 배너 이미지를 변경하거나, 여러 장을 등록하여 자동 롤링 슬라이드로 연출할 수 있습니다.
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

        {/* 바디 컨텐츠 */}
        <div className="py-4 space-y-6 flex-1 overflow-y-auto pr-1">
          {/* 현재 등록된 슬라이드 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>현재 등록된 배너 이미지 목록</span>
                <span className="text-indigo-600 font-mono font-bold bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                  {slides.length}장
                </span>
              </label>
              <span className="text-[10px] text-slate-400">
                ▲▼ 버튼으로 슬라이드 순서를 변경할 수 있습니다.
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
              {slides.map((slide, idx) => {
                const currentPercent = getPositionPercent(slide.position);
                return (
                  <div
                    key={slide.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition"
                  >
                    {/* 상단/좌측: 순서 뱃지 + 썸네일 미리보기 (선택한 위치 실시간 반영) */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* 순서 뱃지 */}
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      {/* 썸네일 미리보기 (실제 배너 비율과 동일하게 표시) */}
                      <div className="w-24 h-14 rounded-xl overflow-hidden bg-slate-900 border border-black/10 shrink-0 relative group/thumb shadow-inner">
                        <img
                          src={slide.url}
                          alt={slide.title || '배너'}
                          className="w-full h-full object-cover transition-all duration-200"
                          style={{
                            objectPosition: slide.position || 'center 25%',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/korean_classroom_banner.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold bg-black/60 text-white px-1 py-0.2 rounded backdrop-blur-xs">
                          {currentPercent}%
                        </span>
                      </div>
                    </div>

                    {/* 중앙: 이미지 설명 및 사진 보이는 위치(세로 포커스) 조절 */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* 이미지 제목/설명 입력 */}
                      <input
                        type="text"
                        value={slide.title || ''}
                        placeholder="이미지 설명/제목 (선택)"
                        onChange={(e) => {
                          const val = e.target.value;
                          setSlides((prev) =>
                            prev.map((s) => (s.id === slide.id ? { ...s, title: val } : s))
                          );
                        }}
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100/80 focus:bg-white px-2.5 py-1 rounded-lg border border-slate-200 focus:border-indigo-400 outline-none truncate"
                      />

                      {/* 🎯 사진 보이는 위치(세로 정렬) 설정 컨트롤 */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          위치:
                        </span>
                        {/* 위치 프리셋 버튼들 */}
                        <div className="flex items-center gap-1">
                          {[
                            { label: '상단', pos: 'center top', val: 0 },
                            { label: '상단 25%', pos: 'center 25%', val: 25 },
                            { label: '중앙', pos: 'center center', val: 50 },
                            { label: '하단', pos: 'center bottom', val: 100 },
                          ].map((preset) => {
                            const isSelected = currentPercent === preset.val;
                            return (
                              <button
                                key={preset.pos}
                                type="button"
                                onClick={() => handleUpdatePosition(slide.id, preset.pos)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white font-black shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* 미세 조절 슬라이더 */}
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={currentPercent}
                            onChange={(e) =>
                              handleUpdatePosition(slide.id, `center ${e.target.value}%`)
                            }
                            className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            title={`세로 위치: ${currentPercent}%`}
                          />
                          <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
                            {currentPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 우측: 순서 변경 및 삭제 컨트롤 */}
                    <div className="flex items-center justify-end gap-1 shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-100">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className={`p-1 rounded-lg transition ${
                          idx === 0 ? 'text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                        title="위로 이동"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === slides.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className={`p-1 rounded-lg transition ${
                          idx === slides.length - 1 ? 'text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                        title="아래로 이동"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 슬라이드 롤링(자동 전환) 옵션 */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <span>자동 롤링(슬라이드쇼)</span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      autoSlide ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {autoSlide ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {autoSlide
                    ? `${intervalSeconds}초마다 배너 이미지가 부드럽게 자동 전환됩니다.`
                    : '수동으로 좌우 버튼을 누를 때만 전환됩니다.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoSlide(!autoSlide)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  autoSlide
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {autoSlide ? '롤링 켜짐' : '롤링 꺼짐'}
              </button>

              {autoSlide && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-indigo-200 shadow-2xs">
                  {[3, 5, 7, 10].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setIntervalSeconds(sec)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                        intervalSeconds === sec
                          ? 'bg-indigo-600 text-white font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {sec}초
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 새 이미지 추가 영역 (3개 탭: 파일 업로드 / 프리셋 / URL) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              새 배너 이미지 추가하기
            </label>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {/* 탭 버튼 */}
              <div className="flex border-b border-slate-200 bg-slate-50/70 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'upload'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>내 컴퓨터 사진 업로드</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preset')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'preset'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>추천 학교 사진 프리셋</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'url'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>웹 URL 직접 입력</span>
                </button>
              </div>

              {/* 탭 1: 파일 업로드 */}
              {activeTab === 'upload' && (
                <div className="p-4 text-center space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-6 cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-900">클릭하여 사진 파일 선택</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG, WebP 등 고화질 이미지 지원 (가로형 와이드 사진 권장)
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* 탭 2: 추천 프리셋 갤러리 */}
              {activeTab === 'preset' && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto">
                  {PRESET_IMAGES.map((preset) => (
                    <div
                      key={preset.url}
                      onClick={() => handleAddPreset(preset)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-500 cursor-pointer shadow-2xs transition hover:shadow-md"
                    >
                      <div className="h-20 w-full overflow-hidden bg-slate-100">
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          style={{ objectPosition: preset.position || 'center 25%' }}
                        />
                      </div>
                      <div className="p-1.5 bg-white flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 truncate">{preset.title}</span>
                        <Plus className="w-3 h-3 text-indigo-600 shrink-0 group-hover:scale-125 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 탭 3: 웹 URL 입력 */}
              {activeTab === 'url' && (
                <form onSubmit={handleAddUrl} className="p-4 space-y-2.5">
                  <div>
                    <input
                      type="url"
                      placeholder="이미지 주소 URL (예: https://example.com/banner.jpg)"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="이미지 제목 (예: 가을 학예회 배너)"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>추가</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 하단 모달 액션 버튼 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값 복원</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition"
            >
              <Check className="w-4 h-4" />
              <span>배너 설정 저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}