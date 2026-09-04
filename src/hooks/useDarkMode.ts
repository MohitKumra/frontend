import { useEffect, useState } from 'react';

/**
 * Reactively returns true when the app is in dark mode.
 * Dark mode is signalled by data-theme="dark" on <html>, set by platform/theme.ts.
 * Updates instantly via MutationObserver — no polling, no re-render cost.
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.getAttribute('data-theme') === 'dark');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
