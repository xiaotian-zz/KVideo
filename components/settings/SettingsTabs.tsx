'use client';

import { useState, type ReactNode } from 'react';

export interface SettingsTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * 后台标签卡布局：一次只展示一个设置分区。
 */
export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (tabs.length === 0) return null;

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="设置分类"
        className="flex flex-wrap gap-1.5 p-1.5 bg-[var(--glass-bg)] backdrop-blur-[25px] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active?.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-full)] transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-color)] text-white shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_8%,transparent)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{active?.content}</div>
    </div>
  );
}
