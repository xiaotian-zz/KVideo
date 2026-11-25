import { getRedisClient } from '@/lib/server/redis';
import {
  DEFAULT_METADATA_CONFIG,
  normalizeMetadataConfig,
  type MetadataConfig,
} from '@/lib/metadata';
import {
  DEFAULT_ROLE_SOURCE_ACCESS,
  normalizeRoleSourceAccess,
  type RoleSourceAccess,
} from '@/lib/auth/permissions';
import type { SourceSubscription, VideoSource } from '@/lib/types';
import type { IPTVSource } from '@/lib/store/iptv-store';
import {
  DEFAULT_PLAYBACK_BUFFER_MODE,
  normalizePlaybackBufferMode,
  type PlaybackBufferMode,
} from '@/lib/player/buffer-modes';

/**
 * 全局配置：由管理员维护，所有用户共用。
 * 视频源、直播源、代理配置和豆瓣 Cookies 都只存这一份。
 */
export interface GlobalConfig {
  sources: VideoSource[];
  premiumSources: VideoSource[];
  subscriptions: SourceSubscription[];
  iptvSources: IPTVSource[];
  siteTitle: string;
  metadata: MetadataConfig;
  roleSourceAccess: RoleSourceAccess;
  /** 播放缓冲模式：管理员统一控制，所有用户共用 */
  playbackBufferMode: PlaybackBufferMode;
  updatedAt: number;
}

export const GLOBAL_CONFIG_KEY = 'global:config:v1';
export const MAX_GLOBAL_CONFIG_BYTES = 4 * 1024 * 1024;

function isVideoSource(value: unknown): value is VideoSource {
  if (!value || typeof value !== 'object') return false;
  const source = value as Partial<VideoSource>;
  return typeof source.id === 'string' &&
    typeof source.name === 'string' &&
    typeof source.baseUrl === 'string';
}

function isSubscription(value: unknown): value is SourceSubscription {
  if (!value || typeof value !== 'object') return false;
  const subscription = value as Partial<SourceSubscription>;
  return typeof subscription.id === 'string' &&
    typeof subscription.name === 'string' &&
    typeof subscription.url === 'string';
}

function isIPTVSource(value: unknown): value is IPTVSource {
  if (!value || typeof value !== 'object') return false;
  const source = value as Partial<IPTVSource>;
  return typeof source.id === 'string' &&
    typeof source.name === 'string' &&
    typeof source.url === 'string';
}

export function normalizeGlobalConfig(value: unknown): GlobalConfig | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<GlobalConfig>;

  return {
    sources: Array.isArray(input.sources) ? input.sources.filter(isVideoSource) : [],
    premiumSources: Array.isArray(input.premiumSources)
      ? input.premiumSources.filter(isVideoSource)
      : [],
    subscriptions: Array.isArray(input.subscriptions)
      ? input.subscriptions.filter(isSubscription)
      : [],
    iptvSources: Array.isArray(input.iptvSources)
      ? input.iptvSources.filter(isIPTVSource)
      : [],
    siteTitle: typeof input.siteTitle === 'string' ? input.siteTitle : '',
    metadata: input.metadata
      ? normalizeMetadataConfig(input.metadata)
      : { ...DEFAULT_METADATA_CONFIG },
    roleSourceAccess: normalizeRoleSourceAccess(input.roleSourceAccess),
    playbackBufferMode: normalizePlaybackBufferMode(input.playbackBufferMode),
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : Date.now(),
  };
}

export async function readGlobalConfig(): Promise<GlobalConfig | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const stored = await redis.get(GLOBAL_CONFIG_KEY);
  if (!stored) return null;

  return normalizeGlobalConfig(stored);
}

export async function writeGlobalConfig(value: unknown): Promise<GlobalConfig> {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Server-side storage is not configured');
  }

  const existing = await readGlobalConfig();
  const input = (value && typeof value === 'object' ? value : {}) as Partial<GlobalConfig>;

  // 部分更新：只覆盖请求中提供的字段，避免保存代理配置时清空视频源
  const config = normalizeGlobalConfig({
    sources: input.sources ?? existing?.sources ?? [],
    premiumSources: input.premiumSources ?? existing?.premiumSources ?? [],
    subscriptions: input.subscriptions ?? existing?.subscriptions ?? [],
    iptvSources: input.iptvSources ?? existing?.iptvSources ?? [],
    siteTitle: input.siteTitle ?? existing?.siteTitle ?? '',
    metadata: {
      ...(existing?.metadata ?? DEFAULT_METADATA_CONFIG),
      ...(input.metadata ?? {}),
    },
    roleSourceAccess: input.roleSourceAccess
      ?? existing?.roleSourceAccess
      ?? DEFAULT_ROLE_SOURCE_ACCESS,
    playbackBufferMode: input.playbackBufferMode
      ?? existing?.playbackBufferMode
      ?? DEFAULT_PLAYBACK_BUFFER_MODE,
    updatedAt: Date.now(),
  });

  if (!config) {
    throw new Error('Invalid global config');
  }

  const serialized = JSON.stringify(config);
  const size = new TextEncoder().encode(serialized).length;
  if (size > MAX_GLOBAL_CONFIG_BYTES) {
    throw new Error('Global config exceeds the storage limit');
  }

  await redis.set(GLOBAL_CONFIG_KEY, config);
  return config;
}
