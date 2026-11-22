/**
 * Source Import Utilities - Handle parsing and importing sources from various formats
 */

import type { VideoSource, SourceSubscription } from '@/lib/types';
import { createUniqueSourceId } from '@/lib/utils/source-id';

/**
 * Simplified source format for import
 */
export interface ImportSourceFormat {
    id?: string;
    name: string;
    baseUrl?: string;
    url?: string;
    group?: 'normal' | 'premium';
    enabled?: boolean;
    priority?: number;
}

/**
 * Generate an id for imported sources that don't provide one.
 */
function createImportSourceId(name: string, usedIds: Set<string>): string {
    return createUniqueSourceId(name, usedIds);
}

/**
 * Import result containing categorized sources
 */
export interface ImportResult {
    normalSources: VideoSource[];
    premiumSources: VideoSource[];
    totalCount: number;
}

/**
 * Convert simplified import format to full VideoSource
 */
export function convertToVideoSource(source: ImportSourceFormat, usedIds: Set<string> = new Set()): VideoSource {
    const id = source.id || createImportSourceId(source.name, usedIds);
    if (source.id) {
        usedIds.add(source.id);
    }
    return {
        id,
        name: source.name,
        baseUrl: source.baseUrl || source.url || '',
        searchPath: '',
        detailPath: '',
        enabled: source.enabled !== false,
        priority: source.priority || 1,
        group: source.group || 'normal',
    };
}

/**
 * Validate if an object is a valid source format
 */
export function isValidSourceFormat(obj: unknown): obj is ImportSourceFormat {
    if (typeof obj !== 'object' || obj === null) return false;
    const source = obj as Record<string, unknown>;
    const hasName = typeof source.name === 'string' && source.name.length > 0;
    const hasUrl =
        (typeof source.baseUrl === 'string' && source.baseUrl.length > 0) ||
        (typeof source.url === 'string' && source.url.length > 0);
    return hasName && hasUrl;
}

/**
 * Parse sources from JSON string
 * Supports both array format and wrapped object format
 */
export function parseSourcesFromJson(jsonString: string): ImportResult {
    const data = JSON.parse(jsonString);

    let sourcesArray: unknown[];

    // Handle different JSON structures
    if (Array.isArray(data)) {
        sourcesArray = data;
    } else if (data.sources && Array.isArray(data.sources)) {
        sourcesArray = data.sources;
    } else if (data.list && Array.isArray(data.list)) {
        sourcesArray = data.list;
    } else {
        throw new Error('无法识别的JSON格式');
    }

    const normalSources: VideoSource[] = [];
    const premiumSources: VideoSource[] = [];
    const usedIds = new Set<string>();

    for (let index = 0; index < sourcesArray.length; index++) {
        const item = sourcesArray[index];
        if (!isValidSourceFormat(item)) continue;

        const source = convertToVideoSource(item, usedIds);

        if (item.group === 'premium') {
            premiumSources.push(source);
        } else {
            normalSources.push(source);
        }
    }

    return {
        normalSources,
        premiumSources,
        totalCount: normalSources.length + premiumSources.length,
    };
}

/**
 * Fetch and parse sources from a URL
 */
export async function fetchSourcesFromUrl(url: string): Promise<ImportResult> {
    const headers = {
        'Accept': 'application/json',
    };
    const isExternal = url.startsWith('http') && (typeof window !== 'undefined' && !url.includes(window.location.host));

    let response: Response;

    try {
        response = await fetch(url, { headers });
    } catch (directError) {
        if (!isExternal) {
            throw directError;
        }

        response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
            headers,
        });
    }

    if (!response.ok) {
        throw new Error(`获取失败: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return parseSourcesFromJson(text);
}

/**
 * Create a new subscription object
 */
export function createSubscription(name: string, url: string): SourceSubscription {
    return {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: name.trim() || '未命名订阅',
        url: url.trim(),
        lastUpdated: 0,
        autoRefresh: true,
    };
}

/**
 * Merge new sources with existing sources, avoiding duplicates
 */
export function mergeSources(
    existing: VideoSource[],
    newSources: VideoSource[]
): VideoSource[] {
    const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();
    const existingIds = new Set(existing.map(s => s.id));
    const existingUrls = new Set(existing.map(s => normalizeUrl(s.baseUrl)));
    const existingByName = new Map(existing.map(s => [s.name.trim().toLowerCase(), s]));
    const merged = [...existing];

    for (const source of newSources) {
        if (existingIds.has(source.id)) {
            // Update existing source
            const idx = merged.findIndex(s => s.id === source.id);
            if (idx !== -1) {
                merged[idx] = { ...merged[idx], ...source };
                existingByName.set(source.name.trim().toLowerCase(), merged[idx]);
                existingUrls.add(normalizeUrl(source.baseUrl));
            }
            continue;
        }

        const nameKey = source.name.trim().toLowerCase();
        const existingByNameSource = existingByName.get(nameKey);

        if (existingByNameSource) {
            // 名称和地址都一样：跳过
            if (normalizeUrl(existingByNameSource.baseUrl) === normalizeUrl(source.baseUrl)) {
                continue;
            }

            // 名称一样但地址不同：覆盖原有源的地址
            const idx = merged.findIndex(s => s.id === existingByNameSource.id);
            if (idx !== -1) {
                const updated = { ...merged[idx], baseUrl: source.baseUrl };
                merged[idx] = updated;
                existingByName.set(nameKey, updated);
                existingUrls.add(normalizeUrl(source.baseUrl));
            }
            continue;
        }

        if (existingUrls.has(normalizeUrl(source.baseUrl))) {
            // 地址已存在但名称不同，避免重复地址
            continue;
        }

        // Add new source
        const created = {
            ...source,
            priority: merged.length + 1,
        };
        merged.push(created);
        existingIds.add(source.id);
        existingUrls.add(normalizeUrl(source.baseUrl));
        existingByName.set(nameKey, created);
    }

    return merged;
}
