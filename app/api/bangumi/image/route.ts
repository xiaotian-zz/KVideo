import { NextResponse } from 'next/server';
import {
  buildBangumiImageUrl,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';

export const runtime = 'nodejs';

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'image/jpeg,image/png,image/gif,image/webp,*/*;q=0.8',
  Referer: 'https://bgm.tv/',
};

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Bangumi 图片代理。
 * server 模式由服务端拉取图片；其他模式直接跳转到配置的目标地址。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl || !isValidHttpUrl(imageUrl)) {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  const metadata = await getMetadataConfig();

  if (metadata.bangumiImageProxyType !== 'server') {
    const targetUrl = buildBangumiImageUrl(imageUrl, metadata);

    // 自定义代理为空时会回退到本路由，避免循环
    if (!isValidHttpUrl(targetUrl)) {
      return NextResponse.json({ error: 'Invalid proxy URL' }, { status: 400 });
    }

    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  }

  try {
    const imageResponse = await fetch(imageUrl, { headers: REQUEST_HEADERS });

    if (!imageResponse.ok || !imageResponse.body) {
      return NextResponse.json(
        { error: 'Failed to fetch Bangumi image' },
        { status: imageResponse.status || 502 }
      );
    }

    const headers = new Headers();
    const contentType = imageResponse.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000');

    return new Response(imageResponse.body, { status: 200, headers });
  } catch (error) {
    console.error('Bangumi image proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch Bangumi image' }, { status: 502 });
  }
}
