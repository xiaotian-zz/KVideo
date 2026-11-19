import { NextResponse } from 'next/server';
import {
  buildDoubanDataUrl,
  buildDoubanImageUrl,
  buildDoubanRequestHeaders,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';
import { fetchShortDramaPage } from '@/lib/server/shortdrama';
import type { MetadataConfig } from '@/lib/metadata';

export const runtime = 'nodejs';

interface FeaturedItem {
  id: string;
  title: string;
  cover: string;
  rate?: string;
  episodeCount?: number;
  remarks?: string;
  url?: string;
}

interface DoubanSubject {
  id?: string | number;
  title?: string;
  cover?: string;
  rate?: string;
  url?: string;
}

const CACHE_SECONDS = 3600;
const LIMIT = 12;
const FETCH_TIMEOUT_MS = 10000;

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(FETCH_TIMEOUT_MS);
}

async function fetchDoubanSubjects(
  type: 'movie' | 'tv',
  tag: string,
  metadata: MetadataConfig
): Promise<FeaturedItem[]> {
  const originalUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${LIMIT}&page_start=0`;
  const targetUrl = buildDoubanDataUrl(originalUrl, metadata);
  const headers = buildDoubanRequestHeaders(metadata);

  let response: Response;

  try {
    response = await fetch(targetUrl, {
      headers,
      signal: timeoutSignal(),
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok && targetUrl !== originalUrl) {
      response = await fetch(originalUrl, {
        headers,
        signal: timeoutSignal(),
        next: { revalidate: CACHE_SECONDS },
      });
    }

    if (!response.ok) return [];

    const data = await response.json();
    const subjects = Array.isArray(data?.subjects) ? (data.subjects as DoubanSubject[]) : [];

    return subjects
      .filter((item) => item.title)
      .map((item) => ({
        id: String(item.id ?? item.title),
        title: String(item.title),
        cover: item.cover ? buildDoubanImageUrl(item.cover, metadata) : '',
        rate: item.rate ? String(item.rate) : undefined,
        url: item.url ? String(item.url) : undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * 首页“精品推荐”聚合数据（排版与内容对齐 LunaTV 首页）：
 * 热门电影、热门剧集、热门综艺、热门短剧。
 */
export async function GET() {
  const metadata = await getMetadataConfig();

  const [hotMovies, hotTvShows, hotVarietyShows, shortDramaResult] = await Promise.all([
    fetchDoubanSubjects('movie', '热门', metadata),
    fetchDoubanSubjects('tv', '热门', metadata),
    fetchDoubanSubjects('tv', '综艺', metadata),
    fetchShortDramaPage(),
  ]);

  return NextResponse.json(
    {
      success: true,
      data: {
        hotMovies,
        hotTvShows,
        hotVarietyShows,
        hotShortDramas: shortDramaResult.items,
      },
    },
    {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    }
  );
}
