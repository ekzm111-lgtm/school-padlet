'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  ArrowUpDown,
  Maximize2,
  MoreVertical,
} from 'lucide-react';
import { Post, User, FileAttachment, PostComment } from '@/lib/types';
import { getStoreData, saveStoreData, getMyPostIds, getMyCommentIds, addMyCommentId } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saveRemotePost } from '@/lib/supabaseStore';
import PostModal from './PostModal';
import PostDetailModal from './PostDetailModal';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  columns?: string[];
  allowComments?: boolean;
  allowReactions?: boolean;
  onDelete: (postId: string) => void;
  onUpdated?: (updated: Post) => void;
  onMoveUp?: (postId: string) => void;
  onMoveDown?: (postId: string) => void;
  onMoveToTop?: (postId: string) => void;
  onMoveToBottom?: (postId: string) => void;
  onMoveToColumn?: (postId: string, targetCol: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  layoutMode?: 'kanban' | 'grid' | 'canvas';
}

function formatPostDate(dateStr?: string | number): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (str.includes('전') || str.includes('초') || str.includes('방금')) {
    return str;
  }
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60 && diffSec >= -30) {
      return '방금 전';
    }
    if (diffMin < 60 && diffMin > 0) {
      return `${diffMin}분 전`;
    }
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    if (
      diffHours < 24 &&
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return `오늘 ${h}:${m}`;
    }
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (date.getFullYear() === now.getFullYear()) {
      return `${month}월 ${day}일 ${h}:${m}`;
    }
    return `${date.getFullYear()}.${month}.${day}`;
  } catch (e) {
    return '';
  }
}

export default function PostCard({
  post,
  currentUser,
  columns = [],
  allowComments = true,
  allowReactions = true,
  onDelete,
  onUpdated,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  onMoveToColumn,
  canMoveUp = false,
  canMoveDown = false,
  layoutMode = 'kanban',
}: PostCardProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const [commentInput, setCommentInput] = useState('');
  const [reactions, setReactions] = useState(post?.reactions || { like: 0, clap: 0, heart: 0, insight: 0 });
  const [comments, setComments] = useState(post?.comments || []);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // 더보기 메뉴 외부 클릭 감지
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = () => setShowMoreMenu(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  // 첨부 이미지 또는 링크 기반 대표 썸네일 자동 계산 (유튜브, GitHub 등 링크만 있어도 카드가 썸네일 자동 렌더링!)
  const cardImage = useMemo(() => {
    if (currentPost.imageUrl) return currentPost.imageUrl;
    if (currentPost.linkUrl) {
      const url = currentPost.linkUrl.trim();
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
          const u = new URL(url.startsWith('http') ? url : 'https://' + url);
          let videoId = '';
          if (u.hostname.includes('youtu.be')) {
            videoId = u.pathname.replace(/^\//, '').split(/[?#]/)[0];
          } else if (u.pathname.startsWith('/shorts/')) {
            videoId = u.pathname.replace('/shorts/', '').split(/[/?#]/)[0];
          } else {
            videoId = u.searchParams.get('v') || '';
          }
          if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        } catch (e) {}
      } else if (url.includes('github.com')) {
        try {
          const u = new URL(url.startsWith('http') ? url : 'https://' + url);
          const parts = u.pathname.split('/').filter(Boolean);
          if (parts.length >= 2) return `https://opengraph.githubassets.com/1/${parts[0]}/${parts[1]}`;
        } catch (e) {}
      } else if (url.includes('google.com/search') || url.includes('google.co.kr/search')) {
        return 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=800&auto=format&fit=crop&q=80';
      } else if (url.includes('coupang.com')) {
        return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
      }
    }
    return null;
  }, [currentPost.imageUrl, currentPost.linkUrl]);

  // 글 내용 클립보드 복사 함수
  const handleCopyContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const parts = [currentPost.title, displayContent, currentPost.linkUrl].filter(Boolean);
    const fullText = parts.join('\n\n');
    if (!fullText) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(() => {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // 부모로부터 새 post 데이터가 내려왔을 때(실시간 동기화 등), 수정 모달이 열려있지 않은 동안에는 최신 내용으로 동기화
  useEffect(() => {
    if (!showEditModal && post) {
      setCurrentPost(post);
      setReactions(post.reactions || { like: 0, clap: 0, heart: 0, insight: 0 });
      setComments(post.comments || []);
    }
  }, [post, showEditModal]);

  if (!currentPost) return null;

  const handleReaction = async (type: 'like' | 'clap' | 'heart' | 'insight') => {
    if (!allowReactions) return;
    const newReactions = {
      ...reactions,
      [type]: (reactions[type] || 0) + 1,
    };
    setReactions(newReactions);

    const updatedPost: Post = {
      ...currentPost,
      reactions: newReactions,
    };
    setCurrentPost(updatedPost);

    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === currentPost.id ? updatedPost : p
    );
    saveStoreData.posts(updatedPosts);

    if (onUpdated) {
      onUpdated(updatedPost);
    }

    if (isSupabaseConfigured) {
      saveRemotePost(updatedPost).catch(() => {});
    }

    try {
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.7 },
      });
    } catch (e) {}
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const commentId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newComment: PostComment = {
      id: commentId,
      postId: currentPost.id,
      authorName: currentUser?.name || '익명 참여자',
      authorId: currentUser?.id,
      content: commentInput.trim(),
      createdAt: '방금 전',
    };

    addMyCommentId(commentId);
    const newComments = [...comments, newComment];
    setComments(newComments);
    setCommentInput('');

    const updatedPost: Post = {
      ...currentPost,
      comments: newComments,
    };
    setCurrentPost(updatedPost);

    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === currentPost.id ? updatedPost : p
    );
    saveStoreData.posts(updatedPosts);

    if (onUpdated) {
      onUpdated(updatedPost);
    }

    if (isSupabaseConfigured) {
      await saveRemotePost(updatedPost);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;

    const newComments = comments.map((c) =>
      c.id === commentId
        ? {
            ...c,
            content: editCommentText.trim(),
            updatedAt: '방금 전 (수정됨)',
          }
        : c
    );
    setComments(newComments);
    setEditingCommentId(null);
    setEditCommentText('');

    const updatedPost: Post = {
      ...currentPost,
      comments: newComments,
    };
    setCurrentPost(updatedPost);

    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === currentPost.id ? updatedPost : p
    );
    saveStoreData.posts(updatedPosts);

    if (onUpdated) {
      onUpdated(updatedPost);
    }

    if (isSupabaseConfigured) {
      await saveRemotePost(updatedPost);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('댓글을 삭제하시겠습니까?')) return;
    const newComments = comments.filter((c) => c.id !== commentId);
    setComments(newComments);
    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditCommentText('');
    }

    const updatedPost: Post = {
      ...currentPost,
      comments: newComments,
    };
    setCurrentPost(updatedPost);

    const data = getStoreData();
    const updatedPosts = data.posts.map((p) =>
      p.id === currentPost.id ? updatedPost : p
    );
    saveStoreData.posts(updatedPosts);

    if (onUpdated) {
      onUpdated(updatedPost);
    }

    if (isSupabaseConfigured) {
      await saveRemotePost(updatedPost);
    }
  };

  const myPostIds = getMyPostIds();
  const isAuthor =
    (currentUser && currentUser.id === currentPost.authorId) ||
    (currentUser && currentUser.name === currentPost.authorName) ||
    myPostIds.includes(currentPost.id);

  // 게시물 수정 권한: 최고 관리자(admin) 또는 작성자 본인(isAuthor)만 가능!
  // 다른 사람이 작성한 게시물은 교사라도 임의로 수정 불가
  const canEdit =
    currentUser?.role === 'admin' ||
    isAuthor;

  // 게시물 삭제 권한: 최고 관리자(admin) 또는 작성자 본인(isAuthor)만 가능!
  const canDelete =
    currentUser?.role === 'admin' ||
    isAuthor;

  const isStickyNote = layoutMode === 'grid' || layoutMode === 'canvas';

  const cardColorClass = {
    white: isStickyNote ? 'bg-amber-50/95 border-amber-200/90 shadow-[2px_5px_15px_rgba(0,0,0,0.06)]' : 'card-color-white',
    yellow: isStickyNote ? 'bg-yellow-100/95 border-yellow-300 shadow-[2px_5px_15px_rgba(234,179,8,0.15)]' : 'card-color-yellow',
    pink: isStickyNote ? 'bg-pink-100/95 border-pink-300 shadow-[2px_5px_15px_rgba(244,114,182,0.15)]' : 'card-color-pink',
    blue: isStickyNote ? 'bg-sky-100/95 border-sky-300 shadow-[2px_5px_15px_rgba(56,189,248,0.15)]' : 'card-color-blue',
    green: isStickyNote ? 'bg-emerald-100/95 border-emerald-300 shadow-[2px_5px_15px_rgba(52,211,153,0.15)]' : 'card-color-green',
    purple: isStickyNote ? 'bg-purple-100/95 border-purple-300 shadow-[2px_5px_15px_rgba(192,132,252,0.15)]' : 'card-color-purple',
  }[currentPost.color || 'white'] || 'card-color-white';

  // 첨부 파일 목록 취합 (다중 파일 + 단일 파일 호환 + 클라우드 메타데이터 복원)
  const formattedDate = formatPostDate(currentPost.updatedAt || currentPost.createdAt);
  let displayContent = currentPost.content || '';
  const allAttachments: FileAttachment[] = [];
  if (currentPost.attachments && currentPost.attachments.length > 0) {
    allAttachments.push(...currentPost.attachments);
  } else if (currentPost.fileAttachment) {
    allAttachments.push(currentPost.fileAttachment);
  }

  if (displayContent.includes('<!--SCHOOLPAD_META:')) {
    const metaMatch = displayContent.match(/<!--SCHOOLPAD_META:([\s\S]*?)-->/);
    if (metaMatch && metaMatch[1]) {
      try {
        const parsed = JSON.parse(metaMatch[1]);
        if (Array.isArray(parsed.attachments) && allAttachments.length === 0) {
          allAttachments.push(...parsed.attachments);
        }
      } catch (e) {}
    }
    displayContent = displayContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();
  }

  return (
    <>
      <div
        className={`relative rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 hover:shadow-md ${cardColorClass} flex flex-col justify-between ${
          isStickyNote ? 'hover:-translate-y-1' : ''
        }`}
      >
        {/* 그리드 및 자유 드래그에서 아기자기한 마스킹 테이프 그래픽 효과 */}
        {isStickyNote && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-3 bg-amber-200/70 backdrop-blur-xs border-y border-amber-300/40 shadow-2xs rotate-[-1deg] rounded-xs pointer-events-none z-10" />
        )}

        {/* 상단 핀 & 작성자 & 작성일시 & 단정한 더보기 메뉴 */}
        <div className="mb-2">
          <div className="flex items-start justify-between gap-1.5 min-w-0">
            {/* 작성자 정보 & 뱃지 (가로 폭 100% 확보하여 학생 이름 찌그러짐 원천 해결!) */}
            <div className="flex flex-col min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {currentPost.pinned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
                    <Pin className="w-2.5 h-2.5 fill-current rotate-45" />
                    <span>공지</span>
                  </span>
                )}
                <span
                  className="font-bold text-xs sm:text-[13px] text-slate-800 break-words leading-snug"
                  title={currentPost.authorName || '작성자'}
                >
                  {currentPost.authorName || '작성자'}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                    currentPost.authorRole === 'teacher'
                      ? 'bg-blue-600 text-white'
                      : 'bg-black/10 text-slate-700'
                  }`}
                >
                  {currentPost.authorRole === 'teacher' ? '선생님' : '학생'}
                </span>
              </div>

              {/* 작성 시간 */}
              {formattedDate && (
                <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium mt-0.5 select-none truncate">
                  {formattedDate}
                </span>
              )}
            </div>

            {/* 오른쪽: 단정한 더보기 (···) 버튼 1개만 배치하여 이름 영역을 넓게 보호! (모바일 터치 영역 32px 확보) */}
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className={`min-w-[32px] min-h-[32px] p-1.5 flex items-center justify-center rounded-xl transition ${
                  showMoreMenu
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                }`}
                title="카드 메뉴 (수정, 복사, 순서 이동, 삭제)"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* 더보기 팝업 드롭다운 */}
              {showMoreMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-8 z-50 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150"
                >
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowEditModal(true);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center gap-2 font-bold transition"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      <span>내용 수정</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      setShowMoreMenu(false);
                      handleCopyContent(e);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{copiedText ? '복사 완료!' : '글 전체 복사'}</span>
                  </button>

                  {/* 순서 이동 (위/아래) */}
                  {(canMoveUp || canMoveDown) && (
                    <div className="border-t border-slate-100 my-1 pt-1">
                      {canMoveUp && onMoveUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            onMoveUp(currentPost.id);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          <span>위로 한 칸 이동</span>
                        </button>
                      )}
                      {canMoveDown && onMoveDown && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            onMoveDown(currentPost.id);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                          <span>아래로 한 칸 이동</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* 다른 모둠으로 이동 */}
                  {columns.filter((c) => c !== (currentPost.column || columns[0])).length > 0 && onMoveToColumn && (
                    <div className="border-t border-slate-100 my-1 pt-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400">
                        다른 모둠으로 이동
                      </div>
                      {columns
                        .filter((c) => c !== (currentPost.column || columns[0]))
                        .map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              setShowMoreMenu(false);
                              onMoveToColumn(currentPost.id, col);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 truncate"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">{col}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {canDelete && (
                    <div className="border-t border-slate-100 my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onDelete(currentPost.id);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>카드 삭제</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 제목 (클릭 시 패들렛 공식 뷰어 스타일의 상세 팝업 오픈) */}
          {currentPost.title && (
            <h4
              onClick={() => setShowDetailModal(true)}
              className="font-bold text-xs sm:text-sm text-slate-900 mb-1 leading-snug break-words [word-break:keep-all] cursor-pointer hover:text-blue-600 transition tracking-tight group/title flex items-center justify-between gap-1 select-text"
              title="클릭하여 상세 보기"
            >
              <span>{currentPost.title}</span>
              <Maximize2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/title:opacity-100 transition shrink-0" />
            </h4>
          )}

          {/* 본문 (2줄로 축소 표시 + 자세히 보기 버튼 지원으로 열 높이 균일화) */}
          {displayContent && (
            <div className="space-y-1">
              <p
                onClick={() => setShowDetailModal(true)}
                className="text-[11px] sm:text-xs text-slate-700 whitespace-pre-wrap leading-relaxed break-words [word-break:keep-all] select-text cursor-pointer line-clamp-2 hover:text-slate-900 transition"
                title="클릭하여 전체 내용 보기"
              >
                {displayContent}
              </p>
              {(displayContent.length > 60 || displayContent.includes('\n')) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailModal(true);
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 pt-0.5"
                >
                  <span>자세히 보기</span>
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          {/* 🔥 다중 첨부 파일 다운로드 목록 (한글, PDF, 워드, PPT 등) */}
          {allAttachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {allAttachments.map((file, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 transition flex items-center justify-between gap-1.5"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      <FileText className="w-2.5 h-2.5" />
                    </div>
                    <div className="truncate text-left">
                      <div className="text-[10px] font-bold text-slate-800 truncate">
                        {file.name}
                      </div>
                      <div className="text-[8px] text-slate-500 font-mono">
                        {file.size}
                      </div>
                    </div>
                  </div>

                  {/* 개별 파일 다운로드 버튼 */}
                  <a
                    href={file.dataUrl}
                    download={file.name}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition shadow-xs shrink-0"
                    title={`${file.name} 다운로드`}
                  >
                    <Download className="w-2.5 h-2.5" />
                    <span>다운</span>
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* 첨부 이미지 (또는 링크로부터 자동 추출된 썸네일) - 클릭 시 패들렛 상세 팝업 오픈 */}
          {cardImage && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowDetailModal(true);
              }}
              className={`mt-2 relative w-full overflow-hidden rounded-xl border border-black/10 shadow-xs cursor-pointer group ${
                currentPost.boardId === 'board-useful-school-links' ? 'bg-white' : 'bg-black/5'
              }`}
              title="클릭하여 상세 모달에서 보기 (동영상 재생 및 전체 내용)"
            >
              <img
                src={cardImage}
                alt="대표 이미지"
                className={`w-full aspect-video ${
                  currentPost.boardId === 'board-useful-school-links'
                    ? 'object-contain p-0.5 bg-white'
                    : 'object-cover'
                } group-hover:scale-105 transition-all duration-300 block`}
              />
              {/* 유튜브 또는 외부 링크가 있을 때 우측 상단 새 탭 열기 버튼 */}
              {currentPost.linkUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    let url = currentPost.linkUrl!.trim();
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = 'https://' + url;
                    }
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 shadow-sm"
                  title="새 탭에서 바로 링크 열기"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* 첨부 링크 (구글 드라이브 특별 디자인 적용) */}
          {currentPost.linkUrl && (() => {
            const isGoogleDrive =
              currentPost.linkUrl.includes('drive.google.com') ||
              currentPost.linkUrl.includes('docs.google.com');
            return (
              <a
                href={
                  currentPost.linkUrl.startsWith('http://') || currentPost.linkUrl.startsWith('https://')
                    ? currentPost.linkUrl
                    : `https://${currentPost.linkUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`mt-2 flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition shadow-xs ${
                  isGoogleDrive
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                    : 'bg-black/5 hover:bg-black/10 text-blue-700'
                }`}
                title={currentPost.linkUrl}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isGoogleDrive ? (
                    <>
                      <span className="text-sm">📁</span>
                      <span className="truncate">구글 드라이브 자료 열기</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{currentPost.linkUrl}</span>
                    </>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
              </a>
            );
          })()}
        </div>

        {/* 하단 반응 및 댓글 바 */}
        <div className="mt-2 pt-1.5 border-t border-black/10">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {allowReactions && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleReaction('like')}
                  className="flex items-center gap-1 min-h-[30px] px-2.5 py-1 rounded-full bg-black/5 hover:bg-white active:scale-95 text-xs font-bold text-slate-700 transition shadow-2xs"
                  title="좋아요"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>{reactions.like || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReaction('heart')}
                  className="flex items-center gap-1 min-h-[30px] px-2.5 py-1 rounded-full bg-black/5 hover:bg-white active:scale-95 text-xs font-bold text-slate-700 transition shadow-2xs"
                  title="멋져요"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                  <span>{reactions.heart || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReaction('insight')}
                  className="flex items-center gap-1 min-h-[30px] px-2.5 py-1 rounded-full bg-black/5 hover:bg-white active:scale-95 text-xs font-bold text-slate-700 transition shadow-2xs"
                  title="좋은 생각"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>{reactions.insight || 0}</span>
                </button>
              </div>
            )}

            {allowComments && (
              <button
                type="button"
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-600 hover:text-slate-900 transition ml-auto"
              >
                <MessageCircle className="w-3 h-3" />
                <span>댓글 {comments.length}개</span>
              </button>
            )}
          </div>

          {/* 댓글 목록 */}
          {showComments && allowComments && (
            <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
              {comments.map((c) => {
                const myCommentIds = getMyCommentIds();
                const isMyComment =
                  (currentUser && c.authorId && currentUser.id === c.authorId) ||
                  (currentUser && currentUser.name === c.authorName) ||
                  myCommentIds.includes(c.id);

                const canEditThisComment =
                  currentUser?.role === 'admin' ||
                  isMyComment;

                const canDeleteThisComment =
                  currentUser?.role === 'admin' ||
                  isMyComment;

                const isEditing = editingCommentId === c.id;

                return (
                  <div key={c.id} className="bg-white/95 p-2 sm:p-2.5 rounded-xl text-xs space-y-1.5 group/comment relative border border-slate-200/80 shadow-2xs">
                    {/* 댓글 헤더: 좁은 화면에서도 어색하게 꺾이지 않도록 작성자명(1행) + 시간(2행)/버튼으로 깔끔하게 정렬 */}
                    <div className="flex items-start justify-between gap-1 leading-tight">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 text-[11px] block truncate [word-break:keep-all]" title={c.authorName}>
                          {c.authorName}
                        </span>
                        <span className="text-[9px] text-slate-400 block whitespace-nowrap mt-0.5">
                          {c.updatedAt || c.createdAt}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover/comment:opacity-100 transition">
                        {canEditThisComment && !isEditing && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCommentId(c.id);
                              setEditCommentText(c.content);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition"
                            title="댓글 수정"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {canDeleteThisComment && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteComment(c.id);
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition"
                            title="댓글 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="pt-1 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleUpdateComment(c.id);
                            } else if (e.key === 'Escape') {
                              setEditingCommentId(null);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                          placeholder="수정할 댓글 내용을 입력하세요..."
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-200 transition"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateComment(c.id)}
                            className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs"
                          >
                            수정 완료
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] sm:text-xs text-slate-800 font-normal whitespace-pre-wrap leading-relaxed break-words [word-break:keep-all] select-text">
                        {c.content}
                      </p>
                    )}
                  </div>
                );
              })}

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

      {/* 패들렛 공식 뷰어 스타일: 상세 팝업 모달 (유튜브 플레이어 + 전체 내용 + 링크) */}
      {showDetailModal && (
        <PostDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          post={currentPost}
          currentUser={currentUser}
          onReaction={handleReaction}
          onEdit={() => setShowEditModal(true)}
          canEdit={canEdit}
        />
      )}

      {/* 이미지 확대 모달 */}
      {showImageModal && cardImage && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[90vh] p-2">
            <img
              src={cardImage}
              alt="확대 이미지"
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl mx-auto object-contain"
            />
          </div>
        </div>,
        document.body
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
