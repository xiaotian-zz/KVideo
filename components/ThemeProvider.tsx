'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

interface ViewTransitionLike {
  skipTransition: () => void;
  finished: Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);
  const transitionRef = React.useRef<ViewTransitionLike | null>(null);

  useEffect(() => {
    // 延迟到挂载后再读取 localStorage，避免 SSR 水合不一致
    queueMicrotask(() => {
      setMounted(true);
      // Load saved theme
      const saved = localStorage.getItem('theme') as Theme;
      if (saved) {
        setTheme(saved);
      }
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const applyTheme = (newTheme?: 'light' | 'dark') => {
      const themeToApply = newTheme || (theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme);
      
      setActualTheme(themeToApply);
      document.documentElement.classList.toggle('dark', themeToApply === 'dark');
    };

    const applyThemeWithTransition = () => {
      // Abort previous transition if it exists
      if (transitionRef.current) {
        try {
          transitionRef.current.skipTransition();
        } catch {
          // Ignore if transition already finished
        }
      }

      // Check if document is visible - skip transition if hidden
      if (document.hidden) {
        applyTheme();
        return;
      }

      // Check if View Transition API is supported
      const doc = document as Document & {
        startViewTransition?: (updateCallback: () => void) => ViewTransitionLike;
      };
      if (typeof doc.startViewTransition === 'function') {
        try {
          const transition = doc.startViewTransition(() => {
            applyTheme();
          });
          transitionRef.current = transition;

          // Clear ref after transition completes or fails
          transition.finished
            .then(() => { transitionRef.current = null; })
            .catch(() => {
              // Silently handle transition errors (visibility changes, etc.)
              transitionRef.current = null;
            });
        } catch {
          // Fallback if transition fails to start
          applyTheme();
        }
      } else {
        // Fallback for browsers that don't support View Transition API
        applyTheme();
      }
    };

    applyThemeWithTransition();
    localStorage.setItem('theme', theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyThemeWithTransition();
      }
    };
    
    // Listen for visibility changes to abort transitions
    const handleVisibilityChange = () => {
      if (document.hidden && transitionRef.current) {
        try {
          transitionRef.current.skipTransition();
        } catch {
          // Ignore
        }
        transitionRef.current = null;
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Abort any pending transition on unmount
      if (transitionRef.current) {
        try {
          transitionRef.current.skipTransition();
        } catch {
          // Ignore
        }
      }
    };
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
