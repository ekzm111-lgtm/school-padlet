'use client';

import { useState } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, Palette, Send, Paperclip } from 'lucide-react';
import { Post, User } from '@/lib/types';
import { getStoreData, saveStoreData } from '@/lib/store';
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
  const [showImageInput, setShowImageInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;

    const newPost: Post = {
      id: `post-${Date.now()}`,
      boardId,
      title: title.trim(),
      content: content.trim(),
      color,
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      authorName: customAuthor.trim() || currentUser?.name || '익명 학생',
      authorRole: currentUser?.role || 'student',
      authorId: currentUser?.id || `anon-${Date.now()}`,
      reactions: { like: 0, clap: 0, heart: 0, insight: 0 },
      comments: [],
      column: defaultColumn || undefined,
      createdAt: '방금 전',
    };

    const data = getStoreData();
    saveStoreData.posts([newPost, ...data.posts]);
    onCreated(newPost);

    // 가벼운 축하 효과
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {}

    onClose();
  };

  const sampleImages = [
    { label: '실험/과학', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60' },
    { label: '독서/책', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=60' },
    { label: '자연/환경', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=60' },
    { label: '미술/예술', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=60' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">새 메모/과제 작성</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
              placeholder="제목을 입력하세요 (선택)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none placeholder:font-normal"
            />
          </div>

          {/* 본문 */}
          <div>
            <textarea
              required
              rows={4}
              placeholder="나누고 싶은 생각이나 조사한 내용을 자유롭게 적어보세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          {/* 이미지 첨부 토글/입력 */}
          {showImageInput ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>이미지 웹 주소(URL)</span>
                <button
                  type="button"
                  onClick={() => setShowImageInput(false)}
                  className="text-slate-400 hover:text-slate-600 text-[10px]"
                >
                  닫기
                </button>
              </div>
              <input
                type="url"
                placeholder="https://... 이미지 링크 주소"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none bg-white"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400">추천 샘플:</span>
                {sampleImages.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setImageUrl(s.url)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-blue-400 text-slate-600"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImageInput(true)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-medium"
            >
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>+ 사진/이미지 추가</span>
            </button>
          )}

          {/* 링크 첨부 토글/입력 */}
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
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-medium ml-3"
            >
              <LinkIcon className="w-4 h-4 text-emerald-500" />
              <span>+ 참고 링크 추가</span>
            </button>
          )}

          {/* 포스트잇 색상 선택 */}
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
