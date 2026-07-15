/**
 * frontend/src/features/onboarding/utils/bezier.ts
 * Cubic bezier interpolation for smooth guide movement between targets.
 */

/**
 * A point in 2D space.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Cubic bezier curve evaluation at parameter t (0-1).
 * Uses de Casteljau's algorithm for numerical stability.
 */
export function cubicBezier(
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/**
 * Generates control points for a smooth bezier curve from start to end.
 * The control points create a natural arc-like trajectory.
 */
export function generateFlightPath(
  start: Point,
  end: Point,
  height: number = 60,
): { p0: Point; p1: Point; p2: Point; p3: Point } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Control points create a gentle arc
  const p1: Point = {
    x: start.x + dx * 0.25,
    y: start.y - height,
  };

  const p2: Point = {
    x: end.x - dx * 0.25,
    y: end.y - height,
  };

  return {
    p0: start,
    p1,
    p2,
    p3: end,
  };
}

/**
 * Samples a bezier curve into an array of points for animation.
 */
export function sampleBezier(
  start: Point,
  end: Point,
  steps: number = 30,
  height: number = 60,
): Point[] {
  const { p0, p1, p2, p3 } = generateFlightPath(start, end, height);
  const points: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(cubicBezier(t, p0, p1, p2, p3));
  }

  return points;
}

// ─── Premium easing + single-point flight sampling ────────────────────────────
// Added to drive the AI guide's "flight" between onboarding targets — instead of
// snapping or linearly tweening, the guide arcs from its last position to the
// next one along the same bezier path used by sampleBezier, evaluated at a
// single eased t. This is what gives the guide its "swooping in" premium feel.

/**
 * Expo-out easing — fast start, long buttery settle. Feels intentional and
 * weighted rather than linear or default spring-y motion.
 */
export function easeOutExpo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -10 * t);
}

/**
 * A softer variant used for the final approach into a target (slight
 * overshoot-free deceleration), distinct from easeOutExpo's snappier start.
 */
export function easeOutQuint(t: number): number {
  const mt = 1 - Math.min(Math.max(t, 0), 1);
  return 1 - mt * mt * mt * mt * mt;
}

/**
 * Evaluates a single point along the arc flight path from start to end at
 * eased progress `t` (0-1). Height auto-scales with travel distance so short
 * hops don't over-arc and long hops don't feel flat.
 */
export function flightPointAt(
  start: Point,
  end: Point,
  t: number,
  heightOverride?: number,
): Point {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const height = heightOverride ?? Math.min(90, Math.max(24, distance * 0.22));
  const { p0, p1, p2, p3 } = generateFlightPath(start, end, height);
  return cubicBezier(Math.min(Math.max(t, 0), 1), p0, p1, p2, p3);
}