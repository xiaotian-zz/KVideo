'use client';

import { useEffect, useState } from 'react';
import { Shield, Users } from 'lucide-react';
import {
  ALL_SOURCE_KINDS,
  normalizeRoleSourceAccess,
  type Role,
  type RoleSourceAccess,
  type SourceKind,
} from '@/lib/auth/permissions';
import { sourceAccessStore } from '@/lib/store/source-access-store';

const ROLE_ORDER: Role[] = ['admin', 'premium', 'user'];

const ROLE_LABELS: Record<Role, string> = {
  admin: '管理员',
  premium: '高级会员',
  user: '普通用户',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: '可使用后台与全部设置',
  premium: '可使用高级内容，但不能进入后台',
  user: '仅可使用普通观看功能',
};

export function UserGroupSettings() {
  const [access, setAccess] = useState<RoleSourceAccess>(() => sourceAccessStore.get());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/global-config', { cache: 'no-store' });
        const result = await response.json();
        if (cancelled) return;

        const remoteAccess = result?.data?.roleSourceAccess;
        if (remoteAccess) {
          sourceAccessStore.set(remoteAccess);
          setAccess(normalizeRoleSourceAccess(remoteAccess));
        } else {
          setAccess(sourceAccessStore.get());
        }
      } catch {
        if (!cancelled) setAccess(sourceAccessStore.get());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (role: Role, kind: SourceKind) => {
    if (loading || saving) return;

    const currentKinds = access[role] ?? [];
    const nextKinds = currentKinds.includes(kind)
      ? currentKinds.filter((item) => item !== kind)
      : [...currentKinds, kind];
    const next = normalizeRoleSourceAccess({ ...access, [role]: nextKinds });

    setAccess(next);
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/global-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleSourceAccess: next }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || '保存用户组权限失败');
      }

      const saved = normalizeRoleSourceAccess(result?.data?.roleSourceAccess ?? next);
      sourceAccessStore.set(saved);
      setAccess(saved);
      setSuccess('用户组权限已保存');
    } catch (saveError) {
      setAccess(sourceAccessStore.get());
      setError(saveError instanceof Error ? saveError.message : '保存用户组权限失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] space-y-3">
      <div>
        <h3 className="text-sm font-medium text-[var(--text-color)] flex items-center gap-2">
          <Users size={16} className="text-[var(--accent-color)]" />
          用户组
        </h3>
        <p className="text-xs text-[var(--text-color-secondary)] mt-1">
          系统只有管理员、高级会员、普通用户三个用户组，可为每个用户组选择可查看的视频源类型。
        </p>
      </div>

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

      <div className="space-y-3">
        {ROLE_ORDER.map((role) => (
          <div
            key={role}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--text-color)_3%,transparent)]"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-color)] flex items-center gap-1.5">
                <Shield size={14} className={role === 'admin' ? 'text-[var(--accent-color)]' : 'text-[var(--text-color-secondary)]'} />
                {ROLE_LABELS[role]}
              </p>
              <p className="text-xs text-[var(--text-color-secondary)] mt-0.5">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {ALL_SOURCE_KINDS.map((kind) => {
                const checked = (access[role] ?? []).includes(kind);
                return (
                  <label
                    key={kind}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-full)] border text-xs cursor-pointer transition-all duration-200 ${
                      checked
                        ? 'border-[var(--accent-color)] text-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                        : 'border-[var(--glass-border)] text-[var(--text-color-secondary)]'
                    } ${loading || saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => void handleToggle(role, kind)}
                      disabled={loading || saving}
                      className="accent-[var(--accent-color)]"
                    />
                    {kind === 'normal' ? '普通源' : '18+ 源'}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text-color-secondary)]">
        管理员始终可以进入后台；这里的设置只影响用户组可查看和播放的视频源类型。
      </p>
    </div>
  );
}
