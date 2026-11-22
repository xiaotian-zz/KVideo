'use client';

import { useState } from 'react';
import { Icons } from '@/components/ui/Icon';
import { parseSourcesFromJson, type ImportResult } from '@/lib/utils/source-import-utils';

interface JsonImportTabProps {
  onImport: (result: ImportResult) => Promise<boolean> | boolean;
}

export function JsonImportTab({ onImport }: JsonImportTabProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [imported, setImported] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    setError('');
    setPreview(null);
    setImported(false);
    if (!jsonText.trim()) {
      setError('请粘贴 JSON 内容');
      return;
    }

    try {
      const result = parseSourcesFromJson(jsonText);
      if (result.totalCount === 0) {
        setError('没有有效的视频源，每项需要 name 和 url');
        return;
      }
      setPreview(result);
    } catch (e) {
      setError('JSON 解析失败：' + (e instanceof Error ? e.message : '格式错误'));
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError('');
    try {
      const success = await onImport(preview);
      if (success) {
        setImported(true);
        setPreview(null);
        setJsonText('');
      } else {
        setError('导入处理失败');
      }
    } catch {
      setError('导入过程发生错误');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-color-secondary)]">
        粘贴 JSON 数组格式的视频源配置，每项只需要名称和地址。格式：
        <code className="block mt-1 px-2 py-1 bg-black/10 rounded text-[10px]">
          {'[{ "name": "...", "url": "..." }]'}
        </code>
      </p>

      <textarea
        value={jsonText}
        onChange={(e) => { setJsonText(e.target.value); setError(''); setPreview(null); setImported(false); }}
        placeholder='[{ "name": "源名称", "url": "https://..." }]'
        rows={6}
        className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] text-sm text-[var(--text-color)] placeholder:text-[var(--text-color-secondary)]/50 focus:outline-none focus:border-[var(--accent-color)] font-mono resize-none"
      />

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {!preview && !imported && (
        <button
          onClick={handleParse}
          className="w-full px-4 py-2.5 bg-[var(--accent-color)] text-white rounded-[var(--radius-2xl)] text-sm font-medium hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Icons.Search size={14} />
          解析预览
        </button>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="p-3 bg-[color-mix(in_srgb,var(--accent-color)_5%,transparent)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
            <div className="flex items-center gap-4 text-sm text-[var(--text-color)]">
              <span>
                普通源 <span className="font-bold text-[var(--accent-color)]">{preview.normalSources.length}</span>
              </span>
              <span>
                成人源 <span className="font-bold text-[var(--accent-color)]">{preview.premiumSources.length}</span>
              </span>
            </div>
            <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
              {[...preview.normalSources, ...preview.premiumSources].map((source, index) => (
                <div key={`${source.id}-${index}`} className="text-xs text-[var(--text-color-secondary)] flex gap-2 flex-wrap">
                  {source.group === 'premium' && <span>🔞</span>}
                  <span className="font-medium text-[var(--text-color)]">{source.name}</span>
                  <span className="truncate">{source.baseUrl}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setPreview(null); }}
              disabled={importing}
              className="flex-1 px-4 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] rounded-[var(--radius-2xl)] text-sm hover:bg-[var(--glass-hover)] transition-all cursor-pointer disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 px-4 py-2 bg-[var(--accent-color)] text-white rounded-[var(--radius-2xl)] text-sm font-medium hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-60"
            >
              <Icons.Download size={14} />
              {importing ? '导入中...' : '导入'}
            </button>
          </div>
        </div>
      )}

      {imported && (
        <p className="text-xs text-green-500 text-center py-2">导入成功！</p>
      )}
    </div>
  );
}
