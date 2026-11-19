import { NextResponse } from 'next/server';
import { fetchDoubanJson } from '@/lib/server/douban';
import {
  buildDoubanImageUrl,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';

export const runtime = 'nodejs';

interface DoubanRecommendApiResponse {
  total?: number;
  items?: Array<{
    id: string;
    title: string;
    year?: string;
    type?: string;
    pic?: { large?: string; normal?: string };
    rating?: { value?: number };
  }>;
}

/**
 * 豆瓣推荐筛选（移植自 LunaTV /api/douban/recommends）。
 * 用法：/api/douban/recommends?kind=movie&limit=25&start=0&category=&format=
 *       &region=&year=&platform=&sort=&label=
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const kind = searchParams.get('kind');
  const pageLimit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '25', 10) || 25, 1),
    100
  );
  const pageStart = Math.max(parseInt(searchParams.get('start') || '0', 10) || 0, 0);
  const category = searchParams.get('category') === 'all' ? '' : searchParams.get('category') || '';
  const format = searchParams.get('format') === 'all' ? '' : searchParams.get('format') || '';
  const region = searchParams.get('region') === 'all' ? '' : searchParams.get('region') || '';
  const year = searchParams.get('year') === 'all' ? '' : searchParams.get('year') || '';
  const platform = searchParams.get('platform') === 'all' ? '' : searchParams.get('platform') || '';
  const sort = searchParams.get('sort') === 'T' ? '' : searchParams.get('sort') || '';
  const label = searchParams.get('label') === 'all' ? '' : searchParams.get('label') || '';

  if (!kind || !['movie', 'tv'].includes(kind)) {
    return NextResponse.json({ error: '缺少必要参数: kind' }, { status: 400 });
  }

  const selectedCategories: Record<string, string> = { 类型: category };
  if (format) selectedCategories['形式'] = format;
  if (region) selectedCategories['地区'] = region;

  const tags: string[] = [];
  if (category) tags.push(category);
  if (!category && format) tags.push(format);
  if (label) tags.push(label);
  if (region) tags.push(region);
  if (year) tags.push(year);
  if (platform) tags.push(platform);

  const params = new URLSearchParams({
    refresh: '0',
    start: String(pageStart),
    count: String(pageLimit),
    selected_categories: JSON.stringify(selectedCategories),
    uncollect: 'false',
    score_range: '0,10',
    tags: tags.join(','),
  });
  if (sort) params.append('sort', sort);

  const buildUrl = (sortValue: string) => {
    const next = new URLSearchParams(params);
    if (sortValue) next.set('sort', sortValue);
    return `https://m.douban.com/rexxar/api/v2/${kind}/recommend?${next.toString()}`;
  };
  const originalUrl = buildUrl(sort);

  try {
    let data = await fetchDoubanJson<DoubanRecommendApiResponse>(originalUrl);

    // 豆瓣「综合排序」下部分类型会返回极少量条目，此时用近期热度补齐
    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (!sort && rawItems.length < pageLimit) {
      const fallback = await fetchDoubanJson<DoubanRecommendApiResponse>(buildUrl('U'));
      if ((fallback.items?.length || 0) > rawItems.length) {
        data = fallback;
      }
    }

    const metadata = await getMetadataConfig();
    const items = Array.isArray(data.items) ? data.items : [];

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      list: items
        .filter(
          (item) =>
            (item.type === 'movie' || item.type === 'tv') && item.id && item.title
        )
        .map((item) => ({
          id: String(item.id),
          title: item.title,
          poster: buildDoubanImageUrl(
            item.pic?.normal || item.pic?.large || '',
            metadata
          ),
          rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
          year: item.year || '',
        })),
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    });
  } catch (error) {
    console.error('Douban recommends error:', error);
    return NextResponse.json(
      { error: '获取豆瓣推荐失败' },
      { status: 500 }
    );
  }
}
