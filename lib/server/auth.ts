import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/server/redis';
import { getRuntimeEnvValue } from '@/lib/server/runtime-env';
import { getRuntimeFeatures } from '@/lib/server/runtime-features';
import {
  createStoredAccount,
  ensureUniqueUsername,
  hashPassword,
  normalizeUsername,
  parseBootstrapAccounts,
  resolveLoginMode,
  shouldUseSecureSessionCookie,
  signSessionPayload,
  verifyPassword,
  verifySessionToken,
  type LoginMode,
  type SeedAccountInput,
  type SessionCookieProtocolRequest,
  type SessionPayload,
  type StoredAccountRecord,
} from '@/lib/server/auth-helpers';
import {
  hasResolvedPermission,
  normalizePermissions,
  normalizeRole,
  type Permission,
  type Role,
} from '@/lib/auth/permissions';

export type { LoginMode };

export interface ServerAuthSession {
  accountId: string;
  profileId: string;
  username?: string;
  name: string;
  role: Role;
  customPermissions: Permission[];
  mode: 'managed';
  iat: number;
}

export interface PublicAuthConfig {
  hasAuth: boolean;
  hasPremiumAuth: boolean;
  loginMode: LoginMode;
  persistSession: boolean;
  allowRegister: boolean;
  requireInviteCode: boolean;
  subscriptionSources: string;
  iptvSources: string;
  mergeSources: string;
  danmakuApiUrl: string;
}

export interface PublicSessionData {
  accountId: string;
  profileId: string;
  username?: string;
  name: string;
  role: Role;
  customPermissions?: Permission[];
  mode: 'managed';
}

export interface AccountInfo {
  id: string;
  username: string;
  name: string;
  role: Role;
  customPermissions: Permission[];
  banned: boolean;
  createdAt: number;
  updatedAt: number;
}

export const SESSION_COOKIE_NAME = 'kvideo_session';
const MANAGED_ACCOUNTS_KEY = 'auth:accounts:v1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ACCOUNTS = process.env.ACCOUNTS || '';
const AUTH_SECRET = process.env.AUTH_SECRET || '';
const PREMIUM_PASSWORD = process.env.PREMIUM_PASSWORD || '';
const PERSIST_SESSION = process.env.PERSIST_SESSION !== 'false';
const SUBSCRIPTION_SOURCES = process.env.SUBSCRIPTION_SOURCES || process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES || '';
const IPTV_SOURCES = process.env.IPTV_SOURCES || process.env.NEXT_PUBLIC_IPTV_SOURCES || '';
const MERGE_SOURCES = process.env.MERGE_SOURCES || process.env.NEXT_PUBLIC_MERGE_SOURCES || '';
const DANMAKU_API_URL = process.env.DANMAKU_API_URL || process.env.NEXT_PUBLIC_DANMAKU_API_URL || '';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export class ManagedAuthStorageError extends Error {
  constructor(operation: 'read' | 'write', cause?: unknown) {
    super(`Managed auth storage ${operation} failed`, { cause });
    this.name = 'ManagedAuthStorageError';
  }
}

function getAdminUsername(): string {
  return normalizeUsername(getRuntimeEnvValue('ADMIN_USERNAME', 'admin')) || 'admin';
}

function getAdminPassword(): string {
  return getRuntimeEnvValue('ADMIN_PASSWORD', ADMIN_PASSWORD);
}

function isManagedAuthEnabled(): boolean {
  return !!getRuntimeEnvValue('AUTH_SECRET', AUTH_SECRET) && !!getRedisClient();
}

function isStoredAccountRecord(value: unknown): value is StoredAccountRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<StoredAccountRecord>;
  return typeof record.id === 'string' &&
    typeof record.username === 'string' &&
    typeof record.name === 'string' &&
    typeof record.passwordHash === 'string' &&
    typeof record.passwordSalt === 'string' &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number';
}

function normalizeStoredAccount(value: StoredAccountRecord): StoredAccountRecord {
  return {
    ...value,
    username: normalizeUsername(value.username),
    role: normalizeRole(value.role),
    customPermissions: [],
    banned: value.banned === true,
  };
}

async function readManagedAccounts(): Promise<StoredAccountRecord[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const stored = await redis.get(MANAGED_ACCOUNTS_KEY);
    if (!Array.isArray(stored)) return [];
    return stored.filter(isStoredAccountRecord).map(normalizeStoredAccount);
  } catch (error) {
    console.error('Managed auth Redis read failed:', error);
    throw new ManagedAuthStorageError('read', error);
  }
}

async function saveManagedAccounts(accounts: StoredAccountRecord[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    throw new ManagedAuthStorageError(
      'write',
      new Error('Managed auth storage unavailable')
    );
  }

  try {
    await redis.set(MANAGED_ACCOUNTS_KEY, accounts);
  } catch (error) {
    console.error('Managed auth Redis write failed:', error);
    throw new ManagedAuthStorageError('write', error);
  }
}

/**
 * 仅在账户库为空时写入初始账户：
 * - ADMIN_PASSWORD 创建唯一管理员
 * - ACCOUNTS 中的账户一律作为普通用户导入
 */
function getBootstrapSeeds(): SeedAccountInput[] {
  const seeds: SeedAccountInput[] = [];
  const usernames = new Set<string>();

  const adminPassword = getAdminPassword();
  if (adminPassword) {
    const username = getAdminUsername();
    usernames.add(username);
    seeds.push({
      username,
      password: adminPassword,
      name: '管理员',
      role: 'admin',
      customPermissions: [],
    });
  }

  for (const account of parseBootstrapAccounts(ACCOUNTS)) {
    const username = ensureUniqueUsername(account.username, usernames, account.name);
    usernames.add(username);
    seeds.push({ ...account, username, role: 'user', customPermissions: [] });
  }

  return seeds;
}

async function ensureManagedAccountsBootstrapped(): Promise<StoredAccountRecord[]> {
  if (!isManagedAuthEnabled()) return [];

  const existing = await readManagedAccounts();
  if (existing.length > 0) {
    return existing;
  }

  const bootstrapSeeds = getBootstrapSeeds();
  if (bootstrapSeeds.length === 0) {
    return [];
  }

  const now = Date.now();
  const created = await Promise.all(
    bootstrapSeeds.map((seed, index) => createStoredAccount(seed, now + index))
  );
  await saveManagedAccounts(created);
  return created;
}

async function getManagedAccountCount(): Promise<number> {
  if (!isManagedAuthEnabled()) return 0;

  const existing = await readManagedAccounts();
  if (existing.length > 0) {
    return existing.length;
  }

  return getBootstrapSeeds().length;
}

function getPublicRuntimeConfig(): Omit<
  PublicAuthConfig,
  'hasAuth' | 'hasPremiumAuth' | 'loginMode' | 'allowRegister' | 'requireInviteCode'
> {
  const runtimeFeatures = getRuntimeFeatures();

  return {
    persistSession: PERSIST_SESSION,
    subscriptionSources: SUBSCRIPTION_SOURCES,
    iptvSources: runtimeFeatures.iptvEnabled ? IPTV_SOURCES : '',
    mergeSources: MERGE_SOURCES,
    danmakuApiUrl: DANMAKU_API_URL,
  };
}

export async function getPublicAuthConfig(): Promise<PublicAuthConfig> {
  const managedAuthEnabled = isManagedAuthEnabled();
  const managedAccountCount = await getManagedAccountCount();
  const loginMode = resolveLoginMode({
    managedAccountCount,
    managedAuthEnabled,
  });

  return {
    hasAuth: loginMode !== 'none',
    hasPremiumAuth: !!PREMIUM_PASSWORD,
    loginMode,
    allowRegister:
      managedAuthEnabled &&
      loginMode === 'managed' &&
      getRuntimeEnvValue('ALLOW_REGISTRATION', 'true') !== 'false',
    requireInviteCode: !!getRuntimeEnvValue('REGISTRATION_INVITE_CODE').trim(),
    ...getPublicRuntimeConfig(),
  };
}

function resolveSessionSecret(): string | null {
  return getRuntimeEnvValue('AUTH_SECRET', AUTH_SECRET) || null;
}

function sessionPayloadToServerSession(payload: SessionPayload): ServerAuthSession {
  return {
    accountId: payload.accountId,
    profileId: payload.profileId,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    customPermissions: [],
    mode: 'managed',
    iat: payload.iat,
  };
}

export function toPublicSession(session: ServerAuthSession): PublicSessionData {
  return {
    accountId: session.accountId,
    profileId: session.profileId,
    username: session.username,
    // 账户不再使用昵称，显示名称统一为用户名
    name: session.username || session.name,
    role: session.role,
    customPermissions: session.customPermissions.length > 0 ? session.customPermissions : undefined,
    mode: 'managed',
  };
}

async function signSession(session: ServerAuthSession): Promise<string | null> {
  const secret = resolveSessionSecret();
  if (!secret) return null;

  return signSessionPayload(
    {
      accountId: session.accountId,
      profileId: session.profileId,
      username: session.username,
      name: session.name,
      role: session.role,
      customPermissions: [],
      mode: 'managed',
      iat: session.iat,
    },
    secret
  );
}

export async function getServerSessionFromCookieValue(
  token: string | undefined
): Promise<ServerAuthSession | null> {
  if (!token) return null;

  const secret = resolveSessionSecret();
  if (!secret) return null;

  const payload = await verifySessionToken(token, secret);
  if (!payload) return null;

  return sessionPayloadToServerSession(payload);
}

export async function getServerSession(request: NextRequest): Promise<ServerAuthSession | null> {
  return getServerSessionFromCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

// 管理接口使用：除签名校验外，再以存储中的账户状态为准（防止封禁/降权后旧 token 继续生效）
export async function getAuthoritativeSessionFromSession(
  session: ServerAuthSession | null
): Promise<ServerAuthSession | null> {
  if (!session) return null;

  const accounts = await readManagedAccounts();
  const account = accounts.find((item) => item.id === session.accountId);
  if (!account || account.banned) return null;

  return {
    accountId: account.id,
    profileId: account.id,
    username: account.username,
    name: account.username,
    role: account.role,
    customPermissions: [],
    mode: 'managed',
    iat: session.iat,
  };
}

export async function getAuthoritativeSession(
  request: NextRequest
): Promise<ServerAuthSession | null> {
  return getAuthoritativeSessionFromSession(await getServerSession(request));
}

export function hasServerPermission(session: ServerAuthSession, permission: Permission): boolean {
  return hasResolvedPermission(session.role, permission);
}

export function isAdminSession(session: ServerAuthSession): boolean {
  return session.role === 'admin';
}

async function authenticateManagedLogin(username: string, password: string): Promise<ServerAuthSession | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || !password) return null;

  const accounts = await ensureManagedAccountsBootstrapped();
  const account = accounts.find((item) => item.username === normalizedUsername);

  if (!account || account.banned) return null;

  const valid = await verifyPassword(password, account.passwordSalt, account.passwordHash);
  if (!valid) return null;

  return {
    accountId: account.id,
    profileId: account.id,
    username: account.username,
    name: account.username,
    role: account.role,
    customPermissions: [],
    mode: 'managed',
    iat: Date.now(),
  };
}

export async function authenticateLogin(body: { username?: string; password?: string }): Promise<ServerAuthSession | null> {
  const config = await getPublicAuthConfig();
  if (config.loginMode !== 'managed') {
    return null;
  }

  return authenticateManagedLogin(body.username || '', body.password || '');
}

export async function validatePremiumAccess(
  request: NextRequest,
  body: { username?: string; password?: string }
): Promise<boolean> {
  const session = await getServerSession(request);
  if (session && isAdminSession(session)) {
    return true;
  }

  if (!PREMIUM_PASSWORD) {
    return true;
  }

  if (!body.password || typeof body.password !== 'string') {
    return false;
  }

  if (body.password === PREMIUM_PASSWORD) {
    return true;
  }

  const config = await getPublicAuthConfig();
  if (config.loginMode === 'managed' && body.username) {
    const premiumSession = await authenticateManagedLogin(body.username, body.password);
    return !!premiumSession && isAdminSession(premiumSession);
  }

  return false;
}

export async function createLoginResponse(
  session: ServerAuthSession,
  request?: SessionCookieProtocolRequest,
): Promise<NextResponse> {
  const config = await getPublicAuthConfig();
  const token = await signSession(session);
  if (!token) {
    return NextResponse.json({ valid: false, message: 'Session signing unavailable' }, { status: 500 });
  }

  const response = NextResponse.json({
    valid: true,
    session: toPublicSession(session),
    ...config,
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureSessionCookie(request),
    path: '/',
    ...(PERSIST_SESSION ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  });
  return response;
}

export async function createSessionStatusResponse(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(request);
  const config = await getPublicAuthConfig();

  return NextResponse.json({
    authenticated: !!session,
    session: session ? toPublicSession(session) : null,
    ...config,
  });
}

export function logoutResponse(request?: SessionCookieProtocolRequest): NextResponse {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureSessionCookie(request),
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function listAccountInfo(): Promise<AccountInfo[]> {
  const accounts = await ensureManagedAccountsBootstrapped();
  return accounts.map((account) => ({
    id: account.id,
    username: account.username,
    name: account.username,
    role: account.role,
    customPermissions: [],
    banned: account.banned,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }));
}

function sanitizeAccountInput(body: unknown): {
  username?: string;
  name?: string;
  password?: string;
  role?: Role;
  banned?: boolean;
} {
  if (!body || typeof body !== 'object') return {};
  const input = body as Record<string, unknown>;

  return {
    username: typeof input.username === 'string' ? normalizeUsername(input.username) : undefined,
    name: typeof input.name === 'string' ? input.name.trim() : undefined,
    password: typeof input.password === 'string' ? input.password : undefined,
    role: typeof input.role === 'string' ? normalizeRole(input.role) : undefined,
    banned: typeof input.banned === 'boolean' ? input.banned : undefined,
  };
}

function ensureOneAdmin(accounts: StoredAccountRecord[]): void {
  const count = accounts.filter(
    (account) => account.role === 'admin' && !account.banned
  ).length;
  if (count === 0) {
    throw new Error('至少需要保留一个可用的管理员账户');
  }
}

export async function createManagedAccount(body: unknown): Promise<AccountInfo> {
  if (!isManagedAuthEnabled()) {
    throw new Error('Managed accounts unavailable');
  }

  const input = sanitizeAccountInput(body);
  if (!input.username || !input.password || !input.role) {
    throw new Error('Username, password and role are required');
  }

  const accounts = await ensureManagedAccountsBootstrapped();
  if (accounts.some((account) => account.username === input.username)) {
    throw new Error('Username already exists');
  }

  const created = await createStoredAccount({
    username: input.username,
    password: input.password,
    // 账户不再提供昵称，显示名称统一使用用户名
    name: input.username,
    role: input.role,
    customPermissions: [],
  });

  const nextAccounts = [...accounts, created];
  ensureOneAdmin(nextAccounts);
  await saveManagedAccounts(nextAccounts);

  return {
    id: created.id,
    username: created.username,
    name: created.name,
    role: created.role,
    customPermissions: [],
    banned: created.banned,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export async function updateManagedAccount(
  accountId: string,
  body: unknown,
  requesterAccountId?: string
): Promise<AccountInfo> {
  if (!isManagedAuthEnabled()) {
    throw new Error('Managed accounts unavailable');
  }

  const input = sanitizeAccountInput(body);
  const accounts = await ensureManagedAccountsBootstrapped();
  const accountIndex = accounts.findIndex((account) => account.id === accountId);
  if (accountIndex === -1) {
    throw new Error('Account not found');
  }

  const current = accounts[accountIndex];
  const updated: StoredAccountRecord = {
    ...current,
    // 账户不再使用昵称，显示名称统一为用户名
    name: current.username,
    role: input.role || current.role,
    customPermissions: [],
    banned: input.banned ?? current.banned,
    updatedAt: Date.now(),
  };

  if (requesterAccountId === accountId && updated.banned) {
    throw new Error('Cannot ban the current account');
  }

  if (input.password) {
    const password = await hashPassword(input.password);
    updated.passwordHash = password.hash;
    updated.passwordSalt = password.salt;
  }

  const nextAccounts = accounts.map((account) => account.id === accountId ? updated : account);
  ensureOneAdmin(nextAccounts);
  await saveManagedAccounts(nextAccounts);

  return {
    id: updated.id,
    username: updated.username,
    name: updated.username,
    role: updated.role,
    customPermissions: [],
    banned: updated.banned,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteManagedAccount(
  accountId: string,
  requesterAccountId?: string
): Promise<void> {
  if (!isManagedAuthEnabled()) {
    throw new Error('Managed accounts unavailable');
  }

  if (requesterAccountId === accountId) {
    throw new Error('Cannot delete the current account');
  }

  const accounts = await ensureManagedAccountsBootstrapped();
  const nextAccounts = accounts.filter((account) => account.id !== accountId);
  if (nextAccounts.length === accounts.length) {
    throw new Error('Account not found');
  }

  ensureOneAdmin(nextAccounts);
  await saveManagedAccounts(nextAccounts);
}

export interface RegisterAccountInput {
  username?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  inviteCode?: unknown;
}

// 开放注册：用户名 3-20 位字母数字下划线、密码至少 6 位、可选邀请码；新用户固定为普通用户
export async function registerManagedAccount(
  body: RegisterAccountInput
): Promise<ServerAuthSession> {
  const config = await getPublicAuthConfig();

  if (!isManagedAuthEnabled() || config.loginMode !== 'managed') {
    throw new Error('当前部署未启用托管账户注册');
  }

  if (!config.allowRegister) {
    throw new Error('管理员已关闭用户注册功能');
  }

  const rawUsername = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!rawUsername) throw new Error('用户名不能为空');
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(rawUsername)) {
    throw new Error('用户名只能包含字母、数字和下划线，长度 3-20 位');
  }
  if (!password) throw new Error('密码不能为空');
  if (password !== confirmPassword) throw new Error('两次输入的密码不一致');
  if (password.length < 6) throw new Error('密码长度至少 6 位');

  if (config.requireInviteCode) {
    const expected = getRuntimeEnvValue('REGISTRATION_INVITE_CODE').trim().toUpperCase();
    const supplied = typeof body.inviteCode === 'string'
      ? body.inviteCode.trim().toUpperCase()
      : '';

    if (!supplied) throw new Error('请输入邀请码');
    if (supplied !== expected) throw new Error('邀请码无效');
  }

  const username = normalizeUsername(rawUsername);
  const accounts = await ensureManagedAccountsBootstrapped();

  if (!accounts.some((account) => account.role === 'admin' && !account.banned)) {
    throw new Error('系统尚未初始化管理员账户，暂不开放注册');
  }

  if (accounts.some((account) => account.username === username)) {
    throw new Error('该用户名已被注册');
  }

  const created = await createStoredAccount({
    username,
    password,
    name: rawUsername,
    role: 'user',
    customPermissions: [],
  });

  await saveManagedAccounts([...accounts, created]);

  return {
    accountId: created.id,
    profileId: created.id,
    username: created.username,
    name: created.name,
    role: created.role,
    customPermissions: [],
    mode: 'managed',
    iat: Date.now(),
  };
}
