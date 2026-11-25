/* eslint-disable @typescript-eslint/no-explicit-any -- hls.js loader 基类与回调类型未公开导出 */
/**
 * hls.js 并发分片预取 loader（移植自 LunaTV）
 *
 * hls.js 默认一次只加载一个分片，单连接被限速或 RTT 高时缓冲增长慢。
 * 本模块在主分片加载的同时预取后续 N 个分片到内存，主加载命中缓存时零等待返回。
 *
 * - playlistLoader：拦截 m3u8 响应，解析分片 URL 列表
 * - fragLoader：命中预取缓存直接返回；预取进行中则等待同一 Promise；未命中正常加载并预取后续分片
 *
 * 安全策略：
 * - 内存上限：concurrency + 2 个分片，FIFO 淘汰
 * - 失败熔断：失败率超过 50%（窗口 20 次）自动停用，冷却后半开重试
 * - Byte-Range 分片不支持预取，原样直连
 */

const PREFETCH_WINDOW_STATS = 20;
const PREFETCH_FAIL_RATE_LIMIT = 0.5;

export interface PrefetchLoaderFactory {
    loader: unknown;
    fLoader: unknown;
    pLoader: unknown;
}

export interface PrefetchLoaderOptions {
    /** playlist 响应转换器（去广告过滤、URL 改写），在抽取分片 URL 之前执行 */
    transformPlaylist?: (body: string, baseUrl: string) => string;
}

interface CacheEntry {
    status: 'pending' | 'ready';
    promise?: Promise<ArrayBuffer>;
    data?: ArrayBuffer;
    controller?: AbortController;
    aborted?: boolean;
}

export function createPrefetchLoaders(
    concurrency: number,
    BaseLoader: any,
    options?: PrefetchLoaderOptions,
): PrefetchLoaderFactory {
    const transformPlaylist = options?.transformPlaylist;
    const fragUrls: string[] = [];
    const indexByUrl = new Map<string, number>();
    const cache = new Map<string, CacheEntry>();
    const cacheLimit = concurrency + 2;
    let disabled = false;
    let disabledAt = 0;
    let cooldownMs = 60_000;
    let okCount = 0;
    let failCount = 0;

    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const makeStats = (byteLength: number) => {
        const t = now();
        return {
            loading: { start: t, first: t, end: t },
            total: byteLength,
            loaded: byteLength,
            bwEstimate: 0,
        };
    };

    // hls.js 会在 load() 之前保存 loader.stats 引用（frag.stats = loader.stats），
    // 命中缓存时必须原地更新该对象，不能重新赋值，否则分片统计会丢失。
    const fillStats = (stats: any, byteLength: number) => {
        if (!stats) return makeStats(byteLength);
        const t = now();
        if (!stats.loading) stats.loading = { start: t, first: t, end: t };
        stats.loading.start = stats.loading.start || t;
        stats.loading.first = t;
        stats.loading.end = t;
        stats.total = byteLength;
        stats.loaded = byteLength;
        stats.bwEstimate = 0;
        return stats;
    };

    const evictOldest = () => {
        while (cache.size > cacheLimit) {
            const oldest = cache.keys().next().value;
            if (oldest === undefined) break;
            cache.delete(oldest);
        }
    };

    const shouldDisable = () => {
        const total = okCount + failCount;
        return total >= PREFETCH_WINDOW_STATS && failCount / total > PREFETCH_FAIL_RATE_LIMIT;
    };

    const maybeReenable = () => {
        if (!disabled) return;
        if (now() - disabledAt >= cooldownMs) {
            disabled = false;
            okCount = 0;
            failCount = 0;
            cooldownMs = Math.min(cooldownMs * 2, 600_000);
        }
    };

    const prefetch = (url: string) => {
        maybeReenable();
        if (disabled || cache.has(url)) return;
        const entry: CacheEntry = { status: 'pending' };
        entry.controller = new AbortController();
        entry.promise = fetch(url, {
            method: 'GET',
            credentials: 'omit',
            signal: entry.controller.signal,
        })
            .then((res) => {
                if (!res.ok) throw new Error(`prefetch HTTP ${res.status}`);
                return res.arrayBuffer();
            })
            .then((data) => {
                entry.status = 'ready';
                entry.data = data;
                okCount += 1;
                return data;
            })
            .catch((err: unknown) => {
                cache.delete(url);
                if (entry.aborted) {
                    throw new Error('prefetch aborted');
                }
                failCount += 1;
                if (shouldDisable()) {
                    disabled = true;
                    disabledAt = now();
                }
                throw err instanceof Error ? err : new Error('prefetch failed');
            });
        cache.set(url, entry);
        entry.promise.catch(() => {});
        evictOldest();
    };

    const cancelPrefetch = (url: string) => {
        const entry = cache.get(url);
        if (entry && entry.status === 'pending' && !entry.aborted) {
            entry.aborted = true;
            try {
                entry.controller?.abort();
            } catch {
                /* 已 abort 或不可取消 */
            }
            cache.delete(url);
        }
    };

    let lastPrefetchBatch: string[] = [];

    const prefetchAfter = (url: string) => {
        if (concurrency <= 0) return;
        maybeReenable();
        if (disabled) return;
        const idx = indexByUrl.get(url);
        if (idx === undefined) return;
        const batch: string[] = [];
        for (let i = 1; i <= concurrency; i += 1) {
            const next = fragUrls[idx + i];
            if (next) {
                prefetch(next);
                batch.push(next);
            }
        }
        lastPrefetchBatch = batch;
    };

    const cancelPrefetchBatch = () => {
        for (const u of lastPrefetchBatch) {
            cancelPrefetch(u);
        }
        lastPrefetchBatch = [];
    };

    const clearPrefetchState = () => {
        for (const entry of cache.values()) {
            if (entry.status === 'pending') {
                entry.aborted = true;
                try {
                    entry.controller?.abort();
                } catch {
                    /* 已 abort */
                }
            }
        }
        cache.clear();
        fragUrls.length = 0;
        indexByUrl.clear();
        lastPrefetchBatch = [];
    };

    const parsePlaylist = (body: string, baseUrl: string) => {
        try {
            // Byte-Range 分片无法用完整 GET 预取，直接关闭本播放列表的预取
            if (body.includes('#EXT-X-BYTERANGE')) {
                fragUrls.length = 0;
                indexByUrl.clear();
                return;
            }
            const lines = body.split('\n');
            const urls: string[] = [];
            for (const raw of lines) {
                const line = raw.trim();
                if (!line || line.startsWith('#')) continue;
                try {
                    urls.push(new URL(line, baseUrl).toString());
                } catch {
                    /* 跳过非法行 */
                }
            }
            if (urls.length < 2) return;
            fragUrls.length = 0;
            indexByUrl.clear();
            urls.forEach((u, i) => {
                fragUrls.push(u);
                indexByUrl.set(u, i);
            });
        } catch {
            /* 解析失败不影响主链路 */
        }
    };

    const toPlaylistBody = (data: unknown): string | null => {
        if (!data) return null;
        if (typeof data === 'string') return data;
        if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
        return null;
    };

    class PrefetchFragLoader extends BaseLoader {
        private loadState: { cancelled: boolean } | null = null;

        load(context: any, config: any, callbacks: any) {
            this.context = context;
            const url: string = context?.url;
            const hasRange =
                context?.rangeStart !== undefined &&
                context?.rangeEnd !== undefined &&
                context.rangeEnd > context.rangeStart;

            if (!url || hasRange) {
                super.load(context, config, callbacks);
                return;
            }

            if (this.loadState && !this.loadState.cancelled) {
                this.loadState.cancelled = true;
                super.abort();
            }
            const state = { cancelled: false };
            this.loadState = state;

            const entry = cache.get(url);
            if (entry?.status === 'ready' && entry.data) {
                cache.delete(url);
                const data = entry.data;
                const stats = fillStats(this.stats, data.byteLength);
                callbacks.onSuccess({ url, data }, stats, context, undefined);
                prefetchAfter(url);
                return;
            }

            if (entry?.status === 'pending' && entry.promise) {
                const savedContext = context;
                const savedConfig = config;
                const savedCallbacks = callbacks;
                let raced = false;
                const timer = setTimeout(() => {
                    if (raced) return;
                    raced = true;
                    try {
                        entry.controller?.abort();
                    } catch {
                        /* 已 abort */
                    }
                    if (!state.cancelled && this.loadState === state) {
                        try {
                            super.load(savedContext, savedConfig, savedCallbacks);
                        } catch {
                            /* 忽略 */
                        }
                    }
                }, 10000);
                entry.promise
                    .then((data) => {
                        if (raced) return;
                        raced = true;
                        clearTimeout(timer);
                        if (state.cancelled || this.loadState !== state) return;
                        cache.delete(url);
                        const stats = fillStats(this.stats, data.byteLength);
                        callbacks.onSuccess(
                            { url, data },
                            stats,
                            savedContext,
                            undefined,
                        );
                        prefetchAfter(url);
                    })
                    .catch(() => {
                        if (raced) return;
                        raced = true;
                        clearTimeout(timer);
                        if (state.cancelled || this.loadState !== state) return;
                        if (this.loadState === state) {
                            super.load(savedContext, savedConfig, savedCallbacks);
                        }
                    });
                return;
            }

            super.load(context, config, callbacks);
            prefetchAfter(url);
        }

        abort() {
            if (this.loadState) {
                this.loadState.cancelled = true;
            }
            const url: string = this.context?.url;
            if (url) {
                const entry = cache.get(url);
                if (entry && entry.status === 'pending') {
                    cancelPrefetch(url);
                }
            }
            cancelPrefetchBatch();
            super.abort();
        }

        destroy() {
            // hls.js 每加载完一个分片就会销毁该 loader 实例；
            // 这里不能清理共享预取缓存，否则下一次分片永远无法命中。
            // 共享状态统一在 PrefetchPlaylistLoader.destroy()（Hls 实例销毁）时清理。
            if (this.loadState) {
                this.loadState.cancelled = true;
            }
            super.destroy();
        }
    }

    class PrefetchPlaylistLoader {
        private inner: any;

        constructor(config: any) {
            this.inner = new BaseLoader(config);
        }

        get stats() {
            return this.inner.stats;
        }

        get context() {
            return this.inner.context;
        }

        load(context: any, config: any, callbacks: any) {
            const wrappedCallbacks = {
                ...callbacks,
                onSuccess: (response: any, stats: any, ctx: any, networkDetails: any) => {
                    const baseUrl: string = response?.url || context?.url || '';
                    if (
                        transformPlaylist &&
                        typeof response?.data === 'string' &&
                        response.data.includes('#EXTINF')
                    ) {
                        try {
                            response.data = transformPlaylist(response.data, baseUrl);
                        } catch {
                            /* 转换失败保留原始内容 */
                        }
                    }
                    const body = toPlaylistBody(response?.data);
                    if (body) {
                        parsePlaylist(body, response?.url || context?.url || '');
                    }
                    callbacks.onSuccess(response, stats, ctx, networkDetails);
                },
            };
            this.inner.load(context, config, wrappedCallbacks);
        }

        abort() {
            this.inner.abort();
        }

        destroy() {
            clearPrefetchState();
            this.inner.destroy();
        }
    }

    return {
        loader: PrefetchFragLoader as any,
        fLoader: PrefetchFragLoader as any,
        pLoader: PrefetchPlaylistLoader as any,
    };
}
