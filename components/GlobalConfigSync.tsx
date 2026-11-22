'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { settingsStore } from '@/lib/store/settings-store';
import { sourceAccessStore } from '@/lib/store/source-access-store';
import { siteSettingsStore } from '@/lib/store/site-settings-store';
import { useIPTVStore } from '@/lib/store/iptv-store';
import { getSession } from '@/lib/store/auth-store';
import {
  pushGlobalConfig,
  subscribeGlobalConfigUpdates,
} from '@/lib/utils/global-config-client';

/**
 * 应用启动时加载管理员维护的全局视频源。
 * 所有用户（包括未登录）都使用同一份源配置。
 */
export function GlobalConfigSync() {
  const pathname = usePathname();
  const isSettingsEditor = pathname === '/settings' || pathname === '/premium/settings';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/global-config');
        if (!response.ok) return;

        const result = await response.json();
        const data = result?.data;
        if (cancelled) return;

        // 首次部署：管理员把当前视频源初始化为全局配置
        if (!data) {
          if (getSession()?.role === 'admin' && settingsStore.getSettings().sources.length > 0) {
            pushGlobalConfig();
          }
          return;
        }

        const current = settingsStore.getSettings();
        const remoteSources = Array.isArray(data.sources) ? data.sources : [];
        const remotePremiumSources = Array.isArray(data.premiumSources) ? data.premiumSources : [];
        const remoteSubscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];

        // 用户组可查看的源类型由管理员维护，所有客户端共用
        if (data.roleSourceAccess) {
          sourceAccessStore.set(data.roleSourceAccess);
        }

        // 网站标题由管理员在后台设置
        const nextSiteTitle = typeof data.siteTitle === 'string' ? data.siteTitle : '';
        if (siteSettingsStore.getTitle() !== nextSiteTitle) {
          siteSettingsStore.setTitle(nextSiteTitle);
        }

        // 直播源改为全局配置，所有用户使用同一份，不再同步个人源
        const remoteIptvSources = Array.isArray(data.iptvSources) ? data.iptvSources : [];
        if (JSON.stringify(useIPTVStore.getState().sources) !== JSON.stringify(remoteIptvSources)) {
          useIPTVStore.setState({
            sources: remoteIptvSources,
            cachedChannels: [],
            cachedGroups: [],
            cachedChannelsBySource: {},
            lastRefreshed: 0,
          });
        }

        const nextSources = remoteSources.length > 0 ? remoteSources : current.sources;
        const nextPremiumSources = remotePremiumSources.length > 0
          ? remotePremiumSources
          : current.premiumSources;
        const nextSubscriptions = remoteSubscriptions.length > 0
          ? remoteSubscriptions
          : current.subscriptions;

        const changed =
          JSON.stringify(current.sources) !== JSON.stringify(nextSources)
          || JSON.stringify(current.premiumSources) !== JSON.stringify(nextPremiumSources)
          || JSON.stringify(current.subscriptions) !== JSON.stringify(nextSubscriptions);

        if (changed) {
          settingsStore.saveSettings({
            ...current,
            sources: nextSources,
            premiumSources: nextPremiumSources,
            subscriptions: nextSubscriptions,
          });
        }

        // 管理员首次使用：把本地已有源写入全局配置
        if (
          remoteSources.length === 0 &&
          current.sources.length > 0 &&
          getSession()?.role === 'admin'
        ) {
          pushGlobalConfig();
        }
      } catch {
        // 服务端不可用时沿用本地缓存的全局源
      }
    };

    void load();

    // 设置页是配置的编辑方，不响应远程刷新，避免拖动过程中被旧快照覆盖
    if (isSettingsEditor) {
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = subscribeGlobalConfigUpdates(() => {
      void load();
    });
    const handleFocus = () => {
      void load();
    };
    window.addEventListener('focus', handleFocus);
    // 其他设备/浏览器没有 BroadcastChannel 通知，用轮询兜底
    const timer = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(timer);
    };
  }, [isSettingsEditor]);

  return null;
}
