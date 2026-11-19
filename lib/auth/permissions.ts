/**
 * 角色模型：系统只保留管理员和普通用户两种角色。
 * - admin：可使用后台与全部设置
 * - user：仅可使用普通观看相关功能
 *
 * 历史数据中的 super_admin / admin 统一归并为 admin，
 * viewer 及其他未知值统一归并为 user。
 */
export type Role = 'admin' | 'user';

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
  user: ['view_settings', 'iptv_access'],
};

export function isRole(value: string | undefined | null): value is Role {
  return value === 'admin' || value === 'user';
}

export function normalizeRole(value: string | undefined | null): Role {
  if (value === 'admin' || value === 'super_admin' || value === 'user' || value === 'viewer') {
    return value === 'admin' || value === 'super_admin' ? 'admin' : 'user';
  }
  return 'user';
}

export function isAdminRole(value: string | undefined | null): boolean {
  return normalizeRole(value) === 'admin';
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
