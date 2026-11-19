import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient } from 'redis';

import { getRuntimeEnvValue } from '@/lib/server/runtime-env';

export interface KeyValueStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

let cachedStore: KeyValueStore | null | undefined;
let cachedStoreUrl: string | null = null;

function getNodeRedisUrl(): string {
  return getRuntimeEnvValue('KVROCKS_URL') || getRuntimeEnvValue('REDIS_URL');
}

const REDIS_TIMEOUT_MS = 3500;

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), REDIS_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function createNodeStore(url: string): KeyValueStore {
  const client = createClient({
    url,
    socket: {
      connectTimeout: REDIS_TIMEOUT_MS,
      reconnectStrategy: false,
    },
  });
  const ready = client.connect();

  let store: KeyValueStore;

  const dropCachedStore = () => {
    if (cachedStore === store) {
      cachedStore = undefined;
      cachedStoreUrl = null;
    }
  };

  // 连接失败时清理缓存，下一次请求会重新建连；具体调用方会收到同一个错误
  ready.catch((error) => {
    console.error('Redis connection failed:', error);
    dropCachedStore();
  });
  client.on('error', (error) => {
    console.error('Redis client error:', error);
  });
  client.on('end', dropCachedStore);

  const run = async <T>(operation: () => Promise<T>): Promise<T> => {
    await withTimeout(ready, 'Redis connection timeout');
    return withTimeout(operation(), 'Redis command timeout');
  };

  store = {
    async get<T = unknown>(key: string): Promise<T | null> {
      const raw = await run(() => client.get(key));
      if (raw === null) return null;

      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    async set(key: string, value: unknown): Promise<void> {
      await run(() => client.set(key, JSON.stringify(value)));
    },
  };

  return store;
}

function createUpstashStore(url: string, token: string): KeyValueStore {
  const redis = new UpstashRedis({ url, token });

  return {
    get<T = unknown>(key: string): Promise<T | null> {
      return redis.get<T>(key);
    },
    async set(key: string, value: unknown): Promise<void> {
      await redis.set(key, value);
    },
  };
}

/**
 * Shared key-value store for account data and user config sync.
 *
 * KVROCKS_URL / REDIS_URL (native Redis protocol, Node runtime) takes precedence,
 * which matches LunaTV's Docker deployment (app container + Kvrocks).
 * Upstash REST stays supported for Cloudflare / serverless deployments.
 *
 * Returns null when neither is configured, which callers should treat as
 * "server-side storage unavailable" rather than as a request failure.
 */
export function getRedisClient(): KeyValueStore | null {
  const nodeUrl = getNodeRedisUrl();
  if (nodeUrl) {
    if (cachedStore && cachedStoreUrl === nodeUrl) {
      return cachedStore;
    }

    cachedStore = createNodeStore(nodeUrl);
    cachedStoreUrl = nodeUrl;
    return cachedStore;
  }

  if (cachedStore !== undefined) {
    return cachedStore;
  }

  const url = getRuntimeEnvValue('UPSTASH_REDIS_REST_URL');
  const token = getRuntimeEnvValue('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) {
    cachedStore = null;
    return null;
  }

  cachedStore = createUpstashStore(url, token);
  return cachedStore;
}
