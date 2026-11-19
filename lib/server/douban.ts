import {
  buildDoubanDataUrl,
  buildDoubanRequestHeaders,
  getMetadataConfig,
} from '@/lib/server/metadata-proxy';

/**
 * 按全局元数据代理配置请求豆瓣 JSON 接口。
 * 代理不可用时回退到豆瓣原始地址。
 */
export async function fetchDoubanJson<T>(originalUrl: string): Promise<T> {
  const metadata = await getMetadataConfig();
  const targetUrl = buildDoubanDataUrl(originalUrl, metadata);
  const headers = buildDoubanRequestHeaders(metadata);

  let response = await fetch(targetUrl, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!response.ok && targetUrl !== originalUrl) {
    response = await fetch(originalUrl, {
      headers,
      next: { revalidate: 3600 },
    });
  }

  if (!response.ok) {
    throw new Error(`Douban API returned ${response.status}`);
  }

  return (await response.json()) as T;
}
