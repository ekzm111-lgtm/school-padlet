'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  ClipboardCheck,
  Sparkles,
  Save,
} from 'lucide-react';
import { Post } from '@/lib/types';
import { getStoreData, saveStoreData } from '@/lib/store';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onUpdated: (updatedPost: Post) => void;
}

export default function EditPostModal({
  isOpen,
  onClose,
  post,
  onUpdated,
}: EditPostModalProps) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [color, setColor] = useState<Post['color']>(post.color);
  const [imageUrl, setImageUrl] = useState(post.imageUrl || '');
  const [linkUrl, setLinkUrl] = useState(post.linkUrl || '');
  const [customAuthor, setCustomAuthor] = useState(post.authorName);
  const [pasteNotice, setPasteNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
            e.preventDefault(); // 기본 텍스트 붙여넣기 방지 및 이미지 처리
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setImageUrl(event.target.result as string);
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
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim() && !imageUrl) return;

    const updated: Post = {
      ...post,
      title: title.trim(),
      content: content.trim(),
      color,
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      authorName: customAuthor.trim() || post.authorName,
      updatedAt: '방금 수정됨',
    };

    const data = getStoreData();
    const updatedList = data.posts.map((p) => (p.id === post.id ? updated : p));
    saveStoreData.posts(updatedList);
    onUpdated(updated);
    onClose();
  };

  const themePresets = [
    { label: '🧪 과학 실험', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60' },
    { label: '📚 도서관/독서', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=60' },
    { label: '🎨 미술/예술', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=60' },
    { label: '🌱 자연과 환경', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=60' },
    { label: '🚀 우주와 천문', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60' },
    { label: '💻 코딩과 로봇', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=60' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">카드 내용 수정하기</h3>
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
            <span>캡처한 이미지가 바로 변경되었습니다!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">작성자</label>
            <input
              type="text"
              value={customAuthor}
              onChange={(e) => setCustomAuthor(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">본문 내용</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

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

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>사진/이미지 변경</span>
              </span>
              <span className="text-[10px] text-slate-400">Ctrl+V 붙여넣기 가능</span>
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
                <span>내 컴퓨터 사진 선택</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {themePresets.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setImageUrl(t.url)}
                  className="p-1 rounded-lg bg-white border border-slate-200 hover:border-blue-500 text-[10px] font-medium text-slate-700 text-center truncate"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">참고 링크 (URL)</label>
            <input
              type="url"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
            />
          </div>

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
              <Save className="w-3.5 h-3.5" />
              <span>수정 완료</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
