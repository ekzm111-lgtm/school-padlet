'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  Send,
  Upload,
  ClipboardCheck,
  Sparkles,
  Columns,
  Paperclip,
  FileText,
  Save,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Post, User, FileAttachment } from '@/lib/types';
import { getStoreData, saveStoreData, addMyPostId } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saveRemotePost } from '@/lib/supabaseStore';
import confetti from 'canvas-confetti';

// 클라이언트 측 Canvas 기반 이미지 압축 (최대 1280px, JPEG 0.75)
function compressImageDataUrl(dataUrl: string, maxDim = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    // 이미 150KB 이하면 압축 불필요
    if (dataUrl.length < 150000) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  boardId: string;
  currentUser: User | null;
  post?: Post; // 수정 시 전달
  defaultColumn?: string;
  columns?: string[];
  onCreated?: (newPost: Post, newColumnName?: string) => void;
  onUpdated?: (updatedPost: Post) => void;
}

export default function PostModal({
  isOpen,
  onClose,
  mode,
  boardId,
  currentUser,
  post,
  defaultColumn,
  columns = [],
  onCreated,
  onUpdated,
}: PostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<Post['color']>('white');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  
  // 🔥 복수 파일 첨부 상태
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  // 모둠 선택 또는 새 모둠 직접 생성
  const [selectedColumn, setSelectedColumn] = useState('');
  const [isCreatingNewColumn, setIsCreatingNewColumn] = useState(false);
  const [newColumnInput, setNewColumnInput] = useState('');

  const [showImageTools, setShowImageTools] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const [fileError, setFileError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [autoPreviewLoaded, setAutoPreviewLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const prevIsOpenRef = useRef(false);

  // 모달이 처음 열릴 때(false -> true)에만 데이터 초기화!
  // 모달이 열려있는 동안 부모 컴포넌트의 리렌더링이나 폴링으로 인해 사용자가 작성 중인 내용(링크, 제목, 본문 등)이 절대 지워지지 않음!
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    // 이미 열려있는 상태라면 부모의 props 변경으로 인한 덮어쓰기/리셋 방지
    if (prevIsOpenRef.current) return;
    prevIsOpenRef.current = true;

    if (mode === 'edit' && post) {
      setTitle(post.title || '');
      let cleanContent = post.content || '';
      const existingFiles: FileAttachment[] = [];
      if (post.attachments && post.attachments.length > 0) {
        existingFiles.push(...post.attachments);
      } else if (post.fileAttachment) {
        existingFiles.push(post.fileAttachment);
      }
      if (cleanContent.includes('<!--SCHOOLPAD_META:')) {
        const metaMatch = cleanContent.match(/<!--SCHOOLPAD_META:([\s\S]*?)-->/);
        if (metaMatch && metaMatch[1]) {
          try {
            const parsed = JSON.parse(metaMatch[1]);
            if (Array.isArray(parsed.attachments) && existingFiles.length === 0) {
              existingFiles.push(...parsed.attachments);
            }
          } catch (e) {}
        }
        cleanContent = cleanContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();
      }
      setContent(cleanContent);
      setColor(post.color || 'white');
      setImageUrl(post.imageUrl || '');
      setLinkUrl(post.linkUrl || '');
      setCustomAuthor(post.authorName || '');
      setSelectedColumn(post.column || defaultColumn || columns[0] || '모둠 1');
      setAttachments(existingFiles);
      if (post.imageUrl) setShowImageTools(true);
    } else {
      // 생성 모드
      setTitle('');
      setContent('');
      setColor('white');
      setImageUrl('');
      setLinkUrl('');
      setCustomAuthor(currentUser?.name || '');
      setSelectedColumn(defaultColumn || columns[0] || '모둠 1');
      setAttachments([]);
      setShowImageTools(false);
    }
    setFileError('');
    setIsCreatingNewColumn(false);
    setNewColumnInput('');
    setIsFetchingPreview(false);
    setAutoPreviewLoaded(false);
  }, [isOpen, mode, post, defaultColumn, columns, currentUser]);

  // 링크(URL)의 대표 이미지(OpenGraph, 유튜브 썸네일 등) 및 제목 자동 추출 함수
  const fetchLinkPreview = async (
    url: string
  ): Promise<{ imageUrl: string | null; title: string | null }> => {
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) return { imageUrl: null, title: null };
      const data = await res.json();
      return {
        imageUrl: data && data.ok && data.imageUrl ? (data.imageUrl as string) : null,
        title: data && data.ok && data.title ? (data.title as string) : null,
      };
    } catch {
      return { imageUrl: null, title: null };
    }
  };

  // 본문(content)에 링크 주소를 붙여넣었을 때도 자동으로 참고 링크(URL)로 연결
  useEffect(() => {
    if (linkUrl.trim() || !content.trim()) return;
    const urlMatch = content.match(/https?:\/\/[^\s]+/i);
    if (urlMatch && urlMatch[0]) {
      setLinkUrl(urlMatch[0].trim());
    }
  }, [content, linkUrl]);

  // 사용자가 링크를 입력하거나 붙여넣었을 때 대표 이미지와 제목을 패들렛처럼 자동으로 감지
  useEffect(() => {
    if (!linkUrl.trim()) {
      setAutoPreviewLoaded(false);
      return;
    }
    const trimmed = linkUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.includes('.')) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingPreview(true);
      try {
        const preview = await fetchLinkPreview(trimmed);
        if (preview.imageUrl && !imageUrl) {
          setImageUrl(preview.imageUrl);
          setShowImageTools(true);
          setAutoPreviewLoaded(true);
        }
        // 제목이 비어있다면 패들렛처럼 영상/웹페이지 제목을 자동 채우기
        if (preview.title && !title.trim()) {
          setTitle(preview.title);
        }
      } catch (err) {
        console.warn('Auto link preview error:', err);
      } finally {
        setIsFetchingPreview(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [linkUrl, imageUrl, title]);

  // 전역 어디서든 Ctrl+V 캡처 이미지 감지
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
            reader.onload = async (event) => {
              if (event.target?.result) {
                const rawUrl = event.target.result as string;
                const optimizedUrl = await compressImageDataUrl(rawUrl);
                setImageUrl(optimizedUrl);
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

  // 브라우저 밖 탐색기에서 파일을 창 아무 데나 떨어뜨렸을 때 브라우저가 새 탭으로 파일을 여는 현상 방지
  useEffect(() => {
    if (!isOpen) return;

    const preventGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    window.addEventListener('dragenter', preventGlobalDrop);
    window.addEventListener('dragover', preventGlobalDrop);
    window.addEventListener('drop', preventGlobalDrop);

    return () => {
      window.removeEventListener('dragenter', preventGlobalDrop);
      window.removeEventListener('dragover', preventGlobalDrop);
      window.removeEventListener('drop', preventGlobalDrop);
    };
  }, [isOpen]);

  // 🔥 다중 파일 처리 공통 함수 (Promise.all 및 Set 기반 중복 완전 박멸)
  const processFiles = async (fileList: FileList | File[]) => {
    setFileError('');
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const filesArray = Array.from(fileList);

    // 1차: 입력 단계에서 동일 파일 중복 필터링
    const uniqueFiles: File[] = [];
    const seen = new Set<string>();
    for (const f of filesArray) {
      const key = `${f.name}_${f.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFiles.push(f);
      }
    }

    // 2차: 비동기 파일 읽기를 Promise.all로 병렬 수행
    const readFilePromise = (file: File): Promise<FileAttachment | null> => {
      return new Promise((resolve) => {
        if (file.size > MAX_SIZE) {
          setFileError(`⚠️ '${file.name}' 파일이 10MB를 초과하여 제외되었습니다.`);
          resolve(null);
          return;
        }

        const formattedSize =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            let dataUrl = event.target.result as string;
            // 만약 이미지 파일인 경우 클라우드 및 브라우저 성능을 위해 압축 처리
            if (file.type.startsWith('image/')) {
              try {
                dataUrl = await compressImageDataUrl(dataUrl);
              } catch (e) {}
            }
            resolve({
              name: file.name,
              size: formattedSize,
              type: file.type || file.name.split('.').pop() || '',
              dataUrl: dataUrl,
            });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    };

    const results = await Promise.all(uniqueFiles.map(readFilePromise));
    const validNewAttachments = results.filter((r): r is FileAttachment => r !== null);

    // 3차: 단 한 번의 원자적(Atomic) 상태 업데이트로 React Race Condition 완벽 차단
    setAttachments((prev) => {
      const combined = [...prev];
      for (const newAtt of validNewAttachments) {
        if (!combined.some((item) => item.name === newAtt.name && item.size === newAtt.size)) {
          combined.push(newAtt);
        }
      }
      return combined;
    });

    // 드롭한 파일 중 이미지가 있고 대표 이미지가 비어있다면, 첫 번째 이미지를 대표 이미지로도 즉시 설정
    const firstImg = validNewAttachments.find(
      (a) => a.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name)
    );
    if (firstImg && !imageUrl) {
      setImageUrl(firstImg.dataUrl);
      setShowImageTools(true);
    }
  };

  // 탐색기 파일 드롭(Drop) 핸들러
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files: File[] = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const f = e.dataTransfer.files[i];
        if (f) files.push(f);
      }
    } else if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }

    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // 재선택 가능하도록 초기화
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // 중복 제출 원천 방지
    if (!content.trim() && !title.trim() && !imageUrl && attachments.length === 0 && !linkUrl.trim()) return;

    setIsSubmitting(true);

    let finalImageUrl = imageUrl.trim();
    let finalTitle = title.trim();

    // 링크는 입력했으나 대표 이미지가 아직 없는 경우 (붙여넣고 즉시 저장 누른 경우 포함)
    // 저장 직전에 대표 이미지 및 제목을 즉시 추출하여 카드에 함께 저장
    if ((!finalImageUrl || !finalTitle) && linkUrl.trim()) {
      try {
        const preview = await fetchLinkPreview(linkUrl.trim());
        if (preview.imageUrl && !finalImageUrl) {
          finalImageUrl = preview.imageUrl;
          setImageUrl(preview.imageUrl);
        }
        if (preview.title && !finalTitle) {
          finalTitle = preview.title;
          setTitle(preview.title);
        }
      } catch (err) {
        console.warn('저장 전 대표 이미지 추출 실패:', err);
      }
    }

    let finalColumn = selectedColumn;
    let createdColumnName: string | undefined = undefined;

    if (isCreatingNewColumn && newColumnInput.trim()) {
      finalColumn = newColumnInput.trim();
      createdColumnName = newColumnInput.trim();
    }

    try {
      if (mode === 'edit' && post) {
        // 수정 모드 저장
        const updated: Post = {
          ...post,
          title: finalTitle,
          content: content.trim(),
          color,
          imageUrl: finalImageUrl || undefined,
          linkUrl: linkUrl.trim() || undefined,
          column: finalColumn,
          attachments,
          fileAttachment: attachments[0] || undefined,
          authorName: customAuthor.trim() || post.authorName,
          updatedAt: new Date().toISOString(),
        };

        const data = getStoreData();
        saveStoreData.posts(data.posts.map((p) => (p.id === post.id ? updated : p)));
        if (isSupabaseConfigured) {
          await saveRemotePost(updated);
        }
        if (onUpdated) onUpdated(updated);
        onClose();
      } else {
        // 생성 모드 저장 (유니크 타임스탬프 + 랜덤 ID)
        const nowIso = new Date().toISOString();
        const data = getStoreData();
        // 해당 열의 기존 카드들 중 가장 작은 order보다 앞서도록 설정하여 항상 최상단 배치
        const existingInCol = data.posts.filter((p) => (p.column || '모둠 1') === finalColumn);
        const minOrder = existingInCol.reduce((min, p) => Math.min(min, typeof p.order === 'number' ? p.order : 0), 0);
        const newOrder = minOrder <= 0 ? minOrder - 1 : 0;

        const newPost: Post = {
          id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          boardId,
          title: finalTitle,
          content: content.trim(),
          color,
          imageUrl: finalImageUrl || undefined,
          linkUrl: linkUrl.trim() || undefined,
          attachments,
          fileAttachment: attachments[0] || undefined,
          authorName: customAuthor.trim() || currentUser?.name || '익명 참여자',
          authorRole: currentUser?.role || 'student',
          authorId: currentUser?.id || `anon-${Date.now()}`,
          reactions: { like: 0, clap: 0, heart: 0, insight: 0 },
          comments: [],
          column: finalColumn,
          order: newOrder,
          x: 30 + Math.random() * 200,
          y: 80 + Math.random() * 200,
          createdAt: nowIso,
        };

        saveStoreData.posts([newPost, ...data.posts]);
        if (isSupabaseConfigured) {
          const ok = await saveRemotePost(newPost);
          if (!ok) {
            console.warn('saveRemotePost initial attempt failed, queuing retry...');
            setTimeout(() => {
              saveRemotePost(newPost);
            }, 1000);
          }
        }
        addMyPostId(newPost.id);
        if (onCreated) onCreated(newPost, createdColumnName);

        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        } catch (err) {}

        onClose();
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setFileError('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themePresets = [
    { label: '🧪 과학 실험', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60' },
    { label: '📚 도서관/독서', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=60' },
    { label: '🎨 미술/예술', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=60' },
    { label: '🌱 자연과 환경', url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=60' },
    { label: '🚀 우주와 천문', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60' },
    { label: '💻 코딩과 로봇', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=60' },
  ];

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 cursor-default text-slate-800"
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-white rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border transition-all max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200 ${
          isDragOver ? 'border-blue-500 ring-4 ring-blue-100 scale-[1.01]' : 'border-slate-100'
        }`}
      >
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-xs">
              {mode === 'edit' ? <Save className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight truncate sm:whitespace-normal">
                {mode === 'edit' ? '카드 내용 및 학습자료 수정' : '새 메모 / 학습자료 작성'}
              </h3>
              <p className="text-[11px] text-slate-400">
                파일 드래그 앤 드롭 및 캡처(Ctrl+V)를 지원합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {pasteNotice && (
          <div className="mt-3 p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span>캡처한 이미지가 바로 첨부되었습니다!</span>
          </div>
        )}

        {fileError && (
          <div className="mt-3 p-2.5 bg-red-50 text-red-600 text-xs rounded-xl font-bold border border-red-100">
            {fileError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 모둠 선택 또는 새 모둠 생성 */}
          <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Columns className="w-4 h-4 text-blue-600" />
                <span>등록할 모둠(열) 선택</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewColumn(!isCreatingNewColumn)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
              >
                {isCreatingNewColumn ? '기존 모둠에서 선택' : '+ 새 모둠 직접 만들기'}
              </button>
            </div>

            {isCreatingNewColumn ? (
              <input
                type="text"
                required
                placeholder="새 모둠 이름 입력 (예: 4모둠 또는 보충자료방)"
                value={newColumnInput}
                onChange={(e) => setNewColumnInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-blue-300 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none bg-white focus:ring-2 focus:ring-blue-500"
              >
                {Array.from(new Set([...columns, defaultColumn, selectedColumn].filter(Boolean))).map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 작성자 이름 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">작성자 (이름 / 모둠명)</label>
            <input
              type="text"
              placeholder="예: 2모둠 이지은"
              value={customAuthor}
              onChange={(e) => setCustomAuthor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 제목 */}
          <div>
            <input
              type="text"
              placeholder="제목을 입력하세요 (예: 3단원 수업 요약 활동지)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 본문 */}
          <div>
            <textarea
              required={!imageUrl && attachments.length === 0}
              rows={3}
              placeholder="내용을 적어보세요... (화면 캡처 후 Ctrl+V 또는 파일을 화면으로 끌어다 놓으세요)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          {/* 🔗 참고 링크(URL) 및 웹사이트 주소 입력 (항상 열림) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <span>참고 링크(URL) / 웹사이트 주소</span>
              </label>
              {linkUrl && (
                <button
                  type="button"
                  onClick={() => setLinkUrl('')}
                  className="text-[11px] text-slate-400 hover:text-red-500 font-medium transition"
                >
                  지우기
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  placeholder="https://... (웹사이트, 유튜브, 노션, 구글 드라이브 등 모든 링크 가능)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none bg-white font-medium transition ${
                    linkUrl.includes('drive.google.com') || linkUrl.includes('docs.google.com')
                      ? 'border-emerald-500 ring-2 ring-emerald-200 text-emerald-950 font-bold'
                      : 'border-slate-200 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {(linkUrl.includes('drive.google.com') || linkUrl.includes('docs.google.com')) && (
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-white/90 px-1.5 rounded-md">
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>구글 드라이브 인식됨</span>
                  </span>
                )}
              </div>
              {linkUrl && (
                <button
                  type="button"
                  onClick={() => setLinkUrl('')}
                  className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition shrink-0"
                >
                  비우기
                </button>
              )}
            </div>

            {/* 링크 대표 이미지 자동 추출 상태 안내 */}
            {isFetchingPreview && (
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-100/70 px-3 py-2 rounded-xl border border-blue-200 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>링크의 대표 이미지(미리보기)를 자동으로 가져오는 중입니다...</span>
              </div>
            )}

            {!isFetchingPreview && autoPreviewLoaded && imageUrl && (
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>링크의 대표 이미지가 자동으로 적용되었습니다!</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setAutoPreviewLoaded(false);
                  }}
                  className="text-slate-500 hover:text-red-600 underline text-[11px] font-semibold"
                >
                  이미지 취소
                </button>
              </div>
            )}

            {/* 📁 구글 드라이브 자료 안내 & 원클릭 버튼 배너 */}
            <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <span className="text-base">📁</span>
                <div className="text-[11px] text-slate-600 leading-snug">
                  <strong>대용량 한글(HWP), PPT, 동영상 자료</strong>는 본인 구글 드라이브에 올린 뒤 공유 링크를 위 링크창에 넣어보세요!
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('https://drive.google.com', '_blank')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 text-xs font-bold transition flex items-center gap-1 shadow-xs shrink-0"
                title="새 창에서 내 구글 드라이브 열기"
              >
                <span>내 구글 드라이브 열기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 🔥 드래그 앤 드롭 파일 첨부 존 (여러 파일 지원) */}
          <div
            onClick={() => docFileInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
              setIsDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
            }}
            onDrop={handleDrop}
            className={`p-5 rounded-2xl border-2 border-dashed transition-all duration-150 cursor-pointer text-center select-none ${
              isDragOver
                ? 'border-blue-600 bg-blue-100/80 ring-4 ring-blue-200 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40'
            }`}
          >
            <input
              ref={docFileInputRef}
              type="file"
              multiple
              accept=".hwp,.hwpx,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.png,.jpg,.jpeg"
              onChange={handleDocFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-xs ${
                  isDragOver ? 'bg-blue-600 text-white scale-110' : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {isDragOver
                    ? '📂 마우스를 놓으면 파일이 바로 첨부됩니다!'
                    : '컴퓨터 파일을 이곳에 끌어다 놓으세요 (드래그 앤 드롭)'}
                </span>
                <span className="ml-1.5 text-xs font-bold text-blue-600 underline">
                  또는 클릭하여 파일 찾기
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                한글(HWP), PDF, 워드, PPT, 엑셀, 이미지 등 모든 파일 지원 (개당 최대 10MB)
              </p>
            </div>
          </div>

          {/* 첨부된 파일 목록 (리스트 형태로 다중 노출) */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span>첨부된 파일 목록 ({attachments.length}개)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-xs truncate"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="truncate text-left">
                        <div className="font-bold text-indigo-950 truncate">{file.name}</div>
                        <div className="text-[10px] text-indigo-600 font-mono">{file.size}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1 text-indigo-400 hover:text-red-600 rounded-lg transition shrink-0"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 대표 이미지 (웹 이미지 링크 주소 입력 + 수업 테마 선택) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>대표 이미지 (이미지 링크 주소 넣기 또는 테마)</span>
              </span>
              <span className="text-[10px] text-slate-400">화면 캡처 후 Ctrl+V 가능</span>
            </div>

            {/* 이미지 링크 주소 직접 입력 */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="이미지 링크(URL) 주소 직접 입력 (예: https://.../image.png)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              />
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition shrink-0"
                >
                  지우기
                </button>
              )}
            </div>

            {/* 첨부된 대표 이미지 미리보기 */}
            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 group max-h-56 bg-slate-100">
                <img
                  src={imageUrl}
                  alt="대표 이미지 미리보기"
                  className="w-full h-44 object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.opacity = '0.5';
                  }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-md font-bold">
                  이미지 미리보기
                </div>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition shadow-md"
                  title="이미지 삭제"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 학교 수업 테마 이미지 선택 (원클릭) */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-1.5">학교 수업 테마 이미지 선택:</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {themePresets.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setImageUrl(t.url)}
                    className={`p-1.5 rounded-lg border text-[10px] font-medium text-center truncate transition ${
                      imageUrl === t.url
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>



          {/* 색상 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">포스트잇 색상</label>
            <div className="flex items-center gap-2">
              {[
                { id: 'white', name: '흰색', bg: 'bg-white border-slate-300' },
                { id: 'yellow', name: '노랑', bg: 'bg-yellow-200 border-yellow-400' },
                { id: 'pink', name: '분홍', bg: 'bg-pink-200 border-pink-400' },
                { id: 'blue', name: '하늘', bg: 'bg-sky-200 border-sky-400' },
                { id: 'green', name: '연두', bg: 'bg-green-200 border-green-400' },
                { id: 'purple', name: '보라', bg: 'bg-purple-200 border-purple-400' },
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

          {/* 제출 버튼 */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
            >
              {mode === 'edit' ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>{mode === 'edit' ? '수정 완료' : '보드에 붙이기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
