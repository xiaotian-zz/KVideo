'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Lock, Shield, Sparkles, User, UserPlus } from 'lucide-react';

import { setSession, type AuthSession } from '@/lib/store/auth-store';

function RegisterForm() {
  const searchParams = useSearchParams();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [requireInviteCode, setRequireInviteCode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch('/api/auth')
      .then((response) => response.json())
      .then((config) => {
        if (!mounted) return;
        setAllowed(!!config.allowRegister);
        setRequireInviteCode(!!config.requireInviteCode);
      })
      .catch(() => {
        if (mounted) setAllowed(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password || !confirmPassword) {
      setError('请填写完整信息');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (requireInviteCode && !inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          confirmPassword,
          inviteCode: inviteCode || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.session) {
        setError(data.message || data.error || '注册失败，请稍后重试');
        setSubmitting(false);
        return;
      }

      setSuccess('注册成功，正在进入...');
      setSession(data.session as AuthSession, data.persistSession ?? true);

      const redirect = searchParams.get('redirect') || '/';
      window.location.replace(redirect);
    } catch {
      setError('网络错误，请稍后重试');
      setSubmitting(false);
    }
  };

  const inputClassName =
    'w-full pl-11 pr-4 py-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] focus:outline-none focus:border-[var(--accent-color)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-color)_30%,transparent)] transition-all duration-[0.4s] cubic-bezier(0.2,0.8,0.2,1) text-[var(--text-color)] placeholder-[var(--text-color-secondary)]';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-color)] bg-[image:var(--bg-image)] text-[var(--text-color)] overflow-y-auto py-8">
      <div className="w-full max-w-md p-4">
        <div className="bg-[var(--glass-bg)] backdrop-blur-[25px] saturate-[180%] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] p-8 shadow-[var(--shadow-md)] flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] shadow-[var(--shadow-sm)] border border-[var(--glass-border)]">
            <UserPlus size={32} />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">创建账户</h2>
            <p className="text-[var(--text-color-secondary)]">
              {allowed === false ? '当前部署未开放注册' : '注册后即可登录使用'}
            </p>
          </div>

          {allowed === null && (
            <p className="text-sm text-[var(--text-color-secondary)]">正在检查注册状态...</p>
          )}

          {allowed === false && (
            <Link
              href="/"
              className="w-full py-3 px-4 bg-[var(--accent-color)] text-white font-bold rounded-[var(--radius-2xl)] text-center hover:brightness-110 transition-all duration-200"
            >
              返回登录
            </Link>
          )}

          {allowed === true && (
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-color-secondary)]" />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError('');
                  }}
                  placeholder="用户名（3-20 位字母数字下划线）"
                  autoComplete="username"
                  className={inputClassName}
                  autoFocus
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-color-secondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  placeholder="密码（至少 6 位）"
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </div>

              <div className="relative">
                <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-color-secondary)]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError('');
                  }}
                  placeholder="确认密码"
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </div>

              {requireInviteCode && (
                <div className="relative">
                  <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-color-secondary)]" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(event) => {
                      setInviteCode(event.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder="邀请码"
                    autoComplete="off"
                    className={`${inputClassName} uppercase`}
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-[var(--radius-2xl)] bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 rounded-[var(--radius-2xl)] bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                  <CheckCircle size={16} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !!success}
                className="w-full py-3 px-4 bg-[var(--accent-color)] text-white font-bold rounded-[var(--radius-2xl)] hover:translate-y-[-2px] hover:brightness-110 shadow-[var(--shadow-sm)] hover:shadow-[0_4px_8px_var(--shadow-color)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '注册中...' : success ? '注册成功，正在进入...' : '立即注册'}
              </button>

              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-[var(--accent-color)] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] hover:border-[var(--accent-color)]/40 transition-all duration-200"
              >
                <Lock size={16} />
                已有账户？返回登录
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
