'use client';

/**
 * 进度条缩略图预览。
 * 思路参考 ArtPlayer 的 auto-thumbnail 插件：用隐藏 video 在目标时间点 seek 后抽帧。
 * 针对 HLS 做了适配：隐藏 video 通过独立的 hls.js 实例加载，抽帧按需进行并缓存。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const THUMBNAIL_WIDTH = 320;
const CACHE_LIMIT = 60;
const SEEK_DEBOUNCE_MS = 150;

interface ThumbnailPreviewResult {
  imageUrl: string | null;
  time: number | null;
  loading: boolean;
  requestPreview: (time: number | null) => void;
}

export function useThumbnailPreview(src: string, duration: number): ThumbnailPreviewResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readyRef = useRef(false);
  const destroyedRef = useRef(false);
  const unavailableRef = useRef(false);
  const seekingRef = useRef(false);
  const pendingTimeRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<number, string>>(new Map());
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    destroyedRef.current = false;
    readyRef.current = false;
    unavailableRef.current = false;
    seekingRef.current = false;
    pendingTimeRef.current = null;
    cacheRef.current.clear();

    return () => {
      destroyedRef.current = true;
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        video.removeAttribute('src');
        video.load();
        video.remove();
      }
      videoRef.current = null;
      canvasRef.current = null;
      readyRef.current = false;
      seekingRef.current = false;
    };
  }, [src]);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || destroyedRef.current) return;

    try {
      const width = THUMBNAIL_WIDTH;
      const height = Math.max(
        1,
        Math.round((width * video.videoHeight) / (video.videoWidth || width))
      );

      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

      const key = Math.round(video.currentTime);
      const cache = cacheRef.current;
      cache.set(key, dataUrl);
      if (cache.size > CACHE_LIMIT) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }

      setImageUrl(dataUrl);
      setLoading(false);
    } catch {
      // 跨域或解码失败则关闭预览，不影响播放
      unavailableRef.current = true;
      setLoading(false);
    }
  }, []);

  const seekToPendingTime = useCallback(() => {
    const video = videoRef.current;
    if (!video || destroyedRef.current || unavailableRef.current) return;
    if (!readyRef.current || seekingRef.current) return;

    const target = pendingTimeRef.current;
    if (target === null) return;

    const cached = cacheRef.current.get(Math.round(target));
    if (cached) {
      pendingTimeRef.current = null;
      setImageUrl(cached);
      setLoading(false);
      return;
    }

    pendingTimeRef.current = null;
    seekingRef.current = true;

    const onSeeked = () => {
      seekingRef.current = false;
      drawFrame();
      seekToPendingTime();
    };

    if (Math.abs(video.currentTime - target) < 0.25) {
      seekingRef.current = false;
      drawFrame();
      return;
    }

    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = target;
  }, [drawFrame]);

  const ensureVideo = useCallback(() => {
    if (videoRef.current || destroyedRef.current || !src) return;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);
    videoRef.current = video;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        capLevelToPlayerSize: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyedRef.current) return;
        readyRef.current = true;
        if (hls.levels.length > 0) {
          hls.currentLevel = 0;
        }
        seekToPendingTime();
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          unavailableRef.current = true;
          readyRef.current = false;
          setLoading(false);
        }
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        if (destroyedRef.current) return;
        readyRef.current = true;
        seekToPendingTime();
      }, { once: true });
      video.addEventListener('error', () => {
        unavailableRef.current = true;
        setLoading(false);
      }, { once: true });
    }
  }, [src, seekToPendingTime]);

  const requestPreview = useCallback((nextTime: number | null) => {
    if (nextTime === null) {
      setTime(null);
      setLoading(false);
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }

    if (!src || !Number.isFinite(duration) || duration <= 0) {
      setTime(nextTime);
      return;
    }

    const clamped = Math.min(Math.max(nextTime, 0), Math.max(duration - 0.1, 0));
    setTime(clamped);

    if (unavailableRef.current) return;

    const cached = cacheRef.current.get(Math.round(clamped));
    if (cached) {
      setImageUrl(cached);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      pendingTimeRef.current = clamped;
      ensureVideo();
      seekToPendingTime();
    }, SEEK_DEBOUNCE_MS);
  }, [duration, ensureVideo, seekToPendingTime, src]);

  return { imageUrl, time, loading, requestPreview };
}
