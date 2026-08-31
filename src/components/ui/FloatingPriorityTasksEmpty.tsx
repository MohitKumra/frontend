import { motion } from 'framer-motion';
import { Flag, Target, Zap } from 'lucide-react';
import { useFloatingEnabled } from '../../hooks/useAnimationPrefs';

interface FloatingPriorityTasksEmptyProps {
  title?: string;
  description?: string;
  onViewAllTasks?: () => void;
}

export function FloatingPriorityTasksEmpty({
  title = 'No priority tasks',
  description = "All clear! When you mark tasks as high priority, they'll appear here.",
  onViewAllTasks,
}: FloatingPriorityTasksEmptyProps = {}) {
  const floating = useFloatingEnabled();
  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center"
        style={{ width: 180, height: 140 }}
      >
        {/* Dashed Orbit Ring */}
        <svg className="absolute inset-0" width="180" height="140" viewBox="0 0 180 140" fill="none">
          <motion.ellipse
            cx="90"
            cy="70"
            rx="80"
            ry="58"
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="5 8"
            opacity="0.35"
            animate={floating ? { rotate: 360 } : undefined}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '90px 70px' }}
          />
        </svg>

        {/* Back card — Low priority */}
        <motion.svg
          className="absolute"
          style={{ left: 8, top: 36 }}
          width="66"
          height="58"
          viewBox="0 0 66 58"
          fill="none"
          animate={floating ? { y: [0, -5, 0], rotate: [-3, -5, -3] } : undefined}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <rect
            x="2"
            y="2"
            width="62"
            height="54"
            rx="7"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Low priority flag */}
          <rect
            x="10"
            y="12"
            width="16"
            height="14"
            rx="3"
            fill="color-mix(in srgb, var(--color-success) 15%, transparent)"
            stroke="var(--color-success)"
            strokeWidth="1"
          />
          <path d="M14 16 L18 16 L20 19 L18 22 L14 22" fill="var(--color-success)" opacity="0.6" />
          <rect x="10" y="32" width="42" height="3" rx="1.5" fill="var(--color-border)" opacity="0.5" />
          <rect x="10" y="40" width="30" height="3" rx="1.5" fill="var(--color-border)" opacity="0.35" />
        </motion.svg>

        {/* Middle card — Medium priority */}
        <motion.svg
          className="absolute"
          style={{ left: 46, top: 22 }}
          width="76"
          height="64"
          viewBox="0 0 76 64"
          fill="none"
          animate={floating ? { y: [0, -8, 0], rotate: [1, 3, 1] } : undefined}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        >
          <rect
            x="2"
            y="2"
            width="72"
            height="60"
            rx="8"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Medium priority flag */}
          <rect
            x="12"
            y="14"
            width="18"
            height="16"
            rx="4"
            fill="color-mix(in srgb, var(--color-info) 20%, transparent)"
            stroke="var(--color-info)"
            strokeWidth="1.2"
          />
          <path d="M16 18 L22 18 L25 22 L22 26 L16 26" fill="var(--color-info)" opacity="0.5" />
          <rect x="12" y="36" width="50" height="3.5" rx="1.75" fill="var(--color-border)" opacity="0.5" />
          <rect x="12" y="44" width="36" height="3.5" rx="1.75" fill="var(--color-border)" opacity="0.35" />
        </motion.svg>

        {/* Front main card — High/Critical priority with glow */}
        <motion.svg
          className="absolute"
          style={{ left: 84, top: 6 }}
          width="90"
          height="76"
          viewBox="0 0 90 76"
          fill="none"
          animate={floating ? { y: [0, -10, 0] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <linearGradient id="priorityCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--color-danger)" stopOpacity="0.22" />
            </linearGradient>
            <filter id="priorityCardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" floodOpacity="0.18" />
            </filter>
            <filter id="priorityGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Card body */}
          <rect
            x="2"
            y="2"
            width="86"
            height="72"
            rx="9"
            fill="url(#priorityCardGrad)"
            stroke="var(--color-danger)"
            strokeWidth="2"
            filter="url(#priorityCardShadow)"
          />

          {/* Priority flag icon with glow */}
          <g transform="translate(12, 12)">
            <motion.circle
              cx="10"
              cy="10"
              r="12"
              fill="var(--color-danger)"
              opacity="0.15"
              animate={floating ? { scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] } : undefined}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <rect x="2" y="2" width="16" height="16" rx="4" fill="var(--color-danger)" opacity="0.25" />
            <path d="M6 6 L12 6 L14.5 10 L12 14 L6 14 Z" fill="var(--color-danger)" filter="url(#priorityGlow)" />
          </g>

          {/* Target icon with rings */}
          <g transform="translate(56, 12)">
            <circle
              cx="10"
              cy="10"
              r="9"
              fill="none"
              stroke="var(--color-warning)"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.4"
            />
            <circle cx="10" cy="10" r="6" fill="none" stroke="var(--color-warning)" strokeWidth="1.2" opacity="0.6" />
            <motion.circle
              cx="10"
              cy="10"
              r="3"
              fill="var(--color-warning)"
              animate={floating ? { scale: [0.9, 1.2, 0.9] } : undefined}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
          </g>

          {/* Task lines */}
          <rect x="14" y="42" width="56" height="4" rx="2" fill="var(--color-text-primary)" opacity="0.65" />
          <rect x="14" y="52" width="42" height="4" rx="2" fill="var(--color-text-muted)" opacity="0.45" />

          {/* Priority indicator bar */}
          <rect x="14" y="62" width="62" height="4" rx="2" fill="var(--color-border)" opacity="0.4" />
          <rect
            x="14"
            y="62"
            width="18"
            height="4"
            rx="2"
            fill="var(--color-danger)"
          />
        </motion.svg>

        {/* Shadow under the stack */}
        <svg
          className="absolute bottom-0 left-1/2"
          style={{ transform: 'translateX(-50%)' }}
          width="130"
          height="16"
          viewBox="0 0 130 16"
          fill="none"
        >
          <ellipse
            cx="65"
            cy="8"
            rx="55"
            ry="5"
            fill="currentColor"
            opacity="0.07"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </svg>

        {/* Floating sparkle dots */}
        {[
          { x: 12, y: 10, delay: 0 },
          { x: 158, y: 16, delay: 0.4 },
          { x: 34, y: 118, delay: 0.8 },
          { x: 148, y: 108, delay: 1.2 },
          { x: 86, y: 4, delay: 0.6 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 2 === 0 ? 5 : 4,
              height: i % 2 === 0 ? 5 : 4,
              left: dot.x,
              top: dot.y,
              background:
                i % 3 === 0 ? 'var(--color-danger)' : i % 3 === 1 ? 'var(--color-warning)' : 'var(--color-accent)',
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

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-4 text-center flex flex-col items-center max-w-xs px-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--icon-bg-success)', color: 'var(--icon-text-success)' }}
          >
            <Target size={14} />
          </div>
          <p className="text-sm sm:text-base font-bold text-text-primary">{title}</p>
        </div>
        <p className="text-xs sm:text-sm text-text-muted mb-5 leading-relaxed">{description}</p>

        {/* Feature hints */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {[
            { icon: <Flag size={12} />, label: 'Set Priority', color: 'var(--color-danger)' },
            { icon: <Zap size={12} />, label: 'Track Progress', color: 'var(--color-warning)' },
          ].map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
              style={{
                background: `color-mix(in srgb, ${hint.color} 12%, transparent)`,
                color: hint.color,
              }}
            >
              {hint.icon}
              <span>{hint.label}</span>
            </motion.div>
          ))}
        </div>

        {onViewAllTasks && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onViewAllTasks}
            className="text-xs font-bold flex items-center gap-1 transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            <span>View all tasks</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 6 H9 M7 4 L9 6 L7 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
