'use client';

interface CategoryPillsProps {
  items: Array<{ id: string; name: string }>;
  activeId: string;
  onChange: (id: string) => void;
  allLabel?: string;
}

/**
 * 分类页通用胶囊标签条。
 */
export function CategoryPills({ items, activeId, onChange, allLabel }: CategoryPillsProps) {
  const allItems = allLabel ? [{ id: '', name: allLabel }, ...items] : items;

  return (
    <div className="flex flex-wrap gap-2 pb-2">
      {allItems.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id || item.name}
            type="button"
            onClick={() => onChange(item.id)}
            className={`shrink-0 px-4 py-1.5 text-sm rounded-full border transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-[var(--accent-color)] text-white border-transparent shadow-[var(--shadow-sm)]'
                : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] border-[var(--glass-border)] hover:text-[var(--text-color)]'
            }`}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
