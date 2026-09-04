import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePageTransitionsEnabled } from '../../hooks/useAnimationPrefs';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page-level transition wrapper.
 *
 * IMPORTANT: This intentionally has NO `exit` animation. When combined with
 * `AnimatePresence mode="wait"`, an exit animation blocks the new page from
 * mounting until the old page's exit completes. On mobile, that exit can get
 * interrupted (e.g. rAF throttling during a fast tab switch), leaving the
 * content area blank until a refresh. By omitting `exit`, the old page
 * unmounts immediately and the new page always mounts — the fade-in still
 * plays for a smooth feel, but content can never get stuck hidden.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const reducedMotion = useReducedMotion();
  const pageTransitionsEnabled = usePageTransitionsEnabled();

  // Skip the fade when the user prefers reduced motion OR has disabled
  // page transitions in Settings → Appearance.
  if (reducedMotion || !pageTransitionsEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: 1 }}
      style={{
        position: 'relative',
        zIndex: 1,
        height: className?.includes('h-full') ? '100%' : undefined,
      }}
    >
      {children}
    </motion.div>
  );
}
