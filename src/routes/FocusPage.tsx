import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import { useSearchParams } from 'react-router-dom';
import {
  Timer, Play, Pause, RotateCcw, Maximize2, Minimize2, X, Flame, CheckCircle2, Circle,
  ChevronDown, ChevronRight, Target, Coffee, Settings, Moon, TrendingUp, SkipBack,
  SkipForward, MoreHorizontal, Music, CalendarDays, Plus, Clock, AudioLines,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { TabBar } from '../components/ui/TabBar';
import { Card } from '../components/ui/Card';
import { useUIStore } from '../store/uiStore';
import { TaskTimeAnalysis } from '../components/tasks/TaskTimeAnalysis';
import { saveTimerState, restoreTimerState, clearTimerState } from '../lib/timerPersistence';
import { isSameDay } from '../lib/dateUtils';
import type { FocusSessionDTO, CreateFocusSessionRequest, ListResponse, TaskDTO } from '../types';

type TimerMode = 'focus' | 'short_break' | 'long_break';
const DURATIONS: Record<TimerMode, number> = {
  focus: 25, short_break: 5, long_break: 15,
};
const QUICK_DURATIONS = [25, 50, 75, 90];
// There's no daily-goal field in the data model yet — 4h is a sensible default
// until goal-setting is wired up to a real preference.
const DEFAULT_GOAL_MIN = 240;
const AMBIENT_SOUNDS = ['Forest', 'Rain', 'Cafe', 'Silence'];
const QUOTES = [
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'The successful warrior is the average man, with laser-like focus.', author: 'Bruce Lee' },
];

const getModeColors = (mode: TimerMode) => {
  switch (mode) {
    case 'focus':
      return { primary: 'var(--color-accent)', subtle: 'var(--color-accent-subtle)', glow: 'color-mix(in srgb, var(--color-accent) 25%, transparent)' };
    case 'short_break':
      return { primary: 'var(--color-success)', subtle: 'color-mix(in srgb, var(--color-success) 15%, transparent)', glow: 'color-mix(in srgb, var(--color-success) 25%, transparent)' };
    case 'long_break':
      return { primary: 'var(--color-info)', subtle: 'color-mix(in srgb, var(--color-info) 15%, transparent)', glow: 'color-mix(in srgb, var(--color-info) 25%, transparent)' };
  }
};

const MODE_COPY: Record<TimerMode, string> = {
  focus: 'Stay focused, you got this! 💪',
  short_break: 'Stretch, breathe, recharge ☕',
  long_break: 'Take it slow, you earned it 🌿',
};

function requestFullscreen(el: HTMLElement) {
  const anyEl = el as any;
  const fn = el.requestFullscreen || anyEl.webkitRequestFullscreen || anyEl.msRequestFullscreen;
  return fn ? fn.call(el) : Promise.reject(new Error('Fullscreen API unsupported'));
}
function exitFullscreen() {
  const anyDoc = document as any;
  const fn = document.exitFullscreen || anyDoc.webkitExitFullscreen || anyDoc.msExitFullscreen;
  return fn ? fn.call(document) : Promise.resolve();
}
function isFullscreenActive() {
  const anyDoc = document as any;
  return !!(document.fullscreenElement || anyDoc.webkitFullscreenElement || anyDoc.msFullscreenElement);
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/* ───────────────────────── Progress Ring ───────────────────────── */

function ProgressRing({
  logicalSize, progress, colors, running, showKnob = true,
}: {
  logicalSize: number; progress: number; colors: ReturnType<typeof getModeColors>; running: boolean; showKnob?: boolean;
}) {
  const stroke = logicalSize > 200 ? 12 : 10;
  const r = logicalSize / 2 - stroke;
  const circumference = 2 * Math.PI * r;
  const tickCount = 24;
  const clamped = Math.max(0, Math.min(1, progress));
  const knobAngle = clamped * 2 * Math.PI;
  const cx = logicalSize / 2;
  const cy = logicalSize / 2;
  const knobX = cx + r * Math.cos(knobAngle);
  const knobY = cy + r * Math.sin(knobAngle);

  return (
    <svg
      viewBox={`0 0 ${logicalSize} ${logicalSize}`}
      className="-rotate-90 w-full h-full"
      style={{ filter: running ? `drop-shadow(0 0 18px ${colors.glow})` : 'none', transition: 'filter 600ms ease' }}
    >
      <defs>
        <linearGradient id={`ring-gradient-${logicalSize}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.55" />
          <stop offset="100%" stopColor={colors.primary} stopOpacity="1" />
        </linearGradient>
      </defs>

      {Array.from({ length: tickCount }).map((_, i) => {
        const angle = (i / tickCount) * 2 * Math.PI;
        const inner = r - stroke / 2 - 4;
        const outer = r - stroke / 2 - 9;
        return (
          <line
            key={i}
            x1={cx + inner * Math.cos(angle)}
            y1={cy + inner * Math.sin(angle)}
            x2={cx + outer * Math.cos(angle)}
            y2={cy + outer * Math.sin(angle)}
            stroke="var(--color-border-subtle)"
            strokeWidth={1.5}
          />
        );
      })}

      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border-subtle)" strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={`url(#ring-gradient-${logicalSize})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
      {showKnob && clamped > 0.01 && (
        <circle cx={knobX} cy={knobY} r={stroke / 2 + 2} fill="var(--color-surface)" stroke={colors.primary} strokeWidth={3} />
      )}
    </svg>
  );
}

/* ───────────────────────── Mini sparkline (Focus Score card) ───────────────────────── */

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 48;
  const h = 22;
  const max = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODE-AWARE AMBIENT LANDSCAPE
   Three soothing, low-saturation scenes — one per timer mode — sharing one
   rounded, sharp-edge-free silhouette (bezier hills, soft "pom-pom" tree
   canopies). Only light/color differs between them, which is what lets the
   crossfade on mode-change read as a mood shift rather than a scene cut.
   ═══════════════════════════════════════════════════════════════════════════ */

type SceneTheme = {
  label: string;
  copy: string;
  sky: [string, string, string, string];
  orb: { core: string; mid: string; edge: string };
  hills: { back: string; mid: string; front: string };
  water: [string, string];
  canopy: string;
  canopyMid: string;
  particle: 'bird' | 'petal' | 'star';
};

const SCENE_THEME: Record<TimerMode, SceneTheme> = {
  focus: {
    label: 'Focus',
    copy: 'Stay with it — the work is working on you too.',
    sky: ['#eae3ff', '#ddc9fb', '#ffceb3', '#ffe3c9'], // lavender evening
    orb: { core: '#fff6e3', mid: '#ffd9a8', edge: '#ffbe86' }, // low sun
    hills: { back: '#cabce3', mid: '#a793cf', front: '#7c67b8' },
    water: ['#f3ddc7', '#8a76bd'],
    canopy: '#6c58a8',
    canopyMid: '#8a76c4',
    particle: 'bird',
  },
  short_break: {
    label: 'Short Break',
    copy: 'Small pause. Let your shoulders drop.',
    sky: ['#e9fbf1', '#d3f3df', '#bfe9d6', '#fff3d9'], // soft mint morning
    orb: { core: '#fffdf2', mid: '#ffe9a8', edge: '#ffd580' }, // climbing sun
    hills: { back: '#c3e9d3', mid: '#9bd6b6', front: '#6bb98f' },
    water: ['#eaf7ec', '#79b99a'],
    canopy: '#4f9c74',
    canopyMid: '#7fc39e',
    particle: 'petal',
  },
  long_break: {
    label: 'Long Break',
    copy: 'No timer chasing you. Just rest.',
    sky: ['#101a33', '#1c2c4d', '#2f4370', '#4a5f8f'], // deep indigo night
    orb: { core: '#f4f7ff', mid: '#cfe0ff', edge: '#a9c3f2' }, // moon
    hills: { back: '#33447a', mid: '#293766', front: '#1e2a52' },
    water: ['#2a3a63', '#141d38'],
    canopy: '#232f5c',
    canopyMid: '#2f3e70',
    particle: 'star',
  },
};

const SCENE_MODES: TimerMode[] = ['focus', 'short_break', 'long_break'];

function HillLayer({ uid, d, fill, blur }: { uid: string; d: string; fill: string; blur?: boolean }) {
  return <path d={d} fill={fill} filter={blur ? `url(#soft-blur-${uid})` : undefined} />;
}

function Canopy({ cx, cy, s, color, opacity = 1 }: { cx: number; cy: number; s: number; color: string; opacity?: number }) {
  // A cluster of overlapping soft circles reads as a rounded treetop —
  // deliberately avoids pointed pine silhouettes to keep the scene soothing.
  return (
    <g opacity={opacity}>
      <circle cx={cx - s * 0.55} cy={cy + s * 0.18} r={s * 0.62} fill={color} />
      <circle cx={cx + s * 0.55} cy={cy + s * 0.18} r={s * 0.62} fill={color} />
      <circle cx={cx} cy={cy - s * 0.15} r={s * 0.78} fill={color} />
      <rect x={cx - s * 0.06} y={cy + s * 0.35} width={s * 0.12} height={s * 0.5} rx={s * 0.06} fill={color} opacity={0.9} />
    </g>
  );
}

function LandscapeScene({ mode, active, reduceMotion }: { mode: TimerMode; active: boolean; reduceMotion: boolean }) {
  const t = SCENE_THEME[mode];
  const uid = mode;

  // shared silhouette geometry — identical bezier paths across all three
  // modes, so only fill/gradient changes when the mode switches.
  const backHills =
    'M760,900 C820,650 880,560 950,560 C1010,560 1050,640 1110,640 C1170,640 1200,540 1270,540 C1340,540 1380,610 1450,610 C1510,610 1560,560 1600,560 L1600,900 Z';
  const midHills =
    'M800,900 C860,700 930,610 1010,610 C1080,610 1110,690 1180,690 C1250,690 1280,600 1360,600 C1430,600 1470,670 1550,670 C1580,670 1600,660 1600,660 L1600,900 Z';
  const frontHills =
    'M850,900 C920,760 990,700 1070,700 C1140,700 1170,770 1250,770 C1320,770 1360,700 1440,700 C1500,700 1540,740 1600,740 L1600,900 Z';

  const treesMid = Array.from({ length: 8 }).map((_, i) => ({ cx: 960 + i * 78, cy: 655 - (i % 3) * 8, s: 20 + (i % 3) * 4 }));
  const treesFront = Array.from({ length: 9 }).map((_, i) => ({ cx: 930 + i * 76, cy: 780 - (i % 3) * 7, s: 26 + (i % 3) * 5 }));
  const stars = Array.from({ length: 42 }).map((_, i) => ({
    x: 800 + ((i * 61) % 800), y: (i * 23) % 260, r: 0.5 + (i % 5) * 0.28, d: 2.4 + (i % 5) * 0.5, delay: (i % 7) * 0.5,
  }));

  return (
    <g
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'scale(1)' : 'scale(1.015)',
        transformOrigin: '50% 50%',
        transition: reduceMotion
          ? 'opacity 400ms linear'
          : 'opacity 1900ms cubic-bezier(0.22,0.7,0.2,1), transform 2200ms cubic-bezier(0.22,0.7,0.2,1)',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.sky[0]} />
          <stop offset="38%" stopColor={t.sky[1]} />
          <stop offset="72%" stopColor={t.sky[2]} />
          <stop offset="100%" stopColor={t.sky[3]} />
        </linearGradient>
        <radialGradient id={`orb-glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={t.orb.core} stopOpacity="1" />
          <stop offset="28%" stopColor={t.orb.mid} stopOpacity="0.8" />
          <stop offset="60%" stopColor={t.orb.edge} stopOpacity="0.35" />
          <stop offset="100%" stopColor={t.orb.edge} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`orb-core-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={t.orb.core} />
          <stop offset="100%" stopColor={t.orb.mid} />
        </radialGradient>
        <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.water[0]} stopOpacity="0.65" />
          <stop offset="100%" stopColor={t.water[1]} stopOpacity="0.55" />
        </linearGradient>
        <filter id={`soft-blur-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="26%" stopColor="#fff" stopOpacity="0" />
          <stop offset="52%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`fade-mask-${uid}`}>
          <rect x="0" y="0" width="1600" height="900" fill={`url(#fade-${uid})`} />
        </mask>
      </defs>

      <g mask={`url(#fade-mask-${uid})`}>
        <rect x="0" y="0" width="1600" height="900" fill={`url(#sky-${uid})`} />

        {/* stars — only meaningfully visible at night; kept present at
            near-zero opacity elsewhere so nothing pops in on crossfade */}
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#ffffff"
            opacity={mode === 'long_break' ? 0.15 + (i % 5) * 0.11 : 0}
            style={
              !reduceMotion && mode === 'long_break'
                ? { animation: `twinkle-${uid} ${s.d}s ease-in-out ${s.delay}s infinite` }
                : undefined
            }
          />
        ))}

        {t.particle === 'bird' &&
          [0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${1030 + i * 95},${168 + i * 24} q13,-12 26,0 q13,-12 26,0`}
              stroke={t.hills.front}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
              style={!reduceMotion ? { animation: `drift-${uid} ${9 + i}s ease-in-out ${i * 0.6}s infinite` } : undefined}
            />
          ))}
        {t.particle === 'petal' &&
          [0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={880 + i * 170}
              cy={220 + (i % 2) * 60}
              r="4.5"
              fill="#ffe3ef"
              opacity="0.7"
              style={!reduceMotion ? { animation: `float-${uid} ${7 + i}s ease-in-out ${i * 0.8}s infinite` } : undefined}
            />
          ))}
        {t.particle === 'star' &&
          [0, 1].map((i) => (
            <circle
              key={i}
              cx={1000 + i * 260}
              cy={120 + i * 40}
              r="1.4"
              fill="#ffffff"
              opacity="0.9"
              style={!reduceMotion ? { animation: `shoot-${uid} ${10 + i * 4}s linear ${2 + i * 3}s infinite` } : undefined}
            />
          ))}

        <g style={!reduceMotion ? { animation: `orb-breathe-${uid} 6s ease-in-out infinite` } : undefined}>
          <circle cx="1290" cy="330" r="230" fill={`url(#orb-glow-${uid})`} />
          <circle cx="1290" cy="330" r="58" fill={`url(#orb-core-${uid})`} />
        </g>

        <HillLayer uid={uid} d={backHills} fill={t.hills.back} blur />
        <HillLayer uid={uid} d={midHills} fill={t.hills.mid} />
        {treesMid.map((tr, i) => (
          <Canopy key={i} cx={tr.cx} cy={tr.cy} s={tr.s} color={t.canopyMid} opacity={0.55} />
        ))}
        <HillLayer uid={uid} d={frontHills} fill={t.hills.front} />
        {treesFront.map((tr, i) => (
          <Canopy key={i} cx={tr.cx} cy={tr.cy} s={tr.s} color={t.canopy} />
        ))}

        <rect x="850" y="838" width="750" height="62" fill={`url(#water-${uid})`} />
        <ellipse cx="1290" cy="872" rx="52" ry="18" fill={t.orb.mid} opacity="0.35" />

        <rect x="800" y="712" width="800" height="46" fill="#ffffff" opacity="0.16" filter={`url(#soft-blur-${uid})`} />
      </g>

      <style>{`
        @keyframes orb-breathe-${uid} { 0%,100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(-4px); opacity: 0.92; } }
        @keyframes twinkle-${uid} { 0%,100% { opacity: 0.15; } 50% { opacity: 0.75; } }
        @keyframes drift-${uid} { 0% { transform: translate(0,0); } 50% { transform: translate(24px,-10px); } 100% { transform: translate(0,0); } }
        @keyframes float-${uid} { 0% { transform: translate(0,0); opacity: 0.7; } 50% { transform: translate(-14px,18px); opacity: 0.4; } 100% { transform: translate(0,0); opacity: 0.7; } }
        @keyframes shoot-${uid} { 0% { transform: translate(0,0); opacity: 0; } 3% { opacity: 1; } 8% { transform: translate(-140px,90px); opacity: 0; } 100% { transform: translate(-140px,90px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          g[style*="animation"] { animation: none !important; }
        }
      `}</style>
    </g>
  );
}

/* Mode-aware replacement for the original single-scene AmbientLandscape.
   Renders all three scenes stacked and crossfades between them purely via
   opacity/scale transitions driven by `mode` — no remount, no pop. */
function AmbientLandscape({ mode }: { mode: TimerMode }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
    >
      {SCENE_MODES.map((m) => (
        <LandscapeScene key={m} mode={m} active={m === mode} reduceMotion={reduceMotion} />
      ))}
    </svg>
  );
}

/* ───────────────────────── Fullscreen stat card ───────────────────────── */

function FocusModeStatCard({ icon, iconBg, iconColor, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: React.ReactNode; sub: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm"
      style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(0,0,0,0.06)' }}
    >
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted truncate">{label}</p>
        <p className="text-lg font-black text-text-primary leading-tight">{value}</p>
        <p className="text-[10px] font-semibold text-text-muted">{sub}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Fullscreen Focus Mode ───────────────────────── */

function FocusModeFullScreen({
  mode, minutes, seconds, progress, running, selectedTaskTitle, quote,
  ambientPlaying, ambientSound, onToggleAmbient,
  todayFocusCount, todayFocusTimeLabel, todayBreakCount, longestStreakDays,
  onExit, onReset, onStartPause, onSkipBack, onSkipForward,
}: {
  mode: TimerMode; minutes: string; seconds: string; progress: number; running: boolean;
  selectedTaskTitle: string | null; quote: { text: string; author: string };
  ambientPlaying: boolean; ambientSound: string; onToggleAmbient: () => void;
  todayFocusCount: number; todayFocusTimeLabel: string; todayBreakCount: number; longestStreakDays: number;
  onExit: () => void; onReset: () => void; onStartPause: () => void;
  onSkipBack: () => void; onSkipForward: () => void;
}) {
  const colors = getModeColors(mode);
  const [statsVisible, setStatsVisible] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); onStartPause(); }
      if (e.key === 'r' || e.key === 'R') onReset();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStartPause, onReset]);

  return createPortal(
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'var(--color-bg)', zIndex: 9999 }}>
      {/* soft, light ambience — a faint accent-tinted glow near the controls,
          nothing dark enough to fight with the pastel landscape or the text */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 12% 10%, color-mix(in srgb, ${colors.primary} 12%, transparent) 0%, transparent 45%)`,
          opacity: running ? 1 : 0.7,
        }}
      />

      <AmbientLandscape mode={mode} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 sm:p-6 z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold border shadow-sm"
          style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-primary)' }}
        >
          <Minimize2 size={16} /> Focus Mode
        </button>

        <div
          className="hidden sm:flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold border shadow-sm"
          style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-primary)' }}
        >
          Press Esc to exit full screen
          <span className="px-2 py-1 rounded-md text-[10px] font-black text-white" style={{ background: 'var(--color-text-primary)' }}>Esc</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleAmbient}
            aria-label="Toggle ambient sound"
            className="w-10 h-10 rounded-full flex items-center justify-center border shadow-sm"
            style={{
              background: ambientPlaying ? colors.subtle : 'rgba(255,255,255,0.85)',
              borderColor: 'rgba(0,0,0,0.06)',
              color: ambientPlaying ? colors.primary : 'var(--color-text-secondary)',
            }}
          >
            <Music size={16} />
          </button>
          <button
            onClick={() => setStatsVisible((v) => !v)}
            aria-label="Toggle stats panel"
            className="w-10 h-10 rounded-full flex items-center justify-center border shadow-sm"
            style={{
              background: statsVisible ? colors.subtle : 'rgba(255,255,255,0.85)',
              borderColor: 'rgba(0,0,0,0.06)',
              color: statsVisible ? colors.primary : 'var(--color-text-secondary)',
            }}
          >
            <AudioLines size={16} />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center border shadow-sm" style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-secondary)' }}>
            <MoreHorizontal size={16} />
          </button>
          <button
            onClick={onExit}
            aria-label="Exit focus mode"
            className="w-10 h-10 rounded-full flex items-center justify-center border shadow-sm"
            style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Left stats panel */}
      {statsVisible && (
        <div className="hidden md:flex flex-col gap-3 absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 w-60 z-10">
          <FocusModeStatCard
            icon={<Target size={18} />}
            iconBg="color-mix(in srgb, var(--color-accent) 18%, transparent)"
            iconColor="var(--color-accent)"
            label="Focus Sessions"
            value={todayFocusCount}
            sub="Today"
          />
          <FocusModeStatCard
            icon={<Flame size={18} />}
            iconBg="color-mix(in srgb, var(--color-warning) 18%, transparent)"
            iconColor="var(--color-warning)"
            label="Focus Time"
            value={todayFocusTimeLabel}
            sub="Today"
          />
          <FocusModeStatCard
            icon={<Coffee size={18} />}
            iconBg="color-mix(in srgb, var(--color-success) 18%, transparent)"
            iconColor="var(--color-success)"
            label="Breaks Taken"
            value={todayBreakCount}
            sub="Today"
          />
          <FocusModeStatCard
            icon={<Clock size={18} />}
            iconBg="color-mix(in srgb, var(--color-info) 18%, transparent)"
            iconColor="var(--color-info)"
            label="Longest Streak"
            value={longestStreakDays}
            sub="Days"
          />
        </div>
      )}

      {/* Center */}
      <div className="relative h-full flex items-center justify-center px-4 z-10">
        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-lg p-8 rounded-3xl border shadow-2xl" style={{ background: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs sm:text-sm font-black uppercase tracking-[0.35em]" style={{ color: colors.primary }}>
              {mode === 'focus' ? 'FOCUS' : mode === 'short_break' ? 'SHORT BREAK' : 'LONG BREAK'}
            </p>
            <p className="text-sm font-semibold text-text-secondary text-center">{MODE_COPY[mode]}</p>
            {selectedTaskTitle && mode === 'focus' && (
              <div className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-text-secondary bg-white/60 border border-white/40 max-w-[min(320px,85vw)] truncate mt-1">
                🎯 {selectedTaskTitle}
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center" style={{ animation: running ? 'focus-breathe 4s ease-in-out infinite' : 'none' }}>
            <div className="w-[clamp(240px,62vw,380px)] h-[clamp(240px,62vw,380px)]">
              <ProgressRing logicalSize={380} progress={progress} colors={colors} running={running} />
            </div>
            <div className="absolute flex flex-col items-center gap-3 select-none">
              <span className="text-6xl sm:text-7xl md:text-8xl font-black tabular-nums text-text-primary tracking-tight">
                {minutes}:{seconds}
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5" style={{ background: colors.subtle, color: colors.primary }}>
                <Target size={12} /> {mode === 'focus' ? 'Focus Session' : mode === 'short_break' ? 'Short Break' : 'Long Break'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3.5 sm:gap-4.5">
            <button onClick={onSkipBack} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/50 text-text-secondary hover:text-text-primary transition-all border border-white/40 shrink-0 bg-white/60" aria-label="Restart session">
              <SkipBack size={18} />
            </button>
            <button
              onClick={onReset}
              className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl hover:bg-white/50 text-text-secondary hover:text-text-primary transition-all border border-white/40 shrink-0 bg-white/60"
              aria-label="Reset timer"
            >
              <RotateCcw size={24} />
            </button>
            <Button onClick={onStartPause} size="lg" className="w-52 sm:w-60 h-14 sm:h-16 text-base sm:text-lg font-bold shadow-xl shrink-0" leftIcon={running ? <Pause size={24} /> : <Play size={24} />}>
              {running ? 'Pause' : mode === 'focus' ? 'Start Focus' : 'Start'}
            </Button>
            <button onClick={onSkipForward} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/50 text-text-secondary hover:text-text-primary transition-all border border-white/40 shrink-0 bg-white/60" aria-label="Skip to next session">
              <SkipForward size={18} />
            </button>
          </div>


        </div>

        {/* Quote card */}
        <div
          className="hidden lg:block absolute bottom-28 right-8 max-w-[320px] p-6 rounded-2xl border shadow-lg"
          style={{ background: 'rgba(255,255,255,0.82)', borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <p className="text-3xl leading-none mb-2" style={{ color: colors.primary }}>“</p>
          <p className="text-sm font-semibold text-text-primary leading-snug">{quote.text}</p>
          <p className="text-xs font-bold text-text-muted mt-3">— {quote.author}</p>
        </div>
      </div>

      {/* Bottom-left ambient player */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm" style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(0,0,0,0.06)' }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: colors.subtle, color: colors.primary }}>
            <Music size={15} />
          </span>
          <div>
            <p className="text-xs font-bold text-text-primary">{ambientSound}</p>
            <p className="text-[10px] text-text-muted font-semibold">Concentration</p>
          </div>
          <button onClick={onToggleAmbient} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: colors.primary, color: '#fff' }}>
            {ambientPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </div>

      {/* Bottom-right shortcuts */}
      <div className="hidden sm:block absolute bottom-6 right-6 z-10">
        <div className="px-5 py-3.5 rounded-2xl border shadow-sm" style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(0,0,0,0.06)' }}>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-3">Shortcuts</p>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1.5 rounded-md text-[10px] font-black" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--color-text-primary)' }}>Space</kbd>
              <span className="text-[11px] font-semibold text-text-secondary">Start / Pause</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1.5 rounded-md text-[10px] font-black" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--color-text-primary)' }}>R</kbd>
              <span className="text-[11px] font-semibold text-text-secondary">Reset</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes focus-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="focus-breathe"] { animation: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}

/* ───────────────────────── Task Selector ───────────────────────── */

function TaskSelector({
  tasks, selectedTaskId, onSelect,
}: {
  tasks: TaskDTO[]; selectedTaskId: string | null; onSelect: (taskId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all hover:border-accent/50"
        style={{
          background: 'var(--color-surface)',
          borderColor: selectedTaskId ? 'var(--color-accent)' : 'var(--color-border)',
          color: selectedTaskId ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Target size={14} className="shrink-0" style={{ color: selectedTaskId ? 'var(--color-accent)' : undefined }} />
          <span className="truncate">{selectedTask ? selectedTask.title : 'Link a task (optional)'}</span>
        </div>
        <ChevronDown size={14} className="shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl overflow-hidden"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)', zIndex: 50, maxHeight: 260, overflowY: 'auto' }}
        >
          <button onClick={() => { onSelect(null); setOpen(false); }} className="w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: 'var(--color-text-secondary)' }}>
            No task (general focus)
          </button>
          {tasks.length === 0 && <div className="px-3.5 py-2.5 text-[11px] text-text-muted">No active tasks found</div>}
          {tasks.map((task) => {
            const isActive = task.id === selectedTaskId;
            return (
              <button
                key={task.id}
                onClick={() => { onSelect(task.id); setOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-3"
                style={{ background: isActive ? 'var(--color-accent-subtle)' : undefined }}
              >
                <span className="truncate" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{task.title}</span>
                <span
                  className="shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: task.status === 'IN_PROGRESS' ? 'color-mix(in srgb, var(--color-info) 15%, transparent)' : 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
                    color: task.status === 'IN_PROGRESS' ? 'var(--color-info)' : 'var(--color-text-muted)',
                  }}
                >
                  {task.status === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Small presentational cards ───────────────────────── */

function StatCard({ icon, iconBg, iconColor, label, value, sub, subColor, sparkline }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: React.ReactNode;
  sub?: string; subColor?: string; sparkline?: number[];
}) {
  return (
    <Card variant="default" className="p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted truncate">{label}</p>
          <p className="text-lg font-black text-text-primary leading-tight">{value}</p>
          {sub && <p className="text-[10px] font-semibold mt-0.5" style={{ color: subColor }}>{sub}</p>}
        </div>
        {sparkline && <Sparkline values={sparkline} color={iconColor} />}
      </div>
    </Card>
  );
}

function TodaysPlanCard({ items, onPick }: { items: { id: string; title: string; time: string; color: string }[]; onPick: (id: string) => void }) {
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={14} style={{ color: 'var(--color-accent)' }} />
        <h4 className="text-xs font-bold text-text-primary">Today's Plan</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-text-muted font-semibold py-2">Nothing due today.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button key={item.id} onClick={() => onPick(item.id)} className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-xs font-semibold text-text-primary flex-1 text-left truncate">{item.title}</span>
              <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">{item.time}</span>
              <ChevronRight size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      )}
      <button className="mt-2.5 w-full py-2 rounded-xl border border-dashed text-xs font-bold text-accent flex items-center justify-center gap-1.5" style={{ borderColor: 'var(--color-accent-border)' }}>
        <Plus size={13} /> Add session
      </button>
    </Card>
  );
}

function AmbientSoundCard({ sound, setSound, playing, onToggle }: { sound: string; setSound: (s: string) => void; playing: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Music size={14} style={{ color: 'var(--color-accent)' }} />
        <h4 className="text-xs font-bold text-text-primary">Ambient Sound</h4>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-text-secondary flex items-center gap-1">
            {sound} <ChevronDown size={12} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1.5 w-32 rounded-xl border shadow-lg z-20 overflow-hidden" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
              {AMBIENT_SOUNDS.map((s) => (
                <button key={s} onClick={() => { setSound(s); setOpen(false); }} className="w-full text-left px-3 py-2 text-[11px] font-semibold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onToggle} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--gradient-accent)', color: '#fff' }} aria-label="Toggle ambient sound">
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
      <div className="mt-3 h-6 flex items-end gap-0.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${20 + Math.abs(Math.sin(i * 1.3)) * 80}%`,
              background: playing ? 'var(--color-accent)' : 'var(--color-border-subtle)',
              opacity: playing ? 0.5 + (i % 3) * 0.15 : 1,
              transition: 'background 300ms',
            }}
          />
        ))}
      </div>
    </Card>
  );
}

function DailyQuoteCard({ quote }: { quote: { text: string; author: string } }) {
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg leading-none" style={{ color: 'var(--color-accent)' }}>“</span>
        <h4 className="text-xs font-bold text-text-primary">Daily Quote</h4>
      </div>
      <p className="text-xs font-semibold text-text-primary leading-snug">{quote.text}</p>
      <p className="text-[11px] font-bold text-text-muted mt-2">— {quote.author}</p>
    </Card>
  );
}

function RecentSessionsCard({ sessions, tasksById }: { sessions: FocusSessionDTO[]; tasksById: Map<string, string> }) {
  const recent = sessions.slice(0, 5);
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-text-primary">Recent Sessions</h4>
        <button className="text-[11px] font-bold text-accent hover:text-accent-hover">View all</button>
      </div>
      {recent.length === 0 ? (
        <p className="text-[11px] text-text-muted font-semibold py-2">No sessions logged yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recent.map((s) => {
            const label = s.taskId ? tasksById.get(s.taskId) ?? 'Task' : s.isBreak ? 'Break' : 'Focus Session';
            return (
              <div key={s.id} className="flex items-center gap-2.5">
                {s.completed ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} className="shrink-0" />
                ) : (
                  <Circle size={16} className="text-text-muted shrink-0" />
                )}
                <span className="text-xs font-semibold text-text-primary flex-1 truncate">{label}</span>
                <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">
                  {new Date(s.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="text-[10px] font-bold text-text-muted whitespace-nowrap w-9 text-right">{s.durationMin}m</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ───────────────────────── Main Focus Page ───────────────────────── */

export function FocusPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<TimerMode>('focus');
  const [focusDurationMin, setFocusDurationMin] = useState(DURATIONS.focus);
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus * 60);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [ambientSound, setAmbientSound] = useState(AMBIENT_SOUNDS[0]);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const qc = useQueryClient();
  const { focusMode, setFocusMode } = useUIStore();
  const restoredRef = useRef(false);
  const completionLoggedRef = useRef(false);
  const lastLoggedElapsedRef = useRef(0);
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => { elapsedRef.current = elapsedSeconds; }, [elapsedSeconds]);

  useEffect(() => {
    const restored = restoreTimerState();
    if (restored && !searchParams.get('taskId')) {
      const elapsed = new Date().getTime() - new Date(restored.savedAt).getTime();
      const elapsedSec = Math.floor(elapsed / 1000);
      let newSecondsLeft = restored.secondsLeft;
      let newElapsedSec = restored.elapsedSeconds;

      if (restored.running) {
        newSecondsLeft = Math.max(0, restored.secondsLeft - elapsedSec);
        newElapsedSec = restored.elapsedSeconds + Math.min(elapsedSec, restored.secondsLeft);
        if (newSecondsLeft <= 0) {
          setMode('focus');
          setSecondsLeft(DURATIONS.focus * 60);
          setRunning(false);
          setStartedAt(null);
          setElapsedSeconds(0);
          setSelectedTaskId(null);
          clearTimerState();
          restoredRef.current = true;
          return;
        }
      }
      setMode(restored.mode as TimerMode);
      setSecondsLeft(newSecondsLeft);
      setRunning(restored.running);
      setStartedAt(restored.startedAt);
      setElapsedSeconds(newElapsedSec);
      setSelectedTaskId(restored.selectedTaskId);
    } else if (searchParams.get('taskId')) {
      setSelectedTaskId(searchParams.get('taskId'));
    }
    restoredRef.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!restoredRef.current) return;
    if (startedAt) {
      saveTimerState({ mode, secondsLeft, running, startedAt, elapsedSeconds, selectedTaskId });
    }
  }, [mode, secondsLeft, running, startedAt, elapsedSeconds, selectedTaskId]);

  const { data: sessions } = useQuery({
    queryKey: ['focus'],
    queryFn: () => apiClient.get<ListResponse<FocusSessionDTO>>('/focus').then((r) => r.data),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 'focus-active'],
    queryFn: () => apiClient.get<ListResponse<TaskDTO>>('/tasks').then((r) => r.data),
  });

  const activeTasks = useMemo(() => (tasksData?.data ?? []).filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS'), [tasksData]);
  const allTasks = tasksData?.data ?? [];
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null;
  const tasksById = useMemo(() => new Map(allTasks.map((t) => [t.id, t.title])), [allTasks]);

  const todaysPlanItems = useMemo(() => {
    const colors = ['var(--color-accent)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-info)'];
    return allTasks
      .filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), new Date()) && t.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
      .map((t, i) => ({
        id: t.id,
        title: t.title,
        time: new Date(t.dueDate!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        color: colors[i % colors.length],
      }));
  }, [allTasks]);

  const logSession = useMutation({
    mutationFn: (data: CreateFocusSessionRequest) => apiClient.post<FocusSessionDTO>('/focus', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['focus'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const isBreakMode = mode === 'short_break' || mode === 'long_break';
  const isBreakModeRef = useRef(isBreakMode);
  useEffect(() => { isBreakModeRef.current = isBreakMode; }, [isBreakMode]);

  const getUnloggedMinutes = useCallback(() => Math.round((elapsedRef.current - lastLoggedElapsedRef.current) / 60), []);

  const saveSession = useCallback((completed: boolean) => {
    if (!startedAt) return;
    const elapsedMin = getUnloggedMinutes();
    if (elapsedMin >= 1) {
      logSession.mutate({ durationMin: elapsedMin, startedAt, completed, taskId: selectedTaskId, isBreak: isBreakModeRef.current });
      lastLoggedElapsedRef.current = elapsedRef.current;
    }
  }, [startedAt, getUnloggedMinutes, selectedTaskId, logSession]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0 && startedAt && !completionLoggedRef.current) {
      completionLoggedRef.current = true;
      setRunning(false);
      const elapsedMin = Math.round((elapsedRef.current - lastLoggedElapsedRef.current) / 60);
      if (elapsedMin >= 1) {
        logSession.mutate({ durationMin: elapsedMin, startedAt, completed: true, taskId: selectedTaskId, isBreak: isBreakModeRef.current });
      }
      lastLoggedElapsedRef.current = elapsedRef.current;
    }
    if (running && secondsLeft > 0) completionLoggedRef.current = false;
  }, [running, secondsLeft, startedAt, selectedTaskId, logSession]);

  useEffect(() => {
    const handler = () => {
      if (!isFullscreenActive() && focusMode) { setRunning(false); setFocusMode(false); }
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [focusMode, setFocusMode]);

  useEffect(() => {
    const handleBeforeUnload = () => { if (running) setRunning(false); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [running]);

  const enterFocusMode = async () => {
    try { await requestFullscreen(document.documentElement); } catch { /* denied — overlay still covers viewport */ }
    setFocusMode(true);
  };
  const exitFocusMode = async () => {
    setRunning(false);
    if (isFullscreenActive()) { try { await exitFullscreen(); } catch { /* no-op */ } }
    setFocusMode(false);
  };

  const durationForMode = (m: TimerMode) => (m === 'focus' ? focusDurationMin : DURATIONS[m]);

  const changeMode = (m: TimerMode) => {
    setMode(m);
    setSecondsLeft(durationForMode(m) * 60);
    setRunning(false);
    setStartedAt(null);
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    lastLoggedElapsedRef.current = 0;
  };

  const handleQuickDuration = (min: number) => {
    setFocusDurationMin(min);
    if (mode === 'focus' && !running) setSecondsLeft(min * 60);
  };

  const applyCustomDuration = () => {
    const val = parseInt(customInput, 10);
    if (val > 0 && val <= 240) handleQuickDuration(val);
    setCustomOpen(false);
    setCustomInput('');
  };

  const handleStartPause = () => {
    if (running) { saveSession(false); setRunning(false); }
    else { if (!startedAt) setStartedAt(new Date().toISOString()); setRunning(true); }
  };

  const handleReset = () => {
    setRunning(false);
    setSecondsLeft(durationForMode(mode) * 60);
    setStartedAt(null);
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    lastLoggedElapsedRef.current = 0;
    clearTimerState();
  };

  const handleSkipForward = () => {
    const order: TimerMode[] = ['focus', 'short_break', 'long_break'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    changeMode(next);
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const progress = 1 - secondsLeft / (durationForMode(mode) * 60);
  const colors = getModeColors(mode);

  const allSessions = sessions?.data ?? [];
  const focusOnlySessions = allSessions.filter((s) => !s.isBreak);
  const breakOnlySessions = allSessions.filter((s) => s.isBreak);
  const totalFocusMin = focusOnlySessions.reduce((acc, s) => acc + s.durationMin, 0);
  const totalFocusCount = focusOnlySessions.length;
  const totalBreakMin = breakOnlySessions.reduce((acc, s) => acc + s.durationMin, 0);
  const totalBreakCount = breakOnlySessions.length;

  const todaySessions = allSessions.filter((s) => isSameDay(new Date(s.startedAt), new Date()));
  const todayFocusMin = todaySessions.filter((s) => !s.isBreak).reduce((acc, s) => acc + s.durationMin, 0);
  const todayFocusCount = todaySessions.filter((s) => !s.isBreak).length;
  const todayBreakCount = todaySessions.filter((s) => s.isBreak).length;
  const goalPct = Math.min(100, Math.round((todayFocusMin / DEFAULT_GOAL_MIN) * 100));

  const weekBars = useMemo(() => {
    const dateKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0];
    });
    const days = dateKeys.map((key, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { date: d, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), minutes: 0, key };
    });
    allSessions.forEach((s) => {
      const sd = new Date(s.startedAt); sd.setHours(0, 0, 0, 0);
      const sessionKey = sd.toISOString().split('T')[0];
      const match = days.find((d) => d.key === sessionKey);
      if (match) match.minutes += s.durationMin;
    });
    const max = Math.max(...days.map((d) => d.minutes), 1);
    return days.map((d) => ({ ...d, pct: d.minutes > 0 ? Math.round((d.minutes / max) * 100) : 0 }));
  }, [allSessions]);

  const thisWeekTotal = weekBars.reduce((acc, d) => acc + d.minutes, 0);
  const lastWeekTotal = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - 13); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setDate(end.getDate() - 7); end.setHours(23, 59, 59, 999);
    return allSessions.filter((s) => { const d = new Date(s.startedAt); return d >= start && d <= end; }).reduce((acc, s) => acc + s.durationMin, 0);
  }, [allSessions]);
  const weekDeltaMin = thisWeekTotal - lastWeekTotal;

  // Longest run of consecutive calendar days containing at least one
  // completed focus session — a simple, honest streak metric.
  const longestStreakDays = useMemo(() => {
    const dayKeys = new Set(
      focusOnlySessions.map((s) => {
        const d = new Date(s.startedAt); d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    if (dayKeys.size === 0) return 0;
    const sortedDays = Array.from(dayKeys).sort((a, b) => a - b);
    let longest = 1;
    let current = 1;
    const oneDayMs = 86400000;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] === oneDayMs) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    return longest;
  }, [focusOnlySessions]);

  // A lightweight, honest stand-in for a "focus score": how close today is to
  // the goal, nudged up slightly by momentum from completed sessions.
  const focusScore = Math.max(0, Math.min(100, Math.round(goalPct * 0.8 + Math.min(totalFocusCount, 10) * 2)));
  const focusScoreLabel = focusScore >= 85 ? 'Excellent' : focusScore >= 65 ? 'Good' : focusScore >= 35 ? 'Fair' : 'Building';

  const modeTabs = [
    { id: 'focus', label: 'Focus' },
    { id: 'short_break', label: 'Short Break' },
    { id: 'long_break', label: 'Long Break' },
  ];

  return (
    <>
      {focusMode && (
        <FocusModeFullScreen
          mode={mode}
          minutes={minutes}
          seconds={seconds}
          progress={progress}
          running={running}
          selectedTaskTitle={selectedTask?.title ?? null}
          quote={quote}
          ambientPlaying={ambientPlaying}
          ambientSound={ambientSound}
          onToggleAmbient={() => setAmbientPlaying((p) => !p)}
          todayFocusCount={todayFocusCount}
          todayFocusTimeLabel={formatDuration(todayFocusMin * 60000)}
          todayBreakCount={todayBreakCount}
          longestStreakDays={longestStreakDays}
          onExit={exitFocusMode}
          onReset={handleReset}
          onStartPause={handleStartPause}
          onSkipBack={handleReset}
          onSkipForward={handleSkipForward}
        />
      )}

      <div className="w-full max-w-[1500px] mx-auto flex flex-col gap-4 sm:gap-5">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4 sm:gap-5">
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <PageHeader icon={<Timer size={20} />} title="Focus Timer" subtitle="Stay productive using the Pomodoro technique" />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={enterFocusMode}
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-border"
              >
                <Maximize2 size={14} /> Focus Mode
              </button>
              <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all" aria-label="Settings">
                <Settings size={15} />
              </button>
              <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all" aria-label="Toggle theme">
                <Moon size={15} />
              </button>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Target size={16} />}
              iconBg="color-mix(in srgb, var(--color-accent) 14%, transparent)"
              iconColor="var(--color-accent)"
              label="Today's Focus"
              value={formatDuration(todayFocusMin * 60000)}
              sub={`of ${formatDuration(DEFAULT_GOAL_MIN * 60000)} goal`}
              subColor="var(--color-text-muted)"
            />
            <StatCard
              icon={<Flame size={16} />}
              iconBg="color-mix(in srgb, var(--color-warning) 14%, transparent)"
              iconColor="var(--color-warning)"
              label="Completed"
              value={`${todayFocusCount} sessions`}
              sub={todayBreakCount > 0 ? `${todayBreakCount} breaks today` : 'No breaks yet'}
              subColor="var(--color-success)"
            />
            <StatCard
              icon={<TrendingUp size={16} />}
              iconBg="color-mix(in srgb, var(--color-success) 14%, transparent)"
              iconColor="var(--color-success)"
              label="Focus Score"
              value={focusScore}
              sub={focusScoreLabel}
              subColor="var(--color-success)"
              sparkline={weekBars.map((d) => d.minutes)}
            />
            <StatCard
              icon={<Timer size={16} />}
              iconBg="color-mix(in srgb, var(--color-info) 14%, transparent)"
              iconColor="var(--color-info)"
              label="Total Focus"
              value={formatDuration(thisWeekTotal * 60000)}
              sub="this week"
              subColor="var(--color-text-muted)"
            />
          </motion.div>

          {/* Progress bar under today's focus (matches the goal bar in the reference) */}
          <motion.div variants={itemVariants} className="-mt-2 px-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${goalPct}%`, background: 'var(--gradient-accent)' }} />
            </div>
          </motion.div>

          {/* 3-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_290px] gap-4 items-start">
            {/* Left column */}
            <motion.div variants={itemVariants} className="order-2 lg:order-1 flex flex-col gap-4">
              <TodaysPlanCard items={todaysPlanItems} onPick={setSelectedTaskId} />
              <AmbientSoundCard sound={ambientSound} setSound={setAmbientSound} playing={ambientPlaying} onToggle={() => setAmbientPlaying((p) => !p)} />
              <DailyQuoteCard quote={quote} />
            </motion.div>

            {/* Center column — timer */}
            <motion.div variants={itemVariants} className="order-1 lg:order-2 flex flex-col items-center gap-5">
              <TabBar tabs={modeTabs} activeTab={mode} onTabChange={(m) => changeMode(m as TimerMode)} variant="pill" className="w-full justify-center" />

              <div
                className="relative flex items-center justify-center my-1 p-6 sm:p-8 rounded-full transition-all duration-500"
                style={{
                  boxShadow: running ? `0 0 40px ${colors.glow}, inset 0 0 24px ${colors.glow}` : '0 10px 30px -10px rgba(0,0,0,0.08), inset 0 0 10px rgba(0,0,0,0.02)',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <button
                  onClick={handleReset}
                  className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm z-10"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  aria-label="Restart session"
                >
                  <SkipBack size={15} />
                </button>
                <div className="w-[clamp(190px,54vw,260px)] h-[clamp(190px,54vw,260px)]">
                  <ProgressRing logicalSize={260} progress={progress} colors={colors} running={running} />
                </div>
                <div className="absolute flex flex-col items-center select-none">
                  <span className="text-4xl sm:text-5xl font-black tabular-nums text-text-primary tracking-tight">{minutes}:{seconds}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-2 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: colors.subtle, color: colors.primary }}>
                    <Target size={10} /> {mode === 'focus' ? 'Focus Session' : mode.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={handleSkipForward}
                  className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm z-10"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  aria-label="Skip to next session"
                >
                  <SkipForward size={15} />
                </button>
              </div>

              <p className="text-xs font-semibold text-text-secondary text-center -mt-2">{MODE_COPY[mode]}</p>

              <Button onClick={handleStartPause} size="lg" className="w-48 shadow-lg font-bold" leftIcon={running ? <Pause size={18} /> : <Play size={18} />}>
                {running ? 'Pause' : mode === 'focus' ? 'Start Focus' : 'Start'}
              </Button>

              {/* Quick Start */}
              {mode === 'focus' && (
                <Card variant="default" className="p-4 w-full">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-bold text-text-primary">Quick Start</p>
                    <button onClick={() => setCustomOpen((o) => !o)} className="text-[11px] font-bold text-accent hover:text-accent-hover">Custom ✎</button>
                  </div>
                  <p className="text-[11px] text-text-muted font-semibold mb-3">Choose a duration and get started</p>
                  {customOpen && (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Minutes"
                        className="flex-1 px-3 py-2 rounded-lg border text-xs font-semibold"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                      />
                      <button onClick={applyCustomDuration} className="px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--gradient-accent)' }}>Set</button>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_DURATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => handleQuickDuration(d)}
                        className="py-2.5 rounded-xl text-xs font-bold border transition-colors"
                        style={{
                          background: focusDurationMin === d ? 'var(--gradient-accent)' : 'var(--color-surface-raised)',
                          color: focusDurationMin === d ? '#fff' : 'var(--color-text-primary)',
                          borderColor: focusDurationMin === d ? 'transparent' : 'var(--color-border)',
                        }}
                      >
                        {d}<span className="block text-[9px] font-semibold opacity-80">min</span>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {!bannerDismissed && totalFocusCount > 0 && (
                <Card variant="default" className="p-3.5 w-full flex items-center justify-between gap-3" style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))', borderColor: 'var(--color-accent-border)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">🔥</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary">You're on a roll!</p>
                      <p className="text-[11px] text-text-muted font-semibold truncate">You've completed {todayFocusCount} sessions today. Keep going!</p>
                    </div>
                  </div>
                  <button onClick={() => setBannerDismissed(true)} className="text-text-muted hover:text-text-primary shrink-0"><X size={14} /></button>
                </Card>
              )}
            </motion.div>

            {/* Right column */}
            <motion.div variants={itemVariants} className="order-3 flex flex-col gap-4">
              <Card variant="default" className="p-4">
                <TaskSelector tasks={activeTasks} selectedTaskId={selectedTaskId} onSelect={setSelectedTaskId} />
                {selectedTask && (
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gradient-accent)' }}>
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/20 shrink-0">
                      <Target size={16} className="text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{selectedTask.title}</p>
                      <p className="text-[10px] text-white/80 font-semibold">Linked task</p>
                    </div>
                    <button onClick={() => setSelectedTaskId(null)} className="text-[10px] font-bold text-white px-2.5 py-1 rounded-lg bg-white/20 shrink-0">Change</button>
                  </div>
                )}
              </Card>

              <RecentSessionsCard sessions={[...allSessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())} tasksById={tasksById} />

              <Card variant="default" className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-text-primary">Focus Statistics</h4>
                  <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">This Week <ChevronDown size={11} /></span>
                </div>
                {allSessions.length > 0 ? (
                  <div className="flex items-stretch justify-between gap-1 h-16 mb-3">
                    {weekBars.map((d, i) => (
                      <div key={i} className="flex-1 h-full flex flex-col items-center gap-1.5 min-w-0">
                        <div className="w-full flex-1 flex items-end rounded-md overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
                          <div className="w-full rounded-md transition-all duration-500" style={{ height: `${Math.max(d.pct, d.minutes > 0 ? 8 : 0)}%`, background: 'var(--gradient-accent)' }} title={`${d.minutes} min`} />
                        </div>
                        <span className="text-[9px] font-bold text-text-muted uppercase shrink-0">{d.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center mb-3"><p className="text-[11px] text-text-muted">No sessions yet</p></div>
                )}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <p className="text-base font-black text-text-primary">{formatDuration(thisWeekTotal * 60000)}</p>
                    <p className="text-[10px] text-text-muted font-semibold">Total Focus</p>
                  </div>
                  <p className="text-[11px] font-bold" style={{ color: weekDeltaMin >= 0 ? 'var(--color-success)' : 'var(--color-danger, #ef4444)' }}>
                    {weekDeltaMin >= 0 ? '+' : ''}{formatDuration(Math.abs(weekDeltaMin) * 60000)} vs last week
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Task Time Analysis */}
          {selectedTask && sessions && (
            <motion.div variants={itemVariants}>
              <TaskTimeAnalysis task={selectedTask} sessions={sessions.data} />
            </motion.div>
          )}

          <motion.p variants={itemVariants} className="text-center text-xs font-semibold text-text-muted pb-2">
            💡 Tip: Take short breaks to recharge. You'll come back stronger!
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}