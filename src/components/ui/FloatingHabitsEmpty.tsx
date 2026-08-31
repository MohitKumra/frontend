import { motion } from 'framer-motion';
import { Plus, Sparkles, Flame, Target, Trophy } from 'lucide-react';
import { Button } from './Button';
import { useFloatingEnabled } from '../../hooks/useAnimationPrefs';

interface FloatingHabitsEmptyProps {
  title?: string;
  description?: string;
  onCreateHabit: () => void;
}

export function FloatingHabitsEmpty({
  title = 'Build your daily habits',
  description = 'Track daily progress, build unbreakable streaks, and transform your routines step by step.',
  onCreateHabit,
}: FloatingHabitsEmptyProps) {
  const floating = useFloatingEnabled();
  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center">
      {/* ── Floating SVG Illustration Stack ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center mb-6"
        style={{ width: 220, height: 170 }}
      >
        {/* Dashed Orbit Ring */}
        <svg className="absolute inset-0" width="220" height="170" viewBox="0 0 220 170" fill="none">
          <motion.ellipse
            cx="110"
            cy="85"
            rx="100"
            ry="70"
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="5 8"
            opacity="0.35"
            animate={floating ? { rotate: 360 } : undefined}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '110px 85px' }}
          />
        </svg>

        {/* Back card — Streak Flame Card */}
        <motion.svg
          className="absolute"
          style={{ left: 10, top: 40 }}
          width="80"
          height="68"
          viewBox="0 0 80 68"
          fill="none"
          animate={floating ? { y: [0, -7, 0], rotate: [-5, -7, -5] } : undefined}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <rect
            x="2"
            y="2"
            width="76"
            height="64"
            rx="8"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Flame outline background */}
          <path
            d="M40 14 C44 22 52 26 52 36 C52 45 46 50 40 50 C34 50 28 45 28 36 C28 28 34 22 40 14 Z"
            fill="color-mix(in srgb, var(--color-warning) 25%, transparent)"
            stroke="var(--color-warning)"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <circle cx="20" cy="20" r="4" fill="var(--color-border)" opacity="0.4" />
          <circle cx="60" cy="20" r="4" fill="var(--color-border)" opacity="0.4" />
        </motion.svg>

        {/* Middle card — Weekly Habit Matrix */}
        <motion.svg
          className="absolute"
          style={{ left: 52, top: 22 }}
          width="90"
          height="76"
          viewBox="0 0 90 76"
          fill="none"
          animate={floating ? { y: [0, -9, 0], rotate: [2, 4, 2] } : undefined}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        >
          <rect
            x="2"
            y="2"
            width="86"
            height="72"
            rx="9"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* 7 Days tracker row */}
          {[16, 28, 40, 52, 64, 76].map((x, idx) => (
            <circle
              key={x}
              cx={x}
              cy="24"
              r="4.5"
              fill={idx % 2 === 0 ? 'var(--color-success)' : 'none'}
              stroke={idx % 2 === 0 ? 'none' : 'var(--color-border)'}
              strokeWidth="1.5"
              opacity={idx % 2 === 0 ? 0.7 : 0.4}
            />
          ))}
          <rect x="14" y="42" width="48" height="4" rx="2" fill="var(--color-border)" opacity="0.5" />
          <rect x="14" y="54" width="34" height="4" rx="2" fill="var(--color-border)" opacity="0.35" />
        </motion.svg>

        {/* Front main card — Glowing Target & Concentric Rings */}
        <motion.svg
          className="absolute"
          style={{ left: 96, top: 6 }}
          width="106"
          height="94"
          viewBox="0 0 106 94"
          fill="none"
          animate={floating ? { y: [0, -12, 0] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <linearGradient id="habitCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-surface-raised)" stopOpacity="0.96" />
              <stop offset="100%" stopColor="var(--color-surface)" stopOpacity="0.98" />
            </linearGradient>
            <filter id="habitCardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Card body */}
          <rect
            x="2"
            y="2"
            width="102"
            height="90"
            rx="10"
            fill="url(#habitCardGrad)"
            stroke="var(--color-accent)"
            strokeWidth="2"
            filter="url(#habitCardShadow)"
          />

          {/* Target concentric rings */}
          <circle
            cx="34"
            cy="38"
            r="22"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="2"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <circle cx="34" cy="38" r="15" fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity="0.4" />
          <motion.circle
            cx="34"
            cy="38"
            r="8"
            fill="var(--color-accent)"
            animate={floating ? { scale: [0.9, 1.15, 0.9] } : undefined}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Streak Flame Badge */}
          <g transform="translate(68, 14)">
            <rect
              x="0"
              y="0"
              width="24"
              height="24"
              rx="7"
              fill="color-mix(in srgb, var(--color-warning) 20%, transparent)"
              stroke="var(--color-warning)"
              strokeWidth="1.2"
            />
            <path
              d="M12 4 C14.5 9 19.5 11.5 19.5 16 C19.5 20.1 16.1 22 12 22 C7.9 22 4.5 20.1 4.5 16 C4.5 11.5 9.5 9 12 4 Z"
              fill="var(--color-warning)"
            />
          </g>

          {/* Habit title line */}
          <rect x="14" y="68" width="56" height="4.5" rx="2" fill="var(--color-text-primary)" opacity="0.75" />

          {/* Progress bar */}
          <rect x="14" y="78" width="76" height="5" rx="2.5" fill="var(--color-border)" opacity="0.4" />
          <rect
            x="14"
            y="78"
            width="54"
            height="5"
            rx="2.5"
            fill="var(--color-accent)"
          />
        </motion.svg>

        {/* Shadow under the stack */}
        <svg
          className="absolute bottom-0 left-1/2"
          style={{ transform: 'translateX(-50%)' }}
          width="150"
          height="16"
          viewBox="0 0 150 16"
          fill="none"
        >
          <ellipse
            cx="75"
            cy="8"
            rx="65"
            ry="5"
            fill="currentColor"
            opacity="0.07"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </svg>

        {/* Floating particle sparkles */}
        {[
          { x: 14, y: 14, delay: 0 },
          { x: 182, y: 22, delay: 0.4 },
          { x: 38, y: 136, delay: 0.8 },
          { x: 170, y: 126, delay: 1.2 },
          { x: 102, y: 4, delay: 0.6 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 2 === 0 ? 6 : 5,
              height: i % 2 === 0 ? 6 : 5,
              left: dot.x,
              top: dot.y,
              background:
                i % 3 === 0 ? 'var(--color-accent)' : i % 3 === 1 ? 'var(--color-info)' : 'var(--color-warning)',
            }}
            animate={floating ? { scale: [1, 1.6, 1], opacity: [0.25, 0.7, 0.25], y: [0, -6, 0] } : undefined}
            transition={{
              duration: 2.2 + i * 0.3,
              repeat: Infinity,
              delay: dot.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* ── Content & Features ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col items-center max-w-md px-4"
      >
        <h3 className="text-xl sm:text-2xl font-black text-text-primary mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-text-muted mb-6 leading-relaxed max-w-sm">{description}</p>

        {/* Interactive Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8">
          {[
            { icon: <Target size={16} className="text-accent" />, label: 'Track Progress', desc: 'Daily completion' },
            { icon: <Flame size={16} stroke="#f59e0b" fill="#f59e0b" />, label: 'Build Streaks', desc: 'Consistency' },
            { icon: <Trophy size={16} className="text-info" />, label: 'Earn Badges', desc: 'Level up daily' },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="p-3.5 rounded-2xl border text-left flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
              >
                {feature.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">{feature.label}</p>
                <p className="text-[10px] text-text-muted">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <Button
            onClick={onCreateHabit}
            leftIcon={<Plus size={18} />}
            rightIcon={<Sparkles size={16} />}
            size="lg"
            className="font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            style={{
              background: 'var(--gradient-accent)',
              boxShadow: '0 12px 24px rgba(108, 99, 255, 0.35)',
            }}
          >
            Create Your First Habit
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
