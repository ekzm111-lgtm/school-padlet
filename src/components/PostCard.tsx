'use client';

import { useState } from 'react';
import {
  Heart,
  ThumbsUp,
  Sparkles,
  Lightbulb,
  MessageCircle,
  ExternalLink,
  Trash2,
  Pin,
  Send,
  MoreVertical,
} from 'lucide-react';
import { Post, User } from '@/lib/types';
import { getStoreData, saveStoreData } from '@/lib/store';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  allowComments?: boolean;
  allowReactions?: boolean;
  onDelete: (postId: string) => void;
}

export default function PostCard({
  post,
  currentUser,
  allowComments = true,
  allowReactions = true,
  onDelete,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [reactions, setReactions] = useState(post.reactions);
  const [comments, setComments] = useState(post.comments || []);
  const [showImageModal, setShowImageModal] = useState(false);

  const handleReaction = (type: 'like' | 'clap' | 'heart' | 'insight') => {
    if (!allowReactions) return;
    const newReactions = {
      ...reactions,
      [type]: reactions[type] + 1,
    };
    setReactions(newReactions);

    // 스토어 업데이트
    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === post.id ? { ...p, reactions: newReactions } : p
    );
    saveStoreData.posts(updatedPosts);

    // 하트나 박수 시 기분 좋은 파티클 효과
    try {
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.7 },
      });
    } catch (e) {}
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      postId: post.id,
      authorName: currentUser?.name || '익명 참여자',
      content: commentInput.trim(),
      createdAt: '방금 전',
    };

    const newComments = [...comments, newComment];
    setComments(newComments);
    setCommentInput('');

    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === post.id ? { ...p, comments: newComments } : p
    );
    saveStoreData.posts(updatedPosts);
  };

  const canDelete =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'teacher' ||
    (currentUser && currentUser.id === post.authorId);

  const cardColorClass = {
    yellow: 'card-color-yellow',
    pink: 'card-color-pink',
    blue: 'card-color-blue',
    green: 'card-color-green',
    purple: 'card-color-purple',
    white: 'card-color-white',
  }[post.color || 'yellow'];

  return (
    <>
      <div
        className={`relative rounded-2xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md ${cardColorClass} flex flex-col justify-between`}
      >
        {/* 상단 핀 & 작성자 & 삭제 버튼 */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {post.pinned && (
                <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  <Pin className="w-3 h-3 fill-current rotate-45" />
                  <span>공지</span>
                </span>
              )}
              <span className="font-bold text-xs text-slate-800">{post.authorName}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                  post.authorRole === 'teacher'
                    ? 'bg-blue-600 text-white'
                    : 'bg-black/10 text-slate-700'
                }`}
              >
                {post.authorRole === 'teacher' ? '선생님' : '학생'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-medium">{post.createdAt}</span>
              {canDelete && (
                <button
                  onClick={() => onDelete(post.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 제목 (있을 경우) */}
          {post.title && (
            <h4 className="font-bold text-sm text-slate-900 mb-1.5 leading-snug">{post.title}</h4>
          )}

          {/* 본문 */}
          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>

          {/* 첨부 이미지 */}
          {post.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-black/10 shadow-xs cursor-pointer group">
              <img
                src={post.imageUrl}
                alt="첨부 이미지"
                onClick={() => setShowImageModal(true)}
                className="w-full max-h-56 object-cover group-hover:scale-105 transition duration-200"
              />
            </div>
          )}

          {/* 첨부 링크 */}
          {post.linkUrl && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[11px] text-blue-700 font-medium truncate transition"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{post.linkUrl}</span>
            </a>
          )}
        </div>

        {/* 하단 반응 및 댓글 바 */}
        <div className="mt-4 pt-3 border-t border-black/10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* 반응 이모지 4종 */}
            {allowReactions && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleReaction('like')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 hover:bg-white text-[11px] font-bold text-slate-700 transition"
                  title="좋아요"
                >
                  <ThumbsUp className="w-3 h-3 text-blue-600" />
                  <span>{reactions.like}</span>
                </button>

                <button
                  onClick={() => handleReaction('heart')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 hover:bg-white text-[11px] font-bold text-slate-700 transition"
                  title="멋져요"
                >
                  <Heart className="w-3 h-3 text-rose-500 fill-current" />
                  <span>{reactions.heart}</span>
                </button>

                <button
                  onClick={() => handleReaction('insight')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 hover:bg-white text-[11px] font-bold text-slate-700 transition"
                  title="좋은 생각"
                >
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  <span>{reactions.insight}</span>
                </button>
              </div>
            )}

            {/* 댓글 토글 버튼 */}
            {allowComments && (
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition ml-auto"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>댓글 {comments.length}개</span>
              </button>
            )}
          </div>

          {/* 댓글 영역 */}
          {showComments && allowComments && (
            <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="bg-white/80 p-2.5 rounded-xl text-xs space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>{c.authorName}</span>
                    <span>{c.createdAt}</span>
                  </div>
                  <div className="text-slate-800 font-normal">{c.content}</div>
                </div>
              ))}

              <form onSubmit={handleAddComment} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="따뜻한 한마디 남기기..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-white/90 border border-black/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 이미지 크게 보기 모달 */}
      {showImageModal && post.imageUrl && (
        <div
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[90vh] p-2">
            <img
              src={post.imageUrl}
              alt="확대 이미지"
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl mx-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
