import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

interface FloatingAnalyticsEmptyProps {
  compact?: boolean;
  message?: string;
  subMessage?: string;
}

export function FloatingAnalyticsEmpty({
  compact = false,
  message = 'No data to display yet',
  subMessage = 'Complete tasks and habits to see your analytics',
}: FloatingAnalyticsEmptyProps = {}) {
  if (compact) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Soft glow orbs */}
        <motion.div
          className="absolute w-24 h-24 rounded-full blur-2xl opacity-15"
          style={{ background: 'var(--color-accent)', left: '15%', top: '20%' }}
          animate={{ x: [0, 20, 0], y: [0, -12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-20 h-20 rounded-full blur-2xl opacity-15"
          style={{ background: 'var(--color-success)', right: '15%', bottom: '20%' }}
          animate={{ x: [0, -15, 0], y: [0, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating ghost bar chart */}
        <motion.svg
          width="160"
          height="80"
          viewBox="0 0 160 80"
          className="absolute opacity-[0.08]"
          style={{ color: 'var(--color-accent)' }}
        >
          {[18, 40, 62, 30, 72, 52, 80].map((h, i) => (
            <motion.rect
              key={i}
              x={i * 22 + 4}
              y={80 - h}
              width="16"
              height={h}
              fill="currentColor"
              rx="3"
              animate={{ height: [h * 0.5, h, h * 0.85, h], y: [80 - h * 0.5, 80 - h, 80 - h * 0.85, 80 - h] }}
              transition={{ duration: 3, delay: i * 0.15, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            />
          ))}
        </motion.svg>

        {/* Floating icons at corners */}
        <motion.div
          className="absolute top-3 left-6"
          animate={{ y: [0, -8, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BarChart3 size={28} className="opacity-10" style={{ color: 'var(--color-accent)' }} />
        </motion.div>
        <motion.div
          className="absolute bottom-4 right-8"
          animate={{ y: [0, 7, 0], rotate: [0, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          <TrendingUp size={24} className="opacity-10" style={{ color: 'var(--color-info)' }} />
        </motion.div>
        <motion.div
          className="absolute top-4 right-10"
          animate={{ y: [0, -6, 0], x: [0, 4, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <Activity size={22} className="opacity-10" style={{ color: 'var(--color-warning)' }} />
        </motion.div>

        {/* Sparkle dots */}
        {[
          { x: '8%', y: '60%', color: 'var(--color-accent)', delay: 0 },
          { x: '88%', y: '25%', color: 'var(--color-success)', delay: 0.5 },
          { x: '50%', y: '10%', color: 'var(--color-warning)', delay: 1 },
          { x: '75%', y: '75%', color: 'var(--color-info)', delay: 0.7 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ left: dot.x, top: dot.y, background: dot.color }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: dot.delay, ease: 'easeInOut' }}
          />
        ))}

        {/* Center text */}
        <div className="relative z-10 text-center space-y-1.5">
          <motion.p
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-muted)' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {message}
          </motion.p>
          <motion.p
            className="text-[10px]"
            style={{ color: 'var(--color-text-tertiary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {subMessage}
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[280px] flex items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <motion.div
        className="absolute w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--color-accent)' }}
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--color-success)', right: 40 }}
        animate={{
          x: [0, -20, 0],
          y: [0, 30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating chart elements */}
      <motion.div
        className="absolute top-8 left-12"
        animate={{
          y: [0, -15, 0],
          rotate: [0, 5, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative">
          <BarChart3 size={48} className="opacity-10" style={{ color: 'var(--color-accent)' }} />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-12 right-16"
        animate={{
          y: [0, 12, 0],
          rotate: [0, -5, 0],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <PieChart size={40} className="opacity-10" style={{ color: 'var(--color-success)' }} />
      </motion.div>

      <motion.div
        className="absolute top-16 right-20"
        animate={{
          y: [0, -10, 0],
          x: [0, 5, 0],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <TrendingUp size={36} className="opacity-10" style={{ color: 'var(--color-info)' }} />
      </motion.div>

      <motion.div
        className="absolute bottom-20 left-20"
        animate={{
          y: [0, 10, 0],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      >
        <Activity size={44} className="opacity-10" style={{ color: 'var(--color-warning)' }} />
      </motion.div>

      {/* Floating bar chart illustration */}
      <motion.svg
        width="200"
        height="120"
        viewBox="0 0 200 120"
        className="absolute opacity-10"
        style={{ color: 'var(--color-accent)' }}
      >
        {[20, 45, 70, 35, 85, 60, 90].map((height, i) => (
          <motion.rect
            key={i}
            x={i * 28 + 5}
            y={120 - height}
            width="20"
            height={height}
            fill="currentColor"
            rx="4"
            initial={{ height: 0, y: 120 }}
            animate={{
              height: [0, height, height * 0.9, height],
              y: [120, 120 - height, 120 - height * 0.9, 120 - height],
            }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        ))}
      </motion.svg>

      {/* Center message */}
      <div className="relative z-10 text-center space-y-2">
        <motion.p
          className="text-sm font-bold"
          style={{ color: 'var(--color-text-muted)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>
        <motion.p
          className="text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {subMessage}
        </motion.p>
      </div>
    </div>
  );
}
