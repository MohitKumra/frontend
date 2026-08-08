/**
 * frontend/src/features/onboarding/hooks/useOnboarding.ts
 * Public hook for consuming onboarding state and actions.
 * Re-exports from context for a clean public API.
 */

import { useOnboardingContext } from '../context/OnboardingContext';
import type { OnboardingActions, OnboardingState } from '../types';

interface UseOnboardingReturn {
  /** Current onboarding state */
  isActive: boolean;
  /** Whether the finish screen is showing */
  isFinishing: boolean;
  /** Current step index (0-based) */
  currentStep: number;
  /** Navigation direction */
  direction: 'forward' | 'backward';
  /** Progress display */
  progress: { current: number; total: number };
  /** Actions to control the tour */
  actions: OnboardingActions;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
}

/**
 * useOnboarding
 *
 * Access onboarding state and actions from any component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isActive, actions, progress } = useOnboarding();
 *   if (isActive) return <div>Onboarding in progress...</div>;
 *   return <div>{progress.current} / {progress.total}</div>;
 * }
 * ```
 */
export function useOnboarding(): UseOnboardingReturn {
  const ctx = useOnboardingContext();
  return {
    isActive: ctx.state.isActive,
    isFinishing: ctx.state.isFinishing,
    currentStep: ctx.state.currentStep,
    direction: ctx.state.direction,
    progress: ctx.progress,
    actions: ctx.actions,
    prefersReducedMotion: ctx.prefersReducedMotion,
  };
}
