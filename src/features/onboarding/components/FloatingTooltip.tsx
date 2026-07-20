/**
 * frontend/src/features/onboarding/components/FloatingTooltip.tsx
 * Premium floating coach bubble.
 * Desktop: positioned next to the highlighted element.
 * Mobile: docked as a bottom sheet above the safe-area.
 * Full light/dark theme support via CSS tokens.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { SpotlightRect } from '../types';

interface FloatingTooltipProps {
  visible: boolean;
  targetRect: SpotlightRect | null;
  title: string;
  description: string;
  progress: { current: number; total: number };
  direction: 'forward' | 'backward';
  isFirst: boolean;
  isLast: boolean;
  reducedMotion?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const SETTLE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function FloatingTooltip({
  visible,
  targetRect,
  title,
  description,
  progress,
  direction,
  isFirst,
  isLast,
  reducedMotion = false,
  onNext,
  onPrev,
  onSkip,
}: FloatingTooltipProps) {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = viewport.width < 768;
  const tooltipWidth = isMobile ? viewport.width : 380;
  const gap = 18;

  const desktopPlacement = useMemo(() => {
    if (!targetRect) {
      return {
        left: Math.max((viewport.width - tooltipWidth) / 2, 16),
        top: Math.max((viewport.height - 260) / 2, 16),
      };
    }

    const placeRight = targetRect.right + gap + tooltipWidth < viewport.width - 16;
    const placeLeft  = targetRect.left  - gap - tooltipWidth > 16;
    const top = Math.min(
      Math.max(targetRect.top + targetRect.height / 2 - 140, 16),
      Math.max(viewport.height - 310, 16),
    );

    return {
      left: placeRight
        ? targetRect.right + gap
        : placeLeft
          ? targetRect.left - gap - tooltipWidth
          : Math.max((viewport.width - tooltipWidth) / 2, 16),
      top,
    };
  }, [gap, targetRect, tooltipWidth, viewport.height, viewport.width]);

  const progressPercent = (progress.current / progress.total) * 100;

  // ─── Animation variants ───────────────────────────────────────────────────

  const mobileVariants = {
    hidden:  reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 },
    visible: reducedMotion ? { opacity: 1 } : { y: 0,      opacity: 1 },
    exit:    reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 },
  };

  const desktopVariants = {
    hidden: {
      opacity: 0,
      x: direction === 'forward' ? 24 : -24,
      y: 8,
      scale: 0.97,
      filter: 'blur(3px)',
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.42, ease: SETTLE_EASE },
    },
    exit: {
      opacity: 0,
      x: direction === 'forward' ? -20 : 20,
      scale: 0.96,
      transition: { duration: 0.18, ease: 'easeOut' } as const,
    },
  };

  const variants = isMobile ? mobileVariants : desktopVariants;

  // ─── Shared card styles ────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'var(--onboarding-modal-bg)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    boxShadow: 'var(--onboarding-modal-shadow)',
    border: isMobile ? 'none' : '1px solid var(--onboarding-modal-border)',
    borderRadius: isMobile ? '24px 24px 0 0' : '22px',
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={title}
          className="fixed z-[10002]"
          style={
            isMobile
              ? {
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                }
              : {
                  left: desktopPlacement.left,
                  top: desktopPlacement.top,
                  width: tooltipWidth,
                }
          }
          variants={reducedMotion ? undefined : variants}
          initial={reducedMotion ? undefined : 'hidden'}
          animate={reducedMotion ? { opacity: 1 } : 'visible'}
          exit={reducedMotion ? { opacity: 1 } : 'exit'}
          transition={isMobile ? { type: 'spring', damping: 34, stiffness: 320 } : undefined}
          role="dialog"
          aria-label={title}
          aria-live="polite"
        >
          <div style={cardStyle}>
            {/* Gradient accent line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                borderRadius: 'inherit',
              }}
            />

            {/* Mobile handle */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '4px',
                    borderRadius: '9999px',
                    background: 'var(--onboarding-sheet-handle)',
                  }}
                />
              </div>
            )}

            <div
              style={{
                padding: isMobile ? '16px 20px' : '20px',
                paddingBottom: isMobile
                  ? 'calc(20px + env(safe-area-inset-bottom))'
                  : '20px',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  {/* Step badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '9999px',
                      padding: '4px 10px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      background: 'var(--onboarding-pill-bg)',
                      color: 'var(--onboarding-pill-text)',
                      border: '1px solid var(--onboarding-pill-border)',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    Step {progress.current} of {progress.total}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: isMobile ? '1rem' : '1.125rem',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.25,
                      color: 'var(--onboarding-modal-text-primary)',
                      margin: 0,
                    }}
                  >
                    {title}
                  </h3>
                </div>

                {/* Skip button (top-right corner) */}
                <button
                  type="button"
                  onClick={onSkip}
                  aria-label="Skip tour"
                  style={{
                    flexShrink: 0,
                    padding: '5px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    border: '1px solid var(--onboarding-skip-border)',
                    background: 'var(--onboarding-skip-bg)',
                    color: 'var(--onboarding-skip-text)',
                    cursor: 'pointer',
                    transition: 'opacity 120ms ease',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.65'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  Skip
                </button>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: isMobile ? '0.8rem' : '0.845rem',
                  lineHeight: 1.65,
                  color: 'var(--onboarding-modal-text-secondary)',
                  margin: '0 0 16px 0',
                }}
              >
                {description}
              </p>

              {/* Progress section */}
              <div style={{ marginBottom: '14px' }}>
                {/* Step dots */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(progress.total, 6)}, 1fr)`,
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {Array.from({ length: Math.min(progress.total, 6) }).map((_, i) => {
                    const active = i + 1 <= progress.current;
                    return (
                      <div
                        key={i}
                        style={{
                          height: '5px',
                          borderRadius: '9999px',
                          background: active
                            ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                            : 'var(--onboarding-step-dot-inactive)',
                          boxShadow: active ? '0 0 10px rgba(99,102,241,0.3)' : 'none',
                          transition: 'background 0.3s ease',
                        }}
                      />
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '4px',
                    borderRadius: '9999px',
                    background: 'var(--onboarding-step-dot-inactive)',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    style={{
                      height: '100%',
                      borderRadius: '9999px',
                      background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                    }}
                    initial={{ width: `${Math.max(((progress.current - 1) / progress.total) * 100, 4)}%` }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.45, ease: SETTLE_EASE }}
                  />
                </div>
              </div>

              {/* Navigation buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isFirst ? 'flex-end' : 'space-between',
                  gap: '8px',
                }}
              >
                {/* Back button */}
                {!isFirst && (
                  <button
                    type="button"
                    onClick={onPrev}
                    aria-label="Previous step"
                    style={{
                      padding: '9px 16px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: '1px solid var(--onboarding-prev-border)',
                      background: 'var(--onboarding-prev-bg)',
                      color: 'var(--onboarding-prev-text)',
                      cursor: 'pointer',
                      transition: 'transform 120ms ease, opacity 120ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                  >
                    ← Back
                  </button>
                )}

                {/* Next / Finish */}
                <motion.button
                  type="button"
                  onClick={onNext}
                  aria-label={isLast ? 'Finish tour' : 'Next step'}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '12px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 55%, #d946ef 100%)',
                    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.36)',
                    minWidth: '90px',
                  }}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                >
                  {isLast ? 'Finish 🎉' : 'Next →'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
