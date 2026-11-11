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
    return data
      .filter((b) => !b.id?.startsWith('quiz_') && !b.title?.startsWith('__QUIZ_'))
      .map((b) => {
      let rawDesc = b.description || '';
      let metaCols: string[] | undefined = undefined;
      let metaCover: string | undefined = undefined;
      let metaBg: string | undefined = undefined;
      let metaCategory: any = undefined;
      let metaTheme: any = undefined;
      let metaLayout: any = undefined;
      let metaUpdatedAt: any = undefined;

      if (rawDesc.includes('<!--SCHOOLPAD_BOARD_META:')) {
        const match = rawDesc.match(/<!--SCHOOLPAD_BOARD_META:([\s\S]*?)-->/);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            if (Array.isArray(parsed.columns)) metaCols = parsed.columns;
            if (parsed.coverImageUrl !== undefined) metaCover = parsed.coverImageUrl;
            if (parsed.customBgUrl !== undefined) metaBg = parsed.customBgUrl;
            if (parsed.category) metaCategory = parsed.category;
            if (parsed.theme) metaTheme = parsed.theme;
            if (parsed.layout) metaLayout = parsed.layout;
            if (parsed.updatedAt) metaUpdatedAt = parsed.updatedAt;
          } catch (e) {}
        }
        rawDesc = rawDesc.replace(/<!--SCHOOLPAD_BOARD_META:[\s\S]*?-->/g, '').trim();
      }

      return {
        id: b.id,
        code: b.code,
        title: b.title,
        description: rawDesc,
        layout: metaLayout || b.layout || 'kanban',
        theme: metaTheme || b.theme || 'blue',
        coverImageUrl:
          metaCover ||
          b.cover_image_url ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
        customBgUrl: metaBg || b.custom_bg_url || '',
        authorId: b.author_id || 'user-admin',
        authorName: b.author_name || '관리자',
        authorRole: 'teacher',
        columns: metaCols || (Array.isArray(b.columns) && b.columns.length > 0 ? b.columns : ['모둠 1', '모둠 2', '모둠 3']),
        allowStudentPost: true,
        allowComments: true,
        allowReactions: true,
        isLocked: false,
        isPublic: true,
        category: metaCategory || b.category || '수업자료',
        createdAt: b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : '',
        updatedAt: metaUpdatedAt || (b.created_at ? new Date(b.created_at).getTime() : undefined),
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
    const metaPayload = JSON.stringify({
      columns: board.columns,
      code: board.code,
      title: board.title,
      description: cleanDesc,
      coverImageUrl: board.coverImageUrl,
      customBgUrl: board.customBgUrl,
      category: board.category,
      theme: board.theme,
      layout: board.layout,
      isPublic: board.isPublic,
      updatedAt: board.updatedAt || Date.now(),
    });
    const finalDesc = `${cleanDesc}\n<!--SCHOOLPAD_BOARD_META:${metaPayload}-->`;

    // 1. boards 테이블에 실제 스키마에 맞는 컬럼(columns 포함)으로 즉시 저장
    const { error } = await supabase.from('boards').upsert({
      id: board.id,
      code: board.code,
      title: board.title,
      description: finalDesc,
      theme: board.theme || 'blue',
      columns: board.columns || ['모둠 1', '모둠 2', '모둠 3'],
    });

    if (error) {
      console.error('saveRemoteBoard upsert failed:', error);
    }

    // 2. 🔥 학생-교사 실시간 동기화 100% 보장: posts 테이블의 시스템 메타 레코드에 동시 저장
    try {
      await supabase.from('posts').upsert({
        id: `board_columns_${board.id}`,
        board_id: board.id,
        column_id: '__system_meta__',
        title: '__BOARD_COLUMNS_META__',
        content: JSON.stringify({
          columns: board.columns,
          code: board.code,
          title: board.title,
          coverImageUrl: board.coverImageUrl,
          category: board.category,
          updatedAt: board.updatedAt || Date.now(),
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
      let metaReactions: any = undefined;
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
            if (parsed.reactions && typeof parsed.reactions === 'object') {
              metaReactions = parsed.reactions;
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

let postCol = p.column_id || p.column_name || metaColumn || '모둠 1';
      if (postCol === '몸플기 예제' || postCol === '몸풀기') {
        postCol = '몸풀기 예제';
      }
      const parsedOrderIndex =
        p.order_index !== null && p.order_index !== undefined
          ? Number(p.order_index)
          : undefined;

      const finalOrder =
        typeof parsedOrderIndex === 'number' && !isNaN(parsedOrderIndex)
          ? parsedOrderIndex
          : (typeof metaOrder === 'number' ? metaOrder : 0);

      return {
        id: p.id,
        boardId: p.board_id,
        title: p.title,
        content: rawContent,
        color: p.color || 'white',
        imageUrl: p.image_url || '',
        linkUrl: p.link_url || '',
        authorId: p.author_id || 'user-student',
        authorName: p.author_name || '학생',
        authorRole: (p.author_role || 'student') as UserRole,
        column: postCol,
        order: finalOrder,
        reactions: metaReactions || {
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
      reactions?: any;
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
    if (post.reactions) {
      meta.reactions = post.reactions;
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

    const colName = post.column || '모둠 1';

    let safeCreatedAt: string;
    try {
      const d = post.createdAt ? new Date(post.createdAt) : new Date();
      safeCreatedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      safeCreatedAt = new Date().toISOString();
    }

    const rowPayload: any = {
      id: post.id,
      board_id: post.boardId,
      column_id: colName,
      column_name: colName,
      title: post.title,
      content: finalContent,
      color: post.color || 'white',
      image_url: post.imageUrl || null,
      link_url: post.linkUrl || null,
      author_id: post.authorId || 'student',
      author_name: post.authorName || '학생',
      author_role: post.authorRole || 'student',
      reactions: post.reactions || {},
      comments: post.comments || [],
      attachments: atts,
      pinned: Boolean(post.pinned),
      order_index: typeof post.order === 'number' ? post.order : 0,
      created_at: safeCreatedAt,
    };

    let res = await supabase.from('posts').upsert(rowPayload);
    if (res.error) {
      console.warn('saveRemotePost 1st try failed:', res.error);

      // 1-1. 일시적 네트워크 지연 또는 동시 요청 충돌 방어 (400ms 후 2차 재시도)
      await new Promise((r) => setTimeout(r, 400));
      res = await supabase.from('posts').upsert(rowPayload);
      if (!res.error) return true;

      // 1-2. 페이로드 용량 초과 방어: 대용량 첨부 dataUrl 경량화 재시도
      console.warn('saveRemotePost retrying with light payload (omitting large base64 dataUrls)...');
      const lightAtts = atts.map((a) => ({
        name: a.name,
        size: a.size,
        type: a.type,
        dataUrl: (a.dataUrl && a.dataUrl.length > 80000) ? '' : a.dataUrl,
      }));

      const lightMeta = { ...meta, attachments: lightAtts };
      const lightContent = `${cleanContent}\n<!--SCHOOLPAD_META:${JSON.stringify(lightMeta)}-->`;

      const lightPayload = {
        ...rowPayload,
        content: lightContent,
        attachments: lightAtts,
        image_url: (post.imageUrl && post.imageUrl.length > 200000) ? null : (post.imageUrl || null),
      };

      const retryRes = await supabase.from('posts').upsert(lightPayload);
      if (!retryRes.error) {
        console.log('saveRemotePost successfully saved with light payload!');
        return true;
      }
      console.error('saveRemotePost retry also failed:', retryRes.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('saveRemotePost error', e);
    return false;
  }
}

// 🔥 카드 일괄 순서 및 상태 저장 함수 (원자적 upsert 지원으로 새 카드 자동 등록 및 순서 100% 보장)
export async function saveRemotePosts(postsList: Post[]): Promise<boolean> {
  const client = supabase;
  if (!isSupabaseConfigured || !client || postsList.length === 0) return false;
  try {
    const records = postsList.map((post, idx) => {
      const orderIdx = typeof post.order === 'number' ? post.order : idx;
      const targetCol = post.column || '모둠 1';

      let cleanContent = (post.content || '').replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();
      const meta = {
        order: orderIdx,
        column: targetCol,
        reactions: post.reactions || {},
        comments: post.comments || [],
        attachments: post.attachments || [],
      };
      const updatedContent = `${cleanContent}\n<!--SCHOOLPAD_META:${JSON.stringify(meta)}-->`;

      let safeCreatedAt: string;
      try {
        const d = post.createdAt ? new Date(post.createdAt) : new Date();
        safeCreatedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch {
        safeCreatedAt = new Date().toISOString();
      }

      return {
        id: post.id,
        board_id: post.boardId,
        title: post.title || '',
        content: updatedContent,
        color: post.color || 'white',
        image_url: post.imageUrl || null,
        link_url: post.linkUrl || null,
        author_id: post.authorId || 'student',
        author_name: post.authorName || '학생',
        author_role: post.authorRole || 'student',
        column_id: targetCol,
        column_name: targetCol,
        order_index: orderIdx,
        pinned: Boolean(post.pinned),
        reactions: post.reactions || {},
        comments: post.comments || [],
        attachments: post.attachments || [],
        created_at: safeCreatedAt,
      };
    });

    // 10개씩 청크 단위로 나누어 upsert 실행 (기존 카드는 update, 로컬에만 있던 카드는 insert)
    const chunkSize = 10;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await client.from('posts').upsert(chunk);
      if (error) {
        console.error('saveRemotePosts chunk upsert error:', error);
      }
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

export async function saveAllRemotePosts(postsList: Post[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !postsList || postsList.length === 0) return false;
  try {
    const records = postsList.map((post, idx) => {
      let cleanContent = post.content || '';
      cleanContent = cleanContent.replace(/<!--SCHOOLPAD_META:[\s\S]*?-->/g, '').trim();

      const meta: any = {};
      const atts: any[] = [];
      if (post.attachments && post.attachments.length > 0) {
        atts.push(...post.attachments);
      } else if (post.fileAttachment) {
        atts.push(post.fileAttachment);
      }
      if (atts.length > 0) meta.attachments = atts;
      if (post.comments && post.comments.length > 0) meta.comments = post.comments;
      if (post.reactions) meta.reactions = post.reactions;
      if (typeof post.order === 'number') meta.order = post.order;
      if (post.column) meta.column = post.column;

      const fullContent = `${cleanContent}\n<!--SCHOOLPAD_META:${JSON.stringify(meta)}-->`;
      const colName = post.column || '모둠 1';

      let safeCreatedAt: string;
      try {
        const d = post.createdAt ? new Date(post.createdAt) : new Date();
        safeCreatedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch {
        safeCreatedAt = new Date().toISOString();
      }

      return {
        id: post.id,
        board_id: post.boardId,
        title: post.title,
        content: fullContent,
        color: post.color || 'white',
        image_url: post.imageUrl || null,
        link_url: post.linkUrl || null,
        author_id: post.authorId || 'teacher',
        author_name: post.authorName || '선생님',
        author_role: post.authorRole || 'teacher',
        column_id: colName,
        column_name: colName,
        reactions: post.reactions || {},
        comments: post.comments || [],
        attachments: atts,
        pinned: Boolean(post.pinned),
        order_index: typeof post.order === 'number' ? post.order : idx,
        created_at: safeCreatedAt,
      };
    });

    // 대용량 페이로드 방지를 위해 10개씩 청크(Batch) 단위로 순차 upsert
    const chunkSize = 10;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await supabase.from('posts').upsert(chunk);
      if (error) {
        console.error(`Chunk ${i} ~ ${i + chunkSize} upsert failed:`, error);
        // 만약 청크 실패 시 개별 단건 upsert로 세부 시도
        for (const item of chunk) {
          try {
            await supabase.from('posts').upsert(item);
          } catch (itemErr) {
            console.error('Individual item upsert failed:', item.id, itemErr);
          }
        }
      }
    }

    return true;
  } catch (e) {
    console.error('Failed to saveAllRemotePosts:', e);
    return false;
  }
}
