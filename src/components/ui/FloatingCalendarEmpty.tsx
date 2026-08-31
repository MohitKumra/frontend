import { motion } from 'framer-motion';
import { useFloatingEnabled } from '../../hooks/useAnimationPrefs';

export function FloatingCalendarEmpty() {
  const floating = useFloatingEnabled();
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        {/* Floating calendar SVG */}
        <motion.svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          animate={
            floating
              ? {
                  y: [0, -10, 0],
                }
              : undefined
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Shadow */}
          <ellipse
            cx="60"
            cy="110"
            rx="35"
            ry="4"
            fill="currentColor"
            opacity="0.1"
            style={{ color: 'var(--color-text-muted)' }}
          />

          {/* Calendar base */}
          <rect
            x="20"
            y="25"
            width="80"
            height="70"
            rx="8"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="2"
          />

          {/* Calendar header */}
          <rect
            x="20"
            y="25"
            width="80"
            height="18"
            rx="8"
            fill="var(--color-accent)"
          />
          <rect x="20" y="35" width="80" height="8" fill="var(--color-accent)" />

          {/* Binding rings */}
          <motion.circle
            cx="35"
            cy="25"
            r="3"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          />
          <motion.circle
            cx="60"
            cy="25"
            r="3"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.55 }}
          />
          <motion.circle
            cx="85"
            cy="25"
            r="3"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          />

          {/* Calendar grid dots */}
          {[
            [30, 52],
            [40, 52],
            [50, 52],
            [60, 52],
            [70, 52],
            [80, 52],
            [90, 52],
            [30, 62],
            [40, 62],
            [50, 62],
            [60, 62],
            [70, 62],
            [80, 62],
            [90, 62],
            [30, 72],
            [40, 72],
            [50, 72],
            [60, 72],
            [70, 72],
            [80, 72],
            [90, 72],
            [30, 82],
            [40, 82],
            [50, 82],
            [60, 82],
            [70, 82],
            [80, 82],
            [90, 82],
          ].map(([x, y], index) => (
            <motion.circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="2"
              fill="var(--color-border)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: 0.3, delay: 0.7 + index * 0.02 }}
            />
          ))}

          {/* Highlighted today dot */}
          <motion.circle
            cx="60"
            cy="62"
            r="4"
            fill="var(--color-accent)"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5, delay: 1.5 }}
          />
        </motion.svg>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: 'var(--color-accent)',
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 3) * 20}%`,
            }}
            animate={
              floating
                ? {
                    y: [0, -20, 0],
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.5, 1],
                  }
                : undefined
            }
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-6 text-center"
      >
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          No tasks planned for today
        </h3>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Add a due date to see your plan here
        </p>
      </motion.div>
    </div>
  );
}
