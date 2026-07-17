// Theme switching logic - simplified for smooth CSS cross-fade
import { storageGet, storageSet } from './storage';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme-preference'; // 'light' | 'dark' | 'system'
export type ThemePreference = Theme | 'system';

function resolveSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

// Call once in main.tsx before first paint to avoid a flash of the wrong theme.
export async function initTheme(): Promise<Theme> {
  const stored = (await storageGet(STORAGE_KEY)) as ThemePreference | null;
  const preference: ThemePreference = stored ?? 'system';
  const resolved = preference === 'system' ? resolveSystemTheme() : preference;
  applyThemeToDocument(resolved);
  return resolved;
}

export async function setTheme(theme: ThemePreference, options: { animate?: boolean } = {}): Promise<Theme> {
  await storageSet(STORAGE_KEY, theme);
  const resolved = theme === 'system' ? resolveSystemTheme() : theme;

  if (options.animate ?? true) {
    // Simple approach: lock transitions, apply theme, unlock on next frame
    // The CSS `* { transition: color 0.2s, background-color 0.2s }` in globals.css
    // handles the smooth cross-fade.
    const root = document.documentElement;
    root.classList.add('theme-transition-lock');
    applyThemeToDocument(resolved);
    // On the next frame, unlock transitions so CSS smoothly animates the change
    requestAnimationFrame(() => {
      root.classList.remove('theme-transition-lock');
    });
  } else {
    applyThemeToDocument(resolved);
  }
  return resolved;
}

export async function toggleTheme(options: { animate?: boolean } = {}): Promise<Theme> {
  const current = document.documentElement.getAttribute('data-theme') as Theme | null;
  return setTheme(current === 'dark' ? 'light' : 'dark', options);
}