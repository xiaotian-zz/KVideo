'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { MovieCard } from '@/components/home/MovieCard';
import { settingsStore, type AppSettings } from '@/lib/store/settings-store';
import { getSession } from '@/lib/store/auth-store';
import { canRoleAccessSourceKind } from '@/lib/store/source-access-store';
import type { VideoSource } from '@/lib/types';

interface SourceCategory {
  id: string;
  name: string;
}

interface SourceVideo {
  id: string;
  title: string;
  cover: string;
  remarks?: string;
  typeName?: string;
  year?: string;
  area?: string;
}

function getPageItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];
  const windowStart = Math.max(2, current - 2);
  const windowEnd = Math.min(total - 1, current + 2);

  if (windowStart > 2) items.push('ellipsis');
  for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
    items.push(pageNumber);
  }
  if (windowEnd < total - 1) items.push('ellipsis');
  items.push(total);

  return items;
}

export default function SourceBrowserPage() {
  const router = useRouter();
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [premiumSourceIds, setPremiumSourceIds] = useState<string[]>([]);
  const [activeSourceId, setActiveSourceId] = useState('');
  const [categories, setCategories] = useState<SourceCategory[]>([]);
  const [activeType, setActiveType] = useState('');
  const [items, setItems] = useState<SourceVideo[]>([]);
  const [page, setPage] = useState(1);
  const [pagecount, setPagecount] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<'category' | 'search'>('category');
  const [sortBy, setSortBy] = useState<
    'default' | 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc'
  >('default');
  const [filterYear, setFilterYear] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const requestIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listAbortRef = useRef<AbortController | null>(null);
  const categoryAbortRef = useRef<AbortController | null>(null);
  const categoryRequestIdRef = useRef(0);

  useEffect(() => {
    const syncSources = (settings: AppSettings) => {
      const role = getSession()?.role;
      const canViewNormal = canRoleAccessSourceKind(role, 'normal');
      const canViewPremium = canRoleAccessSourceKind(role, 'premium');
      const nextPremiumIds = canViewPremium
        ? settings.premiumSources.map((source) => source.id)
        : [];

      setPremiumSourceIds(nextPremiumIds);
      setSources([
        ...(canViewNormal ? settings.sources : []),
        ...(canViewPremium ? settings.premiumSources : []),
      ]
        .filter((source) => source.enabled)
        .sort((left, right) => {
          const leftPriority = left.priority ?? Number.MAX_SAFE_INTEGER;
          const rightPriority = right.priority ?? Number.MAX_SAFE_INTEGER;
          return leftPriority - rightPriority;
        }));
    };

    syncSources(settingsStore.getSettings());
    return settingsStore.subscribe(() => {
      syncSources(settingsStore.getSettings());
    });
  }, []);

  const loadItems = useCallback(async (
    sourceId: string,
    typeId: string,
    pageNumber: number,
    searchKeyword = ''
  ) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    // 取消上一次列表请求，避免快速点击时请求堆积
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    try {
      const params = new URLSearchParams({
        action: searchKeyword ? 'search' : 'list',
        sourceId,
        page: String(pageNumber),
      });
      if (searchKeyword) params.set('keyword', searchKeyword);
      else if (typeId) params.set('typeId', typeId);

      const response = await fetch(`/api/source-browser?${params.toString()}`, {
        signal: controller.signal,
      });
      const result = await response.json();

      if (requestId !== requestIdRef.current) return;

      const data = result.data;
      if (!data) {
        if (pageNumber === 1) {
          setItems([]);
          setAvailableYears([]);
        }
        return;
      }

      const nextItems: SourceVideo[] = Array.isArray(data.items) ? data.items : [];
      setPage(pageNumber);
      setPagecount(Number(data.pagecount) || 1);
      setItems(nextItems);

      const years = Array.from(
        new Set(nextItems.map((item) => (item.year || '').trim()).filter(Boolean))
      ).sort((left, right) => (parseInt(right, 10) || 0) - (parseInt(left, 10) || 0));
      setAvailableYears(years);
    } catch {
      if (requestId === requestIdRef.current && pageNumber === 1) {
        setItems([]);
        setAvailableYears([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadCategories = useCallback(async (sourceId: string) => {
    setCategories([]);
    setActiveType('');
    setItems([]);
    setPage(1);
    setPagecount(1);
    setKeyword('');
    setMode('category');
    setFilterYear('');
    setFilterKeyword('');
    setAvailableYears([]);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    // 切换源时取消上一次分类和列表请求
    const categoryRequestId = ++categoryRequestIdRef.current;
    categoryAbortRef.current?.abort();
    listAbortRef.current?.abort();
    const controller = new AbortController();
    categoryAbortRef.current = controller;

    let list: SourceCategory[] = [];

    try {
      const response = await fetch(
        `/api/source-browser?action=categories&sourceId=${encodeURIComponent(sourceId)}`,
        { signal: controller.signal }
      );
      const result = await response.json();
      if (categoryRequestId !== categoryRequestIdRef.current) return;
      list = Array.isArray(result.data?.categories) ? result.data.categories : [];
      setCategories(list);
    } catch {
      if (categoryRequestId !== categoryRequestIdRef.current) return;
      setCategories([]);
    }

    if (categoryRequestId !== categoryRequestIdRef.current) return;

    // 默认显示第一个源的第一个标签
    const firstType = list[0]?.id || '';
    setActiveType(firstType);
    if (firstType) {
      await loadItems(sourceId, firstType, 1);
    }
  }, [loadItems]);

  useEffect(() => {
    // 源列表变化后同步默认选中项并加载分类
    /* eslint-disable react-hooks/set-state-in-effect */
    if (sources.length === 0) {
      setActiveSourceId('');
      setCategories([]);
      setItems([]);
      return;
    }

    if (!sources.some((source) => source.id === activeSourceId)) {
      const first = sources[0];
      setActiveSourceId(first.id);
      void loadCategories(first.id);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sources, activeSourceId, loadCategories]);

  const handleSourceChange = (sourceId: string) => {
    if (sourceId === activeSourceId) return;
    setActiveSourceId(sourceId);
    void loadCategories(sourceId);
  };

  const handleTypeChange = (typeId: string) => {
    if (typeId === activeType && mode === 'category') return;
    setActiveType(typeId);
    setMode('category');
    setKeyword('');
    setItems([]);
    setPage(1);
    setPagecount(1);
    void loadItems(activeSourceId, typeId, 1);
  };

  const applySearch = useCallback((value: string) => {
    const query = value.trim();
    if (query) {
      setMode('search');
      void loadItems(activeSourceId, activeType, 1, query);
      return;
    }

    setMode('category');
    if (activeType) {
      void loadItems(activeSourceId, activeType, 1);
    }
  }, [activeSourceId, activeType, loadItems]);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => applySearch(value), 500);
  };

  const handleKeywordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    applySearch(keyword);
  };

  const clearSearch = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    setKeyword('');
    setMode('category');
    setFilterYear('');
    setFilterKeyword('');
    if (activeType) {
      void loadItems(activeSourceId, activeType, 1);
    }
  };

  const fetchPage = useCallback((pageNumber: number) => {
    void loadItems(
      activeSourceId,
      activeType,
      pageNumber,
      mode === 'search' ? keyword.trim() : ''
    );
  }, [activeSourceId, activeType, mode, keyword, loadItems]);

  const displayedItems = useMemo(() => {
    let result = [...items];

    if (filterKeyword.trim()) {
      const query = filterKeyword.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          (item.remarks || '').toLowerCase().includes(query)
      );
    }

    if (filterYear) {
      result = result.filter((item) => (item.year || '').trim() === filterYear);
    }

    switch (sortBy) {
      case 'title-asc':
        return result.sort((left, right) => left.title.localeCompare(right.title));
      case 'title-desc':
        return result.sort((left, right) => right.title.localeCompare(left.title));
      case 'year-asc':
        return result.sort(
          (left, right) => (parseInt(left.year || '', 10) || 0) - (parseInt(right.year || '', 10) || 0)
        );
      case 'year-desc':
        return result.sort(
          (left, right) => (parseInt(right.year || '', 10) || 0) - (parseInt(left.year || '', 10) || 0)
        );
      default:
        return result;
    }
  }, [items, sortBy, filterYear, filterKeyword]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const currentSource = sources.find((source) => source.id === activeSourceId);

  return (
    <div className="min-h-screen bg-[var(--bg-color)] bg-[image:var(--bg-image)] bg-fixed">
      <Navbar onReset={() => router.push('/')} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-2xl font-bold text-[var(--text-color)]">源浏览器</h1>

        {sources.length === 0 ? (
          <div className="text-center py-20 text-sm text-[var(--text-color-secondary)]">
            暂无启用的视频源，请先在后台“视频源”中添加。
          </div>
        ) : (
          <>
            <CategoryPills
              items={sources.map((source) => ({
                id: source.id,
                name: premiumSourceIds.includes(source.id) ? `🔞${source.name}` : source.name,
              }))}
              activeId={activeSourceId}
              onChange={handleSourceChange}
            />

            {currentSource && (
              <div className="rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={keyword}
                    onChange={(event) => handleKeywordChange(event.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="输入关键词并回车进行搜索；清空回车恢复分类"
                    className="flex-1 min-w-0 rounded-md border border-[var(--glass-border)] bg-[var(--bg-color)] px-3 py-2 text-sm text-[var(--text-color)] outline-none transition-colors focus:border-[var(--accent-color)]"
                  />
                  {keyword && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="shrink-0 rounded-md border border-[var(--glass-border)] px-3 py-2 text-xs text-[var(--text-color-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--text-color)_6%,transparent)] cursor-pointer"
                    >
                      清除
                    </button>
                  )}
                  <div className="hidden sm:block whitespace-nowrap text-xs text-[var(--text-color-secondary)]">
                    {mode === 'search' ? '搜索' : '分类'}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                    title="排序"
                    className="rounded-md border border-[var(--glass-border)] bg-[var(--bg-color)] px-2 py-2 text-xs text-[var(--text-color)] outline-none sm:flex-1 sm:min-w-[120px] sm:px-3 sm:text-sm"
                  >
                    <option value="default">默认</option>
                    <option value="title-asc">标题 A→Z</option>
                    <option value="title-desc">标题 Z→A</option>
                    <option value="year-asc">年份↑</option>
                    <option value="year-desc">年份↓</option>
                  </select>

                  <select
                    value={filterYear}
                    onChange={(event) => setFilterYear(event.target.value)}
                    title="年份"
                    className="rounded-md border border-[var(--glass-border)] bg-[var(--bg-color)] px-2 py-2 text-xs text-[var(--text-color)] outline-none sm:flex-1 sm:min-w-[100px] sm:px-3 sm:text-sm"
                  >
                    <option value="">全部年份</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                  <input
                    value={filterKeyword}
                    onChange={(event) => setFilterKeyword(event.target.value)}
                    placeholder="地区/关键词"
                    className="col-span-2 rounded-md border border-[var(--glass-border)] bg-[var(--bg-color)] px-2 py-2 text-xs text-[var(--text-color)] outline-none transition-colors focus:border-[var(--accent-color)] sm:flex-1 sm:min-w-[140px] sm:px-3 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {currentSource && (
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-color)]">
                <Globe size={16} className="text-[var(--accent-color)]" />
                <span>{currentSource.name} 分类</span>
              </div>
            )}

            {mode === 'category' && categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const isActive = category.id === activeType;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleTypeChange(category.id)}
                      className={`px-4 py-1.5 text-sm rounded-full border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[var(--accent-color)] text-white border-transparent shadow-[var(--shadow-sm)]'
                          : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] border-[var(--glass-border)] hover:text-[var(--text-color)]'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            )}

            {loading && items.length === 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[2/3] rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] animate-pulse"
                  />
                ))}
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="text-center py-20 text-sm text-[var(--text-color-secondary)]">
                {items.length === 0 ? '该源暂无内容' : '没有匹配的内容'}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {displayedItems.map((item, index) => {
                    const activeSource = sources.find((source) => source.id === activeSourceId);
                    const playerParams = new URLSearchParams({
                      id: item.id,
                      source: activeSourceId,
                      sourceName: activeSource?.name || activeSourceId,
                      title: item.title,
                    });
                    if (premiumSourceIds.includes(activeSourceId)) {
                      playerParams.set('premium', '1');
                    }
                    const playerUrl = `/player?${playerParams.toString()}`;

                    return (
                      <MovieCard
                        key={item.id}
                        href={playerUrl}
                        openInNewTab
                        movie={{
                          id: item.id,
                          title: item.title,
                          cover: item.cover,
                          rate: '',
                          url: '',
                        }}
                        onMovieClick={() => {}}
                        imageLoading={index < 6 ? 'eager' : 'lazy'}
                      />
                    );
                  })}
                </div>

                {pagecount > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                    <button
                      type="button"
                      disabled={loading || page <= 1}
                      onClick={() => fetchPage(page - 1)}
                      className="px-3 py-1.5 text-sm rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      上一页
                    </button>

                    {getPageItems(page, pagecount).map((item, index) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-sm text-[var(--text-color-secondary)]"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            if (item === page) return;
                            fetchPage(item);
                          }}
                          aria-current={item === page ? 'page' : undefined}
                          className={`min-w-9 px-3 py-1.5 text-sm rounded-full border transition-all duration-200 cursor-pointer ${
                            item === page
                              ? 'bg-[var(--accent-color)] text-white border-transparent shadow-[var(--shadow-sm)]'
                              : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] border-[var(--glass-border)] hover:text-[var(--text-color)]'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={loading || page >= pagecount}
                      onClick={() => fetchPage(page + 1)}
                      className="px-3 py-1.5 text-sm rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      下一页
                    </button>

                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const target = Math.floor(Number(jumpPage));
                        if (!Number.isFinite(target)) return;
                        const nextPage = Math.min(Math.max(target, 1), pagecount);
                        if (nextPage === page) return;
                        setJumpPage('');
                        fetchPage(nextPage);
                      }}
                      className="flex items-center gap-1.5 ml-2"
                    >
                      <input
                        type="number"
                        min={1}
                        max={pagecount}
                        value={jumpPage}
                        onChange={(event) => setJumpPage(event.target.value)}
                        placeholder="页码"
                        className="w-20 px-3 py-1.5 text-sm rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] placeholder:text-[var(--text-color-secondary)] focus:outline-none focus:border-[var(--accent-color)]"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-3 py-1.5 text-sm rounded-full bg-[var(--accent-color)] text-white font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        跳转
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
