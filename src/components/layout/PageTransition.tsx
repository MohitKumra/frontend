import type { ReactNode } from 'react';
import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      // Initial render is instant (no animation on first paint)
      // Only animate on exit/re-enter (page navigation)
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
      style={{
        position: 'relative',
        zIndex: 1,
      }}
    >
      {children}
    </motion.div>
  );
}