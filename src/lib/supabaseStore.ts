import { supabase, isSupabaseConfigured } from './supabase';
import { Board, Post, User, FileAttachment, UserRole, SystemSettings, Notice, BannerSettings } from './types';

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
      .filter((b) => !b.id?.startsWith('quiz_') && !b.title?.startsWith('__QUIZ_') && !b.id?.startsWith('__SYSTEM_') && !b.title?.startsWith('__SYSTEM_'))
      .map((b) => {
      let rawDesc = b.description || '';
      let metaCols: string[] | undefined = undefined;
      let metaCover: string | undefined = undefined;
      let metaBg: string | undefined = undefined;
      let metaCategory: any = undefined;
      let metaTheme: any = undefined;
      let metaLayout: any = undefined;
      let metaUpdatedAt: any = undefined;
      let metaAuthorId: string | undefined = undefined;
      let metaAuthorName: string | undefined = undefined;
      let metaAuthorRole: string | undefined = undefined;
      let metaIsPublic: boolean | undefined = undefined;
      let metaOrder: number | undefined = undefined;
      let metaPinned: boolean | undefined = undefined;

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
            if (parsed.authorId) metaAuthorId = parsed.authorId;
            if (parsed.authorName) metaAuthorName = parsed.authorName;
            if (parsed.authorRole) metaAuthorRole = parsed.authorRole;
            if (parsed.isPublic !== undefined) metaIsPublic = parsed.isPublic;
            if (typeof parsed.order === 'number') metaOrder = parsed.order;
            if (parsed.pinned !== undefined) metaPinned = Boolean(parsed.pinned);
          } catch (e) {}
        }
        rawDesc = rawDesc.replace(/<!--SCHOOLPAD_BOARD_META:[\s\S]*?-->/g, '').trim();
      }

      const isMinwanBoard = b.title === '내 테스트' || b.author_name === 'minwan1 kim' || metaAuthorName === 'minwan1 kim';

      return {
        id: b.id,
        code: b.code,
        title: b.title,
        description: rawDesc,
        layout: metaLayout || b.layout || 'kanban',
        theme: metaTheme || b.theme || 'blue',
        order: metaOrder !== undefined ? metaOrder : undefined,
        pinned: false, // 📌 고정 여부는 사용자 계정별(UserPrefs)로 독립 관리
        coverImageUrl:
          metaCover ||
          b.cover_image_url ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
        customBgUrl: metaBg || b.custom_bg_url || '',
        authorId: metaAuthorId || b.author_id || (isMinwanBoard ? 'user-minwan1' : 'user-admin'),
        authorName: metaAuthorName || b.author_name || (isMinwanBoard ? 'minwan1 kim' : '관리자'),
        authorRole: metaAuthorRole || b.author_role || 'teacher',
        columns: metaCols || (Array.isArray(b.columns) && b.columns.length > 0 ? b.columns : ['모둠 1', '모둠 2', '모둠 3']),
        allowStudentPost: true,
        allowComments: true,
        allowReactions: true,
        isLocked: false,
        isPublic: metaIsPublic !== undefined ? metaIsPublic : (b.is_public !== false),
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
    const finalCode = board.code || Math.floor(100000 + Math.random() * 900000).toString();
    const isPub = board.isPublic !== false;
    const metaPayload = JSON.stringify({
      columns: board.columns,
      code: finalCode,
      title: board.title,
      description: cleanDesc,
      coverImageUrl: board.coverImageUrl,
      customBgUrl: board.customBgUrl,
      category: board.category,
      theme: board.theme,
      layout: board.layout,
      isPublic: isPub,
      authorId: board.authorId,
      authorName: board.authorName,
      authorRole: board.authorRole || 'teacher',
      order: board.order,
      pinned: false,
      updatedAt: board.updatedAt || Date.now(),
    });
    const finalDesc = `${cleanDesc}\n<!--SCHOOLPAD_BOARD_META:${metaPayload}-->`;

    const fullPayload = {
      id: board.id,
      code: finalCode,
      title: board.title,
      description: finalDesc,
      theme: board.theme || 'blue',
      columns: board.columns || ['모둠 1', '모둠 2', '모둠 3'],
      author_id: board.authorId || null,
      author_name: board.authorName || null,
      author_role: board.authorRole || 'teacher',
      is_public: isPub,
      category: board.category || '수업자료',
      cover_image_url: board.coverImageUrl || null,
      custom_bg_url: board.customBgUrl || null,
    };

    // 1. 기존 보드 id에 대해 update 먼저 시도 (select('id')로 실제 수정된 행이 있는지 확인)
    let isUpdated = false;
    const { data: updatedRows, error: upErr } = await supabase
      .from('boards')
      .update(fullPayload)
      .eq('id', board.id)
      .select('id');

    if (!upErr && updatedRows && updatedRows.length > 0) {
      isUpdated = true;
    } else if (upErr) {
      // fullPayload의 컬럼 에러일 수 있으므로 corePayload로 update 재시도
      const corePayload = {
        code: finalCode,
        title: board.title,
        description: finalDesc,
        theme: board.theme || 'blue',
        is_public: isPub,
        category: board.category || '수업자료',
      };
      const { data: coreUpdated, error: coreErr } = await supabase
        .from('boards')
        .update(corePayload)
        .eq('id', board.id)
        .select('id');
      if (!coreErr && coreUpdated && coreUpdated.length > 0) {
        isUpdated = true;
      }
    }

    // 2. 만약 update된 행이 없다면 (신규 보드이거나 id가 DB에 아직 없는 보드) -> 반드시 INSERT/UPSERT 실행!
    if (!isUpdated) {
      const corePayload = {
        id: board.id,
        code: finalCode,
        title: board.title,
        description: finalDesc,
        theme: board.theme || 'blue',
        is_public: isPub,
        category: board.category || '수업자료',
      };
      let insRes = await supabase.from('boards').upsert(fullPayload, { onConflict: 'id' });
      if (insRes.error) {
        let coreIns = await supabase.from('boards').upsert(corePayload, { onConflict: 'id' });
        if (coreIns.error) {
          // 혹시 code 컬럼 중복 에러일 수 있으므로, 새로운 랜덤 6자리 코드로 재생성 후 재시도
          const freshCode = Math.floor(100000 + Math.random() * 900000).toString();
          const retryCore = { ...corePayload, code: freshCode };
          let retryRes = await supabase.from('boards').upsert(retryCore, { onConflict: 'id' });
          if (retryRes.error) {
            await supabase.from('boards').insert(retryCore);
          }
        }
      }
    }

    // 3. 🔥 학생-교사 실시간 동기화 보장: posts 테이블의 시스템 메타 레코드에 동시 저장
    try {
      await supabase.from('posts').upsert({
        id: `board_columns_${board.id}`,
        board_id: board.id,
        column_name: '__system_meta__',
        title: '__BOARD_COLUMNS_META__',
        content: JSON.stringify({
          columns: board.columns,
          code: finalCode,
          title: board.title,
          coverImageUrl: board.coverImageUrl,
          category: board.category,
          isPublic: isPub,
          updatedAt: board.updatedAt || Date.now(),
        }),
        color: 'white',
        author_id: 'system',
        author_name: '시스템',
      }, { onConflict: 'id' });
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
    // 1. 해당 보드에 연결된 모든 카드, 포스트, 시스템 메타 레코드 먼저 완전 삭제 (외래키 제약조건 방어)
    await supabase.from('posts').delete().eq('board_id', boardId);
    await supabase.from('posts').delete().eq('id', `board_columns_${boardId}`);

    // 2. boards 테이블에서 보드 완전 삭제
    const { error } = await supabase.from('boards').delete().eq('id', boardId);
    if (error) {
      console.error('deleteRemoteBoard error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('deleteRemoteBoard exception:', e);
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

    // 시스템 메타데이터 레코드 분리 (열 실시간 동기화용 - 보드별로 격리 캐싱)
    const normalRows = data.filter((p) => {
      // 퀴즈 시스템 메타데이터 카드(Active Quiz)는 일반 포스트 목록에서 영구 제외
      if (
        p.column_name === '__active_quiz__' ||
        p.id?.startsWith('active_quiz_') ||
        p.title?.startsWith('Active Quiz')
      ) {
        return false;
      }

      if (
        p.column_name === '__system_meta__' ||
        p.column_id === '__system_meta__' ||
        p.title === '__BOARD_COLUMNS_META__'
      ) {
        try {
          const parsed = JSON.parse(p.content);
          const metaBoardId = p.board_id || (p.id?.startsWith('board_columns_') ? p.id.replace('board_columns_', '') : null);
          if (Array.isArray(parsed.columns) && typeof window !== 'undefined' && metaBoardId) {
            if (!(window as any).__BOARD_COLUMNS_CACHE__) {
              (window as any).__BOARD_COLUMNS_CACHE__ = {};
            }
            (window as any).__BOARD_COLUMNS_CACHE__[metaBoardId] = parsed.columns;
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
      let metaX: number | undefined = undefined;
      let metaY: number | undefined = undefined;

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
            if (typeof parsed.x === 'number') {
              metaX = parsed.x;
            }
            if (typeof parsed.y === 'number') {
              metaY = parsed.y;
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
        x: metaX,
        y: metaY,
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

    // 첨부파일과 댓글, 순서, 컬럼, 위치(x, y)를 메타데이터로 함께 인코딩하여 저장
    const meta: {
      attachments?: FileAttachment[];
      comments?: any[];
      reactions?: any;
      order?: number;
      column?: string;
      x?: number;
      y?: number;
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
    if (typeof post.x === 'number') {
      meta.x = Math.round(post.x);
    }
    if (typeof post.y === 'number') {
      meta.y = Math.round(post.y);
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

    const standardPayload: any = {
      id: post.id,
      board_id: post.boardId,
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
      created_at: safeCreatedAt,
    };

    const rowPayload: any = {
      ...standardPayload,
      column_id: colName,
      order_index: typeof post.order === 'number' ? post.order : 0,
    };

    let res = await supabase.from('posts').upsert(rowPayload);
    if (res.error) {
      console.warn('saveRemotePost 1st try failed, retrying with standard columns payload:', res.error);

      // 1-1. column_id 등 미지원 컬럼 제거한 표준 페이로드로 2차 시도
      await new Promise((r) => setTimeout(r, 200));
      res = await supabase.from('posts').upsert(standardPayload);
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
        ...standardPayload,
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
      if (typeof post.x === 'number') meta.x = Math.round(post.x);
      if (typeof post.y === 'number') meta.y = Math.round(post.y);

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

// ==========================================
// 🌟 전 학교 실시간 회원(사용자) & 시스템 설정 클라우드 동기화
// ==========================================

export async function fetchRemoteUsers(): Promise<User[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('board_id', '__SYSTEM_USERS__')
      .eq('column_name', '__user__');

    if (error || !data || data.length === 0) return null;

    const users: User[] = [];
    for (const row of data) {
      try {
        const u = JSON.parse(row.content);
        if (u && u.id && u.name) {
          users.push(u);
        }
      } catch (e) {}
    }
    return users.length > 0 ? users : null;
  } catch (e) {
    console.error('fetchRemoteUsers error:', e);
    return null;
  }
}

export async function saveRemoteUser(user: User): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !user) return false;
  try {
    // 부모 보드(__SYSTEM_USERS__) 존재 보장
    await supabase.from('boards').upsert({
      id: '__SYSTEM_USERS__',
      code: 'SYSUSER',
      title: '__SYSTEM_USERS__',
      description: 'System User Registry for Cross-Device Sync',
      is_public: false,
      author_id: 'system',
      author_name: '시스템',
    });

    const { error } = await supabase.from('posts').upsert({
      id: user.id,
      board_id: '__SYSTEM_USERS__',
      title: user.name,
      content: JSON.stringify(user),
      author_id: user.id,
      author_name: user.name,
      author_role: user.role || 'student',
      column_name: '__user__',
    });

    return !error;
  } catch (e) {
    console.error('saveRemoteUser error:', e);
    return false;
  }
}

export async function deleteRemoteUser(userId: string, userEmail?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !userId) return false;
  try {
    await supabase
      .from('posts')
      .delete()
      .eq('id', userId)
      .eq('board_id', '__SYSTEM_USERS__');

    // 이메일이 주어진 경우, 이메일이 일치하는 잔여 레코드도 확실히 정리
    if (userEmail) {
      const { data } = await supabase.from('posts').select('id, content').eq('board_id', '__SYSTEM_USERS__');
      if (data) {
        for (const row of data) {
          try {
            const u = JSON.parse(row.content);
            if (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) {
              await supabase.from('posts').delete().eq('id', row.id);
            }
          } catch (e) {}
        }
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function saveRemoteSettings(settings: SystemSettings): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !settings) return false;
  try {
    await supabase.from('boards').upsert({
      id: '__SYSTEM_USERS__',
      code: 'SYSUSER',
      title: '__SYSTEM_USERS__',
      description: 'System User Registry for Cross-Device Sync',
      is_public: false,
      author_id: 'system',
      author_name: '시스템',
    });

    const { error } = await supabase.from('posts').upsert({
      id: 'sys_settings',
      board_id: '__SYSTEM_USERS__',
      title: '__SYSTEM_SETTINGS__',
      content: JSON.stringify(settings),
      author_id: 'system',
      author_name: '시스템',
      column_name: '__settings__',
    });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function fetchRemoteSettings(): Promise<SystemSettings | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('content')
      .eq('id', 'sys_settings')
      .eq('board_id', '__SYSTEM_USERS__')
      .maybeSingle();

    if (error || !data?.content) return null;
    return JSON.parse(data.content) as SystemSettings;
  } catch (e) {
    return null;
  }
}

// 📢 전역 관리자 공지사항 Supabase 동기화
// 📢 교직원 및 학생 대상 분리된 기본 공지사항
// 1) 관리자 공지: 교사/교직원 대상 (학생에게는 절대 보이지 않음)
export const DEFAULT_ADMIN_NOTICE: Notice = {
  id: 'schoolpad_admin_notice',
  title: '🏫 2026학년도 교직원 및 교사 디지털 수업 운영 안내',
  content: '선생님들의 원활한 디지털 수업 및 학급 보드 개설/공유를 위한 교무 안내 사항입니다.',
  category: 'general',
  authorName: '학교 관리자',
  isActive: true,
  createdAt: '2026-11-18',
  updatedAt: Date.now(),
  targetAudience: 'teachers',
  noticeType: 'admin',
};

// 2) 선생님 공지: 학생 대상 (학생 홈 화면 메인 상단 노출)
export const DEFAULT_TEACHER_NOTICE: Notice = {
  id: 'schoolpad_teacher_notice',
  title: '📢 2026학년도 스쿨패들 수업 협업 안내',
  content: '선생님과 학생들이 실시간으로 생각을 붙이고 나누며 함께 성장하는 디지털 협업 교실입니다. 6자리 참여 코드로 수업에 참여해 보세요!',
  category: 'general',
  authorName: '선생님',
  isActive: true,
  createdAt: '2026-11-18',
  updatedAt: Date.now(),
  targetAudience: 'students',
  noticeType: 'teacher',
};

// 기존 코드와의 하위 호환성 유지용
export const DEFAULT_NOTICE = DEFAULT_TEACHER_NOTICE;

export async function saveRemoteNoticeByType(type: 'admin' | 'teacher', notice: Notice | null): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    await supabase.from('boards').upsert({
      id: '__SYSTEM_USERS__',
      code: 'SYSUSER',
      title: '__SYSTEM_USERS__',
      description: 'System User Registry for Cross-Device Sync',
      is_public: false,
      author_id: 'system',
      author_name: '시스템',
    });

    const defaultNotice = type === 'admin' ? DEFAULT_ADMIN_NOTICE : DEFAULT_TEACHER_NOTICE;
    const postId = type === 'admin' ? 'schoolpad_admin_notice' : 'schoolpad_teacher_notice';

    const targetNotice: Notice = notice || {
      ...defaultNotice,
      isActive: false,
      updatedAt: Date.now(),
    };

    if (typeof window !== 'undefined') {
      try {
        if (type === 'admin') {
          if (targetNotice.isActive !== false) {
            localStorage.setItem('schoolpad_admin_notice', JSON.stringify(targetNotice));
          } else {
            localStorage.removeItem('schoolpad_admin_notice');
          }
        } else {
          if (targetNotice.isActive !== false) {
            localStorage.setItem('schoolpad_teacher_notice', JSON.stringify(targetNotice));
            localStorage.setItem('schoolpad_global_notice', JSON.stringify(targetNotice));
          } else {
            localStorage.removeItem('schoolpad_teacher_notice');
            localStorage.removeItem('schoolpad_global_notice');
          }
        }
        window.dispatchEvent(new Event('schoolpad_notice_updated'));
      } catch (e) {}
    }

    const { error } = await supabase.from('posts').upsert({
      id: postId,
      board_id: '__SYSTEM_USERS__',
      title: targetNotice.title,
      content: JSON.stringify(targetNotice),
      author_id: type === 'admin' ? 'admin' : 'teacher',
      author_name: targetNotice.authorName || (type === 'admin' ? '관리자' : '선생님'),
      column_name: '__notice__',
    });
    if (error) {
      console.error(`saveRemoteNoticeByType (${type}) Supabase error:`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`saveRemoteNoticeByType (${type}) exception:`, e);
    return false;
  }
}

export async function fetchRemoteNoticeByTypeResult(type: 'admin' | 'teacher'): Promise<{ notice: Notice | null; error: any }> {
  const defaultNotice = type === 'admin' ? DEFAULT_ADMIN_NOTICE : DEFAULT_TEACHER_NOTICE;
  const postId = type === 'admin' ? 'schoolpad_admin_notice' : 'schoolpad_teacher_notice';
  if (!isSupabaseConfigured || !supabase) return { notice: defaultNotice, error: null };
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('content')
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      return { notice: null, error };
    }
    if (!data || !data.content) {
      // 기존 단일 공지 데이터(schoolpad_global_notice)가 있다면 학생 공지로 마이그레이션 호환
      if (type === 'teacher') {
        const { data: legacyData } = await supabase
          .from('posts')
          .select('content')
          .eq('id', 'schoolpad_global_notice')
          .maybeSingle();
        if (legacyData && legacyData.content) {
          try {
            const legacyParsed = JSON.parse(legacyData.content) as Notice;
            if (legacyParsed.id !== 'deleted' && legacyParsed.title !== '__DELETED__') {
              return { notice: { ...legacyParsed, noticeType: 'teacher', targetAudience: 'students' }, error: null };
            }
          } catch (e) {}
        }
      }
      return { notice: defaultNotice, error: null };
    }
    try {
      const parsed = JSON.parse(data.content) as Notice;
      if (parsed.id === 'deleted' || parsed.title === '__DELETED__') {
        return { notice: defaultNotice, error: null };
      }
      return { notice: parsed, error: null };
    } catch (parseErr) {
      return { notice: defaultNotice, error: null };
    }
  } catch (e) {
    return { notice: defaultNotice, error: e };
  }
}

export async function saveRemoteNotice(notice: Notice | null): Promise<boolean> {
  const type = notice?.noticeType === 'admin' || notice?.targetAudience === 'teachers' ? 'admin' : 'teacher';
  return saveRemoteNoticeByType(type, notice);
}

export async function fetchRemoteNoticeResult(): Promise<{ notice: Notice | null; error: any }> {
  return fetchRemoteNoticeByTypeResult('teacher');
}

export async function fetchRemoteNotice(): Promise<Notice | null> {
  const res = await fetchRemoteNoticeResult();
  return res.notice;
}

// 📌 사용자별 개별 설정(고정 보드 ID 목록 & 보드 정렬 순서) Supabase 원격 동기화
export interface UserPreferences {
  pinnedIds: string[];
  orderMap: Record<string, number>;
  updatedAt?: number;
}

export async function saveRemoteUserPrefs(userKey: string, prefs: { pinnedIds: string[]; orderMap: Record<string, number> }): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !userKey) return false;
  try {
    const safeKey = userKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const { error } = await supabase.from('posts').upsert({
      id: `user_prefs_${safeKey}`,
      board_id: '__SYSTEM_USERS__',
      title: `User Preferences: ${userKey}`,
      content: JSON.stringify({ ...prefs, updatedAt: Date.now() }),
      author_id: safeKey,
      author_name: userKey,
      column_name: '__user_prefs__',
    });
    return !error;
  } catch (e) {
    console.error('saveRemoteUserPrefs error:', e);
    return false;
  }
}

export async function fetchRemoteUserPrefs(userKey: string): Promise<UserPreferences | null> {
  if (!isSupabaseConfigured || !supabase || !userKey) return null;
  try {
    const safeKey = userKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const { data, error } = await supabase
      .from('posts')
      .select('content')
      .eq('id', `user_prefs_${safeKey}`)
      .eq('board_id', '__SYSTEM_USERS__')
      .maybeSingle();

    if (error || !data?.content) return null;
    return JSON.parse(data.content) as UserPreferences;
  } catch (e) {
    return null;
  }
}

// 🖼️ 메인 배너 이미지 기본 프리셋 및 원격 동기화
export const DEFAULT_BANNER_SETTINGS: BannerSettings = {
  slides: [
    {
      id: 'default-1',
      url: '/korean_classroom_banner.jpg',
      title: '한국형 교실 풍경',
      position: 'center 25%',
    },
    {
      id: 'default-2',
      url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&auto=format&fit=crop&q=80',
      title: '밝고 쾌적한 교실',
      position: 'center 25%',
    },
    {
      id: 'default-3',
      url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&auto=format&fit=crop&q=80',
      title: '열정적인 수업과 발표',
      position: 'center 30%',
    },
    {
      id: 'default-4',
      url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&auto=format&fit=crop&q=80',
      title: '함께 탐구하는 학생들',
      position: 'center 35%',
    },
  ],
  autoSlide: true,
  intervalSeconds: 5,
};

export async function saveRemoteBannerSettings(settings: BannerSettings): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    await supabase.from('boards').upsert({
      id: '__SYSTEM_USERS__',
      code: 'SYSUSER',
      title: '__SYSTEM_USERS__',
      description: 'System User Registry for Cross-Device Sync',
      is_public: false,
      author_id: 'system',
      author_name: '시스템',
    });

    const { error } = await supabase.from('posts').upsert({
      id: 'schoolpad_banner_settings',
      board_id: '__SYSTEM_USERS__',
      title: 'Main Banner Settings',
      content: JSON.stringify({ ...settings, updatedAt: Date.now() }),
      author_id: 'admin',
      author_name: '관리자',
      column_name: '__banner_settings__',
    });
    return !error;
  } catch (e) {
    console.error('saveRemoteBannerSettings error:', e);
    return false;
  }
}

export async function fetchRemoteBannerSettings(): Promise<BannerSettings | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('content')
      .eq('id', 'schoolpad_banner_settings')
      .eq('board_id', '__SYSTEM_USERS__')
      .maybeSingle();

    if (error || !data?.content) return null;
    return JSON.parse(data.content) as BannerSettings;
  } catch (e) {
    return null;
  }
}

// 🎯 보드별 실시간 진행 중인 퀴즈 PIN Supabase 클라우드 동기화 (시스템 전용 격리 저장)
export async function saveRemoteBoardActiveQuiz(boardId: string, pin: string | null): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !boardId) return false;
  try {
    const postKey = `active_quiz_${boardId}`;

    // 혹시 과거에 boardId로 잘못 들어간 구버전 데이터가 있다면 영구 삭제 (보드 카드 오염 방어)
    await supabase.from('posts').delete().eq('board_id', boardId).eq('column_name', '__active_quiz__');
    await supabase.from('posts').delete().eq('board_id', boardId).ilike('title', 'Active Quiz%');

    if (!pin) {
      await supabase.from('posts').delete().eq('id', postKey);
      return true;
    }

    // 시스템 보드 존재 보장
    await supabase.from('boards').upsert({
      id: '__SYSTEM_USERS__',
      code: 'SYSUSER',
      title: '__SYSTEM_USERS__',
      description: 'System User Registry for Cross-Device Sync',
      is_public: false,
      author_id: 'system',
      author_name: '시스템',
    });

    const { error } = await supabase.from('posts').upsert({
      id: postKey,
      board_id: '__SYSTEM_USERS__', // 보드 카드 목록에 절대 섞이지 않도록 시스템 보드로 안전 격리
      title: `Active Quiz for ${boardId}: ${pin}`,
      content: JSON.stringify({ boardId, pin, updatedAt: Date.now() }),
      author_id: 'system',
      author_name: '퀴즈 시스템',
      column_name: '__active_quiz__',
    });
    return !error;
  } catch (e) {
    console.error('saveRemoteBoardActiveQuiz error:', e);
    return false;
  }
}

export async function fetchRemoteBoardActiveQuiz(boardId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !boardId) return null;
  try {
    const postKey = `active_quiz_${boardId}`;
    const { data, error } = await supabase
      .from('posts')
      .select('content')
      .eq('id', postKey)
      .maybeSingle();

    if (error || !data?.content) return null;
    const parsed = JSON.parse(data.content);
    // 2시간 이상 지난 오래된 퀴즈 PIN은 만료 처리
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > 2 * 60 * 60 * 1000) {
      return null;
    }
    return parsed.pin || null;
  } catch (e) {
    return null;
  }
}
