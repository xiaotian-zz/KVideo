import { settingsStore } from '@/lib/store/settings-store';

const GLOBAL_CONFIG_CHANNEL = 'kvideo-global-config';

let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function createConfigChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  return new BroadcastChannel(GLOBAL_CONFIG_CHANNEL);
}

/**
 * 通知其他标签页：全局配置已更新，需要重新拉取。
 */
export function notifyGlobalConfigUpdated(): void {
  const channel = createConfigChannel();
  if (!channel) return;
  channel.postMessage('updated');
  channel.close();
}

/**
 * 监听其他标签页的全局配置更新通知。
 */
export function subscribeGlobalConfigUpdates(callback: () => void): () => void {
  const channel = createConfigChannel();
  if (!channel) return () => {};
  channel.onmessage = () => callback();
  return () => channel.close();
}

/**
 * 管理员修改视频源后，把全局配置写入 Kvrocks。
 * 普通用户没有设置页，且服务端会再次校验管理员身份。
 *
 * 使用短防抖合并连续修改（例如跨组拖动会同时更新普通源和 18+ 源），
 * 避免两个并发请求用旧数据互相覆盖。
 */
export function pushGlobalConfig(): void {
  if (typeof window === 'undefined') return;

  if (pendingTimer) clearTimeout(pendingTimer);

  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    const settings = settingsStore.getSettings();

    void fetch('/api/global-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: settings.sources,
        premiumSources: settings.premiumSources,
        subscriptions: settings.subscriptions,
      }),
      keepalive: true,
    }).then((response) => {
      if (response.ok) {
        notifyGlobalConfigUpdated();
      }
    }).catch(() => {
      // 保存失败时保留本地状态，下次修改会再次尝试
    });
  }, 300);
}
