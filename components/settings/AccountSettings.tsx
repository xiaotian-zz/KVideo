'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, Info, KeyRound, LogOut, Shield, Trash2, UserPlus } from 'lucide-react';
import { clearSession, getSession, type Role } from '@/lib/store/auth-store';
import { SettingsSection } from './SettingsSection';
import { UserGroupSettings } from './UserGroupSettings';

interface AccountInfo {
  id: string;
  username: string;
  name: string;
  role: Role;
  banned: boolean;
  createdAt: number;
  updatedAt: number;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: '管理员',
  premium: '高级会员',
  user: '普通用户',
};

const INPUT_CLASS =
  'w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] placeholder-[var(--text-color-secondary)] focus:outline-none focus:border-[var(--accent-color)]';
const BUTTON_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-full)] border transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-full)] bg-[var(--accent-color)] text-white transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

async function logoutAndReload() {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } finally {
    clearSession();
    window.location.replace('/');
  }
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

export function AccountSettings() {
  const [session] = useState<ReturnType<typeof getSession>>(() => getSession());
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('user');
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/accounts', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '加载账户失败');
      }
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载账户失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 首次进入设置页加载账户列表，属于标准的数据拉取副作用
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccounts();
  }, [loadAccounts]);

  const createAccount = async () => {
    const username = newUsername.trim();
    if (!username || !newPassword) {
      setError('请填写用户名和初始密码');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('用户名需为 3-20 位字母、数字或下划线');
      return;
    }
    if (newPassword.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    setBusy('create');
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/auth/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: newRole, password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '创建账户失败');
      }
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setSuccess('账户已创建');
      await loadAccounts();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '创建账户失败');
    } finally {
      setBusy(null);
    }
  };

  const patchAccount = async (account: AccountInfo, patch: Record<string, unknown>, message: string) => {
    setBusy(account.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/auth/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '更新账户失败');
      }
      setSuccess(message);
      await loadAccounts();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '更新账户失败');
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (account: AccountInfo) => {
    const password = (passwordDrafts[account.id] ?? '').trim();
    if (password.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    await patchAccount(account, { password }, '密码已重置');
    setPasswordDrafts((current) => ({ ...current, [account.id]: '' }));
  };

  const deleteAccount = async (account: AccountInfo) => {
    setBusy(account.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/auth/accounts/${account.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '删除账户失败');
      }
      setPendingDeleteId(null);
      setSuccess('账户已删除');
      await loadAccounts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除账户失败');
    } finally {
      setBusy(null);
    }
  };

  const currentAccountId = session?.accountId;

  return (
    <SettingsSection title="账户管理" description="查看当前登录用户，并管理可访问本站的账户。">
      <div className="space-y-6">
        {session && (
          <div className="flex items-center justify-between gap-4 p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] font-bold text-lg border border-[var(--glass-border)]">
                {(session.username || session.name).charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-color)] truncate">{session.username || session.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Shield
                    size={12}
                    className={session.role === 'admin' ? 'text-[var(--accent-color)]' : 'text-[var(--text-color-secondary)]'}
                  />
                  <span className="text-xs text-[var(--text-color-secondary)]">{ROLE_LABELS[session.role]}</span>
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
              账户信息保存在 Kvrocks 中，修改会立即生效。
            </p>
            <p className="text-xs text-[var(--text-color-secondary)]">
              管理员可使用全部设置；高级会员可访问高级内容；普通用户仅可使用普通观看功能。系统始终至少保留一名管理员。
            </p>
          </div>
        </div>

        <UserGroupSettings />

        {error && (
          <div className="p-3 rounded-[var(--radius-2xl)] border border-red-500/20 bg-red-500/10 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-[var(--radius-2xl)] border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-400">
            {success}
          </div>
        )}

        <div className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
            <UserPlus size={16} className="text-[var(--accent-color)]" />
            新建账户
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              placeholder="用户名"
              autoComplete="off"
              className={INPUT_CLASS}
            />
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="初始密码（至少 6 位）"
              type="password"
              autoComplete="new-password"
              className={INPUT_CLASS}
            />
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as Role)}
              className={INPUT_CLASS}
            >
              <option value="user">普通用户</option>
              <option value="premium">高级会员</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <button
            onClick={createAccount}
            disabled={busy === 'create'}
            className={PRIMARY_BUTTON_CLASS}
          >
            <UserPlus size={14} />
            {busy === 'create' ? '创建中...' : '创建账户'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
              <Shield size={16} className="text-[var(--accent-color)]" />
              账户列表
            </h3>
            <p className="text-xs text-[var(--text-color-secondary)] mt-1">
              共 {accounts.length} 个账户，支持修改角色、重置密码、封禁和删除。
            </p>
          </div>

          {loading ? (
            <div className="p-4 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm text-[var(--text-color-secondary)]">
              正在加载账户...
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-4 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm text-[var(--text-color-secondary)]">
              暂无账户
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const isCurrent = currentAccountId === account.id;
                const isBusy = busy === account.id;

                return (
                  <div
                    key={account.id}
                    className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--text-color)]">{account.username}</span>
                          <span className="px-2 py-0.5 text-[10px] rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                            {ROLE_LABELS[account.role]}
                          </span>
                          {account.banned && (
                            <span className="px-2 py-0.5 text-[10px] rounded-[var(--radius-full)] bg-red-500/10 text-red-400">
                              已封禁
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-[10px] rounded-[var(--radius-full)] bg-emerald-500/10 text-emerald-400">
                              当前账户
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-color-secondary)] mt-1">
                          创建于 {formatDate(account.createdAt)}
                        </p>
                      </div>

                      <select
                        value={account.role}
                        disabled={isBusy || isCurrent}
                        onChange={(event) =>
                          patchAccount(
                            account,
                            { role: event.target.value },
                            '角色已更新'
                          )
                        }
                        className="px-3 py-1.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-full)] text-xs text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)] disabled:opacity-50"
                      >
                        <option value="user">普通用户</option>
                        <option value="premium">高级会员</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <input
                        value={passwordDrafts[account.id] ?? ''}
                        onChange={(event) =>
                          setPasswordDrafts((current) => ({
                            ...current,
                            [account.id]: event.target.value,
                          }))
                        }
                        placeholder="输入新密码"
                        type="password"
                        autoComplete="new-password"
                        className={`${INPUT_CLASS} flex-1 min-w-[160px]`}
                      />
                      <button
                        onClick={() => resetPassword(account)}
                        disabled={isBusy}
                        className={BUTTON_CLASS + ' bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)]'}
                      >
                        <KeyRound size={14} />
                        重置密码
                      </button>
                      <button
                        onClick={() =>
                          patchAccount(
                            account,
                            { banned: !account.banned },
                            account.banned ? '已解除封禁' : '已封禁账户'
                          )
                        }
                        disabled={isBusy || isCurrent}
                        className={BUTTON_CLASS + ' bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)]'}
                      >
                        <Ban size={14} />
                        {account.banned ? '解除封禁' : '封禁'}
                      </button>
                      {pendingDeleteId === account.id ? (
                        <>
                          <button
                            onClick={() => deleteAccount(account)}
                            disabled={isBusy}
                            className={BUTTON_CLASS + ' bg-red-500/10 border-red-500/30 text-red-400'}
                          >
                            确认删除
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            disabled={isBusy}
                            className={BUTTON_CLASS + ' bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color-secondary)]'}
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setPendingDeleteId(account.id)}
                          disabled={isBusy || isCurrent}
                          className={BUTTON_CLASS + ' bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color-secondary)] hover:text-red-400 hover:border-red-500/30'}
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
