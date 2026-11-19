'use client';

import { useEffect } from 'react';
import { settingsStore } from '@/lib/store/settings-store';
import { getSession } from '@/lib/store/auth-store';
import { pushGlobalConfig } from '@/lib/utils/global-config-client';

/**
 * 应用启动时加载管理员维护的全局视频源。
 * 所有用户（包括未登录）都使用同一份源配置。
 */
export function GlobalConfigSync() {
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

        settingsStore.saveSettings({
          ...current,
          // 远程为空时保留本地数据，避免首次加载把已有源清空
          sources: remoteSources.length > 0 ? remoteSources : current.sources,
          premiumSources: remotePremiumSources.length > 0
            ? remotePremiumSources
            : current.premiumSources,
          subscriptions: remoteSubscriptions.length > 0
            ? remoteSubscriptions
            : current.subscriptions,
        });

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

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
