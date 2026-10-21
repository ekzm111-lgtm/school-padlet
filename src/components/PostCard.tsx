'use client';

import { useState } from 'react';
import {
  Heart,
  ThumbsUp,
  Lightbulb,
  MessageCircle,
  ExternalLink,
  Trash2,
  Pin,
  Send,
  Pencil,
  Download,
  FileText,
  Paperclip,
} from 'lucide-react';
import { Post, User, FileAttachment } from '@/lib/types';
import { getStoreData, saveStoreData, getMyPostIds } from '@/lib/store';
import PostModal from './PostModal';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  columns?: string[];
  allowComments?: boolean;
  allowReactions?: boolean;
  onDelete: (postId: string) => void;
  onUpdated?: (updated: Post) => void;
}

export default function PostCard({
  post,
  currentUser,
  columns = [],
  allowComments = true,
  allowReactions = true,
  onDelete,
  onUpdated,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const [commentInput, setCommentInput] = useState('');
  const [reactions, setReactions] = useState(post?.reactions || { like: 0, clap: 0, heart: 0, insight: 0 });
  const [comments, setComments] = useState(post?.comments || []);
  const [showImageModal, setShowImageModal] = useState(false);

  if (!currentPost) return null;

  const handleReaction = (type: 'like' | 'clap' | 'heart' | 'insight') => {
    if (!allowReactions) return;
    const newReactions = {
      ...reactions,
      [type]: (reactions[type] || 0) + 1,
    };
    setReactions(newReactions);

    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === currentPost.id ? { ...p, reactions: newReactions } : p
    );
    saveStoreData.posts(updatedPosts);

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
      postId: currentPost.id,
      authorName: currentUser?.name || '익명 참여자',
      content: commentInput.trim(),
      createdAt: '방금 전',
    };

    const newComments = [...comments, newComment];
    setComments(newComments);
    setCommentInput('');

    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === currentPost.id ? { ...p, comments: newComments } : p
    );
    saveStoreData.posts(updatedPosts);
  };

  const myPostIds = getMyPostIds();
  const isAuthor =
    (currentUser && currentUser.id === currentPost.authorId) ||
    (currentUser && currentUser.name === currentPost.authorName) ||
    myPostIds.includes(currentPost.id);

  const canEdit =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'teacher' ||
    isAuthor;

  const canDelete = canEdit;

  const cardColorClass = {
    yellow: 'card-color-yellow',
    pink: 'card-color-pink',
    blue: 'card-color-blue',
    green: 'card-color-green',
    purple: 'card-color-purple',
    white: 'card-color-white',
  }[currentPost.color || 'yellow'] || 'card-color-yellow';

  // 첨부 파일 목록 취합 (다중 파일 + 단일 파일 호환)
  const allAttachments: FileAttachment[] = [];
  if (currentPost.attachments && currentPost.attachments.length > 0) {
    allAttachments.push(...currentPost.attachments);
  } else if (currentPost.fileAttachment) {
    allAttachments.push(currentPost.fileAttachment);
  }

  return (
    <>
      <div
        className={`relative rounded-2xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md ${cardColorClass} flex flex-col justify-between`}
      >
        {/* 상단 핀 & 작성자 & 수정/삭제 버튼 */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentPost.pinned && (
                <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  <Pin className="w-3 h-3 fill-current rotate-45" />
                  <span>공지</span>
                </span>
              )}
              <span className="font-bold text-xs text-slate-800">{currentPost.authorName}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                  currentPost.authorRole === 'teacher'
                    ? 'bg-blue-600 text-white'
                    : 'bg-black/10 text-slate-700'
                }`}
              >
                {currentPost.authorRole === 'teacher' ? '선생님' : '학생'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-medium mr-1">
                {currentPost.updatedAt || currentPost.createdAt}
              </span>

              {/* 연필 수정 버튼 */}
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditModal(true);
                  }}
                  className="p-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white transition shadow-xs"
                  title="내용 수정하기"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {/* 삭제 버튼 */}
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(currentPost.id);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  title="삭제하기"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 제목 (긴 URL이나 단어도 박스를 넘어가지 않고 자동 줄바꿈) */}
          {currentPost.title && (
            <h4 className="font-bold text-sm text-slate-900 mb-1.5 leading-snug break-all [overflow-wrap:anywhere]">
              {currentPost.title}
            </h4>
          )}

          {/* 본문 */}
          {currentPost.content && (
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed break-all [overflow-wrap:anywhere]">
              {currentPost.content}
            </p>
          )}

          {/* 🔥 다중 첨부 파일 다운로드 목록 (한글, PDF, 워드, PPT 등) */}
          {allAttachments.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {allAttachments.map((file, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 transition flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate text-left">
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        {file.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {file.size}
                      </div>
                    </div>
                  </div>

                  {/* 개별 파일 다운로드 버튼 */}
                  <a
                    href={file.dataUrl}
                    download={file.name}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shadow-xs shrink-0"
                    title={`${file.name} 다운로드`}
                  >
                    <Download className="w-3 h-3" />
                    <span>다운로드</span>
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* 첨부 이미지 (클릭 시 링크가 있으면 링크 새 탭 오픈, 없으면 원본 확대) */}
          {currentPost.imageUrl && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (currentPost.linkUrl) {
                  let url = currentPost.linkUrl.trim();
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                  }
                  window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                  setShowImageModal(true);
                }
              }}
              className="mt-3 relative overflow-hidden rounded-xl border border-black/10 shadow-xs cursor-pointer group"
              title={
                currentPost.linkUrl
                  ? `클릭하여 새 탭에서 링크 열기: ${currentPost.linkUrl}`
                  : '클릭하여 이미지 크게 보기'
              }
            >
              <img
                src={currentPost.imageUrl}
                alt="첨부 이미지"
                className="w-full max-h-56 object-cover group-hover:scale-105 transition duration-300"
              />

              {/* 링크가 연결되어 있는 경우 새 탭 이동 힌트 오버레이 */}
              {currentPost.linkUrl && (
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 shadow-md transition group-hover:scale-105">
                  <ExternalLink className="w-3 h-3 text-sky-300" />
                  <span>새 창 열기</span>
                </div>
              )}
            </div>
          )}

          {/* 첨부 링크 */}
          {currentPost.linkUrl && (
            <a
              href={
                currentPost.linkUrl.startsWith('http://') || currentPost.linkUrl.startsWith('https://')
                  ? currentPost.linkUrl
                  : `https://${currentPost.linkUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[11px] text-blue-700 font-medium truncate transition"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{currentPost.linkUrl}</span>
            </a>
          )}
        </div>

        {/* 하단 반응 및 댓글 바 */}
        <div className="mt-4 pt-3 border-t border-black/10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {allowReactions && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleReaction('like')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 hover:bg-white text-[11px] font-bold text-slate-700 transition"
                  title="좋아요"
                >
                  <ThumbsUp className="w-3 h-3 text-blue-600" />
                  <span>{reactions.like || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReaction('heart')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 hover:bg-white text-[11px] font-bold text-slate-700 transition"
                  title="멋져요"
                >
                  <Heart className="w-3 h-3 text-rose-500 fill-current" />
                  <span>{reactions.heart || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReaction('insight')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5 hover:bg-white text-[11px] font-bold text-slate-700 transition"
                  title="좋은 생각"
                >
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  <span>{reactions.insight || 0}</span>
                </button>
              </div>
            )}

            {allowComments && (
              <button
                type="button"
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition ml-auto"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>댓글 {comments.length}개</span>
              </button>
            )}
          </div>

          {/* 댓글 목록 */}
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

      {/* 이미지 확대 모달 */}
      {showImageModal && currentPost.imageUrl && (
        <div
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[90vh] p-2">
            <img
              src={currentPost.imageUrl}
              alt="확대 이미지"
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl mx-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* 🔥 통합 PostModal (수정 모드 - 생성하기와 100% 동일한 넓고 쾌적한 UI!) */}
      {showEditModal && (
        <PostModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          mode="edit"
          boardId={currentPost.boardId}
          currentUser={currentUser}
          post={currentPost}
          columns={columns}
          onUpdated={(updated) => {
            setCurrentPost(updated);
            if (onUpdated) onUpdated(updated);
          }}
        />
      )}
    </>
  );
}
