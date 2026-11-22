import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
const DNS_TIMEOUT_MS = 3000;
const DNS_CACHE_TTL_MS = 10 * 60 * 1000;
const IMAGE_CACHE_TTL_MS = 30 * 60 * 1000;
const IMAGE_CACHE_MAX_BYTES = 48 * 1024 * 1024;
const MAX_CONCURRENT_FETCHES = 6;

interface DnsCacheEntry {
  addresses: string[];
  expiresAt: number;
}

interface ImageCacheEntry {
  body: Buffer;
  contentType: string;
  expiresAt: number;
}

const dnsCache = new Map<string, DnsCacheEntry>();
const pendingDns = new Map<string, Promise<string[]>>();
const imageCache = new Map<string, ImageCacheEntry>();
const fetchWaiters: Array<() => void> = [];

let imageCacheBytes = 0;
let activeFetches = 0;

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return parts[0] === 0
      || parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 169 && parts[1] === 254)
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168);
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe80:');
  }

  return true;
}

async function lookupAddresses(hostname: string): Promise<string[]> {
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.addresses;
  }

  const pending = pendingDns.get(hostname);
  if (pending) return pending;

  const task = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const records = await Promise.race([
        dns.lookup(hostname, { all: true }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS);
        }),
      ]);
      const addresses = records.map((record) => record.address);
      dnsCache.set(hostname, { addresses, expiresAt: Date.now() + DNS_CACHE_TTL_MS });

      if (dnsCache.size > 500) {
        const now = Date.now();
        for (const [key, value] of dnsCache) {
          if (value.expiresAt <= now) dnsCache.delete(key);
        }
      }

      return addresses;
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();

  pendingDns.set(hostname, task);
  try {
    return await task;
  } finally {
    pendingDns.delete(hostname);
  }
}

async function isPublicHost(hostname: string): Promise<boolean> {
  if (!hostname || hostname === 'localhost') return false;
  if (net.isIP(hostname)) return !isPrivateAddress(hostname);

  try {
    const addresses = await lookupAddresses(hostname);
    return addresses.length > 0 && addresses.every((address) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}

async function acquireFetchSlot(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT_FETCHES) {
    activeFetches += 1;
    return;
  }
  await new Promise<void>((resolve) => fetchWaiters.push(resolve));
  activeFetches += 1;
}

function releaseFetchSlot(): void {
  activeFetches = Math.max(0, activeFetches - 1);
  const next = fetchWaiters.shift();
  if (next) next();
}

function getCachedImage(key: string): ImageCacheEntry | null {
  const entry = imageCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    imageCache.delete(key);
    imageCacheBytes -= entry.body.byteLength;
    return null;
  }

  // 命中后移到末尾，保持 LRU 顺序
  imageCache.delete(key);
  imageCache.set(key, entry);
  return entry;
}

function setCachedImage(key: string, body: Buffer, contentType: string): void {
  if (body.byteLength > MAX_BYTES) return;

  const existing = imageCache.get(key);
  if (existing) {
    imageCacheBytes -= existing.body.byteLength;
    imageCache.delete(key);
  }

  imageCache.set(key, {
    body,
    contentType,
    expiresAt: Date.now() + IMAGE_CACHE_TTL_MS,
  });
  imageCacheBytes += body.byteLength;

  while (imageCacheBytes > IMAGE_CACHE_MAX_BYTES) {
    const oldest = imageCache.entries().next();
    if (oldest.done) break;
    const [oldKey, oldEntry] = oldest.value;
    imageCache.delete(oldKey);
    imageCacheBytes -= oldEntry.body.byteLength;
  }
}

function buildHeaders(
  contentType: string,
  cacheState: 'HIT' | 'MISS',
  contentLength?: number
): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    'X-Image-Cache': cacheState,
  };
  if (contentLength && contentLength > 0) {
    headers['Content-Length'] = String(contentLength);
  }
  return headers;
}

/**
 * 源站图片代理：本机直连失败时由服务器再试一次。
 * 仅代理公网 http/https 图片，限制大小、重定向次数和并发。
 */
export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }

  const cacheKey = target.toString();
  const cached = getCachedImage(cacheKey);
  if (cached) {
    return new Response(new Uint8Array(cached.body), {
      headers: buildHeaders(cached.contentType, 'HIT', cached.body.byteLength),
    });
  }

  let current = target;

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      if (!(await isPublicHost(current.hostname))) {
        return NextResponse.json({ error: 'Forbidden host' }, { status: 403 });
      }

      await acquireFetchSlot();
      let response: Response;
      try {
        response = await fetch(current, {
          headers: {
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Referer: `${current.origin}/`,
          },
          redirect: 'manual',
          cache: 'no-store',
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]),
        });
      } finally {
        releaseFetchSlot();
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return NextResponse.json({ error: 'Invalid redirect' }, { status: 502 });
        }
        current = new URL(location, current);
        if (current.protocol !== 'http:' && current.protocol !== 'https:') {
          return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
        }
        continue;
      }

      if (!response.ok) {
        return NextResponse.json({ error: 'Image unavailable' }, { status: 502 });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return NextResponse.json({ error: 'Not an image' }, { status: 415 });
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_BYTES) {
        return NextResponse.json({ error: 'Image too large' }, { status: 413 });
      }

      const body = response.body;
      if (!body) {
        return NextResponse.json({ error: 'Image unavailable' }, { status: 502 });
      }

      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;

      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              if (total > MAX_BYTES) {
                controller.error(new Error('Image too large'));
                return;
              }
              const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
              setCachedImage(cacheKey, buffer, contentType);
              controller.close();
              return;
            }

            total += value.byteLength;
            if (total > MAX_BYTES) {
              await reader.cancel();
              controller.error(new Error('Image too large'));
              return;
            }

            chunks.push(value);
            controller.enqueue(value);
          } catch (error) {
            controller.error(error);
          }
        },
        cancel() {
          void reader.cancel();
        },
      });

      return new Response(stream, {
        headers: buildHeaders(contentType, 'MISS'),
      });
    }

    return NextResponse.json({ error: 'Too many redirects' }, { status: 508 });
  } catch (error) {
    const errorName = error && typeof error === 'object' && 'name' in error
      ? (error as { name?: string }).name
      : '';
    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      return NextResponse.json({ error: 'Image request timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Image request failed' }, { status: 502 });
  }
}
