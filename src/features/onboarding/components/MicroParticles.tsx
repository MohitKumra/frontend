/**
 * frontend/src/features/onboarding/components/MicroParticles.tsx
 * Floating micro particles that orbit the AI guide.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface MicroParticlesProps {
  /** Number of particles */
  count?: number;
  /** Whether the animation should play */
  animate?: boolean;
  /** Reduced motion mode */
  reducedMotion?: boolean;
}

interface Particle {
  id: number;
  /** Orbit radius */
  radius: number;
  /** Starting angle (degrees) */
  angle: number;
  /** Orbit speed (seconds per revolution) */
  speed: number;
  /** Particle size (px) */
  size: number;
  /** Color */
  color: string;
  /** Delay before animation starts */
  delay: number;
  /** Glow spread multiplier — varied so particles don't all glow identically */
  glow: number;
}

const PARTICLE_COLORS = [
  'rgba(129, 140, 248, 0.65)', // indigo
  'rgba(217, 70, 239, 0.5)', // fuchsia
  'rgba(236, 72, 153, 0.45)', // pink
  'rgba(96, 165, 250, 0.55)', // blue
  'rgba(167, 139, 250, 0.5)', // violet
  'rgba(199, 210, 254, 0.6)', // pale indigo
];

export function MicroParticles({ count = 6, animate = true, reducedMotion = false }: MicroParticlesProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      radius: 30 + (i % 3) * 15,
      angle: (360 / count) * i + Math.random() * 24,
      speed: 7 + (i % 4) * 3.2,
      size: 2 + (i % 3),
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      delay: (i / count) * 2.2,
      glow: 1.5 + (i % 3) * 0.6,
    }));
  }, [count]);

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ width: 0, height: 0 }} aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * p.glow * 2}px ${p.color}`,
            left: 0,
            top: 0,
          }}
          initial={false}
          animate={
            animate
              ? {
                  x: [
                    Math.cos((p.angle * Math.PI) / 180) * p.radius,
                    Math.cos(((p.angle + 180) * Math.PI) / 180) * p.radius,
                    Math.cos((p.angle * Math.PI) / 180) * p.radius,
                  ],
                  y: [
                    Math.sin((p.angle * Math.PI) / 180) * p.radius,
                    Math.sin(((p.angle + 180) * Math.PI) / 180) * p.radius,
                    Math.sin((p.angle * Math.PI) / 180) * p.radius,
                  ],
                  opacity: [0.85, 0.25, 0.85],
                  scale: [1, 0.45, 1],
                }
              : {}
          }
          transition={{
            duration: p.speed,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
