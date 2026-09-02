import { useState, useMemo, useRef, useCallback, useEffect, useTransition, useDeferredValue } from 'react';
import { useInView } from 'react-intersection-observer';
import { CreditCard, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePageVariants } from '../lib/motionVariants';
import { useFloatingEnabled } from '../hooks/useAnimationPrefs';
import {
  CheckSquare,
  Plus,
  Search,
  ChevronDown,
  Zap,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  BookOpen,
  ListChecks,
  Columns3,
  X,
  Flame,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import { useTasks, useTasksOffset, useUpdateTask, useDeleteTask } from '../features/tasks/hooks/useTasks';
import { useTaskKeyboardShortcuts } from '../hooks/useTaskKeyboardShortcuts';
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard';
import { tasksApi } from '../features/tasks/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { LoadingScreen } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { NotionImportModal } from '../components/notion/NotionImportModal';
import { useNotionStatus } from '../features/notion/hooks/useNotion';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskBoardView } from '../components/tasks/TaskBoardView';
import { TaskCard } from '../components/tasks/TaskCard';
import { PageControls } from '../components/tasks/PageControls';
import { TasksEmptyState } from '../components/tasks/TasksEmptyState';
import { ProductivityEngine } from '../components/habits/ProductivityEngine';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useUserPlan } from '../features/billing/useUserPlan';
import { useUpgradeModalStore } from '../store/upgradeModalStore';
import type { DailyAnalyticsDTO, TaskCountsDTO, TaskDTO, TaskStatus } from '../types';
import {
  dateKeyInTimeZone,
  formatDueDateInTimeZone,
  isFutureTaskInTimeZone,
  isOverdueInTimeZone,
  isTodayInTimeZone,
  isUpcomingInTimeZone,
} from '../lib/taskDateUtils';

type TaskFilter = 'pending' | 'today' | 'upcoming' | 'completed' | 'overdue' | 'all';
type ViewMode = 'list' | 'board';
type SortKey = 'priority' | 'dueDate' | 'created';

// Date filter preset — drives the from/to params independently of the status filter tab
type DatePreset = 'any' | 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'no_date' | 'custom';

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** Returns today's date string in YYYY-MM-DD (local time). */
function localDateStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

/** Compute from/to for a given date preset. Returns undefined for 'any'/'no_date'/'custom'. */
function datePresetToRange(preset: DatePreset): { from?: string; to?: string; noDate?: boolean } {
  switch (preset) {
    case 'today':
      return { from: localDateStr(0), to: localDateStr(0) };
    case 'tomorrow':
      return { from: localDateStr(1), to: localDateStr(1) };
    case 'this_week': {
      const now = new Date();
      const day = now.getDay(); // 0=Sun
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - day);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { from: startOfWeek.toISOString().split('T')[0], to: endOfWeek.toISOString().split('T')[0] };
    }
    case 'next_week': {
      const now = new Date();
      const day = now.getDay();
      const startOfNext = new Date(now);
      startOfNext.setDate(now.getDate() - day + 7);
      const endOfNext = new Date(startOfNext);
      endOfNext.setDate(startOfNext.getDate() + 6);
      return { from: startOfNext.toISOString().split('T')[0], to: endOfNext.toISOString().split('T')[0] };
    }
    case 'this_month': {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] };
    }
    case 'no_date':
      return { noDate: true };
    default:
      return {};
  }
}

// ─── TasksHero ────────────────────────────────────────────────────────────────

type TasksCounts = {
  pending: number;
  today: number;
  upcoming: number;
  completed: number;
  overdue: number;
  all: number;
};

type AnalyticsWindow = {
  recent: Array<{ tasksCompleted: number; focusMinutes: number; habitsCompleted: number }>;
  tasksTrend: string;
  focusTrend: string;
  scoreTrend: string;
  scoreSignal: number;
};

// ─── DateFilterBar ────────────────────────────────────────────────────────────

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'any', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This week' },
  { value: 'next_week', label: 'Next week' },
  { value: 'this_month', label: 'This month' },
  { value: 'no_date', label: 'No date' },
  { value: 'custom', label: 'Custom…' },
];

function DateFilterBar({
  datePreset,
  setDatePreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: {
  datePreset: DatePreset;
  setDatePreset: (v: DatePreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(customFrom);
  const [draftTo, setDraftTo] = useState(customTo);
  const hasActive = datePreset !== 'any' && !(datePreset === 'custom' && !customFrom && !customTo);
  const activeLabel = DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? 'Date';

  const handleToggleOpen = () => {
    if (!open && datePreset === 'custom') {
      setDraftFrom(customFrom);
      setDraftTo(customTo);
    }
    setOpen((v) => !v);
  };

  const handleApply = () => {
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
    setOpen(false);
  };

  const handleClear = () => {
    setDatePreset('any');
    setCustomFrom('');
    setCustomTo('');
    setDraftFrom('');
    setDraftTo('');
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleToggleOpen}
        className="flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-black whitespace-nowrap transition-colors"
        style={{
          background: hasActive
            ? 'color-mix(in srgb, var(--color-info) 10%, var(--color-surface-raised))'
            : 'var(--color-surface-raised)',
          borderColor: hasActive ? 'color-mix(in srgb, var(--color-info) 40%, transparent)' : 'var(--color-border)',
          color: hasActive ? 'var(--color-info)' : 'var(--color-text-primary)',
        }}
      >
        <CalendarDays size={12} />
        {hasActive ? activeLabel : 'Date'}
        {hasActive ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-0.5 flex items-center rounded-full p-0.5 hover:bg-black/10"
            role="button"
            aria-label="Clear date filter"
          >
            <X size={10} />
          </span>
        ) : (
          <ChevronDown size={12} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-2 w-56 overflow-hidden rounded-xl border shadow-lg z-20"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setDatePreset(p.value);
                  if (p.value === 'custom') {
                    setDraftFrom(customFrom);
                    setDraftTo(customTo);
                  } else {
                    setOpen(false);
                  }
                }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-semibold transition-colors"
                style={{
                  color: datePreset === p.value ? 'var(--color-info)' : 'var(--color-text-secondary)',
                  background:
                    datePreset === p.value
                      ? 'color-mix(in srgb, var(--color-info) 8%, transparent)'
                      : 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}

            {datePreset === 'custom' && (
              <div
                className="border-t px-3.5 py-3 flex flex-col gap-2"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    From
                  </label>
                  <input
                    type="date"
                    value={draftFrom}
                    onChange={(e) => setDraftFrom(e.target.value)}
                    className="rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1"
                    style={{
                      background: 'var(--color-surface-raised)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    To
                  </label>
                  <input
                    type="date"
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                    className="rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1"
                    style={{
                      background: 'var(--color-surface-raised)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApply}
                  className="mt-1 w-full rounded-lg py-1.5 text-xs font-bold text-white"
                  style={{ background: 'var(--color-info)' }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TasksHero({
  user,
  greeting,
  counts,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  searchRef,
  view,
  setView,
  setTaskViewPreference,
  sortBy,
  setSortBy,
  sortMenuOpen,
  setSortMenuOpen,
  sortLabel,
  notionConnected,
  onNotionImport,
  onNewTask,
  capacityUsedPct,
  capacityLabel,
  tasksScheduledToday,
  plannedMinutesToday,
  completedCount,
  overdueCount,
  analyticsWindow,
  dashboardSummary,
  datePreset,
  setDatePreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  isFetching,
}: {
  user: { name?: string | null; email?: string } | null;
  greeting: string;
  counts: TasksCounts;
  filter: TaskFilter;
  setFilter: (f: TaskFilter) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  setTaskViewPreference: (v: ViewMode) => void;
  sortBy: SortKey;
  setSortBy: (k: SortKey) => void;
  sortMenuOpen: boolean;
  setSortMenuOpen: (fn: (v: boolean) => boolean) => void;
  sortLabel: Record<SortKey, string>;
  notionConnected: boolean;
  onNotionImport: () => void;
  onNewTask: () => void;
  capacityUsedPct: number;
  capacityLabel: string;
  tasksScheduledToday: number;
  plannedMinutesToday: number;
  completedCount: number;
  overdueCount: number;
  analyticsWindow: AnalyticsWindow;
  dashboardSummary: { productivityScore: number; focusMinutesTotal: number } | null | undefined;
  datePreset: DatePreset;
  setDatePreset: (v: DatePreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  isFetching: boolean;
}) {
  const { itemVariants } = usePageVariants();
  const floating = useFloatingEnabled();
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 55, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 55, damping: 18 });
  const blob1X = useTransform(springX, [0, 1], ['-5%', '5%']);
  const blob1Y = useTransform(springY, [0, 1], ['-5%', '5%']);
  const blob2X = useTransform(springX, [0, 1], ['5%', '-5%']);
  const blob2Y = useTransform(springY, [0, 1], ['5%', '-5%']);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };
  const onMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const capacityFreePct = 100 - capacityUsedPct;
  const circumference = 2 * Math.PI * 28;
  const ringOffset = circumference - (capacityUsedPct / 100) * circumference;
  const ringColor =
    capacityUsedPct > 75
      ? 'var(--color-danger)'
      : capacityUsedPct > 50
        ? 'var(--color-warning)'
        : 'var(--color-success)';

  const filterMeta: Record<TaskFilter, { icon: React.ReactNode; color: string }> = {
    pending: { icon: <CheckSquare size={12} />, color: 'var(--color-accent)' },
    today: { icon: <Zap size={12} />, color: '#F59E0B' },
    upcoming: { icon: <Calendar size={12} />, color: 'var(--color-info)' },
    completed: { icon: <CheckCircle2 size={12} />, color: 'var(--color-success)' },
    overdue: { icon: <AlertTriangle size={12} />, color: 'var(--color-danger)' },
    all: { icon: <ListChecks size={12} />, color: 'var(--color-text-muted)' },
  };

  return (
    <motion.div
      ref={heroRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      variants={itemVariants}
      className="relative"
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >

      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        className="pointer-events-none absolute -bottom-12 right-0 h-[300px] w-[300px] rounded-full"
        aria-hidden="true"
        animate={floating ? { scale: [1, 1.09, 1] } : undefined}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, #22C55E 9%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </motion.div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ── Content ── */}
      <div className="relative flex flex-col gap-4 px-3.5 pt-4 pb-0 sm:gap-5 sm:px-6 xl:px-8">
        {/* ── Row 1: Eyebrow + Headline + subtitle ── */}
        <div className="flex flex-col gap-1">
          {/* Eyebrow */}
          <div
            className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <motion.span
              animate={floating ? { rotate: [0, 12, -8, 0] } : undefined}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <CheckSquare size={11} />
            </motion.span>
            Task Command Center
          </div>

          {/* Headline */}
          <h1
            className="mt-2 font-black tracking-tight"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', lineHeight: 1.1, color: 'var(--color-text-primary)' }}
          >
            Good {greeting}, <span style={{ color: 'var(--color-accent)' }}>{firstName}.</span>
          </h1>

          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {counts.pending > 0
              ? `${counts.pending} task${counts.pending !== 1 ? 's' : ''} waiting · ${counts.today} due today`
              : 'All caught up — nice work.'}
            {overdueCount > 0 && (
              <span className="ml-2 font-bold" style={{ color: 'var(--color-danger)' }}>
                · {overdueCount} overdue
              </span>
            )}
          </p>
        </div>

        {/* ── Row 2: Stat chips + capacity ring + search + CTAs ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stat chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                icon: <CheckCircle2 size={12} />,
                value: completedCount,
                label: 'done',
                color: 'var(--color-success)',
                bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
              },
              {
                icon: <Zap size={12} />,
                value: counts.today,
                label: 'today',
                color: '#F59E0B',
                bg: 'rgba(245,158,11,0.10)',
              },
              {
                icon: <Calendar size={12} />,
                value: counts.upcoming,
                label: 'upcoming',
                color: 'var(--color-info)',
                bg: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
              },
              {
                icon: <ListChecks size={12} />,
                value: counts.all,
                label: 'total',
                color: 'var(--color-text-muted)',
                bg: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}22` }}
              >
                {s.icon}
                <span style={{ color: 'var(--color-text-primary)' }}>{s.value}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Spacer pushes the right tools to the end */}
          <div className="flex-1" />

          {/* Capacity ring */}
          <div
            className="flex items-center gap-2.5 rounded-2xl border px-3 py-2"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <div className="relative flex-shrink-0">
              <svg width="48" height="48" viewBox="0 0 48 48" aria-label={`${capacityUsedPct}% capacity`}>
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-border)" strokeWidth="5" />
                <motion.circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 20}
                  transform="rotate(-90 24 24)"
                  initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 20 - (capacityUsedPct / 100) * 2 * Math.PI * 20 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  style={{ filter: `drop-shadow(0 0 3px ${ringColor}55)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black" style={{ color: 'var(--color-text-primary)' }}>
                  {capacityUsedPct}%
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-black leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                {capacityLabel}
              </p>
              <p className="text-[10px] leading-tight" style={{ color: ringColor }}>
                {capacityFreePct}% free · {tasksScheduledToday} tasks
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-[200px] sm:w-[240px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search… ( / )"
              className="w-full rounded-2xl border py-2 pl-9 pr-3 text-sm font-semibold focus:outline-none focus:ring-2"
              style={
                {
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  '--tw-ring-color': 'var(--color-accent)',
                } as React.CSSProperties
              }
            />
          </div>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 rounded-2xl border p-1"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => {
                setView('list');
                setTaskViewPreference('list');
              }}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition-all"
              style={
                view === 'list'
                  ? {
                      background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                      color: 'var(--color-accent)',
                    }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              <CreditCard size={13} /> Card
            </button>
            <button
              onClick={() => {
                setView('board');
                setTaskViewPreference('board');
              }}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition-all"
              style={
                view === 'board'
                  ? { background: 'linear-gradient(135deg, var(--color-accent), #818CF8)', color: 'white' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              <Columns3 size={13} /> Board
            </button>
          </div>

          {/* Notion import */}
          {notionConnected && (
            <button
              onClick={onNotionImport}
              className="inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-sm font-black transition-all hover:opacity-80 active:scale-95"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <BookOpen size={15} /> Notion Import
            </button>
          )}

          {/* New Task CTA */}
          <button
            onClick={onNewTask}
            className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #818CF8 100%)',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--color-accent) 28%, transparent)',
            }}
          >
            <Plus size={15} /> New Task
          </button>
        </div>

        {/* ── Row 3: Filter tabs + date filter + sort ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5">
          <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5">
            <div className="np-pill-segmented shadow-sm flex-nowrap w-max">
              {(['pending', 'today', 'upcoming', 'completed', 'overdue', 'all'] as TaskFilter[]).map((f) => {
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`np-pill ${isActive ? 'is-active' : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="task-pill-indicator"
                        className="np-pill-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 1 }}
                      />
                    )}
                    <span className="relative z-[1] flex items-center gap-[5px]">
                      {filterMeta[f].icon}
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      <span className="np-pill-count">{counts[f]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date filter + Sort */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto shrink-0">
            <DateFilterBar
              datePreset={datePreset}
              setDatePreset={setDatePreset}
              customFrom={customFrom}
              setCustomFrom={setCustomFrom}
              customTo={customTo}
              setCustomTo={setCustomTo}
            />

            {/* Sort */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-black whitespace-nowrap"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Sort: {sortLabel[sortBy]}
                <ChevronDown size={12} />
              </button>
              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(() => false)} />
                  <div
                    className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border shadow-lg z-20"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    {(Object.keys(sortLabel) as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setSortMenuOpen(() => false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold transition-colors"
                        style={{
                          color: sortBy === key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                          background:
                            sortBy === key ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                        }}
                      >
                        {sortLabel[key]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Thin fetch-progress bar along the very bottom of the hero — visible only
          while a background refetch is in-flight. Never blocks the UI. */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
        {isFetching && (
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg, var(--color-accent), #818CF8, var(--color-accent))' }}
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

/** Small inline trend line — no chart library needed for a 4-6 point sparkline. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const safePoints = points.length > 0 ? points : [0];
  const w = 96;
  const h = 28;
  const max = Math.max(...safePoints, 1);
  const min = Math.min(...safePoints, 0);
  const range = Math.max(max - min, 1);
  const step = w / (safePoints.length - 1 || 1);
  const coords = safePoints.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const path = `M${coords.join(' L')}`;
  const areaPath = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function sumSeries(points: number[]): number {
  return points.reduce((sum, value) => sum + value, 0);
}

function formatTrend(current: number, previous: number): string {
  if (previous <= 0) {
    if (current <= 0) return '0%';
    return '+100%';
  }
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? '+' : ''}${change}%`;
}

// ── component ──────────────────────────────────────────────────────────────

export function TasksPage() {
  const { containerVariants, itemVariants } = usePageVariants();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const { isFeatureLocked } = useUserPlan();
  const openUpgrade = useUpgradeModalStore((s) => s.openUpgrade);
  const [isFilterPending, startFilterTransition] = useTransition();
  const accountTimeZone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

  const [filter, setFilter] = useState<TaskFilter>('pending');
  const [sortBy, setSortBy] = useState<SortKey>('priority');
  const savedTaskView = useUIStore((s) => s.taskViewPreference);
  const setTaskViewPreference = useUIStore((s) => s.setTaskViewPreference);
  const [view, setView] = useState<ViewMode>(savedTaskView);

  // ── Date filter state ─────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>('any');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const changeFilter = useCallback(
    (nextFilter: TaskFilter) => {
      startFilterTransition(() => {
        setFilter(nextFilter);
      });
    },
    [startFilterTransition]
  );

  const handleFilterChange = useCallback(
    (nextFilter: TaskFilter) => {
      changeFilter(nextFilter);
    },
    [changeFilter]
  );

  useEffect(() => {
    setView(savedTaskView);
  }, [savedTaskView]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [taskMenuOpen, setTaskMenuOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Debounce the search so the backend is only called after 300 ms of inactivity.
  // The raw searchQuery still drives the input value (instant feedback),
  // while debouncedSearch drives backendFilters (and therefore the API call).
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set<string>());
  const [bulkAction, setBulkAction] = useState<'done' | 'todo' | 'delete' | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [cardPage, setCardPage] = useState(1);
  const CARD_PAGE_SIZE = 10;

  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<
    { type: 'single'; task: TaskDTO } | { type: 'bulk'; count: number } | null
  >(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [notionImportOpen, setNotionImportOpen] = useState(false);

  const queryClient = useQueryClient();

  // ── Build backend filter params ───────────────────────────────────────────
  // The status-tab filter maps to the ?filter= preset on the backend.
  // The date filter adds from/to params on top (except when the tab is a
  // date-specific preset like 'today'/'upcoming'/'overdue' — those control
  // their own date range server-side, so the date picker is additive but the
  // tab preset wins for the status/date combo).
  const backendFilters = useMemo<Record<string, string>>(() => {
    const params: Record<string, string> = {};

    // Status-tab preset — always applied
    if (filter !== 'all') params.filter = filter;

    // Date range — applied on top of the tab preset when 'all' or 'pending'
    // (for 'today'/'upcoming'/'overdue' the backend preset already scopes dates)
    const canApplyDateFilter = filter === 'all' || filter === 'pending' || filter === 'completed';
    if (canApplyDateFilter && datePreset !== 'any') {
      if (datePreset === 'custom') {
        if (customFrom) params.from = customFrom;
        if (customTo) params.to = customTo;
      } else if (datePreset === 'no_date') {
        params.noDate = 'true';
      } else {
        const range = datePresetToRange(datePreset);
        if (range.from) params.from = range.from;
        if (range.to) params.to = range.to;
      }
    }

    // Search — passed to backend for title/description filtering
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

    // Sort
    if (sortBy === 'created') params.sortBy = 'created';
    else if (sortBy === 'dueDate') params.sortBy = 'dueDate';
    // priority sort is done client-side after fetch (Prisma can't order by enum priority)

    return params;
  }, [filter, datePreset, customFrom, customTo, debouncedSearch, sortBy]);

  // ── Debounce the backend request to prevent a waterfall of requests when
  // the user rapid-clicks through tabs. The UI (client-side filter from cache)
  // updates instantly on every click. Only the network call is held back 150ms.
  // This is the same pattern used by Linear, GitHub, and Vercel dashboards.
  const [committedFilters, setCommittedFilters] = useState(backendFilters);
  useEffect(() => {
    const id = window.setTimeout(() => setCommittedFilters(backendFilters), 150);
    return () => window.clearTimeout(id);
  }, [backendFilters]);

  const { data: tasksData, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useTasks(committedFilters, {
    enabled: view === 'board',
  });
  // isFetching is intentionally not used for blocking UI — placeholderData keeps
  // the previous tab's data visible while the new request is in-flight.

  // ── Card-view offset pagination ──────────────────────────────────────────
  const { data: cardTasksData, isFetching: cardIsFetching } = useTasksOffset(committedFilters, cardPage, {
    enabled: view !== 'board',
  });

  // Reset card page to 1 whenever filters change
  useEffect(() => {
    setCardPage(1);
  }, [committedFilters]);

  // ── Tab counts — fetched via dedicated endpoint so badges stay accurate ──
  const { data: countSummary } = useQuery<TaskCountsDTO>({
    queryKey: ['tasks', 'counts', accountTimeZone],
    queryFn: () => tasksApi.getCounts(),
    staleTime: 30_000,
  });

  const { data: dashboardSummary } = useDashboardSummary();
  const { data: notionStatus } = useNotionStatus();
  const { data: dailyAnalytics } = useQuery({
    queryKey: ['analytics', 'daily', 14],
    queryFn: () => apiClient.get<DailyAnalyticsDTO[]>('/analytics/daily', { params: { days: 14 } }).then((r) => r.data),
    staleTime: 5 * 60_000, // analytics data is fine to cache for 5 minutes
  });
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = useMemo(() => tasksData?.pages.flatMap((p) => p.data) ?? [], [tasksData]);
  // The API already applies the active tab/date/search filters server-side,
  // so the rendered list is exactly what the backend returned (no client-side re-filter).
  const filteredTasks = tasks;

  // Card-view tasks come from offset pagination, board-view tasks use cursor pagination
  const cardTasks = useMemo(() => cardTasksData?.data ?? [], [cardTasksData]);
  const cardTotal = cardTasksData?.meta?.total ?? 0;
  const cardTotalPages = cardTasksData?.meta?.totalPages ?? Math.max(1, Math.ceil(cardTotal / CARD_PAGE_SIZE));
  const cardDisplayTasks = view === 'board' ? filteredTasks : cardTasks;
  const cardDisplayTotal = view === 'board' ? filteredTasks.length : cardTotal;
  const cardDisplayTotalPages = view === 'board' ? Math.max(1, Math.ceil(cardDisplayTotal / CARD_PAGE_SIZE)) : cardTotalPages;
  const cardDisplayPage = view === 'board' ? 1 : cardPage;
  const cardDisplaySetPage = (p: number) => {
    if (view === 'board') return;
    setCardPage(p);
  };
  const { ref: sentinelRef, inView: sentinelInView } = useInView({
    threshold: 0,
    rootMargin: '150px',
    triggerOnce: false,
  });

  // Prevent multiple simultaneous pagination calls
  const fetchingRef = useRef(false);

  useEffect(() => {
    const shouldFetch = sentinelInView && hasNextPage && !isFetching && !isFetchingNextPage && !fetchingRef.current;

    if (shouldFetch) {
      fetchingRef.current = true;
      fetchNextPage().finally(() => {
        setTimeout(() => {
          fetchingRef.current = false;
        }, 500);
      });
    }
  }, [sentinelInView, hasNextPage, isFetching, isFetchingNextPage, fetchNextPage]);
  const invalidateTasks = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ]),
    [queryClient]
  );

  // ── subtask mutations ────────────────────────────────────────────────────
  // Use optimistic cache updates instead of full invalidation so toggling/adding
  // a subtask doesn't trigger a full tasks list refetch.

  const updateSubTaskMutation = useMutation({
    mutationFn: ({ taskId, subTaskId, data }: { taskId: string; subTaskId: string; data: { completed?: boolean } }) =>
      tasksApi.updateSubTask(taskId, subTaskId, data),
    onMutate: async ({ taskId, subTaskId, data }) => {
      // Optimistically update the subtask in all task list cache entries
      queryClient.setQueriesData<{ pages: { data: typeof tasks }[] }>(
        { queryKey: ['tasks'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((task: (typeof tasks)[number]) =>
                task.id !== taskId
                  ? task
                  : {
                      ...task,
                      subTasks: task.subTasks?.map((s) => (s.id === subTaskId ? { ...s, ...data } : s)),
                    }
              ),
            })),
          };
        }
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update subtask');
      // Refetch to restore correct state after optimistic update failure
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createSubTaskMutation = useMutation({
    mutationFn: ({ taskId, title, order }: { taskId: string; title: string; order: number }) =>
      tasksApi.createSubTask(taskId, { title, order }),
    onSuccess: (newSubTask, { taskId }) => {
      // Append the new subtask returned by the server into the cache
      queryClient.setQueriesData<{ pages: { data: typeof tasks }[] }>(
        { queryKey: ['tasks'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((task: (typeof tasks)[number]) =>
                task.id !== taskId
                  ? task
                  : { ...task, subTasks: [...(task.subTasks ?? []), newSubTask] }
              ),
            })),
          };
        }
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create subtask');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: ({ taskId, subTaskId }: { taskId: string; subTaskId: string }) =>
      tasksApi.deleteSubTask(taskId, subTaskId),
    onMutate: async ({ taskId, subTaskId }) => {
      queryClient.setQueriesData<{ pages: { data: typeof tasks }[] }>(
        { queryKey: ['tasks'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((task: (typeof tasks)[number]) =>
                task.id !== taskId
                  ? task
                  : { ...task, subTasks: task.subTasks?.filter((s) => s.id !== subTaskId) }
              ),
            })),
          };
        }
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to delete subtask');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // ── counts (use server counts for badges, fall back to loaded data) ────────
  const counts = useMemo<TasksCounts>(
    () => ({
      pending:
        countSummary?.pending ??
        tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && !isFutureTaskInTimeZone(t.dueDate, accountTimeZone)).length,
      today:
        countSummary?.today ??
        tasks.filter((t) => isTodayInTimeZone(t.dueDate, accountTimeZone) && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
      upcoming:
        countSummary?.upcoming ??
        tasks.filter((t) => isUpcomingInTimeZone(t.dueDate, accountTimeZone) && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
      completed: countSummary?.completed ?? tasks.filter((t) => t.status === 'DONE').length,
      overdue: countSummary?.overdue ?? tasks.filter((t) => isOverdueInTimeZone(t.dueDate, t.status, accountTimeZone)).length,
      all: countSummary?.all ?? tasks.length,
    }),
    [countSummary, tasks, accountTimeZone]
  );

  const analyticsWindow = useMemo(() => {
    const series = dailyAnalytics ?? [];
    const recent = series.slice(-7);
    const previous = series.slice(0, Math.max(0, series.length - 7));

    const recentTasks = sumSeries(recent.map((item) => item.tasksCompleted));
    const previousTasks = sumSeries(previous.map((item) => item.tasksCompleted));
    const recentFocus = sumSeries(recent.map((item) => item.focusMinutes));
    const previousFocus = sumSeries(previous.map((item) => item.focusMinutes));
    const recentSignal = sumSeries(
      recent.map((item) => item.tasksCompleted * 10 + item.focusMinutes + item.habitsCompleted * 8)
    );
    const previousSignal = sumSeries(
      previous.map((item) => item.tasksCompleted * 10 + item.focusMinutes + item.habitsCompleted * 8)
    );

    return {
      recent,
      tasksTrend: formatTrend(recentTasks, previousTasks),
      focusTrend: formatTrend(recentFocus, previousFocus),
      scoreTrend: formatTrend(recentSignal, previousSignal),
      scoreSignal: recentSignal,
    };
  }, [dailyAnalytics]);

  const overdueTasks = useMemo(
    () => tasks.filter((t) => isOverdueInTimeZone(t.dueDate, t.status, accountTimeZone)),
    [tasks, accountTimeZone]
  );
  const overdueMinutes = useMemo(
    () => overdueTasks.reduce((sum, t) => sum + (t.estimatedDuration ?? 0), 0),
    [overdueTasks]
  );
  const topOverdueTask = useMemo(
    () =>
      [...overdueTasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))[0] ??
      null,
    [overdueTasks]
  );

  // ── selection ────────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => setSelectedTaskIds(new Set<string>()), []);

  const visibleSelectedTasks = useMemo(
    () => filteredTasks.filter((t) => selectedTaskIds.has(t.id)),
    [filteredTasks, selectedTaskIds]
  );

  const allVisibleSelected = filteredTasks.length > 0 && visibleSelectedTasks.length === filteredTasks.length;

  // Handle taskId from URL query parameter (for notification clicks).
  // SELECT the task, SCROLL it into view, and HIGHLIGHT it for a few seconds.
  // This must NOT open the edit modal — users want to locate and view the task.
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (!taskId || !tasks.length) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // 1. Select the task card so it's visually marked
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });

    // 2. Mark as highlighted (card gets accent border + raised shadow)
    setHighlightedTaskId(taskId);

    // 3. Scroll into view (smooth, centered), try both getElementById + ref via data attr
    const scrollTarget = document.getElementById(`task-card-${taskId}`);
    if (scrollTarget) {
      // Use rAF + short delay to let React paint before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }

    // 4. Clear the URL query param so refreshes don't re-focus, and clear highlight after a beat
    const timeoutId = window.setTimeout(() => {
      setSearchParams({}, { replace: true });
    }, 300);

    const highlightTimeoutId = window.setTimeout(() => {
      setHighlightedTaskId((current) => (current === taskId ? null : current));
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(highlightTimeoutId);
    };
  }, [searchParams, tasks, setSearchParams]);

  useEffect(() => {
    clearSelection();
  }, [filter, view, searchQuery, datePreset, customFrom, customTo, clearSelection]);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }, []);

  const toggleVisibleSelection = () => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filteredTasks.forEach((t) => next.delete(t.id));
      else filteredTasks.forEach((t) => next.add(t.id));
      return next;
    });
  };

  // ── task actions ─────────────────────────────────────────────────────────

  const toggleTaskStatus = useCallback(
    (task: TaskDTO) => {
      const nextStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
      updateTask.mutate({ id: task.id, data: { status: nextStatus } });
    },
    [updateTask]
  );

  const changeTaskStatus = useCallback(
    (task: TaskDTO, status: TaskStatus) => {
      updateTask.mutate({ id: task.id, data: { status } });
    },
    [updateTask]
  );

  const handleDeleteTask = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        setDeleteConfirmation({ type: 'single', task });
      }
    },
    [tasks]
  );

  const handleAddSubtask = useCallback(
    async (taskId: string) => {
      const title = (subtaskDraft[taskId] ?? '').trim();
      if (!title) return;
      const task = tasks.find((t) => t.id === taskId);
      const orders = task?.subTasks?.map((s) => s.order) ?? [];
      const order = orders.length > 0 ? Math.max(...orders) + 1 : 0;
      try {
        await createSubTaskMutation.mutateAsync({ taskId, title, order });
        setSubtaskDraft((prev) => ({ ...prev, [taskId]: '' }));
      } catch {
        /* toast handled by mutation */
      }
    },
    [subtaskDraft, tasks, createSubTaskMutation]
  );

  const handleToggleSubtasks = useCallback(
    (id: string) => setExpandedSubtasks((prev) => ({ ...prev, [id]: !prev[id] })),
    []
  );

  const handleSubtaskDraftChange = useCallback(
    (id: string, val: string) => setSubtaskDraft((prev) => ({ ...prev, [id]: val })),
    []
  );

  const handleToggleSubtask = useCallback(
    (taskId: string, subTaskId: string, completed: boolean) => {
      updateSubTaskMutation.mutate({ taskId, subTaskId, data: { completed } });
    },
    [updateSubTaskMutation]
  );

  const handleDeleteSubtask = useCallback(
    (taskId: string, subTaskId: string) => {
      deleteSubTaskMutation.mutate({ taskId, subTaskId });
    },
    [deleteSubTaskMutation]
  );

  const handleFocusTask = useCallback(
    (taskId: string) => {
      if (isFeatureLocked('focusAdvanced')) {
        openUpgrade(
          'focusAdvanced',
          'Linking tasks to the Focus timer is an Advanced Focus feature available on Pro & Ultimate plans.'
        );
        return;
      }
      navigate(`/focus?taskId=${taskId}`);
    },
    [isFeatureLocked, openUpgrade, navigate]
  );

  const handleOpenTask = useCallback(
    (taskId: string) => {
      navigate(`/tasks/${taskId}`);
    },
    [navigate]
  );

  const handleOpenCreateTaskFromEngine = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleHighlightTaskFromEngine = useCallback((id: string) => {
    setHighlightedTaskId(id);
    setTimeout(() => setHighlightedTaskId(null), 3000);
  }, []);

  const handleRescheduleAll = useCallback(async () => {    const today = dateKeyInTimeZone(new Date(), accountTimeZone);
    await Promise.all(overdueTasks.map((t) => tasksApi.update(t.id, { dueDate: today })));
    await invalidateTasks();
    toast.success(`Rescheduled ${overdueTasks.length} tasks to today`);
  }, [overdueTasks, invalidateTasks, accountTimeZone]);

  const handleStartHighestPriority = useCallback(() => {
    if (topOverdueTask) setEditingTask(topOverdueTask);
  }, [topOverdueTask]);

  // ── bulk actions ─────────────────────────────────────────────────────────

  const handleBulkStatusChange = async (status: TaskStatus) => {
    if (visibleSelectedTasks.length === 0) return;
    setBulkAction(status === 'DONE' ? 'done' : 'todo');
    try {
      await Promise.all(visibleSelectedTasks.map((t) => tasksApi.update(t.id, { status })));
      await invalidateTasks();
      clearSelection();
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkDelete = async () => {
    if (visibleSelectedTasks.length === 0) return;
    setDeleteConfirmation({ type: 'bulk', count: visibleSelectedTasks.length });
  };

  // ── confirm delete ───────────────────────────────────────────────────────

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'single') {
      deleteTask.mutate(deleteConfirmation.task.id);
      setTaskMenuOpen(null);
    } else {
      setBulkAction('delete');
      const taskIds = Array.from(selectedTaskIds);
      Promise.all(taskIds.map((id) => tasksApi.delete(id)))
        .then(() => {
          invalidateTasks();
          clearSelection();
        })
        .finally(() => {
          setBulkAction(null);
        });
    }

    setDeleteConfirmation(null);
  }, [deleteConfirmation, deleteTask, selectedTaskIds, invalidateTasks, clearSelection]);

  // ── keyboard shortcuts ───────────────────────────────────────────────────

  const firstSelected = useMemo(
    () => visibleSelectedTasks[0] ?? filteredTasks[0] ?? null,
    [visibleSelectedTasks, filteredTasks]
  );

  useTaskKeyboardShortcuts({
    onNewTask: () => setCreateModalOpen(true),
    onEditSelected: () => {
      if (firstSelected) setEditingTask(firstSelected);
    },
    onCompleteSelected: () => {
      if (firstSelected) toggleTaskStatus(firstSelected);
    },
    onFocusSearch: () => searchRef.current?.focus(),
    onFocusMode: () => {
      if (firstSelected) {
        if (isFeatureLocked('focusAdvanced')) {
          openUpgrade('focusAdvanced', 'Linking tasks to Focus mode is an Advanced Focus feature available on Pro plans.');
          return;
        }
        navigate(`/focus?taskId=${firstSelected.id}&autostart=1`);
      } else {
        navigate('/focus?autostart=1');
      }
    },
    isBlocked: () => createModalOpen || editingTask !== null,
  });

  // ── capacity + productivity summary numbers ─────────────────────────────

  const plannedMinutesToday = useMemo(
    () =>
      tasks
        .filter((t) => isTodayInTimeZone(t.dueDate, accountTimeZone) && t.status !== 'CANCELLED')
        .reduce((sum, t) => sum + (t.estimatedDuration ?? 0), 0),
    [tasks, accountTimeZone]
  );
  const capacityMinutes = 8 * 60;
  const capacityUsedPct = Math.min(100, Math.round((plannedMinutesToday / capacityMinutes) * 100));
  const capacityFreePct = 100 - capacityUsedPct;
  const capacityLabel = capacityUsedPct <= 40 ? 'Light Day' : capacityUsedPct <= 75 ? 'Balanced Day' : 'Heavy Day';
  const tasksScheduledToday = useMemo(
    () => tasks.filter((t) => isTodayInTimeZone(t.dueDate, accountTimeZone) && t.status !== 'CANCELLED').length,
    [tasks, accountTimeZone]
  );

  const sortLabel: Record<SortKey, string> = { priority: 'Priority', dueDate: 'Due date', created: 'Newest' };

  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';

  // ── render ───────────────────────────────────────────────────────────────

  // Only show the full-page spinner on the very first load (no data yet).
  // Filter changes use isFetching so the hero/sidebar stay mounted.
  if (isLoading && !tasksData) return <LoadingScreen />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex min-h-full flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ── xl+: flex row wrapping header-left + sidebar-right ──────────── */}
      <div className="xl:flex xl:gap-6 xl:flex-1 xl:min-h-0">
        {/* ── Left column: header + task content ───────────────────────── */}
        <div className="xl:flex xl:flex-col xl:flex-1 xl:min-w-0">
          {/* ── PREMIUM HEADER HERO ──────────────────────────────────── */}
          <TasksHero
            user={user}
            greeting={greeting}
            counts={counts}
            filter={filter}
            setFilter={handleFilterChange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchRef={searchRef}
            view={view}
            setView={setView}
            setTaskViewPreference={setTaskViewPreference}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortMenuOpen={sortMenuOpen}
            setSortMenuOpen={setSortMenuOpen}
            sortLabel={sortLabel}
            notionConnected={!!notionStatus?.connected}
            onNotionImport={() => setNotionImportOpen(true)}
            onNewTask={() => setCreateModalOpen(true)}
            capacityUsedPct={capacityUsedPct}
            capacityLabel={capacityLabel}
            tasksScheduledToday={tasksScheduledToday}
            plannedMinutesToday={plannedMinutesToday}
            completedCount={counts.completed}
            overdueCount={counts.overdue}
            analyticsWindow={analyticsWindow}
            dashboardSummary={dashboardSummary}
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
            isFetching={isFetching && !isFetchingNextPage}
          />

          {/* Overdue banner — right after filters */}
          {overdueTasks.length > 0 && filter !== 'overdue' && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border p-5 sm:p-6 mx-4 sm:mx-6 xl:mx-8 mt-5 shadow-sm"
              style={{
                background: 'color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))',
                borderColor: 'color-mix(in srgb, var(--color-danger) 25%, var(--color-border))',
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)',
                    color: 'var(--color-danger)',
                  }}
                >
                  <AlertTriangle size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''} require
                    {overdueTasks.length === 1 ? 's' : ''} your attention
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {overdueMinutes > 0 &&
                      `Approximately ${overdueMinutes >= 60 ? `${Math.round(overdueMinutes / 60)}h` : `${overdueMinutes}m`} of work — `}
                    all lower priority.
                    {topOverdueTask && (
                      <>
                        {' '}
                        Top task: <span className="font-semibold">{topOverdueTask.title}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleStartHighestPriority}
                  disabled={!topOverdueTask}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 shadow-sm"
                  style={{ background: 'var(--color-danger)' }}
                >
                  Start Top Task
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleRescheduleAll}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <RotateCcw size={13} />
                  Reschedule All
                </button>
                <button
                  type="button"
                  onClick={() => changeFilter('overdue')}
                  className="px-3 py-2 text-xs font-bold underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Review All
                </button>
              </div>
            </motion.div>
          )}

          {/* Main content area (tasks) */}
          <motion.div variants={itemVariants} className="relative flex-1 overflow-y-auto">
            <div className="flex w-full flex-col gap-4 p-3.5 sm:p-7 xl:p-9">
              {/* Select all */}
              {view === 'list' && filteredTasks.length > 0 && (
                <motion.div variants={itemVariants} className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={toggleVisibleSelection}
                    className="flex items-center gap-2 text-xs font-bold shrink-0"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center border"
                      style={
                        allVisibleSelected
                          ? { background: 'var(--gradient-accent)', borderColor: 'transparent' }
                          : { borderColor: 'var(--color-border)' }
                      }
                    >
                      {allVisibleSelected && <CheckSquare size={11} className="text-white" />}
                    </span>
                    Select All
                  </button>
                </motion.div>
              )}

              {/* Bulk action bar */}
              {view === 'list' && visibleSelectedTasks.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border p-4 shadow-sm"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))',
                    borderColor: 'var(--color-accent-border)',
                  }}
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {visibleSelectedTasks.length} task{visibleSelectedTasks.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Bulk changes apply to visible selected tasks only.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('DONE')}
                      disabled={bulkAction !== null}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
                      style={{ background: 'var(--color-success)' }}
                    >
                      {bulkAction === 'done' ? 'Updating…' : 'Mark Done'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('TODO')}
                      disabled={bulkAction !== null}
                      className="px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-60 transition-all"
                      style={{
                        background: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {bulkAction === 'todo' ? 'Updating…' : 'Mark To Do'}
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={bulkAction !== null}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
                      style={{ background: 'var(--color-danger)' }}
                    >
                      {bulkAction === 'delete' ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={bulkAction !== null}
                      className="px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-60 transition-all"
                      style={{
                        background: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Task list / board */}
              <motion.div variants={itemVariants}>
                {view === 'board' ? (
                  <TaskBoardView
                    tasks={filteredTasks}
                    onStatusChange={changeTaskStatus}
                    onEdit={setEditingTask}
                    onDelete={handleDeleteTask}
                    onViewDetails={(task) => navigate(`/tasks/${task.id}`)}
                    onAddTask={() => setCreateModalOpen(true)}
                    highlightedTaskId={highlightedTaskId}
                    formatDueDate={(d) => formatDueDateInTimeZone(d, accountTimeZone)}
                    isOverdue={(d, status) => isOverdueInTimeZone(d, status, accountTimeZone)}
                    getRecurrenceLabel={(rule) => {
                      if (!rule) return null;
                      if (rule.includes('INTERVAL=2') && rule.includes('WEEKLY')) return 'Fortnightly';
                      if (rule.includes('INTERVAL=3') && rule.includes('MONTHLY')) return 'Quarterly';
                      if (rule.includes('FREQ=DAILY')) {
                        const bydayMatch = rule.match(/BYDAY=([A-Z,]+)/);
                        if (bydayMatch) {
                          const included = bydayMatch[1].split(',').map((d) => d.trim());
                          if (included.length > 0 && included.length < 7) {
                            const ALL = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
                            const SHORT: Record<string, string> = {
                              MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
                            };
                            const skipped = ALL.filter((d) => !included.includes(d)).map((d) => SHORT[d]);
                            if (skipped.length > 0) return `Daily (skip ${skipped.join(', ')})`;
                          }
                        }
                        return 'Daily';
                      }
                      if (rule.includes('FREQ=WEEKLY')) return 'Weekly';
                      if (rule.includes('FREQ=MONTHLY')) return 'Monthly';
                      return 'Recurring';
                    }}
                  />
                ) : cardDisplayTasks.length === 0 ? (
                  <TasksEmptyState
                    filter={filter}
                    onCreateTask={() => setCreateModalOpen(true)}
                    onChangeFilter={changeFilter}
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {cardDisplayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          timeZone={accountTimeZone}
                          index={0}
                          isSelected={selectedTaskIds.has(task.id)}
                          isMenuOpen={taskMenuOpen === task.id}
                          isHighlighted={highlightedTaskId === task.id}
                          subExpanded={!!expandedSubtasks[task.id]}
                          subtaskDraft={subtaskDraft[task.id] ?? ''}
                          onToggleStatus={toggleTaskStatus}
                          onToggleSelect={toggleTaskSelection}
                          onToggleMenu={setTaskMenuOpen}
                          onToggleSubtasks={handleToggleSubtasks}
                          onEdit={setEditingTask}
                          onDelete={handleDeleteTask}
                          onChangeStatus={changeTaskStatus}
                          onSubtaskDraftChange={handleSubtaskDraftChange}
                          onAddSubtask={handleAddSubtask}
                          onToggleSubtask={handleToggleSubtask}
                          onDeleteSubtask={handleDeleteSubtask}
                          onFocus={handleFocusTask}
                          onOpen={handleOpenTask}
                        />
                      ))}
                    </div>

                    {/* Page-based pagination controls */}
                    <PageControls
                      page={cardDisplayPage}
                      totalPages={cardDisplayTotalPages}
                      total={cardDisplayTotal}
                      accent="var(--color-accent)"
                      pageSize={CARD_PAGE_SIZE}
                      onChange={cardDisplaySetPage}
                    />
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
        {/* ── End left column ───────────────────────────────────────────── */}

        {/* ── Right: Sidebar (xl+) — aligned from header level ──────────── */}
        <aside className="hidden xl:flex xl:flex-col xl:gap-5 xl:w-[320px] 2xl:w-[360px] xl:shrink-0 xl:pt-6 xl:pr-8">
          {/* Productivity Engine */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl border shadow-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <ProductivityEngine
              context="tasks"
              tasks={tasks}
              focusSessions={[]}
              onOpenCreateTask={handleOpenCreateTaskFromEngine}
              onHighlightTask={handleHighlightTaskFromEngine}
            />
          </motion.div>

          {/* Today's Capacity */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl border p-5 shadow-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Today's Capacity
                </h3>
              </div>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                {capacityLabel}
              </span>
            </div>
            <p className="text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {tasksScheduledToday} task{tasksScheduledToday !== 1 ? 's' : ''} scheduled
            </p>

            <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {(plannedMinutesToday / 60).toFixed(1)}h planned of {capacityMinutes / 60}h capacity
            </p>
            <p className="text-[10px] mt-1 mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {capacityFreePct >= 50 ? 'You have plenty of room today' : 'Your day is filling up'}
            </p>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
                <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {capacityFreePct}% free
                </span>
              </div>
              <div
                className="h-1.5 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${capacityUsedPct}%`, background: 'var(--gradient-accent)' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Productivity Score */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl border p-5 shadow-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Productivity Score
              </h3>
              <span className="text-[9px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                This Week
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={11} style={{ color: 'var(--color-success)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Tasks
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {counts.completed}
                  </span>
                  {dashboardSummary && (
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                        color: 'var(--color-success)',
                      }}
                    >
                      {analyticsWindow.tasksTrend}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <Sparkline
                    points={analyticsWindow.recent.map((item) => item.tasksCompleted)}
                    color="var(--color-success)"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={11} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Focus
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {formatMinutes(dashboardSummary?.focusMinutesTotal ?? 0)}
                  </span>
                  {dashboardSummary && (
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {analyticsWindow.focusTrend}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <Sparkline
                    points={analyticsWindow.recent.map((item) => item.focusMinutes / 60)}
                    color="var(--color-accent)"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={11} style={{ color: 'var(--color-warning)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Score
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {dashboardSummary?.productivityScore ?? 0}%
                  </span>
                  {dashboardSummary && (
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                        color: 'var(--color-success)',
                      }}
                    >
                      {analyticsWindow.scoreTrend}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <Sparkline
                    points={analyticsWindow.recent.map(
                      (item) => item.tasksCompleted * 10 + item.focusMinutes + item.habitsCompleted * 8
                    )}
                    color="var(--color-warning)"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </aside>
        {/* ── End right: Sidebar ───────────────────────────────────────── */}
      </div>
      {/* ── End xl+ flex row ──────────────────────────────────────────────── */}

      {/* ── Below xl: stacked cards ───────────────────────────────────────── */}
      <div className="flex flex-col gap-5 px-4 py-6 sm:px-6 xl:hidden">
        <div
          className="rounded-3xl border p-4 shadow-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <ProductivityEngine context="tasks" tasks={tasks} focusSessions={[]} onOpenCreateTask={(t, d) => {}} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div
            className="lg:col-span-2 rounded-3xl border p-5 shadow-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Zap size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Today's Capacity
                </h3>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                {capacityLabel}
              </span>
            </div>
            <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {tasksScheduledToday} task{tasksScheduledToday !== 1 ? 's' : ''} scheduled
            </p>

            <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {(plannedMinutesToday / 60).toFixed(1)}h planned of {capacityMinutes / 60}h capacity
            </p>
            <p className="text-[11px] mt-1 mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {capacityFreePct >= 50 ? 'You have plenty of room today' : 'Your day is filling up'}
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
                <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {capacityFreePct}% free
                </span>
              </div>
              <div
                className="h-2 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${capacityUsedPct}%`, background: 'var(--gradient-accent)' }}
                />
              </div>
            </div>
          </div>

          <div
            className="lg:col-span-3 rounded-3xl border p-5 shadow-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Productivity Summary
              </h3>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                This Week
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Tasks Completed
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {counts.completed}
                  </span>
                  {dashboardSummary && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                        color: 'var(--color-success)',
                      }}
                    >
                      {analyticsWindow.tasksTrend}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Sparkline
                    points={analyticsWindow.recent.map((item) => item.tasksCompleted)}
                    color="var(--color-success)"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Focus Time
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {formatMinutes(dashboardSummary?.focusMinutesTotal ?? 0)}
                  </span>
                  {dashboardSummary && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {analyticsWindow.focusTrend}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Sparkline
                    points={analyticsWindow.recent.map((item) => item.focusMinutes / 60)}
                    color="var(--color-accent)"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} style={{ color: 'var(--color-warning)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Productivity Score
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {dashboardSummary?.productivityScore ?? 0}%
                  </span>
                  {dashboardSummary && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                        color: 'var(--color-success)',
                      }}
                    >
                      {analyticsWindow.scoreTrend}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Sparkline
                    points={analyticsWindow.recent.map(
                      (item) => item.tasksCompleted * 10 + item.focusMinutes + item.habitsCompleted * 8
                    )}
                    color="var(--color-warning)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <CreateTaskModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      {notionImportOpen && <NotionImportModal isOpen={notionImportOpen} onClose={() => setNotionImportOpen(false)} mode="tasks" />}
      {editingTask && <EditTaskModal isOpen task={editingTask} onClose={() => setEditingTask(null)} />}

      {/* Delete confirmation modal */}
      <Modal open={deleteConfirmation !== null} onClose={() => setDeleteConfirmation(null)} title="Delete Task">
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {deleteConfirmation?.type === 'single' ? (
              <>
                Are you sure you want to delete <strong>{deleteConfirmation.task.title}</strong>? This action cannot be
                undone.
              </>
            ) : deleteConfirmation?.type === 'bulk' ? (
              <>
                Are you sure you want to delete <strong>{deleteConfirmation.count}</strong> selected task
                {deleteConfirmation.count !== 1 ? 's' : ''}? This action cannot be undone.
              </>
            ) : null}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
