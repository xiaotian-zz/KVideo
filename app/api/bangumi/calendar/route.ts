import { NextResponse } from 'next/server';
import {
  buildBangumiApiUrl,
  buildBangumiImageUrl,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';

export const runtime = 'nodejs';

interface BangumiCalendarItem {
  id?: number;
  name?: string;
  name_cn?: string;
  air_date?: string;
  images?: Record<string, string>;
  rating?: { score?: number };
}

interface BangumiCalendarDay {
  weekday?: { en?: string; cn?: string };
  items?: BangumiCalendarItem[];
}

/**
 * Bangumi 每日放送日历（供动漫「每日放送」标签使用）。
 */
export async function GET() {
  try {
    const metadata = await getMetadataConfig();
    const targetUrl = buildBangumiApiUrl('calendar', metadata);

    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'KVideo/1.0', Accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Bangumi API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as BangumiCalendarDay[];
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid calendar data' }, { status: 502 });
    }

    return NextResponse.json(
      data.map((day) => ({
        weekday: day.weekday,
        items: (day.items || []).map((item) => {
          const image =
            item.images?.large ||
            item.images?.common ||
            item.images?.medium ||
            item.images?.small ||
            item.images?.grid ||
            '';
          return {
            id: item.id ? String(item.id) : '',
            title: item.name_cn || item.name || '',
            poster: image ? buildBangumiImageUrl(image, metadata) : '',
            rate: item.rating?.score ? item.rating.score.toFixed(1) : '',
            year: item.air_date?.split('-')?.[0] || '',
          };
        }),
      })),
      {
        headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
      }
    );
  } catch (error) {
    console.error('Bangumi calendar error:', error);
    return NextResponse.json({ error: '获取 Bangumi 日历失败' }, { status: 500 });
  }
}
