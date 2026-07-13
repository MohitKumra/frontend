// frontend/src/store/authStore.ts
// Global Zustand store for auth session state.
// Persisted to localStorage (web) so the user stays logged in across refreshes.
// Must be wired to platform/storage.ts once Capacitor is added.
//
// ONLY stores: accessToken, user. Server data (tasks, habits) stays in TanStack Query.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDTO } from '../types';

interface AuthState {
  accessToken: string | null;
  user: UserDTO | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserDTO) => void;
  setUser: (user: UserDTO) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ accessToken: token, user, isAuthenticated: true }),

      setUser: (user) =>
        set({ user }),

      setAccessToken: (token) =>
        set({ accessToken: token }),

      logout: () =>
        set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-store',
      // Only persist what's needed — don't persist transient state
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
