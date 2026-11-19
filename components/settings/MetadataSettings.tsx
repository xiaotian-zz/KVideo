'use client';

import { useEffect, useState } from 'react';
import { SettingsSection } from './SettingsSection';
import {
  BANGUMI_API_OPTIONS,
  BANGUMI_IMAGE_PROXY_OPTIONS,
  DEFAULT_METADATA_CONFIG,
  DOUBAN_IMAGE_PROXY_OPTIONS,
  DOUBAN_PROXY_OPTIONS,
  normalizeMetadataConfig,
  type MetadataConfig,
} from '@/lib/metadata';

const SELECT_CLASS = 'w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)]';
const INPUT_CLASS = 'w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] placeholder-[var(--text-color-secondary)] focus:outline-none focus:border-[var(--accent-color)]';

export function MetadataSettings() {
  const [config, setConfig] = useState<MetadataConfig>({ ...DEFAULT_METADATA_CONFIG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/global-config')
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        setConfig(normalizeMetadataConfig(result?.data?.metadata));
      })
      .catch(() => {
        if (!cancelled) setError('加载元数据配置失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<MetadataConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
    setSuccess('');
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/global-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: config }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '保存失败');
      }

      setConfig(normalizeMetadataConfig(result.data?.metadata));
      setSuccess('元数据代理配置已保存，所有用户立即生效');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title="元数据代理"
      description="豆瓣与 Bangumi 的数据、图片代理和豆瓣认证 Cookies。配置保存在 Kvrocks，所有用户共用。"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="p-4 text-sm text-[var(--text-color-secondary)]">正在加载配置...</div>
        ) : (
          <>
            {/* 豆瓣数据代理 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-color)]">豆瓣数据代理</label>
              <select
                value={config.doubanProxyType}
                onChange={(event) => update({ doubanProxyType: event.target.value as MetadataConfig['doubanProxyType'] })}
                className={SELECT_CLASS}
              >
                {DOUBAN_PROXY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-color-secondary)]">选择获取豆瓣数据的方式。</p>

              {config.doubanProxyType === 'custom' && (
                <input
                  type="text"
                  value={config.doubanProxy}
                  onChange={(event) => update({ doubanProxy: event.target.value })}
                  placeholder="例如: https://proxy.example.com/fetch?url="
                  className={INPUT_CLASS}
                />
              )}
            </div>

            {/* 豆瓣图片代理 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-color)]">豆瓣图片代理</label>
              <select
                value={config.doubanImageProxyType}
                onChange={(event) => update({ doubanImageProxyType: event.target.value as MetadataConfig['doubanImageProxyType'] })}
                className={SELECT_CLASS}
              >
                {DOUBAN_IMAGE_PROXY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-color-secondary)]">选择豆瓣封面图片的加载方式。</p>

              {config.doubanImageProxyType === 'custom' && (
                <input
                  type="text"
                  value={config.doubanImageProxy}
                  onChange={(event) => update({ doubanImageProxy: event.target.value })}
                  placeholder="例如: https://img-proxy.example.com/?url="
                  className={INPUT_CLASS}
                />
              )}
            </div>

            {/* Bangumi 数据代理 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-color)]">Bangumi 数据代理</label>
              <select
                value={config.bangumiApiType}
                onChange={(event) => update({ bangumiApiType: event.target.value as MetadataConfig['bangumiApiType'] })}
                className={SELECT_CLASS}
              >
                {BANGUMI_API_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-color-secondary)]">服务器无法访问 api.bgm.tv 时可切换反代。</p>

              {config.bangumiApiType === 'custom' && (
                <input
                  type="text"
                  value={config.bangumiApiProxy}
                  onChange={(event) => update({ bangumiApiProxy: event.target.value })}
                  placeholder="例如: https://bgm-proxy.example.com"
                  className={INPUT_CLASS}
                />
              )}
            </div>

            {/* Bangumi 图片代理 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-color)]">Bangumi 图片代理</label>
              <select
                value={config.bangumiImageProxyType}
                onChange={(event) => update({ bangumiImageProxyType: event.target.value as MetadataConfig['bangumiImageProxyType'] })}
                className={SELECT_CLASS}
              >
                {BANGUMI_IMAGE_PROXY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-color-secondary)]">服务器无法访问 lain.bgm.tv 时可切换图片代理。</p>

              {config.bangumiImageProxyType === 'custom' && (
                <input
                  type="text"
                  value={config.bangumiImageProxy}
                  onChange={(event) => update({ bangumiImageProxy: event.target.value })}
                  placeholder="例如: https://img-proxy.example.com/?url="
                  className={INPUT_CLASS}
                />
              )}
            </div>

            {/* 豆瓣 Cookies */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-color)]">豆瓣认证 Cookies（推荐）</label>
              <textarea
                value={config.doubanCookies}
                onChange={(event) => update({ doubanCookies: event.target.value })}
                placeholder='bid=xxx; dbcl2="xxx"; ck=xxx; frodotk_db="xxx"; ...'
                rows={3}
                className={`${INPUT_CLASS} font-mono`}
              />
              <p className="text-xs text-[var(--text-color-secondary)]">
                配置后服务端请求豆瓣时会携带 Cookie，可获取更完整的数据。需包含 dbcl2、frodotk_db、ck 等关键字段。
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

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--accent-color)] text-white rounded-[var(--radius-full)] disabled:opacity-50 cursor-pointer"
            >
              {saving ? '保存中...' : '保存元数据配置'}
            </button>
          </>
        )}
      </div>
    </SettingsSection>
  );
}
