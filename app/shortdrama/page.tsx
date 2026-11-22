'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { MovieCard } from '@/components/home/MovieCard';
import type { ShortDramaCategory, ShortDramaItem } from '@/lib/types/shortdrama';

export default function ShortDramaPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ShortDramaCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [items, setItems] = useState<ShortDramaItem[]>([]);
  const [page, setPage] = useState(1);
  const [pagecount, setPagecount] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (categoryId: string, pageNumber: number) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(pageNumber) });
      if (categoryId) params.set('category', categoryId);

      const response = await fetch(`/api/shortdrama?${params.toString()}`, { cache: 'no-store' });
      const result = await response.json();
      const data = result.data;

      if (!data) return;

      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setActiveCategory(String(data.activeCategoryId || categoryId));
      setPage(pageNumber);
      setPagecount(Number(data.pagecount) || 1);
      setItems((current) => pageNumber === 1 ? data.items : [...current, ...data.items]);
    } catch {
      if (pageNumber === 1) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load('', 1);
  }, [load]);

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === activeCategory) return;
    setItems([]);
    setPage(1);
    setPagecount(1);
    void load(categoryId, 1);
  };

  const handleCardClick = (title: string) => {
    router.push(`/?q=${encodeURIComponent(title)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] bg-[image:var(--bg-image)] bg-fixed">
      <Navbar onReset={() => router.push('/')} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-2xl font-bold text-[var(--text-color)]">短剧</h1>

        {categories.length > 0 && (
          <CategoryPills
            items={categories}
            activeId={activeCategory}
            onChange={handleCategoryChange}
          />
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
            暂无短剧内容
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <MovieCard
                  key={item.id}
                  movie={{
                    id: item.id,
                    title: item.title,
                    cover: item.cover,
                    rate: item.rate || '',
                    url: '',
                  }}
                  onMovieClick={(movie) => handleCardClick(movie.title)}
                />
              ))}
            </div>

            {page < pagecount && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void load(activeCategory, page + 1)}
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
