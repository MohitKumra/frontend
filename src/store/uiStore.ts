// frontend/src/store/uiStore.ts
// Global Zustand store for UI state that must survive refresh:
// - theme (dark/light/system)
// - sidebar open/closed state on desktop
// - focus mode (full-screen timer)
//
// Per Architecture rules: local UI state (modal open, form values) stays in useState.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setTheme as applyTheme, type Theme, type ThemePreference } from '../platform/theme';
import { applyLayoutPreference as applyShellLayout, type LayoutPreference as ShellLayoutPreference } from '../platform/layout';

interface UIState {
  theme: Theme;
  themePreference: ThemePreference;
  layoutPreference: ShellLayoutPreference;
  calendarViewPreference: 'day' | 'week' | 'month';
  sidebarOpen: boolean;
  focusMode: boolean;
  setTheme: (theme: ThemePreference, options?: { animate?: boolean }) => Promise<Theme>;
  setLayoutPreference: (layout: ShellLayoutPreference) => void;
  setCalendarViewPreference: (view: 'day' | 'week' | 'month') => void;
  toggleTheme: (options?: { animate?: boolean }) => Promise<Theme>;
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
      calendarViewPreference: 'month',
      sidebarOpen: true,
      focusMode: false,

      setTheme: async (theme, options) => {
        const resolved = await applyTheme(theme, options);
        set({ theme: resolved, themePreference: theme });
        return resolved;
      },
      setLayoutPreference: (layout) => {
        applyShellLayout(layout);
        set({ layoutPreference: layout });
      },
      setCalendarViewPreference: (view) => set({ calendarViewPreference: view }),
      toggleTheme: async (options) => {
        const current = document.documentElement.getAttribute('data-theme') as Theme | null;
        const next = current === 'dark' ? 'light' : 'dark';
        const resolved = await applyTheme(next, options);
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
