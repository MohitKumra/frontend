import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit2,
  Flame,
  FolderKanban,
  ListChecks,
  MoreHorizontal,
  Rocket,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { GoalDTO } from '../../types';

type ViewMode = 'grid' | 'list';

/* ─── helpers ─────────────────────────────────────────────── */

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function daysBetween(from: string | Date, to: string | Date) {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
  );
}

function formatDateShort(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'just now';
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function getGoalMeta(goal: GoalDTO): { label: string; Icon: LucideIcon; color: string } {
  const src = `${goal.category ?? ''} ${goal.icon ?? ''} ${goal.title}`.toLowerCase();
  const table = [
    { match: ['revenue', 'finance', 'money', 'sales'], label: 'Finance',    Icon: TrendingUp, color: '#10B981' },
    { match: ['launch', 'ship', 'release', 'build'],   label: 'Launch',     Icon: Rocket,     color: '#7C3AED' },
    { match: ['growth', 'scale', 'expand'],            label: 'Growth',     Icon: TrendingUp, color: '#4F46E5' },
    { match: ['health', 'fitness', 'wellness'],        label: 'Wellness',   Icon: Flame,      color: '#EF4444' },
    { match: ['learn', 'study', 'book', 'research'],   label: 'Learning',   Icon: BookOpen,   color: '#0EA5E9' },
    { match: ['design', 'brand', 'creative'],          label: 'Creative',   Icon: Rocket,     color: '#EC4899' },
    { match: ['ops', 'operations', 'system'],          label: 'Operations', Icon: Target,     color: '#F59E0B' },
    { match: ['code', 'tech', 'engineering', 'software'], label: 'Build',   Icon: TrendingUp, color: '#8B5CF6' },
  ].find((row) => row.match.some((p) => src.includes(p)));
  return table ?? { label: goal.category || 'Goal', Icon: Target, color: goal.color || '#4F46E5' };
}

/* ─── inline SVG ring ──────────────────────────────────────── */

function ProgressRing({
  progress,
  color,
  size = 68,
}: {
  progress: number;
  color: string;
  size?: number;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamp(progress, 0, 100) / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={stroke}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* progress arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* label */}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 12,
          fontWeight: 800,
          fill: 'var(--color-text-primary)',
          fontFamily: 'inherit',
        }}
      >
        {progress}%
      </text>
    </svg>
  );
}

/* ─── main component ────────────────────────────────────────── */

interface GoalCardViewProps {
  goal: GoalDTO;
  selected: boolean;
  viewMode: ViewMode;
  onSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCardView({
  goal,
  selected,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
}: GoalCardViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const meta = getGoalMeta(goal);
  const { Icon } = meta;
  const accent = goal.color || meta.color;

  const daysLeft = goal.targetDate
    ? daysBetween(new Date(), goal.targetDate)
    : null;

  /* status */
  const statusMap: Record<string, { label: string; color: string }> = {
    ACTIVE:    { label: 'On Track',  color: 'var(--color-success)'    },
    PAUSED:    { label: 'Paused',    color: 'var(--color-warning)'    },
    COMPLETED: { label: 'Completed', color: 'var(--color-info)'       },
    ARCHIVED:  { label: 'Archived',  color: 'var(--color-text-muted)' },
  };
  const status = statusMap[goal.status] ?? statusMap['ACTIVE'];

  /* milestones */
  const milestones = [...goal.milestones].sort((a, b) => {
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });
  const completedMs = milestones.filter((m) => m.status === 'COMPLETED').length;
  const totalMs = Math.max(milestones.length, 1);

  /* stat row */
  const stats: { label: string; value: number; Icon: LucideIcon; color: string }[] = [
    { label: 'Tasks',    value: goal.taskCount,    Icon: ListChecks,   color: 'var(--color-accent)'  },
    { label: 'Projects', value: goal.projectCount, Icon: FolderKanban, color: 'var(--color-info)'    },
    { label: 'Habits',   value: goal.habitCount,   Icon: Flame,        color: 'var(--color-success)' },
    { label: 'Journal',  value: 0,                 Icon: BookOpen,     color: 'var(--color-warning)' },
    { label: 'Focus',    value: 0,                 Icon: Timer,        color: '#8B5CF6'              },
  ];

  /* avatar stack */
  const linkedCount = goal.taskCount + goal.habitCount + goal.projectCount;
  const extraCount  = Math.max(0, linkedCount - 3);

  return (
    <motion.div
      layout
      onClick={onOpen}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group relative mx-auto w-full max-w-[1020px] cursor-pointer overflow-hidden rounded-[24px] border px-4 py-4 sm:px-5 sm:py-5"
      style={{
        background: selected
          ? `linear-gradient(180deg, color-mix(in srgb, ${accent} 4%, var(--color-surface)) 0%, var(--color-surface) 100%)`
          : 'linear-gradient(180deg, var(--color-surface) 0%, #ffffff 100%)',
        borderColor: selected
          ? `color-mix(in srgb, ${accent} 18%, var(--color-border))`
          : 'color-mix(in srgb, var(--color-border) 88%, white)',
        boxShadow: selected
          ? `0 14px 32px color-mix(in srgb, ${accent} 8%, transparent), 0 0 0 1px color-mix(in srgb, ${accent} 14%, transparent)`
          : '0 12px 26px rgba(15, 23, 42, 0.035)',
      }}
    >
      {/* ── TOP ROW: icon · content · ring · menu ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'start', gap: 10 }}>

        {/* icon square */}
        <div
          style={{
            flexShrink: 0,
            width: 52,
            height: 52,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 88%, #fff), color-mix(in srgb, ${accent} 55%, #fff))`,
            color: '#fff',
            boxShadow: `0 10px 24px color-mix(in srgb, ${accent} 18%, transparent)`,
          }}
        >
          <Icon size={22} />
        </div>

        {/* content block – grows to fill */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* title + ring + menu on same row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'start', gap: 10 }}>

            {/* title stretches */}
            <h3
              style={{
                flex: 1,
                minWidth: 0,
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                lineHeight: 1.15,
                color: 'var(--color-text-primary)',
              }}
            >
              {goal.title}
            </h3>

            {/* ring */}
            <ProgressRing progress={goal.progress} color={accent} size={64} />

            {/* menu */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="flex items-center justify-center rounded-lg border opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  width: 30,
                  height: 30,
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <MoreHorizontal size={15} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      zIndex: 50,
                      marginTop: 6,
                      width: 128,
                      overflow: 'hidden',
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => { onEdit(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-[var(--color-surface-raised)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { onDelete(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-[var(--color-surface-raised)]"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* badges row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 999,
                padding: '3px 9px',
                fontSize: 10,
                fontWeight: 700,
                background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                color: accent,
              }}
            >
              {goal.priority === 'CRITICAL' ? '⚡ High Priority'
                : `${goal.priority.charAt(0)}${goal.priority.slice(1).toLowerCase()} Priority`}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 999,
                padding: '3px 9px',
                fontSize: 10,
                fontWeight: 700,
                background: 'color-mix(in srgb, var(--color-info) 12%, transparent)',
                color: 'var(--color-info)',
              }}
            >
              Milestones {milestones.length === 0 ? '—' : `${completedMs} / ${milestones.length}`}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 999,
                padding: '3px 9px',
                fontSize: 10,
                fontWeight: 700,
                background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
                color: status.color,
              }}
            >
              <CheckCircle2 size={10} />
              {status.label}
            </span>
          </div>

          {/* description */}
          {goal.description && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--color-text-secondary)',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {goal.description}
            </p>
          )}

          {/* due date row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              marginTop: 10,
              fontSize: 12,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--color-text-muted)',
              }}
            >
              <Calendar size={12} />
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Due:</span>
              {' '}{goal.targetDate ? formatDateShort(goal.targetDate) : 'No deadline'}
            </span>

            {daysLeft !== null && (
              <span
                style={{
                  fontWeight: 600,
                  color: daysLeft < 0
                    ? 'var(--color-danger)'
                    : daysLeft < 14
                      ? 'var(--color-warning)'
                      : 'var(--color-text-muted)',
                }}
              >
                {daysLeft < 0
                  ? `${Math.abs(daysLeft)} days overdue`
                  : `${daysLeft} days left`}
              </span>
            )}

            {/* avatar stack */}
            <div style={{ display: 'flex', marginLeft: 2 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '2px solid var(--color-surface)',
                    marginLeft: i === 0 ? 0 : -6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    background: i === 0 ? accent : 'var(--color-surface-raised)',
                    color: i === 0 ? '#fff' : 'var(--color-text-secondary)',
                    zIndex: 3 - i,
                    position: 'relative',
                  }}
                >
                  {i === 0 ? goal.title[0].toUpperCase() : i + 1}
                </div>
              ))}
              {extraCount > 0 && (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '2px solid var(--color-surface)',
                    marginLeft: -6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    background: 'var(--color-surface-raised)',
                    color: 'var(--color-text-muted)',
                    position: 'relative',
                    zIndex: 0,
                  }}
                >
                  +{extraCount}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MILESTONE TRACK ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', flexShrink: 0 }}>Milestones</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              {Array.from({ length: totalMs }).map((_, i) => {
                const done = i < completedMs;
                const last = i === totalMs - 1;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: last ? 0 : 1, minWidth: 0 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: done ? accent : 'var(--color-border)',
                        boxShadow: done ? `0 0 0 3px color-mix(in srgb, ${accent} 14%, transparent)` : 'none',
                        transition: 'background 0.2s',
                      }}
                    />
                    {!last && (
                      <span
                        style={{
                          flex: 1,
                          minWidth: 12,
                          height: 2,
                          margin: '0 4px',
                          borderRadius: 999,
                          background: i < completedMs - 1 ? accent : 'var(--color-border)',
                          transition: 'background 0.2s',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {completedMs} / {totalMs}
          </span>
        </div>
      </div>

      {/* ── STAT STRIP ──────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 10,
          borderRadius: 14,
          border: '1px solid var(--color-border)',
          background: '#fff',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        }}
      >
        {stats.map(({ label, value, Icon: SIcon, color }, idx) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '11px 0 10px',
              borderLeft: idx === 0 ? 'none' : '1px solid var(--color-border)',
            }}
          >
            <span style={{ width: 20, height: 20, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
              <SIcon size={12} />
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1,
                color: 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                lineHeight: 1,
                color: 'var(--color-text-muted)',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-muted)',
          }}
        >
          <Zap size={11} style={{ color: 'var(--color-warning)' }} />
          Last AI review: {formatRelativeTime(goal.updatedAt)}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="rounded-2xl border px-4 py-2 text-sm font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            Continue
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="rounded-2xl border px-4 py-2 text-sm font-semibold"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Roadmap
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
