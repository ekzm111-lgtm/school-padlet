import { supabase, isSupabaseConfigured } from './supabase';
import { Board, Post, User, FileAttachment } from './types';

// Supabase 테이블 데이터 <-> SchoolPad 로컬 타입 상호 변환기

export async function fetchRemoteBoards(): Promise<Board[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from('boards').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map((b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      description: b.description || '',
      layout: b.layout || 'kanban',
      theme: b.theme || 'blue',
      coverImageUrl: b.cover_image_url || '',
      customBgUrl: b.custom_bg_url || '',
      authorId: b.author_id,
      authorName: b.author_name,
      authorRole: b.author_role,
      columns: b.columns || ['모둠 1', '모둠 2', '모둠 3'],
      allowStudentPost: b.allow_student_post !== false,
      allowComments: b.allow_comments !== false,
      allowReactions: b.allow_reactions !== false,
      isLocked: Boolean(b.is_locked),
      isPublic: b.is_public !== false,
      category: b.category || '수업자료',
      createdAt: b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : '',
    }));
  } catch (e) {
    console.error('fetchRemoteBoards error', e);
    return null;
  }
}

export async function saveRemoteBoard(board: Board): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('boards').upsert({
      id: board.id,
      code: board.code,
      title: board.title,
      description: board.description,
      layout: board.layout || 'kanban',
      theme: board.theme || 'blue',
      cover_image_url: board.coverImageUrl || '',
      custom_bg_url: board.customBgUrl || '',
      author_id: board.authorId,
      author_name: board.authorName,
      author_role: board.authorRole,
      columns: board.columns,
      allow_student_post: board.allowStudentPost,
      allow_comments: board.allowComments,
      allow_reactions: board.allowReactions,
      is_locked: board.isLocked,
      is_public: board.isPublic,
      category: board.category,
    });
    return !error;
  } catch (e) {
    console.error('saveRemoteBoard error', e);
    return false;
  }
}

export async function deleteRemoteBoard(boardId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('boards').delete().eq('id', boardId);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function fetchRemotePosts(boardId?: string): Promise<Post[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (boardId) {
      query = query.eq('board_id', boardId);
    }
    const { data, error } = await query;
    if (error || !data) return null;
    return data.map((p) => ({
      id: p.id,
      boardId: p.board_id,
      title: p.title,
      content: p.content || '',
      color: p.color || 'yellow',
      imageUrl: p.image_url || '',
      linkUrl: p.link_url || '',
      authorId: p.author_id,
      authorName: p.author_name,
      authorRole: p.author_role,
      column: p.column_name,
      reactions: p.reactions || { like: 0, clap: 0, heart: 0, insight: 0 },
      comments: p.comments || [],
      attachments: p.attachments || [],
      pinned: Boolean(p.pinned),
      x: p.x,
      y: p.y,
      createdAt: p.created_at ? new Date(p.created_at).toLocaleString() : '',
    }));
  } catch (e) {
    console.error('fetchRemotePosts error', e);
    return null;
  }
}

export async function saveRemotePost(post: Post): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('posts').upsert({
      id: post.id,
      board_id: post.boardId,
      title: post.title,
      content: post.content,
      color: post.color,
      image_url: post.imageUrl || '',
      link_url: post.linkUrl || '',
      author_id: post.authorId,
      author_name: post.authorName,
      author_role: post.authorRole,
      column_name: post.column,
      reactions: post.reactions,
      comments: post.comments,
      attachments: post.attachments || [],
      pinned: post.pinned,
      x: post.x,
      y: post.y,
    });
    return !error;
  } catch (e) {
    console.error('saveRemotePost error', e);
    return false;
  }
}

export async function deleteRemotePost(postId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    return !error;
  } catch (e) {
    return false;
  }
}
