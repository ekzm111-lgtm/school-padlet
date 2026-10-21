'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  Send,
  Upload,
  ClipboardCheck,
  Sparkles,
  Check,
} from 'lucide-react';
import { Post, User } from '@/lib/types';
import { getStoreData, saveStoreData, addMyPostId } from '@/lib/store';
import confetti from 'canvas-confetti';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  currentUser: User | null;
  defaultColumn?: string;
  onCreated: (newPost: Post) => void;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  boardId,
  currentUser,
  defaultColumn,
  onCreated,
}: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<Post['color']>('yellow');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [customAuthor, setCustomAuthor] = useState(currentUser?.name || '');
  const [showImageTools, setShowImageTools] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser?.name) {
      setCustomAuthor(currentUser.name);
    }
  }, [currentUser]);

  // 모달이 열려 있을 때 전역 어디서든 Ctrl+V 캡처 이미지 감지
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setImageUrl(event.target.result as string);
                setShowImageTools(true);
                setPasteNotice(true);
                setTimeout(() => setPasteNotice(false), 3000);
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isOpen]);

  // 로컬 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
          setShowImageTools(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim() && !imageUrl) return;

    const newPost: Post = {
      id: `post-${Date.now()}`,
      boardId,
      title: title.trim(),
      content: content.trim(),
      color,
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      authorName: customAuthor.trim() || currentUser?.name || '익명 참여자',
      authorRole: currentUser?.role || 'student',
      authorId: currentUser?.id || `anon-${Date.now()}`,
      reactions: { like: 0, clap: 0, heart: 0, insight: 0 },
      comments: [],
      column: defaultColumn || undefined,
      x: 30 + (Math.random() * 200),
      y: 80 + (Math.random() * 200),
      createdAt: '방금 전',
    };

    const data = getStoreData();
    saveStoreData.posts([newPost, ...data.posts]);
    addMyPostId(newPost.id);
    onCreated(newPost);

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    } catch (e) {}

    onClose();
  };

  // 학교 맞춤 테마별 추천 고화질 일러스트/사진
  const themePresets = [
    { label: '🧪 과학 실험', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60' },
    { label: '📚 도서관/독서', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=60' },
    { label: '🎨 미술/예술', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=60' },
    { label: '🌱 자연과 환경', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=60' },
    { label: '🚀 우주와 천문', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60' },
    { label: '💻 코딩과 로봇', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=60' },
    { label: '⚽ 체육/활동', url: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&auto=format&fit=crop&q=60' },
    { label: '📜 역사와 문화', url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&auto=format&fit=crop&q=60' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">새 메모/과제 작성</h3>
            <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              Ctrl+V 캡처 붙여넣기 지원
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {pasteNotice && (
          <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5 font-bold animate-in fade-in">
            <ClipboardCheck className="w-4 h-4" />
            <span>캡처한 이미지가 바로 첨부되었습니다!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 작성자 이름 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">작성자 (이름 / 모둠명)</label>
            <input
              type="text"
              placeholder="예: 2모둠 이지은"
              value={customAuthor}
              onChange={(e) => setCustomAuthor(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 제목 */}
          <div>
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 본문 (Ctrl+V 이미지 붙여넣기 가능) */}
          <div>
            <textarea
              required={!imageUrl}
              rows={4}
              placeholder="내용을 적어보세요... (화면 캡처 후 Ctrl+V 를 누르면 이미지가 바로 첨부됩니다)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          {/* 첨부된 이미지 미리보기 */}
          {imageUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 group max-h-56 bg-slate-100">
              <img src={imageUrl} alt="첨부 미리보기" className="w-full h-48 object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition"
                title="이미지 삭제"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 이미지 첨부 도구 (캡처/업로드/테마 이미지) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>사진/이미지 추가</span>
              </span>
              <span className="text-[10px] text-slate-400">화면 캡처 후 Ctrl+V 가능</span>
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>내 컴퓨터 사진 올리기</span>
              </button>
            </div>

            {/* 테마 프리셋 갤러리 */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>학교 수업 테마 이미지 선택 (원클릭)</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {themePresets.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setImageUrl(t.url)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-[10px] font-medium text-slate-700 text-center truncate transition"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 링크 추가 */}
          {showLinkInput ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>참고 링크(URL)</span>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(false)}
                  className="text-slate-400 hover:text-slate-600 text-[10px]"
                >
                  닫기
                </button>
              </div>
              <input
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none bg-white"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLinkInput(true)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-medium"
            >
              <LinkIcon className="w-4 h-4 text-emerald-500" />
              <span>+ 참고 링크(URL) 추가</span>
            </button>
          )}

          {/* 색상 선택 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">포스트잇 색상</label>
            <div className="flex items-center gap-2">
              {[
                { id: 'yellow', name: '노랑', bg: 'bg-yellow-200 border-yellow-400' },
                { id: 'pink', name: '분홍', bg: 'bg-pink-200 border-pink-400' },
                { id: 'blue', name: '하늘', bg: 'bg-sky-200 border-sky-400' },
                { id: 'green', name: '연두', bg: 'bg-green-200 border-green-400' },
                { id: 'purple', name: '보라', bg: 'bg-purple-200 border-purple-400' },
                { id: 'white', name: '흰색', bg: 'bg-white border-slate-300' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id as Post['color'])}
                  className={`w-7 h-7 rounded-full border-2 transition ${c.bg} ${
                    color === c.id ? 'ring-2 ring-blue-600 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* 제출 */}
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>보드에 붙이기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
