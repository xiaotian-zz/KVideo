/**
 * 播放缓冲模式：全局由管理员在后台控制，所有用户共用。
 * 取值与 LunaTV 的三档缓冲策略保持一致。
 */

export type PlaybackBufferMode = 'standard' | 'enhanced' | 'max';

export const DEFAULT_PLAYBACK_BUFFER_MODE: PlaybackBufferMode = 'standard';

export const PLAYBACK_BUFFER_STORAGE_KEY = 'kvideo_playback_buffer_mode';

export interface BufferModeOption {
    id: PlaybackBufferMode;
    label: string;
    icon: string;
    description: string;
}

export const PLAYBACK_BUFFER_OPTIONS: BufferModeOption[] = [
    {
        id: 'standard',
        label: '默认模式',
        icon: '🎯',
        description: '45 秒缓冲 + 2 路预取，适合网络稳定的环境',
    },
    {
        id: 'enhanced',
        label: '增强模式',
        icon: '⚡',
        description: '90 秒缓冲 + 3 路预取，适合偶尔卡顿的网络环境',
    },
    {
        id: 'max',
        label: '强力模式',
        icon: '🚀',
        description: '135 秒缓冲 + 4 路预取，起播稍慢但播放更流畅',
    },
];

export interface PlaybackBufferConfig {
    maxBufferLength: number;
    backBufferLength: number;
    maxBufferSize: number;
    prefetchConcurrency: number;
}

const BUFFER_CONFIGS: Record<PlaybackBufferMode, PlaybackBufferConfig> = {
    standard: {
        maxBufferLength: 45,
        backBufferLength: 30,
        maxBufferSize: 45 * 1000 * 1000,
        prefetchConcurrency: 2,
    },
    enhanced: {
        maxBufferLength: 90,
        backBufferLength: 60,
        maxBufferSize: 90 * 1000 * 1000,
        prefetchConcurrency: 3,
    },
    max: {
        maxBufferLength: 135,
        backBufferLength: 90,
        maxBufferSize: 135 * 1000 * 1000,
        prefetchConcurrency: 4,
    },
};

export function normalizePlaybackBufferMode(value: unknown): PlaybackBufferMode {
    if (value === 'enhanced' || value === 'max' || value === 'standard') {
        return value;
    }
    return DEFAULT_PLAYBACK_BUFFER_MODE;
}

export function getPlaybackBufferConfig(mode: PlaybackBufferMode): PlaybackBufferConfig {
    return BUFFER_CONFIGS[normalizePlaybackBufferMode(mode)];
}

export function getPlaybackBufferMode(): PlaybackBufferMode {
    if (typeof window === 'undefined') {
        return DEFAULT_PLAYBACK_BUFFER_MODE;
    }
    try {
        return normalizePlaybackBufferMode(window.localStorage.getItem(PLAYBACK_BUFFER_STORAGE_KEY));
    } catch {
        return DEFAULT_PLAYBACK_BUFFER_MODE;
    }
}

export function setPlaybackBufferMode(mode: PlaybackBufferMode): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(PLAYBACK_BUFFER_STORAGE_KEY, normalizePlaybackBufferMode(mode));
    } catch {
        // 本地存储不可用时仅本次会话生效
    }
}
