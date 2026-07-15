/**
 * frontend/src/features/onboarding/components/FloatingTooltip.tsx
 * Premium floating coach bubble with responsive desktop and mobile layouts.
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
  const tooltipWidth = isMobile ? Math.min(viewport.width - 24, 390) : 380;
  const gap = isMobile ? 12 : 18;

  const desktopPlacement = useMemo(() => {
    if (!targetRect) {
      return {
        left: Math.max((viewport.width - tooltipWidth) / 2, 16),
        top: Math.max((viewport.height - 260) / 2, 16),
      };
    }

    const placeRight = targetRect.right + gap + tooltipWidth < viewport.width - 16;
    const placeLeft = targetRect.left - gap - tooltipWidth > 16;
    const top = Math.min(
      Math.max(targetRect.top + targetRect.height / 2 - 140, 16),
      Math.max(viewport.height - 290, 16),
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
  const accentLabel = progress.current === 1 ? 'Launch' : isLast ? 'Final step' : 'Continue';

  const variants = {
    hidden: {
      opacity: 0,
      x: direction === 'forward' ? 28 : -28,
      y: isMobile ? 14 : 8,
      scale: 0.97,
      filter: 'blur(3px)',
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.45, ease: SETTLE_EASE },
    },
    exit: {
      opacity: 0,
      x: direction === 'forward' ? -24 : 24,
      scale: 0.96,
      transition: { duration: 0.18, ease: 'easeOut' } as const,
    },
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
                  left: '50%',
                  bottom: 18,
                  width: tooltipWidth,
                  transform: 'translateX(-50%)',
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
          role="dialog"
          aria-label={title}
          aria-live="polite"
        >
          <div
            className="relative overflow-hidden rounded-[28px] border"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.88) 100%)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              borderColor: 'rgba(255,255,255,0.46)',
              boxShadow:
                '0 24px 80px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.55)',
              maxHeight: isMobile ? Math.min(viewport.height * 0.68, 420) : undefined,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }}
            />

            <div className="absolute inset-x-0 top-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.72), transparent)' }} />

            <div className="relative p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      background: 'rgba(255,255,255,0.7)',
                      borderColor: 'rgba(129,140,248,0.16)',
                      color: 'var(--color-text-muted, #9ca3af)',
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, #6366f1, #d946ef)' }} />
                    Step {progress.current} of {progress.total}
                  </div>
                  <h3
                    className="mt-3 text-[18px] sm:text-[20px] font-black tracking-tight text-balance"
                    style={{ color: 'var(--color-text-primary, #111827)' }}
                  >
                    {title}
                  </h3>
                </div>

                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 10%, white)',
                    color: 'var(--color-accent)',
                  }}
                >
                  {accentLabel}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {description}
              </p>

              <div className="mt-4 space-y-2.5">
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: Math.min(progress.total, 4) }).map((_, i) => {
                    const stepNum = i + 1;
                    const active = stepNum <= progress.current;
                    return (
                      <div
                        key={stepNum}
                        className="h-1.5 rounded-full"
                        style={{
                          background: active
                            ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                            : 'rgba(148,163,184,0.25)',
                          boxShadow: active ? '0 0 18px rgba(99,102,241,0.18)' : 'none',
                        }}
                      />
                    );
                  })}
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }}
                    initial={{ width: `${Math.max(((progress.current - 1) / progress.total) * 100, 4)}%` }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.45, ease: SETTLE_EASE }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={onPrev}
                      className="rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                      style={{
                        background: 'rgba(255,255,255,0.65)',
                        color: 'var(--color-text-secondary, #6b7280)',
                        borderColor: 'rgba(148,163,184,0.24)',
                      }}
                      aria-label="Previous step"
                    >
                      Previous
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onSkip}
                    className="rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:opacity-70"
                    style={{
                      background: 'rgba(255,255,255,0.65)',
                      color: 'var(--color-text-muted, #9ca3af)',
                      borderColor: 'rgba(148,163,184,0.18)',
                    }}
                    aria-label="Skip tour"
                  >
                    Skip
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7, #d946ef)',
                    boxShadow: '0 10px 24px rgba(99, 102, 241, 0.32)',
                  }}
                  aria-label={isLast ? 'Finish tour' : 'Next step'}
                >
                  {isLast ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
