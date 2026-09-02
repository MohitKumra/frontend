import type { Variants } from 'framer-motion';
import { usePageTransitionsEnabled } from '../hooks/useAnimationPrefs';

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Container variants used to re-trigger the staggered fade+slide
 * animation whenever the analytics date filter changes. The exit
 * variant reverse-staggers children out quickly so the new range's
 * content can cascade in while the queries refetch in the background.
 */
export const filterContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

// No-op variants used when the user disables page transitions in
// Settings → Appearance. Keeping `hidden` identical to `visible` means
// content renders fully opaque and in place immediately — no fade, no
// slide, no stagger — while hover/tap animations (which use their own
// `whileHover`/`hover:` transforms) are unaffected.
const instantContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { duration: 0, staggerChildren: 0, delayChildren: 0 } },
};

const instantItemVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

/**
 * Reactive page-entrance variants. Returns the real stagger/fade/slide
 * variants when page transitions are enabled, or instant no-op variants
 * when the user turns them off.
 */
export function usePageVariants(): { containerVariants: Variants; itemVariants: Variants } {
  const pageTransitionsEnabled = usePageTransitionsEnabled();
  return pageTransitionsEnabled
    ? { containerVariants, itemVariants }
    : { containerVariants: instantContainerVariants, itemVariants: instantItemVariants };
}

