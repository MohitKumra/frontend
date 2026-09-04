/**
 * MobileTasksView.tsx
 *
 * Full mobile-only tasks page layout matching the provided design mockup:
 *   - Scenic SVG landscape hero with date + greeting headline
 *   - Stats row: Done / Due today / Upcoming / Total
 *   - Quick-action button grid: New Task / Board / Import / AI Plan
 *   - "Today" section with empty-state or task rows
 *   - "Upcoming" section with labelled task rows + category chips
 *
 * This component is rendered exclusively on mobile (<md).
 * The desktop layout (TasksHero + sidebar) is rendered on md+.
 * No hidden/display-none tricks — each layout is conditionally returned.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Columns3,
  BookOpen,
  Sparkles,
  Calendar,
  MoreVertical,
  Circle,
  CheckCircle2,
  Sun,
  Search,
  Bell,
  ChevronRight,
} from 'lucide-react';
import type { TaskDTO, TaskStatus } from '../../types';
import { isTodayInTimeZone, isUpcomingInTimeZone, formatDueDateInTimeZone } from '../../lib/taskDateUtils';

// ─── Landscape SVG hero ────────────────────────────────────────────────────

function LandscapeHero() {
  return (
    <svg
      viewBox="0 0 600 320"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <radialGradient id="mth-sky" cx="70%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#fff9e6" />
          <stop offset="40%" stopColor="#e8e8f8" />
          <stop offset="100%" stopColor="#c8cef0" />
        </radialGradient>
        <radialGradient id="mth-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe566" />
          <stop offset="60%" stopColor="#ffd93d" />
          <stop offset="100%" stopColor="#ffb700" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mth-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4cc" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff4cc" stopOpacity="0" />
        </radialGradient>
        {/* Pink cloud left gradient */}
        <radialGradient id="mth-cloud" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5d0d0" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f5d0d0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="600" height="320" fill="url(#mth-sky)" />

      {/* Pink cloud blobs left */}
      <ellipse cx="80" cy="160" rx="90" ry="70" fill="url(#mth-cloud)" />
      <ellipse cx="140" cy="130" rx="70" ry="55" fill="#f5d0d0" fillOpacity="0.35" />

      {/* Sun glow */}
      <circle cx="430" cy="115" r="65" fill="url(#mth-sun-glow)" />
      {/* Sun */}
      <circle cx="430" cy="115" r="38" fill="url(#mth-sun)" />

      {/* Back mountains — lightest */}
      <path d="M0 220 Q80 130 160 175 Q220 140 300 185 Q380 140 460 170 Q520 140 600 165 L600 320 L0 320Z"
        fill="#d0d4f0" fillOpacity="0.55" />

      {/* Mid mountains */}
      <path d="M0 260 Q60 195 140 230 Q200 190 280 225 Q340 185 420 220 Q480 190 560 215 Q580 210 600 220 L600 320 L0 320Z"
        fill="#b8bde8" fillOpacity="0.75" />

      {/* Front mountains — deepest blue-purple */}
      <path d="M320 320 Q340 240 380 255 Q420 230 460 260 Q510 235 560 260 L600 255 L600 320Z"
        fill="#9098d8" />
      <path d="M-10 320 Q20 255 70 270 Q100 245 140 265 Q170 250 200 268 Q230 245 260 260 L280 265 L290 320Z"
        fill="#9098d8" />

      {/* Green rolling hill */}
      <path d="M0 300 Q100 260 200 280 Q300 260 400 275 Q450 268 500 280 Q550 272 600 278 L600 320 L0 320Z"
        fill="#7aad6e" />
      <path d="M0 310 Q150 295 300 305 Q450 295 600 308 L600 320 L0 320Z"
        fill="#6a9d5e" />

      {/* Pine trees */}
      {[320, 338, 354, 370].map((x, i) => (
        <g key={i} transform={`translate(${x}, ${260 - i * 4})`}>
          <polygon points="0,-28 8,0 -8,0" fill="#2d6a4f" fillOpacity="0.85" />
          <polygon points="0,-18 6,0 -6,0" fill="#2d6a4f" fillOpacity="0.7" transform="translate(0,6)" />
          <rect x="-2" y="0" width="4" height="6" fill="#1a4a30" fillOpacity="0.6" />
        </g>
      ))}

      {/* Plant/sapling — right side */}
      <g transform="translate(555, 245)">
        {/* Stem */}
        <path d="M8 75 Q8 50 8 10" stroke="#2d6a4f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Leaves */}
        <path d="M8 45 Q-10 30 -14 10 Q2 25 8 40" fill="#3a7d5e" fillOpacity="0.9" />
        <path d="M8 45 Q28 28 30 5 Q14 22 8 40" fill="#3a7d5e" fillOpacity="0.85" />
        <path d="M8 25 Q-6 14 -8 -2 Q4 12 8 22" fill="#2d6a4f" />
        <path d="M8 25 Q22 12 24 -4 Q12 10 8 22" fill="#2d6a4f" />
      </g>
    </svg>
  );
}

// ─── Priority tag colours ──────────────────────────────────────────────────

function categoryColor(label: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    health:   { bg: '#dcfce7', text: '#166534' },
    learning: { bg: '#dbeafe', text: '#1e40af' },
    personal: { bg: '#ede9fe', text: '#5b21b6' },
    work:     { bg: '#fef3c7', text: '#92400e' },
    finance:  { bg: '#fce7f3', text: '#9d174d' },
    fitness:  { bg: '#dcfce7', text: '#166534' },
  };
  return map[label.toLowerCase()] ?? { bg: '#f3f4f6', text: '#374151' };
}

function CategoryChip({ label }: { label: string }) {
  const { bg, text } = categoryColor(label);
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  );
}

// ─── Compact task row for Today / Upcoming sections ───────────────────────

function MobileTaskRow({
  task,
  timeZone,
  onToggleStatus,
  onEdit,
  formatDueDate,
}: {
  task: TaskDTO;
  timeZone: string;
  onToggleStatus: (task: TaskDTO) => void;
  onEdit: (task: TaskDTO) => void;
  formatDueDate: (d: string | null) => string | null;
}) {
  const done = task.status === 'DONE';
  const dueDateLabel = formatDueDate(task.dueDate);
  const projectLabel = task.project?.name ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3 px-1"
      style={{ borderBottom: '1px solid var(--color-border-subtle, #f3f4f6)' }}
    >
      {/* Toggle circle */}
      <button
        onClick={() => onToggleStatus(task)}
        className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: done ? 'var(--color-success)' : 'var(--color-border)',
          background: done ? 'var(--color-success)' : 'transparent',
        }}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done && <CheckCircle2 size={12} className="text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{
            color: done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        {dueDateLabel && (
          <div className="flex items-center gap-1 mt-0.5">
            <Calendar size={10} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {dueDateLabel}
            </span>
          </div>
        )}
      </div>

      {/* Category / project chip */}
      {projectLabel && <CategoryChip label={projectLabel} />}

      {/* More menu */}
      <button
        onClick={() => onEdit(task)}
        className="shrink-0 p-1 rounded-lg"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="Edit task"
      >
        <MoreVertical size={15} />
      </button>
    </motion.div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface MobileTasksViewProps {
  user: { name?: string | null; email?: string } | null;
  counts: {
    pending: number;
    today: number;
    upcoming: number;
    completed: number;
    overdue: number;
    all: number;
  };
  tasks: TaskDTO[];
  timeZone: string;
  notionConnected: boolean;
  onNewTask: () => void;
  onOpenBoard: () => void;
  onNotionImport: () => void;
  onAIPlan: () => void;
  onToggleStatus: (task: TaskDTO) => void;
  onEdit: (task: TaskDTO) => void;
  onOpenSearch: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function MobileTasksView({
  user,
  counts,
  tasks,
  timeZone,
  notionConnected,
  onNewTask,
  onOpenBoard,
  onNotionImport,
  onAIPlan,
  onToggleStatus,
  onEdit,
  onOpenSearch,
}: MobileTasksViewProps) {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const hour = today.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const motiveLine = ['Make today count', 'Stay focused', 'Keep going', 'Own your day'][today.getDay() % 4];
  const subLine = 'Small steps. Big progress.';

  const pendingCount = counts.pending + counts.today;

  const formatDueDate = (d: string | null) => formatDueDateInTimeZone(d, timeZone);

  // Partition: today vs upcoming (non-done)
  const todayTasks = tasks.filter(
    (t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && isTodayInTimeZone(t.dueDate, timeZone)
  );
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && isUpcomingInTimeZone(t.dueDate, timeZone))
    .slice(0, 8); // cap at 8 on mobile

  const statItems = [
    {
      icon: <CheckCircle2 size={18} style={{ color: '#22c55e' }} />,
      value: counts.completed,
      label: 'Done',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      value: counts.today,
      label: 'Due today',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      value: counts.upcoming,
      label: 'Upcoming',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      value: counts.all,
      label: 'Total',
    },
  ];

  return (
    <div
      className="flex flex-col min-h-screen pb-24"
      style={{ background: 'var(--color-bg, #f8f8fc)' }}
    >
      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
        <LandscapeHero />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4">
          {/* Logo placeholder */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'rgba(255,255,255,0.85)' }}
          >
            <svg viewBox="0 0 32 32" width="22" height="22">
              <path d="M8 26 Q8 6 16 6 Q24 6 24 26" fill="#6366f1" fillOpacity="0.25" />
              <path d="M12 26 Q12 10 16 10 Q20 10 20 26" fill="#6366f1" fillOpacity="0.6" />
              <path d="M14 26 Q14 14 16 14 Q18 14 18 26" fill="#6366f1" />
            </svg>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSearch}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.75)' }}
              aria-label="Search"
            >
              <Search size={15} style={{ color: '#374151' }} />
            </button>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center relative"
              style={{ background: 'rgba(255,255,255,0.75)' }}
              aria-label="Notifications"
            >
              <Bell size={15} style={{ color: '#374151' }} />
              {counts.overdue > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
                  style={{ background: '#ef4444' }}
                />
              )}
            </button>
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              {(user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
          </div>
        </div>

        {/* Greeting + date text */}
        <div className="relative z-10 px-4 mt-3">
          <p
            className="text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: 'rgba(50,50,80,0.65)' }}
          >
            {dayName}, {dateStr}
          </p>
          <h1 className="text-2xl font-black leading-tight mt-0.5" style={{ color: '#1e1e3f' }}>
            {motiveLine}{' '}
            <span style={{ color: '#6366f1' }}>count</span>
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(50,50,80,0.55)' }}>
            {subLine}
          </p>

          {pendingCount > 0 && (
            <button
              onClick={onNewTask}
              className="mt-2 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm"
              style={{ background: 'rgba(255,255,255,0.88)', color: '#374151' }}
            >
              {pendingCount} task{pendingCount !== 1 ? 's' : ''} left
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Stats card ───────────────────────────────────────────────────── */}
      <div className="mx-4 -mt-5 relative z-20">
        <div
          className="rounded-2xl p-4 shadow-lg"
          style={{ background: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border, #e5e7eb)' }}
        >
          <div className="grid grid-cols-4 gap-1">
            {statItems.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                {s.icon}
                <span className="text-base font-black leading-none" style={{ color: 'var(--color-text-primary)' }}>
                  {s.value}
                </span>
                <span className="text-[10px] font-medium text-center" style={{ color: 'var(--color-text-muted)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick action buttons ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mx-4 mt-4">
        {/* New Task */}
        <button
          onClick={onNewTask}
          className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 transition-all active:scale-95"
          style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
          >
            <Plus size={18} className="text-white" />
          </div>
          <span className="text-[11px] font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>
            New Task
          </span>
        </button>

        {/* Board */}
        <button
          onClick={onOpenBoard}
          className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 transition-all active:scale-95"
          style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.10)' }}
          >
            <Columns3 size={18} style={{ color: '#6366f1' }} />
          </div>
          <span className="text-[11px] font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>
            Board
          </span>
        </button>

        {/* Import / Notion */}
        <button
          onClick={onNotionImport}
          className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 transition-all active:scale-95"
          style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            {/* Notion-style N icon */}
            <span className="text-base font-black" style={{ color: '#1a1a1a', fontFamily: 'serif' }}>
              N
            </span>
          </div>
          <span className="text-[11px] font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>
            Import
          </span>
        </button>

        {/* AI Plan */}
        <button
          onClick={onAIPlan}
          className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 transition-all active:scale-95"
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.15)' }}
          >
            <Sparkles size={18} style={{ color: '#d97706' }} />
          </div>
          <span className="text-[11px] font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>
            AI Plan
          </span>
        </button>
      </div>

      {/* ── Today section ────────────────────────────────────────────────── */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
            Today
          </h2>
          <button
            onClick={() => {/* handled by parent filter change if desired */}}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--color-accent, #6366f1)' }}
          >
            View all <ChevronRight size={13} />
          </button>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)' }}
        >
          {todayTasks.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center py-6 px-4 gap-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.15)' }}
              >
                <Sun size={22} style={{ color: '#f59e0b' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                No tasks due today
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                Take a breath or add a new task to keep your momentum going.
              </p>
              <button
                onClick={onNewTask}
                className="mt-1 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold"
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  color: '#6366f1',
                }}
              >
                <Plus size={12} /> Add a task
              </button>
            </div>
          ) : (
            <div className="px-3">
              <AnimatePresence initial={false}>
                {todayTasks.map((task) => (
                  <MobileTaskRow
                    key={task.id}
                    task={task}
                    timeZone={timeZone}
                    onToggleStatus={onToggleStatus}
                    onEdit={onEdit}
                    formatDueDate={formatDueDate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming section ─────────────────────────────────────────────── */}
      {upcomingTasks.length > 0 && (
        <div className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
              Upcoming
            </h2>
            <button
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: 'var(--color-accent, #6366f1)' }}
            >
              View all <ChevronRight size={13} />
            </button>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)' }}
          >
            <div className="px-3">
              <AnimatePresence initial={false}>
                {upcomingTasks.map((task) => (
                  <MobileTaskRow
                    key={task.id}
                    task={task}
                    timeZone={timeZone}
                    onToggleStatus={onToggleStatus}
                    onEdit={onEdit}
                    formatDueDate={formatDueDate}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Padding spacer for bottom nav */}
      <div className="h-6" />
    </div>
  );
}
