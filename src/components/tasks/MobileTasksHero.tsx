/**
 * MobileTasksHero.tsx
 *
 * Mobile-only (< md) hero section for the Tasks page.
 * Mirrors the design mockup exactly:
 *   ┌──────────────────────────────────────┐
 *   │  [logo]      [search] [bell] [avatar]│  ← top bar
 *   │  Thu, 4 Sep                           │
 *   │  Make today count                     │  ← headline
 *   │  Small steps. Big progress.           │
 *   │  [ 3 tasks left > ]                   │  ← pill button
 *   │  ╔═══════════════════════════════════╗│
 *   │  ║ SVG landscape (mountains + sun)  ║│
 *   │  ╚═══════════════════════════════════╝│
 *   ├──────────────────────────────────────┤
 *   │  [0%●] 3 Done | 0 Due | 0 Up | 8 Tot │  ← stats card
 *   ├──────────────────────────────────────┤
 *   │  [+ New Task] [Board] [Import] [AI]  │  ← quick actions
 *   ├──────────────────────────────────────┤
 *   │  Filter tabs (pending/today/…)        │
 *   └──────────────────────────────────────┘
 *
 * The desktop hero (TasksHero) is rendered on md+ and is not touched.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Columns3,
  CreditCard,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Zap,
  Calendar,
  ListChecks,
  ArrowLeftRight,
} from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';

// ─── Types (mirrored from TasksPage so no circular import) ────────────────

export type MobileTaskFilter = 'pending' | 'today' | 'upcoming' | 'completed' | 'overdue' | 'all';

export interface MobileHeroCounts {
  pending: number;
  today: number;
  upcoming: number;
  completed: number;
  overdue: number;
  all: number;
}

export interface MobileTasksHeroProps {
  user: { name?: string | null; email?: string } | null;
  counts: MobileHeroCounts;
  filter: MobileTaskFilter;
  setFilter: (f: MobileTaskFilter) => void;
  notionConnected: boolean;
  /** Current view mode — drives the Board/Card toggle */
  view: 'list' | 'board';
  onViewChange: (v: 'list' | 'board') => void;
  onNewTask: () => void;
  onNotionImport: () => void;
  onAIPlan: () => void;
  /** Progress ring 0-100 */
  completionPct: number;
  isFetching: boolean;
}

// ─── SVG landscape background ─────────────────────────────────────────────

function LandscapeSVG({ isDark }: { isDark: boolean }) {
  return (
    <img
      className="absolute -top-8 w-full h-auto object-cover pointer-events-none select-none"
      src={isDark ? '/task-hero-dark.png' : '/task-hero.png'}
      alt=""
      aria-hidden="true"
    />
  );
}

// ─── Circular progress ring (0 % shown when nothing done) ─────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#6366f1';

  return (
    <div className="relative flex-shrink-0 w-14 h-14 flex items-center justify-center">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4.5" />
        <motion.circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          transform="rotate(-90 28 28)"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[11px] font-black" style={{ color: 'var(--color-text-primary)' }}>{pct}%</span>
        <span className="text-[8px] font-semibold mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Today</span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

const FILTER_LABELS: Record<MobileTaskFilter, string> = {
  pending:   'Pending',
  today:     'Today',
  upcoming:  'Upcoming',
  completed: 'Done',
  overdue:   'Overdue',
  all:       'All',
};

export function MobileTasksHero({
  user,
  counts,
  filter,
  setFilter,
  notionConnected,
  view,
  onViewChange,
  onNewTask,
  onNotionImport,
  onAIPlan,
  completionPct,
  isFetching,
}: MobileTasksHeroProps) {
  const today    = new Date();
  const dayName  = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dateNum  = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const pendingCount = counts.pending + counts.today;
  const isDark = useDarkMode();

  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();

  // motivational headline rotates by weekday
  const headlines = [
    'Make today count',
    'Start strong today',
    'Keep up the pace',
    'Stay in the flow',
    'Push through today',
    'Finish the week well',
    'Rest & recharge',
  ];
  const headline = headlines[today.getDay()];

  // ── stat items ────────────────────────────────────────────────────────
  const stats = [
    {
      icon: (
        <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
      ),
      value: counts.completed,
      label: 'Done',
    },
    {
      icon: (
        <Zap size={18} style={{ color: '#f59e0b' }} />
      ),
      value: counts.today,
      label: 'Due today',
    },
    {
      icon: (
        <Calendar size={18} style={{ color: '#6366f1' }} />
      ),
      value: counts.upcoming,
      label: 'Upcoming',
    },
    {
      icon: (
        <ListChecks size={18} style={{ color: '#94a3b8' }} />
      ),
      value: counts.all,
      label: 'Total',
    },
  ];

  // ── quick-action buttons ─────────────────────────────────────────────
  // The "Board" slot becomes a Card ↔ Board view toggle.
  // Active state gets the indigo gradient; inactive is a plain outlined card.
  const isBoard = view === 'board';

  const actions = [
    {
      key: 'new',
      label: 'New Task',
      icon: <Plus size={20} className="text-white" />,
      iconBg: 'linear-gradient(135deg,#6366f1 0%,#818cf8 100%)',
      cardBg: 'var(--color-surface)',
      border: 'var(--color-border)',
      onClick: onNewTask,
    },
    {
      key: 'view',
      label: isBoard ? 'Card' : 'Board',
      icon: isBoard
        ? <CreditCard size={20} style={{ color: '#6366f1' }} />
        : <Columns3    size={20} style={{ color: '#6366f1' }} />,
      iconBg: 'rgba(99,102,241,0.10)',
      cardBg: 'var(--color-surface)',
      border: 'var(--color-border)',
      onClick: () => onViewChange(isBoard ? 'list' : 'board'),
    },
    {
      key: 'import',
      label: 'Import',
      icon: (
        <span
          style={{
            fontFamily: "'Georgia', serif",
            fontWeight: 900,
            fontSize: 18,
            color: '#1a1a1a',
            lineHeight: 1,
          }}
        >
          N
        </span>
      ),
      iconBg: 'rgba(0,0,0,0.06)',
      cardBg: 'var(--color-surface)',
      border: 'var(--color-border)',
      onClick: onNotionImport,
    },
    {
      key: 'ai',
      label: 'AI Plan',
      icon: <Sparkles size={20} style={{ color: '#d97706' }} />,
      iconBg: 'rgba(251,191,36,0.18)',
      cardBg: 'rgba(251,191,36,0.05)',
      border: 'rgba(251,191,36,0.28)',
      onClick: onAIPlan,
    },
  ];

  return (
    <div className="md:hidden flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── Hero banner with SVG landscape ─────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: 210 }}>
        <LandscapeSVG isDark={isDark} />

        {/* Thin fetch-progress bar */}
        {isFetching && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px] z-20"
            style={{ background: 'linear-gradient(90deg,#6366f1,#818cf8,#6366f1)' }}
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.0, ease: 'easeInOut', repeat: Infinity }}
          />
        )}

        {/* ── Text content overlaid on the sky ─── */}
        <div className="relative z-10 px-4 pt-5">
          <p
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: isDark ? 'rgba(200,190,255,0.70)' : 'rgba(40,40,90,0.55)' }}
          >
            {dayName}, {dateNum}
          </p>

          <h1
            className="mt-1 text-[22px] font-black leading-tight"
            style={{ color: isDark ? '#e8e0ff' : '#1e1e40' }}
          >
            {headline}{' '}
            <span style={{ color: '#818cf8' }}>count</span>
          </h1>

          <p className="text-[12px] mt-0.5" style={{ color: isDark ? 'rgba(200,190,255,0.55)' : 'rgba(40,40,90,0.50)' }}>
            Small steps. Big progress.
          </p>

          {pendingCount > 0 && (
            <button
              onClick={onNewTask}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold shadow-sm transition-all active:scale-95"
              style={{
                background: isDark ? 'rgba(30,25,60,0.82)' : 'rgba(255,255,255,0.82)',
                color: isDark ? '#c4b8ff' : '#374151',
                border: isDark ? '1px solid rgba(130,110,255,0.30)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              {pendingCount} task{pendingCount !== 1 ? 's' : ''} left
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Stats card (overlaps the hero by -mt) ───────────────────────── */}
      <div className="mx-4 -mt-4 relative z-20">
        <div
          className="rounded-2xl shadow-md overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-3 px-3 py-3">
            {/* Progress ring */}
            <ProgressRing pct={completionPct} />

            {/* Divider */}
            <div className="w-px self-stretch" style={{ background: 'var(--color-border)' }} />

            {/* Stat columns */}
            <div className="flex-1 grid grid-cols-4 gap-0">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-0.5 py-1">
                  {s.icon}
                  <span
                    className="text-sm font-black leading-none mt-0.5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {s.value}
                  </span>
                  <span
                    className="text-[9px] font-medium text-center leading-tight"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick-action button grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2.5 mx-4 mt-3">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={a.onClick}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1 transition-all active:scale-95"
            style={{
              background: a.cardBg,
              border: `1px solid ${a.border}`,
            }}
          >
            {/* Icon wrapper — view-toggle gets a swap badge in the corner */}
            <div className="relative">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: a.iconBg }}
              >
                {a.icon}
              </div>
              {a.key === 'view' && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: '#6366f1' }}
                >
                  <ArrowLeftRight size={8} className="text-white" />
                </div>
              )}
            </div>
            <span
              className="text-[10.5px] font-semibold text-center leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────────── */}
      <div className="mt-3 pb-1 overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 px-4 w-max">
          {(Object.keys(FILTER_LABELS) as MobileTaskFilter[]).map((f) => {
            const isActive = filter === f;
            const count = counts[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all active:scale-95"
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(99,102,241,0.30)',
                      }
                    : {
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                      }
                }
              >
                {FILTER_LABELS[f]}
                {count > 0 && (
                  <span
                    className="rounded-full px-1.5 py-px text-[9px] font-black leading-none"
                    style={
                      isActive
                        ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                        : {
                            background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                            color: 'var(--color-accent)',
                          }
                    }
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thin separator before task list */}
      <div className="mt-3 mx-4" style={{ borderTop: '1px solid var(--color-border)' }} />
    </div>
  );
}
