// frontend/src/store/adminStore.ts
// Zustand store for admin authentication state with automatic session restoration.

import { create } from 'zustand';
import { adminApiClient } from '../lib/adminApiClient';

export interface AdminUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'VIEWER';
  isActive: boolean;
}

interface AdminStore {
  admin: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  otpEmail: string | null;

  setOtpEmail: (email: string) => void;
  setSession: (admin: AdminUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAdminStore = create<AdminStore>((set) => ({
  admin: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  otpEmail: null,

  setOtpEmail: (email) => set({ otpEmail: email }),
  setSession: (admin, accessToken) =>
    set({ admin, accessToken, isAuthenticated: true, isInitializing: false }),
  setAccessToken: (token) => set({ accessToken: token }),
  clearSession: () =>
    set({ admin: null, accessToken: null, isAuthenticated: false, isInitializing: false, otpEmail: null }),

  checkAuth: async () => {
    try {
      const res = await adminApiClient.get('/auth/me');
      const admin = res.data.data.admin;
      set({ admin, isAuthenticated: true, isInitializing: false });
      return true;
    } catch {
      set({ admin: null, accessToken: null, isAuthenticated: false, isInitializing: false });
      return false;
    }
  },
}));