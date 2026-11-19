'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';

interface UseCastControlsProps {
    src: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    setIsCastAvailable: (available: boolean) => void;
    setIsCasting: (casting: boolean) => void;
}

interface CastSessionStateEvent {
    sessionState: string;
}

interface CastMediaInfo {
    contentType: string;
}

interface CastLoadRequest {
    currentTime: number;
}

interface CastSession {
    loadMedia(request: CastLoadRequest): Promise<void>;
}

interface CastContext {
    getCurrentSession(): CastSession | null;
    setOptions(options: { receiverApplicationId: string; autoJoinPolicy: string }): void;
    addEventListener(type: string, listener: (event: CastSessionStateEvent) => void): void;
    removeEventListener(type: string, listener: (event: CastSessionStateEvent) => void): void;
    requestSession(): void;
}

declare global {
    interface Window {
        chrome: {
            cast: {
                media: {
                    DEFAULT_MEDIA_RECEIVER_APP_ID: string;
                    MediaInfo: new (contentId: string, contentType: string) => CastMediaInfo;
                    LoadRequest: new (mediaInfo: CastMediaInfo) => CastLoadRequest;
                };
                AutoJoinPolicy: { ORIGIN_SCOPED: string };
            };
        };
        cast: {
            framework: {
                CastContext: { getInstance(): CastContext };
                CastContextEventType: { SESSION_STATE_CHANGED: string };
                SessionState: { SESSION_STARTED: string; SESSION_RESUMED: string };
            };
        };
        __onGCastApiAvailable?: (isAvailable: boolean) => void;
    }
}

export function useCastControls({
    src,
    videoRef,
    setIsCastAvailable,
    setIsCasting
}: UseCastControlsProps) {
    const castContextRef = useRef<CastContext | null>(null);
    const loadMediaRef = useRef<() => void>(() => {});

    const isCastSdkReady = useCallback(() => {
        if (typeof window === 'undefined') return false;

        return Boolean(
            typeof window.cast?.framework?.CastContext?.getInstance === 'function' &&
            window.cast?.framework?.CastContextEventType?.SESSION_STATE_CHANGED &&
            window.cast?.framework?.SessionState &&
            window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID &&
            typeof window.chrome?.cast?.media?.MediaInfo === 'function' &&
            typeof window.chrome?.cast?.media?.LoadRequest === 'function' &&
            window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED
        );
    }, []);

    const loadMedia = useCallback(() => {
        const castMedia = window.chrome?.cast?.media;
        if (!castContextRef.current || !src || !castMedia?.MediaInfo || !castMedia?.LoadRequest) return;

        const castContext = castContextRef.current;
        const session = castContext.getCurrentSession();
        if (!session) return;

        const mediaInfo = new castMedia.MediaInfo(src, 'video/mp4');
        // Handle HLS specifically if possible, though DEFAULT_MEDIA_RECEIVER supports it
        if (src.includes('.m3u8')) {
            mediaInfo.contentType = 'application/x-mpegurl';
        }

        const request = new castMedia.LoadRequest(mediaInfo);

        // Sync current time
        if (videoRef.current) {
            request.currentTime = videoRef.current.currentTime;
        }

        session.loadMedia(request).then(
            () => console.log('Cast: Media loaded successfully'),
            (error: unknown) => console.error('Cast: Media load failed', error)
        );
    }, [src, videoRef]);

    useEffect(() => {
        loadMediaRef.current = loadMedia;
    }, [loadMedia]);

    useEffect(() => {
        let sessionStateListener: ((event: CastSessionStateEvent) => void) | null = null;
        let onGCastApiAvailable: ((isAvailable: boolean) => void) | null = null;

        const markCastUnavailable = () => {
            castContextRef.current = null;
            setIsCastAvailable(false);
            setIsCasting(false);
        };

        // Function to initialize Cast
        const initializeCastApi = () => {
            if (!isCastSdkReady()) {
                markCastUnavailable();
                return;
            }

            try {
                const castContext = window.cast.framework.CastContext.getInstance();
                castContextRef.current = castContext;

                castContext.setOptions({
                    receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                });

                // SDK loaded — show cast button immediately.
                // requestSession() will re-scan and show Chrome's native device picker.
                setIsCastAvailable(true);

                // Monitor session state
                sessionStateListener = (event: CastSessionStateEvent) => {
                    const sessionState = event.sessionState;
                    const isSessionActive = sessionState === window.cast.framework.SessionState.SESSION_STARTED ||
                        sessionState === window.cast.framework.SessionState.SESSION_RESUMED;

                    setIsCasting(isSessionActive);

                    if (isSessionActive && videoRef.current) {
                        videoRef.current.pause();
                        loadMediaRef.current();
                    }
                };

                castContext.addEventListener(
                    window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    sessionStateListener
                );
            } catch (error) {
                console.warn('Cast SDK is not usable in this browser context.', error);
                markCastUnavailable();
            }
        };

        // If API is already loaded
        if (isCastSdkReady()) {
            initializeCastApi();
        } else {
            // Wait for API to be available
            onGCastApiAvailable = (isAvailable: boolean) => {
                if (isAvailable) {
                    initializeCastApi();
                } else {
                    markCastUnavailable();
                }
            };
            window.__onGCastApiAvailable = onGCastApiAvailable;
        }

        return () => {
            if (onGCastApiAvailable && window.__onGCastApiAvailable === onGCastApiAvailable) {
                delete window.__onGCastApiAvailable;
            }

            const castContext = castContextRef.current;
            if (
                sessionStateListener &&
                castContext?.removeEventListener &&
                window.cast?.framework?.CastContextEventType?.SESSION_STATE_CHANGED
            ) {
                castContext.removeEventListener(
                    window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    sessionStateListener
                );
            }
        };
    }, [isCastSdkReady, setIsCastAvailable, setIsCasting, videoRef]);

    const showCastMenu = useCallback(() => {
        if (!isCastSdkReady()) return;

        try {
            window.cast.framework.CastContext.getInstance().requestSession();
        } catch (error) {
            console.warn('Cast session request failed.', error);
            setIsCastAvailable(false);
        }
    }, [isCastSdkReady, setIsCastAvailable]);

    const castActions = useMemo(() => ({
        showCastMenu
    }), [showCastMenu]);

    return castActions;
}
