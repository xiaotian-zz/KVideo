import { NextResponse } from 'next/server';
import { fetchDoubanJson } from '@/lib/server/douban';
import {
  buildDoubanImageUrl,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';

export const runtime = 'nodejs';

interface DoubanCategoryApiResponse {
  total?: number;
  items?: Array<{
    id: string;
    title: string;
    card_subtitle?: string;
    pic?: { large?: string; normal?: string };
    rating?: { value?: number };
  }>;
}

const MAX_PAGE_LIMIT = 100;

/**
 * 豆瓣最近热门分类（移植自 LunaTV /api/douban/categories）。
 * 用法：/api/douban/categories?kind=movie&category=热门&type=全部&limit=25&start=0
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const kind = searchParams.get('kind') || 'movie';
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const pageLimit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '25', 10) || 25, 1),
    MAX_PAGE_LIMIT
  );
  const pageStart = Math.max(parseInt(searchParams.get('start') || '0', 10) || 0, 0);

  if (!['tv', 'movie'].includes(kind) || !category || !type) {
    return NextResponse.json(
      { error: '缺少必要参数: kind / category / type' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    start: String(pageStart),
    limit: String(pageLimit),
    category,
    type,
  });
  const originalUrl = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?${params.toString()}`;

  try {
    const data = await fetchDoubanJson<DoubanCategoryApiResponse>(originalUrl);
    const metadata = await getMetadataConfig();
    const items = Array.isArray(data.items) ? data.items : [];

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      list: items
        .filter((item) => item.id && item.title)
        .map((item) => ({
          id: String(item.id),
          title: item.title,
          poster: buildDoubanImageUrl(
            item.pic?.normal || item.pic?.large || '',
            metadata
          ),
          rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
          year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
        })),
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    });
  } catch (error) {
    console.error('Douban categories error:', error);
    return NextResponse.json(
      { error: '获取豆瓣分类失败' },
      { status: 500 }
    );
  }
}
