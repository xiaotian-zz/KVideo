'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { getSession } from '@/lib/store/auth-store';
import type { AppReleaseEntry, AppUpdateResponse } from '@/lib/types/app-update';

const DEFAULT_SOURCE = {
  repository: 'xiaotian-zz/KVideo',
  branch: 'main',
  manifestUrl: 'https://raw.githubusercontent.com/xiaotian-zz/KVideo/main/app-release.json',
  changelogUrl: 'https://github.com/xiaotian-zz/KVideo/blob/main/CHANGELOG.md',
  repositoryUrl: 'https://github.com/xiaotian-zz/KVideo',
};

function formatDateLabel(value?: string) {
  if (!value) {
    return '未记录';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function getStatusMeta(data: AppUpdateResponse | null) {
  switch (data?.status) {
    case 'update-available':
      return {
        label: '发现新版本',
        tone: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
        description: `GitHub 最新版本为 ${data.latestVersion}，当前实例仍是 ${data.currentVersion}。`,
      };
    case 'ahead-of-remote':
      return {
        label: '本地版本较新',
        tone: 'text-sky-500 border-sky-500/30 bg-sky-500/10',
        description: `当前实例版本 ${data.currentVersion} 新于 GitHub 检查结果 ${data.latestVersion}。`,
      };
    case 'check-failed':
      return {
        label: '检查失败',
        tone: 'text-red-500 border-red-500/30 bg-red-500/10',
        description: data.error || '远程版本检查失败，当前仅显示本地版本信息。',
      };
    case 'up-to-date':
    default:
      return {
        label: '已是最新版本',
        tone: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
        description: data
          ? `当前实例版本 ${data.currentVersion} 与 GitHub 最新版本一致。`
          : '正在获取最新版本信息。',
      };
  }
}

function ReleaseNotesBlock({
  title,
  release,
  emptyText,
}: {
  title: string;
  release: AppReleaseEntry | null;
  emptyText: string;
}) {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--bg-color)_55%,transparent)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-color)]">{title}</h3>
          {release ? (
            <p className="mt-1 text-xs text-[var(--text-color-secondary)]">
              {release.version} · {release.title} · {release.publishedAt}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--text-color-secondary)]">{emptyText}</p>
          )}
        </div>
      </div>

      {release ? (
        <ul className="mt-4 space-y-2">
          {release.notes.map((note) => (
            <li key={note} className="flex items-start gap-2 text-sm text-[var(--text-color-secondary)]">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-color)]" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AppVersionSettings() {
  const [data, setData] = useState<AppUpdateResponse | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const updatePollRef = useRef<number | null>(null);

  const fetchUpdateInfo = useCallback(async (manual: boolean = false) => {
    if (manual) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch('/api/app-update', {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AppUpdateResponse;
      setData(payload);
      setHasLoaded(true);
    } catch (error) {
      setHasLoaded(true);
      setData((previous) => ({
        currentVersion: previous?.currentVersion || '未知',
        currentRelease: previous?.currentRelease || null,
        latestVersion: previous?.latestVersion || previous?.currentVersion || '未知',
        latestRelease: previous?.latestRelease || previous?.currentRelease || null,
        status: 'check-failed',
        updateAvailable: false,
        checkedAt: new Date().toISOString(),
        checkedRemotely: false,
        usedRemoteManifest: false,
        source: previous?.source || DEFAULT_SOURCE,
        error: error instanceof Error ? error.message : '未知错误',
      }));
    } finally {
      if (manual) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchUpdateInfo(false);
  }, [fetchUpdateInfo]);

  useEffect(() => {
    // 延迟到水合完成后再读取本地会话，避免服务端与客户端渲染不一致
    const timer = setTimeout(() => {
      setIsAdmin(getSession()?.role === 'admin');
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (updatePollRef.current !== null) {
        window.clearInterval(updatePollRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    void fetchUpdateInfo(true);
  };

  const startUpdatePolling = useCallback(() => {
    setUpdateMessage('更新已触发，服务重启后页面会自动刷新…');
    const startedAt = Date.now();

    if (updatePollRef.current !== null) {
      window.clearInterval(updatePollRef.current);
    }

    updatePollRef.current = window.setInterval(async () => {
      if (Date.now() - startedAt > 180000) {
        if (updatePollRef.current !== null) {
          window.clearInterval(updatePollRef.current);
          updatePollRef.current = null;
        }
        setIsUpdating(false);
        setUpdateMessage('更新仍在进行，请稍后手动刷新页面。');
        return;
      }

      try {
        const check = await fetch('/api/app-update', { cache: 'no-store' });
        if (!check.ok) return;

        const latest = (await check.json()) as AppUpdateResponse;
        if (!latest.updateAvailable) {
          if (updatePollRef.current !== null) {
            window.clearInterval(updatePollRef.current);
            updatePollRef.current = null;
          }
          window.location.reload();
        }
      } catch {
        // 服务重启期间请求会失败，继续等待
      }
    }, 5000);
  }, []);

  const handleApplyUpdate = useCallback(async () => {
    if (isUpdating) return;

    if (!window.confirm('确定要立即更新吗？更新期间服务会短暂重启。')) {
      return;
    }

    setIsUpdating(true);
    setUpdateMessage('正在从 Docker 拉取最新镜像…');

    try {
      const response = await fetch('/api/app-update/apply', { method: 'POST' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (response.status === 401 || response.status === 403) {
        setUpdateMessage(payload.error || '需要管理员权限才能更新。');
        setIsUpdating(false);
        return;
      }

      if (response.status === 503) {
        setUpdateMessage('当前部署未启用自动更新（需要 Watchtower）。');
        setIsUpdating(false);
        return;
      }

      // 502 或网络中断也可能是容器正在重启，继续轮询等待新版本上线
      startUpdatePolling();
    } catch {
      startUpdatePolling();
    }
  }, [isUpdating, startUpdatePolling]);

  const statusMeta = getStatusMeta(data);
  const currentRelease = data?.currentRelease ?? null;
  const latestRelease = data?.latestRelease ?? null;
  const shouldShowLatestRelease = Boolean(
    latestRelease && (!currentRelease || latestRelease.version !== currentRelease.version),
  );

  return (
    <SettingsSection
      title="版本与更新"
      description="查看当前版本、最近更新内容，并手动检查 GitHub 上是否已有新版本。"
      headerAction={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[var(--glass-border)] px-4 py-2 text-sm font-medium text-[var(--text-color)] transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--accent-color)_8%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          检查更新
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--accent-color)_7%,transparent)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-color-secondary)]">当前版本</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-color)]">{data?.currentVersion || '加载中...'}</p>
            <p className="mt-2 text-sm text-[var(--text-color-secondary)]">
              {currentRelease ? `${currentRelease.title} · ${currentRelease.publishedAt}` : '正在读取本地版本说明'}
            </p>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--bg-color)_55%,transparent)] p-4">
            <div className={`inline-flex rounded-[var(--radius-full)] border px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
              {statusMeta.label}
            </div>
            <p className="mt-3 text-sm text-[var(--text-color-secondary)]">{statusMeta.description}</p>
            <p className="mt-2 text-xs text-[var(--text-color-secondary)]">
              上次检查：{hasLoaded ? formatDateLabel(data?.checkedAt) : '正在检查'}
            </p>
          </div>
        </div>

        {isAdmin && data?.updateAvailable ? (
          <div className="rounded-[var(--radius-2xl)] border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-color)]">
                  从 Docker 更新到 {data.latestVersion}
                </p>
                <p className="mt-1 text-xs text-[var(--text-color-secondary)]">
                  将拉取 fuxiaotian/kvideo:latest 并自动重启服务，通常需要几十秒。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleApplyUpdate()}
                disabled={isUpdating}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={14} className={isUpdating ? 'animate-bounce' : ''} />
                {isUpdating ? '更新中...' : '立即更新'}
              </button>
            </div>
            {updateMessage ? (
              <p className="mt-3 text-xs text-[var(--text-color-secondary)]">{updateMessage}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-color-secondary)]">
          <span>
            检查来源：{data?.source.repository || 'xiaotian-zz/KVideo'} · {data?.source.branch || 'main'}
          </span>
          <Link
            href={data?.source.changelogUrl || 'https://github.com/xiaotian-zz/KVideo/blob/main/CHANGELOG.md'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[var(--accent-color)] hover:underline"
          >
            查看更新日志
            <ExternalLink size={12} />
          </Link>
          <Link
            href={data?.source.repositoryUrl || 'https://github.com/xiaotian-zz/KVideo'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[var(--accent-color)] hover:underline"
          >
            查看仓库
            <ExternalLink size={12} />
          </Link>
        </div>

        <ReleaseNotesBlock
          title="当前版本更新内容"
          release={currentRelease}
          emptyText="当前版本尚未记录更新内容。"
        />

        {shouldShowLatestRelease ? (
          <ReleaseNotesBlock
            title={`最新可用版本 ${latestRelease?.version}`}
            release={latestRelease}
            emptyText="最新版本尚未提供更新说明。"
          />
        ) : null}
      </div>
    </SettingsSection>
  );
}
