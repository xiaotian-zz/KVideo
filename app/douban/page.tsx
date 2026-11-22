'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { MovieCard } from '@/components/home/MovieCard';
import { DoubanSelector } from '@/components/douban/DoubanSelector';

interface DoubanMovie {
  id: string;
  title: string;
  cover: string;
  rate: string;
  url: string;
}

interface DoubanListItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year?: string;
}

const PAGE_SIZE = 25;

const TYPE_CONFIG = {
  movie: { title: '电影', description: '来自豆瓣的精选内容' },
  tv: { title: '剧集', description: '来自豆瓣的精选内容' },
  anime: { title: '动漫', description: '来自豆瓣与 Bangumi 的精选内容' },
  show: { title: '综艺', description: '来自豆瓣的精选内容' },
} as const;

type CategoryType = keyof typeof TYPE_CONFIG;

const WEEKDAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isCategoryType(value: string | null): value is CategoryType {
  return value === 'movie' || value === 'tv' || value === 'anime' || value === 'show';
}

function getInitialPrimary(type: CategoryType): string {
  if (type === 'movie') return '热门';
  if (type === 'anime') return '每日放送';
  return '最近热门';
}

function getInitialSecondary(type: CategoryType): string {
  if (type === 'movie') return '全部';
  if (type === 'show') return 'show';
  return 'tv';
}

function getEmptyMultiValues(): Record<string, string> {
  return {
    type: 'all',
    region: 'all',
    year: 'all',
    platform: 'all',
    label: 'all',
    sort: 'T',
  };
}

function isSameValues(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
}

function DoubanCategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const type: CategoryType = isCategoryType(typeParam) ? typeParam : 'movie';
  const config = TYPE_CONFIG[type];

  const [primarySelection, setPrimarySelection] = useState(() => getInitialPrimary(type));
  const [secondarySelection, setSecondarySelection] = useState(() => getInitialSecondary(type));
  const [multiLevelValues, setMultiLevelValues] = useState<Record<string, string>>(
    getEmptyMultiValues
  );
  const [selectedWeekday, setSelectedWeekday] = useState(
    () => WEEKDAY_MAP[new Date().getDay()]
  );

  const [movies, setMovies] = useState<DoubanMovie[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  // 切换分类时重置所有标签（与 LunaTV 一致）
  useEffect(() => {
    setPrimarySelection(getInitialPrimary(type));
    setSecondarySelection(getInitialSecondary(type));
    setMultiLevelValues(getEmptyMultiValues());
  }, [type]);

  const buildListPath = useCallback(
    (pageIndex: number) => {
      const start = pageIndex * PAGE_SIZE;

      if (type === 'anime' && primarySelection === '每日放送') {
        return null;
      }

      // 电影具体榜单、剧集/综艺「最近热门」走豆瓣最近热门分类接口；
      // 电影「全部」与剧集/综艺「全部」走推荐筛选接口。
      if (
        (type === 'movie' && primarySelection !== '全部') ||
        ((type === 'tv' || type === 'show') && primarySelection === '最近热门')
      ) {
        const kind = type === 'movie' ? 'movie' : 'tv';
        const category = type === 'movie' ? primarySelection : '最近热门';
        return `/api/douban/categories?kind=${kind}&category=${encodeURIComponent(
          category
        )}&type=${encodeURIComponent(secondarySelection)}&limit=${PAGE_SIZE}&start=${start}`;
      }

      const params = new URLSearchParams({
        kind: type === 'anime' ? (primarySelection === '番剧' ? 'tv' : 'movie') : 'tv',
        limit: String(PAGE_SIZE),
        start: String(start),
        region: multiLevelValues.region || 'all',
        year: multiLevelValues.year || 'all',
        platform: multiLevelValues.platform || 'all',
        sort: multiLevelValues.sort || 'T',
        label: multiLevelValues.label || 'all',
        category: multiLevelValues.type || 'all',
      });

      if (type === 'anime') {
        params.set('category', '动画');
        params.set('format', primarySelection === '番剧' ? '电视剧' : 'all');
      } else if (type === 'tv') {
        params.set('format', '电视剧');
      } else if (type === 'show') {
        params.set('format', '综艺');
      }

      return `/api/douban/recommends?${params.toString()}`;
    },
    [type, primarySelection, secondarySelection, multiLevelValues]
  );

  const loadMovies = useCallback(
    async (pageIndex: number) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);

      try {
        if (type === 'anime' && primarySelection === '每日放送') {
          if (pageIndex > 0) {
            setHasMore(false);
            return;
          }

          const response = await fetch('/api/bangumi/calendar', { cache: 'no-store' });
          const days = await response.json();
          const day = Array.isArray(days)
            ? days.find((item) => item?.weekday?.en === selectedWeekday)
            : null;
          const items: DoubanListItem[] = Array.isArray(day?.items) ? day.items : [];

          if (requestId !== requestIdRef.current) return;

          setMovies(
            items
              .filter((item) => item.id && item.title)
              .map((item) => ({
                id: item.id,
                title: item.title,
                cover: item.poster,
                rate: item.rate,
                url: `https://bgm.tv/subject/${item.id}`,
              }))
          );
          setPage(0);
          setHasMore(false);
          return;
        }

        const path = buildListPath(pageIndex);
        if (!path) {
          setMovies([]);
          setHasMore(false);
          return;
        }

        const response = await fetch(path, { cache: 'no-store' });
        const data = await response.json();
        const list: DoubanListItem[] = Array.isArray(data?.list) ? data.list : [];

        if (requestId !== requestIdRef.current) return;

        const nextMovies = list
          .filter((item) => item.id && item.title)
          .map((item) => ({
            id: item.id,
            title: item.title,
            cover: item.poster,
            rate: item.rate,
            url: `https://movie.douban.com/subject/${item.id}/`,
          }));

        setMovies((current) => (pageIndex === 0 ? nextMovies : [...current, ...nextMovies]));
        setPage(pageIndex);
        setHasMore(nextMovies.length >= PAGE_SIZE);
      } catch {
        if (requestId === requestIdRef.current) {
          if (pageIndex === 0) setMovies([]);
          setHasMore(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [type, primarySelection, selectedWeekday, buildListPath]
  );

  useEffect(() => {
    void loadMovies(0);
  }, [loadMovies]);

  const handlePrimaryChange = useCallback(
    (value: string) => {
      if (value === primarySelection) return;

      setMultiLevelValues(getEmptyMultiValues());
      setPrimarySelection(value);
      if (value === '最近热门' && type === 'tv') setSecondarySelection('tv');
      if (value === '最近热门' && type === 'show') setSecondarySelection('show');
      if (type === 'movie' && value !== '全部') setSecondarySelection('全部');
    },
    [primarySelection, type]
  );

  const handleSecondaryChange = useCallback(
    (value: string) => {
      if (value === secondarySelection) return;
      setSecondarySelection(value);
    },
    [secondarySelection]
  );

  const handleMultiLevelChange = useCallback(
    (values: Record<string, string>) => {
      setMultiLevelValues((current) => (isSameValues(current, values) ? current : values));
    },
    []
  );

  const handleMovieClick = useCallback(
    (movie: DoubanMovie) => {
      router.push(`/?q=${encodeURIComponent(movie.title)}`);
    },
    [router]
  );

  const selectors = useMemo(
    () => (
      <div className="relative rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 sm:p-6 backdrop-blur-2xl shadow-[var(--shadow-sm)]">
        <DoubanSelector
          type={type}
          primarySelection={primarySelection}
          secondarySelection={secondarySelection}
          onPrimaryChange={handlePrimaryChange}
          onSecondaryChange={handleSecondaryChange}
          onMultiLevelChange={handleMultiLevelChange}
          onWeekdayChange={setSelectedWeekday}
        />
      </div>
    ),
    [
      type,
      primarySelection,
      secondarySelection,
      handlePrimaryChange,
      handleSecondaryChange,
      handleMultiLevelChange,
    ]
  );

  return (
    <div className="min-h-screen bg-[var(--bg-color)] bg-[image:var(--bg-image)] bg-fixed">
      <Navbar onReset={() => router.push('/')} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-color)]">{config.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-color-secondary)]">
            {type === 'anime' && primarySelection === '每日放送'
              ? '来自 Bangumi 番组计划的精选内容'
              : config.description}
          </p>
        </div>

        {selectors}

        {loading && movies.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] animate-pulse"
              />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20 text-sm text-[var(--text-color-secondary)]">
            暂无内容
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onMovieClick={handleMovieClick} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadMovies(page + 1)}
                  className="px-6 py-2 text-sm rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function DoubanCategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-color)]" />}>
      <DoubanCategoryContent />
    </Suspense>
  );
}
