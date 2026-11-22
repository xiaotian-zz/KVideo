'use client';

/**
 * 进度条缩略图预览。
 * 思路参考 ArtPlayer 的 auto-thumbnail 插件：在多个时间点抽帧并缓存。
 * 针对 HLS 做了适配：隐藏 video 通过独立的 hls.js 实例加载，帧按需优先生成，
 * 然后再后台逐步补齐整部视频的缩略图。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const THUMBNAIL_WIDTH = 320;
const MAX_FRAMES = 180;
const SECONDS_PER_FRAME = 4;
const GENERATE_INTERVAL_MS = 60;

function getFrameCount(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(MAX_FRAMES, Math.max(24, Math.round(duration / SECONDS_PER_FRAME)));
}

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
  const frameCountRef = useRef(0);
  const framesRef = useRef<Map<number, string>>(new Map());
  const queueRef = useRef<number[]>([]);
  const queuedRef = useRef<Set<number>>(new Set());
  const generatingRef = useRef(false);
  const requestedIndexRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  const generateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    destroyedRef.current = false;
    readyRef.current = false;
    unavailableRef.current = false;
    generatingRef.current = false;
    requestedIndexRef.current = null;
    frameCountRef.current = getFrameCount(duration);
    framesRef.current.clear();
    queueRef.current = [];
    queuedRef.current.clear();
    setImageUrl(null);
    setLoading(false);

    const queued = queuedRef.current;
    const frames = framesRef.current;

    return () => {
      destroyedRef.current = true;
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (generateTimerRef.current !== null) {
        window.clearTimeout(generateTimerRef.current);
        generateTimerRef.current = null;
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
      generatingRef.current = false;
      queueRef.current = [];
      queued.clear();
      frames.clear();
    };
  }, [duration, src]);

  const indexToTime = useCallback((index: number) => {
    const count = frameCountRef.current;
    if (count <= 1) return 0;
    return (duration * index) / (count - 1);
  }, [duration]);

  const timeToIndex = useCallback((targetTime: number) => {
    const count = frameCountRef.current;
    if (count <= 1 || !Number.isFinite(duration) || duration <= 0) return 0;
    const ratio = Math.min(Math.max(targetTime / duration, 0), 1);
    return Math.round(ratio * (count - 1));
  }, [duration]);

  const findNearestFrame = useCallback((index: number): string | null => {
    const frames = framesRef.current;
    if (frames.size === 0) return null;
    let bestKey: number | null = null;
    for (const key of frames.keys()) {
      if (bestKey === null || Math.abs(key - index) < Math.abs(bestKey - index)) {
        bestKey = key;
      }
    }
    return bestKey === null ? null : frames.get(bestKey) ?? null;
  }, []);

  const refreshDisplay = useCallback(() => {
    const target = requestedIndexRef.current;
    if (target === null) return;
    const nearest = findNearestFrame(target);
    if (nearest) {
      setImageUrl(nearest);
      setLoading(false);
    }
  }, [findNearestFrame]);

  const drawFrame = useCallback((index: number) => {
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
      // canvas 是本地创建的离屏节点，尺寸更新不会影响 React 渲染
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      framesRef.current.set(index, dataUrl);

      const target = requestedIndexRef.current;
      if (target !== null && Math.abs(target - index) <= 1) {
        setImageUrl(dataUrl);
        setLoading(false);
      }
    } catch {
      // 跨域或解码失败则关闭预览，不影响播放
      unavailableRef.current = true;
      setLoading(false);
    }
  }, []);

  const processQueue = useCallback(function processQueue() {
    if (destroyedRef.current || unavailableRef.current || generatingRef.current) return;

    const video = videoRef.current;
    if (!video) return;

    if (!readyRef.current) {
      // 元数据就绪后会再次触发
      return;
    }

    const index = queueRef.current.shift();
    if (index === undefined) {
      setLoading(false);
      return;
    }
    queuedRef.current.delete(index);

    if (framesRef.current.has(index)) {
      refreshDisplay();
      processQueue();
      return;
    }

    generatingRef.current = true;
    const targetTime = Math.min(Math.max(indexToTime(index), 0), Math.max(duration - 0.1, 0));

    const finish = () => {
      generatingRef.current = false;
      refreshDisplay();
      if (generateTimerRef.current !== null) {
        window.clearTimeout(generateTimerRef.current);
      }
      generateTimerRef.current = window.setTimeout(() => {
        generateTimerRef.current = null;
        processQueue();
      }, GENERATE_INTERVAL_MS);
    };

    const onSeeked = () => {
      drawFrame(index);
      finish();
    };

    if (Math.abs(video.currentTime - targetTime) < 0.2) {
      drawFrame(index);
      finish();
      return;
    }

    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = targetTime;
  }, [drawFrame, duration, indexToTime, refreshDisplay]);

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
        processQueue();
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
        processQueue();
      }, { once: true });
      video.addEventListener('error', () => {
        unavailableRef.current = true;
        setLoading(false);
      }, { once: true });
    }
  }, [processQueue, src]);

  const enqueueAround = useCallback((target: number) => {
    const count = frameCountRef.current;
    if (count <= 0) return;

    const enqueue = (index: number, priority: boolean) => {
      if (index < 0 || index >= count) return;
      if (framesRef.current.has(index) || queuedRef.current.has(index)) return;
      queuedRef.current.add(index);
      if (priority) {
        queueRef.current.unshift(index);
      } else {
        queueRef.current.push(index);
      }
    };

    enqueue(target, true);
    for (let distance = 1; distance < count; distance += 1) {
      enqueue(target + distance, false);
      enqueue(target - distance, false);
    }
  }, []);

  const requestPreview = useCallback((nextTime: number | null) => {
    if (nextTime === null) {
      setTime(null);
      setLoading(false);
      requestedIndexRef.current = null;
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

    const index = timeToIndex(clamped);
    requestedIndexRef.current = index;

    const nearest = findNearestFrame(index);
    if (nearest) {
      setImageUrl(nearest);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      ensureVideo();
      enqueueAround(index);
      processQueue();
    }, 80);
  }, [duration, ensureVideo, enqueueAround, findNearestFrame, processQueue, src, timeToIndex]);

  return { imageUrl, time, loading, requestPreview };
}
