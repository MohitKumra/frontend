/**
 * frontend/src/features/onboarding/components/FloatingTooltip.tsx
 * Coach card, redesigned to match a clean, light product-tour style:
 * white rounded card, a colored icon badge, a small "STEP X OF Y" pill,
 * and a thin connector line + dots running from the card to the
 * highlighted element (desktop only — mobile docks as a bottom sheet).
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
  /** Small icon shown in the badge next to the title. Defaults to a dot. */
  icon?: React.ReactNode;
  reducedMotion?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const SETTLE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const DefaultIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="4" fill="var(--onboarding-accent-solid, #6366f1)" />
  </svg>
);

// ─── Connector: dot on the target, dot on the card, line between ───────────

function Connector({
  targetRect,
  cardSide,
  cardX,
  cardTop,
  reducedMotion = false,
}: {
  targetRect: SpotlightRect;
  cardSide: 'right' | 'left' | 'bottom';
  cardX: number;
  cardTop?: number;
  reducedMotion?: boolean;
}) {
  const isHorizontal = cardSide === 'right' || cardSide === 'left';

  if (isHorizontal) {
    const y = targetRect.top + targetRect.height / 2;
    const targetX = cardSide === 'right' ? targetRect.right : targetRect.left;
    const x1 = Math.min(targetX, cardX);
    const x2 = Math.max(targetX, cardX);

    return (
      <svg
        className="fixed pointer-events-none z-[10001]"
        style={{ left: 0, top: 0, width: '100vw', height: '100vh', overflow: 'visible' }}
        aria-hidden="true"
      >
        {/* Line draws itself in from the target dot toward the card */}
        <motion.line
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke="var(--onboarding-accent-solid, #6366f1)"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeLinecap="round"
          initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: reducedMotion ? 0 : 0.05 }}
        />

        {/* Dot at the highlighted element */}
        <motion.circle
          cx={targetX}
          cy={y}
          r={4}
          fill="var(--onboarding-accent-solid, #6366f1)"
          initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 320, delay: reducedMotion ? 0 : 0.05 }}
          style={{ transformOrigin: `${targetX}px ${y}px` }}
        />

        {/* Dot at the card edge */}
        <motion.circle
          cx={cardX}
          cy={y}
          r={6}
          fill="#ffffff"
          stroke="var(--onboarding-accent-solid, #6366f1)"
          strokeWidth={2}
          initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 320, delay: reducedMotion ? 0 : 0.38 }}
          style={{ transformOrigin: `${cardX}px ${y}px` }}
        />
      </svg>
    );
  }

  // Bottom connector — L-shaped elbow from target's bottom-right to card's top-right
  // Uses the right edge of the target so the line follows the spotlight boundary
  const targetRight = targetRect.right;
  const targetBottom = targetRect.bottom;
  const cardRight = cardX;
  const cardTopY = cardTop ?? 0;
  const elbowY = (targetBottom + cardTopY) / 2;

  return (
    <svg
      className="fixed pointer-events-none z-[10001]"
      style={{ left: 0, top: 0, width: '100vw', height: '100vh', overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* Vertical segment from target bottom-right to elbow */}
      <motion.line
        x1={targetRight}
        y1={targetBottom}
        x2={targetRight}
        y2={elbowY}
        stroke="var(--onboarding-accent-solid, #6366f1)"
        strokeWidth={1.5}
        strokeOpacity={0.6}
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: reducedMotion ? 0 : 0.05 }}
      />
      {/* Horizontal segment from elbow to card top-right */}
      <motion.line
        x1={targetRight}
        y1={elbowY}
        x2={cardRight}
        y2={elbowY}
        stroke="var(--onboarding-accent-solid, #6366f1)"
        strokeWidth={1.5}
        strokeOpacity={0.6}
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: reducedMotion ? 0 : 0.2 }}
      />
      {/* Vertical segment from elbow to card top */}
      <motion.line
        x1={cardRight}
        y1={elbowY}
        x2={cardRight}
        y2={cardTopY}
        stroke="var(--onboarding-accent-solid, #6366f1)"
        strokeWidth={1.5}
        strokeOpacity={0.6}
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: reducedMotion ? 0 : 0.35 }}
      />

      {/* Dot at the target's bottom-right corner */}
      <motion.circle
        cx={targetRight}
        cy={targetBottom}
        r={4}
        fill="var(--onboarding-accent-solid, #6366f1)"
        initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 320, delay: reducedMotion ? 0 : 0.05 }}
        style={{ transformOrigin: `${targetRight}px ${targetBottom}px` }}
      />

      {/* Dot at the card top-right corner */}
      <motion.circle
        cx={cardRight}
        cy={cardTopY}
        r={6}
        fill="#ffffff"
        stroke="var(--onboarding-accent-solid, #6366f1)"
        strokeWidth={2}
        initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 320, delay: reducedMotion ? 0 : 0.45 }}
        style={{ transformOrigin: `${cardRight}px ${cardTopY}px` }}
      />
    </svg>
  );
}

export function FloatingTooltip({
  visible,
  targetRect,
  title,
  description,
  progress,
  direction,
  isFirst,
  isLast,
  icon,
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
  const tooltipWidth = isMobile ? viewport.width : 400;
  const sideGap = 64;
  const bottomGap = 20;

  const tooltipHeight = 320;
  const desktopPlacement = useMemo(() => {
    if (!targetRect) {
      return {
        left: Math.max((viewport.width - tooltipWidth) / 2, 16),
        top: Math.max((viewport.height - tooltipHeight) / 2, 16),
        side: 'right' as const,
      };
    }

    const placeRight = targetRect.right + sideGap + tooltipWidth < viewport.width - 16;
    const placeLeft  = targetRect.left  - sideGap - tooltipWidth > 16;
    const placeBelow = targetRect.bottom + bottomGap + tooltipHeight < viewport.height - 20;

    const sideTop = Math.min(
      Math.max(targetRect.top + targetRect.height / 2 - 150, 16),
      Math.max(viewport.height - 340, 16),
    );

    if (placeRight) {
      return { left: targetRect.right + sideGap, top: sideTop, side: 'right' as const };
    }
    if (placeLeft) {
      return { left: targetRect.left - sideGap - tooltipWidth, top: sideTop, side: 'left' as const };
    }
    if (placeBelow) {
      // Align the card's right edge with the target's right edge for a clean elbow connector
      let left = targetRect.right - tooltipWidth;
      left = Math.max(16, Math.min(left, viewport.width - tooltipWidth - 16));
      return { left, top: targetRect.bottom + bottomGap, side: 'bottom' as const };
    }
    return { left: Math.max((viewport.width - tooltipWidth) / 2, 16), top: Math.max((viewport.height - tooltipHeight) / 2, 16), side: 'right' as const };
  }, [sideGap, bottomGap, targetRect, tooltipWidth, tooltipHeight, viewport.height, viewport.width]);

  const showConnector = !isMobile && !!targetRect;
  const connectorCardX = desktopPlacement.side === 'right'
    ? desktopPlacement.left
    : desktopPlacement.side === 'bottom'
      ? desktopPlacement.left + tooltipWidth
      : desktopPlacement.left + tooltipWidth;

  // ─── Animation variants ───────────────────────────────────────────────────

  const mobileSheetMaxHeight = Math.min(viewport.height * 0.55, 340);
  const mobileVariants = {
    hidden:  reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 },
    visible: reducedMotion ? { opacity: 1 } : { y: 0,      opacity: 1 },
    exit:    reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 },
  };

  const desktopVariants = {
    hidden: {
      opacity: 0,
      x: direction === 'forward' ? 14 : -14,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.32, ease: SETTLE_EASE },
    },
    exit: {
      opacity: 0,
      x: direction === 'forward' ? -12 : 12,
      scale: 0.98,
      transition: { duration: 0.15, ease: 'easeOut' } as const,
    },
  };

  const variants = isMobile ? mobileVariants : desktopVariants;

  const cardStyle: React.CSSProperties = {
    background: 'var(--onboarding-modal-bg, #ffffff)',
    boxShadow: 'var(--onboarding-modal-shadow, 0 24px 60px -16px rgba(15,23,42,0.28))',
    border: '1px solid var(--onboarding-modal-border, rgba(15,23,42,0.06))',
    borderRadius: isMobile ? '20px 20px 0 0' : '20px',
    overflow: 'hidden',
    position: 'relative',
    maxHeight: isMobile ? mobileSheetMaxHeight : undefined,
  };

  return (
    <>
      {showConnector && targetRect && (
        <Connector
          targetRect={targetRect}
          cardSide={desktopPlacement.side}
          cardX={connectorCardX}
          cardTop={desktopPlacement.side === 'bottom' ? desktopPlacement.top : undefined}
          reducedMotion={reducedMotion}
        />
      )}

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
              {/* Mobile handle */}
              {isMobile && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '4px',
                      borderRadius: '9999px',
                      background: 'var(--onboarding-sheet-handle, #e2e8f0)',
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  padding: isMobile ? '18px 22px' : '26px',
                  paddingBottom: isMobile
                    ? 'calc(22px + env(safe-area-inset-bottom))'
                    : '26px',
                  overflowY: isMobile ? 'auto' : undefined,
                  maxHeight: isMobile ? '100%' : undefined,
                }}
              >
                {/* Step pill */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'var(--onboarding-pill-bg, #eef2ff)',
                    color: 'var(--onboarding-pill-text, #4f46e5)',
                    marginBottom: '14px',
                  }}
                >
                  Step {progress.current} of {progress.total}
                </div>

                {/* Icon + title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--onboarding-pill-bg, #eef2ff)',
                    }}
                  >
                    {icon ?? <DefaultIcon />}
                  </div>
                  <h3
                    style={{
                      fontSize: isMobile ? '1.05rem' : '1.2rem',
                      fontWeight: 800,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.25,
                      color: 'var(--onboarding-modal-text-primary, #0f172a)',
                      margin: 0,
                    }}
                  >
                    {title}
                  </h3>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: isMobile ? '0.85rem' : '0.9rem',
                    lineHeight: 1.65,
                    color: 'var(--onboarding-modal-text-secondary, #475569)',
                    margin: '0 0 22px 0',
                  }}
                >
                  {description}
                </p>

                {/* Navigation buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isFirst ? 'flex-end' : 'space-between',
                    gap: '10px',
                  }}
                >
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={onPrev}
                      aria-label="Previous step"
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        border: '1px solid var(--onboarding-prev-border, #e2e8f0)',
                        background: 'var(--onboarding-prev-bg, transparent)',
                        color: 'var(--onboarding-prev-text, #475569)',
                        cursor: 'pointer',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--onboarding-prev-hover-bg, #f8fafc)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--onboarding-prev-bg, transparent)'; }}
                    >
                      Back
                    </button>
                  )}

                  <motion.button
                    type="button"
                    onClick={onNext}
                    aria-label={isLast ? 'Finish tour' : 'Next step'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      background: 'var(--onboarding-accent-solid, #6366f1)',
                    }}
                    whileHover={{ y: -1, opacity: 0.94 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                  >
                    {isLast ? 'Finish' : 'Next'}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}