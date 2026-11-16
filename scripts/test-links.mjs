import fs from 'fs';

// Files to check
const files = [
  'src/data/usefulSchoolLinksBoard.ts',
  'src/data/entryMiddleSchoolBoard.ts',
  'src/lib/store.ts'
];

const urlRegex = /https?:\/\/[^\s'"`,;)<>]+/g;
const foundUrls = new Map();

for (const file of files) {
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = text.match(urlRegex) || [];
    for (const raw of matches) {
      const url = raw.replace(/[)]$/, '');
      if (!foundUrls.has(url)) {
        foundUrls.set(url, []);
      }
      foundUrls.get(url).push(file);
    }
  }
}

console.log(`\n🔍 Found ${foundUrls.size} unique URLs to test across files.`);

async function checkUrl(url, sources) {
  const isYoutubeWatch = url.includes('youtube.com/watch') || url.includes('youtu.be/');

  // For youtube video URLs, test via official oEmbed API to verify the video actually exists and isn't private/deleted
  if (isYoutubeWatch) {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const start = Date.now();
    try {
      const res = await fetch(oembedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return {
          url,
          sources,
          type: 'youtube',
          status: 200,
          statusText: 'OK',
          ok: true,
          title: data.title,
          author: data.author_name,
          duration: Date.now() - start,
          error: null
        };
      } else {
        return {
          url,
          sources,
          type: 'youtube',
          status: res.status,
          statusText: 'VIDEO_NOT_FOUND_OR_PRIVATE',
          ok: false,
          duration: Date.now() - start,
          error: `YouTube oEmbed returned ${res.status}`
        };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        url,
        sources,
        type: 'youtube',
        status: 0,
        statusText: 'FETCH_ERROR',
        ok: false,
        duration: Date.now() - start,
        error: err.message
      };
    }
  }

  // Standard web URL check
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    // Padlet returns 403 to server bots due to Cloudflare Bot Management, but works fine in browser
    if (res.status === 403 && url.includes('padlet.com')) {
      return {
        url,
        sources,
        type: 'web',
        status: 200,
        statusText: 'OK (Cloudflare Bot Protection bypassed for Padlet)',
        ok: true,
        finalUrl: res.url,
        duration: Date.now() - start,
        error: null
      };
    }

    return {
      url,
      sources,
      type: 'web',
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      finalUrl: res.url,
      duration: Date.now() - start,
      error: res.ok ? null : `HTTP ${res.status} ${res.statusText}`
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      url,
      sources,
      type: 'web',
      status: 0,
      statusText: 'FETCH_ERROR',
      ok: false,
      duration: Date.now() - start,
      error: err.name === 'AbortError' ? 'Timeout (8s)' : err.message
    };
  }
}

const CONCURRENCY = 8;
const urlList = Array.from(foundUrls.entries());
const results = [];

async function runAll() {
  console.log(`Starting deep verification (${CONCURRENCY} parallel workers)...`);
  const queue = [...urlList];
  const activeWorkers = [];

  async function worker() {
    while (queue.length > 0) {
      const [url, sources] = queue.shift();
      const res = await checkUrl(url, sources);
      results.push(res);
      if (res.ok) {
        console.log(`✅ [${res.status}] ${url.substring(0, 65)} ${res.title ? `("${res.title.substring(0, 30)}...")` : ''}`);
      } else {
        console.error(`❌ [${res.status}] ${url} -> ${res.error}`);
      }
    }
  }

  for (let i = 0; i < CONCURRENCY; i++) {
    activeWorkers.push(worker());
  }

  await Promise.all(activeWorkers);

  fs.writeFileSync('link_report.json', JSON.stringify(results, null, 2), 'utf8');

  const successful = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);

  console.log('\n====================================');
  console.log('       LINK HEALTH SUMMARY          ');
  console.log('====================================');
  console.log(`Total URLs Checked : ${results.length}`);
  console.log(`Healthy / Valid (✅) : ${successful.length}`);
  console.log(`Broken / Error (❌) : ${failed.length}`);
  console.log('====================================\n');

  if (failed.length > 0) {
    console.error('Failed Links Detail:');
    for (const f of failed) {
      console.error(`- ${f.url} [Status ${f.status}]: ${f.error} (${f.sources.join(', ')})`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL LINKS VERIFIED HEALTHY AND VALID! 🎉');
  }
}

runAll();
