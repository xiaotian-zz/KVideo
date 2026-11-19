import { NextRequest, NextResponse } from 'next/server';
import { readGlobalConfig } from '@/lib/server/global-config';
import { getRedisClient } from '@/lib/server/redis';

export const runtime = 'nodejs';

const FETCH_TIMEOUT_MS = 10000;
const CACHE_SECONDS = 1800;

interface RawClass {
  type_id?: number | string;
  type_name?: string;
}

interface RawItem {
  vod_id?: number | string;
  vod_name?: string;
  vod_pic?: string;
  vod_remarks?: string;
  type_name?: string;
}

/**
 * 源浏览器：只允许浏览 Kvrocks 中已配置的全局视频源。
 */
export async function GET(request: NextRequest) {
  if (!getRedisClient()) {
    return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 });
  }

  const action = request.nextUrl.searchParams.get('action') || 'categories';
  const sourceId = request.nextUrl.searchParams.get('sourceId') || '';
  const typeId = request.nextUrl.searchParams.get('typeId') || '';
  const pageParam = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const config = await readGlobalConfig();
  const source = config?.sources.find((item) => item.id === sourceId && item.enabled);

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(source.baseUrl);
    if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid source URL' }, { status: 400 });
  }

  try {
    if (action === 'categories') {
      baseUrl.searchParams.set('ac', 'list');
      const response = await fetch(baseUrl.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0', ...source.headers },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: CACHE_SECONDS },
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Source unavailable' }, { status: 502 });
      }

      const data = await response.json();
      const categories = (Array.isArray(data?.class) ? data.class as RawClass[] : [])
        .map((item) => ({
          id: String(item.type_id ?? ''),
          name: String(item.type_name || ''),
        }))
        .filter((item) => item.id && item.name);

      return NextResponse.json(
        { success: true, data: { categories } },
        { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } }
      );
    }

    if (!typeId) {
      return NextResponse.json(
        { success: true, data: { items: [], page, pagecount: 1 } },
        { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } }
      );
    }

    baseUrl.searchParams.set('ac', 'videolist');
    baseUrl.searchParams.set('pg', String(page));
    // 与 LunaTV 一致：苹果 CMS 分类参数为 t
    baseUrl.searchParams.set('t', typeId);

    const response = await fetch(baseUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0', ...source.headers },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Source unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const items = (Array.isArray(data?.list) ? data.list as RawItem[] : [])
      .filter((item) => item.vod_name)
      .map((item) => ({
        id: String(item.vod_id ?? item.vod_name),
        title: String(item.vod_name),
        cover: String(item.vod_pic || '').replace(/^http:\/\//i, 'https://'),
        remarks: item.vod_remarks ? String(item.vod_remarks) : '',
        typeName: item.type_name ? String(item.type_name) : '',
      }));

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          page,
          pagecount: Number(data?.pagecount) || 1,
        },
      },
      { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } }
    );
  } catch {
    return NextResponse.json({ error: 'Source request failed' }, { status: 502 });
  }
}
