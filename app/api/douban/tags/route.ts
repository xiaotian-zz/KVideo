import { NextResponse } from 'next/server';
import {
  buildDoubanDataUrl,
  buildDoubanRequestHeaders,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'movie'; // movie or tv

    try {
        const metadata = await getMetadataConfig();
        const originalUrl = `https://movie.douban.com/j/search_tags?type=${type}&source=index`;
        const targetUrl = buildDoubanDataUrl(originalUrl, metadata);

        let response = await fetch(targetUrl, {
            headers: buildDoubanRequestHeaders(metadata),
            next: { revalidate: 86400 }, // Cache tags for 24 hours
        });

        // 代理线路不可用时回退到豆瓣原始地址
        if (!response.ok && targetUrl !== originalUrl) {
            response = await fetch(originalUrl, {
                headers: buildDoubanRequestHeaders(metadata),
                next: { revalidate: 86400 },
            });
        }

        if (!response.ok) {
            throw new Error(`Douban API returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Douban Tags API error:', error);
        return NextResponse.json(
            { tags: [], error: 'Failed to fetch tags' },
            { status: 500 }
        );
    }
}
