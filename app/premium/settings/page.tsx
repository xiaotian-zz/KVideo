'use client';

import { AddSourceModal } from '@/components/settings/AddSourceModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PremiumSourceSettings } from '@/components/settings/PremiumSourceSettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { PlayerSettings } from '@/components/settings/PlayerSettings';
import { AppVersionSettings } from '@/components/settings/AppVersionSettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { MetadataSettings } from '@/components/settings/MetadataSettings';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { usePremiumSettingsPage } from './hooks/usePremiumSettingsPage';
import Link from 'next/link';

export default function PremiumSettingsPage() {
    const {
        premiumSources,
        isAddModalOpen,
        isRestoreDefaultsDialogOpen,
        setIsAddModalOpen,
        setIsRestoreDefaultsDialogOpen,
        handleSourcesChange,
        handleAddSource,
        handleRestoreDefaults,
        editingSource,
        handleEditSource,
        setEditingSource,
        // Display settings
        realtimeLatency,
        searchDisplayMode,
        fullscreenType,
        proxyMode,
        seekStepSeconds,
        rememberScrollPosition,
        handleRealtimeLatencyChange,
        handleSearchDisplayModeChange,
        handleFullscreenTypeChange,
        handleProxyModeChange,
        handleSeekStepSecondsChange,
        handleRememberScrollPositionChange,
        locale,
        handleLocaleChange,
        // Danmaku settings
        danmakuApiUrl,
        handleDanmakuApiUrlChange,
        danmakuOpacity,
        handleDanmakuOpacityChange,
        danmakuFontSize,
        handleDanmakuFontSizeChange,
        danmakuDisplayArea,
        handleDanmakuDisplayAreaChange,
        blockedCategories,
        handleBlockedCategoriesChange,
    } = usePremiumSettingsPage();

    return (
        <div className="min-h-screen bg-black">
            <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
                {/* Custom Header for Premium Settings */}
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/premium"
                                className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                                aria-label="返回"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--text-color)]">高级模式设置</h1>
                                <p className="text-sm text-[var(--text-color-secondary)]">管理高级模式的内容源和偏好设置</p>
                            </div>
                        </div>
                    </div>
                </div>

                <SettingsTabs
                    tabs={[
                        {
                            id: 'account',
                            label: '账户',
                            content: <AccountSettings />,
                        },
                        {
                            id: 'sources',
                            label: '高级源',
                            content: (
                                <div className="space-y-4">
                                    <p className="text-xs text-[var(--text-color-secondary)] px-1">
                                        高级源由管理员统一维护，所有用户共用；保存后会写入 Kvrocks 并同步给全部用户。
                                    </p>
                                    <PremiumSourceSettings
                                        sources={premiumSources}
                                        onSourcesChange={handleSourcesChange}
                                        onRestoreDefaults={() => setIsRestoreDefaultsDialogOpen(true)}
                                        onAddSource={() => {
                                            setEditingSource(null);
                                            setIsAddModalOpen(true);
                                        }}
                                        onEditSource={handleEditSource}
                                    />
                                </div>
                            ),
                        },
                        {
                            id: 'metadata',
                            label: '元数据',
                            content: <MetadataSettings />,
                        },
                        {
                            id: 'player',
                            label: '播放器',
                            content: (
                                <PlayerSettings
                                    fullscreenType={fullscreenType}
                                    onFullscreenTypeChange={handleFullscreenTypeChange}
                                    proxyMode={proxyMode}
                                    onProxyModeChange={handleProxyModeChange}
                                    seekStepSeconds={seekStepSeconds}
                                    onSeekStepSecondsChange={handleSeekStepSecondsChange}
                                    danmakuApiUrl={danmakuApiUrl}
                                    onDanmakuApiUrlChange={handleDanmakuApiUrlChange}
                                    danmakuOpacity={danmakuOpacity}
                                    onDanmakuOpacityChange={handleDanmakuOpacityChange}
                                    danmakuFontSize={danmakuFontSize}
                                    onDanmakuFontSizeChange={handleDanmakuFontSizeChange}
                                    danmakuDisplayArea={danmakuDisplayArea}
                                    onDanmakuDisplayAreaChange={handleDanmakuDisplayAreaChange}
                                />
                            ),
                        },
                        {
                            id: 'display',
                            label: '显示',
                            content: (
                                <DisplaySettings
                                    realtimeLatency={realtimeLatency}
                                    searchDisplayMode={searchDisplayMode}
                                    rememberScrollPosition={rememberScrollPosition}
                                    onRealtimeLatencyChange={handleRealtimeLatencyChange}
                                    onSearchDisplayModeChange={handleSearchDisplayModeChange}
                                    onRememberScrollPositionChange={handleRememberScrollPositionChange}
                                    locale={locale}
                                    onLocaleChange={handleLocaleChange}
                                    blockedCategories={blockedCategories}
                                    onBlockedCategoriesChange={handleBlockedCategoriesChange}
                                />
                            ),
                        },
                        {
                            id: 'about',
                            label: '关于',
                            content: <AppVersionSettings />,
                        },
                    ]}
                />
            </div>

            {/* Modals */}
            <AddSourceModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingSource(null);
                }}
                onAdd={handleAddSource}
                existingIds={premiumSources.map(s => s.id)}
                initialValues={editingSource}
            />

            <ConfirmDialog
                isOpen={isRestoreDefaultsDialogOpen}
                title="恢复默认高级源"
                message="这将重置所有高级源为默认配置。自定义源将被删除。是否继续？"
                confirmText="恢复"
                cancelText="取消"
                onConfirm={handleRestoreDefaults}
                onCancel={() => setIsRestoreDefaultsDialogOpen(false)}
            />
        </div>
    );
}
