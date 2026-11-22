import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;

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

async function isPublicHost(hostname: string): Promise<boolean> {
  if (!hostname || hostname === 'localhost') return false;
  if (net.isIP(hostname)) return !isPrivateAddress(hostname);

  try {
    const records = await dns.lookup(hostname, { all: true });
    return records.length > 0 && records.every((record) => !isPrivateAddress(record.address));
  } catch {
    return false;
  }
}

/**
 * 源站图片代理：本机直连失败时由服务器再试一次。
 * 仅代理公网 http/https 图片，限制大小和重定向次数。
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

  let current = target;

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      if (!(await isPublicHost(current.hostname))) {
        return NextResponse.json({ error: 'Forbidden host' }, { status: 403 });
      }

      const response = await fetch(current, {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Referer: `${current.origin}/`,
        },
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

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

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: 'Image too large' }, { status: 413 });
      }

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    return NextResponse.json({ error: 'Too many redirects' }, { status: 508 });
  } catch {
    return NextResponse.json({ error: 'Image request failed' }, { status: 502 });
  }
}
