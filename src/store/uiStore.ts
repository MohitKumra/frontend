// frontend/src/store/uiStore.ts
// Global Zustand store for UI state that must survive refresh:
// - theme (dark/light/system)
// - sidebar open/closed state on desktop
// - focus mode (full-screen timer)
//
// Per Architecture rules: local UI state (modal open, form values) stays in useState.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setTheme as applyTheme, type Theme } from '../platform/theme';

type ThemePreference = Theme | 'system';
type LayoutPreference = 'COMFORTABLE' | 'COMPACT' | 'EXPANDED';

interface UIState {
  theme: Theme;
  themePreference: ThemePreference;
  layoutPreference: LayoutPreference;
  sidebarOpen: boolean;
  focusMode: boolean;
  setTheme: (theme: ThemePreference) => Promise<Theme>;
  setLayoutPreference: (layout: LayoutPreference) => void;
  toggleTheme: () => Promise<Theme>;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setFocusMode: (open: boolean) => void;
  toggleFocusMode: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      themePreference: 'system',
      layoutPreference: 'COMFORTABLE',
      sidebarOpen: true,
      focusMode: false,

      setTheme: async (theme) => {
        const resolved = await applyTheme(theme);
        set({ theme: resolved, themePreference: theme });
        return resolved;
      },
      setLayoutPreference: (layout) => set({ layoutPreference: layout }),
      toggleTheme: async () => {
        const current = document.documentElement.getAttribute('data-theme') as Theme | null;
        const next = current === 'dark' ? 'light' : 'dark';
        const resolved = await applyTheme(next);
        set({ theme: resolved, themePreference: next });
        return resolved;
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setFocusMode: (open) => set({ focusMode: open }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
    }),
    { name: 'ui-store' },
  ),
);
