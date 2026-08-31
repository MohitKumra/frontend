// frontend/src/store/customPlanModalStore.ts
// Global "Custom Plan" modal state, mirroring the existing upgradeModalStore so
// the guided flow can be opened from anywhere (the pricing cards, the billing
// hero, plan-limit intercepts) without prop-drilling.
import { create } from 'zustand';

interface CustomPlanModalState {
  isOpen: boolean;
  openCustomPlan: () => void;
  closeCustomPlan: () => void;
}

export const useCustomPlanModalStore = create<CustomPlanModalState>((set) => ({
  isOpen: false,
  openCustomPlan: () => set({ isOpen: true }),
  closeCustomPlan: () => set({ isOpen: false }),
}));