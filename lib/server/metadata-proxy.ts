import { readGlobalConfig } from '@/lib/server/global-config';
import { DEFAULT_METADATA_CONFIG, type MetadataConfig } from '@/lib/metadata';

const CORS_PROXY_ZWEI = 'https://ciao-cors.is-an.org/';
const CMLIUSSSS_BANGUMI_API = 'https://img.doubanio.cmliussss.net';
const SAKURA_BANGUMI_API = 'https://api.bangumi.lol';
const CORSAPI_BASE = 'https://corsapi.smone.workers.dev';

const CMLIUSSSS_TENCENT_HOST = 'm.douban.cmliussss.net';
const CMLIUSSSS_ALI_HOST = 'm.douban.cmliussss.com';
const CMLIUSSSS_UNIFIED_HOST = 'img.doubanio.cmliussss.net';
const CMLIUSSSS_IMAGE_TENCENT_HOST = 'img.doubanio.cmliussss.net';
const CMLIUSSSS_IMAGE_ALI_HOST = 'img.doubanio.cmliussss.com';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function getMetadataConfig(): Promise<MetadataConfig> {
  try {
    const config = await readGlobalConfig();
    return config?.metadata ?? { ...DEFAULT_METADATA_CONFIG };
  } catch {
    return { ...DEFAULT_METADATA_CONFIG };
  }
}

export function buildDoubanDataUrl(originalUrl: string, config: MetadataConfig): string {
  switch (config.doubanProxyType) {
    case 'cors-proxy-zwei':
      return `${CORS_PROXY_ZWEI}${encodeURIComponent(originalUrl)}`;
    case 'cmliussss-cdn-tencent':
    case 'cmliussss-cdn-ali':
    case 'cmliussss-unified': {
      const host = config.doubanProxyType === 'cmliussss-cdn-tencent'
        ? CMLIUSSSS_TENCENT_HOST
        : config.doubanProxyType === 'cmliussss-cdn-ali'
          ? CMLIUSSSS_ALI_HOST
          : CMLIUSSSS_UNIFIED_HOST;

      try {
        const url = new URL(originalUrl);
        url.hostname = host;
        return url.toString();
      } catch {
        return originalUrl;
      }
    }
    case 'custom':
      return config.doubanProxy
        ? `${config.doubanProxy}${encodeURIComponent(originalUrl)}`
        : originalUrl;
    case 'direct':
    default:
      return originalUrl;
  }
}

export function buildDoubanImageUrl(originalUrl: string, config: MetadataConfig): string {
  if (!originalUrl) return originalUrl;
  if (!/doubanio\.com|douban\.com/.test(originalUrl)) return originalUrl;

  switch (config.doubanImageProxyType) {
    case 'direct':
      return originalUrl;
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com');
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, CMLIUSSSS_IMAGE_TENCENT_HOST);
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, CMLIUSSSS_IMAGE_ALI_HOST);
    case 'baidu':
      return `https://image.baidu.com/search/down?url=${encodeURIComponent(originalUrl)}`;
    case 'custom':
      return config.doubanImageProxy
        ? `${config.doubanImageProxy}${encodeURIComponent(originalUrl)}`
        : originalUrl;
    case 'server':
    default:
      return `/api/douban/image?url=${encodeURIComponent(originalUrl)}`;
  }
}

export function buildBangumiApiUrl(path: string, config: MetadataConfig): string {
  const normalizedPath = path.replace(/^\/+/, '');

  switch (config.bangumiApiType) {
    case 'cmliussss':
      return `${CMLIUSSSS_BANGUMI_API}/${normalizedPath}`;
    case 'sakura':
      return `${SAKURA_BANGUMI_API}/${normalizedPath}`;
    case 'corsapi':
      return `${CORSAPI_BASE}/?url=${encodeURIComponent(`https://api.bgm.tv/${normalizedPath}`)}`;
    case 'custom':
      return config.bangumiApiProxy
        ? `${trimTrailingSlash(config.bangumiApiProxy)}/${normalizedPath}`
        : `https://api.bgm.tv/${normalizedPath}`;
    case 'server':
    default:
      return `https://api.bgm.tv/${normalizedPath}`;
  }
}

export function buildBangumiImageUrl(originalUrl: string, config: MetadataConfig): string {
  if (!originalUrl) return originalUrl;
  if (!originalUrl.includes('lain.bgm.tv') && !originalUrl.includes('bgm.tv/pic')) {
    return originalUrl;
  }

  switch (config.bangumiImageProxyType) {
    case 'cmliussss':
      return originalUrl.replace(/lain\.bgm\.tv/g, CMLIUSSSS_IMAGE_TENCENT_HOST);
    case 'sakura':
      return originalUrl
        .replace(/lain\.bgm\.tv/g, 'lain.bangumi.lol')
        .replace(/bgm\.tv/g, 'bangumi.lol');
    case 'corsapi':
      return `${CORSAPI_BASE}/?url=${encodeURIComponent(originalUrl)}`;
    case 'custom':
      return config.bangumiImageProxy
        ? `${config.bangumiImageProxy}${encodeURIComponent(originalUrl)}`
        : `/api/bangumi/image?url=${encodeURIComponent(originalUrl)}`;
    case 'direct':
      return originalUrl;
    case 'server':
    default:
      return `/api/bangumi/image?url=${encodeURIComponent(originalUrl)}`;
  }
}

export function buildDoubanRequestHeaders(config: MetadataConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Referer': 'https://movie.douban.com/',
    'Accept': 'application/json, text/plain, */*',
  };

  const cookies = sanitizeHeaderValue(config.doubanCookies);
  if (cookies) {
    headers.Cookie = cookies;
  }

  return headers;
}
