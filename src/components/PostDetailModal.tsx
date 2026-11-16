'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  Download,
  FileText,
  ThumbsUp,
  Heart,
  Lightbulb,
  MessageSquare,
  Pin,
  Pencil,
  Play,
} from 'lucide-react';
import { Post, User, FileAttachment } from '@/lib/types';

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  currentUser: User | null;
  onReaction?: (type: 'like' | 'clap' | 'heart' | 'insight') => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function PostDetailModal({
  isOpen,
  onClose,
  post,
  currentUser,
  onReaction,
  onEdit,
  canEdit,
}: PostDetailModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  // 유튜브 비디오 ID 추출
  const getYoutubeVideoId = (url?: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/\s]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = getYoutubeVideoId(post.linkUrl);

  // 본문 메타데이터 정제
  let cleanContent = post.content || '';
  cleanContent = cleanContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();

  // 첨부파일 추출
  const attachments: FileAttachment[] = [];
  if (post.attachments && post.attachments.length > 0) {
    attachments.push(...post.attachments);
  } else if (post.fileAttachment) {
    attachments.push(post.fileAttachment);
  }

  // 모달 렌더링
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* 모달 상단 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            {post.pinned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <Pin className="w-2.5 h-2.5 fill-current rotate-45" />
                <span>공지</span>
              </span>
            )}
            <span className="font-bold text-sm text-slate-800 truncate">
              {post.authorName || '작성자'}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                post.authorRole === 'teacher'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {post.authorRole === 'teacher' ? '선생님' : '학생'}
            </span>
            <span className="text-xs text-slate-400 font-normal truncate">
              {post.column && `• ${post.column}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
                title="카드 수정"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 스크롤 본문 */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* 1. 유튜브 영상 임베드 플레이어 또는 고화질 썸네일 */}
          {youtubeId ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-md bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0`}
                title={post.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : post.imageUrl ? (
            <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-96 flex items-center justify-center">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full max-h-96 object-contain rounded-2xl"
              />
            </div>
          ) : null}

          {/* 2. 게시글 제목 */}
          {post.title && (
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug break-words [word-break:keep-all]">
              {post.title}
            </h2>
          )}

          {/* 3. 전체 본문 내용 (줄바꿈 및 서식 완벽 보존) */}
          {cleanContent && (
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words [word-break:keep-all] select-text">
                {cleanContent}
              </p>
            </div>
          )}

          {/* 4. 링크 바로가기 버튼 */}
          {post.linkUrl && (
            <a
              href={post.linkUrl.startsWith('http') ? post.linkUrl : `https://${post.linkUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 transition text-blue-800 group"
            >
              <div className="flex items-center gap-2 truncate">
                <Play className="w-4 h-4 text-blue-600 shrink-0 fill-current" />
                <span className="text-xs font-bold truncate">{post.linkUrl}</span>
              </div>
              <span className="text-xs font-bold flex items-center gap-1 text-blue-600 group-hover:underline shrink-0">
                <span>새 탭에서 열기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          )}

          {/* 5. 첨부파일 목록 */}
          {attachments.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <h4 className="text-xs font-bold text-slate-700">첨부 파일</h4>
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 truncate">{file.name}</span>
                  </div>
                  <a
                    href={file.dataUrl}
                    download={file.name}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    <span>다운로드</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 모달 하단 반응 및 닫기 바 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onReaction && onReaction('like')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs"
            >
              <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
              <span>좋아요</span>
              <span className="text-blue-600 font-mono font-black">{post.reactions?.like || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => onReaction && onReaction('heart')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
              <span className="text-rose-500 font-mono font-black">{post.reactions?.heart || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => onReaction && onReaction('insight')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span className="text-amber-600 font-mono font-black">{post.reactions?.insight || 0}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
