/**
 * frontend/src/features/onboarding/components/AIGuide.tsx
 * Fixed-position onboarding guide. Redesigned from the glowing orb mascot
 * to a small indigo pointer badge — the same icon-badge language as
 * FloatingTooltip's icon slot — since the light tour system doesn't carry
 * a character. Position/spring behavior and the public prop API are
 * unchanged, so existing call sites keep working.
 */

import { motion, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AIGuideProps {
  x: number;
  y: number;
  scale?: number;
  tilt?: number;
  pointing?: boolean;
  waving?: boolean;
  excited?: boolean;
  entering?: boolean;
  exiting?: boolean;
  reducedMotion?: boolean;
  size?: number;
}

const SETTLE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Cursor glyph — the badge's default/pointing state. Reads as "this is what's guiding you," not a face.
const CursorGlyph = () => (
  <svg width="46%" height="46%" viewBox="0 0 20 20" fill="none">
    <path d="M5 3.5 L15.5 9.5 L10.8 10.9 L8.7 15.3 Z" fill="white" />
  </svg>
);

// Small hand-wave glyph for the greeting state.
const WaveGlyph = () => (
  <svg width="48%" height="48%" viewBox="0 0 20 20" fill="none">
    <path
      d="M6 12.5c-1-2-1.4-4 .2-6.4.5-.8 1.7-.6 1.7.4v3M9 12V4.6c0-1 1.5-1 1.5 0V11M11.5 11V5.4c0-1 1.5-1 1.5 0V11M14 11V7c0-1 1.5-1 1.5 0v6c0 3-1.8 5-4.8 5-2.4 0-3.7-1-4.7-2.6"
      stroke="white"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function AIGuide({
  x,
  y,
  scale = 1,
  tilt = 0,
  pointing = false,
  waving = false,
  excited = false,
  entering = false,
  exiting = false,
  reducedMotion = false,
  size: sizeProp,
}: AIGuideProps) {
  const isMobile = useIsMobile();
  const size = sizeProp ?? (isMobile ? 34 : 42);

  const springX = useSpring(x, { damping: 22, stiffness: 120, mass: 0.9 });
  const springY = useSpring(y, { damping: 22, stiffness: 120, mass: 0.9 });
  const springScale = useSpring(scale, { damping: 18, stiffness: 260 });
  const springRotate = useSpring(tilt, { damping: 14, stiffness: 110 });

  return (
    <motion.div
      className="fixed pointer-events-none z-[10001]"
      style={{
        x: springX,
        y: springY,
        scale: springScale,
        rotate: springRotate,
        width: size,
        height: size,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
      initial={entering ? { scale: 0.5, opacity: 0 } : { scale: 1, opacity: 1 }}
      animate={exiting ? { scale: 0.6, opacity: 0 } : { scale: 1, opacity: 1 }}
      transition={
        exiting ? { duration: 0.25, ease: SETTLE_EASE } : entering ? { duration: 0.4, ease: SETTLE_EASE } : undefined
      }
      aria-hidden="true"
    >
      {/* Celebratory pulse ring — the one place this component spends motion */}
      {excited && !reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'var(--onboarding-accent-solid, #6366f1)' }}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: [0.4, 0], scale: [1, 1.9] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Badge */}
      <motion.div
        className="relative w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: 'var(--onboarding-accent-solid, #6366f1)',
          boxShadow: 'var(--onboarding-guide-shadow, 0 8px 20px -4px rgba(99,102,241,0.5))',
          border: '2px solid var(--onboarding-guide-ring, #ffffff)',
        }}
        animate={reducedMotion ? undefined : waving ? { rotate: [0, -14, 12, -10, 0] } : { y: [0, -3, 0] }}
        transition={
          waving
            ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {waving ? <WaveGlyph /> : <CursorGlyph />}
      </motion.div>

      {/* Small directional nub when actively pointing at something */}
      {pointing && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 8,
            height: 8,
            background: 'var(--onboarding-accent-solid, #6366f1)',
            border: '2px solid var(--onboarding-guide-ring, #ffffff)',
            right: -2,
            bottom: -2,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 260 }}
        />
      )}
    </motion.div>
  );
}
