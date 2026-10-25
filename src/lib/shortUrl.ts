// 무료 글로벌 단축 URL 생성 유틸리티 (is.gd & TinyURL)
// 별도 API 키 없이 완전 무료로 초단축 링크(Short URL) 즉시 생성

export async function createShortUrl(targetUrl: string): Promise<string> {
  // 1차 시도: is.gd API (초단축 링크: https://is.gd/xxxxxx)
  try {
    const isGdApi = `https://is.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(isGdApi, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.shorturl) {
        return data.shorturl;
      }
    }
  } catch (e) {
    // is.gd 실패 시 TinyURL 시도
  }

  // 2차 시도: TinyURL API (https://tinyurl.com/xxxxxx)
  try {
    const tinyApi = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(tinyApi, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const short = await res.text();
      if (short && short.startsWith('http')) {
        return short.trim();
      }
    }
  } catch (e) {
    // 실패 시 원본 targetUrl 반환
  }

  return targetUrl;
}
