import { useCallback, useEffect, useRef, useMemo } from 'react';

interface UseProgressControlsProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    progressBarRef: React.RefObject<HTMLDivElement | null>;
    duration: number;
    setCurrentTime: (time: number) => void;
    isDraggingProgressRef: React.MutableRefObject<boolean>;
    isRotated?: boolean;
}

// 手机端进度条：点击不跳转，按住左右拖动才生效（移植自 LunaTV）
const TOUCH_DRAG_THRESHOLD_PX = 4; // 超过该位移才认定为拖动
const TOUCH_DRAG_SENSITIVITY = 0.5; // 滑过整条进度条只改变总时长的一半
const TOUCH_CLICK_SUPPRESS_MS = 700; // 触摸后拦截浏览器补发的 click

export function useProgressControls({
    videoRef,
    progressBarRef,
    duration,
    setCurrentTime,
    isDraggingProgressRef,
    isRotated = false
}: UseProgressControlsProps) {
    const lastDragTimeRef = useRef<number>(0);
    const touchStartXRef = useRef<number>(0);
    const touchStartYRef = useRef<number>(0);
    const touchStartTimeRef = useRef<number>(0);
    const touchMovedRef = useRef<boolean>(false);
    const lastTouchAtRef = useRef<number>(0);

    const getEventPos = useCallback((
        e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement> | MouseEvent | TouchEvent,
        rect: DOMRect
    ) => {
        // Handle both mouse and touch events
        const touch = 'touches' in e ? e.touches[0] : undefined;
        const clientX = ('clientX' in e ? e.clientX : 0) || touch?.clientX || 0;
        const clientY = ('clientY' in e ? e.clientY : 0) || touch?.clientY || 0;

        if (isRotated) {
            // When rotated 90deg, visual left->right is physical top->bottom
            // The bounding rect height is the visual width of the bar
            return Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        } else {
            return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        }
    }, [isRotated]);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        // 触摸结束后浏览器可能补发 click，拦截它避免覆盖拖动结果
        if (Date.now() - lastTouchAtRef.current <= TOUCH_CLICK_SUPPRESS_MS) return;
        if (!videoRef.current || !progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const pos = getEventPos(e, rect);
        const newTime = pos * duration;
        videoRef.current.currentTime = newTime;
        lastDragTimeRef.current = newTime; // Update ref to prevent snap-back on mouseup
        setCurrentTime(newTime);
    }, [videoRef, progressBarRef, duration, setCurrentTime, getEventPos]);

    const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        isDraggingProgressRef.current = true;
        handleProgressClick(e);
    }, [isDraggingProgressRef, handleProgressClick]);

    // 触摸起止由原生 touchstart/touchmove 监听处理（需要 passive: false）
    const handleProgressTouchStart = useCallback(() => {}, []);

    useEffect(() => {
        const handleProgressMouseMove = (e: MouseEvent) => {
            if (!isDraggingProgressRef.current || !progressBarRef.current || !videoRef.current) return;
            e.preventDefault();
            const rect = progressBarRef.current.getBoundingClientRect();
            const pos = getEventPos(e, rect);
            const newTime = pos * duration;
            lastDragTimeRef.current = newTime;
            setCurrentTime(newTime);
        };

        const handleMouseUp = () => {
            if (isDraggingProgressRef.current) {
                isDraggingProgressRef.current = false;
                if (videoRef.current) {
                    videoRef.current.currentTime = lastDragTimeRef.current;
                }
            }
        };

        const handleProgressTouchMove = (e: TouchEvent) => {
            if (!isDraggingProgressRef.current || !progressBarRef.current || !videoRef.current) return;
            const touch = e.touches[0];
            if (!touch) return;
            if (e.cancelable) e.preventDefault();

            const rect = progressBarRef.current.getBoundingClientRect();
            // 相对拖动：以按下时的进度为基准，按手指位移量调节
            const deltaPx = isRotated
                ? touch.clientY - touchStartYRef.current
                : touch.clientX - touchStartXRef.current;
            if (!touchMovedRef.current) {
                // 单纯点按不跳转，位移超过阈值才认定为拖动
                if (Math.abs(deltaPx) < TOUCH_DRAG_THRESHOLD_PX) return;
                touchMovedRef.current = true;
            }

            const barSize = isRotated ? rect.height : rect.width;
            if (barSize <= 0 || duration <= 0) return;

            const newTime = Math.min(
                duration,
                Math.max(
                    0,
                    touchStartTimeRef.current
                    + (deltaPx / barSize) * duration * TOUCH_DRAG_SENSITIVITY
                )
            );
            lastDragTimeRef.current = newTime;
            // 拖动过程中实时跳转，画面跟随手指
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        };

        const handleTouchEnd = () => {
            if (!isDraggingProgressRef.current) return;
            isDraggingProgressRef.current = false;
            touchMovedRef.current = false;
            lastTouchAtRef.current = Date.now();
        };

        document.addEventListener('mousemove', handleProgressMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleProgressTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            document.removeEventListener('mousemove', handleProgressMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleProgressTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [duration, isDraggingProgressRef, progressBarRef, videoRef, setCurrentTime, getEventPos, isRotated]);

    // Attach touchstart with passive: false to allow preventDefault (React uses passive by default)
    useEffect(() => {
        const progressBar = progressBarRef.current;
        if (!progressBar) return;

        const handleNativeTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            if (!touch || !videoRef.current) return;
            e.preventDefault();
            lastTouchAtRef.current = Date.now();
            isDraggingProgressRef.current = true;
            touchMovedRef.current = false;
            touchStartXRef.current = touch.clientX;
            touchStartYRef.current = touch.clientY;
            touchStartTimeRef.current = videoRef.current.currentTime || 0;
            lastDragTimeRef.current = touchStartTimeRef.current;
        };

        progressBar.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
        return () => {
            progressBar.removeEventListener('touchstart', handleNativeTouchStart);
        };
    }, [progressBarRef, videoRef, isDraggingProgressRef]);

    const progressActions = useMemo(() => ({
        handleProgressClick,
        handleProgressMouseDown,
        handleProgressTouchStart
    }), [handleProgressClick, handleProgressMouseDown, handleProgressTouchStart]);

    return progressActions;
}
