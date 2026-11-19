import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthoritativeSession,
  ManagedAuthStorageError,
} from '@/lib/server/auth';
import { getRedisClient } from '@/lib/server/redis';
import {
  isUserDataNamespace,
  readAllUserData,
  readUserData,
  writeUserData,
} from '@/lib/server/user-data';

export const runtime = 'nodejs';

function storageUnavailableResponse() {
  return NextResponse.json(
    { error: 'Server-side storage is not configured' },
    { status: 503 }
  );
}

function handleStorageError(error: unknown) {
  if (error instanceof ManagedAuthStorageError) {
    return storageUnavailableResponse();
  }

  console.error('User data error:', error);
  return NextResponse.json({ error: 'Failed to access user data' }, { status: 500 });
}

/**
 * 读取当前登录用户的数据。
 * - ?namespace=favorites 读取单个命名空间
 * - 不带参数读取全部命名空间
 *
 * 账户 ID 只取自签名会话，客户端无法指定其他用户。
 */
export async function GET(request: NextRequest) {
  if (!getRedisClient()) {
    return storageUnavailableResponse();
  }

  try {
    const session = await getAuthoritativeSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const namespace = request.nextUrl.searchParams.get('namespace');
    let data: unknown;

    if (namespace) {
      if (!isUserDataNamespace(namespace)) {
        return NextResponse.json({ error: 'Unknown namespace' }, { status: 400 });
      }
      data = await readUserData(session.accountId, namespace);
    } else {
      data = await readAllUserData(session.accountId);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleStorageError(error);
  }
}

/**
 * 写入当前登录用户的单个命名空间。
 * body: { namespace: string, data: unknown }
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

    const body = await request.json();
    const namespace = body?.namespace;

    if (typeof namespace !== 'string' || !isUserDataNamespace(namespace)) {
      return NextResponse.json({ error: 'Unknown namespace' }, { status: 400 });
    }

    if (!Object.prototype.hasOwnProperty.call(body, 'data')) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    await writeUserData(session.accountId, namespace, body.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('storage limit')) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    return handleStorageError(error);
  }
}
