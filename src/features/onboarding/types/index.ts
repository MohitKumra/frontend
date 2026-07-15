/**
 * frontend/src/features/onboarding/types/index.ts
 * TypeScript types for the onboarding experience.
 */

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface OnboardingStep {
  /** Unique step identifier */
  id: string;
  /** CSS selector for the target element to highlight (desktop) */
  target: string;
  /** CSS selector for the target element on mobile (e.g. bottom nav items) */
  mobileTarget?: string;
  /** Title shown in the tooltip */
  title: string;
  /** Description shown in the tooltip */
  description: string;
  /** Desired position of the tooltip/guide relative to the target */
  position: TooltipPosition;
  /** Route to navigate to before highlighting this step */
  route: string;
  /** Optional offset to adjust the spotlight/tooltip position */
  offset?: { x: number; y: number };
}

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Computed from top + height */
  readonly bottom: number;
  /** Computed from left + width */
  readonly right: number;
}

export interface OnboardingState {
  /** Whether the onboarding is currently active */
  isActive: boolean;
  /** Current step index */
  currentStep: number;
  /** Navigation direction for animations */
  direction: 'forward' | 'backward';
  /** Whether the welcome modal has been shown */
  hasSeenWelcome: boolean;
  /** Whether the finish screen is showing */
  isFinishing: boolean;
}

export interface OnboardingActions {
  /** Start the tour (from welcome screen) */
  start: () => void;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Skip the entire tour */
  skip: () => void;
  /** Complete the tour and mark as done */
  finish: () => void;
  /** Go to a specific step index */
  goToStep: (index: number) => void;
  /** Reset onboarding (for settings) */
  reset: () => void;
}

export interface GuideAnimations {
  /** Position of the guide (x, y) */
  x: number;
  y: number;
  /** Scale of the guide */
  scale: number;
  /** Rotation tilt */
  rotate: number;
  /** Opacity */
  opacity: number;
  /** Whether the guide should point */
  pointing: boolean;
  /** Whether the guide should wave */
  waving: boolean;
  /** Whether the guide should be excited (sparkles) */
  excited: boolean;
}