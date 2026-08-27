// frontend/src/store/upgradeModalStore.ts
// Global "upgrade required" modal state. Triggered by the apiClient interceptor
// whenever the backend returns a limit/entitlement error, so every page surfaces
// a clear "limit reached / upgrade required" message + pricing modal.
import { create } from 'zustand';

interface UpgradeModalState {
  isOpen: boolean;
  featureName: string;
  message: string | null;
  openUpgrade: (featureName: string, message?: string) => void;
  closeUpgrade: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  isOpen: false,
  featureName: '',
  message: null,
  openUpgrade: (featureName, message) => set({ isOpen: true, featureName, message: message || null }),
  closeUpgrade: () => set({ isOpen: false }),
}));