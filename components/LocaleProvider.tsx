'use client';

/**
 * LocaleProvider - Converts the entire UI between Simplified and Traditional Chinese
 * using opencc-js DOM-level conversion (MutationObserver-based).
 */

import { useEffect, useSyncExternalStore } from 'react';
import { settingsStore, type LocaleOption } from '@/lib/store/settings-store';

export function LocaleProvider() {
  // 订阅设置存储，避免在 effect 中同步 setState
  const locale = useSyncExternalStore(
    (onStoreChange) => settingsStore.subscribe(onStoreChange),
    () => settingsStore.getSettings().locale,
    () => 'zh-CN' as LocaleOption
  );

  // Apply DOM-level conversion when locale changes
  useEffect(() => {
    if (locale !== 'zh-TW') {
      // Reset to original (Simplified) by reloading lang attribute
      document.documentElement.lang = 'zh-CN';
      return;
    }

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const OpenCC = await import('opencc-js');
        const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

        // HTMLConverter converts all text nodes and observes DOM changes
        OpenCC.HTMLConverter(converter, document.documentElement, 'zh-CN', 'zh-TW');
        document.documentElement.lang = 'zh-TW';

        // The HTMLConverter sets up a MutationObserver internally.
        // To clean up, we'd need to reload or re-convert. Store a flag.
        cleanup = () => {
          // Reverse conversion on cleanup
          const reverseConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });
          OpenCC.HTMLConverter(reverseConverter, document.documentElement, 'zh-TW', 'zh-CN');
          document.documentElement.lang = 'zh-CN';
        };
      } catch (err) {
        console.warn('[LocaleProvider] Failed to load opencc-js:', err);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [locale]);

  return null;
}
