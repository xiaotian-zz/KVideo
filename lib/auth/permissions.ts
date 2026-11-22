/**
 * 角色模型：系统只有管理员、高级会员和普通用户三种用户组。
 * - admin：可使用后台与全部设置
 * - premium：可使用普通功能与高级内容，但不能进入后台
 * - user：仅可使用普通观看相关功能
 *
 * 其他未知值统一归并为 user。
 */
export type Role = 'admin' | 'premium' | 'user';

/** 视频源类型：普通源 / 18+ 源 */
export type SourceKind = 'normal' | 'premium';

export type RoleSourceAccess = Record<Role, SourceKind[]>;

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  normal: '普通源',
  premium: '18+ 源',
};

export const ALL_SOURCE_KINDS: SourceKind[] = ['normal', 'premium'];

export const DEFAULT_ROLE_SOURCE_ACCESS: RoleSourceAccess = {
  admin: [...ALL_SOURCE_KINDS],
  premium: [...ALL_SOURCE_KINDS],
  user: ['normal'],
};

export function isSourceKind(value: string | undefined | null): value is SourceKind {
  return value === 'normal' || value === 'premium';
}

export function normalizeRoleSourceAccess(value: unknown): RoleSourceAccess {
  const input = (value && typeof value === 'object' ? value : {}) as Partial<Record<Role, unknown>>;
  const result = {} as RoleSourceAccess;

  (Object.keys(DEFAULT_ROLE_SOURCE_ACCESS) as Role[]).forEach((role) => {
    const raw = input[role];
    result[role] = Array.isArray(raw)
      ? Array.from(new Set(raw.filter((item): item is SourceKind => isSourceKind(item as string))))
      : [...DEFAULT_ROLE_SOURCE_ACCESS[role]];
  });

  return result;
}

export type Permission =
  | 'source_management'
  | 'account_management'
  | 'danmaku_api'
  | 'data_management'
  | 'player_settings'
  | 'danmaku_appearance'
  | 'view_settings'
  | 'iptv_access'
  | 'iptv_source_management'
  | 'iptv_builtin_sources';

export const ALL_PERMISSIONS: Permission[] = [
  'source_management',
  'account_management',
  'danmaku_api',
  'data_management',
  'player_settings',
  'danmaku_appearance',
  'view_settings',
  'iptv_access',
  'iptv_source_management',
  'iptv_builtin_sources',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  premium: ['view_settings', 'iptv_access'],
  user: ['view_settings', 'iptv_access'],
};

export function isRole(value: string | undefined | null): value is Role {
  return value === 'admin' || value === 'premium' || value === 'user';
}

export function normalizeRole(value: string | undefined | null): Role {
  if (value === 'admin') return 'admin';
  if (value === 'premium' || value === 'vip') return 'premium';
  return 'user';
}

export function isAdminRole(value: string | undefined | null): boolean {
  return normalizeRole(value) === 'admin';
}

export function isPremiumRole(value: string | undefined | null): boolean {
  return normalizeRole(value) === 'premium';
}

export function isPermission(value: string | undefined | null): value is Permission {
  return !!value && ALL_PERMISSIONS.includes(value as Permission);
}

export function normalizePermissions(values: readonly string[] | undefined | null): Permission[] {
  if (!values || values.length === 0) return [];
  return values.filter((value): value is Permission => isPermission(value));
}

/**
 * 只按角色返回权限，忽略历史遗留的 customPermissions，
 * 避免普通用户通过旧数据获得后台权限。
 */
export function resolvePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}

export function hasResolvedPermission(
  role: Role,
  permission: Permission,
  _customPermissions?: readonly string[] | null
): boolean {
  return resolvePermissions(role).includes(permission);
}

export function hasRoleAtLeast(role: Role, minimumRole: Role): boolean {
  if (minimumRole === 'admin') {
    return normalizeRole(role) === 'admin';
  }
  return true;
}
