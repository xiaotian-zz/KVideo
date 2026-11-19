'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Cat, Clover, Film, Globe, PlaySquare, Radio, Sparkles, Tv } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: typeof Film;
  match: (pathname: string, type: string | null) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: '精品推荐',
    href: '/',
    icon: Sparkles,
    match: (pathname) => pathname === '/',
  },
  {
    label: '源浏览器',
    href: '/source-browser',
    icon: Globe,
    match: (pathname) => pathname === '/source-browser',
  },
  {
    label: '电影',
    href: '/douban?type=movie',
    icon: Film,
    match: (pathname, type) => pathname === '/douban' && type === 'movie',
  },
  {
    label: '剧集',
    href: '/douban?type=tv',
    icon: Tv,
    match: (pathname, type) => pathname === '/douban' && type === 'tv',
  },
  {
    label: '短剧',
    href: '/shortdrama',
    icon: PlaySquare,
    match: (pathname) => pathname === '/shortdrama',
  },
  {
    label: '动漫',
    href: '/douban?type=anime',
    icon: Cat,
    match: (pathname, type) => pathname === '/douban' && type === 'anime',
  },
  {
    label: '综艺',
    href: '/douban?type=show',
    icon: Clover,
    match: (pathname, type) => pathname === '/douban' && type === 'show',
  },
  {
    label: '直播',
    href: '/iptv',
    icon: Radio,
    match: (pathname) => pathname === '/iptv',
  },
];

function MainNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  return (
    <div className="max-w-7xl mx-auto px-4 py-2">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full backdrop-blur-2xl shadow-lg ring-1 ring-white/10 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname, type);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--accent-color)] text-white shadow-[0_0_15px_rgba(0,122,255,0.4)]'
                    : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)]'
                }`}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 主导航：精品推荐、源浏览器、电影、剧集、短剧、动漫、综艺、直播。
 * 首页原有的分类切换已合并到这一排胶囊中。
 */
export function MainNav() {
  return (
    <Suspense fallback={<div className="h-12" />}>
      <MainNavInner />
    </Suspense>
  );
}
