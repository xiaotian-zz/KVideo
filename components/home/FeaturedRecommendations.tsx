'use client';

import { useEffect, useState } from 'react';
import { Icons } from '@/components/ui/Icon';

interface FeaturedMovie {
  id: string;
  title: string;
  cover: string;
  rate?: string;
  episodeCount?: number;
  url?: string;
}

interface FeaturedData {
  hotMovies: FeaturedMovie[];
  hotTvShows: FeaturedMovie[];
  hotVarietyShows: FeaturedMovie[];
  hotShortDramas: FeaturedMovie[];
}

type SectionKey = keyof FeaturedData;

const SECTIONS: Array<{ key: SectionKey; title: string }> = [
  { key: 'hotMovies', title: '热门电影' },
  { key: 'hotTvShows', title: '热门剧集' },
  { key: 'hotVarietyShows', title: '热门综艺' },
  { key: 'hotShortDramas', title: '热门短剧' },
];

function FeaturedCard({
  movie,
  showEpisode,
  onSelect,
}: {
  movie: FeaturedMovie;
  showEpisode?: boolean;
  onSelect: (title: string) => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(movie.title)}
      className="group w-36 sm:w-40 shrink-0 snap-start text-left cursor-pointer"
      title={movie.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.03]">
        {movie.cover && !imageError ? (
          // 短剧封面可能来自任意 CMS 域名，使用原生 img 避免图片域名限制
          <img
            src={movie.cover}
            alt={movie.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-color-secondary)]">
            暂无图片
          </div>
        )}

        {/* 悬浮播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-11 h-11 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 左上角集数（短剧） */}
        {showEpisode && movie.episodeCount && movie.episodeCount > 1 && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] text-white/90">
            {movie.episodeCount} 集
          </div>
        )}

        {/* 右上角评分 */}
        {movie.rate && parseFloat(movie.rate) > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-[10px] font-bold text-white shadow-md flex items-center gap-0.5">
            <Icons.Star size={10} className="fill-current" />
            {movie.rate}
          </div>
        )}
      </div>

      <h3 className="mt-2 text-sm font-semibold text-[var(--text-color)] line-clamp-2 group-hover:text-[var(--accent-color)] transition-colors">
        {movie.title}
      </h3>
    </button>
  );
}

function SectionHeader({
  title,
  onMore,
}: {
  title: string;
  onMore: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-color)]">
        {title}
      </h2>
      <button
        type="button"
        onClick={onMore}
        className="flex items-center gap-0.5 text-sm text-[var(--text-color-secondary)] hover:text-[var(--accent-color)] transition-colors cursor-pointer"
      >
        查看更多
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function FeaturedLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {[0, 1, 2].map((row) => (
        <div key={row}>
          <div className="h-7 w-32 rounded-full bg-[var(--glass-bg)] mb-3" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="w-36 sm:w-40 shrink-0 aspect-[2/3] rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 首页“精品推荐”：四个板块，标题 + 查看更多 + 横向卡片，
 * 内容与排版对齐 LunaTV 首页。
 */
export function FeaturedRecommendations({
  onSearch,
  onMore,
}: {
  onSearch: (title: string) => void;
  onMore: (section: SectionKey) => void;
}) {
  const [data, setData] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/home/featured', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result?.success) {
          setData(result.data as FeaturedData);
        }
      })
      .catch(() => {
        // 保持空状态，不影响电影/电视剧视图
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <FeaturedLoading />;
  }

  const visibleSections = SECTIONS;

  if (!data) {
    return (
      <div className="text-center py-16 text-sm text-[var(--text-color-secondary)]">
        暂无精品推荐内容
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {visibleSections.map((section) => {
        const items = data[section.key] || [];

        return (
          <section key={section.key}>
            <SectionHeader
              title={section.title}
              onMore={() => onMore(section.key)}
            />
            {items.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                {items.map((movie) => (
                  <FeaturedCard
                    key={`${section.key}-${movie.id}`}
                    movie={movie}
                    showEpisode={section.key === 'hotShortDramas'}
                    onSelect={onSearch}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--text-color-secondary)] py-6">
                暂无内容
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
