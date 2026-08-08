/**
 * frontend/src/features/onboarding/utils/spotlight.ts
 * Utility for calculating spotlight positions from DOM elements.
 */

import type { SpotlightRect } from '../types';

/**
 * Gets the bounding rectangle of an element identified by a CSS selector.
 * Returns null if the element doesn't exist.
 */
export function getTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  };
}

/**
 * Safely scrolls a target element into view with smooth behavior.
 */
export function scrollToTarget(selector: string): void {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Generates a CSS clip-path polygon that creates a spotlight effect.
 * The polygon covers the entire viewport but cuts out a highlighted area
 * around the target element with some padding.
 *
 * @param rect - The bounding rect of the highlighted element
 * @param padding - Extra padding around the highlighted area (px)
 * @param borderRadius - Border radius of the cutout (px)
 */
export function spotlightClipPath(rect: SpotlightRect, padding: number = 16, borderRadius: number = 12): string {
  const t = rect.top - padding;
  const l = rect.left - padding;
  const r = rect.left + rect.width + padding;
  const b = rect.top + rect.height + padding;

  // Float precision rounding
  const rt = Math.round(t);
  const rl = Math.round(l);
  const rr = Math.round(r);
  const rb = Math.round(b);

  // Use a polygon with rounded corners via SVG-like approach
  // We create a "hole" using multiple points around the highlighted area
  // For a simpler/faster approach, we use an inset-based polygon
  const inset = borderRadius;

  return [
    `polygon(`,
    `0% 0%,`, // top-left of viewport
    `100% 0%,`, // top-right of viewport
    `100% 100%,`, // bottom-right of viewport
    `0% 100%,`, // bottom-left of viewport
    `0% 0%,`, // back to top-left (trace edge)
    // Now trace the cutout clockwise
    `${rl}px ${rt}px,`,
    `${rl + inset}px ${rt}px,`,
    `${rl}px ${rt + inset}px,`,
    `${rl}px ${rb - inset}px,`,
    `${rl + inset}px ${rb}px,`,
    `${rr - inset}px ${rb}px,`,
    `${rr}px ${rb - inset}px,`,
    `${rr}px ${rt + inset}px,`,
    `${rr - inset}px ${rt}px,`,
    `${rl}px ${rt}px`,
    `)`,
  ].join(' ');
}

/**
 * Calculates the position for the guide/tooltip based on the target rect
 * and desired position.
 */
export function calculateGuidePosition(
  rect: SpotlightRect,
  position: 'top' | 'bottom' | 'left' | 'right',
  guideSize: number = 80,
  gap: number = 16
): { x: number; y: number } {
  switch (position) {
    case 'top':
      return {
        x: rect.left + rect.width / 2 - guideSize / 2,
        y: rect.top - guideSize - gap,
      };
    case 'bottom':
      return {
        x: rect.left + rect.width / 2 - guideSize / 2,
        y: rect.bottom + gap,
      };
    case 'left':
      return {
        x: rect.left - guideSize - gap,
        y: rect.top + rect.height / 2 - guideSize / 2,
      };
    case 'right':
      return {
        x: rect.right + gap,
        y: rect.top + rect.height / 2 - guideSize / 2,
      };
  }
}

/**
 * Calculates the angle (in degrees) from the guide position to the target.
 * Used to make the guide tilt/point toward the highlighted element.
 */
export function calculateAngleToTarget(guideX: number, guideY: number, targetRect: SpotlightRect): number {
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const dx = targetCenterX - guideX;
  const dy = targetCenterY - guideY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}
