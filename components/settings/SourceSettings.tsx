import { useRef, useState } from 'react';
import { SourceManager } from '@/components/settings/SourceManager';
import type { VideoSource } from '@/lib/types';
import { DEFAULT_SOURCES } from '@/lib/api/default-sources';
import { createUniqueSourceId } from '@/lib/utils/source-id';

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
    const [sourceImportMessage, setSourceImportMessage] = useState('');
    const sourceFileInputRef = useRef<HTMLInputElement>(null);

    const isPremiumSource = (id: string) => premiumSources.some(s => s.id === id);

    // 普通源与 18+ 源合并展示，按统一优先级排序
    const allSources = [...sources, ...premiumSources]
        .map((source, index) => ({ source, index }))
        .sort((left, right) => {
            const leftPriority = left.source.priority ?? Number.MAX_SAFE_INTEGER;
            const rightPriority = right.source.priority ?? Number.MAX_SAFE_INTEGER;
            return leftPriority - rightPriority || left.index - right.index;
        })
        .map(({ source }) => source);

    const filteredSources = allSources.filter(source =>
        source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.baseUrl.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const displayedSources = showAllSources || searchQuery
        ? filteredSources
        : filteredSources.slice(0, 10);

    const handleToggle = (id: string) => {
        if (isPremiumSource(id)) {
            onPremiumSourcesChange(
                premiumSources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
            );
            return;
        }
        onSourcesChange(
            sources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
        );
    };

    const handleDelete = (id: string) => {
        if (isPremiumSource(id)) {
            onPremiumSourcesChange(premiumSources.filter(s => s.id !== id));
            return;
        }
        onSourcesChange(sources.filter(s => s.id !== id));
    };

    const handleReorder = (dragId: string, targetId: string) => {
        if (dragId === targetId) return;

        const from = allSources.findIndex(s => s.id === dragId);
        const to = allSources.findIndex(s => s.id === targetId);
        if (from === -1 || to === -1) return;

        // 合并列表中重排，再按原本归属拆回普通源/18+ 源
        const updated = allSources.map(s => ({ ...s }));
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);

        // Update priorities
        updated.forEach((s, idx) => s.priority = idx + 1);
        onSourcesChange(updated.filter(s => !isPremiumSource(s.id)));
        onPremiumSourcesChange(updated.filter(s => isPremiumSource(s.id)));
    };

    const normalizeSourceUrl = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();

    // 只导出源的名称和地址
    const handleExportSources = () => {
        const payload = allSources.map(source => ({
            name: source.name,
            url: source.baseUrl,
        }));
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kvideo-sources-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSourceImportMessage(`已导出 ${payload.length} 个源`);
    };

    const handleImportSources = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const parsed = JSON.parse(await file.text());
            const list = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.sources)
                    ? parsed.sources
                    : null;
            if (!list) throw new Error('invalid');

            const nameIndex = new Map<string, VideoSource>();
            const urlIndex = new Map<string, VideoSource>();
            const existingIds = new Set(allSources.map(source => source.id));
            allSources.forEach(source => {
                nameIndex.set(source.name.trim().toLowerCase(), source);
                urlIndex.set(normalizeSourceUrl(source.baseUrl), source);
            });

            let nextPriority = sources.reduce((max, source) => Math.max(max, source.priority ?? 0), 0) + 1;
            const added: VideoSource[] = [];
            const overrides = new Map<string, VideoSource>();
            let overwritten = 0;
            let skipped = 0;

            for (const item of list) {
                // 导入文件只需要 name 和 url，ID 和源类型由系统自动生成
                const name = typeof item?.name === 'string' ? item.name.trim() : '';
                const sourceUrl = typeof item?.url === 'string' ? item.url.trim() : '';

                if (!name || !/^https?:\/\//i.test(sourceUrl)) {
                    skipped += 1;
                    continue;
                }

                const nameKey = name.toLowerCase();
                const urlKey = normalizeSourceUrl(sourceUrl);
                const existingByName = nameIndex.get(nameKey);

                if (existingByName) {
                    // 名称和地址都一样：跳过
                    if (normalizeSourceUrl(existingByName.baseUrl) === urlKey) {
                        skipped += 1;
                        continue;
                    }

                    // 名称一样但地址不同：覆盖原有源的地址
                    const updated = { ...existingByName, baseUrl: sourceUrl };
                    overrides.set(existingByName.id, updated);
                    nameIndex.set(nameKey, updated);
                    urlIndex.set(urlKey, updated);
                    overwritten += 1;
                    continue;
                }

                if (urlIndex.has(urlKey)) {
                    skipped += 1;
                    continue;
                }

                const created: VideoSource = {
                    id: createUniqueSourceId(name, existingIds),
                    name,
                    baseUrl: sourceUrl,
                    searchPath: '',
                    detailPath: '',
                    enabled: true,
                    priority: nextPriority++,
                    group: 'normal',
                };
                added.push(created);
                nameIndex.set(nameKey, created);
                urlIndex.set(urlKey, created);
            }

            const nextSources = sources.map(source => overrides.get(source.id) ?? source);
            const nextPremiumSources = premiumSources.map(source => overrides.get(source.id) ?? source);
            if (added.length > 0) {
                nextSources.push(...added);
            }

            const normalChanged = added.length > 0 || sources.some(source => overrides.has(source.id));
            const premiumChanged = premiumSources.some(source => overrides.has(source.id));
            if (normalChanged) onSourcesChange(nextSources);
            if (premiumChanged) onPremiumSourcesChange(nextPremiumSources);

            setSourceImportMessage(`导入完成：新增 ${added.length} 个，覆盖 ${overwritten} 个，跳过 ${skipped} 个`);
        } catch {
            setSourceImportMessage('导入失败：JSON 每项只需要 name 和 url');
        }
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
                        onClick={handleExportSources}
                        className="px-4 py-2 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                    >
                        导出源
                    </button>
                    <button
                        onClick={() => sourceFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                    >
                        导入源
                    </button>
                    <input
                        ref={sourceFileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportSources}
                        className="hidden"
                    />
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

            {sourceImportMessage && (
                <div className={`mb-4 text-xs rounded-[var(--radius-2xl)] px-3 py-2 border ${sourceImportMessage.startsWith('导入失败')
                    ? 'text-red-500 bg-red-500/10 border-red-500/20'
                    : 'text-[var(--text-color-secondary)] bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] border-[var(--glass-border)]'
                    }`}>
                    {sourceImportMessage}
                </div>
            )}

            <SourceManager
                sources={displayedSources}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onReorder={handleReorder}
                onEdit={onEditSource}
                defaultIds={DEFAULT_SOURCES.map(s => s.id)}
            />
            {!searchQuery && allSources.length > 10 && (
                <button
                    onClick={() => setShowAllSources(!showAllSources)}
                    className="w-full mt-4 px-4 py-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-sm font-medium hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                >
                    {showAllSources ? '收起' : `显示全部 (${allSources.length})`}
                </button>
            )}
        </div>
    );
}
