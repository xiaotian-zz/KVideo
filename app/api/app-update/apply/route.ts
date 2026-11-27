import { NextRequest, NextResponse } from 'next/server';
import { getAuthoritativeSession, isAdminSession } from '@/lib/server/auth';
import { getRedisClient } from '@/lib/server/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 触发 Watchtower 立即拉取最新镜像并重建容器。
 * 仅管理员可用；Watchtower 需要挂载 Docker Socket 并开启 HTTP API。
 */
export async function POST(request: NextRequest) {
  const session = await getAuthoritativeSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  const token = process.env.WATCHTOWER_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: 'Auto update is not configured' },
      { status: 503 }
    );
  }

  const watchtowerUrl = (
    process.env.WATCHTOWER_URL?.trim() || 'http://kvideo-watchtower:8080'
  ).replace(/\/$/, '');

  // 更新只会重建应用容器，Kvrocks 容器和数据卷保持不动；
  // 这里再触发一次持久化快照，作为更新前的额外保险。
  try {
    await getRedisClient()?.bgSave?.();
  } catch (error) {
    console.warn('Kvrocks BGSAVE before update failed:', error);
  }

  // 不等待 Watchtower 完成：更新过程中当前容器会被停止，
  // 同步等待只会让浏览器收到连接中断。请求发出后立即返回 202。
  void fetch(`${watchtowerUrl}/v1/update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(60000),
  }).catch((error) => {
    console.error('Watchtower update request error:', error);
  });

  return NextResponse.json({ success: true, scheduled: true }, { status: 202 });
}
