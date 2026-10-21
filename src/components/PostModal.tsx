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
  Columns,
  Paperclip,
  FileText,
  Save,
  Trash2,
} from 'lucide-react';
import { Post, User, FileAttachment } from '@/lib/types';
import { getStoreData, saveStoreData, addMyPostId } from '@/lib/store';
import confetti from 'canvas-confetti';

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
  const [color, setColor] = useState<Post['color']>('yellow');
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
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const [fileError, setFileError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때 데이터 초기화 (생성 vs 수정 완벽 동기화)
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setColor(post.color || 'yellow');
      setImageUrl(post.imageUrl || '');
      setLinkUrl(post.linkUrl || '');
      setCustomAuthor(post.authorName || '');
      setSelectedColumn(post.column || defaultColumn || columns[0] || '모둠 1');
      // 기존 단일 파일과 복수 파일 통합
      const existingFiles: FileAttachment[] = [];
      if (post.attachments && post.attachments.length > 0) {
        existingFiles.push(...post.attachments);
      } else if (post.fileAttachment) {
        existingFiles.push(post.fileAttachment);
      }
      setAttachments(existingFiles);
      if (post.imageUrl) setShowImageTools(true);
      if (post.linkUrl) setShowLinkInput(true);
    } else {
      // 생성 모드
      setTitle('');
      setContent('');
      setColor('yellow');
      setImageUrl('');
      setLinkUrl('');
      setCustomAuthor(currentUser?.name || '');
      setSelectedColumn(defaultColumn || columns[0] || '모둠 1');
      setAttachments([]);
      setShowImageTools(false);
      setShowLinkInput(false);
    }
    setFileError('');
    setIsCreatingNewColumn(false);
    setNewColumnInput('');
  }, [isOpen, mode, post, defaultColumn, columns, currentUser]);

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

  // 🔥 다중 파일 처리 공통 함수 (드래그 드롭 & 파일 선택 모두 지원, 중복 방지)
  const processFiles = (fileList: FileList | File[]) => {
    setFileError('');
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const filesArray = Array.from(fileList);

    filesArray.forEach((file) => {
      if (file.size > MAX_SIZE) {
        setFileError(`⚠️ '${file.name}' 파일이 10MB를 초과하여 제외되었습니다.`);
        return;
      }

      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAtt: FileAttachment = {
            name: file.name,
            size: formattedSize,
            type: file.type || file.name.split('.').pop() || '',
            dataUrl: event.target.result as string,
          };
          // 파일 목록에 중복 방지 (같은 이름과 같은 크기면 1개만 유지)
          setAttachments((prev) => {
            if (prev.some((a) => a.name === newAtt.name && a.size === newAtt.size)) {
              return prev;
            }
            return [...prev, newAtt];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 탐색기 파일 드롭(Drop) 핸들러
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // 중복 제출 원천 방지
    if (!content.trim() && !title.trim() && !imageUrl && attachments.length === 0) return;

    setIsSubmitting(true);

    let finalColumn = selectedColumn;
    let createdColumnName: string | undefined = undefined;

    if (isCreatingNewColumn && newColumnInput.trim()) {
      finalColumn = newColumnInput.trim();
      createdColumnName = newColumnInput.trim();
    }

    if (mode === 'edit' && post) {
      // 수정 모드 저장
      const updated: Post = {
        ...post,
        title: title.trim(),
        content: content.trim(),
        color,
        imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        column: finalColumn,
        attachments,
        fileAttachment: attachments[0] || undefined,
        authorName: customAuthor.trim() || post.authorName,
        updatedAt: '방금 수정됨',
      };

      const data = getStoreData();
      saveStoreData.posts(data.posts.map((p) => (p.id === post.id ? updated : p)));
      if (onUpdated) onUpdated(updated);
      setIsSubmitting(false);
      onClose();
    } else {
      // 생성 모드 저장 (유니크 타임스탬프 + 랜덤 ID)
      const newPost: Post = {
        id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        boardId,
        title: title.trim(),
        content: content.trim(),
        color,
        imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        attachments,
        fileAttachment: attachments[0] || undefined,
        authorName: customAuthor.trim() || currentUser?.name || '익명 참여자',
        authorRole: currentUser?.role || 'student',
        authorId: currentUser?.id || `anon-${Date.now()}`,
        reactions: { like: 0, clap: 0, heart: 0, insight: 0 },
        comments: [],
        column: finalColumn,
        x: 30 + Math.random() * 200,
        y: 80 + Math.random() * 200,
        createdAt: '방금 전',
      };

      const data = getStoreData();
      saveStoreData.posts([newPost, ...data.posts]);
      addMyPostId(newPost.id);
      if (onCreated) onCreated(newPost, createdColumnName);

      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      } catch (err) {}

      setIsSubmitting(false);
      onClose();
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

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-default text-slate-800"
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {mode === 'edit' ? <Save className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {mode === 'edit' ? '카드 내용 및 학습자료 수정' : '새 메모 / 학습자료 작성'}
              </h3>
              <p className="text-[11px] text-slate-400">
                파일 드래그 앤 드롭 및 캡처(Ctrl+V)를 지원합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
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
                {columns.map((col) => (
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

          {/* 🔥 드래그 앤 드롭 파일 첨부 존 (여러 파일 지원) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`p-4 rounded-2xl border-2 border-dashed transition text-center ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
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
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  컴퓨터 파일을 이곳에 끌어다 놓거나(드래그 앤 드롭)
                </span>
                <button
                  type="button"
                  onClick={() => docFileInputRef.current?.click()}
                  className="ml-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  직접 파일 선택하기
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                한글(HWP), PDF, 워드, PPT, 엑셀, 이미지 등 여러 개를 한 번에 올릴 수 있습니다 (개당 최대 10MB)
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

          {/* 첨부된 대표 이미지 미리보기 */}
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

          {/* 이미지 도구 (프리셋 갤러리) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>학교 수업 테마 이미지 선택</span>
              </span>
              <span className="text-[10px] text-slate-400">화면 캡처 후 Ctrl+V 가능</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
              {themePresets.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setImageUrl(t.url)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 text-[10px] font-medium text-slate-700 text-center truncate transition"
                >
                  {t.label}
                </button>
              ))}
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">포스트잇 색상</label>
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
    </div>
  );
}
