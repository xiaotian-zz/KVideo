import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthoritativeSession,
  getServerSession,
  isAdminSession,
  ManagedAuthStorageError,
} from '@/lib/server/auth';
import { getRedisClient } from '@/lib/server/redis';
import { readGlobalConfig, writeGlobalConfig } from '@/lib/server/global-config';

export const runtime = 'nodejs';

function storageUnavailableResponse() {
  return NextResponse.json(
    { error: 'Server-side storage is not configured' },
    { status: 503 }
  );
}

/**
 * 全局配置读取：
 * - 视频源对所有用户（包括未登录）公开
 * - 元数据代理和豆瓣 Cookies 仅管理员可见
 */
export async function GET(request: NextRequest) {
  if (!getRedisClient()) {
    return NextResponse.json({ success: true, data: null });
  }

  try {
    const data = await readGlobalConfig();
    if (!data) {
      return NextResponse.json(
        { success: true, data: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const session = await getServerSession(request);
    const canViewMetadata = !!session && isAdminSession(session);

    const payload = canViewMetadata
      ? data
      : {
          sources: data.sources,
          premiumSources: data.premiumSources,
          subscriptions: data.subscriptions,
          iptvSources: data.iptvSources,
          siteTitle: data.siteTitle,
          roleSourceAccess: data.roleSourceAccess,
          updatedAt: data.updatedAt,
        };

    return NextResponse.json(
      { success: true, data: payload },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Global config read failed:', error);
    return NextResponse.json({ success: true, data: null });
  }
}

/**
 * 全局配置写入：仅管理员。
 */
export async function PUT(request: NextRequest) {
  if (!getRedisClient()) {
    return storageUnavailableResponse();
  }

  try {
    const session = await getAuthoritativeSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdminSession(session)) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const body = await request.json();
    const config = await writeGlobalConfig(body);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    if (error instanceof ManagedAuthStorageError) {
      return storageUnavailableResponse();
    }

    if (error instanceof Error && error.message.includes('storage limit')) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }

    console.error('Global config write failed:', error);
    return NextResponse.json({ error: 'Failed to save global config' }, { status: 400 });
  }
}
