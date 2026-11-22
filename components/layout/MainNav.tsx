'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Cat, Clover, Film, Globe, MoreHorizontal, PlaySquare, Radio, Sparkles, Tv, X } from 'lucide-react';

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

function MainNavInner({ inline = false }: { inline?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  const pills = (
    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.match(pathname, type);

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className="group relative flex shrink-0 items-center gap-2 rounded-[var(--radius-full)] px-3 py-2 whitespace-nowrap transition-all duration-300 hover:bg-[color-mix(in_srgb,var(--text-color)_6%,transparent)] lg:px-4"
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-[var(--radius-full)] bg-[var(--accent-color)] opacity-10"
              />
            )}
            <Icon
              size={18}
              className={`relative transition-all duration-300 ${
                isActive
                  ? 'text-[var(--accent-color)] scale-110'
                  : 'text-[var(--text-color-secondary)] group-hover:scale-110 group-hover:text-[var(--text-color)]'
              }`}
            />
            <span
              className={`relative text-sm transition-colors duration-300 ${
                isActive
                  ? 'text-[var(--accent-color)] font-semibold'
                  : 'font-medium text-[var(--text-color-secondary)] group-hover:text-[var(--text-color)]'
              }`}
            >
              {item.label}
            </span>
            {isActive && (
              <span
                aria-hidden
                className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--accent-color)] lg:left-4 lg:right-4"
              />
            )}
          </Link>
        );
      })}
    </div>
  );

  if (inline) {
    return <div className="flex justify-center min-w-0 max-w-full">{pills}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-2">
      <div className="flex justify-center">{pills}</div>
    </div>
  );
}

/**
 * 主导航：精品推荐、源浏览器、电影、剧集、短剧、动漫、综艺、直播。
 * 首页原有的分类切换已合并到这一排胶囊中。
 */
export function MainNav({ inline = false }: { inline?: boolean }) {
  return (
    <Suspense fallback={inline ? null : <div className="h-12" />}>
      <MainNavInner inline={inline} />
    </Suspense>
  );
}

function MobileBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (item: NavItem) => item.match(pathname, type);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[2000] bg-[var(--glass-bg)] backdrop-blur-xl border-t border-[var(--glass-border)] shadow-[0_-4px_20px_var(--shadow-color)]"
        style={{ bottom: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                className="flex min-w-[60px] flex-1 flex-col items-center justify-center px-1 py-1.5 transition-transform duration-200 active:scale-95"
              >
                <Icon
                  size={22}
                  className={active ? 'text-[var(--accent-color)]' : 'text-[var(--text-color-secondary)]'}
                />
                <span
                  className={`mt-0.5 text-[10px] font-medium ${
                    active ? 'text-[var(--accent-color)]' : 'text-[var(--text-color-secondary)]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-w-[60px] flex-1 flex-col items-center justify-center px-1 py-1.5 text-[var(--text-color-secondary)] transition-transform duration-200 active:scale-95"
            aria-label="更多"
          >
            <MoreHorizontal size={22} />
            <span className="mt-0.5 text-[10px] font-medium">更多</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[2100]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[var(--radius-2xl)] border-t border-[var(--glass-border)] bg-[var(--bg-color)] shadow-[var(--shadow-md)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-5 py-3.5">
              <h3 className="text-base font-semibold text-[var(--text-color)]">全部分类</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-color-secondary)] hover:bg-[color-mix(in_srgb,var(--text-color)_6%,transparent)]"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 p-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-[var(--radius-xl)] p-2 transition-transform duration-200 active:scale-95"
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] ${
                        active
                          ? 'bg-[var(--accent-color)] text-white'
                          : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)]'
                      }`}
                    >
                      <Icon size={22} />
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        active ? 'text-[var(--accent-color)]' : 'text-[var(--text-color-secondary)]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavInner />
    </Suspense>
  );
}
