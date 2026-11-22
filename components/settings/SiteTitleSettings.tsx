'use client';

import { useEffect, useState } from 'react';
import { notifyGlobalConfigUpdated } from '@/lib/utils/global-config-client';
import { siteSettingsStore } from '@/lib/store/site-settings-store';

export function SiteTitleSettings() {
  const [title, setTitle] = useState('');
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
        if (!cancelled && typeof result?.data?.siteTitle === 'string') {
          setTitle(result.data.siteTitle);
        }
      } catch {
        // 读取失败时保持空值，仍可保存
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/global-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteTitle: title.trim() }),
      });

      if (!response.ok) {
        throw new Error('save failed');
      }

      siteSettingsStore.setTitle(title.trim());
      notifyGlobalConfigUpdated();
      setMessage('已保存');
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
      <h2 className="text-xl font-semibold text-[var(--text-color)] mb-2">网站标题</h2>
      <p className="text-sm text-[var(--text-color-secondary)] mb-4">
        显示在首页左上角，留空则使用默认名称。
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="KVideo"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] placeholder-[var(--text-color-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all duration-200 disabled:opacity-50"
        />
        <button
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="px-5 py-2.5 rounded-[var(--radius-2xl)] bg-[var(--accent-color)] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message === '已保存' ? 'text-green-500' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
