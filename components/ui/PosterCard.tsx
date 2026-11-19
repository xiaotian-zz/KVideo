'use client';

import { useState } from 'react';

export interface PosterCardItem {
  id: string;
  title: string;
  cover: string;
  rate?: string;
  remarks?: string;
  subtitle?: string;
}

interface PosterCardProps {
  item: PosterCardItem;
  onClick: (title: string) => void;
}

/**
 * 分类页通用海报卡片。
 */
export function PosterCard({ item, onClick }: PosterCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onClick(item.title)}
      className="group text-left cursor-pointer"
      title={item.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
        {item.cover && !imageError ? (
          <img
            src={item.cover}
            alt={item.title}
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

        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-11 h-11 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {item.rate && parseFloat(item.rate) > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-[10px] font-bold text-white shadow-md">
            {item.rate}
          </div>
        )}
      </div>

      <p className="mt-2 text-sm font-semibold text-[var(--text-color)] line-clamp-2 group-hover:text-[var(--accent-color)] transition-colors">
        {item.title}
      </p>
      {(item.subtitle || item.remarks) && (
        <p className="mt-0.5 text-xs text-[var(--text-color-secondary)] line-clamp-1">
          {item.subtitle || item.remarks}
        </p>
      )}
    </button>
  );
}
