import { NextRequest, NextResponse } from 'next/server';
import { readGlobalConfig } from '@/lib/server/global-config';
import { getRedisClient } from '@/lib/server/redis';
import { getServerSession } from '@/lib/server/auth';
import { DEFAULT_ROLE_SOURCE_ACCESS, normalizeRole } from '@/lib/auth/permissions';

export const runtime = 'nodejs';

// 与 LunaTV 一致：分类 10 秒、列表 15 秒
const CATEGORIES_TIMEOUT_MS = 10000;
const LIST_TIMEOUT_MS = 15000;

// 客户端取消时一并中止上游请求，避免快速切换源后旧请求继续占用连接
function createUpstreamSignal(requestSignal: AbortSignal, timeoutMs: number): AbortSignal {
  return AbortSignal.any([requestSignal, AbortSignal.timeout(timeoutMs)]);
}

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
  vod_year?: number | string;
  vod_area?: string;
}

// 源站可能返回相对路径或 //cdn 形式，统一补全为绝对地址
function resolveCover(raw: string | undefined, base: URL): string {
  const value = (raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
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
  const keyword = (request.nextUrl.searchParams.get('keyword') || '').trim();
  const isSearch = action === 'search';
  const pageParam = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const config = await readGlobalConfig();
  const session = await getServerSession(request);
  const role = normalizeRole(session?.role);
  const roleSourceAccess = config?.roleSourceAccess ?? DEFAULT_ROLE_SOURCE_ACCESS;
  const canViewPremium = roleSourceAccess[role].includes('premium');

  const source = config?.sources.find((item) => item.id === sourceId && item.enabled)
    || (canViewPremium
      ? config?.premiumSources.find((item) => item.id === sourceId && item.enabled)
      : undefined);

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
        signal: createUpstreamSignal(request.signal, CATEGORIES_TIMEOUT_MS),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `上游返回错误: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json() as { class?: RawClass[] };
      const categories = (Array.isArray(data?.class) ? data.class : [])
        .map((item) => ({
          id: String(item.type_id ?? ''),
          name: String(item.type_name || ''),
        }))
        .filter((item) => item.id && item.name);

      return NextResponse.json({ success: true, data: { categories } });
    }

    if (isSearch ? !keyword : !typeId) {
      return NextResponse.json({ success: true, data: { items: [], page, pagecount: 1 } });
    }

    baseUrl.searchParams.set('ac', 'videolist');
    baseUrl.searchParams.set('pg', String(page));
    if (isSearch) {
      baseUrl.searchParams.set('wd', keyword);
    } else {
      // 与 LunaTV 一致：苹果 CMS 分类参数为 t
      baseUrl.searchParams.set('t', typeId);
    }

    const response = await fetch(baseUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0', ...source.headers },
      signal: createUpstreamSignal(request.signal, LIST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `上游返回错误: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json() as { list?: RawItem[]; pagecount?: number };
    const items = (Array.isArray(data?.list) ? data.list : [])
      .filter((item) => item.vod_name)
      .map((item) => ({
        id: String(item.vod_id ?? item.vod_name),
        title: String(item.vod_name),
        cover: resolveCover(item.vod_pic, baseUrl),
        remarks: item.vod_remarks ? String(item.vod_remarks) : '',
        typeName: item.type_name ? String(item.type_name) : '',
        year: item.vod_year ? String(item.vod_year) : '',
        area: item.vod_area ? String(item.vod_area) : '',
      }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        page,
        pagecount: Number(data?.pagecount) || 1,
      },
    });
  } catch (error) {
    const errorName = error && typeof error === 'object' && 'name' in error
      ? (error as { name?: string }).name
      : '';
    if (errorName === 'TimeoutError') {
      return NextResponse.json({ error: '请求超时' }, { status: 408 });
    }
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
