import type { ShortDramaCategory, ShortDramaItem } from '@/lib/types/shortdrama';

export type { ShortDramaCategory, ShortDramaItem };

export const SHORT_DRAMA_API = 'https://tyyszyapi.com/api.php/provide/vod';
export const SHORT_DRAMA_TIMEOUT_MS = 20000;
export const SHORT_DRAMA_CACHE_SECONDS = 3600;

const SHORT_DRAMA_KEYWORDS = [
  '短剧',
  '女频恋爱',
  '反转爽剧',
  '古装仙侠',
  '年代穿越',
  '脑洞悬疑',
  '现代都市',
];

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

interface RawClass {
  type_id?: number | string;
  type_name?: string;
}

interface RawItem {
  vod_id?: number | string;
  vod_name?: string;
  vod_pic?: string;
  vod_remarks?: string;
  vod_score?: string | number;
  type_id?: number | string;
  type_name?: string;
}

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(SHORT_DRAMA_TIMEOUT_MS);
}

export function mapShortDramaItem(item: RawItem): ShortDramaItem | null {
  if (!item.vod_name) return null;

  const score = Number(item.vod_score) || 0;
  const episodeCount = parseInt(
    String(item.vod_remarks || '').replace(/[^\d]/g, '') || '1',
    10
  );

  return {
    id: String(item.vod_id ?? item.vod_name),
    title: String(item.vod_name),
    cover: String(item.vod_pic || '').replace(/^http:\/\//i, 'https://'),
    rate: score > 0 ? score.toFixed(1) : undefined,
    episodeCount: Number.isFinite(episodeCount) ? episodeCount : undefined,
    remarks: item.vod_remarks,
  };
}

function normalizeCategories(classes: RawClass[]): ShortDramaCategory[] {
  return classes
    .filter((item) => item.type_name &&
      SHORT_DRAMA_KEYWORDS.some((keyword) => item.type_name!.includes(keyword)))
    .map((item) => ({
      id: String(item.type_id ?? ''),
      name: String(item.type_name),
    }))
    .filter((item) => item.id);
}

export interface ShortDramaPageResult {
  categories: ShortDramaCategory[];
  items: ShortDramaItem[];
  pagecount: number;
  activeCategoryId: string;
}

/**
 * 读取短剧分类，并按分类分页获取内容。
 * 分类列表接口同时返回最新内容，可在详情接口超时时兜底。
 */
export async function fetchShortDramaPage(
  categoryId?: string,
  page = 1
): Promise<ShortDramaPageResult> {
  try {
    const listResponse = await fetch(`${SHORT_DRAMA_API}?ac=list`, {
      headers: REQUEST_HEADERS,
      signal: timeoutSignal(),
      next: { revalidate: SHORT_DRAMA_CACHE_SECONDS },
    });
    if (!listResponse.ok) {
      return { categories: [], items: [], pagecount: 1, activeCategoryId: '' };
    }

    const listData = await listResponse.json();
    const categories = normalizeCategories(Array.isArray(listData?.class) ? listData.class : []);

    const parentOnly = ['短剧', '擦边短剧'];
    const fallbackCategory = categories.find((item) => !parentOnly.includes(item.name)) ?? categories[0];
    const activeCategoryId = categoryId && categories.some((item) => item.id === categoryId)
      ? categoryId
      : fallbackCategory?.id ?? '';

    const latestItems: ShortDramaItem[] = (Array.isArray(listData?.list) ? listData.list as RawItem[] : [])
      .filter((item) => !activeCategoryId || String(item.type_id ?? '') === activeCategoryId)
      .map(mapShortDramaItem)
      .filter((item): item is ShortDramaItem => !!item)
      .slice(0, 12);

    if (!activeCategoryId) {
      return { categories, items: latestItems, pagecount: 1, activeCategoryId };
    }

    try {
      const detailResponse = await fetch(
        `${SHORT_DRAMA_API}?ac=detail&t=${activeCategoryId}&pg=${page}`,
        {
          headers: REQUEST_HEADERS,
          signal: timeoutSignal(),
          next: { revalidate: SHORT_DRAMA_CACHE_SECONDS },
        }
      );

      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        const items: ShortDramaItem[] = (Array.isArray(detailData?.list) ? detailData.list as RawItem[] : [])
          .map(mapShortDramaItem)
          .filter((item): item is ShortDramaItem => !!item);

        if (items.length > 0) {
          return {
            categories,
            items,
            pagecount: Number(detailData?.pagecount) || 1,
            activeCategoryId,
          };
        }
      }
    } catch {
      // 详情接口失败时回退到分类列表中的最新内容
    }

    return {
      categories,
      items: latestItems,
      pagecount: 1,
      activeCategoryId,
    };
  } catch {
    return { categories: [], items: [], pagecount: 1, activeCategoryId: '' };
  }
}
