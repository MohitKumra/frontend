import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useFloatingEnabled } from '../../hooks/useAnimationPrefs';

interface FloatingGoalsEmptyProps {
  title?: string;
  description?: string;
  onCreateGoal?: () => void;
  ctaText?: string;
}

export function FloatingGoalsEmpty({
  title = 'No goals yet',
  description = 'Create a goal and start linking habits, tasks, and projects.',
  onCreateGoal,
  ctaText = 'Create your first goal',
}: FloatingGoalsEmptyProps = {}) {
  const floating = useFloatingEnabled();
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center"
        style={{ width: 220, height: 180 }}
      >
        {/* Dashed orbit ring */}
        <svg className="absolute inset-0" width="220" height="180" viewBox="0 0 220 180" fill="none">
          <motion.ellipse
            cx="110"
            cy="90"
            rx="100"
            ry="74"
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="5 8"
            opacity="0.35"
            animate={floating ? { rotate: 360 } : undefined}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '110px 90px' }}
          />
        </svg>

        {/* Back circle — outer ring, muted */}
        <motion.svg
          className="absolute"
          style={{ left: 10, top: 48 }}
          width="68"
          height="68"
          viewBox="0 0 68 68"
          fill="none"
          animate={floating ? { y: [0, -6, 0], rotate: [-4, -6, -4] } : undefined}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <circle
            cx="34"
            cy="34"
            r="32"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Faint bullseye rings */}
          <circle cx="34" cy="34" r="22" fill="none" stroke="var(--color-border)" strokeWidth="1" opacity="0.5" />
          <circle cx="34" cy="34" r="13" fill="none" stroke="var(--color-border)" strokeWidth="1" opacity="0.35" />
          <circle cx="34" cy="34" r="5" fill="var(--color-border)" opacity="0.4" />
        </motion.svg>

        {/* Mid circle — partial progress ring */}
        <motion.svg
          className="absolute"
          style={{ left: 52, top: 28 }}
          width="82"
          height="82"
          viewBox="0 0 82 82"
          fill="none"
          animate={floating ? { y: [0, -9, 0], rotate: [2, 4, 2] } : undefined}
          transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        >
          <defs>
            <linearGradient id="midRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-info)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <circle cx="41" cy="41" r="39" fill="url(#midRingGrad)" stroke="var(--color-border)" strokeWidth="1.5" />
          {/* Progress arc ~55% */}
          <circle
            cx="41"
            cy="41"
            r="28"
            fill="none"
            stroke="var(--color-info)"
            strokeWidth="5"
            strokeDasharray="98 80"
            strokeLinecap="round"
            strokeDashoffset="-12"
            opacity="0.45"
          />
          <circle cx="41" cy="41" r="14" fill="none" stroke="var(--color-border)" strokeWidth="1.2" opacity="0.4" />
          <circle cx="41" cy="41" r="5" fill="var(--color-info)" opacity="0.5" />
        </motion.svg>

        {/* Front main target — accent glow */}
        <motion.svg
          className="absolute"
          style={{ left: 100, top: 8 }}
          width="108"
          height="108"
          viewBox="0 0 108 108"
          fill="none"
          animate={floating ? { y: [0, -13, 0] } : undefined}
          transition={{ duration: 3.3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <radialGradient id="goalFrontGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.06" />
            </radialGradient>
            <filter id="goalGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="goalShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Outer glow circle */}
          <motion.circle
            cx="54"
            cy="54"
            r="52"
            fill="url(#goalFrontGrad)"
            stroke="var(--color-accent)"
            strokeWidth="2"
            filter="url(#goalShadow)"
            animate={floating ? { opacity: [0.8, 1, 0.8] } : undefined}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Progress ring ~70% */}
          <motion.circle
            cx="54"
            cy="54"
            r="40"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="6"
            strokeDasharray="176 76"
            strokeLinecap="round"
            strokeDashoffset="-20"
            opacity="0.75"
            animate={floating ? { strokeDasharray: ['140 112', '200 52', '140 112'] } : undefined}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Inner ring */}
          <circle
            cx="54"
            cy="54"
            r="26"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            opacity="0.3"
            strokeDasharray="3 4"
          />

          {/* Center bullseye */}
          <motion.circle
            cx="54"
            cy="54"
            r="12"
            fill="var(--color-accent)"
            opacity="0.2"
            animate={floating ? { r: [10, 14, 10] } : undefined}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx="54" cy="54" r="7" fill="var(--color-accent)" filter="url(#goalGlow)" opacity="0.9" />

          {/* Arrow pointing to center */}
          <motion.g
            animate={floating ? { x: [0, 3, 0] } : undefined}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          >
            <line
              x1="18"
              y1="54"
              x2="40"
              y2="54"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M34 48 L42 54 L34 60"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
          </motion.g>

          {/* Milestone tick marks */}
          {[0, 72, 144, 216, 288].map((angle, i) => {
            const rad = (angle - 90) * (Math.PI / 180);
            const x1 = 54 + 46 * Math.cos(rad);
            const y1 = 54 + 46 * Math.sin(rad);
            const x2 = 54 + 40 * Math.cos(rad);
            const y2 = 54 + 40 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-accent)"
                strokeWidth={i === 0 ? 2.5 : 1.5}
                strokeLinecap="round"
                opacity={i === 0 ? 0.8 : 0.35}
              />
            );
          })}

          {/* Small star at top milestone */}
          <motion.g
            animate={floating ? { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] } : undefined}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '54px 6px' }}
          >
            <circle cx="54" cy="6" r="3.5" fill="var(--color-warning)" opacity="0.85" />
          </motion.g>
        </motion.svg>

        {/* Shadow beneath stack */}
        <svg
          className="absolute bottom-0 left-1/2"
          style={{ transform: 'translateX(-50%)' }}
          width="150"
          height="18"
          viewBox="0 0 150 18"
          fill="none"
        >
          <ellipse
            cx="75"
            cy="9"
            rx="65"
            ry="6"
            fill="currentColor"
            opacity="0.07"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </svg>

        {/* Floating sparkle dots */}
        {[
          { x: 16, y: 14, delay: 0, size: 6 },
          { x: 188, y: 22, delay: 0.4, size: 5 },
          { x: 38, y: 148, delay: 0.8, size: 5 },
          { x: 174, y: 136, delay: 1.2, size: 6 },
          { x: 106, y: 4, delay: 0.6, size: 4 },
          { x: 8, y: 88, delay: 1.0, size: 4 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: dot.size,
              height: dot.size,
              left: dot.x,
              top: dot.y,
              background:
                i % 3 === 0 ? 'var(--color-accent)' : i % 3 === 1 ? 'var(--color-warning)' : 'var(--color-success)',
            }}
            animate={floating ? { scale: [1, 1.7, 1], opacity: [0.25, 0.75, 0.25], y: [0, -7, 0] } : undefined}
            transition={{
              duration: 2.2 + i * 0.3,
              repeat: Infinity,
              delay: dot.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Text + CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-6 text-center flex flex-col items-center"
      >
        <p className="text-sm sm:text-base font-black text-text-primary mb-1.5">{title}</p>
        <p className="text-xs sm:text-sm text-text-muted mb-5 max-w-xs leading-relaxed">{description}</p>

        {/* Feature hint pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
          {[
            { label: 'Link Habits', color: 'var(--color-accent)' },
            { label: 'Track Progress', color: 'var(--color-warning)' },
            { label: 'Hit Milestones', color: 'var(--color-success)' },
          ].map((hint, i) => (
            <motion.span
              key={hint.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
              style={{
                background: `color-mix(in srgb, ${hint.color} 12%, transparent)`,
                color: hint.color,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: hint.color, opacity: 0.8 }} />
              {hint.label}
            </motion.span>
          ))}
        </div>

        {onCreateGoal && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateGoal}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={18} />
            <span>{ctaText}</span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
