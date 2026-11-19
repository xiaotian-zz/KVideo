import { NextRequest, NextResponse } from 'next/server';
import { fetchShortDramaPage } from '@/lib/server/shortdrama';

export const runtime = 'nodejs';

/**
 * 短剧分类页数据：分类列表 + 指定分类的分页内容。
 */
export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') || undefined;
  const pageParam = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const result = await fetchShortDramaPage(category, page);

  return NextResponse.json(
    { success: true, data: result },
    { headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' } }
  );
}
