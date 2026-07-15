/**
 * frontend/src/features/onboarding/components/PremiumOrb.tsx
 * Shared premium SVG orb used by the onboarding welcome card, finish card,
 * and the live assistant guide.
 */

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useId, useMemo } from 'react';

interface PremiumOrbProps {
  size?: number;
  reducedMotion?: boolean;
  showPointer?: boolean;
  showWave?: boolean;
  showSparkles?: boolean;
  className?: string;
}

export function PremiumOrb({
  size = 88,
  reducedMotion = false,
  showPointer = false,
  showWave = false,
  showSparkles = false,
  className = '',
}: PremiumOrbProps) {
  const uid = useId();
  const coreId = `${uid}-core`;
  const rimId = `${uid}-rim`;
  const glowId = `${uid}-glow`;
  const shineId = `${uid}-shine`;
  const ringId = `${uid}-ring`;
  const ringSoftId = `${uid}-ring-soft`;

  const gazeSeed = useMotionValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      gazeSeed.set((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gazeSeed, reducedMotion]);

  const gazeX = useTransform(gazeSeed, (t) => Math.sin(t * 0.7) * 1.3);
  const gazeY = useTransform(gazeSeed, (t) => Math.cos(t * 0.55) * 0.9);

  const sparkles = useMemo(
    () => [
      { d: 'M 18 22 L 20 16 L 22 22 L 28 24 L 22 26 L 20 32 L 18 26 L 12 24 Z', delay: 0 },
      { d: 'M 78 27 L 80 22 L 82 27 L 87 29 L 82 31 L 80 36 L 78 31 L 73 29 Z', delay: 0.35 },
      { d: 'M 19 74 L 21 69 L 23 74 L 28 76 L 23 78 L 21 83 L 19 78 L 14 76 Z', delay: 0.55 },
    ],
    [],
  );

  return (
    <motion.div
      className={['relative inline-block select-none', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      animate={reducedMotion ? undefined : { y: [0, -2.5, 0] }}
      transition={reducedMotion ? undefined : { duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(129,140,248,0.34) 0%, rgba(168,85,247,0.17) 42%, transparent 72%)',
          filter: 'blur(14px)',
          transform: 'scale(1.1)',
          animation: reducedMotion ? 'none' : 'orbGlowPulse 4.8s ease-in-out infinite',
        }}
      />

      <svg viewBox="0 0 100 100" width={size} height={size} className="relative drop-shadow-[0_10px_24px_rgba(79,70,229,0.24)]">
        <defs>
          <radialGradient id={coreId} cx="38%" cy="32%" r="66%">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="18%" stopColor="#c7d2fe" />
            <stop offset="42%" stopColor="#a5b4fc" />
            <stop offset="70%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </radialGradient>

          <radialGradient id={rimId} cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="rgba(255,255,255,0)" />
            <stop offset="93%" stopColor="rgba(238,242,255,0.42)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.1)" />
          </radialGradient>

          <radialGradient id={shineId} cx="32%" cy="25%" r="48%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <radialGradient id={glowId} cx="72%" cy="72%" r="35%">
            <stop offset="0%" stopColor="rgba(196,181,253,0.24)" />
            <stop offset="100%" stopColor="rgba(196,181,253,0)" />
          </radialGradient>

          <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(129,140,248,0.25)" />
            <stop offset="45%" stopColor="rgba(217,70,239,0.75)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0.25)" />
          </linearGradient>

          <linearGradient id={ringSoftId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.52)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>

          <filter id={`${uid}-filter`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {!reducedMotion ? (
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`url(#${ringId})`}
            strokeWidth="1.25"
            strokeDasharray="1 5"
            strokeLinecap="round"
            opacity={0.72}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: 'center' }}
          />
        ) : (
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`url(#${ringId})`}
            strokeWidth="1.25"
            strokeDasharray="1 5"
            opacity={0.6}
          />
        )}

        {!reducedMotion && (
          <motion.circle
            cx="50"
            cy="50"
            r="41"
            fill="none"
            stroke={`url(#${ringSoftId})`}
            strokeWidth="0.8"
            strokeDasharray="0.5 4"
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: 'center' }}
          />
        )}

        <circle cx="50" cy="50" r="38" fill={`url(#${coreId})`} filter={`url(#${uid}-filter)`} />
        <circle cx="50" cy="50" r="38" fill={`url(#${glowId})`} />
        <circle cx="50" cy="50" r="38" fill={`url(#${rimId})`} />

        <ellipse cx="37" cy="33" rx="16" ry="12" fill={`url(#${shineId})`} />
        <ellipse cx="30" cy="30" rx="4.5" ry="3" fill="rgba(255,255,255,0.9)" opacity={0.85} />

        {!reducedMotion ? (
          <motion.g style={{ x: gazeX, y: gazeY }}>
            <motion.g
              animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
              transition={{
                duration: 4.2,
                repeat: Infinity,
                times: [0, 0.46, 0.5, 0.54, 1],
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '50px 48px' }}
            >
              <ellipse cx="38" cy="48" rx="5" ry="5.4" fill="white" opacity={0.95} />
              <ellipse cx="38.8" cy="47.2" rx="2.6" ry="3" fill="#1e1b4b" opacity={0.85} />
              <ellipse cx="37" cy="46" rx="0.9" ry="1" fill="white" opacity={0.9} />
              <ellipse cx="62" cy="48" rx="5" ry="5.4" fill="white" opacity={0.95} />
              <ellipse cx="62.8" cy="47.2" rx="2.6" ry="3" fill="#1e1b4b" opacity={0.85} />
              <ellipse cx="61" cy="46" rx="0.9" ry="1" fill="white" opacity={0.9} />
            </motion.g>
          </motion.g>
        ) : (
          <g>
            <ellipse cx="38" cy="48" rx="5" ry="5.4" fill="white" opacity={0.95} />
            <ellipse cx="38.8" cy="47.2" rx="2.6" ry="3" fill="#1e1b4b" opacity={0.85} />
            <ellipse cx="62" cy="48" rx="5" ry="5.4" fill="white" opacity={0.95} />
            <ellipse cx="62.8" cy="47.2" rx="2.6" ry="3" fill="#1e1b4b" opacity={0.85} />
          </g>
        )}

        {!reducedMotion ? (
          <motion.path
            d="M 40 62 Q 50 70 60 62"
            fill="none"
            stroke="rgba(255,255,255,0.68)"
            strokeWidth="2"
            strokeLinecap="round"
            filter={`url(#${uid}-filter)`}
            animate={{
              d: [
                'M 40 62 Q 50 70 60 62',
                'M 40 62 Q 50 67.5 60 62',
                'M 40 62 Q 50 70 60 62',
              ],
            }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <path
            d="M 40 62 Q 50 70 60 62"
            fill="none"
            stroke="rgba(255,255,255,0.68)"
            strokeWidth="2"
            strokeLinecap="round"
            filter={`url(#${uid}-filter)`}
          />
        )}

        {showPointer && (
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            <motion.path
              d="M 78 28 L 95 18 L 89 36 Z"
              fill="rgba(238, 242, 255, 0.9)"
              filter={`url(#${uid}-filter)`}
              animate={reducedMotion ? {} : { y: [0, -4, 0], opacity: [0.72, 1, 0.72] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.g>
        )}

        {showWave && (
          <motion.g
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: [0, -18, 16, -18, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '70px 55px' }}
          >
            <path
              d="M 72 55 Q 79 46 84 51 Q 88 56 81 61 Q 76 64 72 58 Z"
              fill="rgba(238, 242, 255, 0.88)"
              filter={`url(#${uid}-filter)`}
            />
          </motion.g>
        )}

        {showSparkles && (
          <>
            <motion.circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="rgba(251,191,36,0.45)"
              strokeWidth="1.4"
              initial={{ scale: 1, opacity: 0.55 }}
              animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              style={{ transformOrigin: 'center' }}
            />
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {sparkles.map((sparkle, index) => (
                <motion.path
                  key={sparkle.d}
                  d={sparkle.d}
                  fill={index === 1 ? 'rgba(217, 70, 239, 0.8)' : 'rgba(251, 191, 36, 0.82)'}
                  animate={{
                    scale: index === 0 ? [0.84, 1.18, 0.84] : [0.78, 1.24, 0.78],
                    rotate: index === 1 ? [0, -40, 0] : [0, 48, 0],
                  }}
                  transition={{
                    duration: 2 + index * 0.35,
                    repeat: Infinity,
                    delay: sparkle.delay,
                  }}
                  style={{ transformOrigin: 'center' }}
                />
              ))}
            </motion.g>
          </>
        )}

        <ellipse cx="50" cy="83" rx="19" ry="3.5" fill="rgba(67,56,202,0.12)" />
      </svg>

      <style>{`
        @keyframes orbGlowPulse {
          0%, 100% { opacity: 0.58; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </motion.div>
  );
}
