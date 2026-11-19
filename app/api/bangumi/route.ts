import { NextRequest, NextResponse } from 'next/server';
import { buildBangumiApiUrl, getMetadataConfig } from '@/lib/server/metadata-proxy';

export const runtime = 'nodejs';

const MAX_RESPONSE_CHARS = 5 * 1024 * 1024;
const CACHE_SECONDS = 3600;

/**
 * Bangumi 数据代理（移植自 LunaTV）。
 * 用法：GET /api/bangumi?path=calendar
 *       GET /api/bangumi?path=v0/subjects/12345
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // 仅允许相对路径，避免代理被用于访问任意地址
  if (path.includes('..') || /^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    return NextResponse.json({ error: 'Invalid path parameter' }, { status: 400 });
  }

  try {
    const metadata = await getMetadataConfig();
    const targetUrl = buildBangumiApiUrl(path, metadata);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'KVideo/1.0',
        Accept: 'application/json',
      },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Bangumi API returned ${response.status}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) {
      return NextResponse.json({ error: 'Bangumi response too large' }, { status: 413 });
    }

    return NextResponse.json(JSON.parse(text), {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error('Bangumi API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch from Bangumi API' }, { status: 500 });
  }
}
