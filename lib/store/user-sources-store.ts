/**
 * User Sources Store - 仅保存用户个人的弹幕 API。
 * 视频源已改为管理员维护的全局配置（Kvrocks），不再按用户保存。
 */

import { getProfileId } from './auth-store';

export interface DanmakuApiEntry {
  id: string;
  name: string;
  url: string;
}

interface UserSourcesState {
  danmakuApis: DanmakuApiEntry[];
  activeDanmakuApiId: string | null;
}

function getStorageKey(): string {
  const profileId = getProfileId();
  return `kvideo-user-sources-${profileId}`;
}

function getState(): UserSourcesState {
  if (typeof window === 'undefined') {
    return { danmakuApis: [], activeDanmakuApiId: null };
  }
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return { danmakuApis: [], activeDanmakuApiId: null };
    const parsed = JSON.parse(raw);
    return {
      danmakuApis: Array.isArray(parsed.danmakuApis) ? parsed.danmakuApis : [],
      activeDanmakuApiId: parsed.activeDanmakuApiId ?? null,
    };
  } catch {
    return { danmakuApis: [], activeDanmakuApiId: null };
  }
}

function saveState(state: UserSourcesState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getStorageKey(), JSON.stringify(state));
  userSourcesStore.notifyListeners();
}

export const userSourcesStore = {
  listeners: new Set<() => void>(),

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  },

  notifyListeners(): void {
    this.listeners.forEach(l => l());
  },

  getState,

  getDanmakuApis(): DanmakuApiEntry[] {
    return getState().danmakuApis;
  },

  getActiveDanmakuApi(): DanmakuApiEntry | null {
    const state = getState();
    if (!state.activeDanmakuApiId) return null;
    return state.danmakuApis.find(a => a.id === state.activeDanmakuApiId) ?? null;
  },

  addDanmakuApi(entry: DanmakuApiEntry): void {
    const state = getState();
    if (state.danmakuApis.find(a => a.id === entry.id)) return;
    saveState({ ...state, danmakuApis: [...state.danmakuApis, entry] });
  },

  removeDanmakuApi(id: string): void {
    const state = getState();
    const newApis = state.danmakuApis.filter(a => a.id !== id);
    const newActiveId = state.activeDanmakuApiId === id ? null : state.activeDanmakuApiId;
    saveState({ ...state, danmakuApis: newApis, activeDanmakuApiId: newActiveId });
  },

  setActiveDanmakuApi(id: string | null): void {
    const state = getState();
    saveState({ ...state, activeDanmakuApiId: id });
  },

  // 用于从服务端恢复当前用户的弹幕 API
  replaceState(next: Partial<UserSourcesState>): void {
    const state = getState();
    saveState({
      danmakuApis: Array.isArray(next.danmakuApis) ? next.danmakuApis : state.danmakuApis,
      activeDanmakuApiId: next.activeDanmakuApiId ?? null,
    });
  },
};
