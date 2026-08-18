import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useFloatingEnabled } from '../../hooks/useAnimationPrefs';

interface FloatingProjectsEmptyProps {
  title?: string;
  description?: string;
  onCreateProject?: () => void;
  ctaText?: string;
  showCtaHint?: boolean;
}

export function FloatingProjectsEmpty({
  title = 'No active projects yet',
  description = 'Get started today — create your first project',
  onCreateProject,
  ctaText = 'Click "View all" to get started',
  showCtaHint = true,
}: FloatingProjectsEmptyProps = {}) {
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
        {/* Dashed orbit ring */}
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

        {/* Back folder */}
        <motion.svg
          className="absolute"
          style={{ left: 8, top: 44 }}
          width="72"
          height="60"
          viewBox="0 0 72 60"
          fill="none"
          animate={floating ? { y: [0, -7, 0], rotate: [-3, -5, -3] } : undefined}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <rect
            x="2"
            y="14"
            width="68"
            height="44"
            rx="7"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <path
            d="M2 14 C2 11 4 8 7 8 L28 8 L34 3 L65 3 C68 3 70 5 70 8 L70 14 Z"
            fill="var(--color-border)"
            opacity="0.5"
          />
        </motion.svg>

        {/* Middle folder */}
        <motion.svg
          className="absolute"
          style={{ left: 48, top: 28 }}
          width="82"
          height="66"
          viewBox="0 0 82 66"
          fill="none"
          animate={floating ? { y: [0, -9, 0], rotate: [1, 3, 1] } : undefined}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        >
          <rect
            x="2"
            y="16"
            width="78"
            height="48"
            rx="7"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <path
            d="M2 16 C2 13 4 10 7 10 L32 10 L38 4 L74 4 C77 4 80 6 80 9 L80 16 Z"
            fill="color-mix(in srgb, var(--color-info) 30%, var(--color-border))"
            opacity="0.6"
          />
          {/* Lines inside */}
          <rect x="12" y="30" width="36" height="3" rx="1.5" fill="var(--color-border)" opacity="0.5" />
          <rect x="12" y="38" width="26" height="3" rx="1.5" fill="var(--color-border)" opacity="0.35" />
        </motion.svg>

        {/* Front folder — accent colored */}
        <motion.svg
          className="absolute"
          style={{ left: 88, top: 10 }}
          width="100"
          height="82"
          viewBox="0 0 100 82"
          fill="none"
          animate={floating ? { y: [0, -12, 0] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <linearGradient id="projFolderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-info)" stopOpacity="0.28" />
            </linearGradient>
            <filter id="projShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" floodOpacity="0.18" />
            </filter>
          </defs>
          {/* Folder body */}
          <rect
            x="2"
            y="20"
            width="96"
            height="60"
            rx="9"
            fill="url(#projFolderGrad)"
            stroke="var(--color-accent)"
            strokeWidth="2"
            filter="url(#projShadow)"
          />
          {/* Folder tab */}
          <path
            d="M2 20 C2 17 4 14 7 14 L38 14 L44 7 L90 7 C93 7 96 10 96 13 L96 20 Z"
            fill="var(--color-accent)"
            opacity="0.45"
          />
          {/* Lines inside representing tasks */}
          <rect x="14" y="36" width="50" height="4" rx="2" fill="var(--color-accent)" opacity="0.25" />
          <rect x="14" y="46" width="38" height="4" rx="2" fill="var(--color-accent)" opacity="0.18" />
          <rect x="14" y="56" width="44" height="4" rx="2" fill="var(--color-accent)" opacity="0.12" />
          {/* Progress bar hint */}
          <rect x="14" y="66" width="68" height="4" rx="2" fill="var(--color-border)" opacity="0.4" />
          <rect x="14" y="66" width="28" height="4" rx="2" fill="var(--color-accent)" opacity="0.5" />
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
          { x: 14, y: 12, delay: 0 },
          { x: 170, y: 20, delay: 0.4 },
          { x: 40, y: 130, delay: 0.8 },
          { x: 155, y: 120, delay: 1.2 },
          { x: 95, y: 4, delay: 0.6 },
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

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-5 text-center flex flex-col items-center"
      >
        <p className="text-sm sm:text-base font-bold text-text-primary mb-1">{title}</p>
        <p className="text-xs sm:text-sm text-text-muted mb-4 max-w-xs">{description}</p>

        {onCreateProject ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateProject}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={18} />
            <span>Create Project</span>
          </motion.button>
        ) : showCtaHint ? (
          <motion.div
            className="inline-flex items-center gap-1.5 text-xs font-bold"
            style={{ color: 'var(--color-accent)' }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span>{ctaText}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7 H11 M8 4 L11 7 L8 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}
