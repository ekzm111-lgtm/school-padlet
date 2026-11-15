const { Client } = require('pg');
const fs = require('fs');

function getBase64Png(filename) {
  const p = `C:/Users/User/.gemini/antigravity/scratch/school-padlet/crops/${filename}`;
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
  return null;
}

// Get the original QR code base64 from step 1950
const step1950 = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/624aeb15-129a-4170-91b6-183884e84e05/.system_generated/steps/1950/output.txt', 'utf8');
const qrMatch = step1950.match(/image_url:\s*'(data:image\/[^']+)'/);
const originalQRBase64 = qrMatch ? qrMatch[1] : null;

// Exact updates matching the user's screenshots
const REAL_CARDS = [
  // =================== 몸풀기 예제 ===================
  {
    id: 'post-1793766423176-wss7',
    title: '테트리스',
    content: '모바일하고 pc에서 돌아가는 테트리스 만들어줘\n<!--SCHOOLPAD_META:{"order":5,"column":"몸풀기 예제"}-->',
    link_url: 'https://share.gemini.google/bSF4Ye0TJp7q',
    image_url: getBase64Png('tetris.png'),
    color: 'white'
  },
  {
    id: 'post-1793584050821-ke8d',
    title: '샘플1',
    content: '발표자 랜덤 추첨 어플 만들꺼야 룰렛 처럼 만들어줘 20명 가상으로 만들어주고 편의성 생각해서 알아서 작업해줘\n<!--SCHOOLPAD_META:{"order":6,"column":"몸풀기 예제"}-->',
    link_url: 'https://share.gemini.google/bSF4Ye0TJp7q',
    image_url: getBase64Png('sample1.png'),
    color: 'white'
  },
  {
    id: 'post-1793584162101-g1bs',
    title: '샘플2',
    content: '발표자 랜덤 추첨 어플 만들꺼야\n사다리타기 만들어줘 10명 가상으로\n만들어주고 편의성 생각해서 알아서\n작업해줘\n<!--SCHOOLPAD_META:{"order":7,"column":"몸풀기 예제"}-->',
    link_url: 'https://share.gemini.google/bSF4Ye0TJp7q',
    image_url: getBase64Png('sample2_ladder.png') || getBase64Png('sample1.png'),
    color: 'yellow'
  },
  {
    id: 'post-1793584255517-dfeb',
    title: '샘플3',
    content: '발표자 랜덤 추첨 어플 만들꺼야\n제비뽑기 만들어줘 10명 가상으로\n만들어주고 편의성 생각해서 알아서\n작업해줘\n<!--SCHOOLPAD_META:{"order":8,"column":"몸풀기 예제"}-->',
    link_url: 'https://share.gemini.google/bSF4Ye0TJp7q',
    image_url: null,
    color: 'pink'
  },

  // =================== 실습 ===================
  {
    id: 'post-1793764543918-u8ry',
    title: 'PPT',
    content: '종이 없는 스마트 학급 관리\n구글 시트와 QR코드로 완성하는 가정통신문 자동화\n<!--SCHOOLPAD_META:{"order":10,"column":"실습"}-->',
    link_url: 'https://notebooklm.google.com/',
    image_url: getBase64Png('ppt.png'),
    color: 'white'
  },
  {
    id: 'post-1793579202455-nvyc',
    title: '교육자료',
    content: '교육자료 gpt\n<!--SCHOOLPAD_META:{"order":11,"column":"실습","attachments":[{"name":"동의서 샘플.pdf","size":"100 KB","type":"application/pdf","dataUrl":""}]}-->',
    link_url: 'https://script.google.com/macros/s/AKfycbxtLOpZtK2k0ewB8ypdT5qiKpPbOaA7brdTbKNkoAcQcIyKna02UQG3lIz_AYS4VYSl/exec',
    image_url: null,
    color: 'yellow'
  },
  {
    id: 'post-1793578831407-zjtd',
    title: '실습 안내 가이드',
    content: '학생별 PC 및 모바일 실습 접속 방법과 제출 규칙 가이드입니다.\n<!--SCHOOLPAD_META:{"order":12,"column":"실습"}-->',
    link_url: 'https://script.google.com/macros/s/AKfycbxtLOpZtK2k0ewB8ypdT5qiKpPbOaA7brdTbKNkoAcQcIyKna02UQG3lIz_AYS4VYSl/exec',
    image_url: null,
    color: 'green'
  },
  {
    id: 'post-1794185500000-shortcuts',
    title: '자주 사용하는 단축키',
    content: '자주 쓰는 컴퓨터 단축키 5\n<!--SCHOOLPAD_META:{"order":13,"column":"실습","attachments":[{"name":"Gemini_Generated_Image_a405wxa405wxa405.png","size":"2.4 MB","type":"image/png","dataUrl":""}]}-->',
    link_url: null,
    image_url: getBase64Png('shortcuts.png'),
    color: 'white'
  },
  {
    id: 'post-1792976199496-gz3p',
    title: '엑셀시트 데이터',
    content: '구글 드라이브 자료 열기\n<!--SCHOOLPAD_META:{"order":14,"column":"실습"}-->',
    link_url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    image_url: getBase64Png('excel_sheet.png'),
    color: 'purple'
  },
  {
    id: 'post-1792976151471-8cx1',
    title: 'QR 동의서',
    content: '구글 시트 연동 동의서 양식\n<!--SCHOOLPAD_META:{"order":15,"column":"실습"}-->',
    link_url: 'https://script.google.com/macros/s/AKfycbxtLOpZtK2k0ewB8ypdT5qiKpPbOaA7brdTbKNkoAcQcIyKna02UQG3lIz_AYS4VYSl/exec?mode=admin',
    image_url: originalQRBase64,
    color: 'white'
  },
  {
    id: 'post-1792976116392-ctjx',
    title: 'QR 샘플',
    content: '모바일 참여 실습 QR 샘플\n<!--SCHOOLPAD_META:{"order":16,"column":"실습"}-->',
    link_url: 'https://script.google.com/macros/s/AKfycbxtLOpZtK2k0ewB8ypdT5qiKpPbOaA7brdTbKNkoAcQcIyKna02UQG3lIz_AYS4VYSl/exec?mode=admin',
    image_url: originalQRBase64,
    color: 'white'
  },

  // =================== util ===================
  {
    id: 'post-1793754443164-90kz',
    title: 'GameGo 제미나이 할인',
    content: '각종 ai 할인정보\n<!--SCHOOLPAD_META:{"order":21,"column":"util"}-->',
    link_url: 'https://www.gamsgo.com',
    image_url: getBase64Png('gamsgo_coupon.png'),
    color: 'white'
  },
  {
    id: 'post-1793755373304-prpy',
    title: 'https://www.urlshort.dev/  긴 URL 주소 줄여주는 사이',
    content: 'https://s1lnk.com/8tse2b5\n<!--SCHOOLPAD_META:{"order":23,"column":"util"}-->',
    link_url: 'https://www.urlshort.dev/',
    image_url: getBase64Png('urlshort.png'),
    color: 'white'
  },
  {
    id: 'post-1794184173653-oqe2',
    title: '제미나이 프로 구',
    content: '제미나이 프로 구독 정보\n<!--SCHOOLPAD_META:{"order":24,"column":"util"}-->',
    link_url: 'https://www.gamsgo.com',
    image_url: getBase64Png('geminipro.png'),
    color: 'white'
  },

  // =================== 무료 AI (api) ===================
  {
    id: 'post-1793756370594-1emz',
    title: 'huggingface',
    content: 'Hugging Face(허깅페이스)는 머신러닝 및 딥러닝 모델, 데이터셋을 공유하고 협업할 수 있는 글로벌 오픈소스 AI 플랫폼입니다. 개발자 생태계에서는 \'AI 분야의 깃허브(GitHub)\'로 불립니다.\n<!--SCHOOLPAD_META:{"order":34,"column":"무료 AI (api)"}-->',
    link_url: 'https://huggingface.co/',
    image_url: getBase64Png('huggingface_exact.png'),
    color: 'white'
  },
  {
    id: 'post-1793756207679-cy96',
    title: 'nvidia.com',
    content: 'NVIDIA AI 플랫폼\n<!--SCHOOLPAD_META:{"order":35,"column":"무료 AI (api)"}-->',
    link_url: 'https://build.nvidia.com/',
    image_url: getBase64Png('nvidia_exact.png'),
    color: 'white'
  },
  {
    id: 'post-1793756495586-fzk1',
    title: 'https://ollama.com/',
    content: '로컬에서 AI를 돌릴 수 있다\nOllama(올라마)는 LLaMA, DeepSeek, Mistral, Qwen, Gemma 등 오픈소스 대형 언어 모델(LLM)을 개인 PC나 로컬 서버에서 클릭과 명령어 한 줄로 간편하게 실행·서빙할 수 있도록 돕는 오픈소스 도구입니다.\n<!--SCHOOLPAD_META:{"order":33,"column":"무료 AI (api)"}-->',
    link_url: 'https://ollama.com/',
    image_url: getBase64Png('ollama.png'),
    color: 'white'
  }
];

async function updateRealCards() {
  const client = new Client({
    connectionString: 'postgres://postgres.byakwhzepgcgnfmekvyq:ekzmna13!%40%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  });
  await client.connect();

  console.log(`Updating ${REAL_CARDS.length} cards with authentic content, links, attachments, and images...`);
  for (const card of REAL_CARDS) {
    await client.query(`
      UPDATE posts
      SET title = $1,
          content = $2,
          link_url = $3,
          image_url = $4,
          color = $5
      WHERE id = $6
    `, [card.title, card.content, card.link_url, card.image_url, card.color, card.id]);
    console.log(`  ✓ Updated ${card.title} (${card.id})`);
  }

  await client.end();
  console.log('Finished updating authentic cards!');
}

updateRealCards().catch(console.error);
