import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractOgTag(html: string, property: string): string | null {
  // Regex to match <meta property="og:image" content="..." /> or <meta name="..." content="..." />
  const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match1 = html.match(regex1);
  if (match1 && match1[1]) return match1[1];

  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["']`, 'i');
  const match2 = html.match(regex2);
  if (match2 && match2[1]) return match2[1];

  return null;
}

function extractTitle(html: string): string | null {
  const ogTitle = extractOgTag(html, 'title');
  if (ogTitle) return ogTitle.trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) return titleMatch[1].trim();

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl || !rawUrl.trim()) {
    return NextResponse.json({ ok: false, error: 'URL is required' }, { status: 400 });
  }

  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();

    // 1. YouTube 전용 고속 oEmbed 및 고화질 썸네일 추출 (제목 & 썸네일 100% 자동 추출)
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId = '';
      if (hostname.includes('youtu.be')) {
        videoId = parsed.pathname.replace(/^\//, '').split(/[?#]/)[0];
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.replace('/shorts/', '').split(/[/?#]/)[0];
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }

      // YouTube oEmbed API로 정확한 영상 제목 및 썸네일 조회
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
          { signal: AbortSignal.timeout(2500) }
        );
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          return NextResponse.json({
            ok: true,
            imageUrl:
              oembed.thumbnail_url ||
              (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null),
            title: oembed.title || 'YouTube 영상',
            author: oembed.author_name || 'YouTube',
            domain: hostname,
          });
        }
      } catch (e) {}

      if (videoId) {
        return NextResponse.json({
          ok: true,
          imageUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          title: 'YouTube 영상',
          domain: hostname,
        });
      }
    }

    // 2. GitHub 오픈그래프 이미지
    if (hostname === 'github.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return NextResponse.json({
          ok: true,
          imageUrl: `https://opengraph.githubassets.com/1/${parts[0]}/${parts[1]}`,
          title: `${parts[0]}/${parts[1]} - GitHub`,
          domain: hostname,
        });
      }
    }

    // 3. 구글 드라이브 / 문서 기본 대표 이미지
    if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
      return NextResponse.json({
        ok: true,
        imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
        title: 'Google Drive 공유 자료',
        domain: hostname,
      });
    }

    // 4. 일반 웹페이지 HTML 요청 및 Open Graph 메타태그 파싱 (타임아웃 3.5초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const html = await res.text();
      let ogImage =
        extractOgTag(html, 'image') ||
        extractOgTag(html, 'image:url') ||
        extractOgTag(html, 'image:secure_url');

      if (ogImage) {
        // 상대 경로인 경우 절대 경로로 변환
        if (ogImage.startsWith('/')) {
          ogImage = new URL(ogImage, targetUrl).href;
        } else if (!ogImage.startsWith('http://') && !ogImage.startsWith('https://')) {
          ogImage = new URL(ogImage, targetUrl).href;
        }

        const pageTitle = extractTitle(html);
        return NextResponse.json({
          ok: true,
          imageUrl: ogImage,
          title: pageTitle,
          domain: hostname,
        });
      }
    }

    // 5. og:image가 없거나 봇이 차단된 경우 신뢰성 높은 폴백 썸네일
    // Microlink 무료 스크린샷 서비스 시도 또는 도메인 파비콘
    const fallbackScreenshot = `https://v1.screenshot.11ty.dev/${encodeURIComponent(targetUrl)}/opengraph/`;
    return NextResponse.json({
      ok: true,
      imageUrl: fallbackScreenshot,
      title: hostname,
      domain: hostname,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Failed to extract preview image',
    });
  }
}
