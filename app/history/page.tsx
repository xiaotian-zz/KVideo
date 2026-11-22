'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { HistoryList } from '@/components/history/HistoryList';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icons } from '@/components/ui/Icon';
import { useHistory } from '@/lib/store/history-store';

interface DeleteConfirmState {
  isOpen: boolean;
  showIdentifier?: string;
  isClearAll?: boolean;
}

export default function HistoryPage() {
  const router = useRouter();
  const { viewingHistory, removeFromHistory, clearHistory } = useHistory();
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ isOpen: false });

  const confirmDelete = () => {
    if (deleteConfirm.isClearAll) {
      clearHistory();
    } else if (deleteConfirm.showIdentifier) {
      removeFromHistory(deleteConfirm.showIdentifier);
    }
    setDeleteConfirm({ isOpen: false });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] bg-[image:var(--bg-image)] bg-fixed">
      <Navbar onReset={() => router.push('/')} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6">
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <Icons.History size={24} className="text-[var(--accent-color)]" />
              <h1 className="text-xl font-semibold text-[var(--text-color)]">观看历史</h1>
            </div>
            {viewingHistory.length > 0 && (
              <button
                onClick={() => setDeleteConfirm({ isOpen: true, isClearAll: true })}
                className="px-4 py-2 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer flex items-center gap-2"
              >
                <Icons.Trash size={16} />
                清空历史
              </button>
            )}
          </div>

          <div className="min-h-[50vh] max-h-[70vh] flex flex-col">
            <HistoryList
              history={viewingHistory}
              onRemove={(showIdentifier) => setDeleteConfirm({ isOpen: true, showIdentifier })}
            />
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.isClearAll ? '清空历史记录' : '删除历史记录'}
        message={
          deleteConfirm.isClearAll
            ? '确定要清空所有观看历史吗？此操作无法撤销。'
            : '确定要删除这条历史记录吗？'
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false })}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
