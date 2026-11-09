import type { Question, ExamInfo } from './exam';

export interface QuizAvatar {
  id: string;
  emoji: string;
  imageUrl?: string; // 2등신 고화질 일러스트 벡터 SVG
  name: string;
  title: string;
  category: 'anime' | 'animal' | 'hero';
  bgColor: string;
  catchphrase: string;
  quotes: {
    thinking: string[];
    hurry: string[];
    correct: string[];
    wrong: string[];
    combo: string[];
  };
}

export const QUIZ_AVATARS: QuizAvatar[] = [
  // --- 1. [사용자 추천 1위] 2등신 초귀요미 마스코트 & 웹 일러스트 컬렉션 ---
  {
    id: 'cute-watermelon-frog',
    emoji: '🐸',
    imageUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=WatermelonFroggy&backgroundColor=b6e3f4&radius=20',
    name: '수박 개구리',
    title: '달콤한 2등신 개구리',
    category: 'animal',
    bgColor: 'bg-emerald-500 text-white',
    catchphrase: '개굴개굴! 수박 먹고 정답 쏙! 🍉',
    quotes: {
      thinking: ['개굴~ 수박 한 입 베어물고 지문 읽어봐! 🍉', '연못 속 정답이 개굴개굴 떠오른다! 🌿', '침착하게 생각해보자 개굴!'],
      hurry: ['개구울?! 비 올 시간 다 됐다! 서둘러! ⏰', '폴짝! 빠르게 점프해서 눌러! 🏃‍♂️'],
      correct: ['개굴개굴 만세!! 시원한 수박급 정답! 🍉🎉', '최고야 개굴! 연못에서 제일 똑똑해! ✨'],
      wrong: ['개굴... 다음 잎사귀에서 점프하면 돼! 🌱', '기운 내 개굴! 수박 나눠줄게! 🍉'],
      combo: ['🔥 개굴 파워 콤보 연타 폭발!! 🚀', '물수제비 뜨듯 정답이 퐁당퐁당! 👑'],
    },
  },
  {
    id: 'bubble-frog',
    emoji: '🐸',
    imageUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=BubbleGreenFrog&backgroundColor=ffd5dc&radius=20',
    name: '방울 개구리',
    title: '비눗방울 요정',
    category: 'animal',
    bgColor: 'bg-teal-500 text-white',
    catchphrase: '보글보글 방울 속에 정답이 퐁퐁! 🫧',
    quotes: {
      thinking: ['퐁퐁~ 방울을 불며 천천히 생각해봐! 🫧', '반짝이는 방울 속에 힌트가 있어! ✨', '지문을 차근차근 읽어보자!'],
      hurry: ['방울 터지기 5초 전! 빠르게 콕! ⏰', '톡 터지기 전에 얼른 골라! 💨'],
      correct: ['퐁!! 무지개 방울 정답 대폭발! 🌈🎉', '너무 예쁜 완벽 정답이야! 짱! 🏆'],
      wrong: ['방울이 퐁 터졌네.. 다음 방울 불자! 🥺', '괜찮아! 더 큰 방울을 불면 돼! 🌱'],
      combo: ['💖 무지개 비눗방울 연속 콤보 대축제! 🚀', '하늘 높이 날아가는 무적의 콤보! 👑'],
    },
  },
  {
    id: 'white-chibi-cat',
    emoji: '🐱',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=WhiteCuteKitty&backgroundColor=ffd5dc&radius=20',
    name: '하양 아기냥이',
    title: '초롱초롱 눈망울',
    category: 'animal',
    bgColor: 'bg-rose-400 text-white',
    catchphrase: '초롱초롱 눈으로 정답 응원냥! 🐾',
    quotes: {
      thinking: ['냥냥! 하얀 발로 정답 꼭꼭 찍어줄게! 🐾', '초롱초롱 눈망울로 지문 집중냥! 🐱', '집사야 천천히 풀어보라냥!'],
      hurry: ['냥?! 캔 따는 시간 다 됐어! 서둘러냥! ⏰', '냥냥 펀치로 잽싸게 콕! 💨'],
      correct: ['골골골~ 대박 정답이다냥! 최고다냥! 💖🎉', '츄르 백 개짜리 완벽 정답냥! 🏆'],
      wrong: ['시무룩... 볼 부비부비 해줄게 힘내라냥! 🥺', '다음 문제에서 냥이 파워 보여주자냥! 💪'],
      combo: ['🔥 냥냥 꾹꾹이 콤보 대폭발!! 🐾', '연속 정답에 꼬리가 살랑살랑 신나냥! 🚀'],
    },
  },
  {
    id: 'chibi-fighter-boy',
    emoji: '⚡',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=AnimeFighterBoy&backgroundColor=ffdfbf&radius=20',
    name: '치비 파이터 렌',
    title: '열혈 2등신 격투가',
    category: 'anime',
    bgColor: 'bg-orange-500 text-white',
    catchphrase: '불꽃 스피드로 정답을 강타한다! 🔥',
    quotes: {
      thinking: ['기합을 모아라! 지문 속에 약점이 보인다! 🥋', '내 불꽃 주먹이 정답을 가리키고 있어! 🔥', '흔들리지 말고 집중해!'],
      hurry: ['라운드 종료 5초 전! 전광석화 스피드! ⏰', '필살기 차징 완료! 즉시 타격해! 💨'],
      correct: ['정답 K.O 승리!! 완벽한 일격이었다! 🔥🎉', '봤냐! 우리 콤비의 뜨거운 불꽃 정답! 🏆'],
      wrong: ['타격은 털어내면 된다! 다시 가드를 올려라! 👊', '불꽃은 아직 꺼지지 않았다! 가자! 💪'],
      combo: ['🔥 콤보 연타 작렬! 100 COMBO 돌파다! 🚀', '막을 자가 없다! 최강 챔피언 등극! 👑'],
    },
  },
  {
    id: 'chibi-sailor-star',
    emoji: '🌙',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SailorMagicalStar&backgroundColor=c0aede&radius=20',
    name: '별빛 세일러 루나',
    title: '달콤한 마법소녀',
    category: 'anime',
    bgColor: 'bg-purple-500 text-white',
    catchphrase: '달과 별의 이름으로 정답을 선언해! 🌙✨',
    quotes: {
      thinking: ['달빛의 수호가 함께해! 차분하게 읽어봐! 🌙', '별빛 요정이 정답에 힌트를 주고 있어! ✨', '네 직감을 믿어!'],
      hurry: ['별빛 시간이 저물어간다! 서둘러 마법봉을! ⏰', '달빛 텔레포트처럼 빠르게 골라! 🪄'],
      correct: ['꺄아아! 미라클 별빛 정답 대성공! 🌙🎉', '눈부셔! 온 세상이 반짝이고 있어! ✨🏆'],
      wrong: ['눈물 닦고 다시 일어서자! 용기를 내! 💖', '다음 문제엔 더 밝은 별빛이 뜰 거야! 🌱'],
      combo: ['💖 프리즘 스타라이트 콤보 대폭발! 🌈', '사랑과 정의의 무적 콤보 질주다! 🚀'],
    },
  },
  {
    id: 'chibi-street-boy',
    emoji: '🎧',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ChibiStreetBoy&backgroundColor=b6e3f4&radius=20',
    name: '비트 보이 카이',
    title: '힙합 스트리트 치비',
    category: 'anime',
    bgColor: 'bg-blue-600 text-white',
    catchphrase: '이 퀴즈의 리듬을 타봐! 드랍 더 비트! 🎧',
    quotes: {
      thinking: ['비트에 맞춰서 정답을 찾아보자구! 🎧', '요요~ 멜로디(지문) 속에 플로우가 있어! 🎶', '느낌 오는 번호로 바이브 체크!'],
      hurry: ['마지막 8마디 카운트다운! 롸잇 나우! ⏰', '턴테이블 스크래치처럼 잽싸게 찍어! 💨'],
      correct: ['예아~! 빌보드 1위급 완벽 정답 드랍! 🎧🎉', '비트 찢었다! 이 구역의 퀴즈 마스터! 🏆'],
      wrong: ['박자 한 번 놓친 것뿐이야! 다음 트랙 가자! 🎤', '헤이 브로, 기운 내고 다시 리듬 타! 💪'],
      combo: ['🔥 미친 플로우 연속 콤보 드랍!! 🚀', '헤드폰 터지는 올킬 콤보다! 👑'],
    },
  },
  {
    id: 'chibi-hoodie-girl',
    emoji: '🎀',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ChibiHoodieTwin&backgroundColor=ffd5dc&radius=20',
    name: '양갈래 후드 미아',
    title: '귀염뽀짝 트윈테일',
    category: 'anime',
    bgColor: 'bg-pink-500 text-white',
    catchphrase: '후드 푹 눌러쓰고 정답 정조준! 🎀',
    quotes: {
      thinking: ['양갈래 머리 찰랑! 지문 꼼꼼히 확인 중! 🎀', '후드 속에서 힌트가 반짝반짝! ✨', '너라면 꼭 맞힐 수 있어!'],
      hurry: ['우와아! 시간 다 간다! 5초 카운트! ⏰', '후드 끈 꽉 쥐고 빨리 눌러! 🏃‍♀️'],
      correct: ['와아아!! 정답 맞혔어! 만세 만세! 🎀🎉', '너 진짜 천재 아니야?! 너무 멋져! 🏆'],
      wrong: ['힝 아쉽다.. 그래도 다음엔 꼭 맞힐 거야! 🥺', '내가 곁에서 손 꼭 잡고 응원할게! 🌱'],
      combo: ['🔥 핑크 리본 콤보 대폭발! 꺄아! 🚀', '연속 정답 퍼레이드 시작이다! 👑'],
    },
  },
  {
    id: 'thunder',
    emoji: '⚡',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=PikachuThunder&backgroundColor=ffd5dc&radius=20',
    name: '피카 썬더',
    title: '전기 포켓몬',
    category: 'anime',
    bgColor: 'bg-yellow-400 text-yellow-950',
    catchphrase: '백만볼트 집중력! ⚡',
    quotes: {
      thinking: ['피카피카! 차근차근 읽어봐! ⚡', '정답에 찌릿찌릿 전기가 온다! 💡', '지문 속에 답이 있어! 피카!'],
      hurry: ['피카아악! 5초밖에 안 남았어! ⏰', '서둘러! 백만볼트 스피드! ⚡'],
      correct: ['피카 피카츄우우!! 정답이야! 대박! ⚡🎉', '찌릿찌릿! 완벽한 정답! 최고야! ✨'],
      wrong: ['피카... 아쉽지만 다음 문제에 번개 일격! 💪', '기운 내! 다음 문제는 맞힐 수 있어! 🌱'],
      combo: ['⚡ 슈퍼 콤보 폭발! 피카피카 파워업!! 🔥', '연속 정답 전격 폭발!! 막을 수 없어! 🚀'],
    },
  },
  {
    id: 'swordsman',
    emoji: '⚔️',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=TanjiroSwordsman&backgroundColor=b6e3f4&radius=20',
    name: '열혈 검사 탄지로',
    title: '귀멸의 호흡',
    category: 'anime',
    bgColor: 'bg-emerald-600 text-white',
    catchphrase: '물의 호흡! 정답 일격! 🌊',
    quotes: {
      thinking: ['전집중의 호흡! 마음을 가라앉혀라! 🌊', '정답의 틈새가 보이고 있어! 👀', '끝까지 포기하지 마라!'],
      hurry: ['시간이 다 되어간다! 즉시 베어내라! ⏰', '호흡을 가다듬고 빠르게 결정해! 🏃‍♂️'],
      correct: ['훌륭하다! 정답을 일격에 베어냈다! 🌊🎉', '완벽한 칼날 같은 정답이다! 멋져! 🏆'],
      wrong: ['마음을 꺾지 마라! 일어서서 다음 문제를 베자! 💪', '실패를 딛고 더 강해지는 거다! 🔥'],
      combo: ['🔥 히노카미 카구라! 콤보 폭발이다!! 🔥', '검사의 기백으로 연승 행진이다! 🚀'],
    },
  },
  {
    id: 'pirate',
    emoji: '👒',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=LuffyPirate&backgroundColor=ffd5dc&radius=20',
    name: '밀짚모자 루피',
    title: '미래의 퀴즈왕',
    category: 'anime',
    bgColor: 'bg-rose-500 text-white',
    catchphrase: '난 퀴즈왕이 될 거야! 🍖',
    quotes: {
      thinking: ['고기 먹고 힘내서 풀어보자! 🍖', '감이 딱 오는 게 정답이야! 🌟', '우린 동료니까 널 믿어!'],
      hurry: ['우와아악! 시간 끝난다! 아무거나 찍어! 💨', '기어 세컨드! 빨리 눌러! 🏃‍♂️'],
      correct: ['시싯싯! 맞혔다! 넌 진짜 최고야! 🍖🎉', '대박이다! 1등 항로로 직진하자! 🏆'],
      wrong: ['괜찮아! 맛있는 거 먹고 다음 거 맞히면 돼! 😆', '한 번 넘어진다고 퀴즈왕 못 되냐?! 가자! 💪'],
      combo: ['🔥 기어 피프스 니카 발동! 콤보 대폭발! 🚀', '막을 자가 없다! 퀴즈 신세계 돌파!! 👑'],
    },
  },
  {
    id: 'detective',
    emoji: '👓',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=DetectiveConan&backgroundColor=b6e3f4&radius=20',
    name: '명탐정 코난',
    title: '진실의 추리',
    category: 'anime',
    bgColor: 'bg-blue-600 text-white',
    catchphrase: '진실은 언제나 하나! 🔍',
    quotes: {
      thinking: ['단서를 분석 중이야... 지문을 잘 봐! 🔍', '범인(정답)은 이 안에 있어! 💡', '사소한 차이에 주목해!'],
      hurry: ['시간 제한 트릭이야! 빠르게 추리해! ⏰', '결정적 증거를 선택할 시간이야! 🏃‍♂️'],
      correct: ['추리 성공! 진실은 언제나 하나! 🔍🎉', '역시 내 파트너야! 완벽한 논리였어! 🏆'],
      wrong: ['음, 트릭에 속았군... 다음 단서를 찾자! 🧐', '추리는 다음 페이즈로 이어진다! 기운 내! 💪'],
      combo: ['🔥 명추리 연속 적중! 완벽한 프로파일링! ⚡', '천재 탐정의 콤보 질주다! 🚀'],
    },
  },
  {
    id: 'magical',
    emoji: '🪄',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=MagicalPretty&backgroundColor=ffd5dc&radius=20',
    name: '마법소녀 프리티',
    title: '별빛 마법',
    category: 'anime',
    bgColor: 'bg-pink-400 text-white',
    catchphrase: '사랑과 정의의 이름으로 정답! 💖',
    quotes: {
      thinking: ['반짝반짝 별빛의 기운을 모아봐! ✨', '너의 마음이 향하는 곳이 정답이야! 💖', '차분하게 읽어보자!'],
      hurry: ['어머나! 마법 시간이 얼마 안 남았어! ⏰', '서둘러서 마법봉을 휘둘러! 🪄'],
      correct: ['꺄아아! 별빛 정답 마법 대성공! 💖🎉', '너무 멋져! 반짝반짝 빛나고 있어! ✨'],
      wrong: ['괜찮아, 마법의 눈물 닦고 다시 도전하자! 🥺', '다음 문제엔 무지개빛 행운이 올 거야! 🌱'],
      combo: ['💖 프리즘 스타 콤보 작렬! 눈부셔! 🌈', '사랑과 용기의 무적 콤보다! 🚀'],
    },
  },
  {
    id: 'ninja',
    emoji: '🥷',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/svg?seed=NinjaNaruto&backgroundColor=ffdfbf&radius=20',
    name: '불꽃 닌자 나루토',
    title: '나뭇잎 마을',
    category: 'anime',
    bgColor: 'bg-orange-500 text-white',
    catchphrase: '내 닌자의 길에 오답은 없다! 🍥',
    quotes: {
      thinking: ['집중! 차크라를 모아서 답을 찾아라! 🍥', '내 닌자의 길은 포기하지 않는 거다!', '직감을 믿어라!'],
      hurry: ['비전 시간 제한 술법이다! 서둘러! ⏰', '순신의 술법으로 빨리 찍어! 💨'],
      correct: ['나선환 정답 작렬! 넌 진짜 대단해! 🍥🎉', '봤냐! 이게 바로 우리 팀의 실력이다! 🏆'],
      wrong: ['이 정도 상처쯤이야! 다음 문제에서 반격이다! 😤', '포기하면 거기서 끝인 거다! 가자! 💪'],
      combo: ['🔥 구미호 차크라 개방! 콤보 대폭발이다! 🚀', '분신술처럼 점수가 쏟아진다! 👑'],
    },
  },

  // --- 2. 과목 특화 & 귀여운 마스코트 라인업 ---
  {
    id: 'entrybot',
    emoji: '🤖',
    name: '엔트리봇',
    title: '코딩 알고리즘 마스터',
    category: 'hero',
    bgColor: 'bg-emerald-500 text-white',
    catchphrase: '알고리즘 연산 완료! 💻',
    quotes: {
      thinking: ['블록의 순서와 조건을 꼼꼼히 점검해! 💻', '순차, 선택, 반복 구조를 확인해봐! ⚙️', '디버깅 완료 직전!'],
      hurry: ['런타임 타임아웃 경고! 서둘러 선택해! ⏰', 'CPU 풀가동! 즉시 입력해! 🏃‍♂️'],
      correct: ['컴파일 성공! 100% 버그 없는 정답! 💻🎉', '알고리즘 최적화 완료! 완벽해! 🏆'],
      wrong: ['문법 오류 발견! 다음 루프에서 수정하자! 🔧', '실패는 최고의 데이터야! 힘내! 🌱'],
      combo: ['🔥 초고속 퀀텀 콤보 루프 가동 중!! 🚀', '메모리 초과급 연속 정답 행진! ⚡'],
    },
  },
  {
    id: 'melody',
    emoji: '🎵',
    name: '음악 요정 멜로디',
    title: '오선보 하모니',
    category: 'hero',
    bgColor: 'bg-purple-500 text-white',
    catchphrase: '마음의 소리를 들어봐! 🎶',
    quotes: {
      thinking: ['도레미파솔~ 음표의 박자를 세어봐! 🎶', '마음속으로 멜로디를 흥얼거려봐! 🎼', '아름다운 정답이 들려!'],
      hurry: ['템포가 빨라지고 있어! 알레그로! ⏰', '페르마타 없이 빠르게 선택해! 🏃‍♂️'],
      correct: ['완벽한 화음이야! 딩동댕 하모니! 🎶🎉', '브라보! 명연주 같은 정답이었어! 🏆'],
      wrong: ['잠시 불협화음이었을 뿐이야! 다음 마디로! 🎻', '새로운 조표를 달고 다시 노래하자! 💖'],
      combo: ['🎵 교향곡급 콤보 팡파레 대연주!! 🎺', '크레셴도! 점수가 끝없이 올라가! 🚀'],
    },
  },
  {
    id: 'gamer',
    emoji: '🎮',
    name: '프로 게이머',
    title: 'E스포츠 챔피언',
    category: 'hero',
    bgColor: 'bg-blue-500 text-white',
    catchphrase: '이 판은 내가 캐리한다! GG! 🎮',
    quotes: {
      thinking: ['피지컬과 뇌지컬을 총동원해! 🎮', '상대의 스킬 쿨타임(함정)을 피해! 🕹️', '미니맵(지문) 확인 완료!'],
      hurry: ['존버 끝! 한타 시간이다! 빠르게 눌러! ⏰', '궁극기 온! 즉시 버튼 클릭! 🏃‍♂️'],
      correct: ['킬각 적중! 펜타킬급 정답이다! 🎮🎉', '캐리력 실화냐?! MVP 확정! 🏆'],
      wrong: ['데스는 만회하면 돼! 리스폰 완료! ⚔️', '다음 한타(문제)에서 역전각 잡자! 💪'],
      combo: ['🔥 연속 킬 콤보 달성! 막을 수가 없다! 🚀', 'GOD LIKE! 신의 경지 플레이! 👑'],
    },
  },
  {
    id: 'crew',
    emoji: '🚀',
    name: '우주 크루원',
    title: '어몽 어스 탐사대',
    category: 'hero',
    bgColor: 'bg-cyan-500 text-white',
    catchphrase: '오답 임포스터를 찾아라! 🛸',
    quotes: {
      thinking: ['임포스터(오답)가 누구인지 수색 중! 🔍', '미션을 침착하게 완수하자! 🛸', '벤트 타지 말고 정답으로!'],
      hurry: ['산소 고갈 카운트다운! 빨리 선택해! ⏰', '긴급 회의 소집 전 선택 완료해! 🏃‍♂️'],
      correct: ['임포스터 검거 완료! 완벽한 승리! 🚀🎉', '크루원 승리! 우주선 안전 확보! 🏆'],
      wrong: ['아뿔싸, 억울하게 투표당했어! 다음 방으로! 👻', '유령이 되어도 널 응원할게! 힘내! 🌱'],
      combo: ['🔥 콤보 미션 클리어! 우주선 최고 속도! 🛸', '전 우주가 놀란 연속 정답 행진! 👑'],
    },
  },
  {
    id: 'cat',
    emoji: '🐱',
    name: '사이버 네코미미',
    title: '냥이 마스코트',
    category: 'animal',
    bgColor: 'bg-amber-400 text-amber-950',
    catchphrase: '집사야 정답만 골라라냥! 🐾',
    quotes: {
      thinking: ['냥! 츄르 걸고 맞히는 거다냥! 🐾', '고양이 수염이 정답 쪽으로 쫑긋! 🐱', '침착하게 읽어보라냥!'],
      hurry: ['냥?! 캔 따기 5초 전이다냥! 서둘러! ⏰', '고양이 펀치로 빨리 눌러라냥! 🐾'],
      correct: ['골골송 발동! 대박 정답이다냥! 🐾🎉', '천재 집사님 최고다냥! 츄르 줄게! 💖'],
      wrong: ['시무룩... 털 빗고 다음 문제 맞히자냥! 😿', '실수해도 넌 최고의 집사다냥! 기운 내! 💪'],
      combo: ['🔥 냐옹 콤보 폭풍 꾹꾹이 발동!! 🐾', '연속 정답에 꼬리가 살랑살랑냥! 🚀'],
    },
  },
  {
    id: 'dog',
    emoji: '🐶',
    name: '열정 댕댕이',
    title: '충성 충견',
    category: 'animal',
    bgColor: 'bg-orange-400 text-orange-950',
    catchphrase: '주인님 힘내세요! 멍멍! 🦴',
    quotes: {
      thinking: ['킁킁! 정답 냄새가 솔솔 난다 멍! 🦴', '꼬리 흔들며 응원하고 있다 멍! 🐶', '주인님 파이팅!'],
      hurry: ['산책 시간 다 됐다 멍! 빨리 눌러! ⏰', '멍멍! 시간 끝난다 멍! 🏃‍♂️'],
      correct: ['와락! 정답 맞혔다 멍! 기분 짱이다 멍! 🦴🎉', '역시 우리 주인님이 최고다 멍! 🏆'],
      wrong: ['손 얹어줄게요 멍... 기운 내요 멍! 🥺', '다음엔 꼭 맞힐 수 있다 멍! 힘내요! 🌱'],
      combo: ['🔥 신나는 댕댕이 콤보 어질리티! 멍멍! 🚀', '행복 회로 폭발 연속 정답이다 멍! 👑'],
    },
  },

  // --- 3. 초인기 귀염뽀짝 만화 주인공 & 마스코트 컬렉션 ---
  {
    id: 'shinchan',
    emoji: '🖍️',
    name: '말괄량이 짱구',
    title: '천방지축 떡잎마을',
    category: 'anime',
    bgColor: 'bg-red-500 text-white',
    catchphrase: '부리부리~ 직감으로 딱 찍어보자구! 🖍️',
    quotes: {
      thinking: ['호호이~ 초코비 먹으면서 풀어볼까? 🍫', '액션가면에게 정답을 물어봐야겠어!', '지문에 예쁜 누나가 숨어있나? 👀'],
      hurry: ['으아악! 엄마 주먹돌리기 날아온다! 빨리! 😱', '부리부리 스피드로 아무거나 찍어! 💨'],
      correct: ['이야호~! 역시 난 천재 액션가면 짱구! 🖍️🎉', '초코비 100개 상으로 줘! 완벽 정답! 🏆'],
      wrong: ['헤헤... 실패는 성공의 어머니랬어~ 부리부리! 😆', '초코비 하나 먹고 다음 문제 가자구! 🍫'],
      combo: ['🔥 초코비 무한 리필 콤보 대폭발이다! 🚀', '액션 빔 연속 발사! 짱구 전성시대! 👑'],
    },
  },
  {
    id: 'anya',
    emoji: '🥜',
    name: '초능력자 아냐',
    title: '스파이 패밀리',
    category: 'anime',
    bgColor: 'bg-rose-400 text-white',
    catchphrase: '와쿠와쿠! 마음을 읽어버렸어! 🥜',
    quotes: {
      thinking: ['초능력으로 정답 엿듣는 중... 와쿠와쿠! 🥜', '지문에 답이 적혀있다고 생각하면 편해!', '아냐는 시험 백점 맞고 싶어! 🌟'],
      hurry: ['시간이 없어서 아냐 위기! 빨리 눌러! ⏰💦', '초능력 과부하 온다! 서둘러! 🏃‍♀️'],
      correct: ['와쿠와쿠~! 맞혔다! 아냐 백점 만점이야! 🥜🎉', '별(스텔라) 획득이다! 아빠 칭찬해줘! 🏆'],
      wrong: ['충격! (가엔) 아냐 아쉽지만 다음 문제 집중! 🥺', '땅콩 먹고 다시 기운 낼 거야! 🥜'],
      combo: ['🔥 스텔라 획득 임박! 초능력 콤보 폭발! ⭐', '와쿠와쿠가 멈추지 않아! 최강 아냐! 🚀'],
    },
  },
  {
    id: 'kirby',
    emoji: '⭐',
    name: '별의 먹보 커비',
    title: '푸푸푸랜드',
    category: 'anime',
    bgColor: 'bg-pink-400 text-white',
    catchphrase: '포요포요~! 정답을 냠냠 흡입! ⭐',
    quotes: {
      thinking: ['포요? 지문을 꼼꼼하게 맛보는 중이야! 🍰', '동글동글 별빛 속에 정답이 보여! ✨', '포요포요 힘내자!'],
      hurry: ['포요오옷! 별빛이 사라지기 전에 꿀꺽! ⏰', '빨리 빨아들여! 타임오버 직전! 💨'],
      correct: ['포요~! 별빛 흡입 정답 대성공! 만세! ⭐🎉', '달콤한 디저트 같은 정답이었어! 🏆'],
      wrong: ['포요... 통통 튀며 다음 간식을 찾자! 🥺', '눈물 찔끔 닦고 다시 점프! 🌱'],
      combo: ['🌟 스타로드 풀파워! 무적 콤보 가동! 🚀', '온 세상을 흡입하는 슈퍼 콤보 파티! 👑'],
    },
  },
  {
    id: 'doraemon',
    emoji: '🔔',
    name: '미래 로봇 도라에몽',
    title: '22세기 도구 마스터',
    category: 'anime',
    bgColor: 'bg-sky-500 text-white',
    catchphrase: '주머니에서 정답 도구를 꺼내줄게! 🔔',
    quotes: {
      thinking: ['4차원 주머니 뒤적거리는 중... 🧰', '암기빵을 먹으면 바로 외워질 텐데! 🍞', '차분하게 생각하면 다 풀 수 있어!'],
      hurry: ['우와아악! 타임머신 출발 직전이야! 빨리! ⏰', '시간이 없어 진구야! 즉시 선택해! 🏃‍♂️'],
      correct: ['어디로든 문으로 정답 도착! 대단해! 🔔🎉', '대나무 헬리콥터 타고 날아갈 기분이야! 🏆'],
      wrong: ['단팥빵 하나 먹고 다시 힘내자! 🍩', '도구에만 의지하지 말고 다음엔 맞히자! 💪'],
      combo: ['🔥 22세기 미래 도구 총출동 콤보 행진! 🚁', '타임 패러독스급 엄청난 연속 정답! 🚀'],
    },
  },
  {
    id: 'chiikawa',
    emoji: '🐹',
    name: '먼작귀 치이카와',
    title: '작고 귀여운 용사',
    category: 'anime',
    bgColor: 'bg-amber-100 text-amber-900',
    catchphrase: '와아아~! 용기내서 꾹 눌러봐! 🎀',
    quotes: {
      thinking: ['후에에...? 떨리지만 문제에 집중! 🥺', '소중한 친구들이 응원하고 있어! 힘내!', '용기를 내서 콕 집어보자! 🌱'],
      hurry: ['와아아악! 토벌 시간이 얼마 안 남았어! ⏰💦', '후에에엑! 서둘러서 눌러! 🏃‍♂️'],
      correct: ['야하~! 맞혔다! 칭찬 스티커 획득! 🌟🎉', '와아아~ 기뻐서 엉덩이 춤이 절로 나와! 🏆'],
      wrong: ['훌쩍... 눈물 닦고 다음 문제 도전! 씩씩하게! 💪', '후에에... 다시 힘내면 괜찮아! 🥺'],
      combo: ['💖 대단해! 기적의 연속 정답 퍼레이드! 🚀', '친구들과 다 함께 만세 삼창이야! 👑'],
    },
  },
  {
    id: 'pingu',
    emoji: '🐧',
    name: '장난꾸러기 핑구',
    title: '남극 얼음마을',
    category: 'animal',
    bgColor: 'bg-slate-700 text-white',
    catchphrase: '뇟뇟! 얼음 썰매 타고 정답으로! 🐧',
    quotes: {
      thinking: ['뇟뇟~ 펭귄 두뇌 풀가동 중! ❄️', '물고기처럼 파닥이는 정답을 낚아채자! 🐟', '얼음처럼 시원하게 집중해!'],
      hurry: ['뇟뇟뇟! 이글루가 녹기 전에 얼른! ⏰', '부리 쪼기 공격으로 서둘러 클릭! 💨'],
      correct: ['뇟뇟~! 펭귄 날갯짓 정답 댄스 작렬! 🐧🎉', '남극 최고 스타 펭귄의 환상 정답! 🏆'],
      wrong: ['아장아장 넘어져도 훌훌 털고 일어나자! ❄️', '물고기 한 입 먹고 다시 출격이다 뇟! 💪'],
      combo: ['🔥 남극 빙하를 가르는 쾌속 썰매 콤보! 🚀', '얼음 위를 미끄러지듯 연속 만점 행진! 👑'],
    },
  },
  {
    id: 'eevee',
    emoji: '🦊',
    name: '무한진화 이브이',
    title: '반짝이는 진화 포켓몬',
    category: 'anime',
    bgColor: 'bg-amber-600 text-white',
    catchphrase: '이브이~ 반짝이는 눈망울로 정답 캐치! ✨',
    quotes: {
      thinking: ['이브이브이! 반짝이는 직감을 믿어봐! 🌟', '어떤 속성으로든 진화할 수 있어! 집중!', '귀를 쫑긋 세우고 단서 탐색 중!'],
      hurry: ['이브이! 서둘러서 꼬리 흔들기 어택! ⏰', '초롱초롱 눈망울로 빠르게 터치! 🏃‍♀️'],
      correct: ['이브이~! 완벽한 정답 진화 성공! 💖🎉', '반짝반짝 빛나는 정답이야! 최고야! 🏆'],
      wrong: ['포기하지 마! 다음 문제에서 멋지게 진화하자! 🌱', '이브이... 토닥토닥 힘내! 🥺'],
      combo: ['✨ 8가지 속성 파워 총출동! 초특급 콤보! 🚀', '무지개빛 진화의 에너지 폭발! 👑'],
    },
  },
  {
    id: 'squirtle',
    emoji: '🐢',
    name: '물대포 꼬부기',
    title: '꼬부기단 대장',
    category: 'anime',
    bgColor: 'bg-teal-500 text-white',
    catchphrase: '꼬북꼬북! 시원하게 정답 발사! 🌊',
    quotes: {
      thinking: ['선글라스 착용 완료! 정답 수색 중! 🕶️', '등껍질 속에 웅크려 깊이 고뇌 중!', '차분하게 물 흐르듯 풀어보자! 🌊'],
      hurry: ['물대포 장전 시간 마감 임박! 쏴라! ⏰', '꼬북! 시간이 없어! 속공! 🏃‍♂️'],
      correct: ['꼬북~! 하이드로펌프 정답 명중! 🌊🎉', '꼬부기단 대장의 위엄을 보여줬다! 🏆'],
      wrong: ['등껍질로 충격 흡수 완료! 다음 문제 가자! 🛡️', '시원한 물 한 모금 마시고 리셋! 💪'],
      combo: ['🌊 파도타기 콤보 질주! 막을 수 없다! 🚀', '물보라를 일으키며 연속 정답 돌진! 👑'],
    },
  },
  {
    id: 'snorlax',
    emoji: '💤',
    name: '꿀잠 대장 잠만보',
    title: '느긋한 대식가',
    category: 'anime',
    bgColor: 'bg-emerald-700 text-white',
    catchphrase: '쿨쿨... 깼더니 정답이 보였어! 💤',
    quotes: {
      thinking: ['하아암~ 졸리지만 눈 부릅뜨고 보기! 😴', '느긋하게 생각해도 답은 나오는 법이지!', '배가 부르면 머리가 잘 돌아가! 🍎'],
      hurry: ['으아! 졸다가 시간 다 간다! 쿵쾅쿵쾅! ⏰', '잠꼬대 파워로 빠르게 꾹! 🏃‍♂️'],
      correct: ['쿠어어~! 잠결에도 정답 맞히기 성공! 💤🎉', '먹고 자는 힘으로 정답을 쟁취했다! 🏆'],
      wrong: ['하품 한 번 쩍 하고 다음 문제 먹어치우자! 🍩', '잠깐 눈 좀 붙이고 다음 문제 갈까? 😴'],
      combo: ['🔥 잠만보의 파괴광선 콤보 대폭발! 💥', '산더미처럼 쌓이는 엄청난 콤보 점수! 🚀'],
    },
  },
  {
    id: 'cinnamoroll',
    emoji: '☁️',
    name: '몽실 구름 롤이',
    title: '하늘을 나는 귀요미',
    category: 'animal',
    bgColor: 'bg-sky-200 text-sky-900',
    catchphrase: '하늘하늘 구름처럼 폭신한 정답! ☁️',
    quotes: {
      thinking: ['긴 귀를 펄럭이며 행복한 정답 탐색 중! ☁️', '달콤한 시나몬 롤 향기 속에 답이 있어!', '친구야, 넌 분명 해낼 수 있어! 💖'],
      hurry: ['바람이 불어와! 어서 깃털처럼 가볍게 터치! ⏰', '하늘 위로 날아가기 전에 얼른! 🏃‍♀️'],
      correct: ['와아~! 하늘을 날아오를 듯 기뻐! 정답이야! ☁️🎉', '폭신폭신 구름 위에서 춤추자! 🏆'],
      wrong: ['토닥토닥... 따뜻한 밀크티 마시고 다시 해보자! ☕', '구름 뒤에는 언제나 맑은 하늘이 있어! 🌱'],
      combo: ['🌈 무지개 구름을 가르는 슈퍼 콤보 비행! 🚀', '하늘 끝까지 닿는 눈부신 연승 행진! 👑'],
    },
  },
  {
    id: 'kuromi',
    emoji: '😈',
    name: '깜찍 악동 쿠로미',
    title: '블랙 체리 매력',
    category: 'animal',
    bgColor: 'bg-purple-900 text-white',
    catchphrase: '열심히 안 하면 쿠로미 노트에 적는다! 😈',
    quotes: {
      thinking: ['흥, 이 정도 문제는 한눈에 파악 완료! 🖤', '멋진 반전 매력으로 답을 콕 집어봐!', '쿠로미 레이디의 자존심을 걸고 집중!'],
      hurry: ['야야! 멍때리지 말고 빨리 눌러! ⏰', '해골 리본 흔들리기 전에 당장 클릭! 💨'],
      correct: ['봤지? 이게 바로 쿠로미의 매력적인 실력! 😈🎉', '완벽해! 오늘 일기에 백점이라고 써야지! 🏆'],
      wrong: ['칫... 방심했네. 다음 문제에 복수전이다! 💥', '쿠로미 노트에 오답 이름 딱 적어놨어! 📝'],
      combo: ['🔥 블랙 체리 하트 폭발! 무적 콤보 질주! 🖤', '누구도 날 막을 수 없어! 1등은 내 차지야! 🚀'],
    },
  },
  {
    id: 'gojo',
    emoji: '🕶️',
    name: '무하한 고죠 센세',
    title: '최강의 주술사',
    category: 'anime',
    bgColor: 'bg-indigo-700 text-white',
    catchphrase: '괜찮아, 넌 최강이니까! 무량공처! 🕶️',
    quotes: {
      thinking: ['육안으로 지문을 투시하는 중... 답이 보여! 👁️', '정답에 도달하는 건 무한한 가능성이야!', '가볍게 놀아주자고! 🍭'],
      hurry: ['시간이 멈추진 않아! 최강의 속도로 선택해! ⏰', '안대를 벗기 전에 빠르게 결정해! 🏃‍♂️'],
      correct: ['영역전개! 무량공처 정답 완벽 적중! 🕶️🎉', '봤지? 우린 시작부터 최강이었어! 🏆'],
      wrong: ['음? 방금 건 페이크였어. 다음 문제로 가자! 🍭', '걱정 마, 반전 술식으로 멘탈 회복 완료! 💪'],
      combo: ['🔥 허식 자 발동! 점수가 폭발한다! 🚀', '세계관 최강자의 압도적 콤보 독주! 👑'],
    },
  },
  {
    id: 'sakuragi',
    emoji: '🏀',
    name: '천재 바스켓맨 강백호',
    title: '북산의 비밀병기',
    category: 'anime',
    bgColor: 'bg-rose-600 text-white',
    catchphrase: '난 천재니까! 왼손은 거들 뿐! 🏀',
    quotes: {
      thinking: ['풋내기 슛처럼 기본에 충실하게 읽어라! 🏀', '이 백호님의 동물적 감각이 발동한다!', '리바운드를 제압하는 자가 시합을 제압한다!'],
      hurry: ['버저비터 직전이다! 림을 향해 던져라! ⏰', '공격제한시간 3초! 빨리 쏴! 💨'],
      correct: ['봤냐, 서태웅?! 이 백호님의 특급 슬램덩크! 🏀🎉', '이 몸은 천재 바스켓맨이니까 당연하지! 🏆'],
      wrong: ['골밑슛 놓쳤다고 시합 끝나냐?! 리바운드 가자! 💪', '다음 슛은 100% 꽂아넣는다! 🔥'],
      combo: ['🔥 북산의 역전 버저비터 콤보 대폭발!! 🚀', '전국 제패를 향한 천재의 폭풍 질주! 👑'],
    },
  },
  {
    id: 'pompom',
    emoji: '🍮',
    name: '말랑 푸딩 푸린',
    title: '달콤한 힐링 강아지',
    category: 'animal',
    bgColor: 'bg-amber-300 text-amber-950',
    catchphrase: '말랑말랑 달콤한 정답 타임! 🍮',
    quotes: {
      thinking: ['베레모를 고쳐 쓰고 갸우뚱~ 생각 중! 🍮', '달콤한 푸딩 속에 힌트가 숨어있을까?', '느긋하고 행복하게 풀어봐! 🌼'],
      hurry: ['푸딩이 녹기 전에 냠냠! 얼른 골라! ⏰', '엉덩이 씰룩! 시간 다 됐다 멍! 🏃‍♂️'],
      correct: ['야호~! 푸딩처럼 부드러운 완벽한 정답! 🍮🎉', '달콤하고 폭신한 기분! 칭찬해줘! 🏆'],
      wrong: ['말랑한 엉덩이 털고 다시 일어나면 돼! 멍! 🐶', '푸딩 한 입 먹고 다시 웃어보자! 🍮'],
      combo: ['🍮 푸딩 젤리 무한 퐁당! 달콤 콤보 파티! 🚀', '온 세상이 달콤해지는 연승 멜로디! 👑'],
    },
  },
];

export interface QuizRoom {
  pin: string; // 6자리 고유 PIN (예: '739201')
  title: string;
  subject: string;
  createdAt: string; // YYYY. MM. DD HH:mm
  examInfo: ExamInfo;
  questions: Question[];
  timePerQuestion: number; // 0: 무제한, 15: 15초, 20: 20초, 30: 30초
  allowAnonymous: boolean; // 익명 참여 허용 여부
  isActive: boolean;
}

export interface QuizParticipantResult {
  id: string;
  pin: string;
  nickname: string;
  avatarId: string;
  isAnonymous: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  maxCombo: number;
  totalTimeSpent: number;
  submittedAt: string;
  answers: {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    scoreEarned: number;
  }[];
}

export interface SavedQuizPackage {
  id: string;
  title: string;
  subject: 'music' | 'entry' | string;
  examInfo: ExamInfo;
  questions: Question[];
  savedAt: string;
  questionCount: number;
  description?: string;
}

export interface LiveQuizState {
  pin: string;
  status: 'waiting' | 'countdown' | 'question' | 'reveal' | 'finished';
  currentQuestionIndex: number;
  timeLeft: number;
  questionStartedAt?: number;
  updatedAt?: number;
  totalQuestions: number;
  showExplanation: boolean;
  participants: {
    id: string;
    nickname: string;
    avatarId: string;
    avatarUrl?: string;
    avatarEmoji?: string;
    score: number;
    correctCount?: number;
    lastAnswer?: string;
  }[];
  answersSubmitted: {
    participantId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
  }[];
}
