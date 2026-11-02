-- ========================================================
-- 🏫 [바이브코딩 / 105207] util 모둠 및 핵심 유틸 카드 7개 원자적 직주입 SQL
-- Supabase 대시보드 -> [SQL Editor] -> [New query] 붙여넣고 [Run] 실행
-- ========================================================

-- 1. 보드의 모둠(columns)에 'util' 추가 및 보드 정보 등록/수정
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
  description = '바이브
<!--SCHOOLPAD_BOARD_META:{"columns":["Ai 모델","몸플기 예제","실습","util"],"code":"105207","title":"바이브코딩"}-->';

-- 2. 기존 숨겨졌던 추첨/사다리타기 카드를 'util' 모둠으로 이동
UPDATE public.posts
SET column_name = 'util',
    content = 'https://share.gemini.google/yyOMyc6RXDQb' || E'\n' || '<!--SCHOOLPAD_META:{"order":8,"column":"util"}-->'
WHERE id = 'post-1793581581286-uh0n';

UPDATE public.posts
SET column_name = 'util',
    content = '발표자 랜덤 추첨 어플 만들꺼야 사다리타기 만들어줘 10명 가상으로 만들어주고 편의성 생각해서 알아서 작업해줘' || E'\n' || '<!--SCHOOLPAD_META:{"order":9,"column":"util"}-->'
WHERE id = 'post-1793581889054-o2rj';

-- 3. 요청하신 핵심 유틸 카드 7개 다이렉트 직주입 (GitHub, Vercel, Firebase, Hermes, v0, Bolt, Lovable)
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
