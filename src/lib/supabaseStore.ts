import { supabase, isSupabaseConfigured } from './supabase';
import { Board, Post, User, FileAttachment, UserRole } from './types';

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
    const mapped = data.map((p) => {
      let rawContent = p.content || '';
      let attachments: FileAttachment[] = [];
      let comments: any[] = [];
      let metaOrder: number | undefined = undefined;
      let metaColumn: string | undefined = undefined;

      // content 내에 인코딩된 첨부파일 및 댓글, 순서 메타데이터 복원
      if (rawContent.includes('<!--SCHOOLPAD_META:')) {
        const metaMatch = rawContent.match(/<!--SCHOOLPAD_META:([\s\S]*?)-->/);
        if (metaMatch && metaMatch[1]) {
          try {
            const parsed = JSON.parse(metaMatch[1]);
            if (Array.isArray(parsed.attachments)) {
              attachments = parsed.attachments;
            }
            if (Array.isArray(parsed.comments)) {
              comments = parsed.comments;
            }
            if (typeof parsed.order === 'number') {
              metaOrder = parsed.order;
            }
            if (typeof parsed.column === 'string' && parsed.column) {
              metaColumn = parsed.column;
            }
          } catch (e) {}
        }
        rawContent = rawContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();
      }

      return {
        id: p.id,
        boardId: p.board_id,
        title: p.title,
        content: rawContent,
        color: p.color || 'yellow',
        imageUrl: p.image_url || '',
        linkUrl: p.link_url || '',
        authorId: p.author_id || 'user-student',
        authorName: p.author_name || '학생',
        authorRole: (p.author_role || 'student') as UserRole,
        column: metaColumn || p.column_id || '모둠 1',
        order: metaOrder ?? (typeof p.order_index === 'number' ? p.order_index : 0),
        reactions: {
          like: Array.isArray(p.likes) ? p.likes.length : 0,
          clap: 0,
          heart: 0,
          insight: 0,
        },
        comments: comments,
        attachments: attachments,
        pinned: false,
        createdAt: p.created_at ? new Date(p.created_at).toLocaleString() : '',
      };
    });

    // 사용자가 배치한 순서(order) 오름차순으로 정렬 (order가 같으면 등록일시 내림차순 유지)
    mapped.sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 99999;
      const orderB = typeof b.order === 'number' ? b.order : 99999;
      if (orderA !== orderB) return orderA - orderB;
      return 0;
    });

    return mapped;
  } catch (e) {
    console.error('fetchRemotePosts error', e);
    return null;
  }
}

export async function saveRemotePost(post: Post): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    let cleanContent = post.content || '';
    cleanContent = cleanContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();

    // 첨부파일과 댓글, 순서, 컬럼을 메타데이터로 함께 인코딩하여 저장
    const meta: {
      attachments?: FileAttachment[];
      comments?: any[];
      order?: number;
      column?: string;
    } = {};

    const atts: FileAttachment[] = [];
    if (post.attachments && post.attachments.length > 0) {
      atts.push(...post.attachments);
    } else if (post.fileAttachment) {
      atts.push(post.fileAttachment);
    }
    if (atts.length > 0) {
      meta.attachments = atts;
    }
    if (post.comments && post.comments.length > 0) {
      meta.comments = post.comments;
    }
    if (typeof post.order === 'number') {
      meta.order = post.order;
    }
    if (post.column) {
      meta.column = post.column;
    }

    let finalContent = cleanContent;
    if (Object.keys(meta).length > 0) {
      finalContent = `${cleanContent}\n<!--SCHOOLPAD_META:${JSON.stringify(meta)}-->`;
    }

    const { error } = await supabase.from('posts').upsert({
      id: post.id,
      board_id: post.boardId,
      column_id: post.column || '모둠 1',
      title: post.title,
      content: finalContent,
      color: post.color || 'yellow',
      image_url: post.imageUrl || null,
      link_url: post.linkUrl || null,
      author_id: post.authorId || 'student',
      author_name: post.authorName || '학생',
      order_index: typeof post.order === 'number' ? post.order : 0,
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

// 🔥 카드 일괄 순서 및 상태 저장 함수 (원자적 업데이트 지원)
export async function saveRemotePosts(postsList: Post[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || postsList.length === 0) return false;
  try {
    const rows = postsList.map((post) => {
      let cleanContent = post.content || '';
      cleanContent = cleanContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();

      const meta: {
        attachments?: FileAttachment[];
        comments?: any[];
        order?: number;
        column?: string;
      } = {};

      const atts: FileAttachment[] = [];
      if (post.attachments && post.attachments.length > 0) {
        atts.push(...post.attachments);
      } else if (post.fileAttachment) {
        atts.push(post.fileAttachment);
      }
      if (atts.length > 0) meta.attachments = atts;
      if (post.comments && post.comments.length > 0) meta.comments = post.comments;
      if (typeof post.order === 'number') meta.order = post.order;
      if (post.column) meta.column = post.column;

      let finalContent = cleanContent;
      if (Object.keys(meta).length > 0) {
        finalContent = `${cleanContent}\n<!--SCHOOLPAD_META:${JSON.stringify(meta)}-->`;
      }

      return {
        id: post.id,
        board_id: post.boardId,
        column_id: post.column || '모둠 1',
        title: post.title,
        content: finalContent,
        color: post.color || 'yellow',
        image_url: post.imageUrl || null,
        link_url: post.linkUrl || null,
        author_id: post.authorId || 'student',
        author_name: post.authorName || '학생',
        order_index: typeof post.order === 'number' ? post.order : 0,
      };
    });

    const { error } = await supabase.from('posts').upsert(rows);
    if (error) {
      console.error('saveRemotePosts error', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('saveRemotePosts error', e);
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
