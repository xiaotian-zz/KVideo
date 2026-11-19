/**
 * 元数据代理配置（移植自 LunaTV）。
 * 客户端的设置页和服务端的代理请求共用这份类型与默认值。
 */

export type DoubanProxyType =
  | 'direct'
  | 'cors-proxy-zwei'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'cmliussss-unified'
  | 'custom';

export type DoubanImageProxyType =
  | 'direct'
  | 'server'
  | 'img3'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'baidu'
  | 'custom';

export type BangumiApiType =
  | 'server'
  | 'cmliussss'
  | 'corsapi'
  | 'sakura'
  | 'custom';

export type BangumiImageProxyType =
  | 'server'
  | 'cmliussss'
  | 'corsapi'
  | 'sakura'
  | 'direct'
  | 'custom';

export interface MetadataConfig {
  doubanProxyType: DoubanProxyType;
  doubanProxy: string;
  doubanImageProxyType: DoubanImageProxyType;
  doubanImageProxy: string;
  bangumiApiType: BangumiApiType;
  bangumiApiProxy: string;
  bangumiImageProxyType: BangumiImageProxyType;
  bangumiImageProxy: string;
  doubanCookies: string;
}

export const DEFAULT_METADATA_CONFIG: MetadataConfig = {
  // 保持 KVideo 现有行为：数据直连、图片由服务端代理
  doubanProxyType: 'direct',
  doubanProxy: '',
  doubanImageProxyType: 'server',
  doubanImageProxy: '',
  // 与 LunaTV 默认值一致
  bangumiApiType: 'cmliussss',
  bangumiApiProxy: '',
  bangumiImageProxyType: 'cmliussss',
  bangumiImageProxy: '',
  doubanCookies: '',
};

export const DOUBAN_PROXY_OPTIONS: Array<{ value: DoubanProxyType; label: string }> = [
  { value: 'direct', label: '直连（服务器直接请求豆瓣）' },
  { value: 'cors-proxy-zwei', label: 'Cors Proxy By Zwei' },
  { value: 'cmliussss-cdn-tencent', label: '豆瓣 CDN By CMLiussss（腾讯云）' },
  { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
  { value: 'cmliussss-unified', label: '豆瓣 CDN By CMLiussss（统一域名）' },
  { value: 'custom', label: '自定义代理' },
];

export const DOUBAN_IMAGE_PROXY_OPTIONS: Array<{ value: DoubanImageProxyType; label: string }> = [
  { value: 'direct', label: '直连（浏览器直接请求豆瓣）' },
  { value: 'server', label: '服务器代理（由服务器代理请求豆瓣）' },
  { value: 'img3', label: '豆瓣官方精品 CDN（阿里云）' },
  { value: 'cmliussss-cdn-tencent', label: '豆瓣 CDN By CMLiussss（腾讯云）' },
  { value: 'cmliussss-cdn-ali', label: '豆瓣 CDN By CMLiussss（阿里云）' },
  { value: 'baidu', label: '百度图片代理（境内 CDN）' },
  { value: 'custom', label: '自定义代理' },
];

export const BANGUMI_API_OPTIONS: Array<{ value: BangumiApiType; label: string }> = [
  { value: 'server', label: '服务端转发（默认，访问官方 api.bgm.tv）' },
  { value: 'cmliussss', label: 'Bangumi 反代 By CMLiussss' },
  { value: 'corsapi', label: 'Cloudflare Worker 代理 By Smone' },
  { value: 'sakura', label: '桜色镜像站（bangumi.lol）' },
  { value: 'custom', label: '自定义反代地址' },
];

export const BANGUMI_IMAGE_PROXY_OPTIONS: Array<{ value: BangumiImageProxyType; label: string }> = [
  { value: 'server', label: '服务器代理（默认，由服务器代理请求）' },
  { value: 'cmliussss', label: 'Bangumi 图片 CDN By CMLiussss' },
  { value: 'corsapi', label: 'Cloudflare Worker 代理 By Smone' },
  { value: 'sakura', label: '桜色镜像站（bangumi.lol）' },
  { value: 'direct', label: '直连（浏览器直接请求 lain.bgm.tv）' },
  { value: 'custom', label: '自定义代理' },
];

function pickEnum<T extends string>(value: unknown, options: ReadonlyArray<{ value: T }>, fallback: T): T {
  return options.some((option) => option.value === value) ? (value as T) : fallback;
}

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function normalizeMetadataConfig(value: unknown): MetadataConfig {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_METADATA_CONFIG };
  }

  const input = value as Record<string, unknown>;

  return {
    doubanProxyType: pickEnum(input.doubanProxyType, DOUBAN_PROXY_OPTIONS, DEFAULT_METADATA_CONFIG.doubanProxyType),
    doubanProxy: pickString(input.doubanProxy, DEFAULT_METADATA_CONFIG.doubanProxy),
    doubanImageProxyType: pickEnum(
      input.doubanImageProxyType,
      DOUBAN_IMAGE_PROXY_OPTIONS,
      DEFAULT_METADATA_CONFIG.doubanImageProxyType
    ),
    doubanImageProxy: pickString(input.doubanImageProxy, DEFAULT_METADATA_CONFIG.doubanImageProxy),
    bangumiApiType: pickEnum(input.bangumiApiType, BANGUMI_API_OPTIONS, DEFAULT_METADATA_CONFIG.bangumiApiType),
    bangumiApiProxy: pickString(input.bangumiApiProxy, DEFAULT_METADATA_CONFIG.bangumiApiProxy),
    bangumiImageProxyType: pickEnum(
      input.bangumiImageProxyType,
      BANGUMI_IMAGE_PROXY_OPTIONS,
      DEFAULT_METADATA_CONFIG.bangumiImageProxyType
    ),
    bangumiImageProxy: pickString(input.bangumiImageProxy, DEFAULT_METADATA_CONFIG.bangumiImageProxy),
    doubanCookies: pickString(input.doubanCookies, DEFAULT_METADATA_CONFIG.doubanCookies),
  };
}
