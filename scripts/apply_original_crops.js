const fs = require('fs');
const { execSync } = require('child_process');
const { Client } = require('pg');

const psScript = `
Add-Type -AssemblyName System.Drawing

function Crop-Image($srcPath, $destPath, $x, $y, $w, $h) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = $src.Clone($rect, $src.PixelFormat)
    $cropped.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $src.Dispose()
    $cropped.Dispose()
}

$outDir = "C:\\Users\\User\\.gemini\\antigravity\\scratch\\school-padlet\\crops"
$src1 = "C:\\Users\\User\\.gemini\\antigravity\\brain\\624aeb15-129a-4170-91b6-183884e84e05\\.user_uploaded\\media_1794186153463_1a510b43.png"
$src2 = "C:\\Users\\User\\.gemini\\antigravity\\brain\\624aeb15-129a-4170-91b6-183884e84e05\\.user_uploaded\\media_1794186143161_00c85e94.png"

Crop-Image $src1 "$outDir\\gemini.png" 21 213 128 67
Crop-Image $src1 "$outDir\\chatgpt.png" 21 390 128 62
Crop-Image $src1 "$outDir\\tetris.png" 185 239 128 88
Crop-Image $src1 "$outDir\\sample1.png" 185 410 128 75
Crop-Image $src1 "$outDir\\shortcuts.png" 348 253 127 72
Crop-Image $src1 "$outDir\\ppt.png" 349 413 128 67
Crop-Image $src1 "$outDir\\urlshort.png" 513 299 128 51
Crop-Image $src1 "$outDir\\geminipro.png" 513 408 128 67
Crop-Image $src1 "$outDir\\claudecode.png" 677 225 128 55
Crop-Image $src1 "$outDir\\codex.png" 677 390 128 45
Crop-Image $src1 "$outDir\\openrouter.png" 841 278 128 45
Crop-Image $src1 "$outDir\\ollama.png" 841 508 128 40
Crop-Image $src2 "$outDir\\github.png" 527 267 128 48
Crop-Image $src2 "$outDir\\vercel.png" 527 442 128 45
`;

fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/school-padlet/scripts/run_crop.ps1', psScript);

console.log('Cropping images via PowerShell...');
execSync('powershell -ExecutionPolicy Bypass -File "C:\\Users\\User\\.gemini\\antigravity\\scratch\\school-padlet\\scripts\\run_crop.ps1"');
console.log('Cropping complete!');

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

// Clean SVGs for official logos that weren't scrolled into view in the screenshot
const SVG_LOGOS = {
  claude: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#FBF7EE"/>
      <g transform="translate(140, 40)">
        <polygon points="60,0 72,42 110,48 78,74 88,115 55,90 22,115 32,74 0,48 38,42" fill="#D97757"/>
        <text x="60" y="145" font-family="sans-serif" font-size="28" font-weight="bold" fill="#1F1E1D" text-anchor="middle">Claude AI</text>
      </g>
    </svg>`),
  grok: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#000000"/>
      <g transform="translate(200, 100)">
        <text x="0" y="20" font-family="sans-serif" font-size="56" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">grok</text>
      </g>
    </svg>`),
  meta: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#F0F4F9"/>
      <g transform="translate(200, 90)">
        <path d="M-60,0 C-60,-35 -30,-45 -10,-10 C0,5 15,25 25,25 C35,25 50,0 50,-15 C50,-30 35,-35 25,-25 C15,-15 0,10 -15,10 C-30,10 -40,-5 -40,-15" fill="none" stroke="#0081FB" stroke-width="14" stroke-linecap="round"/>
        <text x="0" y="65" font-family="sans-serif" font-size="30" font-weight="bold" fill="#050505" text-anchor="middle">Meta AI</text>
      </g>
    </svg>`),
  huggingface: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#FFD21E"/>
      <g transform="translate(200, 95)">
        <text x="0" y="10" font-size="64" text-anchor="middle">🤗</text>
        <text x="0" y="65" font-family="sans-serif" font-size="26" font-weight="bold" fill="#111827" text-anchor="middle">Hugging Face</text>
      </g>
    </svg>`),
  nvidia: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#000000"/>
      <g transform="translate(200, 110)">
        <text x="0" y="0" font-family="sans-serif" font-size="44" font-weight="900" fill="#76B900" text-anchor="middle">NVIDIA</text>
        <text x="0" y="38" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">build.nvidia.com</text>
      </g>
    </svg>`),
  firebase: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#1A1C1E"/>
      <g transform="translate(200, 85)">
        <polygon points="-25,25 0,-40 25,25 0,15" fill="#FFA000"/>
        <polygon points="0,-40 18,-10 25,25 0,15" fill="#F57C00"/>
        <polygon points="-40,25 -20,-15 -5,12" fill="#FFCA28"/>
        <text x="0" y="65" font-family="sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Firebase 콘솔</text>
      </g>
    </svg>`),
  hermes: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#0F172A"/>
      <g transform="translate(200, 95)">
        <text x="0" y="0" font-size="52" text-anchor="middle">⚡</text>
        <text x="0" y="45" font-family="sans-serif" font-size="24" font-weight="bold" fill="#E2E8F0" text-anchor="middle">Hermes Agent</text>
      </g>
    </svg>`),
  antigravity: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#1E293B"/>
      <g transform="translate(200, 95)">
        <text x="0" y="0" font-size="48" text-anchor="middle">🚀</text>
        <text x="0" y="42" font-family="sans-serif" font-size="24" font-weight="bold" fill="#38BDF8" text-anchor="middle">Antigravity (Google)</text>
      </g>
    </svg>`),
  opencode: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#18181B"/>
      <g transform="translate(200, 95)">
        <text x="0" y="0" font-size="44" text-anchor="middle">💻</text>
        <text x="0" y="42" font-family="sans-serif" font-size="24" font-weight="bold" fill="#A1A1AA" text-anchor="middle">opencode.ai</text>
      </g>
    </svg>`),
  openclaw: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#0C0A09"/>
      <g transform="translate(200, 95)">
        <text x="0" y="0" font-size="44" text-anchor="middle">🦀</text>
        <text x="0" y="42" font-family="sans-serif" font-size="24" font-weight="bold" fill="#FB923C" text-anchor="middle">OpenClaw</text>
      </g>
    </svg>`),
  shorturl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
      <rect width="100%" height="100%" rx="16" fill="#2563EB"/>
      <g transform="translate(200, 105)">
        <text x="0" y="0" font-family="sans-serif" font-size="42" font-weight="bold" fill="#FFFFFF" text-anchor="middle">숏.한</text>
        <text x="0" y="35" font-family="sans-serif" font-size="16" fill="#DBEAFE" text-anchor="middle">xn--oi2b61g.com</text>
      </g>
    </svg>`)
};

const POST_UPDATES = {
  // 1. Ai 모델
  'post-1792977291967-r8qr': getBase64Png('gemini.png'), // Exact Gemini crop
  'post-1793754025172-c015': getBase64Png('chatgpt.png'), // Exact ChatGPT crop
  'post-1793584388574-xefi': SVG_LOGOS.claude,
  'post-1793753890383-99km': SVG_LOGOS.grok,
  'post-1793583968829-o4zw': SVG_LOGOS.meta,

  // 2. util
  'post-util-her': SVG_LOGOS.hermes,
  'post-util-fb': SVG_LOGOS.firebase,
  'post-1793754223837-bndu': getBase64Png('github.png'), // Exact GitHub crop
  'post-1793754279438-eibo': getBase64Png('vercel.png'), // Exact Vercel crop
  'post-1793757685743-ow76': getBase64Png('github.png'), // school-padlet / 소스
  'post-1793754443164-90kz': null, // GameGo 제미나이 할인 (was plain link card)
  'post-1793762412836-0v91': null, // photocraft
  'post-1793755373304-prpy': getBase64Png('urlshort.png'), // Exact URL shortener crop
  'post-1794184173653-oqe2': getBase64Png('geminipro.png'), // Exact GamsGo Gemini Pro crop
  'post-1794183819235-tthk': SVG_LOGOS.shorturl,

  // 3. 몸풀기 예제
  'post-1794191037082-lbrm': getBase64Png('tetris.png'), // 메타 ai로 만든 테트리스
  'post-1793766423176-wss7': getBase64Png('tetris.png'), // Exact Tetris crop
  'post-1793584050821-ke8d': getBase64Png('sample1.png'), // Exact roulette wheel crop
  'post-1793584162101-g1bs': null, // 샘플2 (was plain code card)
  'post-1793584255517-dfeb': null, // 샘플3 (was plain code card)

  // 4. 무료 AI (api)
  'post-1793756908313-4aui': getBase64Png('openrouter.png'), // Exact OpenRouter crop
  'post-1793756495586-fzk1': getBase64Png('ollama.png'), // Exact Ollama crop
  'post-1793756370594-1emz': SVG_LOGOS.huggingface,
  'post-1793756207679-cy96': SVG_LOGOS.nvidia,

  // 5. 바이브코딩 편집기
  'post-1793755789048-kkhb': getBase64Png('claudecode.png'), // Exact Claude Code crop
  'post-1793755229495-xdus': getBase64Png('codex.png'), // Exact Codex crop
  'post-1793754921630-wr2x': SVG_LOGOS.antigravity,
  'post-1793754982598-2m5p': SVG_LOGOS.opencode,
  'post-1793753971111-akqz': SVG_LOGOS.hermes,
  'post-1793755971601-ji85': SVG_LOGOS.openclaw,

  // 6. 실습
  'post-1794185500000-shortcuts': getBase64Png('shortcuts.png'), // Exact shortcuts crop
  'post-1793764543918-u8ry': getBase64Png('ppt.png'), // Exact PPT crop
  'post-1793579202455-nvyc': null, // 교육자료 (had NO image in screenshot, only attachment box)
  'post-1793578831407-zjtd': null, // 실습 안내 가이드 (plain guide card)
  'post-1792976199496-gz3p': null, // 엑셀시트 데이터
  'post-1792976151471-8cx1': originalQRBase64, // Exact QR code base64
  'post-1792976116392-ctjx': originalQRBase64, // QR 샘플

  // 7. 샘플1 공유 (학생 실습)
  'post-1794208587783-1jsd': null, // 양재혁 테트리 (student post without image)
  'post-1794208379057-gitu': null, // 김미란 테트리스 (student post without image)
  'post-1794209923014-7f2k': null, // 김지영 숫자 맞추기 (student post without image)
  'post-1794208324339-wqn0': null, // 허브 반응형 계산기 (student post without image)
  'post-1794208588017-bzx6': null  // 현모시기 스톱워치 (student post without image)
};

async function applyOriginalImages() {
  const client = new Client({
    connectionString: 'postgres://postgres.byakwhzepgcgnfmekvyq:ekzmna13!%40%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  });
  await client.connect();

  console.log('Updating posts in Supabase with original cropped and logo images...');
  for (const [id, img] of Object.entries(POST_UPDATES)) {
    await client.query('UPDATE posts SET image_url = $1 WHERE id = $2', [img, id]);
  }

  // Also check if any other posts still have Unsplash images and clear them
  await client.query(`
    UPDATE posts
    SET image_url = NULL
    WHERE board_id = 'board-1792975588752'
      AND image_url LIKE '%images.unsplash.com%'
  `);

  const summary = await client.query(`
    SELECT count(*) as total,
           count(image_url) as with_images
    FROM posts
    WHERE board_id = 'board-1792975588752'
  `);
  console.log('Result summary:', summary.rows[0]);

  const rows = await client.query(`
    SELECT id, title, column_name, 
           CASE 
             WHEN image_url IS NULL THEN 'NO IMAGE (clean)'
             WHEN image_url LIKE 'data:image/png;base64,%' THEN 'ORIGINAL CROPPED (base64 png)'
             WHEN image_url LIKE 'data:image/svg+xml%' THEN 'ORIGINAL VECTOR LOGO (svg)'
             ELSE 'OTHER'
           END as img_type
    FROM posts
    WHERE board_id = 'board-1792975588752'
    ORDER BY column_name, order_index
  `);
  console.table(rows.rows);

  await client.end();
}

applyOriginalImages().catch(console.error);
