// frontend/src/store/upgradeModalStore.ts
// Global "upgrade required" modal state. Triggered by the apiClient interceptor
// whenever the backend returns a limit/entitlement error, so every page surfaces
// a clear "limit reached / upgrade required" message + pricing modal.
import { create } from 'zustand';
import type { PlanDTO } from '../features/billing/useUserPlan';

interface UpgradeModalState {
  isOpen: boolean;
  featureName: string;
  message: string | null;
  openUpgrade: (featureName: string, message?: string) => void;
  closeUpgrade: () => void;
  /** Plan the user picked while upgrading — carried to the Billing page so it gets prefilled. */
  pendingPlan: PlanDTO | null;
  choosePlanForCheckout: (plan: PlanDTO) => void;
  clearPendingPlan: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  isOpen: false,
  featureName: '',
  message: null,
  pendingPlan: null,
  openUpgrade: (featureName, message) => set({ isOpen: true, featureName, message: message || null }),
  closeUpgrade: () => set({ isOpen: false }),
  choosePlanForCheckout: (plan) => set({ isOpen: false, pendingPlan: plan }),
  clearPendingPlan: () => set({ pendingPlan: null }),
}));