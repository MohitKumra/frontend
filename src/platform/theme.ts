// Theme switching logic — directional sweep transition
// Dark: color spreads from top-right → bottom-left
// Light: color spreads from bottom-left → top-right
//
// Performance: uses CSS View Transitions API (Chrome 111+, Safari 18+)
// with native hardware-accelerated animations. Falls back to standard CSS
// transitions on non-supported browsers.

import { storageGet, storageSet } from './storage';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme-preference';
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

/* ------------------------------------------------------------------ */
/*  Directional sweep — CSS-driven View Transitions API                */
/* ------------------------------------------------------------------ */

let isTransitioning = false;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

async function animatedThemeSwitch(newTheme: Theme): Promise<void> {
  if (isTransitioning) {
    applyThemeToDocument(newTheme);
    return;
  }
  isTransitioning = true;

  if (prefersReducedMotion()) {
    applyThemeToDocument(newTheme);
    isTransitioning = false;
    return;
  }

  const root = document.documentElement;

  if (typeof document.startViewTransition === 'function') {
    root.classList.add('theme-sweeping');
    const transition = document.startViewTransition(() => {
      applyThemeToDocument(newTheme);
    });

    try {
      await transition.finished;
    } catch {
      // Transition was skipped/aborted — nothing to do
    } finally {
      root.classList.remove('theme-sweeping');
      isTransitioning = false;
    }
    return;
  }

  // Fallback for Firefox and older browsers:
  // Just switch theme instantly and let CSS transition transitions on elements.
  applyThemeToDocument(newTheme);
  isTransitioning = false;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function setTheme(
  theme: ThemePreference,
  options: { animate?: boolean } = {},
): Promise<Theme> {
  await storageSet(STORAGE_KEY, theme);
  const resolved = theme === 'system' ? resolveSystemTheme() : theme;

  if (options.animate ?? true) {
    await animatedThemeSwitch(resolved);
  } else {
    applyThemeToDocument(resolved);
  }
  return resolved;
}

export async function toggleTheme(
  options: { animate?: boolean } = {},
): Promise<Theme> {
  const current = document.documentElement.getAttribute('data-theme') as Theme | null;
  return setTheme(current === 'dark' ? 'light' : 'dark', options);
}