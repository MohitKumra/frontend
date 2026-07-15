/**
 * frontend/src/features/onboarding/components/SpotlightOverlay.tsx
 * Full-screen overlay with dynamic spotlight cutout around the highlighted element.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
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

export function SpotlightOverlay({
  visible,
  targetRect,
  reducedMotion = false,
  padding = 16,
}: SpotlightOverlayProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Smaller padding on mobile
  const effectivePadding = isMobile ? 8 : padding;

  const clipPath = targetRect
    ? spotlightClipPath(targetRect, effectivePadding, isMobile ? 8 : 12)
    : 'none';

  // Rounded-rect outline geometry for the traveling light sweep. Approximate
  // perimeter is fine here — it just needs to be a stable loop length, not an
  // exact measurement.
  const outlineW = targetRect ? targetRect.width + padding * 2 + 8 : 0;
  const outlineH = targetRect ? targetRect.height + padding * 2 + 8 : 0;
  const perimeter = 2 * (outlineW + outlineH);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999]"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          {/* Darkened overlay with clip-path cutout + soft vignette for depth */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 100% at 50% 40%, rgba(15,13,38,0.5) 0%, rgba(10,9,26,0.68) 100%)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              clipPath,
              transition: reducedMotion
                ? 'none'
                : 'clip-path 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Highlight ring + traveling light sweep around the target element */}
          {targetRect && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                top: targetRect.top - padding - 4,
                left: targetRect.left - padding - 4,
                width: outlineW,
                height: outlineH,
              }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Ambient glow */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow:
                    '0 0 0 1.5px rgba(129,140,248,0.45), 0 0 30px rgba(129,140,248,0.22), 0 0 64px rgba(217,70,239,0.14)',
                  animation: reducedMotion ? 'none' : 'glowPulse 2.4s ease-in-out infinite',
                }}
              />

              {/* Traveling light sweep */}
              {!reducedMotion && outlineW > 0 && (
                <svg
                  className="absolute inset-0 overflow-visible"
                  width={outlineW}
                  height={outlineH}
                >
                  <rect
                    x={0.75}
                    y={0.75}
                    width={Math.max(outlineW - 1.5, 0)}
                    height={Math.max(outlineH - 1.5, 0)}
                    rx={16}
                    fill="none"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(perimeter * 0.08, 12)} ${Math.max(perimeter * 0.92, 40)}`}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from={0}
                      to={-perimeter}
                      dur="2.6s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </svg>
              )}
            </motion.div>
          )}

          {/* Inline styles for glow animation */}
          <style>{`
            @keyframes glowPulse {
              0%, 100% { opacity: 0.65; }
              50% { opacity: 1; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}