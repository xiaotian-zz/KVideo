import { NextRequest, NextResponse } from 'next/server';
import {
  deleteManagedAccount,
  getAuthoritativeSession,
  getPublicAuthConfig,
  isAdminSession,
  ManagedAuthStorageError,
  updateManagedAccount,
} from '@/lib/server/auth';

export const runtime = 'nodejs';

async function requireManagedAdmin(request: NextRequest) {
  try {
    const session = await getAuthoritativeSession(request);
    if (!session) {
      return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
    }

    if (!isAdminSession(session)) {
      return { error: NextResponse.json({ error: 'Admin required' }, { status: 403 }) };
    }

    const config = await getPublicAuthConfig();
    if (config.loginMode !== 'managed') {
      return { error: NextResponse.json({ error: 'Managed account mode is not enabled' }, { status: 400 }) };
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const auth = await requireManagedAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { accountId } = await context.params;
    const body = await request.json();
    const account = await updateManagedAccount(accountId, body, auth.session.accountId);
    return NextResponse.json({ account });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const auth = await requireManagedAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { accountId } = await context.params;
    await deleteManagedAccount(accountId, auth.session.accountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 400 }
    );
  }
}
