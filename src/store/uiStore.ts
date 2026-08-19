// frontend/src/store/uiStore.ts
// Global Zustand store for UI state that must survive refresh:
// - theme (dark/light/system)
// - sidebar open/closed state on desktop
// - focus mode (full-screen timer)
// - streak popup dismissal
//
// Per Architecture rules: local UI state (modal open, form values) stays in useState.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setTheme as applyTheme, type Theme, type ThemePreference } from '../platform/theme';
import {
  applyLayoutPreference as applyShellLayout,
  type LayoutPreference as ShellLayoutPreference,
} from '../platform/layout';
import type { TaskViewPreference, NotesViewPreference } from '../types';

interface UIState {
  theme: Theme;
  themePreference: ThemePreference;
  layoutPreference: ShellLayoutPreference;
  calendarViewPreference: 'day' | 'week' | 'month' | 'agenda';
  taskViewPreference: TaskViewPreference;
  notesViewPreference: NotesViewPreference;
  pageTransitionsEnabled: boolean;
  floatingAnimationsEnabled: boolean;
  sidebarOpen: boolean;
  focusMode: boolean;
  streakPopupDismissed: boolean;
  streakPopupDismissedAt: string | null;
  setTheme: (theme: ThemePreference, options?: { animate?: boolean; onMutate?: () => void }) => Promise<Theme>;
  setLayoutPreference: (layout: ShellLayoutPreference) => void;
  setCalendarViewPreference: (view: 'day' | 'week' | 'month' | 'agenda') => void;
  setTaskViewPreference: (view: TaskViewPreference) => void;
  setNotesViewPreference: (view: NotesViewPreference) => void;
  setPageTransitionsEnabled: (enabled: boolean) => void;
  setFloatingAnimationsEnabled: (enabled: boolean) => void;
  toggleTheme: (options?: { animate?: boolean; onMutate?: () => void }) => Promise<Theme>;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setFocusMode: (open: boolean) => void;
  toggleFocusMode: () => void;
  dismissStreakPopup: (brokenAt?: string) => void;
  resetStreakPopup: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      themePreference: 'system',
      layoutPreference: 'COMFORTABLE',
      calendarViewPreference: 'month',
      taskViewPreference: 'board',
      notesViewPreference: 'grid',
      pageTransitionsEnabled: true,
      floatingAnimationsEnabled: true,
      sidebarOpen: true,
      focusMode: false,
      streakPopupDismissed: false,
      streakPopupDismissedAt: null,

      setTheme: async (theme, options) => {
        const resolved = await applyTheme(theme, {
          animate: options?.animate,
          onMutate: options?.onMutate,
        });
        set({ theme: resolved, themePreference: theme });
        return resolved;
      },
      setLayoutPreference: (layout) => {
        applyShellLayout(layout);
        set({ layoutPreference: layout });
      },
      setCalendarViewPreference: (view) => set({ calendarViewPreference: view }),
      setTaskViewPreference: (view) => set({ taskViewPreference: view }),
      setNotesViewPreference: (view) => set({ notesViewPreference: view }),
      setPageTransitionsEnabled: (enabled) => set({ pageTransitionsEnabled: enabled }),
      setFloatingAnimationsEnabled: (enabled) => set({ floatingAnimationsEnabled: enabled }),
      toggleTheme: async (options) => {
        const current = document.documentElement.getAttribute('data-theme') as Theme | null;
        const next = current === 'dark' ? 'light' : 'dark';
        const resolved = await applyTheme(next, {
          animate: options?.animate,
          onMutate: options?.onMutate,
        });
        set({ theme: resolved, themePreference: next });
        return resolved;
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setFocusMode: (open) => set({ focusMode: open }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      dismissStreakPopup: (brokenAt) =>
        set({
          streakPopupDismissed: true,
          streakPopupDismissedAt: brokenAt ?? new Date().toISOString(),
        }),
      resetStreakPopup: () =>
        set({
          streakPopupDismissed: false,
          streakPopupDismissedAt: null,
        }),
    }),
    { name: 'ui-store' }
  )
);
