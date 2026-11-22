/**
 * 网站标题：由管理员在后台设置，保存在 Kvrocks 全局配置中。
 * 客户端缓存到 localStorage，便于 Navbar 同步读取。
 */

const STORAGE_KEY = 'kvideo-site-title';

let cached: string | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export const siteSettingsStore = {
  getTitle(): string {
    if (cached === null) {
      cached = readFromStorage();
    }
    return cached;
  },

  setTitle(value: unknown): void {
    cached = typeof value === 'string' ? value : '';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, cached);
      } catch {
        // 忽略隐私模式下的存储失败
      }
    }
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
