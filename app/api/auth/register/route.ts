import { NextRequest, NextResponse } from 'next/server';
import {
  createLoginResponse,
  ManagedAuthStorageError,
  registerManagedAccount,
} from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await registerManagedAccount(body || {});
    return createLoginResponse(session, request);
  } catch (error) {
    if (error instanceof ManagedAuthStorageError) {
      return NextResponse.json(
        { valid: false, message: '认证存储暂时不可用，请检查 Redis 配置' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { valid: false, message: error instanceof Error ? error.message : '注册失败' },
      { status: 400 }
    );
  }
}
