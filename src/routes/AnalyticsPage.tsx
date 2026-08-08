import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Folder,
  FolderKanban,
  Flame,
  Gauge,
  Lightbulb,
  Layers,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient from '../lib/apiClient';
import { containerVariants, itemVariants, filterContainerVariants } from '../lib/motionVariants';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { FloatingAnalyticsEmpty } from '../components/ui/FloatingAnalyticsEmpty';
import { FloatingProjectsEmpty } from '../components/ui/FloatingProjectsEmpty';
import type {
  AnalyticsSummaryDTO,
  DailyAnalyticsDTO,
  EnhancedDashboardDTO,
  InsightDTO,
  ProjectAnalyticsDTO,
  ProjectHealth,
} from '../types';
import {
  DateRangePicker,
  computePresetDates,
  formatReadableDate,
  type DateRange,
} from '../components/analytics/DateRangePicker';
import { WeeklyConsistency } from '../components/analytics/WeeklyConsistency';
import { FocusAnalytics } from '../components/analytics/FocusAnalytics';
import { TaskAnalytics } from '../components/analytics/TaskAnalytics';
import { HabitAnalytics } from '../components/analytics/HabitAnalytics';
import { TimeOfDayAnalysis } from '../components/analytics/TimeOfDayAnalysis';

type FocusAnalyticsData = {
  totalFocusMinutes: number;
  totalSessions: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  shortestSessionMinutes: number;
  interruptions: number;
  cancelledSessions: number;
  breakMinutes: number;
};

type TaskAnalyticsData = {
  totalCreated: number;
  totalCompleted: number;
  totalOverdue: number;
  totalCancelled: number;
  totalRescheduled: number;
  completionRate: number;
  averageCompletionMinutes: number;
  fastestTaskMinutes: number;
  longestTaskMinutes: number;
  completionVelocityPerDay: number;
};

type HabitAnalyticsData = {
  habits: Array<{
    id: string;
    title: string;
    completionCount: number;
    totalExpected: number;
    skippedDays: number;
    completionRate: number;
  }>;
  overallCompletion: number;
  totalSkippedDays: number;
  weakestHabit: { id: string; title: string; rate: number } | null;
  strongestHabit: { id: string; title: string; rate: number } | null;
  mostSuccessfulHabit: { id: string; title: string; rate: number } | null;
};

type ConsistencyData = {
  days: Array<{
    day: string;
    tasksPerDay: number;
    habitsPerDay: number;
    focusPerDay: number;
    score: number;
  }>;
  overallScore: number;
};

type TimeOfDayData = {
  timeSlots: Array<{
    slot: string;
    tasksCompleted: number;
    focusMinutes: number;
    completionRate: number;
    averageSessionMinutes: number;
  }>;
};

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function parseUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function shiftUtcDate(dateStr: string, deltaDays: number): string {
  const date = parseUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().split('T')[0];
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function sumDaily(series: DailyAnalyticsDTO[] | undefined) {
  return (series ?? []).reduce(
    (acc, day) => {
      acc.tasksCreated += day.tasksCreated;
      acc.tasksCompleted += day.tasksCompleted;
      acc.tasksOverdue += day.tasksOverdue;
      acc.focusMinutes += day.focusMinutes;
      acc.habitsCompleted += day.habitsCompleted;
      acc.productivityScore += day.productivityScore;
      return acc;
    },
    {
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksOverdue: 0,
      focusMinutes: 0,
      habitsCompleted: 0,
      productivityScore: 0,
    }
  );
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function comparisonLabel(preset: DateRange['preset']) {
  switch (preset) {
    case 'today':
      return 'vs yesterday';
    case 'yesterday':
      return 'vs the day before';
    case 'this_week':
      return 'vs last week';
    case 'last_week':
      return 'vs the week before';
    case 'this_month':
      return 'vs last month';
    case 'last_month':
      return 'vs the month before';
    default:
      return 'vs previous period';
  }
}

function trendStyle(value: number) {
  return value >= 0
    ? { bg: 'var(--color-success-subtle)', fg: 'var(--color-success)', icon: <ArrowUp size={10} strokeWidth={2.25} /> }
    : { bg: 'var(--color-danger-subtle)', fg: 'var(--color-danger)', icon: <ArrowDown size={10} strokeWidth={2.25} /> };
}

function TrendPill({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const style = trendStyle(value);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold"
      style={{ background: style.bg, color: style.fg }}
    >
      {style.icon}
      {`${value > 0 ? '+' : ''}${Math.round(value)}${suffix}`}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  eyebrow,
  icon,
  iconTone = 'default',
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  eyebrow: string;
  icon: ReactNode;
  iconTone?: 'default' | 'accent' | 'success' | 'warning' | 'info';
  children: ReactNode;
  className?: string;
}) {
  const iconVars = {
    default: ['var(--color-border-subtle)', 'var(--color-text-secondary)'],
    accent: ['var(--icon-bg-accent)', 'var(--icon-text-accent)'],
    success: ['var(--icon-bg-success)', 'var(--icon-text-success)'],
    warning: ['var(--icon-bg-warning)', 'var(--icon-text-warning)'],
    info: ['var(--icon-bg-info)', 'var(--icon-text-info)'],
  }[iconTone];

  return (
    <Card
      variant="glass"
      className={`overflow-hidden rounded-2xl border ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        className="flex items-start gap-3 border-b px-5 py-4"
        style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-elevated)' }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: iconVars[0], color: iconVars[1] }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div
            className="text-[9.5px] font-bold uppercase tracking-[0.22em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {eyebrow}
          </div>
          <h3 className="mt-0.5 text-[13.5px] font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[10.5px] font-medium leading-snug" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
  );
}

function InlineStat({
  label,
  value,
  tone = 'default',
  description,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'accent';
  description?: string;
}) {
  const styles = {
    default: { fg: 'var(--color-text-primary)', bg: 'var(--color-surface)' },
    success: { fg: 'var(--color-success)', bg: 'var(--color-success-subtle)' },
    warning: { fg: 'var(--color-warning)', bg: 'var(--color-warning-subtle)' },
    info: { fg: 'var(--color-info)', bg: 'var(--color-info-subtle)' },
    accent: { fg: 'var(--color-accent)', bg: 'var(--color-accent-subtle)' },
  }[tone];

  return (
    <div className="rounded-xl border p-3" style={{ background: styles.bg, borderColor: 'var(--color-border-subtle)' }}>
      <div className="text-[8.5px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-[13.5px] font-bold leading-tight" style={{ color: styles.fg }}>
        {value}
      </div>
      {description && (
        <div className="mt-0.5 text-[10px] font-medium leading-snug" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  trend,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  tone: 'accent' | 'success' | 'warning' | 'info';
}) {
  const iconVars = {
    accent: ['var(--icon-bg-accent)', 'var(--icon-text-accent)'],
    success: ['var(--icon-bg-success)', 'var(--icon-text-success)'],
    warning: ['var(--icon-bg-warning)', 'var(--icon-text-warning)'],
    info: ['var(--icon-bg-info)', 'var(--icon-text-info)'],
  }[tone];

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }} className="h-full">
      <Card
        variant="glass"
        className="relative h-full overflow-hidden rounded-2xl border p-4"
        style={{
          borderColor: 'var(--color-border)',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `var(--gradient-${tone})` }} />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: iconVars[0], color: iconVars[1] }}
            >
              {icon}
            </div>
            {typeof trend === 'number' && <TrendPill value={trend} />}
          </div>
          <div
            className="mt-4 text-2xl font-bold leading-none tabular-nums"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {value}
          </div>
          <div
            className="mt-2 text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {label}
          </div>
          {sub && (
            <div
              className="mt-auto pt-1.5 text-[10.5px] font-medium leading-relaxed"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {sub}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function InsightCard({ insight, index }: { insight: InsightDTO; index: number }) {
  const iconMap: Record<string, ReactNode> = {
    trend: <TrendingUp size={13} strokeWidth={1.75} />,
    clock: <Clock size={13} strokeWidth={1.75} />,
    calendar: <Calendar size={13} strokeWidth={1.75} />,
    alert: <AlertTriangle size={13} strokeWidth={1.75} />,
  };
  const colors: Record<string, { bg: string; fg: string }> = {
    positive: { bg: 'var(--color-success-subtle)', fg: 'var(--color-success)' },
    warning: { bg: 'var(--color-warning-subtle)', fg: 'var(--color-warning)' },
    neutral: { bg: 'var(--color-info-subtle)', fg: 'var(--color-info)' },
  };
  const tone = colors[insight.type] ?? colors.neutral;
  const label = insight.type === 'positive' ? 'Keep doing' : insight.type === 'warning' ? 'Fix next' : 'Watch';

  return (
    <div
      className="relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${tone.fg}, color-mix(in srgb, ${tone.fg} 30%, transparent))` }}
      />
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {label}
            </span>
          </div>
          <p
            className="mt-2.5 text-[12.5px] font-medium leading-relaxed"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {insight.text}
          </p>
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{ background: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
          >
            {iconMap[insight.icon] ?? <Lightbulb size={12} strokeWidth={1.75} />}
            {insight.icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyInsightsState({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-dashed p-5"
      style={{
        background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h4>
          <p className="mt-1 text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function PeriodSummaryCard({
  currentScore,
  scoreDelta,
  taskDelta,
  focusDelta,
  habitDelta,
  summary,
  comparison,
  leadInsightText,
}: {
  currentScore: number;
  scoreDelta: number;
  taskDelta: number;
  focusDelta: number;
  habitDelta: number;
  summary: AnalyticsSummaryDTO | undefined;
  comparison: string;
  leadInsightText: string;
}) {
  const tasksCompleted = summary?.tasksCompleted ?? 0;
  const tasksTotal = summary?.tasksTotal ?? 0;
  const habitsCompleted = summary?.habitsCompletedToday ?? 0;
  const habitsTotal = summary?.habitsTotal ?? 0;
  const focusMinutes = summary?.focusMinutesTotal ?? 0;
  const focusSessions = summary?.focusSessionsTotal ?? 0;

  return (
    <SectionCard
      eyebrow="Summary"
      title="What this period says"
      subtitle="A plain-language read of the numbers in front of you."
      icon={<Lightbulb size={16} strokeWidth={1.75} />}
      iconTone="info"
      className="h-full"
    >
      <p
        className="text-[13px] font-medium leading-relaxed text-balance"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Your score is{' '}
        <span className="text-[15px] font-bold" style={{ color: 'var(--color-accent)' }}>
          {currentScore}
        </span>
        , which places this period {comparison}. The strongest pattern is {leadInsightText.toLowerCase()}, so the
        cleanest improvement path is to keep task flow and focus time steady.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <InlineStat
          label="Tasks"
          value={`${tasksCompleted}/${tasksTotal}`}
          tone={taskDelta >= 0 ? 'success' : 'warning'}
        />
        <InlineStat
          label="Focus"
          value={`${formatMinutes(focusMinutes)} / ${focusSessions} sessions`}
          tone={focusDelta >= 0 ? 'success' : 'warning'}
        />
        <InlineStat
          label="Habits"
          value={`${habitsCompleted}/${habitsTotal}`}
          tone={habitDelta >= 0 ? 'success' : 'warning'}
        />
      </div>

      <div
        className="mt-4 rounded-xl border p-4"
        style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          Best read
        </div>
        <p className="mt-1.5 text-[12px] font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          The fastest lift usually comes from finishing planned tasks earlier and protecting focused sessions from
          interruptions.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InlineStat
          label="Consider soon"
          value={`${comparison.replace('vs ', '')}`}
          tone="warning"
          description="Selected date range"
        />
        <InlineStat label="Reference" value={comparison} tone="info" description="Reference period" />
      </div>
    </SectionCard>
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 144;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const gradientId = 'scoreRingGradient';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-info)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          {score}
        </span>
        <span
          className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.24em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Score
        </span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'info';
}) {
  const styles =
    tone === 'warning'
      ? { bg: 'var(--color-warning-subtle)', fg: 'var(--color-warning)' }
      : tone === 'success'
        ? { bg: 'var(--color-success-subtle)', fg: 'var(--color-success)' }
        : tone === 'info'
          ? { bg: 'var(--color-info-subtle)', fg: 'var(--color-info)' }
          : { bg: 'var(--color-surface)', fg: 'var(--color-text-primary)' };

  return (
    <div className="rounded-xl p-3 text-center" style={{ background: styles.bg }}>
      <div className="text-[8.5px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-[13.5px] font-bold" style={{ color: styles.fg }}>
        {value}
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div className="mt-1.5 text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function ProjectHealthBadge({ health }: { health: ProjectAnalyticsDTO['health'] }) {
  const styleMap: Record<ProjectHealth, { bg: string; fg: string; label: string }> = {
    AHEAD: { bg: 'var(--color-success-subtle)', fg: 'var(--color-success)', label: 'Ahead' },
    ON_TRACK: { bg: 'var(--color-info-subtle)', fg: 'var(--color-info)', label: 'On track' },
    BEHIND: { bg: 'var(--color-warning-subtle)', fg: 'var(--color-warning)', label: 'Behind' },
  };
  const styles = styleMap[health];

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ background: styles.bg, color: styles.fg }}
    >
      {styles.label}
    </span>
  );
}

function BenchmarkCard({
  currentScore,
  averageScore,
  bestScore,
  percentile,
  historyCount,
  bestDayLabel,
}: {
  currentScore: number;
  averageScore: number;
  bestScore: number;
  percentile: number;
  historyCount: number;
  bestDayLabel: string;
}) {
  const deltaFromAverage = currentScore - averageScore;
  const deltaFromBest = currentScore - bestScore;
  const hasBenchmarkData = historyCount >= 7;
  const currentPosition = Math.max(0, Math.min(100, currentScore));
  const averagePosition = Math.max(0, Math.min(100, averageScore));
  const bestPosition = Math.max(0, Math.min(100, bestScore));

  return (
    <SectionCard
      eyebrow="Benchmark"
      title="How today's score compares"
      subtitle="This shows how you rank vs your last 90 days' productivity scores."
      icon={<Award size={16} strokeWidth={1.75} />}
      iconTone="accent"
      className="h-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
            Current score
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {currentScore}
          </div>
          <p className="mt-1 text-[11px] font-medium leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {hasBenchmarkData
              ? `Better than ${percentile}% of days in the last 90 days.`
              : `Not enough history yet. We have ${historyCount} day${historyCount === 1 ? '' : 's'} of data.`}
          </p>
        </div>
        <TrendPill value={deltaFromAverage} />
      </div>

      <div
        className="mt-4 rounded-xl border p-4"
        style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="relative h-9">
          <div
            className="absolute inset-x-0 top-3.5 h-1.5 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, color-mix(in srgb, var(--color-danger) 35%, transparent), color-mix(in srgb, var(--color-warning) 30%, transparent), color-mix(in srgb, var(--color-success) 30%, transparent))',
            }}
          />
          {[
            { label: 'Avg', position: averagePosition, tone: 'var(--color-info)' },
            { label: 'Now', position: currentPosition, tone: 'var(--color-accent)' },
            { label: 'Best', position: bestPosition, tone: 'var(--color-success)' },
          ].map((marker) => (
            <div
              key={marker.label}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${marker.position}%` }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm"
                style={{ background: marker.tone }}
              />
              <span
                className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {marker.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InlineStat label="90-day avg" value={Math.round(averageScore).toString()} />
        <InlineStat label="90-day best" value={Math.round(bestScore).toString()} tone="success" />
        <InlineStat
          label="vs best"
          value={`${deltaFromBest > 0 ? '+' : ''}${Math.round(deltaFromBest)}`}
          tone={deltaFromBest >= 0 ? 'success' : 'warning'}
        />
        <InlineStat
          label="Top"
          value={`Top ${Math.max(1, 100 - percentile)}%`}
          tone="info"
          description="Within current sample"
        />
      </div>

      <div className="mt-4 text-[10.5px] font-medium leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        Based on daily 90-day rolling window. Best day: {bestDayLabel}.
      </div>

      {!hasBenchmarkData && (
        <div className="mt-4">
          <EmptyInsightsState
            title="Benchmark still warming up"
            description={`We need at least 7 daily scores before the benchmark becomes useful. Right now we have ${historyCount} day${historyCount === 1 ? '' : 's'} in the sample.`}
            icon={<Award size={16} strokeWidth={1.75} />}
          />
        </div>
      )}
    </SectionCard>
  );
}

interface AnalyticsPageProps {
  embedded?: boolean;
}

export function AnalyticsPage({ embedded = false }: AnalyticsPageProps) {
  const initialDates = computePresetDates('this_week');
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'this_week',
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
  });

  const reducedMotion = useReducedMotion();
  // Key changes whenever the date filter changes — drives the AnimatePresence
  // re-mount so the staggered fade+slide replays while queries refetch.
  const rangeKey = `${dateRange.startDate}-${dateRange.endDate}`;

  const queryParams = useMemo(
    () => ({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
    [dateRange.startDate, dateRange.endDate]
  );
  const rangeDays = useMemo(() => {
    const start = parseUtcDate(dateRange.startDate);
    const end = parseUtcDate(dateRange.endDate);
    return Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1);
  }, [dateRange.startDate, dateRange.endDate]);
  const previousRange = useMemo(() => {
    const prevEnd = shiftUtcDate(dateRange.startDate, -1);
    const prevStart = shiftUtcDate(prevEnd, -(rangeDays - 1));
    return { startDate: prevStart, endDate: prevEnd };
  }, [dateRange.startDate, rangeDays]);
  const previousParams = useMemo(
    () => ({ startDate: previousRange.startDate, endDate: previousRange.endDate }),
    [previousRange.startDate, previousRange.endDate]
  );

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary', dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      apiClient.get<AnalyticsSummaryDTO>('/analytics/summary', { params: queryParams }).then((r) => r.data),
  });
  const { data: previousSummary } = useQuery({
    queryKey: ['analytics', 'summary', previousRange.startDate, previousRange.endDate],
    queryFn: () =>
      apiClient.get<AnalyticsSummaryDTO>('/analytics/summary', { params: previousParams }).then((r) => r.data),
  });
  const { data: daily } = useQuery({
    queryKey: ['analytics', 'daily', dateRange.startDate, dateRange.endDate],
    queryFn: () => apiClient.get<DailyAnalyticsDTO[]>('/analytics/daily', { params: queryParams }).then((r) => r.data),
  });
  const { data: previousDaily } = useQuery({
    queryKey: ['analytics', 'daily', previousRange.startDate, previousRange.endDate],
    queryFn: () =>
      apiClient.get<DailyAnalyticsDTO[]>('/analytics/daily', { params: previousParams }).then((r) => r.data),
  });
  const { data: history90 } = useQuery({
    queryKey: ['analytics', 'daily', '90d'],
    queryFn: () => apiClient.get<DailyAnalyticsDTO[]>('/analytics/daily', { params: { days: 90 } }).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const { data: projects } = useQuery({
    queryKey: ['analytics', 'projects', dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      apiClient.get<ProjectAnalyticsDTO[]>('/analytics/projects', { params: queryParams }).then((r) => r.data),
  });
  const { data: weekly } = useQuery({
    queryKey: ['analytics', 'weekly', dateRange.startDate, dateRange.endDate],
    queryFn: () => apiClient.get<any[]>('/analytics/weekly', { params: queryParams }).then((r) => r.data),
  });
  const { data: enhancedData } = useQuery({
    queryKey: ['dashboard', 'enhanced'],
    queryFn: () => apiClient.get<EnhancedDashboardDTO>('/dashboard/enhanced').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const { data: focusAnalytics } = useQuery({
    queryKey: ['analytics', 'focus', dateRange.startDate, dateRange.endDate],
    queryFn: () => apiClient.get<FocusAnalyticsData>('/analytics/focus', { params: queryParams }).then((r) => r.data),
  });
  const { data: taskAnalytics } = useQuery({
    queryKey: ['analytics', 'tasks', dateRange.startDate, dateRange.endDate],
    queryFn: () => apiClient.get<TaskAnalyticsData>('/analytics/tasks', { params: queryParams }).then((r) => r.data),
  });
  const { data: habitAnalytics } = useQuery({
    queryKey: ['analytics', 'habits', dateRange.startDate, dateRange.endDate],
    queryFn: () => apiClient.get<HabitAnalyticsData>('/analytics/habits', { params: queryParams }).then((r) => r.data),
  });
  const { data: consistency } = useQuery({
    queryKey: ['analytics', 'consistency', dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      apiClient.get<ConsistencyData>('/analytics/consistency', { params: queryParams }).then((r) => r.data),
  });
  const { data: timeOfDay } = useQuery({
    queryKey: ['analytics', 'time-of-day', dateRange.startDate, dateRange.endDate],
    queryFn: () => apiClient.get<TimeOfDayData>('/analytics/time-of-day', { params: queryParams }).then((r) => r.data),
  });

  const currentScore = summary?.productivityScore ?? 0;
  const previousScore = previousSummary?.productivityScore ?? sumDaily(previousDaily).productivityScore;
  const comparison = comparisonLabel(dateRange.preset);
  const scoreDelta = percentChange(currentScore, previousScore);
  const focusDelta = percentChange(
    summary?.focusMinutesTotal ?? 0,
    previousSummary?.focusMinutesTotal ?? sumDaily(previousDaily).focusMinutes
  );
  const taskDelta = percentChange(
    summary?.tasksCompleted ?? 0,
    previousSummary?.tasksCompleted ?? sumDaily(previousDaily).tasksCompleted
  );
  const habitDelta = percentChange(
    summary?.habitsCompletedToday ?? 0,
    previousSummary?.habitsCompletedToday ?? sumDaily(previousDaily).habitsCompleted
  );
  const streakDelta = (summary?.currentHabitStreak ?? 0) - (previousSummary?.currentHabitStreak ?? 0);
  const projectHealthAverage = average((projects ?? []).map((project) => project.progressDelta));
  const projectBehindCount = (projects ?? []).filter((project) => project.health === 'BEHIND').length;
  const projectAheadCount = (projects ?? []).filter((project) => project.health === 'AHEAD').length;
  const onTrackCount = (projects ?? []).filter((project) => project.health === 'ON_TRACK').length;

  const chartData = (daily ?? []).map((day) => ({
    label: day.date.slice(5),
    tasksCreated: day.tasksCreated,
    tasksCompleted: day.tasksCompleted,
    tasksOverdue: day.tasksOverdue,
    habitsCompleted: day.habitsCompleted,
    focusMinutes: day.focusMinutes,
    productivityScore: day.productivityScore,
  }));

  const weeklyData = (weekly ?? []).map((week) => ({
    week: week.week.split('-W')[1] ? `W${week.week.split('-W')[1]}` : week.week,
    Tasks: week.tasksCompleted,
    Focus: week.focusMinutes,
    Habits: week.habitsCompleted,
    Projects: week.projectsCompleted,
  }));

  const projectsByStatus =
    projects?.reduce<Record<string, number>>((acc, project) => {
      acc[project.status] = (acc[project.status] ?? 0) + 1;
      return acc;
    }, {}) ?? {};
  const pieData = Object.entries(projectsByStatus).map(([name, value]) => ({
    name: name
      .replace('_', ' ')
      .toLowerCase()
      .replace(/^\w/, (char) => char.toUpperCase()),
    value,
  }));
  const totalProjectsCount = pieData.reduce((sum, entry) => sum + entry.value, 0);
  const dominantStatus = pieData.reduce<{ name: string; value: number } | null>(
    (best, entry) => (!best || entry.value > best.value ? entry : best),
    null
  );
  const dominantStatusPercent =
    totalProjectsCount > 0 && dominantStatus ? Math.round((dominantStatus.value / totalProjectsCount) * 100) : 0;

  const selectedSummary = useMemo(() => sumDaily(daily), [daily]);
  const scorePercentile = useMemo(() => {
    const values = (history90 ?? []).map((day) => day.productivityScore);
    if (values.length === 0) return 0;
    return Math.min(100, Math.round((values.filter((value) => value <= currentScore).length / values.length) * 100));
  }, [history90, currentScore]);
  const topPercent = Math.max(1, 100 - scorePercentile);
  const bestDay = useMemo(() => {
    return (history90 ?? []).reduce<DailyAnalyticsDTO | null>((best, day) => {
      if (!best || day.productivityScore > best.productivityScore) return day;
      return best;
    }, null);
  }, [history90]);
  const leadInsight =
    enhancedData?.insights?.find((insight) => insight.type === 'positive') ?? enhancedData?.insights?.[0];
  const leadInsightText = leadInsight?.text ?? 'keep your current rhythm steady';
  const benchmarkCount = history90?.length ?? 0;
  const benchmarkAverage = average((history90 ?? []).map((day) => day.productivityScore));

  const taskBreakdown = Math.round((summary?.taskCompletionRate ?? 0) * 0.3);
  const habitBreakdown = Math.round(
    Math.min((summary?.habitsCompletedToday ?? 0) / Math.max(summary?.habitsTotal ?? 1, 1), 1) * 20
  );
  const focusBreakdown = Math.min(Math.round(((summary?.focusMinutesTotal ?? 0) / 240) * 20), 20);
  const consistencyBreakdown = Math.min(Math.round(((summary?.currentHabitStreak ?? 0) / 14) * 15), 15);
  const penaltyBreakdown = Math.min((summary?.overdueTasks ?? 0) * 2 + (summary?.cancelledFocusSessions ?? 0), 15);

  const heroSubtitle =
    dateRange.startDate === dateRange.endDate
      ? formatReadableDate(dateRange.startDate)
      : `${formatReadableDate(dateRange.startDate)} - ${formatReadableDate(dateRange.endDate)}`;

  const RootWrapper: any = embedded ? 'div' : motion.div;
  const rootProps = embedded
    ? { className: 'relative mx-auto flex w-full flex-col gap-5 overflow-hidden px-3 py-4 sm:px-4 lg:px-5 lg:py-5' }
    : {
        variants: containerVariants,
        initial: 'hidden',
        animate: 'visible',
        className: 'relative mx-auto flex w-full flex-col gap-5 overflow-hidden px-3 py-4 sm:px-4 lg:px-5 lg:py-5',
      };

  return (
    <RootWrapper {...rootProps}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] opacity-80" />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div
          className="overflow-hidden rounded-[24px] border"
          style={{
            background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)',
            borderColor: 'var(--color-border-subtle)',
          }}
        >
          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.1fr_auto] lg:items-start">
            <div className="flex items-start gap-4">
              <div
                className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:flex"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-info))', color: '#fff' }}
              >
                <Brain size={22} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.26em]"
                  style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                >
                  <Sparkles size={11} strokeWidth={2} />
                  Executive analytics
                </div>
                <h1
                  className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Analytics Dashboard
                </h1>
                <p
                  className="mt-1.5 max-w-2xl text-[13px] font-medium leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Discover what changed, why it changed, and what to improve next.
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div
                className="rounded-xl border px-4 py-3"
                style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)' }}
              >
                <div
                  className="text-[8.5px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Period
                </div>
                <div className="mt-1 text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {heroSubtitle}
                </div>
              </div>
              <div
                className="rounded-xl border px-4 py-3"
                style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)' }}
              >
                <div
                  className="text-[8.5px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Relative
                </div>
                <div className="mt-1 text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {comparison}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </motion.div>

      {/* Animated content — re-triggers staggered fade+slide on filter change.
          The header + DateRangePicker above stay static so the filter bar
          remains interactive while the content below transitions. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={rangeKey}
          variants={reducedMotion ? undefined : filterContainerVariants}
          initial={reducedMotion ? false : 'hidden'}
          animate="visible"
          exit={reducedMotion ? undefined : 'exit'}
          className="flex flex-col gap-5"
        >
          {/* Hero productivity score */}
          <motion.div variants={itemVariants}>
            <Card
              variant="glass"
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: 'var(--color-border)',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -14px rgba(15, 23, 42, 0.1)',
              }}
            >
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_auto_1fr] lg:items-center">
                <div className="min-w-0">
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em]"
                    style={{ background: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
                  >
                    <Gauge size={11} strokeWidth={2} />
                    Productivity score
                  </div>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <h2 className="text-5xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                      {currentScore}
                    </h2>
                    <TrendPill value={scoreDelta} />
                  </div>
                  <p className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Top {topPercent}% of your last 90 days.
                  </p>
                  <p
                    className="mt-3 max-w-xl text-[12.5px] font-medium leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    This is the selected period's productivity score. It blends tasks, habits, focus time, consistency,
                    and peak performance into one number.
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <ScoreRing score={currentScore} />
                </div>

                <div className="grid grid-cols-3 gap-4 sm:justify-items-start justify-items-center">
                  <HeroStat label="Tasks" value={`${summary?.tasksCompleted ?? 0}/${summary?.tasksTotal ?? 0}`} />
                  <HeroStat
                    label="Habits"
                    value={`${summary?.habitsCompletedToday ?? 0}/${summary?.habitsTotal ?? 0}`}
                  />
                  <HeroStat label="Focus" value={formatMinutes(summary?.focusMinutesTotal ?? 0)} />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Benchmark + summary */}
          <motion.div variants={itemVariants} className="grid gap-6 xl:grid-cols-2">
            <BenchmarkCard
              currentScore={currentScore}
              averageScore={benchmarkAverage}
              bestScore={bestDay ? bestDay.productivityScore : 0}
              percentile={scorePercentile}
              historyCount={benchmarkCount}
              bestDayLabel={bestDay ? formatReadableDate(bestDay.date) : 'No data yet'}
            />
            <PeriodSummaryCard
              currentScore={currentScore}
              scoreDelta={scoreDelta}
              taskDelta={taskDelta}
              focusDelta={focusDelta}
              habitDelta={habitDelta}
              summary={summary}
              comparison={comparison}
              leadInsightText={leadInsightText}
            />
          </motion.div>

          {/* KPI summary row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              icon={<CheckCircle2 size={16} strokeWidth={1.75} />}
              label="Tasks completed"
              value={summary?.tasksCompleted ?? 0}
              sub={`${summary?.tasksCompleted ?? 0} of ${summary?.tasksTotal ?? 0} this period`}
              trend={taskDelta}
              tone="success"
            />
            <MetricCard
              icon={<Target size={16} strokeWidth={1.75} />}
              label="Habit completions"
              value={summary?.habitsCompletedToday ?? 0}
              sub={`${summary?.habitsCompletedToday ?? 0} of ${summary?.habitsTotal ?? 0} habits`}
              trend={habitDelta}
              tone="accent"
            />
            <MetricCard
              icon={<Timer size={16} strokeWidth={1.75} />}
              label="Focus time"
              value={formatMinutes(summary?.focusMinutesTotal ?? 0)}
              sub={`${summary?.focusSessionsTotal ?? 0} completed sessions`}
              trend={focusDelta}
              tone="info"
            />
            <MetricCard
              icon={<Flame size={16} strokeWidth={1.75} />}
              label="Current streak"
              value={`${summary?.currentHabitStreak ?? 0}d`}
              sub={`Best: ${summary?.longestHabitStreak ?? 0}d`}
              trend={streakDelta}
              tone="warning"
            />
            <MetricCard
              icon={<Folder size={16} strokeWidth={1.75} />}
              label="Projects"
              value={projects?.length ?? 0}
              sub={`${onTrackCount} on track, ${projectBehindCount} behind`}
              trend={projectHealthAverage}
              tone="accent"
            />
            <MetricCard
              icon={<Gauge size={16} strokeWidth={1.75} />}
              label="Score"
              value={currentScore}
              sub={`Compared with ${comparison}`}
              trend={scoreDelta}
              tone="success"
            />
          </motion.div>

          {/* Recommended actions */}
          <motion.div variants={itemVariants}>
            <SectionCard
              eyebrow="Insights"
              title="Recommended actions"
              subtitle="These come straight out of the data, not just what happened."
              icon={<Sparkles size={16} strokeWidth={1.75} />}
              iconTone="accent"
            >
              {enhancedData?.insights?.length ? (
                <div className="columns-1 gap-4 lg:columns-2 2xl:columns-3">
                  {enhancedData.insights.slice(0, 5).map((insight, index) => (
                    <InsightCard key={insight.id} insight={insight} index={index} />
                  ))}
                </div>
              ) : (
                <EmptyInsightsState
                  title="No recommendations yet"
                  description="Keep logging tasks, habits, and focus sessions. Once there is enough recent activity, the AI will surface patterns and next steps here."
                  icon={<Sparkles size={16} strokeWidth={1.75} />}
                />
              )}
            </SectionCard>
          </motion.div>

          {/* Daily overview + project distribution */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
            <SectionCard
              eyebrow="Daily movement"
              title="Daily activity"
              subtitle={heroSubtitle}
              icon={<Activity size={16} strokeWidth={1.75} />}
              iconTone="accent"
            >
              <div
                className="flex flex-wrap items-center gap-3 text-[9.5px] font-bold"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  Created
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                  Completed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
                  Overdue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-info)]" />
                  Habits
                </span>
              </div>

              <div className="mt-4 h-[220px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dailyCreatedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="dailyCompletedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="dailyOverdueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="dailyHabitsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={24}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-raised)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 12,
                          boxShadow: 'var(--shadow-md)',
                        }}
                        cursor={{ stroke: 'var(--color-border-subtle)', strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tasksCreated"
                        name="Created"
                        stroke="var(--color-accent)"
                        strokeWidth={2.5}
                        fill="url(#dailyCreatedFill)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tasksCompleted"
                        name="Completed"
                        stroke="var(--color-success)"
                        strokeWidth={2.5}
                        fill="url(#dailyCompletedFill)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tasksOverdue"
                        name="Overdue"
                        stroke="var(--color-warning)"
                        strokeWidth={2.5}
                        fill="url(#dailyOverdueFill)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="habitsCompleted"
                        name="Habits"
                        stroke="var(--color-info)"
                        strokeWidth={2.5}
                        fill="url(#dailyHabitsFill)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <FloatingAnalyticsEmpty
                    message="No daily activity for this period"
                    subMessage="Add tasks, habits, or focus sessions to populate the daily activity chart."
                  />
                )}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                <MiniStat label="Created" value={`${selectedSummary.tasksCreated}`} />
                <MiniStat label="Completed" value={`${selectedSummary.tasksCompleted}`} tone="success" />
                <MiniStat label="Overdue" value={`${selectedSummary.tasksOverdue}`} tone="warning" />
                <MiniStat label="Focus" value={formatMinutes(selectedSummary.focusMinutes)} />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Project distribution"
              title="Track your progress"
              subtitle={
                projects?.length
                  ? `${projects.length} tracked project${projects.length === 1 ? '' : 's'}`
                  : 'No projects yet'
              }
              icon={<FolderKanban size={16} strokeWidth={1.75} />}
              iconTone="info"
            >
              {projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 4).map((project, index) => {
                    const accent = COLORS[index % COLORS.length];
                    return (
                      <div
                        key={project.projectId}
                        className="rounded-xl border p-3.5"
                        style={{
                          background: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-border-subtle)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4
                              className="truncate text-[13px] font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {project.projectName}
                            </h4>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                                style={{ background: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
                              >
                                {project.status}
                              </span>
                              <ProjectHealthBadge health={project.health} />
                            </div>
                          </div>
                          <div className="shrink-0 text-lg font-bold" style={{ color: accent }}>
                            {Math.round(project.progress)}%
                          </div>
                        </div>

                        <div className="mt-3">
                          <ProgressBar value={project.progress} color="accent" size="sm" />
                        </div>

                        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div
                              className="text-[8.5px] font-bold uppercase tracking-[0.16em]"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              Expected
                            </div>
                            <div
                              className="mt-0.5 text-[11px] font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {Math.round(project.expectedProgress)}%
                            </div>
                          </div>
                          <div>
                            <div
                              className="text-[8.5px] font-bold uppercase tracking-[0.16em]"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              Delta
                            </div>
                            <div
                              className="mt-0.5 text-[11px] font-bold"
                              style={{
                                color: project.progressDelta >= 0 ? 'var(--color-success)' : 'var(--color-warning)',
                              }}
                            >
                              {project.progressDelta > 0 ? '+' : ''}
                              {Math.round(project.progressDelta)}%
                            </div>
                          </div>
                          <div>
                            <div
                              className="text-[8.5px] font-bold uppercase tracking-[0.16em]"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              Days left
                            </div>
                            <div
                              className="mt-0.5 text-[11px] font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {project.daysRemaining === null ? 'n/a' : `${project.daysRemaining}d`}
                            </div>
                          </div>
                          <div>
                            <div
                              className="text-[8.5px] font-bold uppercase tracking-[0.16em]"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              Focus
                            </div>
                            <div
                              className="mt-0.5 text-[11px] font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {formatMinutes(project.focusMinutes)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2.5 text-[9.5px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          Expected finish:{' '}
                          {project.expectedFinish ? formatReadableDate(project.expectedFinish.slice(0, 10)) : 'n/a'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <FloatingProjectsEmpty
                  title="No projects yet"
                  description="Create your first project to see schedule health and progress"
                  showCtaHint={false}
                />
              )}
            </SectionCard>
          </motion.div>

          {/* Analytics cards row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <WeeklyConsistency data={consistency ?? null} />
            <FocusAnalytics data={focusAnalytics ?? null} />
            <TaskAnalytics data={taskAnalytics ?? null} />
            <HabitAnalytics data={habitAnalytics ?? null} />
          </motion.div>

          {/* Breakdown row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <TimeOfDayAnalysis data={timeOfDay ?? null} />

            <SectionCard
              eyebrow="Score anatomy"
              title="How the final score is built"
              subtitle="Each bar shows how much that area contributes."
              icon={<Layers size={16} strokeWidth={1.75} />}
              iconTone="accent"
            >
              <div className="space-y-3">
                {[
                  { label: 'Tasks', value: taskBreakdown, tone: 'accent' as const },
                  { label: 'Habits', value: habitBreakdown, tone: 'success' as const },
                  { label: 'Focus', value: focusBreakdown, tone: 'info' as const },
                  { label: 'Consistency', value: consistencyBreakdown, tone: 'warning' as const },
                  { label: 'Penalty', value: penaltyBreakdown, tone: 'warning' as const },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.label}
                      </span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                        style={{
                          color:
                            item.tone === 'accent'
                              ? 'var(--color-accent)'
                              : item.tone === 'success'
                                ? 'var(--color-success)'
                                : item.tone === 'info'
                                  ? 'var(--color-info)'
                                  : 'var(--color-warning)',
                          background:
                            item.tone === 'accent'
                              ? 'var(--color-accent-subtle)'
                              : item.tone === 'success'
                                ? 'var(--color-success-subtle)'
                                : item.tone === 'info'
                                  ? 'var(--color-info-subtle)'
                                  : 'var(--color-warning-subtle)',
                        }}
                      >
                        {item.value > 0 ? '+' : ''}
                        {item.value}
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full border"
                      style={{ background: 'var(--color-border-subtle)', borderColor: 'var(--color-border-subtle)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: item.value > 0 ? `${Math.max(Math.min((item.value / 30) * 100, 100), 6)}%` : '0%',
                          background:
                            item.tone === 'accent'
                              ? 'var(--color-accent)'
                              : item.tone === 'success'
                                ? 'var(--color-success)'
                                : item.tone === 'info'
                                  ? 'var(--color-info)'
                                  : 'var(--color-warning)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-5 rounded-xl p-4 text-center"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-raised))' }}
              >
                <div
                  className="text-[9px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Final Score
                </div>
                <div className="mt-1 text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                  {currentScore}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Trend line"
              title="Weekly trends"
              subtitle={`Last ${weeklyData.length} week${weeklyData.length === 1 ? '' : 's'} of velocity.`}
              icon={<TrendingUp size={16} strokeWidth={1.75} />}
              iconTone="success"
            >
              <div className="h-[200px] w-full">
                {weeklyData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={24}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-raised)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 12,
                          boxShadow: 'var(--shadow-md)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Tasks"
                        stroke="var(--color-accent)"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Focus"
                        stroke="var(--color-info)"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Habits"
                        stroke="var(--color-success)"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : weeklyData.length === 1 ? (
                  <div
                    className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-5 text-center"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <MiniStat label="Tasks" value={`${weeklyData[0].Tasks}`} />
                      <MiniStat label="Focus" value={formatMinutes(weeklyData[0].Focus)} tone="info" />
                      <MiniStat label="Habits" value={`${weeklyData[0].Habits}`} tone="success" />
                    </div>
                    <p
                      className="max-w-[220px] text-[11px] font-medium leading-relaxed"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      This trend line fills in once there's more than one week of history to compare.
                    </p>
                  </div>
                ) : (
                  <FloatingAnalyticsEmpty
                    message="No weekly history yet"
                    subMessage="Once you have more activity in this date range, the weekly trend line will appear here."
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Distribution"
              title="Project status mix"
              subtitle="Current project state at a glance."
              icon={<Folder size={16} strokeWidth={1.75} />}
              iconTone="default"
            >
              {pieData.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="relative h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={62}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--color-surface-raised)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 12,
                            boxShadow: 'var(--shadow-md)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {dominantStatusPercent}%
                      </span>
                      <span
                        className="text-[7.5px] font-bold uppercase tracking-[0.16em]"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {dominantStatus?.name ?? 'n/a'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                            {entry.name}
                          </span>
                        </div>
                        <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <FloatingProjectsEmpty
                  title="No projects yet"
                  description="Create a project to see its distribution here"
                  showCtaHint={false}
                />
              )}
            </SectionCard>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </RootWrapper>
  );
}

export default AnalyticsPage;
