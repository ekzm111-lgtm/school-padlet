const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const BOARD_ID = 'board-1792975588752';
const bookCover = 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80';
const correctColumns = [
  'Ai 모델',
  '몸풀기 예제',
  '실습',
  'util',
  '바이브코딩 편집기',
  '무료 AI (api)',
  '샘플1 공유',
  '샘플2 공유'
];

// 43개 전체 게시글 원본 마스터 데이터베이스 정의
const masterPosts = [
  // 1. Ai 모델 (5개)
  {
    id: 'post-1792977291967-r8qr',
    board_id: BOARD_ID,
    column_id: 'Ai 모델',
    column_name: 'Ai 모델',
    title: 'Gemini.google.com',
    content: 'Google의 첨단 멀티모달 AI 모델 제미나이 공식 웹사이트입니다.\n<!--SCHOOLPAD_META:{"order":0,"column":"Ai 모델"}-->',
    color: 'blue',
    link_url: 'https://gemini.google.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 0,
    created_at: '2026-10-26T01:14:54.712Z'
  },
  {
    id: 'post-1793754025172-c015',
    board_id: BOARD_ID,
    column_id: 'Ai 모델',
    column_name: 'Ai 모델',
    title: 'Chat GPT',
    content: 'OpenAI의 대화형 인공지능 서비스 ChatGPT 공식 사이트입니다.\n<!--SCHOOLPAD_META:{"order":1,"column":"Ai 모델"}-->',
    color: 'green',
    link_url: 'https://chat.openai.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 1,
    created_at: '2026-11-04T01:00:26.520Z'
  },
  {
    id: 'post-1793584388574-xefi',
    board_id: BOARD_ID,
    column_id: 'Ai 모델',
    column_name: 'Ai 모델',
    title: 'Claude AI',
    content: 'Anthropic의 강력한 코딩 및 추론 AI 클로드 공식 사이트입니다.\n<!--SCHOOLPAD_META:{"order":2,"column":"Ai 모델"}-->',
    color: 'purple',
    link_url: 'https://claude.ai',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 2,
    created_at: '2026-11-02T01:55:49.865Z'
  },
  {
    id: 'post-1793753890383-99km',
    board_id: BOARD_ID,
    column_id: 'Ai 모델',
    column_name: 'Ai 모델',
    title: 'grok',
    content: 'xAI의 실시간 트렌드 기반 인공지능 Grok\n<!--SCHOOLPAD_META:{"order":3,"column":"Ai 모델"}-->',
    color: 'yellow',
    link_url: 'https://grok.x.ai',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 3,
    created_at: '2026-11-04T00:58:11.833Z'
  },
  {
    id: 'post-1793583968829-o4zw',
    board_id: BOARD_ID,
    column_id: 'Ai 모델',
    column_name: 'Ai 모델',
    title: 'meta.ai',
    content: '메타의 오픈소스 Llama 기반 AI 어시스턴트\n<!--SCHOOLPAD_META:{"order":4,"column":"Ai 모델"}-->',
    color: 'blue',
    link_url: 'https://www.meta.ai',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 4,
    created_at: '2026-11-02T01:51:56.271Z'
  },

  // 2. 몸풀기 예제 (5개)
  {
    id: 'post-1794191037082-lbrm',
    board_id: BOARD_ID,
    column_id: '몸풀기 예제',
    column_name: '몸풀기 예제',
    title: '메타 ai로 만든 테트리스',
    content: '메타 AI 프롬프트 한 번으로 생성한 웹 브라우저 테트리스 게임 코드 예제입니다.\n<!--SCHOOLPAD_META:{"order":-1,"column":"몸풀기 예제"}-->',
    color: 'yellow',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: -1,
    created_at: '2026-11-09T02:23:57.082Z'
  },
  {
    id: 'post-1793766423176-wss7',
    board_id: BOARD_ID,
    column_id: '몸풀기 예제',
    column_name: '몸풀기 예제',
    title: '테트리스',
    content: 'HTML5 캔버스를 이용한 반응형 테트리스 게임 예시\n<!--SCHOOLPAD_META:{"order":5,"column":"몸풀기 예제"}-->',
    color: 'green',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 5,
    created_at: '2026-11-09T07:13:24.541Z'
  },
  {
    id: 'post-1793584050821-ke8d',
    board_id: BOARD_ID,
    column_id: '몸풀기 예제',
    column_name: '몸풀기 예제',
    title: '샘플1',
    content: '기초 웹 프로그래밍 실습 예제 1번입니다.\n<!--SCHOOLPAD_META:{"order":6,"column":"몸풀기 예제"}-->',
    color: 'white',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 6,
    created_at: '2026-11-02T01:50:30.515Z'
  },
  {
    id: 'post-1793584162101-g1bs',
    board_id: BOARD_ID,
    column_id: '몸풀기 예제',
    column_name: '몸풀기 예제',
    title: '샘플2',
    content: '자바스크립트 이벤트 조작 및 버튼 인터랙션 예시 2번입니다.\n<!--SCHOOLPAD_META:{"order":7,"column":"몸풀기 예제"}-->',
    color: 'purple',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 7,
    created_at: '2026-11-09T07:13:16.446Z'
  },
  {
    id: 'post-1793584255517-dfeb',
    board_id: BOARD_ID,
    column_id: '몸풀기 예제',
    column_name: '몸풀기 예제',
    title: '샘플3',
    content: 'CSS 애니메이션과 키프레임을 적용한 시각 효과 예제입니다.\n<!--SCHOOLPAD_META:{"order":8,"column":"몸풀기 예제"}-->',
    color: 'pink',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 8,
    created_at: '2026-11-02T01:54:05.756Z'
  },

  // 3. 실습 (7개)
  {
    id: 'post-1794185500000-shortcuts',
    board_id: BOARD_ID,
    column_id: '실습',
    column_name: '실습',
    title: '자주 사용하는 단축키',
    content: '윈도우/맥 주요 필수 단축키 (Win+V 클립보드, Win+Shift+S 캡처, Ctrl+C/V 등)\n<!--SCHOOLPAD_META:{"order":0,"column":"실습"}-->',
    color: 'white',
    author_id: 'anon-shortcuts',
    author_name: '익명 참여자',
    author_role: 'student',
    order_index: 0,
    created_at: '2026-11-09T01:42:41.297Z'
  },
  {
    id: 'post-1793764543918-u8ry',
    board_id: BOARD_ID,
    column_id: '실습',
    column_name: '실습',
    title: 'PPT',
    content: '바이브코딩 실습 안내 발표자료 PPT 슬라이드입니다.\n<!--SCHOOLPAD_META:{"order":10,"column":"실습"}-->',
    color: 'yellow',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 10,
    created_at: '2026-11-04T03:55:44.839Z'
  },
  {
    id: 'post-1793579202455-nvyc',
    board_id: BOARD_ID,
    column_id: '실습',
    column_name: '실습',
    title: '교육자료',
    content: '수업에 활용하는 핵심 강의안 및 학습지 모음입니다.\n<!--SCHOOLPAD_META:{"order":11,"column":"실습"}-->',
    color: 'blue',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 11,
    created_at: '2026-11-02T00:27:29.240Z'
  },
  {
    id: 'post-1793578831407-zjtd',
    board_id: BOARD_ID,
    column_id: '실습',
    column_name: '실습',
    title: '실습 안내 가이드',
    content: '학생별 PC 및 모바일 실습 접속 방법과 제출 규칙입니다.\n<!--SCHOOLPAD_META:{"order":12,"column":"실습"}-->',
    color: 'green',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 12,
    created_at: '2026-11-02T00:21:31.996Z'
  },
  {
    id: 'post-1792976199496-gz3p',
    board_id: BOARD_ID,
    column_id: '실습',
    column_name: '실습',
    title: '엑셀시트 데이터',
    content: '구글 스프레드시트 연동 및 실시간 데이터 취합 실습입니다.\n<!--SCHOOLPAD_META:{"order":14,"column":"실습"}-->',
    color: 'blue',
    author_id: 'user-excel',
    author_name: '엑셀시트',
    author_role: 'student',
    order_index: 14,
    created_at: '2026-10-26T00:56:41.849Z'
  },
  {
    id: 'post-1792976151471-8cx1',
    board_id: BOARD_ID,
    column_id: '실습',
    column_name: '실습',
    title: 'QR 동의서',
    content: '구글 앱스스크립트를 활용한 모바일 QR 동의서 실습 양식입니다.\n<!--SCHOOLPAD_META:{"order":15,"column":"실습"}-->',
    color: 'white',
    link_url: 'https://script.google.com/macros/s/AKfycbxtLOpZtK2k0ewB8ypdT5qiKpPbOaA7brdTbKNkoAcQcIyKna02UQG3lIz_AYS4VYSl/exec?mode=admin',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 15,
    created_at: '2026-10-26T00:55:53.832Z'
  },
  {
    id: 'post-1792976116392-ctjx',
    board_id: BOARD_ID,
    column_id: '실습',
    column_name: '실습',
    title: 'QR 샘플',
    content: 'QR 코드 생성 및 모바일 카메라 스캔 테스트 샘플입니다.\n<!--SCHOOLPAD_META:{"order":16,"column":"실습"}-->',
    color: 'yellow',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 16,
    created_at: '2026-10-26T00:55:18.915Z'
  },

  // 4. util (10개)
  {
    id: 'post-1793754223837-bndu',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'github.com',
    content: '세계 최대의 소스코드 호스팅 및 버전 관리(Git) 플랫폼\n<!--SCHOOLPAD_META:{"order":17,"column":"util"}-->',
    color: 'white',
    link_url: 'https://github.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 17,
    created_at: '2026-11-04T01:03:45.874Z'
  },
  {
    id: 'post-1793754279438-eibo',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'https://vercel.com/',
    content: 'Next.js 및 모던 웹 애플리케이션 원클릭 글로벌 배포 플랫폼\n<!--SCHOOLPAD_META:{"order":18,"column":"util"}-->',
    color: 'white',
    link_url: 'https://vercel.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 18,
    created_at: '2026-11-04T01:04:41.134Z'
  },
  {
    id: 'post-util-fb',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'Firebase 콘솔',
    content: 'Google Cloud 기반 Firestore DB, Auth, Hosting 웹 백엔드 서비스 콘솔\n<!--SCHOOLPAD_META:{"order":19,"column":"util"}-->',
    color: 'yellow',
    link_url: 'https://console.firebase.google.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 19,
    created_at: '2026-11-04T00:37:39.803Z'
  },
  {
    id: 'post-1793757685743-ow76',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'school-padlet / 소스',
    content: '스쿨패들렛 오픈소스 저장소 코드 및 배포 설정 가이드\n<!--SCHOOLPAD_META:{"order":20,"column":"util"}-->',
    color: 'purple',
    link_url: 'https://github.com/ekzm111-lgtm/school-padlet',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 20,
    created_at: '2026-11-04T02:01:28.536Z'
  },
  {
    id: 'post-1793754443164-90kz',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'GameGo 제미나이 할인',
    content: 'AI 구독 및 프로 계정 프로모션 참고 사이트\n<!--SCHOOLPAD_META:{"order":21,"column":"util"}-->',
    color: 'blue',
    link_url: 'https://www.gamsgo.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 21,
    created_at: '2026-11-04T01:07:24.541Z'
  },
  {
    id: 'post-1793762412836-0v91',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'photocraft',
    content: 'AI 이미지 생성 및 사진 편집 크래프트 툴\n<!--SCHOOLPAD_META:{"order":22,"column":"util"}-->',
    color: 'pink',
    link_url: 'https://photocraft.ai',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 22,
    created_at: '2026-11-04T03:20:14.235Z'
  },
  {
    id: 'post-1793755373304-prpy',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'https://www.urlshort.dev/  긴 URL 주소 줄여주는 사이',
    content: '복잡하고 긴 수업 링크나 QR URL을 간결하게 줄여주는 유틸리티\n<!--SCHOOLPAD_META:{"order":23,"column":"util"}-->',
    color: 'yellow',
    link_url: 'https://www.urlshort.dev/',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 23,
    created_at: '2026-11-04T01:22:54.704Z'
  },
  {
    id: 'post-1794184173653-oqe2',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: '제미나이 프로 구',
    content: 'Gemini Pro 최신 버전 활용 및 API 키 발급 센터\n<!--SCHOOLPAD_META:{"order":24,"column":"util"}-->',
    color: 'green',
    link_url: 'https://aistudio.google.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 24,
    created_at: '2026-11-09T00:29:34.613Z'
  },
  {
    id: 'post-1794183819235-tthk',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: '숏.한',
    content: '한국형 한글 단축 URL 서비스\n<!--SCHOOLPAD_META:{"order":25,"column":"util"}-->',
    color: 'purple',
    link_url: 'https://xn--oi2b61g.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 25,
    created_at: '2026-11-09T00:23:40.731Z'
  },
  {
    id: 'post-util-her',
    board_id: BOARD_ID,
    column_id: 'util',
    column_name: 'util',
    title: 'Hermes Agent (헤르메스 에이전트)',
    content: 'NousResearch의 자율형 AI 에이전트 & Function Calling 오픈소스 프레임워크\n<!--SCHOOLPAD_META:{"order":0,"column":"util"}-->',
    color: 'purple',
    link_url: 'https://github.com/NousResearch/hermes-agent',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 0,
    created_at: '2026-11-09T23:50:57.787Z'
  },

  // 5. 바이브코딩 편집기 (6개)
  {
    id: 'post-1793755789048-kkhb',
    board_id: BOARD_ID,
    column_id: '바이브코딩 편집기',
    column_name: '바이브코딩 편집기',
    title: '클로드코드',
    content: '터미널 기반의 차세대 Agentic 코딩 도구 Claude Code\n<!--SCHOOLPAD_META:{"order":26,"column":"바이브코딩 편집기"}-->',
    color: 'purple',
    link_url: 'https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 26,
    created_at: '2026-11-04T01:29:50.484Z'
  },
  {
    id: 'post-1793755229495-xdus',
    board_id: BOARD_ID,
    column_id: '바이브코딩 편집기',
    column_name: '바이브코딩 편집기',
    title: 'codex',
    content: 'OpenAI의 코드 생성 모델 및 IDE 통합 개발 환경\n<!--SCHOOLPAD_META:{"order":27,"column":"바이브코딩 편집기"}-->',
    color: 'green',
    link_url: 'https://openai.com/blog/openai-codex',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 27,
    created_at: '2026-11-04T01:20:30.970Z'
  },
  {
    id: 'post-1793754921630-wr2x',
    board_id: BOARD_ID,
    column_id: '바이브코딩 편집기',
    column_name: '바이브코딩 편집기',
    title: 'antigravity   google',
    content: 'Google DeepMind 팀의 차세대 에이전틱 AI 코딩 어시스턴트\n<!--SCHOOLPAD_META:{"order":28,"column":"바이브코딩 편집기"}-->',
    color: 'blue',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 28,
    created_at: '2026-11-04T01:16:07.210Z'
  },
  {
    id: 'post-1793754982598-2m5p',
    board_id: BOARD_ID,
    column_id: '바이브코딩 편집기',
    column_name: '바이브코딩 편집기',
    title: 'opencode.ai',
    content: '브라우저 상에서 AI와 함께 코딩하는 오픈 인터랙티브 에디터\n<!--SCHOOLPAD_META:{"order":29,"column":"바이브코딩 편집기"}-->',
    color: 'yellow',
    link_url: 'https://opencode.ai',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 29,
    created_at: '2026-11-04T01:17:09.820Z'
  },
  {
    id: 'post-1793753971111-akqz',
    board_id: BOARD_ID,
    column_id: '바이브코딩 편집기',
    column_name: '바이브코딩 편집기',
    title: '헤르메스 에이전트',
    content: '복잡한 멀티스텝 프로그래밍 작업을 자율 수행하는 AI 에이전트\n<!--SCHOOLPAD_META:{"order":30,"column":"바이브코딩 편집기"}-->',
    color: 'white',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 30,
    created_at: '2026-11-04T00:59:32.494Z'
  },
  {
    id: 'post-1793755971601-ji85',
    board_id: BOARD_ID,
    column_id: '바이브코딩 편집기',
    column_name: '바이브코딩 편집기',
    title: 'OpenClaw',
    content: '웹 스크래핑 및 크롤링 자동화 오픈소스 도구\n<!--SCHOOLPAD_META:{"order":31,"column":"바이브코딩 편집기"}-->',
    color: 'pink',
    link_url: 'https://openclaw.ai',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 31,
    created_at: '2026-11-04T01:32:53.015Z'
  },

  // 6. 무료 AI (api) (4개)
  {
    id: 'post-1793756207679-cy96',
    board_id: BOARD_ID,
    column_id: '무료 AI (api)',
    column_name: '무료 AI (api)',
    title: 'nvidia.com',
    content: 'NVIDIA NIM 마이크로서비스 및 고성능 AI 추론 API 센터\n<!--SCHOOLPAD_META:{"order":35,"column":"무료 AI (api)"}-->',
    color: 'green',
    link_url: 'https://build.nvidia.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 35,
    created_at: '2026-11-04T01:36:49.332Z'
  },
  {
    id: 'post-1793756370594-1emz',
    board_id: BOARD_ID,
    column_id: '무료 AI (api)',
    column_name: '무료 AI (api)',
    title: 'huggingface',
    content: '머신러닝 오픈소스 모델, 데이터셋 및 Inference API 허브\n<!--SCHOOLPAD_META:{"order":34,"column":"무료 AI (api)"}-->',
    color: 'yellow',
    link_url: 'https://huggingface.co',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 34,
    created_at: '2026-11-04T01:39:32.206Z'
  },
  {
    id: 'post-1793756495586-fzk1',
    board_id: BOARD_ID,
    column_id: '무료 AI (api)',
    column_name: '무료 AI (api)',
    title: 'https://ollama.com/',
    content: '로컬 PC에서 Llama, Gemma, DeepSeek 등을 바로 돌리는 오픈소스 실행기\n<!--SCHOOLPAD_META:{"order":33,"column":"무료 AI (api)"}-->',
    color: 'white',
    link_url: 'https://ollama.com',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 33,
    created_at: '2026-11-04T01:41:37.039Z'
  },
  {
    id: 'post-1793756908313-4aui',
    board_id: BOARD_ID,
    column_id: '무료 AI (api)',
    column_name: '무료 AI (api)',
    title: 'https://openrouter.ai/',
    content: '단 하나의 API 키로 수백 개의 최신 LLM을 통합 호출하는 오픈라우터\n<!--SCHOOLPAD_META:{"order":32,"column":"무료 AI (api)"}-->',
    color: 'blue',
    link_url: 'https://openrouter.ai',
    author_id: 'user-admin',
    author_name: '바이브',
    author_role: 'teacher',
    order_index: 32,
    created_at: '2026-11-04T01:48:29.729Z'
  },

  // 7. 샘플1 공유 (5개 - 학생들 실습 과제)
  {
    id: 'post-1794208379057-gitu',
    board_id: BOARD_ID,
    column_id: '샘플1 공유',
    column_name: '샘플1 공유',
    title: '테트리스',
    content: '김미란 학생의 완성 테트리스 게임 프로젝트입니다.\n<!--SCHOOLPAD_META:{"order":-1,"column":"샘플1 공유"}-->',
    color: 'pink',
    author_id: 'student-miran',
    author_name: '김미란',
    author_role: 'student',
    order_index: -1,
    created_at: '2026-11-09T07:12:59.057Z'
  },
  {
    id: 'post-1794209923014-7f2k',
    board_id: BOARD_ID,
    column_id: '샘플1 공유',
    column_name: '샘플1 공유',
    title: '숫자 맞추기 게임',
    content: '김지영 학생의 실습 제출 결과물입니다.\n<!--SCHOOLPAD_META:{"order":-1,"column":"샘플1 공유"}-->',
    color: 'green',
    author_id: 'student-jiyoung',
    author_name: '김지영',
    author_role: 'student',
    order_index: -1,
    created_at: '2026-11-09T07:38:43.014Z'
  },
  {
    id: 'post-1794208324339-wqn0',
    board_id: BOARD_ID,
    column_id: '샘플1 공유',
    column_name: '샘플1 공유',
    title: '반응형 계산기',
    content: '허브 학생의 계산기 프로젝트 제출물입니다.\n<!--SCHOOLPAD_META:{"order":-1,"column":"샘플1 공유"}-->',
    color: 'blue',
    author_id: 'student-hub',
    author_name: '허브',
    author_role: 'student',
    order_index: -1,
    created_at: '2026-11-11T00:47:17.178Z'
  },
  {
    id: 'post-1794208588017-bzx6',
    board_id: BOARD_ID,
    column_id: '샘플1 공유',
    column_name: '샘플1 공유',
    title: '스톱워치 타이머',
    content: '타이머 만들었어요\n<!--SCHOOLPAD_META:{"comments":[{"id":"c-1794358061796-lrh2","postId":"post-1794208588017-bzx6","authorName":"바이브","authorId":"user-admin","content":"멋져요~~~!!!","createdAt":"방금 전"}],"reactions":{"like":1,"clap":0,"heart":1,"insight":0},"order":-1,"column":"샘플1 공유"}-->',
    color: 'white',
    link_url: 'https://share.gemini.google/bSF4Ye0TJp7q',
    author_id: 'student-1794208003070',
    author_name: '현모시기',
    author_role: 'student',
    order_index: -1,
    created_at: '2026-11-11T00:47:42.937Z'
  },
  {
    id: 'post-1794208587783-1jsd',
    board_id: BOARD_ID,
    column_id: '샘플1 공유',
    column_name: '샘플1 공유',
    title: '테트리',
    content: '양재혁 학생의 테트리스 게임 전체 소스코드 첨부 및 배포물입니다.\n<!--SCHOOLPAD_META:{"order":-1,"column":"샘플1 공유"}-->',
    color: 'yellow',
    author_id: 'student-jaehyuk',
    author_name: '양재혁',
    author_role: 'student',
    order_index: -1,
    created_at: '2026-11-11T00:48:33.155Z'
  }
];

async function fullRestore() {
  console.log(`=== 1. Restoring ${masterPosts.length} posts to Supabase ===`);
  const chunkSize = 10;
  for (let i = 0; i < masterPosts.length; i += chunkSize) {
    const chunk = masterPosts.slice(i, i + chunkSize);
    const { error } = await supabase.from('posts').upsert(chunk);
    if (error) console.error('Chunk insert error:', error);
    else console.log(`Chunk ${i} ~ ${i + chunk.length} upserted successfully`);
  }

  // 시스템 메타 레코드
  await supabase.from('posts').upsert({
    id: 'board_columns_board-1792975588752',
    board_id: BOARD_ID,
    column_id: '__system_meta__',
    title: '__BOARD_COLUMNS_META__',
    content: JSON.stringify({
      columns: correctColumns,
      code: '105207',
      title: '바이브코딩',
      coverImageUrl: bookCover,
      category: '수업자료',
      updatedAt: Date.now()
    }),
    color: 'white',
    author_id: 'system',
    author_name: '시스템'
  });

  // 보드 레코드 업데이트 (올바른 8개 컬럼 + 책 표지)
  const metaPayload = JSON.stringify({
    columns: correctColumns,
    code: '105207',
    title: '바이브코딩',
    description: '바이브코딩 실습 및 AI 도구 활용 보드입니다.',
    coverImageUrl: bookCover,
    customBgUrl: '',
    category: '수업자료',
    theme: 'blue',
    layout: 'kanban',
    isPublic: true,
    updatedAt: Date.now()
  });

  const { error: bErr } = await supabase.from('boards').upsert({
    id: BOARD_ID,
    code: '105207',
    title: '바이브코딩',
    description: `바이브코딩 실습 및 AI 도구 활용 보드입니다.\n<!--SCHOOLPAD_BOARD_META:${metaPayload}-->`,
    theme: 'blue',
    columns: correctColumns,
    cover_image_url: bookCover,
    custom_bg_url: ''
  });

  if (bErr) console.error('Board error:', bErr);
  else console.log('PASS: VibeCoding board updated with 8 correct columns & Book cover');

  // 디지털튜터 보드 및 잔여 데이터 완전 삭제
  await supabase.from('boards').delete().or('id.eq.board-digital-tutor-2025,code.eq.202501');
  await supabase.from('posts').delete().eq('board_id', 'board-digital-tutor-2025');

  console.log('=== Complete Verification ===');
  const { data: checkPosts } = await supabase.from('posts').select('id, column_id, title, author_name').eq('board_id', BOARD_ID);
  console.log('Total verified posts in Supabase:', checkPosts?.length);
  const byCol = {};
  checkPosts?.forEach(p => { byCol[p.column_id] = (byCol[p.column_id] || 0) + 1; });
  console.table(byCol);
}

fullRestore();
