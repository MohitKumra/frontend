import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useFloatingEnabled } from '../../hooks/useAnimationPrefs';

interface FloatingTasksEmptyProps {
  title?: string;
  description?: string;
  onCreateTask?: () => void;
  suggestions?: { label: string; icon: React.ReactNode; action: () => void }[];
}

export function FloatingTasksEmpty({
  title = 'No tasks yet',
  description = 'Start by adding your first task — title, due date, and priority is all you need.',
  onCreateTask,
  suggestions,
}: FloatingTasksEmptyProps = {}) {
  const floating = useFloatingEnabled();
  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center"
        style={{ width: 200, height: 160 }}
      >
        {/* Dashed Orbit Ring */}
        <svg className="absolute inset-0" width="200" height="160" viewBox="0 0 200 160" fill="none">
          <motion.ellipse
            cx="100"
            cy="80"
            rx="90"
            ry="65"
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="5 8"
            opacity="0.35"
            animate={floating ? { rotate: 360 } : undefined}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '100px 80px' }}
          />
        </svg>

        {/* Back task card */}
        <motion.svg
          className="absolute"
          style={{ left: 12, top: 40 }}
          width="76"
          height="66"
          viewBox="0 0 76 66"
          fill="none"
          animate={floating ? { y: [0, -6, 0], rotate: [-4, -6, -4] } : undefined}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <rect
            x="2"
            y="2"
            width="72"
            height="62"
            rx="8"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <circle cx="14" cy="18" r="5" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <rect x="25" y="16" width="38" height="4" rx="2" fill="var(--color-border)" opacity="0.6" />
          <circle cx="14" cy="34" r="5" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <rect x="25" y="32" width="28" height="4" rx="2" fill="var(--color-border)" opacity="0.4" />
          <circle cx="14" cy="50" r="5" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <rect x="25" y="48" width="34" height="4" rx="2" fill="var(--color-border)" opacity="0.3" />
        </motion.svg>

        {/* Middle task card */}
        <motion.svg
          className="absolute"
          style={{ left: 52, top: 24 }}
          width="86"
          height="72"
          viewBox="0 0 86 72"
          fill="none"
          animate={floating ? { y: [0, -9, 0], rotate: [2, 4, 2] } : undefined}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        >
          <rect
            x="2"
            y="2"
            width="82"
            height="68"
            rx="9"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Checkbox completed */}
          <circle
            cx="16"
            cy="20"
            r="6"
            fill="color-mix(in srgb, var(--color-success) 30%, transparent)"
            stroke="var(--color-success)"
            strokeWidth="1.5"
          />
          <path
            d="M13 20 L15 22 L19 18"
            stroke="var(--color-success)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="28" y="18" width="46" height="4" rx="2" fill="var(--color-border)" opacity="0.7" />
          {/* Checkbox pending */}
          <circle cx="16" cy="38" r="6" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <rect x="28" y="36" width="32" height="4" rx="2" fill="var(--color-border)" opacity="0.4" />
          {/* Checkbox pending */}
          <circle cx="16" cy="56" r="6" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <rect x="28" y="54" width="40" height="4" rx="2" fill="var(--color-border)" opacity="0.3" />
        </motion.svg>

        {/* Front main task card — accent styled */}
        <motion.svg
          className="absolute"
          style={{ left: 92, top: 8 }}
          width="100"
          height="88"
          viewBox="0 0 100 88"
          fill="none"
          animate={floating ? { y: [0, -12, 0] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <linearGradient id="taskCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-surface-raised)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--color-surface)" stopOpacity="0.98" />
            </linearGradient>
            <filter id="taskCardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Card body */}
          <rect
            x="2"
            y="2"
            width="96"
            height="84"
            rx="10"
            fill="url(#taskCardGrad)"
            stroke="var(--color-accent)"
            strokeWidth="2"
            filter="url(#taskCardShadow)"
          />

          {/* Top header accent bar */}
          <rect x="12" y="12" width="32" height="5" rx="2.5" fill="var(--color-accent)" opacity="0.8" />
          <rect
            x="70"
            y="12"
            width="18"
            height="14"
            rx="4"
            fill="color-mix(in srgb, var(--color-accent) 20%, transparent)"
            stroke="var(--color-accent)"
            strokeWidth="1"
          />
          <path
            d="M76 19 L79 22 L83 16"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Task item 1 with animated check */}
          <motion.g
            animate={floating ? { opacity: [0.7, 1, 0.7] } : undefined}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <circle cx="20" cy="34" r="7" fill="var(--color-accent)" />
            <path
              d="M16.5 34 L19 36.5 L23.5 31.5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="34" y="32" width="50" height="4.5" rx="2" fill="var(--color-text-primary)" opacity="0.75" />
          </motion.g>

          {/* Task item 2 */}
          <circle cx="20" cy="52" r="7" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" />
          <rect x="34" y="50" width="38" height="4.5" rx="2" fill="var(--color-text-muted)" opacity="0.5" />

          {/* Task item 3 */}
          <circle cx="20" cy="70" r="7" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <rect x="34" y="68" width="44" height="4.5" rx="2" fill="var(--color-border)" opacity="0.5" />
        </motion.svg>

        {/* Shadow under the stack */}
        <svg
          className="absolute bottom-0 left-1/2"
          style={{ transform: 'translateX(-50%)' }}
          width="140"
          height="16"
          viewBox="0 0 140 16"
          fill="none"
        >
          <ellipse
            cx="70"
            cy="8"
            rx="60"
            ry="5"
            fill="currentColor"
            opacity="0.07"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </svg>

        {/* Floating sparkle dots */}
        {[
          { x: 16, y: 14, delay: 0 },
          { x: 168, y: 18, delay: 0.4 },
          { x: 38, y: 128, delay: 0.8 },
          { x: 154, y: 118, delay: 1.2 },
          { x: 92, y: 6, delay: 0.6 },
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

      {/* Text & Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-5 text-center flex flex-col items-center max-w-sm px-4"
      >
        <p className="text-base sm:text-lg font-bold text-text-primary mb-1">{title}</p>
        <p className="text-xs sm:text-sm text-text-muted mb-6 leading-relaxed">{description}</p>

        {suggestions && suggestions.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={suggestion.action}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  i === 0 ? 'text-white shadow-md hover:shadow-lg' : 'border'
                }`}
                style={
                  i === 0
                    ? { background: 'var(--gradient-accent)' }
                    : {
                        background: 'var(--color-surface-raised)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }
                }
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
              </motion.button>
            ))}
          </div>
        ) : onCreateTask ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateTask}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={18} />
            <span>Create Task</span>
          </motion.button>
        ) : null}
      </motion.div>
    </div>
  );
}
