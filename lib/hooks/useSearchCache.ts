import { useCallback } from 'react';
import type { Video, SourceBadge } from '@/lib/types';

interface SearchCache {
  query: string;
  results: Video[];
  availableSources: SourceBadge[];
  timestamp: number;
}

const CACHE_KEY = 'kvideo_search_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const MAX_CACHED_RESULTS = 300;

/**
 * Strip unnecessary large fields before caching to save LocalStorage space
 */
const stripVideoData = (results: Video[]) => {
  return results.slice(0, MAX_CACHED_RESULTS).map(video => {
    // Remove large text fields that are only needed for the detail page
    const rest = { ...video };
    delete rest.vod_content;
    delete rest.vod_actor;
    delete rest.vod_director;
    return rest;
  });
};

export function useSearchCache() {
  /**
   * Strip unnecessary large fields before caching to save LocalStorage space
   */


  const saveToCache = useCallback((
    query: string,
    results: Video[],
    sources: SourceBadge[]
  ) => {
    try {
      const strippedResults = stripVideoData(results);

      const cache: SearchCache = {
        query,
        results: strippedResults,
        availableSources: sources,
        timestamp: Date.now(),
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      console.log(`[Cache] Successfully saved ${strippedResults.length} results for query: "${query}"`);

    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[Cache] LocalStorage quota exceeded. Clearing cache and trying again with fewer results.');
        try {
          localStorage.removeItem(CACHE_KEY);
          // Try saving only top 100 results if quota exceeded
          const reducedResults = stripVideoData(results).slice(0, 100);
          const reducedCache = {
            query,
            results: reducedResults,
            availableSources: sources,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(reducedCache));
        } catch (innerError) {
          console.error('[Cache] Failed to save even reduced cache:', innerError);
        }
      } else {
        console.error('[Cache] Failed to save search results to LocalStorage:', error);
      }
    }
  }, []);

  const loadFromCache = useCallback((): SearchCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cache: SearchCache = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() - cache.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return cache;
    } catch (error) {
      console.error('[Cache] Failed to load search results from LocalStorage:', error);
      return null;
    }
  }, []);

  return {
    saveToCache,
    loadFromCache,
  };
}
