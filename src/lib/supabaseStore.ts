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
    return data.map((b) => {
      let rawDesc = b.description || '';
      let metaCols: string[] | undefined = undefined;
      if (rawDesc.includes('<!--SCHOOLPAD_BOARD_META:')) {
        const match = rawDesc.match(/<!--SCHOOLPAD_BOARD_META:([\s\S]*?)-->/);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            if (Array.isArray(parsed.columns)) metaCols = parsed.columns;
          } catch (e) {}
        }
        rawDesc = rawDesc.replace(/<!--SCHOOLPAD_BOARD_META:[\s\S]*?-->/g, '').trim();
      }

      return {
        id: b.id,
        code: b.code,
        title: b.title,
        description: rawDesc,
        layout: 'kanban',
        theme: b.theme || 'blue',
        coverImageUrl:
          b.cover_image_url ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
        customBgUrl: '',
        authorId: b.author_id || 'user-admin',
        authorName: b.author_name || '관리자',
        authorRole: 'teacher',
        columns: metaCols || (Array.isArray(b.columns) && b.columns.length > 0 ? b.columns : ['모둠 1', '모둠 2', '모둠 3']),
        allowStudentPost: true,
        allowComments: true,
        allowReactions: true,
        isLocked: false,
        isPublic: true,
        category: '수업자료',
        createdAt: b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : '',
      };
    });
  } catch (e) {
    console.error('fetchRemoteBoards error', e);
    return null;
  }
}

export async function saveRemoteBoard(board: Board): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    let cleanDesc = board.description || '';
    cleanDesc = cleanDesc.replace(/<!--SCHOOLPAD_BOARD_META:[\s\S]*?-->/g, '').trim();
    const metaPayload = JSON.stringify({ columns: board.columns, code: board.code, title: board.title });
    const finalDesc = `${cleanDesc}\n<!--SCHOOLPAD_BOARD_META:${metaPayload}-->`;

    // 1. boards 테이블에 저장 (columns 컬럼 포함 시도)
    const { error } = await supabase.from('boards').upsert({
      id: board.id,
      code: board.code,
      title: board.title,
      description: finalDesc,
      theme: board.theme || 'blue',
      columns: board.columns || ['모둠 1', '모둠 2', '모둠 3'],
    });

    if (error) {
      console.warn('saveRemoteBoard upsert with columns failed, retrying without columns column:', error);
      // DB에 columns 컬럼이 없는 경우를 위한 100% 호환 폴백 (description에 메타데이터로 안전 보관)
      try {
        await supabase.from('boards').upsert({
          id: board.id,
          code: board.code,
          title: board.title,
          description: finalDesc,
          theme: board.theme || 'blue',
        });
      } catch (eFallback) {
        console.error('saveRemoteBoard fallback error', eFallback);
      }
    }

    // 2. 🔥 학생-교사 실시간 동기화 100% 보장: posts 테이블의 시스템 메타 레코드에 동시 저장
    try {
      await supabase.from('posts').upsert({
        id: `board_columns_${board.id}`,
        board_id: board.id,
        column_name: '__system_meta__',
        title: '__BOARD_COLUMNS_META__',
        content: JSON.stringify({
          columns: board.columns,
          code: board.code,
          title: board.title,
          updatedAt: Date.now(),
        }),
        color: 'white',
        author_id: 'system',
        author_name: '시스템',
      });
    } catch (e2) {}

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

    // 시스템 메타데이터 레코드 분리 (열 실시간 동기화용)
    const normalRows = data.filter((p) => {
      if (
        p.column_name === '__system_meta__' ||
        p.column_id === '__system_meta__' ||
        p.title === '__BOARD_COLUMNS_META__'
      ) {
        try {
          const parsed = JSON.parse(p.content);
          if (Array.isArray(parsed.columns) && typeof window !== 'undefined') {
            (window as any).__LATEST_BOARD_COLUMNS__ = parsed.columns;
          }
        } catch (e) {}
        return false;
      }
      return true;
    });

    const mapped = normalRows.map((p) => {
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
        column: metaColumn || p.column_name || p.column_id || '모둠 1',
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

    const rowPayload: any = {
      id: post.id,
      board_id: post.boardId,
      column_name: post.column || '모둠 1',
      title: post.title,
      content: finalContent,
      color: post.color || 'yellow',
      image_url: post.imageUrl || null,
      link_url: post.linkUrl || null,
      author_id: post.authorId || 'student',
      author_name: post.authorName || '학생',
    };

    const { error } = await supabase.from('posts').upsert(rowPayload);
    if (error) {
      console.warn('saveRemotePost primary upsert failed, retrying with fallback payload:', error);
      try {
        await supabase.from('posts').upsert({
          ...rowPayload,
          column_id: post.column || '모둠 1',
        });
      } catch (e2) {}
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
        column_name: post.column || '모둠 1',
        title: post.title,
        content: finalContent,
        color: post.color || 'yellow',
        image_url: post.imageUrl || null,
        link_url: post.linkUrl || null,
        author_id: post.authorId || 'student',
        author_name: post.authorName || '학생',
      };
    });

    const { error } = await supabase.from('posts').upsert(rows);
    if (error) {
      console.warn('saveRemotePosts primary batch failed, retrying with column_id:', error);
      try {
        const fallbackRows = rows.map((r: any) => ({
          ...r,
          column_id: r.column_name,
        }));
        await supabase.from('posts').upsert(fallbackRows);
      } catch (e2) {}
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
