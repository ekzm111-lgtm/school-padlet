-- ========================================================
-- 🏫 [sc-padle1] 새 Supabase 프로젝트 올인원 마이그레이션 SQL
-- Supabase 대시보드 -> 왼쪽 메뉴 [SQL Editor] -> [New query]에 
-- 아래 내용을 그대로 복사해 붙여넣고 우측 하단 [Run] 버튼을 누르면 끝납니다!
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

-- 4. 보안 정책 (Row Level Security - RLS) 오픈
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access boards" ON public.boards;
CREATE POLICY "Public full access boards" ON public.boards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access posts" ON public.posts;
CREATE POLICY "Public full access posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- 5. 기존 '바이브코딩 (105207)' 보드 데이터 복원
INSERT INTO public.boards (
  id, code, title, description, layout, theme, columns,
  allow_student_post, allow_comments, allow_reactions, is_locked, is_public, category
) VALUES (
  'board-1792975588752',
  '105207',
  '바이브코딩',
  '바이브
<!--SCHOOLPAD_BOARD_META:{"columns":["Ai 모델","몸플기 예제","실습","util"],"code":"105207","title":"바이브코딩"}-->',
  'kanban',
  'blue',
  '["Ai 모델", "몸플기 예제", "실습", "util"]'::jsonb,
  true, true, true, false, true, '수업자료'
)
ON CONFLICT (id) DO UPDATE SET
  columns = '["Ai 모델", "몸플기 예제", "실습", "util"]'::jsonb,
  description = EXCLUDED.description;

-- 6. 핵심 7개 유틸 카드 데이터 복원
INSERT INTO public.posts (id, board_id, column_name, title, link_url, color, author_name, author_role, content)
VALUES
  (
    'post-util-gh-sql',
    'board-1792975588752',
    'util',
    'GitHub (School-Padlet)',
    'https://github.com/ekzm111-lgtm/school-padlet',
    'white',
    '김관리 (정보부장)',
    'admin',
    '스쿨패들(SchoolPad) 오픈소스 프로젝트 GitHub 소스코드 저장소' || E'\n' || '<!--SCHOOLPAD_META:{"order":1,"column":"util"}-->'
  ),
  (
    'post-util-ver-sql',
    'board-1792975588752',
    'util',
    'Vercel 대시보드',
    'https://vercel.com',
    'yellow',
    '김관리 (정보부장)',
    'admin',
    'Next.js 프로젝트 원클릭 클라우드 배포 및 실시간 호스팅 도메인 관리' || E'\n' || '<!--SCHOOLPAD_META:{"order":2,"column":"util"}-->'
  ),
  (
    'post-util-fb-sql',
    'board-1792975588752',
    'util',
    'Firebase 콘솔',
    'https://console.firebase.google.com',
    'yellow',
    '김관리 (정보부장)',
    'admin',
    'Google Cloud 기반 Firestore DB, 사용자 인증(Auth) 및 웹 백엔드 서비스 콘솔' || E'\n' || '<!--SCHOOLPAD_META:{"order":3,"column":"util"}-->'
  ),
  (
    'post-util-her-sql',
    'board-1792975588752',
    'util',
    'Hermes Agent (헤르메스 에이전트)',
    'https://github.com/NousResearch/hermes-agent',
    'purple',
    '김관리 (정보부장)',
    'admin',
    'NousResearch의 자율형 AI 에이전트 & Function Calling 오픈소스 프레임워크' || E'\n' || '<!--SCHOOLPAD_META:{"order":4,"column":"util"}-->'
  ),
  (
    'post-util-v0-sql',
    'board-1792975588752',
    'util',
    'v0 by Vercel (UI 컴포넌트)',
    'https://v0.dev',
    'blue',
    '김관리 (정보부장)',
    'admin',
    '자연어 프롬프트로 Tailwind CSS + React 모던 컴포넌트 UI를 즉시 완성해 주는 바이브 코딩 필수 사이트' || E'\n' || '<!--SCHOOLPAD_META:{"order":5,"column":"util"}-->'
  ),
  (
    'post-util-blt-sql',
    'board-1792975588752',
    'util',
    'Bolt.new (풀스택 AI 개발)',
    'https://bolt.new',
    'green',
    '김관리 (정보부장)',
    'admin',
    '브라우저 안에서 풀스택 Node.js 웹 앱을 대화형으로 개발, 실시간 실행 및 배포까지 해주는 개발 플랫폼' || E'\n' || '<!--SCHOOLPAD_META:{"order":6,"column":"util"}-->'
  ),
  (
    'post-util-lov-sql',
    'board-1792975588752',
    'util',
    'Lovable.dev (아이디어 앱 제작)',
    'https://lovable.dev',
    'pink',
    '김관리 (정보부장)',
    'admin',
    '기획 아이디어를 대화형으로 실서비스 수준 웹 애플리케이션으로 빠르게 완성해 주는 바이브 코딩 플랫폼' || E'\n' || '<!--SCHOOLPAD_META:{"order":7,"column":"util"}-->'
  )
ON CONFLICT (id) DO UPDATE SET
  column_name = EXCLUDED.column_name,
  title = EXCLUDED.title,
  link_url = EXCLUDED.link_url,
  content = EXCLUDED.content;

-- 7. 현재 활성 음악 퀴즈 6문항 DB 업로드
INSERT INTO public.boards (
  id, code, title, description, layout, theme, category, is_public
) VALUES (
  'quiz_current_active',
  'quiz_active',
  '__CURRENT_ACTIVE_QUIZ__',
  '{"examInfo":{"schoolName":"대한중학교","grade":"제 2학년","term":"1학기 1차 지필평가","subject":"음악","date":"2026. 10. 08","totalTime":"45분","instructions":["문제지의 문항 수와 인쇄 상태를 확인하십시오.","객관식 답안은 OMR 카드 또는 답안란에 정확히 표기하십시오.","배점은 각 문항 끝에 표시되어 있습니다."]},"questions":[{"id":"q1","category":"기초이론","type":"multiple-choice","points":4,"title":"다음 악보에 제시된 두 음 사이의 음정(Interval)으로 알맞은 것은?","hasScore":true,"scoreAbc":"X:1\nM:C\nL:1/1\nK:C\n[CE] |]","hasAudio":true,"options":["단 3도","장 3도","완전 4도","완전 5도","감 3도"],"correctAnswer":"2","explanation":"C(도)와 E(미)는 온음 2개로 이루어진 3도 음정이므로 \"장 3도\"입니다.","difficulty":"하"},{"id":"q2","category":"기초이론","type":"multiple-choice","points":4,"title":"다음 악보의 조표(Key Signature)를 보고 으뜸음이 ''G(솔)''인 장조(Major key)의 명칭으로 알맞은 것은?","hasScore":true,"scoreAbc":"X:1\nM:4/4\nL:1/4\nK:G\nG A B c | d4 |]","hasAudio":true,"options":["다장조 (C Major)","바장조 (F Major)","사장조 (G Major)","라장조 (D Major)","내림나장조 (Bb Major)"],"correctAnswer":"3","explanation":"올림표(#)가 파(F#) 자리에 1개 붙은 조표는 사장조(G Major) 또는 마단조(E minor)입니다. 으뜸음이 솔(G)이므로 사장조입니다.","difficulty":"하"},{"id":"q3","category":"기초이론","type":"multiple-choice","points":5,"title":"다음 4/4박자 악보에서 한 마디를 온전하게 완성하기 위해 빈칸(쉼표 자리)에 들어가야 할 쉼표로 알맞은 것은?","hasScore":true,"scoreAbc":"X:1\nM:4/4\nL:1/4\nK:C\nc2 c z |]","hasAudio":false,"options":["온쉼표","2분쉼표","4분쉼표","8분쉼표","16분쉼표"],"correctAnswer":"3","explanation":"4/4박자는 한 마디에 4분음표 4개(4박)가 들어가야 합니다. 악보에는 2분음표(2박) + 4분음표(1박) = 3박이 채워져 있으므로 남은 박자는 1박, 즉 4분쉼표가 필요합니다.","difficulty":"중"},{"id":"q4","category":"청음/감상","type":"multiple-choice","points":5,"title":"[청음 문제] 재생되는 멜로디를 듣고, 악보의 빈 마디에 연주된 올바른 리듬 및 음형을 고르시오.","hasScore":true,"scoreAbc":"X:1\nM:4/4\nL:1/4\nK:C\nc d e f | g2 g2 |]","hasAudio":true,"options":["도-레-미-파 | 솔--- (4박)","도-레-미-파 | 솔-솔- (각 2박)","도-미-솔-도 | 솔-솔- (각 2박)","레-파-라-도 | 미--- (4박)","도-도-레-레 | 미-솔- (각 2박)"],"correctAnswer":"2","explanation":"상행 4개 음(도-레-미-파) 후 솔 음이 2분음표 2개로 2박씩 유지됩니다.","difficulty":"중"},{"id":"q5","category":"악곡분석","type":"multiple-choice","points":5,"title":"다음 제시된 화음의 종류(코드 네임)로 가장 적절한 것은?","hasScore":true,"scoreAbc":"X:1\nM:C\nL:1/1\nK:C\n[CEG] |]","hasAudio":true,"options":["C (C Major)","Cm (C minor)","Cdim (감화음)","Caug (증화음)","C7 (속7화음)"],"correctAnswer":"1","explanation":"도(C)-미(E)-솔(G)로 구성된 기본 3화음은 장3도+단3도 결합인 C Major(장3화음)입니다.","difficulty":"하"},{"id":"q6","category":"국악","type":"short-answer","points":5,"title":"우리나라 전통 장단 중 보통 빠르기의 3박자 계통으로, 민요 <아리랑>, <도라지타령>의 반주에 널리 쓰이는 장단의 이름을 쓰시오.","hasScore":false,"scoreAbc":"","hasAudio":false,"options":[],"correctAnswer":"세마치 장단","explanation":"세마치 장단은 덩-덕 쿵덕덕 등의 구음으로 이루어진 대표적인 3박(9/8박자 체계) 장단이며 아리랑, 도라지타령 등에 쓰입니다.","difficulty":"중"}],"subject":"music"}',
  'kanban',
  'purple',
  '퀴즈',
  true
)
ON CONFLICT (id) DO UPDATE SET
  title = '__CURRENT_ACTIVE_QUIZ__',
  description = EXCLUDED.description;
