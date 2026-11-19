import React, { RefObject, useState } from 'react';

interface DesktopProgressBarProps {
    progressBarRef: RefObject<HTMLDivElement | null>;

    currentTime: number;
    duration: number;
    bufferedTime: number;
    onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onProgressMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onProgressTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;

    // 悬停缩略图预览
    onHoverTime?: (time: number | null) => void;
    previewImage?: string | null;
    previewLoading?: boolean;
    formatTime?: (seconds: number) => string;
}

function defaultFormatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DesktopProgressBar({
    progressBarRef,
    currentTime,
    duration,
    bufferedTime,
    onProgressClick,
    onProgressMouseDown,
    onProgressTouchStart,
    onHoverTime,
    previewImage,
    previewLoading,
    formatTime = defaultFormatTime,
}: DesktopProgressBarProps) {
    const [hoverPercent, setHoverPercent] = useState<number | null>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onHoverTime || !Number.isFinite(duration) || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width <= 0) return;
        const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        setHoverPercent(percent);
        onHoverTime(percent * duration);
    };

    const handleMouseLeave = () => {
        setHoverPercent(null);
        onHoverTime?.(null);
    };

    return (
        <div className="px-4 pb-1">
            <div className="relative">
                {hoverPercent !== null && (
                    <div
                        className="absolute bottom-full mb-3 z-50 -translate-x-1/2 pointer-events-none"
                        style={{ left: `${Math.min(Math.max(hoverPercent * 100, 8), 92)}%` }}
                    >
                        <div className="rounded-lg overflow-hidden border border-white/20 bg-black/85 shadow-xl">
                            {previewImage ? (
                                <img
                                    src={previewImage}
                                    alt=""
                                    className="block w-64 h-auto object-cover"
                                    draggable={false}
                                />
                            ) : (
                                <div className="w-64 aspect-video flex items-center justify-center text-[11px] text-white/70">
                                    {previewLoading ? '生成预览…' : '暂无预览'}
                                </div>
                            )}
                            <div className="text-center text-[11px] text-white/90 py-0.5 tabular-nums">
                                {formatTime(hoverPercent * duration)}
                            </div>
                        </div>
                    </div>
                )}

                <div
                    ref={progressBarRef}
                    className="slider-track cursor-pointer"
                    onClick={onProgressClick}
                    onMouseDown={onProgressMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={onProgressTouchStart}
                    style={{ pointerEvents: 'auto' }}
                >
                    <div
                        className="slider-buffer"
                        style={{ width: `${(bufferedTime / duration) * 100 || 0}%` }}
                    />
                    <div
                        className="slider-range"
                        style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                    />
                    <div
                        className="slider-thumb"
                        style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
