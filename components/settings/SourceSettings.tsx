import { useState } from 'react';
import { SourceManager } from '@/components/settings/SourceManager';
import type { VideoSource } from '@/lib/types';
import { DEFAULT_SOURCES } from '@/lib/api/default-sources';

interface SourceSettingsProps {
    sources: VideoSource[];
    premiumSources: VideoSource[];
    onSourcesChange: (sources: VideoSource[]) => void;
    onPremiumSourcesChange: (sources: VideoSource[]) => void;
    onRestoreDefaults: () => void;
    onAddSource: () => void;
    onEditSource?: (source: VideoSource) => void;
}

export function SourceSettings({
    sources,
    premiumSources,
    onSourcesChange,
    onPremiumSourcesChange,
    onRestoreDefaults,
    onAddSource,
    onEditSource,
}: SourceSettingsProps) {
    const [showAllSources, setShowAllSources] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSources = sources.filter(source =>
        source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const displayedSources = showAllSources || searchQuery
        ? filteredSources
        : filteredSources.slice(0, 10);

    const handleToggle = (id: string) => {
        const updated = sources.map(s =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
        );
        onSourcesChange(updated);
    };

    const handleDelete = (id: string) => {
        const updated = sources.filter(s => s.id !== id);
        onSourcesChange(updated);
    };

    const handleReorder = (id: string, direction: 'up' | 'down') => {
        const currentIndex = sources.findIndex(s => s.id === id);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= sources.length) return;

        const updated = [...sources];
        [updated[currentIndex], updated[newIndex]] = [updated[newIndex], updated[currentIndex]];

        // Update priorities
        updated.forEach((s, idx) => s.priority = idx + 1);
        onSourcesChange(updated);
    };

    const filteredPremiumSources = premiumSources.filter(source =>
        source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePremiumToggle = (id: string) => {
        onPremiumSourcesChange(
            premiumSources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
        );
    };

    const handlePremiumDelete = (id: string) => {
        onPremiumSourcesChange(premiumSources.filter(s => s.id !== id));
    };

    const handlePremiumReorder = (id: string, direction: 'up' | 'down') => {
        const currentIndex = premiumSources.findIndex(s => s.id === id);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= premiumSources.length) return;

        const updated = [...premiumSources];
        [updated[currentIndex], updated[newIndex]] = [updated[newIndex], updated[currentIndex]];
        updated.forEach((s, idx) => s.priority = idx + 1);
        onPremiumSourcesChange(updated);
    };

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-color)]">视频源管理</h2>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={onRestoreDefaults}
                        className="px-4 py-2 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                    >
                        恢复默认
                    </button>
                    <button
                        onClick={onAddSource}
                        className="px-4 py-2 rounded-[var(--radius-2xl)] bg-[var(--accent-color)] text-white text-sm font-semibold hover:brightness-110 hover:-translate-y-0.5 shadow-[var(--shadow-sm)] transition-all duration-200 cursor-pointer"
                    >
                        + 添加源
                    </button>
                </div>
            </div>
            <p className="text-sm text-[var(--text-color-secondary)] mb-6">
                管理视频来源，调整优先级和启用状态
            </p>

            {/* Search Bar */}
            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder="搜索源..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] placeholder-[var(--text-color-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all duration-200"
                />
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-color-secondary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <SourceManager
                sources={displayedSources}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onReorder={handleReorder}
                onEdit={onEditSource}
                defaultIds={DEFAULT_SOURCES.map(s => s.id)}
            />
            {!searchQuery && sources.length > 10 && (
                <button
                    onClick={() => setShowAllSources(!showAllSources)}
                    className="w-full mt-4 px-4 py-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                >
                    {showAllSources ? '收起' : `显示全部 (${sources.length})`}
                </button>
            )}

            <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-base font-semibold text-[var(--text-color)]">18+ 源</h3>
                    <span className="px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        18+
                    </span>
                </div>
                <p className="text-sm text-[var(--text-color-secondary)] mb-4">
                    共 {premiumSources.length} 个，与普通源一起在本页管理
                </p>

                {filteredPremiumSources.length === 0 ? (
                    <div className="px-4 py-6 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--text-color-secondary)] text-center">
                        {searchQuery ? '没有匹配的 18+ 源' : '暂无 18+ 源，可在添加源时选择「18+ 源」'}
                    </div>
                ) : (
                    <SourceManager
                        sources={filteredPremiumSources}
                        onToggle={handlePremiumToggle}
                        onDelete={handlePremiumDelete}
                        onReorder={handlePremiumReorder}
                        onEdit={onEditSource}
                        defaultIds={[]}
                        premium
                    />
                )}
            </div>
        </div>
    );
}
