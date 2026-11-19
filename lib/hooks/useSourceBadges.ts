'use client';

import { useState, useMemo, useCallback } from 'react';
import type { SourceBadge } from '@/lib/types';

/**
 * Custom hook to manage source badge filtering
 * 
 * Features:
 * - Tracks available video sources
 * - Supports filtering by selected sources
 * - Auto-cleanup when sources no longer exist
 */
export function useSourceBadges<T extends { source?: string; sourceName?: string }>(
  videos: T[],
  availableSources: SourceBadge[]
) {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  // 仅保留仍存在的源，避免用 effect 清理状态
  const effectiveSelectedSources = useMemo(() => {
    if (selectedSources.size === 0) return selectedSources;
    const availableSourceIds = new Set(availableSources.map(s => s.id));
    const filtered = new Set(Array.from(selectedSources).filter(sourceId => availableSourceIds.has(sourceId)));
    return filtered.size === selectedSources.size ? selectedSources : filtered;
  }, [selectedSources, availableSources]);

  // Filter videos by selected sources
  const filteredVideos = useMemo(() => {
    if (effectiveSelectedSources.size === 0) {
      return videos;
    }

    return videos.filter(video =>
      video.source && effectiveSelectedSources.has(video.source)
    );
  }, [videos, effectiveSelectedSources]);

  // Toggle source selection
  const toggleSource = useCallback((sourceId: string) => {
    setSelectedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  }, []);

  return {
    selectedSources: effectiveSelectedSources,
    filteredVideos,
    toggleSource,
  };
}
