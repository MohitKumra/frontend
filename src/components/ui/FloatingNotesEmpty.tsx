import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FloatingNotesEmptyProps {
  title?: string;
  description?: string;
  onCreateNote?: () => void;
  actionText?: string;
  isJournal?: boolean;
}

export function FloatingNotesEmpty({
  title = 'No Journal / Notes found',
  description = 'Get started by creating your first note or journal entry.',
  onCreateNote,
  actionText,
  isJournal = false,
}: FloatingNotesEmptyProps = {}) {
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
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '100px 80px' }}
          />
        </svg>

        {/* Back note paper */}
        <motion.svg
          className="absolute"
          style={{ left: 10, top: 42 }}
          width="74"
          height="62"
          viewBox="0 0 74 62"
          fill="none"
          animate={{ y: [0, -6, 0], rotate: [-5, -7, -5] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <rect
            x="2"
            y="2"
            width="70"
            height="58"
            rx="7"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Folded corner */}
          <path d="M56 2 L72 18 L56 18 Z" fill="var(--color-border)" opacity="0.4" />
          <line
            x1="12"
            y1="16"
            x2="44"
            y2="16"
            stroke="var(--color-border)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <line
            x1="12"
            y1="28"
            x2="60"
            y2="28"
            stroke="var(--color-border)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          <line
            x1="12"
            y1="38"
            x2="52"
            y2="38"
            stroke="var(--color-border)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.3"
          />
        </motion.svg>

        {/* Middle journal book */}
        <motion.svg
          className="absolute"
          style={{ left: 48, top: 24 }}
          width="84"
          height="74"
          viewBox="0 0 84 74"
          fill="none"
          animate={{ y: [0, -8, 0], rotate: [2, 4, 2] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        >
          {/* Book spine */}
          <rect x="2" y="2" width="10" height="70" rx="3" fill="var(--color-accent)" opacity="0.7" />
          {/* Book cover */}
          <rect
            x="12"
            y="2"
            width="70"
            height="70"
            rx="7"
            fill="var(--color-surface-raised)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Bookmark ribbon */}
          <path d="M48 2 L48 38 L54 32 L60 38 L60 2 Z" fill="var(--color-accent)" opacity="0.5" />
          {/* Page lines */}
          <line
            x1="22"
            y1="20"
            x2="40"
            y2="20"
            stroke="var(--color-border)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <line
            x1="22"
            y1="32"
            x2="62"
            y2="32"
            stroke="var(--color-border)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          <line
            x1="22"
            y1="42"
            x2="54"
            y2="42"
            stroke="var(--color-border)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="22"
            y1="52"
            x2="60"
            y2="52"
            stroke="var(--color-border)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.25"
          />
        </motion.svg>

        {/* Front main open notebook card — glowing accent style */}
        <motion.svg
          className="absolute"
          style={{ left: 88, top: 8 }}
          width="102"
          height="90"
          viewBox="0 0 102 90"
          fill="none"
          animate={{ y: [0, -11, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <linearGradient id="noteCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-surface-raised)" stopOpacity="0.96" />
              <stop offset="100%" stopColor="var(--color-surface)" stopOpacity="0.98" />
            </linearGradient>
            <filter id="noteCardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Notebook cover */}
          <rect
            x="2"
            y="2"
            width="98"
            height="86"
            rx="10"
            fill="url(#noteCardGrad)"
            stroke="var(--color-accent)"
            strokeWidth="2"
            filter="url(#noteCardShadow)"
          />

          {/* Spiral binding rings at top */}
          {[16, 32, 48, 64, 80].map((cx) => (
            <g key={cx}>
              <rect x={cx - 3} y="0" width="6" height="8" rx="2" fill="var(--color-accent)" />
              <circle cx={cx} cy="4" r="1.5" fill="var(--color-surface-raised)" />
            </g>
          ))}

          {/* Header title badge */}
          <rect x="14" y="18" width="42" height="6" rx="3" fill="var(--color-accent)" opacity="0.85" />

          {/* Mood / Category Tag */}
          <rect
            x="68"
            y="16"
            width="20"
            height="10"
            rx="5"
            fill="color-mix(in srgb, var(--color-accent) 22%, transparent)"
            stroke="var(--color-accent)"
            strokeWidth="1"
          />
          <circle cx="78" cy="21" r="2" fill="var(--color-accent)" />

          {/* Text line skeletons */}
          <line
            x1="14"
            y1="36"
            x2="86"
            y2="36"
            stroke="var(--color-text-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="14"
            y1="46"
            x2="74"
            y2="46"
            stroke="var(--color-text-secondary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.5"
          />
          <line
            x1="14"
            y1="56"
            x2="80"
            y2="56"
            stroke="var(--color-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          <line
            x1="14"
            y1="66"
            x2="60"
            y2="66"
            stroke="var(--color-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Quill / Pen tip decoration */}
          <motion.g
            animate={{ rotate: [-4, 4, -4], y: [0, -2, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '78px 68px' }}
          >
            <path d="M72 74 L84 62 L88 66 L76 78 Z" fill="var(--color-accent)" opacity="0.8" />
            <path d="M70 76 L72 74 L76 78 Z" fill="var(--color-text-primary)" />
          </motion.g>
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
          { x: 172, y: 22, delay: 0.4 },
          { x: 36, y: 130, delay: 0.8 },
          { x: 156, y: 116, delay: 1.2 },
          { x: 94, y: 4, delay: 0.6 },
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
            animate={{
              scale: [1, 1.6, 1],
              opacity: [0.25, 0.7, 0.25],
              y: [0, -6, 0],
            }}
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

        {onCreateNote && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateNote}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={18} />
            <span>{actionText || (isJournal ? 'Create Journal Entry' : 'Create Note')}</span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
