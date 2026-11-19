'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { MainNav } from '@/components/layout/MainNav';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { MovieCard } from '@/components/home/MovieCard';
import { settingsStore, type AppSettings } from '@/lib/store/settings-store';
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
  const [activeSourceId, setActiveSourceId] = useState('');
  const [categories, setCategories] = useState<SourceCategory[]>([]);
  const [activeType, setActiveType] = useState('');
  const [items, setItems] = useState<SourceVideo[]>([]);
  const [page, setPage] = useState(1);
  const [pagecount, setPagecount] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const syncSources = (settings: AppSettings) => {
      setSources(settings.sources.filter((source) => source.enabled));
    };

    syncSources(settingsStore.getSettings());
    return settingsStore.subscribe(() => {
      syncSources(settingsStore.getSettings());
    });
  }, []);

  const loadItems = useCallback(async (sourceId: string, typeId: string, pageNumber: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        action: 'list',
        sourceId,
        page: String(pageNumber),
      });
      if (typeId) params.set('typeId', typeId);

      const response = await fetch(`/api/source-browser?${params.toString()}`, { cache: 'no-store' });
      const result = await response.json();

      if (requestId !== requestIdRef.current) return;

      const data = result.data;
      if (!data) {
        if (pageNumber === 1) setItems([]);
        return;
      }

      setPage(pageNumber);
      setPagecount(Number(data.pagecount) || 1);
      setItems(data.items);
    } catch {
      if (requestId === requestIdRef.current && pageNumber === 1) {
        setItems([]);
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

    let list: SourceCategory[] = [];

    try {
      const response = await fetch(
        `/api/source-browser?action=categories&sourceId=${encodeURIComponent(sourceId)}`,
        { cache: 'no-store' }
      );
      const result = await response.json();
      list = Array.isArray(result.data?.categories) ? result.data.categories : [];
      setCategories(list);
    } catch {
      setCategories([]);
    }

    // 默认显示第一个源的第一个标签
    const firstType = list[0]?.id || '';
    setActiveType(firstType);
    if (firstType) {
      await loadItems(sourceId, firstType, 1);
    }
  }, [loadItems]);

  useEffect(() => {
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
  }, [sources, activeSourceId, loadCategories]);

  const handleSourceChange = (sourceId: string) => {
    if (sourceId === activeSourceId) return;
    setActiveSourceId(sourceId);
    void loadCategories(sourceId);
  };

  const handleTypeChange = (typeId: string) => {
    if (typeId === activeType) return;
    setActiveType(typeId);
    setItems([]);
    setPage(1);
    setPagecount(1);
    void loadItems(activeSourceId, typeId, 1);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] bg-[image:var(--bg-image)] bg-fixed">
      <Navbar onReset={() => router.push('/')} />
      <MainNav />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-2xl font-bold text-[var(--text-color)]">源浏览器</h1>

        {sources.length === 0 ? (
          <div className="text-center py-20 text-sm text-[var(--text-color-secondary)]">
            暂无启用的视频源，请先在后台“视频源”中添加。
          </div>
        ) : (
          <>
            <CategoryPills
              items={sources.map((source) => ({ id: source.id, name: source.name }))}
              activeId={activeSourceId}
              onChange={handleSourceChange}
            />

            {categories.length > 0 && (
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[2/3] rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] animate-pulse"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 text-sm text-[var(--text-color-secondary)]">
                该源暂无内容
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map((item) => {
                    const activeSource = sources.find((source) => source.id === activeSourceId);
                    const playerUrl = `/player?${new URLSearchParams({
                      id: item.id,
                      source: activeSourceId,
                      sourceName: activeSource?.name || activeSourceId,
                      title: item.title,
                    }).toString()}`;

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
                      />
                    );
                  })}
                </div>

                {pagecount > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                    <button
                      type="button"
                      disabled={loading || page <= 1}
                      onClick={() => void loadItems(activeSourceId, activeType, page - 1)}
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
                            void loadItems(activeSourceId, activeType, item);
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
                      onClick={() => void loadItems(activeSourceId, activeType, page + 1)}
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
                        void loadItems(activeSourceId, activeType, nextPage);
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
