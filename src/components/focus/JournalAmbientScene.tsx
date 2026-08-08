'use client';

import { useEffect, useState } from 'react';

export type TimerMode = 'focus' | 'short_break' | 'long_break';

type SceneTheme = {
  sky: [string, string, string, string];
  sun: { core: string; mid: string; edge: string };
  hills: { back: string; mid: string; front: string };
  pine: string;
  pineMid: string;
  water: [string, string];
  haze: string;
  particle: 'bird' | 'petal' | 'star';
};

const SCENE_THEME: Record<TimerMode, SceneTheme> = {
  focus: {
    sky: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#f5f3ff'],
    sun: { core: '#fff4e0', mid: '#ffe0b8', edge: '#ffc99a' },
    hills: { back: '#c7d2fe', mid: '#a5b4fc', front: '#818cf8' },
    pine: '#6366f1',
    pineMid: '#818cf8',
    water: ['#e0e7ff', '#818cf8'],
    haze: '#e0e7ff',
    particle: 'bird',
  },
  short_break: {
    sky: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#f0f9ff'],
    sun: { core: '#fffdf2', mid: '#fef9c3', edge: '#fde68a' },
    hills: { back: '#b8dff5', mid: '#93d0f0', front: '#6ec0ea' },
    pine: '#4aa8d4',
    pineMid: '#6ec0ea',
    water: ['#d4edfb', '#7dc3e8'],
    haze: '#bae6fd',
    particle: 'petal',
  },
  long_break: {
    sky: ['#ede9fe', '#ddd6fe', '#c4b5fd', '#f5f3ff'],
    sun: { core: '#fdf4ff', mid: '#e9d5ff', edge: '#d8b4fe' },
    hills: { back: '#c4b5fd', mid: '#a78bfa', front: '#8b5cf6' },
    pine: '#7c3aed',
    pineMid: '#8b5cf6',
    water: ['#ddd6fe', '#a78bfa'],
    haze: '#e9d5ff',
    particle: 'star',
  },
};

/* ─── Geometry (viewBox 0 0 600 1000, horizon = 620) ─── */

const HORIZON = 620;

// Hazy back range — tall peak toward the right edge, like the reference.
const BACK_HILLS = 'M0 620 L70 500 L140 570 L230 440 L320 555 L410 400 L500 330 L600 290 L600 620 Z';
// Mid range — slightly deeper, undulating toward the lake.
const MID_HILLS = 'M60 620 L180 505 L270 580 L380 455 L470 545 L545 430 L600 460 L600 620 Z';
// Front ridge — anchored to the right, slopes down to the waterline.
const FRONT_HILLS = 'M240 620 L370 515 L455 585 L545 480 L600 510 L600 620 Z';

function Pine({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g fill={color} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -34 L11 -12 L5 -12 L14 6 L7 6 L16 24 L-16 24 L-7 6 L-14 6 L-5 -12 L-11 -12 Z" />
      <rect x={-2.5} y={24} width={5} height={10} />
    </g>
  );
}

const PINES: Array<{ x: number; y: number; s: number; front?: boolean }> = [
  // isolated tall pines at the left edge of the lake (like the reference)
  { x: 292, y: 588, s: 1.15 },
  { x: 316, y: 596, s: 0.85 },
  // clusters along the front ridge
  { x: 392, y: 566, s: 0.9, front: true },
  { x: 418, y: 584, s: 1.05, front: true },
  { x: 448, y: 568, s: 0.8, front: true },
  { x: 478, y: 590, s: 1.1, front: true },
  { x: 516, y: 566, s: 0.85, front: true },
  { x: 548, y: 588, s: 1.0, front: true },
  { x: 578, y: 574, s: 0.9, front: true },
];

/**
 * Full-height ambient scene anchored to the right edge of the screen.
 * Sun sits just above the lake horizon; mountains, pines, and the sun all
 * reflect (blurred + faded) into the lake below. Blended into the page with
 * a soft CSS radial mask so there is no hard rectangular seam.
 */
export function JournalAmbientScene({ mode }: { mode: TimerMode }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const t = SCENE_THEME[mode];
  const uid = mode;
  const isNight = mode === 'long_break';

  const sunCx = 470;
  const sunCy = isNight ? 250 : 448;
  const sunR = isNight ? 34 : 58;

  const stars = Array.from({ length: 40 }).map((_, i) => ({
    x: (i * 89) % 600,
    y: (i * 47) % 420,
    r: 0.6 + (i % 5) * 0.3,
    d: 2.4 + (i % 5) * 0.5,
    delay: (i % 7) * 0.5,
  }));

  const maskImage =
    'radial-gradient(108% 92% at 100% 58%, black 0%, black 38%, rgba(0,0,0,0.6) 58%, rgba(0,0,0,0.15) 76%, transparent 90%)';

  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-0"
      aria-hidden="true"
      style={{
        width: 'clamp(220px, 55vw, 720px)',
        WebkitMaskImage: maskImage,
        maskImage,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        transition: 'opacity 500ms ease',
      }}
    >
      <svg
        viewBox="0 0 600 1000"
        preserveAspectRatio="xMaxYMid slice"
        className="block h-full w-full"
        role="img"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id={`j-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.sky[0]} />
            <stop offset="34%" stopColor={t.sky[1]} />
            <stop offset="52%" stopColor={t.sky[2]} />
            <stop offset="62%" stopColor={t.sky[3]} />
            <stop offset="100%" stopColor={t.sky[3]} />
          </linearGradient>
          <radialGradient id={`j-sun-glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={t.sun.core} stopOpacity="0.95" />
            <stop offset="30%" stopColor={t.sun.mid} stopOpacity="0.65" />
            <stop offset="62%" stopColor={t.sun.edge} stopOpacity="0.28" />
            <stop offset="100%" stopColor={t.sun.edge} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`j-sun-core-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={t.sun.core} />
            <stop offset="100%" stopColor={t.sun.mid} />
          </radialGradient>
          <linearGradient id={`j-water-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.water[0]} stopOpacity={0.9} />
            <stop offset="100%" stopColor={t.water[1]} stopOpacity={0.75} />
          </linearGradient>
          <linearGradient id={`j-refl-fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`j-soft-blur-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={`j-heavy-blur-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <clipPath id={`j-lake-clip-${uid}`}>
            <rect x="0" y={HORIZON} width="600" height={1000 - HORIZON} />
          </clipPath>
          <mask id={`j-refl-mask-${uid}`}>
            <rect x="0" y={HORIZON} width="600" height={1000 - HORIZON} fill={`url(#j-refl-fade-${uid})`} />
          </mask>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="600" height={HORIZON + 2} fill={`url(#j-sky-${uid})`} />

        {/* Stars (night only) */}
        {isNight &&
          stars.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#ffffff"
              opacity={0.15 + (i % 5) * 0.11}
              style={
                !reduceMotion ? { animation: `j-twinkle-${uid} ${s.d}s ease-in-out ${s.delay}s infinite` } : undefined
              }
            />
          ))}

        {/*
          Distant back range is painted BEFORE the sun (was previously
          drawn after, in the "Mountains" block below, which fully covered
          the sun at sunCx=470 since the back ridge peaks around y≈290-350
          there — well above the sun's y=448/r=58 daytime position). Painting
          it first lets the sun sit visibly in front of the distant peaks,
          the way a low sun naturally reads against a far mountain range.
        */}
        <path d={BACK_HILLS} fill={t.hills.back} opacity={0.85} filter={`url(#j-soft-blur-${uid})`} />

        {/* Sun + glow */}
        <g style={!reduceMotion ? { animation: `j-orb-breathe-${uid} 6s ease-in-out infinite` } : undefined}>
          <circle cx={sunCx} cy={sunCy} r={sunR * 3.6} fill={`url(#j-sun-glow-${uid})`} />
          <circle cx={sunCx} cy={sunCy} r={sunR} fill={`url(#j-sun-core-${uid})`} opacity={0.9} />
        </g>

        {/* Particles */}
        {t.particle === 'bird' &&
          [0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${318 + i * 82},${168 + i * 58} q9,-8 18,0 q9,-8 18,0`}
              stroke={t.hills.front}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
              style={
                !reduceMotion ? { animation: `j-drift-${uid} ${9 + i}s ease-in-out ${i * 0.6}s infinite` } : undefined
              }
            />
          ))}
        {t.particle === 'petal' &&
          [0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={280 + i * 80}
              cy={180 + (i % 2) * 90}
              r="5"
              fill="#ffe3ef"
              opacity="0.7"
              style={
                !reduceMotion ? { animation: `j-float-${uid} ${7 + i}s ease-in-out ${i * 0.8}s infinite` } : undefined
              }
            />
          ))}
        {t.particle === 'star' &&
          [0, 1].map((i) => (
            <circle
              key={i}
              cx={220 + i * 240}
              cy={70 + i * 110}
              r="1.6"
              fill="#ffffff"
              opacity="0.9"
              style={
                !reduceMotion ? { animation: `j-shoot-${uid} ${10 + i * 4}s linear ${2 + i * 3}s infinite` } : undefined
              }
            />
          ))}

        {/* Soft clouds */}
        <g filter={`url(#j-soft-blur-${uid})`} opacity={isNight ? 0.25 : 0.75}>
          <ellipse cx={210} cy={128} rx={44} ry={11} fill="#FFFFFF" />
          <ellipse cx={252} cy={120} rx={28} ry={8} fill="#FFFFFF" />
          <ellipse cx={420} cy={210} rx={34} ry={9} fill="#FFFFFF" />
        </g>

        {/* Nearer mountains — these still sit in front of the sun, which is
            correct: only the *distant* back range should read as behind it. */}
        <path d={MID_HILLS} fill={t.hills.mid} opacity={0.95} />
        <path d={FRONT_HILLS} fill={t.hills.front} />

        {/* Pines */}
        {PINES.map((p, i) => (
          <Pine key={i} x={p.x} y={p.y} s={p.s} color={p.front && i % 2 === 0 ? t.pineMid : t.pine} />
        ))}

        {/* Lake */}
        <rect x="0" y={HORIZON} width="600" height={1000 - HORIZON} fill={`url(#j-water-${uid})`} />

        {/* Lake reflection — mirrored mountains, pines & sun, blurred and faded */}
        <g
          clipPath={`url(#j-lake-clip-${uid})`}
          mask={`url(#j-refl-mask-${uid})`}
          transform={`translate(0 ${HORIZON * 2}) scale(1 -1)`}
          opacity={isNight ? 0.28 : 0.42}
          filter={`url(#j-heavy-blur-${uid})`}
        >
          <path d={BACK_HILLS} fill={t.hills.back} opacity={0.7} />
          <path d={MID_HILLS} fill={t.hills.mid} opacity={0.85} />
          <path d={FRONT_HILLS} fill={t.hills.front} />
          {PINES.map((p, i) => (
            <Pine key={i} x={p.x} y={p.y} s={p.s} color={t.pine} />
          ))}
          <circle cx={sunCx} cy={sunCy} r={sunR} fill={t.sun.core} opacity={0.9} />
        </g>

        {/* Sun column shimmering on the water */}
        {!isNight && (
          <g clipPath={`url(#j-lake-clip-${uid})`} filter={`url(#j-soft-blur-${uid})`}>
            <ellipse cx={sunCx} cy={HORIZON + 52} rx={46} ry={40} fill={t.sun.mid} opacity={0.4} />
            <ellipse cx={sunCx} cy={HORIZON + 26} rx={64} ry={5} fill={t.sun.core} opacity={0.5} />
            <ellipse cx={sunCx - 14} cy={HORIZON + 66} rx={44} ry={3.6} fill={t.sun.core} opacity={0.38} />
            <ellipse cx={sunCx + 10} cy={HORIZON + 108} rx={30} ry={3} fill={t.sun.core} opacity={0.28} />
            <ellipse cx={sunCx - 6} cy={HORIZON + 160} rx={20} ry={2.6} fill={t.sun.core} opacity={0.2} />
          </g>
        )}

        {/* Water shimmer streaks */}
        <g filter={`url(#j-soft-blur-${uid})`} opacity={isNight ? 0.18 : 0.3}>
          <ellipse cx={190} cy={HORIZON + 44} rx={58} ry={2.6} fill="#ffffff" />
          <ellipse cx={330} cy={HORIZON + 92} rx={42} ry={2.2} fill="#ffffff" />
          <ellipse cx={120} cy={HORIZON + 140} rx={34} ry={2} fill="#ffffff" />
          <ellipse cx={300} cy={HORIZON + 210} rx={52} ry={2.4} fill="#ffffff" />
        </g>

        {/* Warm haze band at the horizon */}
        <rect
          x="0"
          y={HORIZON - 20}
          width="600"
          height={26}
          fill={t.haze}
          opacity={isNight ? 0.12 : 0.3}
          filter={`url(#j-soft-blur-${uid})`}
        />

        <style>{`
          @keyframes j-orb-breathe-${uid} { 0%,100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(-4px); opacity: 0.94; } }
          @keyframes j-twinkle-${uid} { 0%,100% { opacity: 0.15; } 50% { opacity: 0.75; } }
          @keyframes j-drift-${uid} { 0% { transform: translate(0,0); } 50% { transform: translate(22px,-9px); } 100% { transform: translate(0,0); } }
          @keyframes j-float-${uid} { 0% { transform: translate(0,0); opacity: 0.7; } 50% { transform: translate(-14px,18px); opacity: 0.4; } 100% { transform: translate(0,0); opacity: 0.7; } }
          @keyframes j-shoot-${uid} { 0% { transform: translate(0,0); opacity: 0; } 3% { opacity: 1; } 8% { transform: translate(-140px,90px); opacity: 0; } 100% { transform: translate(-140px,90px); opacity: 0; } }
          @media (prefers-reduced-motion: reduce) {
            g[style*="animation"] { animation: none !important; }
          }
        `}</style>
      </svg>
    </div>
  );
}
