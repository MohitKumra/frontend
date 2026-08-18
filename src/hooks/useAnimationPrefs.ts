// frontend/src/hooks/useAnimationPrefs.ts
// Per-account animation preferences (synced from the backend settings) exposed
// from the uiStore cache so components can conditionally enable/disable
// animation categories without touching the backend directly.

import { useUIStore } from '../store/uiStore';

export interface AnimationPrefs {
  pageTransitionsEnabled: boolean;
  floatingAnimationsEnabled: boolean;
}

/** Read the animation preference flags (local cache of backend settings). */
export function useAnimationPrefs(): AnimationPrefs {
  const pageTransitionsEnabled = useUIStore((s) => s.pageTransitionsEnabled);
  const floatingAnimationsEnabled = useUIStore((s) => s.floatingAnimationsEnabled);
  return { pageTransitionsEnabled, floatingAnimationsEnabled };
}

/** Convenience selector for the floating/ambient animation category. */
export function useFloatingEnabled(): boolean {
  return useUIStore((s) => s.floatingAnimationsEnabled);
}

/** Convenience selector for the page-transition animation category. */
export function usePageTransitionsEnabled(): boolean {
  return useUIStore((s) => s.pageTransitionsEnabled);
}
