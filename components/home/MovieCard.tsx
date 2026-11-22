/**
 * MovieCard - Individual movie card component
 * Displays movie poster, title, and rating
 */

import { memo, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icon';

interface DoubanMovie {
  id: string;
  title: string;
  cover: string;
  rate: string;
  url: string;
}

interface MovieCardProps {
  movie: DoubanMovie;
  onMovieClick: (movie: DoubanMovie) => void;
  href?: string;
  openInNewTab?: boolean;
}

type ImageStage = 'direct' | 'proxy' | 'placeholder' | 'none';

export const MovieCard = memo(function MovieCard({
  movie,
  onMovieClick,
  href,
  openInNewTab = false,
}: MovieCardProps) {
  const hasExternalCover = /^https?:\/\//i.test(movie.cover);
  const [imageStage, setImageStage] = useState<ImageStage>(() =>
    movie.cover ? 'direct' : 'placeholder'
  );
  const videoUrl = href ?? `/?q=${encodeURIComponent(movie.title)}`;

  useEffect(() => {
    setImageStage(movie.cover ? 'direct' : 'placeholder');
  }, [movie.cover]);

  const imageSrc = imageStage === 'proxy'
    ? `/api/source-image?url=${encodeURIComponent(movie.cover)}`
    : imageStage === 'placeholder'
      ? '/placeholder-poster.svg'
      : movie.cover;

  const handleImageError = () => {
    if (imageStage === 'direct') {
      // 本机直连失败后交给服务器代理再试一次；站内代理图直接进入占位图
      setImageStage(hasExternalCover ? 'proxy' : 'placeholder');
      return;
    }
    if (imageStage === 'proxy') {
      setImageStage('placeholder');
      return;
    }
    if (imageStage === 'placeholder') {
      setImageStage('none');
    }
  };

  return (
    <Link
      href={videoUrl}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        // Allow default behavior for modifier keys (new tab, etc.)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        e.preventDefault();
        if (openInNewTab) {
          window.open(videoUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        onMovieClick(movie);
      }}
      data-focusable
      className="group cursor-pointer hover:translate-y-[-2px] transition-transform duration-200 ease-out"
      style={{
        position: 'relative',
        zIndex: 1,
        contentVisibility: 'auto'
      }}
      onMouseEnter={(e) => (e.currentTarget.style.zIndex = '100')}
      onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
    >
      <Card hover={false} className="p-0 h-full shadow-[0_2px_8px_var(--shadow-color)] hover:shadow-[0_8px_24px_var(--shadow-color)] transition-shadow duration-200 ease-out" blur={false}>
        <div className="relative aspect-[2/3] bg-[var(--glass-bg)] rounded-[var(--radius-2xl)]">
          {imageStage !== 'none' ? (
            <Image
              key={imageStage}
              src={imageSrc}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-[var(--radius-2xl)]"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              loading="eager"
              unoptimized
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--glass-bg)] rounded-[var(--radius-2xl)]">
              <p className="text-sm text-[var(--text-muted)]">暂无图片</p>
            </div>
          )}
          {movie.rate && parseFloat(movie.rate) > 0 && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // 阻止事件冒泡，防止触发外层卡片的搜索点击
                if (!movie.url) return;
                window.open(movie.url, '_blank', 'noopener,noreferrer');
              }}
              title="在豆瓣中查看"
              className="absolute top-2 right-2 bg-black/80 hover:bg-black/90 px-2.5 py-1.5 flex items-center gap-1.5 rounded-[var(--radius-full)] z-20 hover:scale-105 transition-all shadow-md"
            >
              <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-white">
                {movie.rate}
              </span>
            </div>
          )}
        </div>
        <div className="pt-3">
          <h3 className="font-semibold text-sm text-center text-[var(--text-color)] line-clamp-2 group-hover:text-[var(--accent-color)] transition-colors">
            {movie.title}
          </h3>
        </div>
      </Card>
    </Link>
  );
});
