/**
 * Parallel Streaming Search API Route
 * Searches all sources in parallel and streams results immediately as they arrive.
 * Supports abort via request.signal when clients disconnect.
 * Caps results per source and total to prevent OOM.
 */

import { NextRequest } from 'next/server';
import type { VideoSource } from '@/lib/types';
import { searchVideos } from '@/lib/api/client';
import { getSourceName } from '@/lib/utils/source-names';
import { traditionalToSimplified } from '@/lib/utils/chinese-convert';

export const runtime = 'edge';

const MAX_TOTAL_VIDEOS = 2000;
// 只搜每个源的第一页：76 个源的第一页已经足够，避免翻页把请求量放大数倍
const MAX_PAGES_PER_SOURCE = 1;
const PER_SOURCE_TIMEOUT_MS = 20000;
// 全局限速：一次只同时搜索这么多源，避免瞬间打出几十上百个请求
const SOURCE_BATCH_SIZE = 10;
// 单次搜索的最长耗时，超时后立即收尾，防止慢源长期占用服务器
const SEARCH_DEADLINE_MS = 25000;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Use the request signal for abort detection
      const signal = request.signal;

      const safeSend = (data: object) => {
        if (signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller may be closed
        }
      };

      try {
        const body = (await request.json()) as { query?: unknown; sources?: VideoSource[] };
        const { query, sources: sourceConfigs } = body;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          safeSend({ type: 'error', message: 'Invalid query' });
          controller.close();
          return;
        }

        const normalizedQuery = traditionalToSimplified(query.trim());
        const sources = Array.isArray(sourceConfigs) && sourceConfigs.length > 0
          ? sourceConfigs
          : [];

        if (sources.length === 0) {
          safeSend({ type: 'error', message: 'No valid sources provided' });
          controller.close();
          return;
        }

        safeSend({ type: 'start', totalSources: sources.length });

        let completedSources = 0;
        let totalVideosFound = 0;

        // 整体搜索截止时间：到点后中止所有仍在进行的源请求
        const deadlineController = new AbortController();
        const deadlineTimer = setTimeout(
          () => deadlineController.abort(),
          SEARCH_DEADLINE_MS
        );
        const stopSignal = deadlineController.signal;
        const onRequestAbort = () => deadlineController.abort();
        signal.addEventListener('abort', onRequestAbort, { once: true });
        const isStopped = () => signal.aborted || stopSignal.aborted;

        const searchSource = async (source: VideoSource) => {
          if (isStopped()) return;

          const startTime = performance.now();

          // Per-source timeout via AbortController
          const sourceController = new AbortController();
          const sourceTimeout = setTimeout(
            () => sourceController.abort(),
            PER_SOURCE_TIMEOUT_MS
          );

          // Cascade request abort / deadline to source controller
          const onStop = () => sourceController.abort();
          signal.addEventListener('abort', onStop, { once: true });
          stopSignal.addEventListener('abort', onStop, { once: true });

          try {
            const result = await searchVideos(
              normalizedQuery, [source], 1, sourceController.signal
            );
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            const videos = result[0]?.results || [];
            const pagecount = result[0]?.pagecount ?? 1;

            completedSources++;
            totalVideosFound += videos.length;

            if (videos.length > 0 && !isStopped()) {
              safeSend({
                type: 'videos',
                videos: videos.map((video) => ({
                  ...video,
                  sourceDisplayName: source.name || getSourceName(source.id),
                  latency,
                })),
                source: source.id,
                completedSources,
                totalSources: sources.length,
                latency,
              });
            }

            safeSend({
              type: 'progress',
              completedSources,
              totalSources: sources.length,
              totalVideosFound,
            });

            // Auto-fetch remaining pages (capped)
            if (pagecount > 1 && totalVideosFound < MAX_TOTAL_VIDEOS && !isStopped()) {
              const maxPages = Math.min(pagecount, MAX_PAGES_PER_SOURCE);
              const remainingPages = Array.from(
                { length: maxPages - 1 }, (_, i) => i + 2
              );

              for (const pg of remainingPages) {
                if (isStopped() || totalVideosFound >= MAX_TOTAL_VIDEOS) break;

                try {
                  const pageResult = await searchVideos(
                    normalizedQuery, [source], pg, sourceController.signal
                  );
                  const pageVideos = pageResult[0]?.results || [];
                  totalVideosFound += pageVideos.length;

                  if (pageVideos.length > 0 && !isStopped()) {
                    safeSend({
                      type: 'videos',
                      videos: pageVideos.map((video) => ({
                        ...video,
                        sourceDisplayName: source.name || getSourceName(source.id),
                        latency,
                      })),
                      source: source.id,
                      completedSources,
                      totalSources: sources.length,
                      latency,
                    });
                  }

                  safeSend({
                    type: 'progress',
                    completedSources,
                    totalSources: sources.length,
                    totalVideosFound,
                  });
                } catch {
                  // Page fetch failed, continue
                }
              }
            }
          } catch (error) {
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            console.error(
              `[Search] Source ${source.id} failed after ${latency}ms:`,
              error
            );
            completedSources++;

            safeSend({
              type: 'progress',
              completedSources,
              totalSources: sources.length,
              totalVideosFound,
            });
          } finally {
            clearTimeout(sourceTimeout);
            signal.removeEventListener('abort', onStop);
            stopSignal.removeEventListener('abort', onStop);
          }
        };

        try {
          // 固定并发数的工作池：最多同时搜索 SOURCE_BATCH_SIZE 个源
          let nextIndex = 0;
          const worker = async () => {
            while (!isStopped()) {
              const index = nextIndex++;
              if (index >= sources.length) return;
              await searchSource(sources[index]);
            }
          };
          await Promise.all(
            Array.from(
              { length: Math.min(SOURCE_BATCH_SIZE, sources.length) },
              () => worker()
            )
          );
        } finally {
          clearTimeout(deadlineTimer);
          signal.removeEventListener('abort', onRequestAbort);
        }

        if (!signal.aborted) {
          safeSend({
            type: 'complete',
            totalVideosFound,
            totalSources: sources.length,
            maxPageCount: MAX_PAGES_PER_SOURCE,
          });
        }

        controller.close();
      } catch (error) {
        if (!signal.aborted) {
          console.error('Search error:', error);
          safeSend({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
