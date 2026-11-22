'use client';

import { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => Promise<void> | void;
}

const EXPORT_ITEMS = [
  { title: '账户与用户组', desc: '所有账户、角色和用户组源访问权限' },
  { title: '全站配置', desc: '视频源、18+ 源、直播源、网站标题、元数据代理和豆瓣配置' },
  { title: '用户数据', desc: '所有用户的设置、收藏、观看历史和搜索历史' },
];

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // 打开时在渲染阶段重置状态
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setExporting(false);
      setError('');
    }
  }

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await onExport();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/30 backdrop-blur-md transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 z-[9999] w-[90%] max-w-md -translate-x-1/2 transition-all duration-300 ${isOpen
            ? 'opacity-100 -translate-y-1/2 scale-100'
            : 'opacity-0 -translate-y-[40%] scale-95 pointer-events-none'
          }`}
      >
        <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[var(--text-color)]">
              导出全部数据
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200"
              aria-label="关闭"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 mb-5">
            <p className="text-[var(--text-color-secondary)] text-sm">
              将导出服务器上的全部数据：
            </p>

            {EXPORT_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-[var(--radius-2xl)] bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] border border-[var(--glass-border)] p-3"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--accent-color)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-sm font-medium text-[var(--text-color)]">{item.title}</span>
                </div>
                <p className="text-xs text-[var(--text-color-secondary)] mt-1 pl-6">
                  {item.desc}
                </p>
              </div>
            ))}

            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius-2xl)] p-3">
              备份文件包含账户密码哈希等敏感信息，请妥善保管，不要公开分享。
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-2xl)] p-3">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={onClose}
              disabled={exporting}
              className="flex-1 px-6 py-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] font-semibold hover:bg-[color-mix(in_srgb,var(--text-color)_10%,transparent)] disabled:opacity-50 transition-all duration-200"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 px-6 py-3 rounded-[var(--radius-2xl)] bg-[var(--accent-color)] text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 shadow-[var(--shadow-sm)] disabled:opacity-60 disabled:hover:translate-y-0 transition-all duration-200"
            >
              {exporting ? '导出中...' : '导出全部数据'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
