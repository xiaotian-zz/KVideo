import { NextRequest, NextResponse } from 'next/server';
import {
  createManagedAccount,
  getAuthoritativeSession,
  getPublicAuthConfig,
  isAdminSession,
  listAccountInfo,
  ManagedAuthStorageError,
} from '@/lib/server/auth';

export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  try {
    const session = await getAuthoritativeSession(request);
    if (!session) {
      return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
    }

    if (!isAdminSession(session)) {
      return { error: NextResponse.json({ error: 'Admin required' }, { status: 403 }) };
    }

    return { session };
  } catch (error) {
    if (error instanceof ManagedAuthStorageError) {
      return {
        error: NextResponse.json(
          { error: 'Managed authentication storage is unavailable' },
          { status: 503 }
        ),
      };
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const config = await getPublicAuthConfig();
  const accounts = await listAccountInfo();

  return NextResponse.json({
    loginMode: config.loginMode,
    managed: config.loginMode === 'managed',
    accounts,
    totalCount: accounts.length,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const config = await getPublicAuthConfig();
  if (config.loginMode !== 'managed') {
    return NextResponse.json({ error: 'Managed account mode is not enabled' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const account = await createManagedAccount(body);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create account' },
      { status: 400 }
    );
  }
}
