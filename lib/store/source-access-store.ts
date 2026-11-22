/**
 * 用户组源权限：由管理员在后台编辑，保存在 Kvrocks 全局配置中。
 * 客户端缓存到 localStorage，便于同步读取当前用户组可查看的源类型。
 */

import {
  DEFAULT_ROLE_SOURCE_ACCESS,
  normalizeRole,
  normalizeRoleSourceAccess,
  type Role,
  type RoleSourceAccess,
  type SourceKind,
} from '@/lib/auth/permissions';

const STORAGE_KEY = 'kvideo-role-source-access';

let cached: RoleSourceAccess | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): RoleSourceAccess {
  if (typeof window === 'undefined') {
    return normalizeRoleSourceAccess(DEFAULT_ROLE_SOURCE_ACCESS);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeRoleSourceAccess(DEFAULT_ROLE_SOURCE_ACCESS);
    return normalizeRoleSourceAccess(JSON.parse(raw));
  } catch {
    return normalizeRoleSourceAccess(DEFAULT_ROLE_SOURCE_ACCESS);
  }
}

export const sourceAccessStore = {
  get(): RoleSourceAccess {
    if (!cached) {
      cached = readFromStorage();
    }
    return cached;
  },

  set(value: unknown): void {
    cached = normalizeRoleSourceAccess(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
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

/** 判断用户组是否可以查看某类视频源；未登录按普通用户处理。 */
export function canRoleAccessSourceKind(
  role: Role | string | undefined | null,
  kind: SourceKind
): boolean {
  return sourceAccessStore.get()[normalizeRole(role)].includes(kind);
}
