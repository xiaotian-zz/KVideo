'use client';

import { useEffect, useState } from 'react';
import type { IPTVSource } from '@/lib/store/iptv-store';
import { useIPTVStore } from '@/lib/store/iptv-store';
import { notifyGlobalConfigUpdated } from '@/lib/utils/global-config-client';

export function IPTVSourceSettings() {
  const [sources, setSources] = useState<IPTVSource[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch('/api/global-config');
        if (!response.ok) return;
        const result = await response.json();
        const list = result?.data?.iptvSources;
        if (!cancelled && Array.isArray(list)) {
          setSources(list);
        }
      } catch {
        // 读取失败时保持空列表
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (next: IPTVSource[]) => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/global-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iptvSources: next }),
      });

      if (!response.ok) {
        throw new Error('save failed');
      }

      setSources(next);
      // 当前标签页立即使用新源，并清空旧频道缓存
      useIPTVStore.setState({
        sources: next,
        cachedChannels: [],
        cachedGroups: [],
        cachedChannelsBySource: {},
        lastRefreshed: 0,
      });
      notifyGlobalConfigUpdated();
      setMessage('已保存');
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setUrl('');
    setEditingId(null);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;

    if (editingId) {
      void persist(
        sources.map((source) =>
          source.id === editingId
            ? { ...source, name: trimmedName, url: trimmedUrl }
            : source
        )
      );
    } else {
      void persist([
        ...sources,
        {
          id: `iptv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: trimmedName,
          url: trimmedUrl,
          addedAt: Date.now(),
          kind: 'custom',
        },
      ]);
    }

    resetForm();
  };

  const handleEdit = (source: IPTVSource) => {
    setEditingId(source.id);
    setName(source.name);
    setUrl(source.url);
  };

  const handleDelete = (id: string) => {
    void persist(sources.filter((source) => source.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
      <h2 className="text-xl font-semibold text-[var(--text-color)] mb-2">直播源</h2>
      <p className="text-sm text-[var(--text-color-secondary)] mb-6">
        所有用户共用这里的直播源，修改后立即生效。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-3 mb-6">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="名称，例如 央视"
          disabled={loading || saving}
          className="px-4 py-2.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] placeholder-[var(--text-color-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all duration-200 disabled:opacity-50"
        />
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="M3U / TXT 播放列表地址"
          disabled={loading || saving}
          className="px-4 py-2.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] placeholder-[var(--text-color-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all duration-200 disabled:opacity-50"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading || saving || !name.trim() || !url.trim()}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-[var(--radius-2xl)] bg-[var(--accent-color)] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            {editingId ? '保存修改' : '+ 添加源'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-4 py-2.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
            >
              取消
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-color-secondary)]">加载中...</p>
      ) : sources.length === 0 ? (
        <div className="text-center py-10 bg-[var(--glass-bg)] border border-dashed border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
          <p className="text-sm text-[var(--text-color-secondary)]">还没有直播源，请在上方添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[var(--text-color)] truncate">{source.name}</div>
                <div className="text-sm text-[var(--text-color-secondary)] truncate">{source.url}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(source)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] disabled:opacity-50 transition-all duration-200 cursor-pointer"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(source.id)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-all duration-200 cursor-pointer"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message === '已保存' ? 'text-green-500' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
