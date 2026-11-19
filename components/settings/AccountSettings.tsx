'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, LogOut, Shield } from 'lucide-react';
import { clearSession, getSession, type Role } from '@/lib/store/auth-store';
import { SettingsSection } from './SettingsSection';
import { Icons } from '@/components/ui/Icon';

type LoginMode = 'none' | 'managed';

interface AccountInfo {
  id: string;
  username: string;
  name: string;
  role: Role;
  banned: boolean;
  createdAt: number;
  updatedAt: number;
}

interface EditableAccount {
  id?: string;
  username: string;
  name: string;
  role: Role;
  banned: boolean;
  password: string;
  isNew?: boolean;
  markedForDeletion?: boolean;
}

function buildEditableAccounts(accounts: AccountInfo[]): EditableAccount[] {
  return accounts.map((account) => ({
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    banned: account.banned === true,
    password: '',
  }));
}

async function logoutAndReload() {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch {
    // Best-effort logout: clear the local mirror even if the request fails.
  }

  clearSession();
  window.location.reload();
}

export function AccountSettings() {
  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);
  const [hasAuth, setHasAuth] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('none');
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [draftAccounts, setDraftAccounts] = useState<EditableAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const canManageAccounts = session?.role === 'admin';
  const isManagedMode = loginMode === 'managed';

  const fetchAccounts = useCallback(async () => {
    if (!canManageAccounts) return;

    setLoadingAccounts(true);
    setSaveError('');

    try {
      const response = await fetch('/api/auth/accounts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load accounts');
      }

      const nextAccounts = (data.accounts || []) as AccountInfo[];
      setAccounts(nextAccounts);
      setDraftAccounts(buildEditableAccounts(nextAccounts));
      setIsDirty(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to load accounts');
    } finally {
      setLoadingAccounts(false);
    }
  }, [canManageAccounts]);

  useEffect(() => {
    // 挂载后再读取本地会话，避免 effect 内同步 setState
    queueMicrotask(() => setSessionState(getSession()));

    fetch('/api/auth')
      .then((response) => response.json())
      .then((data) => {
        setHasAuth(!!data.hasAuth);
        setLoginMode(data.loginMode === 'managed' ? 'managed' : 'none');
      })
      .catch(() => {
        // Ignore config failures and keep the conservative default.
      });
  }, []);

  useEffect(() => {
    if (!canManageAccounts) return;
    queueMicrotask(() => fetchAccounts());
  }, [canManageAccounts, fetchAccounts, loginMode]);

  const currentDraftAccounts = useMemo(
    () => draftAccounts.filter((account) => !account.markedForDeletion),
    [draftAccounts]
  );

  const addDraftAccount = () => {
    setDraftAccounts((current) => [
      ...current,
      {
        username: '',
        name: '',
        role: 'user',
        banned: false,
        password: '',
        isNew: true,
      },
    ]);
    setIsDirty(true);
    setSaveSuccess('');
  };

  const updateDraftAccount = (index: number, patch: Partial<EditableAccount>) => {
    setDraftAccounts((current) => current.map((account, accountIndex) => {
      if (accountIndex !== index) return account;
      return {
        ...account,
        ...patch,
      };
    }));
    setIsDirty(true);
    setSaveSuccess('');
  };

  const removeDraftAccount = (index: number) => {
    setDraftAccounts((current) => current.flatMap((account, accountIndex) => {
      if (accountIndex !== index) return [account];
      if (account.isNew) return [];
      return [{ ...account, markedForDeletion: true }];
    }));
    setIsDirty(true);
    setSaveSuccess('');
  };

  const restoreDrafts = () => {
    setDraftAccounts(buildEditableAccounts(accounts));
    setIsDirty(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const saveManagedAccounts = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const originalById = new Map(accounts.map((account) => [account.id, account]));

    try {
      for (const draft of draftAccounts) {
        if (draft.markedForDeletion && draft.id) {
          const response = await fetch(`/api/auth/accounts/${draft.id}`, {
            method: 'DELETE',
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `Failed to delete ${draft.name}`);
          }
        }
      }

      for (const draft of draftAccounts) {
        if (draft.markedForDeletion) continue;

        if (draft.isNew) {
          const response = await fetch('/api/auth/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: draft.username,
              name: draft.name,
              password: draft.password,
              role: draft.role,
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `Failed to create ${draft.name || draft.username}`);
          }
          continue;
        }

        if (!draft.id) continue;
        const original = originalById.get(draft.id);
        if (!original) continue;

        const patch: Record<string, unknown> = {};
        if (draft.name !== original.name) patch.name = draft.name;
        if (draft.role !== original.role) patch.role = draft.role;
        if (draft.banned !== original.banned) patch.banned = draft.banned;
        if (draft.password) patch.password = draft.password;

        if (Object.keys(patch).length === 0) continue;

        const response = await fetch(`/api/auth/accounts/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Failed to update ${draft.name}`);
        }
      }

      await fetchAccounts();
      setSaveSuccess('账户修改已保存');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save accounts');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasAuth && !session) return null;

  return (
    <SettingsSection title="账户管理" description="管理员可在此管理全部账户；普通用户只能观看，不能进入后台。">
      <div className="space-y-6">
        {session && (
          <div className="flex items-center justify-between gap-4 p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] font-bold text-lg border border-[var(--glass-border)]">
                {session.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-color)] truncate">{session.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Shield size={12} className="text-[var(--accent-color)]" />
                  <span className="text-xs text-[var(--text-color-secondary)]">
                    {session.role === 'admin' ? '管理员' : '普通用户'}
                  </span>
                  {session.username && (
                    <span className="text-xs text-[var(--text-color-secondary)]">
                      @{session.username}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={logoutAndReload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-full)] text-[var(--text-color-secondary)] hover:text-red-500 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
            >
              <LogOut size={14} />
              退出登录
            </button>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-[color-mix(in_srgb,var(--accent-color)_5%,transparent)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
          <Info className="text-[var(--text-color-secondary)] shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-color-secondary)]">
              当前登录模式：
              <span className="text-[var(--text-color)] ml-1">
                {isManagedMode ? 'Kvrocks 托管账户' : '未启用'}
              </span>
            </p>
            <p className="text-xs text-[var(--text-color-secondary)]">
              系统只有管理员和普通用户两种角色。管理员可进入后台，普通用户仅使用观看、收藏和播放记录功能。
            </p>
          </div>
        </div>

        {canManageAccounts ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
                  <Icons.Users size={16} className="text-[var(--accent-color)]" />
                  账户列表
                </h3>
                <p className="text-xs text-[var(--text-color-secondary)] mt-1">
                  支持新增、修改角色、重置密码和删除账户。只有点击保存才会提交修改。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={restoreDrafts}
                  disabled={!isDirty || isSaving}
                  className="px-3 py-1.5 text-xs bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-full)] text-[var(--text-color-secondary)] disabled:opacity-50 cursor-pointer"
                >
                  取消修改
                </button>
                <button
                  onClick={saveManagedAccounts}
                  disabled={!isDirty || isSaving}
                  className="px-3 py-1.5 text-xs bg-[var(--accent-color)] text-white rounded-[var(--radius-full)] disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>

            {saveError && (
              <div className="p-3 rounded-[var(--radius-2xl)] border border-red-500/20 bg-red-500/10 text-sm text-red-400">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-[var(--radius-2xl)] border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-400">
                {saveSuccess}
              </div>
            )}

            {loadingAccounts ? (
              <div className="p-4 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm text-[var(--text-color-secondary)]">
                正在加载账户...
              </div>
            ) : (
              <div className="space-y-4">
                {currentDraftAccounts.map((account, index) => {
                  const isCurrentAccount = session?.accountId === account.id;

                  return (
                    <div
                      key={account.id || `new-${index}`}
                      className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--text-color)]">
                            {account.isNew ? '新账户' : account.name || account.username || '未命名账户'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                            {account.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                          {isCurrentAccount && (
                            <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] border border-[var(--glass-border)] text-[var(--text-color-secondary)]">
                              当前账户
                            </span>
                          )}
                          {account.banned && (
                            <span className="text-xs px-2 py-0.5 rounded-[var(--radius-full)] bg-red-500/10 text-red-400">
                              已封禁
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeDraftAccount(index)}
                          disabled={isCurrentAccount}
                          className="p-1 text-[var(--text-color-secondary)] hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                          title={isCurrentAccount ? '不能删除当前登录账户' : '删除账户'}
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="space-y-1">
                          <span className="text-xs text-[var(--text-color-secondary)]">用户名</span>
                          <input
                            type="text"
                            value={account.username}
                            disabled={!account.isNew}
                            onChange={(event) => updateDraftAccount(index, { username: event.target.value.toLowerCase() })}
                            className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] disabled:opacity-60 focus:outline-none focus:border-[var(--accent-color)]"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-[var(--text-color-secondary)]">显示名称</span>
                          <input
                            type="text"
                            value={account.name}
                            onChange={(event) => updateDraftAccount(index, { name: event.target.value })}
                            className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-[var(--text-color-secondary)]">角色</span>
                          <select
                            value={account.role}
                            disabled={isCurrentAccount}
                            onChange={(event) => updateDraftAccount(index, { role: event.target.value as Role })}
                            className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] disabled:opacity-60 focus:outline-none focus:border-[var(--accent-color)]"
                          >
                            <option value="user">普通用户</option>
                            <option value="admin">管理员</option>
                          </select>
                        </label>
                      </div>

                      <label className="space-y-1 block">
                        <span className="text-xs text-[var(--text-color-secondary)]">
                          {account.isNew ? '登录密码' : '重置密码（留空表示不修改）'}
                        </span>
                        <input
                          type="password"
                          value={account.password}
                          onChange={(event) => updateDraftAccount(index, { password: event.target.value })}
                          className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]"
                        />
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[var(--text-color-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={account.banned}
                          disabled={isCurrentAccount}
                          onChange={(event) => updateDraftAccount(index, { banned: event.target.checked })}
                          className="w-3.5 h-3.5 rounded accent-[var(--accent-color)] disabled:opacity-50"
                        />
                        封禁该账户（禁止登录）
                      </label>
                    </div>
                  );
                })}

                <button
                  onClick={addDraftAccount}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[var(--glass-bg)] border border-dashed border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-[var(--text-color-secondary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)]/30 transition-all w-full justify-center cursor-pointer"
                >
                  <Icons.Plus size={14} />
                  添加账户
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color-secondary)]">
            只有管理员可以查看和修改账户列表。
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
