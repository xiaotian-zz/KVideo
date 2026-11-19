import { getRedisClient } from '@/lib/server/redis';

/**
 * 用户数据命名空间。每个命名空间独立存储，
 * 避免收藏、历史等不同数据的写入互相覆盖。
 */
export const USER_DATA_NAMESPACES = [
  'settings',
  'premium-settings',
  'favorites',
  'premium-favorites',
  'history',
  'premium-history',
  'search-history',
  'premium-search-history',
  'user-sources',
  'iptv',
] as const;

export type UserDataNamespace = (typeof USER_DATA_NAMESPACES)[number];

export const MAX_USER_DATA_BYTES = 2 * 1024 * 1024;

export function isUserDataNamespace(value: string): value is UserDataNamespace {
  return (USER_DATA_NAMESPACES as readonly string[]).includes(value);
}

function safeAccountId(accountId: string): string {
  return accountId.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function userDataKey(accountId: string, namespace: UserDataNamespace): string {
  return `user:data:v1:${safeAccountId(accountId)}:${namespace}`;
}

export async function readUserData(
  accountId: string,
  namespace: UserDataNamespace
): Promise<unknown | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  return redis.get(userDataKey(accountId, namespace));
}

export async function writeUserData(
  accountId: string,
  namespace: UserDataNamespace,
  data: unknown
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Server-side storage is not configured');
  }

  const serialized = JSON.stringify(data);
  if (serialized === undefined) {
    throw new Error('Invalid user data');
  }

  const size = new TextEncoder().encode(serialized).length;
  if (size > MAX_USER_DATA_BYTES) {
    throw new Error('User data exceeds the storage limit');
  }

  await redis.set(userDataKey(accountId, namespace), data);
}

export async function readAllUserData(
  accountId: string
): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    USER_DATA_NAMESPACES.map(async (namespace) => {
      const value = await readUserData(accountId, namespace);
      return [namespace, value] as const;
    })
  );

  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}
