-- ========================================================
-- 🏫 스쿨패들(SchoolPad) Supabase 데이터베이스 자동 생성 스크립트
-- Supabase 대시보드 -> 왼쪽 메뉴 [SQL Editor] -> [New query]에 
-- 아래 내용을 그대로 붙여넣고 우측 하단 [Run] 버튼을 누르면 끝납니다!
-- ========================================================

-- 1. 수업 보드 테이블 (boards)
CREATE TABLE IF NOT EXISTS public.boards (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  layout TEXT DEFAULT 'kanban',
  theme TEXT DEFAULT 'blue',
  cover_image_url TEXT,
  custom_bg_url TEXT,
  author_id TEXT,
  author_name TEXT,
  author_role TEXT,
  columns JSONB DEFAULT '["모둠 1", "모둠 2", "모둠 3"]'::jsonb,
  allow_student_post BOOLEAN DEFAULT true,
  allow_comments BOOLEAN DEFAULT true,
  allow_reactions BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  category TEXT DEFAULT '수업자료',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 쪽지/게시글 테이블 (posts)
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  color TEXT DEFAULT 'yellow',
  image_url TEXT,
  link_url TEXT,
  author_id TEXT,
  author_name TEXT,
  author_role TEXT,
  column_name TEXT,
  reactions JSONB DEFAULT '{"like": 0, "clap": 0, "heart": 0, "insight": 0}'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  pinned BOOLEAN DEFAULT false,
  x NUMERIC,
  y NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 실시간 변경 감지 (Supabase Realtime) 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- 4. 보안 정책 (Row Level Security - RLS)
-- 학교 수업 특성상 로그인/비로그인(학생 게스트) 누구나 자유롭게 실시간 참여할 수 있도록 오픈 정책 적용
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access boards" ON public.boards;
CREATE POLICY "Public full access boards" ON public.boards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access posts" ON public.posts;
CREATE POLICY "Public full access posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);
