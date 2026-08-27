// frontend/src/store/appBlockedStore.ts
// Global UI state for blocking overlays. Tracks whether the app should be
// prevented from use, and why:
//   MAINTENANCE  — app is temporarily down for maintenance (global)
//   DEACTIVATED  — this account was deactivated by our team (per-user)
//   BANNED       — this account was permanently banned (per-user)
import { create } from 'zustand';

export type BlockedType = 'MAINTENANCE' | 'DEACTIVATED' | 'BANNED';

interface AppBlockedState {
  type: BlockedType | null;
  message: string | null;
  setBlocked: (type: BlockedType, message?: string) => void;
  clearBlocked: () => void;
}

export const useAppBlockedStore = create<AppBlockedState>((set) => ({
  type: null,
  message: null,
  setBlocked: (type, message) => set({ type, message: message || null }),
  clearBlocked: () => set({ type: null, message: null }),
}));