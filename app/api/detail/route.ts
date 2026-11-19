/**
 * Detail API Route
 * Fetches video details including episodes and M3U8 URLs with automatic source validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVideoDetail } from '@/lib/api/client';
import { getSourceById } from '@/lib/api/video-sources';
import { readGlobalConfig } from '@/lib/server/global-config';

export const runtime = 'nodejs';

/**
 * Shared handler for fetching video details
 */
async function handleDetailRequest(id: string | null, source: string | null) {
  // Validate input
  if (!id) {
    return NextResponse.json(
      { error: 'Missing video ID parameter' },
      { status: 400 }
    );
  }

  // Validate source
  if (!source) {
    return NextResponse.json(
      { error: 'Missing source parameter' },
      { status: 400 }
    );
  }

  let sourceConfig;

  // If source is an object (from POST), use it
  if (typeof source === 'object') {
    sourceConfig = source;
  } else {
    // 先查内置源，再查 Kvrocks 中的全局源（新标签页打开时客户端配置可能尚未同步）
    sourceConfig = getSourceById(source);
    if (!sourceConfig) {
      const globalConfig = await readGlobalConfig();
      sourceConfig = [
        ...(globalConfig?.sources || []),
        ...(globalConfig?.premiumSources || []),
      ].find((item) => item.id === source);
    }
  }

  if (!sourceConfig) {
    return NextResponse.json(
      { error: 'Invalid source configuration' },
      { status: 400 }
    );
  }

  // Fetch video detail without validation (already validated during search)
  try {
    const videoDetail = await getVideoDetail(id, sourceConfig);

    // Skip validation - videos are already checked during search
    // Just return the episodes as-is


    return NextResponse.json({
      success: true,
      data: videoDetail,
    });
  } catch (error) {
    console.error('Detail API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch video detail',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const source = searchParams.get('source');

    return await handleDetailRequest(id, source);
  } catch (error) {
    console.error('Detail API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Support POST method for complex requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, source } = body;

    return await handleDetailRequest(id, source);
  } catch (error) {
    console.error('Detail API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
