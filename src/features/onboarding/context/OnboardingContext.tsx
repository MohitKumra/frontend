/**
 * frontend/src/features/onboarding/context/OnboardingContext.tsx
 * React Context provider for onboarding tour state management.
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  OnboardingActions,
  OnboardingState,
  SpotlightRect,
} from '../types';
import { ONBOARDING_STEPS, TOTAL_STEPS } from '../config/steps';
import { hasCompletedOnboarding, markOnboardingComplete } from '../utils/storage';
import { getTargetRect, scrollToTarget } from '../utils/spotlight';

// ─── Context Value ────────────────────────────────────────────────────────────

interface OnboardingContextValue {
  state: OnboardingState;
  actions: OnboardingActions;
  /** The bounding rect of the current target element */
  targetRect: SpotlightRect | null;
  /** The current step config */
  currentStepConfig: (typeof ONBOARDING_STEPS)[number] | null;
  /** Progress number for display (e.g. "3 / 8") */
  progress: { current: number; total: number };
  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// ─── Hook for consuming context ───────────────────────────────────────────────

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) {
    throw new Error(
      'useOnboardingContext must be used within an OnboardingProvider',
    );
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface OnboardingProviderProps {
  children: React.ReactNode;
  /** If true, onboarding will automatically check localStorage and show if not completed */
  autoStart?: boolean;
}

export function OnboardingProvider({
  children,
  autoStart = false,
}: OnboardingProviderProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState>({
    isActive: false,
    currentStep: 0,
    direction: 'forward',
    hasSeenWelcome: false,
    isFinishing: false,
  });
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  // Detect reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Auto-start onboarding if enabled and user hasn't completed it yet
  useEffect(() => {
    if (autoStart && !hasCompletedOnboarding()) {
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Compute target rect when step changes
  const currentStepConfig = useMemo(() => {
    if (!state.isActive || state.isFinishing) return null;
    if (state.currentStep < 0 || state.currentStep >= TOTAL_STEPS)
      return null;
    return ONBOARDING_STEPS[state.currentStep];
  }, [state.isActive, state.currentStep, state.isFinishing]);

  // Update target rect on step change, route change, and resize
  useEffect(() => {
    if (!currentStepConfig) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const rect = getTargetRect(currentStepConfig.target);
      setTargetRect(rect);
    };

    // Initial measurement after a short delay (for DOM to render after route change)
    const timer = setTimeout(updateRect, 400);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [currentStepConfig]);

  // Keyboard listeners (ESC, arrows)
  useEffect(() => {
    if (!state.isActive || state.isFinishing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isActive, state.isFinishing, state.currentStep]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      hasSeenWelcome: false,
      currentStep: 0,
      direction: 'forward',
    }));
  }, []);

  const handleNext = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= TOTAL_STEPS - 1) {
        return { ...prev, isFinishing: true, direction: 'forward' };
      }
      return {
        ...prev,
        currentStep: prev.currentStep + 1,
        direction: 'forward',
      };
    });
  }, []);

  const handlePrev = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep <= 0) return prev;
      return {
        ...prev,
        currentStep: prev.currentStep - 1,
        direction: 'backward',
      };
    });
  }, []);

  const handleSkip = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      hasSeenWelcome: false,
      isFinishing: false,
      currentStep: 0,
    }));
  }, []);

  const handleFinish = useCallback(() => {
    markOnboardingComplete();
    setState((prev) => ({
      ...prev,
      isActive: false,
      isFinishing: false,
      hasSeenWelcome: false,
      currentStep: 0,
    }));
    navigate('/');
  }, [navigate]);

  const handleGoToStep = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(index, TOTAL_STEPS - 1)),
      direction: index > prev.currentStep ? 'forward' : 'backward',
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState({
      isActive: false,
      currentStep: 0,
      direction: 'forward',
      hasSeenWelcome: false,
      isFinishing: false,
    });
  }, []);

  // Navigate to the step's route when step changes
  useEffect(() => {
    if (!currentStepConfig || !state.isActive) return;
    if (state.isFinishing) return;

    navigate(currentStepConfig.route);
    scrollToTarget(currentStepConfig.target);
  }, [currentStepConfig, state.isActive, state.isFinishing, navigate]);

  const actions: OnboardingActions = useMemo(
    () => ({
      start: handleStart,
      next: handleNext,
      prev: handlePrev,
      skip: handleSkip,
      finish: handleFinish,
      goToStep: handleGoToStep,
      reset: handleReset,
    }),
    [
      handleStart,
      handleNext,
      handlePrev,
      handleSkip,
      handleFinish,
      handleGoToStep,
      handleReset,
    ],
  );

  const value: OnboardingContextValue = useMemo(
    () => ({
      state,
      actions,
      targetRect,
      currentStepConfig,
      progress: {
        current: state.currentStep + 1,
        total: TOTAL_STEPS,
      },
      prefersReducedMotion,
    }),
    [
      state,
      actions,
      targetRect,
      currentStepConfig,
      prefersReducedMotion,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}