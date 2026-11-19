import { useEffect } from 'react';

type OrientationLockScreen = Screen & {
    orientation?: {
        lock?: (orientation: 'landscape' | 'portrait') => Promise<void>;
        unlock?: () => void;
    };
};

/**
 * Hook for managing screen orientation on mobile devices
 * Auto-rotates to landscape on fullscreen, portrait on exit
 */
export function useScreenOrientation(isFullscreen: boolean) {
    useEffect(() => {
        if (typeof window === 'undefined' || !('screen' in window)) return;

        const handleOrientation = async () => {
            try {
                const screen = window.screen as OrientationLockScreen;

                if (isFullscreen) {
                    // Fullscreen: Lock to landscape
                    if (screen.orientation?.lock) {
                        await screen.orientation.lock('landscape').catch((err: unknown) => {
                            console.warn('Could not lock orientation:', err);
                        });
                    }
                } else {
                    // Exit fullscreen: Unlock to allow portrait
                    if (screen.orientation?.unlock) {
                        screen.orientation.unlock();
                    }
                }
            } catch (error) {
                console.warn('Orientation API not supported:', error);
            }
        };

        handleOrientation();

        // Cleanup: Always unlock on unmount
        return () => {
            try {
                const screen = window.screen as OrientationLockScreen;
                if (screen.orientation?.unlock) {
                    screen.orientation.unlock();
                }
            } catch {
                // Ignore cleanup errors
            }
        };
    }, [isFullscreen]);
}
