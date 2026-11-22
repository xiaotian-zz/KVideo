import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthoritativeSession,
  isAdminSession,
  ManagedAuthStorageError,
} from '@/lib/server/auth';
import { getRedisClient } from '@/lib/server/redis';

export const runtime = 'nodejs';

const BACKUP_FORMAT = 'kvideo-backup';
const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const MAX_BACKUP_ENTRIES = 20000;

interface BackupPayload {
  format: string;
  version: number;
  exportedAt?: string;
  entries: Record<string, unknown>;
}

function isBackupKey(key: string): boolean {
  return key === 'auth:accounts:v1'
    || key === 'global:config:v1'
    || key.startsWith('user:data:v1:');
}

async function requireAdmin(request: NextRequest) {
  const session = await getAuthoritativeSession(request);
  if (!session) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (!isAdminSession(session)) {
    return { error: NextResponse.json({ error: 'Admin required' }, { status: 403 }) };
  }
  return { session };
}

/**
 * 全量备份：账户、全局配置以及所有用户的收藏/历史/设置等数据。
 * 仅管理员可用，文件包含账户密码哈希，请妥善保管。
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const redis = getRedisClient();
  if (!redis || !redis.keys) {
    return NextResponse.json({ error: 'Server-side storage is not configured' }, { status: 503 });
  }

  try {
    const allKeys = await redis.keys('*');
    const keys = allKeys.filter(isBackupKey).slice(0, MAX_BACKUP_ENTRIES);
    const entries: Record<string, unknown> = {};

    for (const key of keys) {
      const value = await redis.get(key);
      if (value !== null) {
        entries[key] = value;
      }
    }

    const payload: BackupPayload = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      entries,
    };

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof ManagedAuthStorageError) {
      return NextResponse.json({ error: 'Server-side storage is not configured' }, { status: 503 });
    }
    console.error('Backup export failed:', error);
    return NextResponse.json({ error: 'Failed to export backup' }, { status: 500 });
  }
}

/**
 * 恢复全量备份：覆盖同名账户、全局配置和用户数据。
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json({ error: 'Server-side storage is not configured' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Partial<BackupPayload>;
    if (body.format !== BACKUP_FORMAT || body.version !== BACKUP_VERSION) {
      return NextResponse.json({ error: 'Unsupported backup format' }, { status: 400 });
    }
    if (!body.entries || typeof body.entries !== 'object' || Array.isArray(body.entries)) {
      return NextResponse.json({ error: 'Invalid backup entries' }, { status: 400 });
    }

    const entries = Object.entries(body.entries);
    if (entries.length === 0) {
      return NextResponse.json({ error: 'Backup is empty' }, { status: 400 });
    }
    if (entries.length > MAX_BACKUP_ENTRIES) {
      return NextResponse.json({ error: 'Too many backup entries' }, { status: 413 });
    }
    if (entries.some(([key]) => !isBackupKey(key))) {
      return NextResponse.json({ error: 'Backup contains unsupported keys' }, { status: 400 });
    }

    const serialized = JSON.stringify(body.entries);
    if (new TextEncoder().encode(serialized).length > MAX_BACKUP_BYTES) {
      return NextResponse.json({ error: 'Backup is too large' }, { status: 413 });
    }

    for (const [key, value] of entries) {
      await redis.set(key, value);
    }

    return NextResponse.json({ success: true, restored: entries.length });
  } catch (error) {
    if (error instanceof ManagedAuthStorageError) {
      return NextResponse.json({ error: 'Server-side storage is not configured' }, { status: 503 });
    }
    console.error('Backup restore failed:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 400 });
  }
}
