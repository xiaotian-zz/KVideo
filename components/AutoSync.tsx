'use client';

import { useEffect } from 'react';

import { getProfileId } from '@/lib/store/auth-store';
import { useFavoritesStore, usePremiumFavoritesStore } from '@/lib/store/favorites-store';
import { useHistoryStore, usePremiumHistoryStore } from '@/lib/store/history-store';
import {
  useSearchHistoryStore,
  usePremiumSearchHistoryStore,
} from '@/lib/store/search-history-store';
import { useIPTVStore } from '@/lib/store/iptv-store';
import { settingsStore, type AppSettings } from '@/lib/store/settings-store';
import { premiumModeSettingsStore } from '@/lib/store/premium-mode-settings';
import { userSourcesStore } from '@/lib/store/user-sources-store';
import { keepRenderableFavorites, keepRenderableHistory } from '@/lib/utils/sync-records';

const PUSH_DEBOUNCE_MS = 1500;

type UserDataSnapshot = Record<string, unknown>;

function personalSettings(): Partial<AppSettings> {
  const settings: Partial<AppSettings> = { ...settingsStore.getSettings() };
  // 视频源是全局配置，只存 global:config:v1，不在每个用户下重复保存
  delete settings.sources;
  delete settings.premiumSources;
  delete settings.subscriptions;
  return settings;
}

function localSnapshots(): UserDataSnapshot {
  return {
    settings: personalSettings(),
    'premium-settings': premiumModeSettingsStore.getSettings(),
    favorites: useFavoritesStore.getState().favorites,
    'premium-favorites': usePremiumFavoritesStore.getState().favorites,
    history: useHistoryStore.getState().viewingHistory,
    'premium-history': usePremiumHistoryStore.getState().viewingHistory,
    'search-history': useSearchHistoryStore.getState().searchHistory,
    'premium-search-history': usePremiumSearchHistoryStore.getState().searchHistory,
    'user-sources': userSourcesStore.getState(),
    iptv: {
      sources: useIPTVStore.getState().sources.filter((source) => source.kind !== 'builtin'),
      lastRefreshed: useIPTVStore.getState().lastRefreshed,
    },
  };
}

function applyRemoteData(data: UserDataSnapshot): void {
  if (data.settings && typeof data.settings === 'object') {
    const current = settingsStore.getSettings();
    settingsStore.saveSettings({
      ...current,
      ...(data.settings as Partial<AppSettings>),
      // 全局源由 GlobalConfigSync 管理，个人设置不覆盖
      sources: current.sources,
      premiumSources: current.premiumSources,
      subscriptions: current.subscriptions,
    });
  }

  if (data['premium-settings'] && typeof data['premium-settings'] === 'object') {
    premiumModeSettingsStore.saveSettings({
      ...premiumModeSettingsStore.getSettings(),
      ...(data['premium-settings'] as Record<string, unknown>),
    });
  }

  if (Array.isArray(data.favorites) && data.favorites.length > 0) {
    useFavoritesStore.setState({ favorites: keepRenderableFavorites(data.favorites) });
  }

  if (Array.isArray(data['premium-favorites']) && data['premium-favorites'].length > 0) {
    usePremiumFavoritesStore.setState({
      favorites: keepRenderableFavorites(data['premium-favorites']),
    });
  }

  if (Array.isArray(data.history) && data.history.length > 0) {
    useHistoryStore.getState().importHistory(keepRenderableHistory(data.history));
  }

  if (Array.isArray(data['premium-history']) && data['premium-history'].length > 0) {
    usePremiumHistoryStore.getState().importHistory(
      keepRenderableHistory(data['premium-history'])
    );
  }

  if (Array.isArray(data['search-history']) && data['search-history'].length > 0) {
    useSearchHistoryStore.setState({ searchHistory: data['search-history'] });
  }

  if (Array.isArray(data['premium-search-history']) && data['premium-search-history'].length > 0) {
    usePremiumSearchHistoryStore.setState({
      searchHistory: data['premium-search-history'],
    });
  }

  if (data['user-sources'] && typeof data['user-sources'] === 'object') {
    userSourcesStore.replaceState(data['user-sources'] as never);
  }

  if (data.iptv && typeof data.iptv === 'object') {
    const iptv = data.iptv as { sources?: unknown; lastRefreshed?: unknown };
    const sources = Array.isArray(iptv.sources) ? iptv.sources : [];
    // 空数组视为远端尚未初始化，避免覆盖本地已有数据
    if (sources.length > 0) {
      useIPTVStore.setState({
        sources: sources as never,
        lastRefreshed: typeof iptv.lastRefreshed === 'number' ? iptv.lastRefreshed : 0,
      });
    }
  }
}

function isEmptyRemoteValue(namespace: string, value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (namespace === 'iptv') {
    const sources = (value as { sources?: unknown }).sources;
    return !Array.isArray(sources) || sources.length === 0;
  }
  return false;
}

async function pushNamespace(namespace: string, data: unknown): Promise<void> {
  try {
    await fetch('/api/user/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace, data }),
    });
  } catch {
    // 离线或服务暂不可用时保留本地数据，下次变更会再次推送
  }
}

/**
 * 将当前用户的所有可持久化数据同步到服务端 Kvrocks。
 * - 登录后先拉取远程数据并恢复
 * - 远程缺失的命名空间用本地数据初始化
 * - 之后监听各 store，变更后防抖推送
 *
 * 数据按签名会话中的 accountId 隔离，每个用户拥有独立的收藏和播放记录。
 */
export function AutoSync() {
  useEffect(() => {
    if (!getProfileId()) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const schedulePush = (namespace: string, getData: () => unknown) => {
      const existing = timers.get(namespace);
      if (existing) clearTimeout(existing);

      timers.set(namespace, setTimeout(() => {
        timers.delete(namespace);
        void pushNamespace(namespace, getData());
      }, PUSH_DEBOUNCE_MS));
    };

    const start = async () => {
      let remote: UserDataSnapshot = {};

      try {
        const response = await fetch('/api/user/data');
        if (response.ok) {
          const result = await response.json();
          remote = (result?.data || {}) as UserDataSnapshot;
        }
      } catch {
        // 拉取失败时使用本地数据继续工作
      }

      if (cancelled) return;

      applyRemoteData(remote);

      // 远程没有或尚未初始化的命名空间：用本地数据完成首次迁移
      const local = localSnapshots();
      await Promise.all(
        Object.entries(local)
          .filter(([namespace]) => isEmptyRemoteValue(namespace, remote[namespace]))
          .map(([namespace, data]) => pushNamespace(namespace, data))
      );

      if (cancelled) return;

      const unsubscribers = [
        useFavoritesStore.subscribe((state) => {
          schedulePush('favorites', () => state.favorites);
        }),
        usePremiumFavoritesStore.subscribe((state) => {
          schedulePush('premium-favorites', () => state.favorites);
        }),
        useHistoryStore.subscribe((state) => {
          schedulePush('history', () => state.viewingHistory);
        }),
        usePremiumHistoryStore.subscribe((state) => {
          schedulePush('premium-history', () => state.viewingHistory);
        }),
        useSearchHistoryStore.subscribe((state) => {
          schedulePush('search-history', () => state.searchHistory);
        }),
        usePremiumSearchHistoryStore.subscribe((state) => {
          schedulePush('premium-search-history', () => state.searchHistory);
        }),
        useIPTVStore.subscribe((state) => {
          schedulePush('iptv', () => ({
            sources: state.sources.filter((source) => source.kind !== 'builtin'),
            lastRefreshed: state.lastRefreshed,
          }));
        }),
        settingsStore.subscribe(() => {
          schedulePush('settings', () => personalSettings());
        }),
        premiumModeSettingsStore.subscribe(() => {
          schedulePush('premium-settings', () => premiumModeSettingsStore.getSettings());
        }),
        userSourcesStore.subscribe(() => {
          schedulePush('user-sources', () => userSourcesStore.getState());
        }),
      ];

      cleanup = () => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      };
    };

    void start();

    return () => {
      cancelled = true;
      cleanup?.();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return null;
}
