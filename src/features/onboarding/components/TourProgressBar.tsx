/**
 * frontend/src/features/onboarding/components/TourProgressBar.tsx
 * Floating pill at the top of the screen: "Step X of Y · <label>" with a
 * mini progress bar, plus a "Skip tour" link at the top-right. Sits above
 * everything else in the tour, independent of where the tooltip is docked.
 */

import { motion, AnimatePresence } from 'framer-motion';

interface TourProgressBarProps {
  visible: boolean;
  current: number;
  total: number;
  label: string;
  onSkip: () => void;
  reducedMotion?: boolean;
}

export function TourProgressBar({
  visible,
  current,
  total,
  label,
  onSkip,
  reducedMotion = false,
}: TourProgressBarProps) {
  const percent = Math.min(Math.max((current / total) * 100, 0), 100);

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className="fixed left-1/2 top-5 z-[10003]"
            style={{ transform: 'translateX(-50%)' }}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 18px',
                borderRadius: '9999px',
                background: 'var(--onboarding-progress-pill-bg, #ffffff)',
                boxShadow: 'var(--onboarding-progress-pill-shadow, 0 10px 30px -8px rgba(15,23,42,0.25))',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: 'var(--onboarding-progress-text-strong, #0f172a)',
                }}
              >
                Step {current} of {total}
              </span>
              <span style={{ color: 'var(--onboarding-progress-text-muted, #cbd5e1)', fontSize: '0.84rem' }}>·</span>
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  color: 'var(--onboarding-progress-text-soft, #475569)',
                }}
              >
                {label}
              </span>

              <div
                style={{
                  width: '120px',
                  height: '6px',
                  borderRadius: '9999px',
                  background: 'var(--onboarding-progress-track, #e2e8f0)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    borderRadius: '9999px',
                    background: 'var(--onboarding-accent-solid, #6366f1)',
                  }}
                  initial={false}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </motion.div>

          <motion.button
            type="button"
            onClick={onSkip}
            className="fixed z-[10003]"
            style={{
              top: '24px',
              right: '28px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 500,
              color: 'var(--onboarding-progress-skip-text, #ffffff)',
              padding: '4px 6px',
            }}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.04 }}
            whileHover={{ opacity: 0.75 }}
          >
            Skip tour
          </motion.button>
        </>
      )}
    </AnimatePresence>
  );
}