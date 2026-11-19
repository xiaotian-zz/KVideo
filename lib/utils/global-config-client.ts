import { settingsStore } from '@/lib/store/settings-store';

/**
 * 管理员修改视频源后，把全局配置写入 Kvrocks。
 * 普通用户没有设置页，且服务端会再次校验管理员身份。
 */
export function pushGlobalConfig(): void {
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
  }).catch(() => {
    // 保存失败时保留本地状态，下次修改会再次尝试
  });
}
