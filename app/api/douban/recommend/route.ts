import { NextResponse } from 'next/server';
import {
  buildDoubanDataUrl,
  buildDoubanImageUrl,
  buildDoubanRequestHeaders,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';

export const runtime = 'nodejs';

interface DoubanSubject {
  cover?: string;
  [key: string]: unknown;
}

interface DoubanSearchResponse {
  subjects?: DoubanSubject[];
  [key: string]: unknown;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag') || '热门';
  const pageLimit = searchParams.get('page_limit') || '20';
  const pageStart = searchParams.get('page_start') || '0';
  const type = searchParams.get('type') || 'movie'; // movie or tv

  try {
    const metadata = await getMetadataConfig();
    const originalUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;
    const targetUrl = buildDoubanDataUrl(originalUrl, metadata);

    let response = await fetch(targetUrl, {
      headers: buildDoubanRequestHeaders(metadata),
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    // 代理线路不可用时回退到豆瓣原始地址
    if (!response.ok && targetUrl !== originalUrl) {
      response = await fetch(originalUrl, {
        headers: buildDoubanRequestHeaders(metadata),
        next: { revalidate: 3600 },
      });
    }

    if (!response.ok) {
      throw new Error(`Douban API returned ${response.status}`);
    }

    const data = (await response.json()) as DoubanSearchResponse;

    // 按全局图片代理配置转换封面地址
    if (data.subjects && Array.isArray(data.subjects)) {
      data.subjects = data.subjects.map((item) => ({
        ...item,
        cover: item.cover ? buildDoubanImageUrl(item.cover, metadata) : item.cover,
      }));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Douban API error:', error);
    return NextResponse.json(
      { subjects: [], error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
