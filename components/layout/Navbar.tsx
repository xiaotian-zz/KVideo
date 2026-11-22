'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { MainNav } from '@/components/layout/MainNav';
import { Icons } from '@/components/ui/Icon';
import { siteConfig } from '@/lib/config/site-config';
import { getSession, clearSession, type AuthSession } from '@/lib/store/auth-store';
import { siteSettingsStore } from '@/lib/store/site-settings-store';
import { LogOut, Settings, User } from 'lucide-react';

interface NavbarProps {
    onReset: () => void;
    isPremiumMode?: boolean;
}

const USER_MENU_ITEM_CLASS = 'flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_8%,transparent)] transition-colors cursor-pointer';

export function Navbar({ onReset, isPremiumMode = false }: NavbarProps) {
    const router = useRouter();
    const settingsHref = isPremiumMode ? '/premium/settings' : '/settings';
    const favoritesHref = isPremiumMode ? '/premium/favorites' : '/favorites';
    const [session] = useState<AuthSession | null>(() => getSession());
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const siteTitle = useSyncExternalStore(
        siteSettingsStore.subscribe,
        siteSettingsStore.getTitle,
        () => ''
    );
    const displayTitle = siteTitle.trim() || siteConfig.name;
    const roleLabel = session?.role === 'admin'
        ? '管理员'
        : session?.role === 'premium'
            ? '高级会员'
            : '普通用户';

    useEffect(() => {
        if (!userMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!userMenuRef.current?.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setUserMenuOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [userMenuOpen]);

    const handleLogout = () => {
        fetch('/api/auth/session', { method: 'DELETE' })
            .catch(() => {
                // Best effort only.
            })
            .finally(() => {
                clearSession();
                router.push('/');
                router.refresh();
            });
    };

    return (
        <nav className="sticky top-0 z-[2000] pt-4 pb-2" style={{
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform'
        }}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--shadow-sm)] px-3 sm:px-6 py-2 sm:py-4 rounded-[var(--radius-2xl)]" style={{
                    transform: 'translate3d(0, 0, 0)'
                }}>
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <Link
                            href={isPremiumMode ? '/premium' : '/'}
                            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer min-w-0"
                            onClick={onReset}
                            data-focusable
                        >
                            <h1 className="text-lg sm:text-2xl font-bold text-[var(--accent-color)] truncate">{displayTitle}</h1>
                        </Link>

                        {!isPremiumMode && (
                            <div className="hidden xl:flex flex-1 justify-center min-w-0 px-2">
                                <MainNav inline />
                            </div>
                        )}

                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            {/* User Menu */}
                            {session && (
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        onClick={() => setUserMenuOpen((open) => !open)}
                                        className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                                        aria-label="用户菜单"
                                        aria-expanded={userMenuOpen}
                                        data-focusable
                                    >
                                        <User size={18} />
                                    </button>

                                    {userMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-64 z-[2001] bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] overflow-hidden">
                                            <div className="px-4 py-3 border-b border-[var(--glass-border)]">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs text-[var(--text-color-secondary)]">当前用户</span>
                                                    <span className="px-1.5 py-0.5 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded text-[10px] font-medium">
                                                        {roleLabel}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm font-semibold text-[var(--text-color)] truncate">
                                                    {session.username || session.name}
                                                </p>
                                            </div>

                                            <div className="py-1">
                                                <Link
                                                    href="/history"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className={USER_MENU_ITEM_CLASS}
                                                >
                                                    <Icons.History size={18} />
                                                    观看历史
                                                </Link>
                                                <Link
                                                    href={favoritesHref}
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className={USER_MENU_ITEM_CLASS}
                                                >
                                                    <Icons.Heart size={18} />
                                                    收藏
                                                </Link>
                                                {session.role === 'admin' && (
                                                    <Link
                                                        href={settingsHref}
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className={USER_MENU_ITEM_CLASS}
                                                    >
                                                        <Settings size={18} />
                                                        设置
                                                    </Link>
                                                )}
                                            </div>

                                            <div className="border-t border-[var(--glass-border)] py-1">
                                                <button
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        handleLogout();
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                >
                                                    <LogOut size={18} />
                                                    退出登录
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <ThemeSwitcher />
                        </div>
                    </div>
                    {!isPremiumMode && (
                        <div className="xl:hidden mt-2">
                            <MainNav inline />
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
