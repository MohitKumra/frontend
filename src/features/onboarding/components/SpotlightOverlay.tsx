/**
 * frontend/src/features/onboarding/components/SpotlightOverlay.tsx
 * Full-screen overlay with a dynamic highlight around the target element.
 * Redesigned to match a light product-tour look: a soft translucent wash
 * over the whole screen (not a dark vignette) plus a rounded indigo halo
 * around the highlighted element instead of a dashed traveling sweep.
 *
 * On mobile, the overlay omits the top navbar area (~56px) so the header
 * remains fully visible and un-dimmed during the tour.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import type { SpotlightRect } from '../types';
import { spotlightClipPath } from '../utils/spotlight';

interface SpotlightOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** The bounding rect of the element to highlight */
  targetRect: SpotlightRect | null;
  /** Reduced motion mode */
  reducedMotion?: boolean;
  /** Padding around the highlighted element (px) */
  padding?: number;
}

// Keep this in lockstep with the scrim's clip-path CSS transition below —
// if the two ever drift apart, the halo box snaps to the new element while
// the cutout is still easing there, which reads as two overlapping boxes.
const MOVE_DURATION = 0.5;
const MOVE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Estimated height of the mobile top header bar */
const MOBILE_NAV_HEIGHT = 56;

export function SpotlightOverlay({ visible, targetRect, reducedMotion = false, padding = 10 }: SpotlightOverlayProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const effectivePadding = isMobile ? 6 : padding;
  const cornerRadius = isMobile ? 10 : 14;
  const topOffset = isMobile ? MOBILE_NAV_HEIGHT : 0;

  // Adjust the target rect's y-coordinates by the top offset so the scrim
  // cutout aligns correctly with the DOM element.
  const adjustedRect: SpotlightRect | null = useMemo(() => {
    if (!targetRect) return null;
    return {
      top: targetRect.top - topOffset,
      left: targetRect.left,
      width: targetRect.width,
      height: targetRect.height,
      bottom: targetRect.bottom - topOffset,
      right: targetRect.right,
    };
  }, [targetRect, topOffset]);

  const clipPath = adjustedRect ? spotlightClipPath(adjustedRect, effectivePadding, cornerRadius) : 'none';

  const boxW = adjustedRect ? adjustedRect.width + effectivePadding * 2 : 0;
  const boxH = adjustedRect ? adjustedRect.height + effectivePadding * 2 : 0;
  const boxTop = adjustedRect ? adjustedRect.top - effectivePadding : 0;
  const boxLeft = adjustedRect ? adjustedRect.left - effectivePadding : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-x-0 z-[9999]"
          style={{ top: 0, bottom: 0 }}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: MOVE_EASE }}
          aria-hidden="true"
        >
          {/* Light translucent wash dimming the app behind the tour, with a cutout */}
          <div
            className="absolute inset-x-0"
            style={{
              top: topOffset,
              bottom: 0,
              background: 'var(--onboarding-scrim, rgba(226,232,240,0.55))',
              clipPath,
              transition: reducedMotion ? 'none' : `clip-path ${MOVE_DURATION}s cubic-bezier(${MOVE_EASE.join(',')})`,
            }}
          />

          {/* Soft halo ring around the highlighted element. Position/size are
              driven through `animate` (not raw style) so the ring glides to
              the new element in exact sync with the scrim's clip-path above,
              instead of snapping there instantly and leaving a ghost box. */}
          {adjustedRect && (
            <motion.div
              className="absolute pointer-events-none"
              style={{ borderRadius: cornerRadius }}
              initial={
                reducedMotion
                  ? false
                  : { opacity: 0, scale: 0.96, top: boxTop + topOffset, left: boxLeft, width: boxW, height: boxH }
              }
              animate={{
                opacity: 1,
                scale: 1,
                top: boxTop + topOffset,
                left: boxLeft,
                width: boxW,
                height: boxH,
              }}
              transition={{ duration: reducedMotion ? 0 : MOVE_DURATION, ease: MOVE_EASE }}
            >
              <div
                className="absolute inset-0"
                style={{
                  borderRadius: 'inherit',
                  background: 'var(--onboarding-halo-fill, rgba(99,102,241,0.06))',
                  boxShadow:
                    '0 0 0 1.5px var(--onboarding-accent-solid, #6366f1), 0 0 0 6px var(--onboarding-halo-ring, rgba(99,102,241,0.14))',
                  animation: reducedMotion ? 'none' : 'haloPulse 2.6s ease-in-out infinite',
                }}
              />
            </motion.div>
          )}

          <style>{`
            @keyframes haloPulse {
              0%, 100% {
                box-shadow: 0 0 0 1.5px var(--onboarding-accent-solid, #6366f1), 0 0 0 6px var(--onboarding-halo-ring, rgba(99,102,241,0.14));
              }
              50% {
                box-shadow: 0 0 0 1.5px var(--onboarding-accent-solid, #6366f1), 0 0 0 9px var(--onboarding-halo-ring, rgba(99,102,241,0.09));
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
