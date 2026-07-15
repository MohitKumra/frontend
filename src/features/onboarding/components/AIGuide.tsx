/**
 * frontend/src/features/onboarding/components/AIGuide.tsx
 * Fixed-position onboarding guide that reuses the shared premium orb art.
 */

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MicroParticles } from './MicroParticles';
import { PremiumOrb } from './PremiumOrb';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const size = sizeProp ?? (isMobile ? 56 : 80);
  const springX = useSpring(x, { damping: 22, stiffness: 120, mass: 0.9 });
  const springY = useSpring(y, { damping: 22, stiffness: 120, mass: 0.9 });
  const springScale = useSpring(scale, { damping: 18, stiffness: 260 });
  const springRotate = useSpring(tilt, { damping: 14, stiffness: 110 });

  const hoverSeed = useMotionValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      hoverSeed.set((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hoverSeed, reducedMotion]);

  const driftX = useTransform(hoverSeed, (t) => Math.sin(t * 0.8) * 1.5);
  const driftY = useTransform(hoverSeed, (t) => Math.cos(t * 0.6) * 1.1);

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
      initial={
        entering
          ? { scale: 0.3, opacity: 0, filter: 'blur(8px)' }
          : { scale: 1, opacity: 1, filter: 'blur(0px)' }
      }
      animate={
        exiting
          ? { scale: 0.4, opacity: 0, filter: 'blur(6px)' }
          : { scale: 1, opacity: 1, filter: 'blur(0px)' }
      }
      transition={
        exiting
          ? { duration: 0.35, ease: SETTLE_EASE }
          : entering
            ? { duration: 0.7, ease: SETTLE_EASE }
            : undefined
      }
      aria-hidden="true"
    >
      <motion.div style={{ x: driftX, y: driftY }}>
        <PremiumOrb
          size={size}
          reducedMotion={reducedMotion}
          showPointer={pointing}
          showWave={waving}
          showSparkles={excited}
        />
      </motion.div>

      <MicroParticles count={6} animate={!reducedMotion} reducedMotion={reducedMotion} />
    </motion.div>
  );
}
