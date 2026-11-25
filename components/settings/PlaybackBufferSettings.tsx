'use client';

import { useEffect, useState } from 'react';
import {
    DEFAULT_PLAYBACK_BUFFER_MODE,
    PLAYBACK_BUFFER_OPTIONS,
    normalizePlaybackBufferMode,
    setPlaybackBufferMode,
    type PlaybackBufferMode,
} from '@/lib/player/buffer-modes';
import { notifyGlobalConfigUpdated } from '@/lib/utils/global-config-client';
import { getSession } from '@/lib/store/auth-store';

/**
 * 播放缓冲模式：管理员统一设置，所有用户共用。
 */
export function PlaybackBufferSettings() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [mode, setMode] = useState<PlaybackBufferMode>(DEFAULT_PLAYBACK_BUFFER_MODE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // 延迟到水合完成后再读取本地会话，避免服务端与客户端渲染不一致
        const timer = setTimeout(() => {
            setIsAdmin(getSession()?.role === 'admin');
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;

        void (async () => {
            try {
                const response = await fetch('/api/global-config');
                if (!response.ok) return;
                const result = await response.json();
                if (!cancelled) {
                    setMode(normalizePlaybackBufferMode(result?.data?.playbackBufferMode));
                }
            } catch {
                // 读取失败时使用默认模式，仍可保存
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    if (!isAdmin) return null;

    const handleSave = async (nextMode: PlaybackBufferMode) => {
        if (nextMode === mode && !message) {
            return;
        }

        setMode(nextMode);
        setSaving(true);
        setMessage('');

        try {
            const response = await fetch('/api/global-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playbackBufferMode: nextMode }),
            });

            if (!response.ok) {
                throw new Error('save failed');
            }

            setPlaybackBufferMode(nextMode);
            notifyGlobalConfigUpdated();
            setMessage('已保存，下一次播放生效');
        } catch {
            setMessage('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
            <h2 className="text-xl font-semibold text-[var(--text-color)] mb-2">播放缓冲优化</h2>
            <p className="text-sm text-[var(--text-color-secondary)] mb-4">
                根据网络环境选择合适的缓冲模式，减少播放卡顿。全局设置，对所有用户生效。
            </p>

            <div className="grid grid-cols-1 gap-3">
                {PLAYBACK_BUFFER_OPTIONS.map((option) => {
                    const selected = mode === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => void handleSave(option.id)}
                            disabled={loading || saving}
                            className={`w-full text-left rounded-[var(--radius-2xl)] border p-4 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                                selected
                                    ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                    : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[color-mix(in_srgb,var(--text-color)_5%,transparent)]'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg" aria-hidden="true">{option.icon}</span>
                                <span className={`font-semibold ${selected ? 'text-[var(--accent-color)]' : 'text-[var(--text-color)]'}`}>
                                    {option.label}
                                </span>
                                {selected && (
                                    <span className="ml-auto text-xs font-medium text-[var(--accent-color)]">
                                        当前
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-color-secondary)]">
                                {option.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {message && (
                <p className={`mt-3 text-sm ${message.startsWith('已保存') ? 'text-green-500' : 'text-red-500'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}
