import type { Variants } from 'framer-motion';

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
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
