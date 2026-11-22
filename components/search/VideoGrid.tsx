'use client';

import { useState, useRef, useCallback, useMemo, memo, useEffect, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { VideoCard } from './VideoCard';
import { VideoGroupCard, GroupedVideo } from './VideoGroupCard';
import { settingsStore } from '@/lib/store/settings-store';
import { Video } from '@/lib/types';
import { useResolutionProbe } from '@/lib/hooks/useResolutionProbe';

interface VideoGridProps {
  videos: Video[];
  className?: string;
  isPremium?: boolean;
  latencies?: Record<string, number>;
}

export const VideoGrid = memo(function VideoGrid({
  videos,
  className = '',
  isPremium = false,
  latencies = {}
}: VideoGridProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const gridRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 订阅设置存储中的展示模式，避免在 effect 中同步 setState
  const displayMode = useSyncExternalStore(
    (onStoreChange) => settingsStore.subscribe(onStoreChange),
    () => settingsStore.getSettings().searchDisplayMode,
    () => 'normal' as const
  );

  // Initial load: Check for saved scroll position to ensure we render enough items
  useEffect(() => {
    const settings = settingsStore.getSettings();
    if (!settings.rememberScrollPosition) return;

    const params = searchParams.toString();
    const scrollKey = `scroll-pos:${pathname}${params ? '?' + params : ''}`;
    const savedPos = sessionStorage.getItem(scrollKey);

    if (savedPos) {
      const position = parseInt(savedPos, 10);
      if (!isNaN(position) && position > 500) {
        // Approximate visible count needed: 
        // 500 is roughly where the second/third row starts.
        // Each row is ~300-400px high on most screens. 
        // 24 items is 4-6 rows.
        // If scroll is deep, we force a larger initial visible count.
        // 24, 48, 72, 96...
        const estimatedRowsNeeded = Math.ceil(position / 300) + 2;
        // Match CSS breakpoints: sm: 3, md: 4, lg: 5, xl: 6
        const itemsPerRow = window.innerWidth >= 1280 ? 6 :
          (window.innerWidth >= 1024 ? 5 :
            (window.innerWidth >= 768 ? 4 :
              (window.innerWidth >= 640 ? 3 : 2)));
        const neededCount = Math.min(videos.length, estimatedRowsNeeded * itemsPerRow);

        if (neededCount > 24) {
          const nextCount = Math.ceil(neededCount / 24) * 24;
          // 挂载后再恢复滚动所需数量，避免同步 setState 造成级联渲染
          queueMicrotask(() => setVisibleCount(nextCount));
        }
      }
    }
  }, [pathname, searchParams, videos.length]);

  // Build stable list of videos to probe for resolution
  const videosToProbe = useMemo(() => {
    if (displayMode === 'grouped') {
      // For grouped mode, will probe after grouping
      return [];
    }
    // 只探测当前可见的卡片，避免一次搜索对全部结果发起上千个详情请求
    return videos
      .slice(0, visibleCount)
      .map(v => ({ id: String(v.vod_id), source: v.source }));
  }, [videos, displayMode, visibleCount]);

  // Group videos by name when in grouped mode
  const groupedVideos = useMemo<GroupedVideo[]>(() => {
    if (displayMode !== 'grouped') return [];

    const groups = new Map<string, Video[]>();

    videos.forEach(video => {
      const name = video.vod_name.toLowerCase().trim();
      if (!groups.has(name)) {
        groups.set(name, []);
      }
      groups.get(name)!.push(video);
    });

    return Array.from(groups.entries()).map(([, groupVideos]) => {
      // Sort by latency (lowest first) 
      const sorted = [...groupVideos].sort((a, b) => {
        if (a.latency === undefined) return 1;
        if (b.latency === undefined) return -1;
        return a.latency - b.latency;
      });

      return {
        representative: sorted[0],
        videos: sorted,
        name: sorted[0].vod_name,
      };
    });
  }, [videos, displayMode]);

  // Callback ref for the load more trigger
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();

    if (node) {
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 24);
        }
      }, { rootMargin: '400px' });

      observerRef.current.observe(node);
    }
  }, []);

  // Memoize the click handler
  const handleCardClick = useCallback((e: React.MouseEvent, videoId: string, videoUrl: string) => {
    const isMobile = window.innerWidth < 1024;

    if (isMobile) {
      if (activeCardId === videoId) {
        window.location.href = videoUrl;
      } else {
        e.preventDefault();
        setActiveCardId(videoId);
      }
    }
  }, [activeCardId]);

  // Normal mode items
  const videoItems = useMemo(() => {
    if (displayMode === 'grouped') return [];

    return videos.map((video, index) => {
      const params: Record<string, string> = {
        id: String(video.vod_id),
        source: video.source,
        title: video.vod_name,
      };

      if (isPremium) {
        params.premium = '1';
      }

      const videoUrl = `/player?${new URLSearchParams(params).toString()}`;

      const cardId = `${video.vod_id}-${index}`;

      return { video, videoUrl, cardId };
    });
  }, [videos, displayMode, isPremium]);

  // Grouped mode items
  const groupItems = useMemo(() => {
    if (displayMode !== 'grouped') return [];

    return groupedVideos.map((group, index) => ({
      group,
      cardId: `group-${group.representative.vod_id}-${index}`,
    }));
  }, [groupedVideos, displayMode]);

  // Build probe list for grouped mode (probe representative of each group)
  const groupedProbeList = useMemo(() => {
    if (displayMode !== 'grouped') return [];
    return groupedVideos
      .slice(0, visibleCount)
      .map(g => ({ id: String(g.representative.vod_id), source: g.representative.source }));
  }, [groupedVideos, displayMode, visibleCount]);

  // Probe resolutions
  const probeList = displayMode === 'grouped' ? groupedProbeList : videosToProbe;
  // 搜索页关闭分辨率探测，避免搜索后对大量结果额外请求详情和 m3u8
  const { resolutions, isProbing } = useResolutionProbe(probeList, false);

  const totalItems = displayMode === 'grouped' ? groupItems.length : videoItems.length;

  // 空结果在全部 Hook 调用之后再返回，保证 Hook 顺序稳定
  if (videos.length === 0) {
    return null;
  }

  return (
    <>
      <div
        ref={gridRef}
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6 max-w-[1920px] mx-auto ${className}`}
        role="list"
        aria-label="视频搜索结果"
      >
        {displayMode === 'grouped' ? (
          // Grouped mode
          groupItems.slice(0, visibleCount).map(({ group, cardId }) => {
            const isActive = activeCardId === cardId;
            return (
              <VideoGroupCard
                key={cardId}
                group={group}
                cardId={cardId}
                isActive={isActive}
                onCardClick={handleCardClick}
                isPremium={isPremium}
                latencies={latencies}
                resolution={resolutions[`${group.representative.source}:${group.representative.vod_id}`]}
                isProbing={isProbing && !resolutions[`${group.representative.source}:${group.representative.vod_id}`]}
              />
            );
          })
        ) : (
          // Normal mode
          videoItems.slice(0, visibleCount).map(({ video, videoUrl, cardId }) => {
            const isActive = activeCardId === cardId;
            return (
              <VideoCard
                key={cardId}
                video={video}
                videoUrl={videoUrl}
                cardId={cardId}
                isActive={isActive}
                onCardClick={handleCardClick}
                isPremium={isPremium}
                latencies={latencies}
                resolution={resolutions[`${video.source}:${video.vod_id}`]}
                isProbing={isProbing && !resolutions[`${video.source}:${video.vod_id}`]}
              />
            );
          })
        )}
      </div>

      {/* Load more trigger */}
      {visibleCount < totalItems && (
        <div
          ref={loadMoreRef}
          className="h-20 w-full flex items-center justify-center opacity-0 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </>
  );
});

