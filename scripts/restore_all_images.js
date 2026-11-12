const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.byakwhzepgcgnfmekvyq:ekzmna13!%40%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

const CARD_IMAGES = {
  // 1. Ai 모델
  'post-1792977291967-r8qr': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', // Gemini
  'post-1793754025172-c015': 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80', // ChatGPT
  'post-1793584388574-xefi': 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80', // Claude AI
  'post-1793753890383-99km': 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&auto=format&fit=crop&q=80', // Grok
  'post-1793583968829-o4zw': 'https://images.unsplash.com/photo-1633409381648-e815e12f6b6e?w=800&auto=format&fit=crop&q=80', // Meta AI

  // 2. util
  'post-util-her': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  'post-util-fb': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
  'post-1793754223837-bndu': 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&auto=format&fit=crop&q=80', // GitHub
  'post-1793754279438-eibo': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80', // Vercel
  'post-1793757685743-ow76': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80', // school-padlet / 소스
  'post-1793754443164-90kz': 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80', // GameGo
  'post-1793762412836-0v91': 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80', // photocraft
  'post-1793755373304-prpy': 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80', // urlshort
  'post-1794184173653-oqe2': 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80', // 제미나이 프로 구
  'post-1794183819235-tthk': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80', // 숏.한

  // 3. 몸풀기 예제
  'post-1794191037082-lbrm': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', // 메타 테트리스
  'post-1793766423176-wss7': 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', // 테트리스
  'post-1793584050821-ke8d': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80', // 샘플1
  'post-1793584162101-g1bs': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80', // 샘플2
  'post-1793584255517-dfeb': 'https://images.unsplash.com/photo-1581291518655-9523c932edcf?w=800&auto=format&fit=crop&q=80', // 샘플3

  // 4. 무료 AI (api)
  'post-1793756908313-4aui': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80', // openrouter
  'post-1793756495586-fzk1': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80', // ollama
  'post-1793756370594-1emz': 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=800&auto=format&fit=crop&q=80', // huggingface
  'post-1793756207679-cy96': 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&auto=format&fit=crop&q=80', // nvidia

  // 5. 바이브코딩 편집기
  'post-1793755789048-kkhb': 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop&q=80', // 클로드코드
  'post-1793755229495-xdus': 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=80', // codex
  'post-1793754921630-wr2x': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', // antigravity google
  'post-1793754982598-2m5p': 'https://images.unsplash.com/photo-1555066931-bf19f8fd1085?w=800&auto=format&fit=crop&q=80', // opencode
  'post-1793753971111-akqz': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', // 헤르메스 에이전트
  'post-1793755971601-ji85': 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&auto=format&fit=crop&q=80', // OpenClaw

  // 6. 실습
  'post-1794185500000-shortcuts': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', // 단축키
  'post-1793764543918-u8ry': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80', // PPT
  'post-1793579202455-nvyc': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80', // 교육자료
  'post-1793578831407-zjtd': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80', // 실습 안내 가이드
  'post-1792976199496-gz3p': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80', // 엑셀시트 데이터
  'post-1792976116392-ctjx': 'https://images.unsplash.com/photo-1595079672139-6238b68aa4cb?w=800&auto=format&fit=crop&q=80', // QR 샘플

  // 7. 샘플1 공유 (학생 실습)
  'post-1794208587783-1jsd': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', // 양재혁 테트리
  'post-1794208379057-gitu': 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80', // 김미란 테트리스
  'post-1794209923014-7f2k': 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&auto=format&fit=crop&q=80', // 김지영 숫자 맞추기
  'post-1794208324339-wqn0': 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&auto=format&fit=crop&q=80', // 허브 반응형 계산기
  'post-1794208588017-bzx6': 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800&auto=format&fit=crop&q=80'  // 현모시기 스톱워치
};

async function run() {
  await client.connect();
  let updatedCount = 0;

  for (const [id, url] of Object.entries(CARD_IMAGES)) {
    // If post already has a base64 image (like QR 동의서 post-1792976151471-8cx1), don't overwrite it with external url
    const check = await client.query('SELECT image_url FROM posts WHERE id = $1', [id]);
    if (check.rows.length > 0) {
      const currentImg = check.rows[0].image_url;
      if (currentImg && currentImg.startsWith('data:image/')) {
        console.log(`Skipping ${id} because it already has original base64 image`);
        continue;
      }
      await client.query('UPDATE posts SET image_url = $1 WHERE id = $2', [url, id]);
      updatedCount++;
    }
  }

  console.log(`Successfully restored images for ${updatedCount} posts!`);

  const summary = await client.query(`
    SELECT count(*) as total,
           count(image_url) as with_images
    FROM posts
    WHERE board_id = 'board-1792975588752'
  `);
  console.log('Board posts summary:', summary.rows[0]);

  await client.end();
}

run().catch(console.error);
