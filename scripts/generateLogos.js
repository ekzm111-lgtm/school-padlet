const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'logos');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function cardSvg({ bgGradient, iconSvg, title, subtitle, badgeText, badgeColor = '#3B82F6' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" style="background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.08" />
    </filter>
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.15" />
    </filter>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
      ${bgGradient}
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="800" height="450" fill="#ffffff" />
  
  <!-- Outer Decorative Soft Card -->
  <rect x="24" y="24" width="752" height="402" rx="28" fill="url(#cardGrad)" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadow)" />
  
  <!-- Inner White Logo Stage -->
  <rect x="52" y="52" width="696" height="346" rx="22" fill="#ffffff" fill-opacity="0.96" stroke="#F1F5F9" stroke-width="1.5" />

  <!-- Badge / Category Tag -->
  <g transform="translate(84, 86)">
    <rect width="auto" height="30" rx="15" fill="${badgeColor}" fill-opacity="0.12" />
    <text x="14" y="20" fill="${badgeColor}" font-size="13" font-weight="800" letter-spacing="0.5">${badgeText}</text>
  </g>

  <!-- Main Brand Icon -->
  <g transform="translate(84, 136)" filter="url(#iconShadow)">
    ${iconSvg}
  </g>

  <!-- Title & Subtitle -->
  <text x="240" y="210" fill="#0F172A" font-size="38" font-weight="900" letter-spacing="-0.8">${title}</text>
  <text x="240" y="252" fill="#64748B" font-size="17" font-weight="600">${subtitle}</text>

  <!-- Bottom Official Verification Marker -->
  <g transform="translate(240, 280)">
    <circle cx="8" cy="8" r="7" fill="#10B981" />
    <path d="M5 8.5 L7.2 10.5 L11.5 5.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <text x="22" y="12" fill="#475569" font-size="13" font-weight="700">학교 공식 인증 교육 사이트 (Official)</text>
  </g>
</svg>`;
}

const LOGOS = [
  // 1. QuizN
  {
    name: 'quizn.svg',
    bgGradient: '<stop offset="0%" stop-color="#F5F3FF"/><stop offset="100%" stop-color="#EDE9FE"/>',
    badgeText: '🎯 실시간 대결 퀴즈',
    badgeColor: '#7C3AED',
    title: 'QuizN 퀴즈앤',
    subtitle: '수업 시간에 실시간으로 참여하는 대한민국 1위 인터랙티브 퀴즈',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#7C3AED" />
      <circle cx="62" cy="56" r="30" fill="none" stroke="#FBBF24" stroke-width="10" />
      <path d="M74 68 L92 88" stroke="#F43F5E" stroke-width="11" stroke-linecap="round" />
      <circle cx="62" cy="56" r="14" fill="#ffffff" />
      <polygon points="58,50 68,56 58,62" fill="#7C3AED" />
    `
  },
  // 2. ZEP QUIZ
  {
    name: 'zep-quiz.svg',
    bgGradient: '<stop offset="0%" stop-color="#EEF2FF"/><stop offset="100%" stop-color="#E0E7FF"/>',
    badgeText: '🕹️ 2D 메타버스 퀴즈',
    badgeColor: '#4F46E5',
    title: 'ZEP QUIZ 젭 퀴즈',
    subtitle: '아바타로 뛰어노는 실시간 서바이벌 & 방탈출 퀴즈 플랫폼',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#4F46E5" />
      <path d="M34 42 H90 L52 82 H90" stroke="#22D3EE" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="90" cy="42" r="6" fill="#F43F5E" />
    `
  },
  // 3. ClassPoint
  {
    name: 'classpoint.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0FDFA"/><stop offset="100%" stop-color="#CCFBF1"/>',
    badgeText: '📊 PPT 인터랙티브 도구',
    badgeColor: '#0D9488',
    title: 'ClassPoint 클래스포인트',
    subtitle: '파워포인트 슬라이드와 결합하는 실시간 설문, 퀴즈 & 워드클라우드',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#0D9488" />
      <circle cx="62" cy="62" r="32" fill="none" stroke="#ffffff" stroke-width="8" stroke-dasharray="150 50" />
      <circle cx="62" cy="62" r="14" fill="#38BDF8" />
      <circle cx="86" cy="46" r="7" fill="#FBBF24" />
    `
  },
  // 4. Kahoot!
  {
    name: 'kahoot.svg',
    bgGradient: '<stop offset="0%" stop-color="#FAF5FF"/><stop offset="100%" stop-color="#F3E8FF"/>',
    badgeText: '🎉 글로벌 게임 퀴즈',
    badgeColor: '#6B21A8',
    title: 'Kahoot! 카훗',
    subtitle: '신나는 음악과 함께 전 세계 교실에서 즐기는 퀴즈 쇼',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#46178F" />
      <text x="62" y="82" fill="#ffffff" font-size="64" font-weight="900" text-anchor="middle">K!</text>
      <circle cx="28" cy="28" r="6" fill="#F43F5E" />
      <circle cx="96" cy="28" r="6" fill="#22C55E" />
      <circle cx="28" cy="96" r="6" fill="#3B82F6" />
      <circle cx="96" cy="96" r="6" fill="#EAB308" />
    `
  },
  // 5. ThinkerBell
  {
    name: 'thinkerbell.svg',
    bgGradient: '<stop offset="0%" stop-color="#FFF7ED"/><stop offset="100%" stop-color="#FFEDD5"/>',
    badgeText: '🔔 형성평가 & 퀴즈',
    badgeColor: '#EA580C',
    title: '띵커벨 ThinkerBell',
    subtitle: '아이스크림미디어 교사 필수 상호작용 퀴즈 & 학습 워크시트',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#EA580C" />
      <path d="M62 30 C48 30 40 42 40 58 C40 76 34 82 30 84 H94 C90 82 84 76 84 58 C84 42 76 30 62 30 Z" fill="#ffffff" />
      <circle cx="62" cy="94" r="8" fill="#FDE047" />
    `
  },
  // 6. Entry
  {
    name: 'entry.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0F9FF"/><stop offset="100%" stop-color="#E0F2FE"/>',
    badgeText: '🤖 대한민국 대표 코딩',
    badgeColor: '#0284C7',
    title: '엔트리 PlayEntry',
    subtitle: '네이버 커넥트재단의 초·중·고 표준 블록 코딩 & AI 데이터 플랫폼',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#00B0FF" />
      <rect x="30" y="32" width="64" height="20" rx="8" fill="#ffffff" />
      <rect x="30" y="54" width="46" height="18" rx="7" fill="#FFA000" />
      <rect x="30" y="74" width="64" height="20" rx="8" fill="#ffffff" />
      <circle cx="86" cy="63" r="8" fill="#ffffff" />
    `
  },
  // 7. Scratch
  {
    name: 'scratch.svg',
    bgGradient: '<stop offset="0%" stop-color="#FFFBEB"/><stop offset="100%" stop-color="#FEF3C7"/>',
    badgeText: '🐱 창의 코딩 커뮤니티',
    badgeColor: '#D97706',
    title: '스크래치 MIT Scratch',
    subtitle: 'MIT 미디어랩이 개발한 전 세계 수천만 청소년의 창의 코딩 공간',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#FFAB19" />
      <!-- Scratch Cat Head -->
      <circle cx="62" cy="66" r="32" fill="#ffffff" />
      <polygon points="34,42 42,60 52,48" fill="#ffffff" />
      <polygon points="90,42 82,60 72,48" fill="#ffffff" />
      <circle cx="50" cy="64" r="5" fill="#4B5563" />
      <circle cx="74" cy="64" r="5" fill="#4B5563" />
      <polygon points="62,72 58,76 66,76" fill="#F43F5E" />
    `
  },
  // 8. Hour of Code
  {
    name: 'hourofcode.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0FDFA"/><stop offset="100%" stop-color="#CCFBF1"/>',
    badgeText: '⏳ 1시간 글로벌 코딩',
    badgeColor: '#0D9488',
    title: 'Hour of Code 아워오브코드',
    subtitle: '마인크래프트, 스타워즈 캐릭터와 함께하는 세계 최대 코딩 캠페인',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#0094A8" />
      <path d="M42 34 H82 L68 62 L82 90 H42 L56 62 Z" fill="#ffffff" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" />
      <circle cx="62" cy="62" r="6" fill="#F59E0B" />
    `
  },
  // 9. Lightbot
  {
    name: 'lightbot.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0F9FF"/><stop offset="100%" stop-color="#E0F2FE"/>',
    badgeText: '💡 알고리즘 퍼즐',
    badgeColor: '#0284C7',
    title: 'Lightbot 라이트봇',
    subtitle: '로봇 길찾기 퍼즐로 순차, 반복, 조건 등 프로그래밍 논리 학습',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#0284C7" />
      <!-- Robot Head -->
      <rect x="36" y="44" width="52" height="46" rx="10" fill="#ffffff" />
      <circle cx="50" cy="62" r="7" fill="#0284C7" />
      <circle cx="74" cy="62" r="7" fill="#0284C7" />
      <!-- Lightbulb antenna -->
      <circle cx="62" cy="30" r="10" fill="#FACC15" />
      <line x1="62" y1="40" x2="62" y2="44" stroke="#ffffff" stroke-width="4" />
    `
  },
  // 10. Rodocodo
  {
    name: 'rodocodo.svg',
    bgGradient: '<stop offset="0%" stop-color="#FAF5FF"/><stop offset="100%" stop-color="#F3E8FF"/>',
    badgeText: '🚀 코딩 어드벤처',
    badgeColor: '#7C3AED',
    title: 'Rodocodo 로도코도',
    subtitle: '초등 눈높이에 맞춘 인터랙티브 캐릭터 코딩 탐험 게임',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#7C3AED" />
      <circle cx="62" cy="58" r="28" fill="#ffffff" />
      <ellipse cx="62" cy="58" rx="20" ry="14" fill="#10B981" />
      <rect x="44" y="86" width="36" height="14" rx="5" fill="#ffffff" />
    `
  },
  // 11. Teachable Machine
  {
    name: 'teachable-machine.svg',
    bgGradient: '<stop offset="0%" stop-color="#FEF2F2"/><stop offset="100%" stop-color="#FEE2E2"/>',
    badgeText: '🧠 구글 노코드 AI',
    badgeColor: '#DC2626',
    title: 'Google Teachable Machine',
    subtitle: '웹캠과 마이크로 이미지, 소리, 자세를 직접 훈련시키는 구글 AI',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#DC2626" />
      <circle cx="44" cy="46" r="14" fill="#3B82F6" />
      <circle cx="80" cy="46" r="14" fill="#FACC15" />
      <circle cx="62" cy="80" r="16" fill="#22C55E" />
      <line x1="44" y1="46" x2="62" y2="80" stroke="#ffffff" stroke-width="4" />
      <line x1="80" y1="46" x2="62" y2="80" stroke="#ffffff" stroke-width="4" />
    `
  },
  // 12. Toctocmath
  {
    name: 'toctocmath.svg',
    bgGradient: '<stop offset="0%" stop-color="#ECFDF5"/><stop offset="100%" stop-color="#D1FAE5"/>',
    badgeText: '🧭 교육부 초등 AI 수학',
    badgeColor: '#059669',
    title: '똑똑! 수학탐험대',
    subtitle: '교육부 & KERIS 공식 개발 인공지능 기반 게임형 초등 수학 학습',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#10B981" />
      <circle cx="62" cy="62" r="34" fill="#ffffff" />
      <polygon points="62,38 72,58 62,54 52,58" fill="#F59E0B" />
      <polygon points="62,86 52,66 62,70 72,66" fill="#0284C7" />
    `
  },
  // 13. AlgeoMath
  {
    name: 'algeomath.svg',
    bgGradient: '<stop offset="0%" stop-color="#EFF6FF"/><stop offset="100%" stop-color="#DBEAFE"/>',
    badgeText: '📐 수학 공학 탐구',
    badgeColor: '#1D4ED8',
    title: '알지오매스 AlgeoMath',
    subtitle: '교육부 & 한국과학창의재단 도형 작도, 함수 그래프 & 코딩 통합 도구',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#1D4ED8" />
      <polygon points="62,32 94,88 30,88" stroke="#ffffff" stroke-width="7" fill="none" stroke-linejoin="round" />
      <circle cx="62" cy="64" r="14" fill="#38BDF8" />
    `
  },
  // 14. Khan Academy
  {
    name: 'khan-academy.svg',
    bgGradient: '<stop offset="0%" stop-color="#ECFDF5"/><stop offset="100%" stop-color="#D1FAE5"/>',
    badgeText: '🌱 글로벌 맞춤 학습',
    badgeColor: '#047857',
    title: 'Khan Academy 칸아카데미',
    subtitle: '누구에게나 무료로 제공되는 세계적인 수준별 맞춤 수학 교육',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#14BF96" />
      <!-- Sprout Hand -->
      <path d="M62 88 V46 C62 34 50 34 50 44 C50 56 62 62 62 62" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M62 58 C62 58 74 52 74 40 C74 30 62 30 62 42" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" />
    `
  },
  // 15. GeoGebra
  {
    name: 'geogebra.svg',
    bgGradient: '<stop offset="0%" stop-color="#EEF2FF"/><stop offset="100%" stop-color="#E0E7FF"/>',
    badgeText: '🌐 동적 수학 소프트웨어',
    badgeColor: '#4338CA',
    title: 'GeoGebra 지오지브라',
    subtitle: '함수 그래프, 기하, 미적분, 3D 통계를 마우스로 조작하는 수학 도구',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#4338CA" />
      <ellipse cx="62" cy="62" rx="36" ry="18" transform="rotate(-30 62 62)" fill="none" stroke="#ffffff" stroke-width="6" />
      <circle cx="40" cy="46" r="6" fill="#38BDF8" />
      <circle cx="76" cy="42" r="6" fill="#F43F5E" />
      <circle cx="84" cy="78" r="6" fill="#FACC15" />
      <circle cx="48" cy="82" r="6" fill="#22C55E" />
    `
  },
  // 16. Desmos
  {
    name: 'desmos.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0FDF4"/><stop offset="100%" stop-color="#DCFCE7"/>',
    badgeText: '📈 반응형 그래프 계산기',
    badgeColor: '#15803D',
    title: 'Desmos 데스모스',
    subtitle: '직관적이고 아름다운 반응형 2차원/3차원 수학 그래프 계산기',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#15803D" />
      <line x1="28" y1="62" x2="96" y2="62" stroke="#ffffff" stroke-width="4" stroke-opacity="0.6" />
      <line x1="62" y1="28" x2="62" y2="96" stroke="#ffffff" stroke-width="4" stroke-opacity="0.6" />
      <path d="M30 84 Q50 20 62 62 T94 40" fill="none" stroke="#FDE047" stroke-width="7" stroke-linecap="round" />
    `
  },
  // 17. EBSMath
  {
    name: 'ebsmath.svg',
    bgGradient: '<stop offset="0%" stop-color="#EFF6FF"/><stop offset="100%" stop-color="#DBEAFE"/>',
    badgeText: '📺 EBS 자기주도학습',
    badgeColor: '#1E40AF',
    title: 'EBSMath 이비에스매쓰',
    subtitle: '웹툰, 동영상, 게임으로 초·중·고 수학 개념을 마스터하는 포털',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#004EA2" />
      <text x="62" y="60" fill="#ffffff" font-size="34" font-weight="900" text-anchor="middle">EBS</text>
      <text x="62" y="90" fill="#F97316" font-size="26" font-weight="900" text-anchor="middle">Math</text>
    `
  },
  // 18. PhET
  {
    name: 'phet.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0F9FF"/><stop offset="100%" stop-color="#E0F2FE"/>',
    badgeText: '🔬 대학 공식 가상실험',
    badgeColor: '#0369A1',
    title: 'PhET 가상실험실',
    subtitle: '콜로라도 대학교 개발 · 물리, 화학, 지구과학 대화형 시뮬레이션',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#0284C7" />
      <ellipse cx="62" cy="62" rx="34" ry="12" fill="none" stroke="#ffffff" stroke-width="4" />
      <ellipse cx="62" cy="62" rx="34" ry="12" transform="rotate(60 62 62)" fill="none" stroke="#ffffff" stroke-width="4" />
      <ellipse cx="62" cy="62" rx="34" ry="12" transform="rotate(120 62 62)" fill="none" stroke="#ffffff" stroke-width="4" />
      <circle cx="62" cy="62" r="10" fill="#FACC15" />
    `
  },
  // 19. Stellarium
  {
    name: 'stellarium.svg',
    bgGradient: '<stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/>',
    badgeText: '🌌 3D 실시간 가상 천문대',
    badgeColor: '#818CF8',
    title: 'STELLARIUM 스텔라리움',
    subtitle: '내 위치 밤하늘의 별자리와 행성을 3D로 실시간 관찰하는 플라네타륨',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#0F172A" />
      <circle cx="62" cy="62" r="22" fill="#FDE047" />
      <ellipse cx="62" cy="62" rx="42" ry="10" transform="rotate(-25 62 62)" fill="none" stroke="#38BDF8" stroke-width="5" />
      <circle cx="34" cy="36" r="3" fill="#ffffff" />
      <circle cx="90" cy="40" r="2" fill="#ffffff" />
      <circle cx="86" cy="88" r="3" fill="#ffffff" />
    `
  },
  // 20. ScienceAll
  {
    name: 'scienceall.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0FDFA"/><stop offset="100%" stop-color="#CCFBF1"/>',
    badgeText: '🧪 창의재단 과학 포털',
    badgeColor: '#0F766E',
    title: '사이언스올 ScienceAll',
    subtitle: '한국과학창의재단 초·중·고 과학 실험실, 웹툰, 과학 상식 종합 포털',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#0D9488" />
      <path d="M52 34 H72 V52 L86 86 H38 L52 52 Z" fill="#ffffff" />
      <path d="M44 80 L50 66 H74 L80 80 Z" fill="#38BDF8" />
      <circle cx="62" cy="68" r="4" fill="#ffffff" />
    `
  },
  // 21. Whale Space
  {
    name: 'whalespace.svg',
    bgGradient: '<stop offset="0%" stop-color="#ECFDF5"/><stop offset="100%" stop-color="#D1FAE5"/>',
    badgeText: '🐳 네이버 에듀테크 허브',
    badgeColor: '#059669',
    title: 'NAVER 웨일스페이스',
    subtitle: '하나의 계정으로 브라우저, 학습 도구, AI 서비스를 안전하게 연결',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#00C7AE" />
      <!-- Whale Tail -->
      <path d="M62 86 C62 62 46 44 28 42 C46 54 60 48 62 36 C64 48 78 54 96 42 C78 44 62 62 62 86 Z" fill="#ffffff" />
    `
  },
  // 22. Whale Class
  {
    name: 'whaleclass.svg',
    bgGradient: '<stop offset="0%" stop-color="#F0FDFA"/><stop offset="100%" stop-color="#CCFBF1"/>',
    badgeText: '🏫 온라인 학급 관리 LMS',
    badgeColor: '#0F766E',
    title: '웨일클래스 Whale Class',
    subtitle: '출결 관리, 과제 제출, 화상 회의를 한곳에서 운영하는 학교 LMS',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#0D9488" />
      <polygon points="62,34 94,50 62,66 30,50" fill="#ffffff" />
      <path d="M42 56 V78 C42 86 82 86 82 78 V56" stroke="#ffffff" stroke-width="5" fill="none" />
      <line x1="90" y1="52" x2="90" y2="76" stroke="#FDE047" stroke-width="4" />
    `
  },
  // 23. Google Classroom
  {
    name: 'google-classroom.svg',
    bgGradient: '<stop offset="0%" stop-color="#FEF9C3"/><stop offset="100%" stop-color="#FEF08A"/>',
    badgeText: '🎒 글로벌 표준 학급 LMS',
    badgeColor: '#854D0E',
    title: 'Google Classroom 클래스룸',
    subtitle: '전 세계 교실에서 가장 널리 쓰이는 구글의 교육용 과제 & 소통 솔루션',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#F59E0B" />
      <rect x="24" y="24" width="76" height="76" rx="14" fill="#15803D" />
      <!-- Chalkboard People -->
      <circle cx="62" cy="52" r="10" fill="#ffffff" />
      <path d="M46 76 C46 66 78 66 78 76" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" />
    `
  },
  // 24. MS Teams
  {
    name: 'ms-teams.svg',
    bgGradient: '<stop offset="0%" stop-color="#EEF2FF"/><stop offset="100%" stop-color="#E0E7FF"/>',
    badgeText: '👥 화상 수업 & 모둠 협업',
    badgeColor: '#4338CA',
    title: 'Microsoft Teams 팀즈',
    subtitle: '실시간 온라인 화상 수업, 조별 모둠 협업 및 피드백 허브',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#4F46E5" />
      <rect x="30" y="38" width="48" height="48" rx="10" fill="#6366F1" />
      <rect x="46" y="38" width="48" height="48" rx="10" fill="#4338CA" />
      <text x="70" y="74" fill="#ffffff" font-size="36" font-weight="900" text-anchor="middle">T</text>
    `
  },
  // 25. Digital Textbook
  {
    name: 'digital-textbook.svg',
    bgGradient: '<stop offset="0%" stop-color="#EFF6FF"/><stop offset="100%" stop-color="#DBEAFE"/>',
    badgeText: '📖 교육부 공식 교과서',
    badgeColor: '#1E40AF',
    title: '디지털교과서 웹뷰어',
    subtitle: '에듀넷 티-클리어(T-Clear) 초·중·고 교과서 온라인 웹 뷰어',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#2563EB" />
      <path d="M62 46 C50 36 34 38 30 40 V86 C34 84 50 82 62 92 C74 82 90 84 94 86 V40 C90 38 74 36 62 46 Z" fill="#ffffff" />
      <line x1="62" y1="46" x2="62" y2="92" stroke="#2563EB" stroke-width="4" />
    `
  },
  // 26. MiriCanvas
  {
    name: 'miricanvas.svg',
    bgGradient: '<stop offset="0%" stop-color="#FFF1F2"/><stop offset="100%" stop-color="#FFE4E6"/>',
    badgeText: '🎨 디자인 협업 도구',
    badgeColor: '#E11D48',
    title: '미리캔버스 MiriCanvas',
    subtitle: '발표 PPT, 카드뉴스, 포스터를 디자이너처럼 만드는 디자인 솔루션',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#F43F5E" />
      <path d="M38 78 V46 L62 68 L86 46 V78" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="62" cy="38" r="6" fill="#FDE047" />
    `
  },
  // 27. Padlet
  {
    name: 'padlet.svg',
    bgGradient: '<stop offset="0%" stop-color="#FFFBEB"/><stop offset="100%" stop-color="#FEF3C7"/>',
    badgeText: '📌 협업 화이트보드',
    badgeColor: '#D97706',
    title: 'padlet 패들렛',
    subtitle: '온라인 협업 화이트보드의 대명사! 전 세계 교실 소통 플랫폼',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#18181B" />
      <polygon points="62,32 86,60 62,54 38,60" fill="#FF3D00" />
      <polygon points="62,54 86,60 62,92 38,60" fill="#F59E0B" />
    `
  },
  // 28. Google Trends
  {
    name: 'google-trends.svg',
    bgGradient: '<stop offset="0%" stop-color="#EFF6FF"/><stop offset="100%" stop-color="#DBEAFE"/>',
    badgeText: '📊 실시간 빅데이터 탐구',
    badgeColor: '#1D4ED8',
    title: 'Google Trends 구글트렌드',
    subtitle: '전 세계 실시간 검색어 트렌드와 빅데이터 그래프 비교 분석',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#2563EB" />
      <polyline points="32,84 54,64 70,74 92,40" stroke="#FBBF24" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="92" cy="40" r="7" fill="#ffffff" />
    `
  },
  // 29. Green i-Net
  {
    name: 'greeninet.svg',
    bgGradient: '<stop offset="0%" stop-color="#ECFDF5"/><stop offset="100%" stop-color="#D1FAE5"/>',
    badgeText: '🛡️ 청소년 유해정보 차단',
    badgeColor: '#059669',
    title: '그린i-Net 청소년보호',
    subtitle: '방송통신위원회 무료 보급 안심 인터넷 필터링 소프트웨어',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#10B981" />
      <path d="M62 30 L88 42 V64 C88 80 62 94 62 94 C62 94 36 80 36 64 V42 Z" fill="#ffffff" />
      <path d="M52 62 L60 70 L74 54" stroke="#10B981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    `
  },
  // 30. AI Ethics / KOSAC
  {
    name: 'ai-ethics.svg',
    bgGradient: '<stop offset="0%" stop-color="#F5F3FF"/><stop offset="100%" stop-color="#EDE9FE"/>',
    badgeText: '🌱 디지털새싹 & AI 윤리',
    badgeColor: '#6D28D9',
    title: '디지털새싹 & AI 윤리',
    subtitle: '한국과학창의재단 초·중·고 디지털 시민성 & 올바른 인공지능 윤리 포털',
    iconSvg: `
      <rect width="124" height="124" rx="26" fill="#7C3AED" />
      <circle cx="62" cy="62" r="32" fill="#ffffff" />
      <!-- Sprout -->
      <path d="M62 76 V50 C62 40 50 40 50 50 C50 60 62 64 62 64" stroke="#10B981" stroke-width="5" stroke-linecap="round" fill="none" />
      <path d="M62 60 C62 60 72 56 72 46 C72 38 62 38 62 48" stroke="#10B981" stroke-width="5" stroke-linecap="round" fill="none" />
    `
  }
];

let created = 0;
for (const item of LOGOS) {
  const svgContent = cardSvg(item);
  const targetPath = path.join(outDir, item.name);
  fs.writeFileSync(targetPath, svgContent, 'utf-8');
  created++;
}

console.log(`Successfully generated ${created} official brand SVGs in ${outDir}`);
