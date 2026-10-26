import { supabase, isSupabaseConfigured } from './supabase';
import { Board, Post, User, FileAttachment } from './types';

// Supabase 테이블 데이터 <-> SchoolPad 로컬 타입 상호 변환기

export async function fetchRemoteBoards(): Promise<Board[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map((b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      description: b.description || '',
      layout: 'kanban',
      theme: b.theme || 'blue',
      coverImageUrl:
        b.cover_image_url ||
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
      customBgUrl: '',
      authorId: b.author_id || 'user-admin',
      authorName: b.author_name || '관리자',
      authorRole: 'teacher',
      columns: Array.isArray(b.columns) ? b.columns : ['모둠 1', '모둠 2', '모둠 3'],
      allowStudentPost: true,
      allowComments: true,
      allowReactions: true,
      isLocked: false,
      isPublic: true,
      category: '수업자료',
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
      description: board.description || '',
      theme: board.theme || 'blue',
      columns: board.columns || ['모둠 1', '모둠 2', '모둠 3'],
    });
    if (error) {
      console.error('saveRemoteBoard error', error);
      return false;
    }
    return true;
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
      authorId: p.author_id || 'user-student',
      authorName: p.author_name || '학생',
      authorRole: 'student',
      column: p.column_id || '모둠 1',
      reactions: {
        like: Array.isArray(p.likes) ? p.likes.length : 0,
        clap: 0,
        heart: 0,
        insight: 0,
      },
      comments: [],
      attachments: [],
      pinned: false,
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
      column_id: post.column || '모둠 1',
      title: post.title,
      content: post.content || '',
      color: post.color || 'yellow',
      image_url: post.imageUrl || null,
      link_url: post.linkUrl || null,
      author_id: post.authorId || 'student',
      author_name: post.authorName || '학생',
      order_index: post.order || 0,
    });
    if (error) {
      console.error('saveRemotePost error', error);
      return false;
    }
    return true;
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
