import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import {
  ArrowRight,
  CheckSquare,
  FolderKanban,
  Target,
  Timer,
  TrendingUp,
  Plus,
  Play,
  Briefcase,
  ChevronDown,
  Sparkles,
  MapPin,
  ChevronRight,
  Flame,
  FileText,
  Settings,
  MoreVertical,
  Activity,
  Heart,
  Coffee,
  BookOpen,
  Search,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { LoadingScreen } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import apiClient from '../lib/apiClient';
import { useEnhancedDashboard, useActivityFeed } from '../features/dashboard/hooks/useDashboard';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { useHabits } from '../features/habits/hooks/useHabits';
import { useAuthStore } from '../store/authStore';
import { DashboardScore } from '../components/dashboard/DashboardScore';
import { WeeklyProgressChart } from '../components/dashboard/WeeklyProgressChart';
import { WeatherWidget } from '../components/habits/WeatherWidget';
import { PriorityTasksWidget } from '../components/dashboard/PriorityTasksWidget';
import type { FocusSessionDTO, ListResponse } from '../types';

function toUtcDateKey(value: string | Date): string {
  return new Date(value).toISOString().split('T')[0];
}

// Simple, honest XP-progress stand-in: every 500 points is a "level bar"
// filling up. There's no real next-level-threshold field on the
// gamification payload yet — swap this for a real field (e.g.
// dashboard.gamification.pointsToNextLevel) once the backend exposes one.
const XP_PER_LEVEL_BAR = 500;

/**
 * Container-query based responsive grids — see prior notes: Tailwind's
 * md:/lg: prefixes respond to the browser viewport, not to the actual
 * rendered width of an element's own box. This page has a two-column
 * region (main content + sidebar) for its top rows, so grids inside that
 * region need to reflow based on the *column's* width, not the viewport,
 * or they crush/truncate as soon as the sidebar appears. `@container`
 * queries fix that at the root instead of guessing viewport breakpoints.
 */
const DASHBOARD_RESPONSIVE_CSS = `
  .dash-cq { container-type: inline-size; container-name: dash; }

  /* Stat cards: 2-up on phones, 4-up once there's room */
  .cq-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.1rem;
  }
  @container dash (min-width: 560px) {
    .cq-stats { grid-template-columns: repeat(4, 1fr); }
  }

  /* Stats + weather: stacked (weather full-width below) until the
     container is wide enough for weather to sit beside the stats in the
     same row, matching the reference desktop layout. */
  .cq-top-row {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  @container dash (min-width: 980px) {
    .cq-top-row { display: grid; grid-template-columns: 1fr 320px; align-items: stretch; gap: 1.25rem; }
  }

  .cq-2col {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  @container dash (min-width: 640px) {
    .cq-2col { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
  }

  .cq-12 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  @container dash (min-width: 760px) {
    .cq-12 { grid-template-columns: repeat(12, 1fr); }
  }
  .cq-span-4, .cq-span-6, .cq-span-7, .cq-span-8 { grid-column: span 1; }
  @container dash (min-width: 760px) {
    .cq-span-4 { grid-column: span 4; }
    .cq-span-6 { grid-column: span 6; }
    .cq-span-7 { grid-column: span 7; }
    .cq-span-8 { grid-column: span 8; }
  }

  /* Sidebar: full-width 2-up grid when it's rendered below the main
     content (below 2xl); collapses to a single stacked column once it
     becomes the actual ~320px sidebar at 2xl+. */
  .cq-aside { container-type: inline-size; container-name: aside; }
  .cq-aside-grid {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  @container aside (min-width: 560px) {
    .cq-aside-grid { display: grid; grid-template-columns: repeat(2, 1fr); align-items: start; }
  }

  .cq-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }
`;

function BadgeChip({
  icon, label, tier, color,
}: { icon: React.ReactNode; label: string; tier: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-xl border"
      style={{ background: `color-mix(in srgb, ${color} 8%, var(--color-surface))`, borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-text-primary truncate">{label}</p>
        <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{tier}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useEnhancedDashboard();
  const { data: activityFeed, isLoading: isActivityFeedLoading } = useActivityFeed(1, 10);
  const { data: tasksData } = useTasks();
  const { data: habitsData } = useHabits();
  const { data: focusSessionsData } = useQuery({
    queryKey: ['focus', 'dashboard'],
    queryFn: () => apiClient.get<ListResponse<FocusSessionDTO>>('/focus').then((r) => r.data),
  });
  const user = useAuthStore((s) => s.user);

  const tasks = tasksData?.pages.flatMap((p) => p.data) ?? [];
  const habits = habitsData?.data ?? [];
  const focusSessions = focusSessionsData?.data ?? [];

  const focusMinutesTotal = dashboard?.focusMinutesTotal ?? 0;
  const taskTotals = dashboard?.tasksTotal ?? 0;
  const taskCompletedTotal = dashboard?.tasksCompleted ?? 0;
  const habitTotal = dashboard?.habitsTotal ?? 0;
  const habitCompletedToday = dashboard?.habitsCompletedToday ?? 0;
  const currentHabitStreak = dashboard?.currentHabitStreak ?? 0;
  const longestHabitStreak = dashboard?.longestHabitStreak ?? 0;
  const weeklyProgress = dashboard?.weeklyProgress ?? [];
  const upcomingDeadlines = dashboard?.upcomingDeadlines ?? [];
  const projectStats = dashboard?.projectStats ?? {
    totalProjects: 0,
    activeProjectsCount: 0,
    completedProjectsCount: 0,
  };

  const completedFocusSessions = useMemo(
    () => focusSessions.filter((session) => session.completed && !session.isBreak),
    [focusSessions]
  );

  const todayFocusMinutes = useMemo(() => {
    const todayKey = toUtcDateKey(new Date());
    return completedFocusSessions
      .filter((session) => toUtcDateKey(session.startedAt) === todayKey)
      .reduce((sum, session) => sum + session.durationMin, 0);
  }, [completedFocusSessions]);

  const topProjects = dashboard?.activeProjects.slice(0, 3) ?? [];
  const taskCompletion = taskTotals > 0 ? Math.round((taskCompletedTotal / taskTotals) * 100) : 0;
  const habitCompletion = habitTotal > 0 ? Math.round((habitCompletedToday / habitTotal) * 100) : 0;
  const plannerScore = projectStats.totalProjects > 0 ? Math.round((projectStats.completedProjectsCount / projectStats.totalProjects) * 100) : 0;

  // Static Sparkline Data for mock styling/depth
  const sparklineTasks = [30, 45, 35, 60, 50, 70, 66];
  const sparklineFocus = [45, 60, 90, 80, 110, 120, 135];
  const sparklineScore = [55, 62, 58, 67, 72, 70, 72];

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!dashboard || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted">Unable to load dashboard</p>
      </div>
    );
  }

  const displayName = user.name ?? user.email.split('@')[0];
  const avatarInitial = (user.name ?? user.email)[0]?.toUpperCase() ?? '?';
  const xpInCurrentBar = dashboard.gamification.totalPoints % XP_PER_LEVEL_BAR;
  const xpBarPct = Math.round((xpInCurrentBar / XP_PER_LEVEL_BAR) * 100);
  const hasBadges = dashboard.gamification.totalPoints > 0;

  // Decorative weekly consistency dots for the Habit Streak card — filled
  // for each day of the current streak (capped at 5 slots), matching the
  // reference's small dot row under the streak number.
  const streakDots = Array.from({ length: 5 }, (_, i) => i < Math.min(currentHabitStreak, 5));

  const recentActivity = [
    { icon: <CheckSquare size={14} />, color: 'var(--color-success)', label: 'Task completed', title: 'Testing of PMS software', time: '2m ago' },
    { icon: <Timer size={14} />, color: 'var(--color-info)', label: 'Focus session', title: 'Deep Work - 90m', time: '45m ago' },
    { icon: <Target size={14} />, color: 'var(--color-warning)', label: 'Habit completed', title: 'Read 30 min', time: '2h ago' },
    { icon: <FileText size={14} />, color: 'var(--color-accent)', label: 'Note created', title: 'Project Ideas', time: '3h ago' },
  ];

  return (
    <div className="relative mx-auto flex w-full max-w-[1600px] 2xl:max-w-[1920px] flex-col gap-6 sm:gap-8 p-4 sm:p-6 lg:p-8 2xl:p-10">
      <style>{DASHBOARD_RESPONSIVE_CSS}</style>

      {/* Background gradients */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 28%), radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--color-info) 8%, transparent), transparent 24%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 50%, transparent) 0%, transparent 100%)',
        }}
      />

      {/* Header: greeting + search + notifications + avatar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 select-none min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
            Good morning, {displayName} 👋
          </h1>
          <p className="text-sm font-medium text-text-muted">Let's make today productive</p>
        </div>
        </div>

      {/* Main content (left) + sidebar (right) — this split only covers
          the top three rows (stats/weather, plan/insights, priority
          tasks/projects), matching the reference: Weekly Progress and
          Productivity Breakdown further down run the full page width
          with no sidebar beside them. */}
      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
        <div className="dash-cq flex flex-col gap-6 sm:gap-8 min-w-0">
          {/* Stats + Weather */}
          <div className="cq-top-row">
            <div className="cq-stats items-stretch">
              {/* Tasks Today */}
              <div
                className="rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[150px]"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-accent shrink-0" style={{ background: 'var(--icon-bg-accent)' }}>
                    <CheckSquare size={16} />
                  </span>
                  <span className="text-xs font-bold text-text-secondary">Tasks Today</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-text-primary leading-none">
                    {taskCompletedTotal} <span className="text-base sm:text-lg font-bold text-text-muted">/ {taskTotals}</span>
                  </span>
                  <p className="text-xs text-text-muted mt-1">{taskCompletion}% completed</p>
                </div>
                <div className="flex items-center h-6">
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
                    <div className="h-full bg-accent transition-all duration-500" style={{ width: `${taskCompletion}%` }} />
                  </div>
                </div>
              </div>

              {/* Focus Time */}
              <div
                className="rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[150px]"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-info shrink-0" style={{ background: 'var(--icon-bg-info)' }}>
                    <Timer size={16} />
                  </span>
                  <span className="text-xs font-bold text-text-secondary">Focus Time</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-text-primary leading-none block truncate">
                    {Math.floor(todayFocusMinutes / 60)}h {todayFocusMinutes % 60}m
                  </span>
                  <p className="text-xs text-success font-bold mt-1">+20m <span className="text-text-muted font-normal">vs yesterday</span></p>
                </div>
                <div className="flex items-center h-6">
                  <svg className="w-full" viewBox="0 0 70 30" preserveAspectRatio="none">
                    <path
                      d={`M ${sparklineFocus.map((val, idx) => `${idx * 10},${30 - (val / 150) * 25}`).join(' L ')}`}
                      fill="none"
                      stroke="var(--color-info)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Productivity Score */}
              <div
                className="rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[150px]"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-success shrink-0" style={{ background: 'var(--icon-bg-success)' }}>
                    <TrendingUp size={16} />
                  </span>
                  <span className="text-xs font-bold text-text-secondary">Productivity Score</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-text-primary leading-none block">
                    {dashboard.productivityScore ?? 72}
                  </span>
                  <p className="text-xs text-success font-bold mt-1">+12% <span className="text-text-muted font-normal">this week</span></p>
                </div>
                <div className="flex items-center h-6">
                  <svg className="w-full" viewBox="0 0 70 30" preserveAspectRatio="none">
                    <path
                      d={`M ${sparklineScore.map((val, idx) => `${idx * 10},${30 - (val / 100) * 25}`).join(' L ')}`}
                      fill="none"
                      stroke="var(--color-success)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Habit Streak */}
              <div
                className="rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[150px]"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-success shrink-0" style={{ background: 'var(--icon-bg-success)' }}>
                    <Target size={16} />
                  </span>
                  <span className="text-xs font-bold text-text-secondary">Habit Streak</span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-text-primary leading-none">{currentHabitStreak}</span>
                  <p className="text-xs text-text-muted mt-1">days in a row</p>
                </div>
                <div className="flex items-center h-6">
                  <div className="flex items-center gap-1.5">
                    {streakDots.map((checked, i) => (
                      <span
                        key={i}
                        className={`w-4 h-4 rounded-full flex items-center justify-center border ${checked ? 'bg-success border-success text-white' : 'border-border bg-surface'}`}
                      >
                        {checked && <span className="text-[8px]">✓</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Weather — sits inline with the stats once there's room, full
                width below them otherwise */}
            <WeatherWidget compact />
          </div>

          {/* Today's Plan / AI Insights */}
          <div className="cq-12">
            <div
              className="cq-span-6 rounded-2xl border p-6 flex flex-col justify-between"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-extrabold text-text-primary">Today's Plan</span>
                  <button
                    onClick={() => navigate('/calendar')}
                    className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
                  >
                    View Calendar
                  </button>
                </div>

                <div className="space-y-5 relative pl-4 border-l border-border">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface" />
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-xs font-black text-text-primary">Deep Work Session</h4>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Focus • 90m</p>
                      </div>
                      <span className="text-xs font-black text-text-secondary">09:00</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-xs font-black text-text-primary">Workout</h4>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Health • 60m</p>
                      </div>
                      <span className="text-xs font-black text-text-secondary">11:00</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-warning border-2 border-surface" />
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-xs font-black text-text-primary">Lunch Break</h4>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Break • 60m</p>
                      </div>
                      <span className="text-xs font-black text-text-secondary">13:00</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-info border-2 border-surface" />
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-xs font-black text-text-primary">Project Review</h4>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Work • 60m</p>
                      </div>
                      <span className="text-xs font-black text-text-secondary">14:00</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-surface" />
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-xs font-black text-text-primary">Reading</h4>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Personal • 45m</p>
                      </div>
                      <span className="text-xs font-black text-text-secondary">16:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="cq-span-6 rounded-2xl border p-6 flex flex-col justify-between"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={16} className="text-accent" />
                    <span className="text-sm font-extrabold text-text-primary">AI Insights</span>
                  </div>
                  <button className="text-xs font-bold text-accent hover:underline">See all</button>
                </div>

                <div className="space-y-3.5">
                  <div
                    className="rounded-xl p-3 flex gap-3 border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface))',
                      borderColor: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
                    }}
                  >
                    <div className="w-6 h-6 rounded bg-success/15 flex items-center justify-center shrink-0">
                      <CheckSquare size={13} className="text-success" />
                    </div>
                    <p className="text-xs font-medium text-text-primary leading-relaxed">
                      You've completed <span className="font-bold">{taskCompletion}%</span> of your tasks today. High momentum!
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-3 flex gap-3 border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
                      borderColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
                    }}
                  >
                    <div className="w-6 h-6 rounded bg-warning/15 flex items-center justify-center shrink-0">
                      <Timer size={13} className="text-warning" />
                    </div>
                    <p className="text-xs font-medium text-text-primary leading-relaxed">
                      Focus limit alert: Start a focus session to hit your daily goal.
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-3 flex gap-3 border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface))',
                      borderColor: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
                    }}
                  >
                    <div className="w-6 h-6 rounded bg-success/15 flex items-center justify-center shrink-0">
                      <TrendingUp size={13} className="text-success" />
                    </div>
                    <p className="text-xs font-medium text-text-primary leading-relaxed">
                      Your deepest focus occurred between <span className="font-bold">9:00 AM - 11:00 AM</span>.
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-3 flex gap-3 border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
                      borderColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
                    }}
                  >
                    <div className="w-6 h-6 rounded bg-warning/15 flex items-center justify-center shrink-0">
                      <MapPin size={13} className="text-warning" />
                    </div>
                    <p className="text-xs font-medium text-text-primary leading-relaxed">
                      You have 2 upcoming deadlines in the next 24 hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-raised))',
                    borderColor: 'var(--color-accent-border)',
                    color: 'var(--color-accent)',
                  }}
                >
                  ⚡ Powered by AI
                </span>
              </div>
            </div>
          </div>

          {/* Priority Tasks / Projects Overview */}
          <div className="cq-2col">
            <PriorityTasksWidget tasks={tasks} maxTasks={3} />

            <div
              className="rounded-2xl border p-6 flex flex-col justify-between"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-extrabold text-text-primary">Projects Overview</span>
                  <button
                    onClick={() => navigate('/projects')}
                    className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
                  >
                    View all <ChevronRight size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  {topProjects.map((project) => {
                    const progress = Math.max(0, Math.min(100, project.progress));
                    const color = project.color || '#6366f1';
                    return (
                      <div
                        key={project.id}
                        className="p-4 rounded-xl border border-border bg-surface hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-2.5"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <h4 className="text-xs font-black text-text-primary truncate max-w-[200px]">
                              {project.name}
                            </h4>
                          </div>
                          <span
                            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                              color: 'var(--color-accent)',
                            }}
                          >
                            {project.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-text-primary tabular-nums shrink-0">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {topProjects.length === 0 && (
                    <div className="text-center py-8 text-text-muted">
                      No active projects yet. Get started today!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — Profile, Rewards (with badges), Recent Activity.
            2-up grid when it's rendered full-width (below 2xl), single
            stacked column once it becomes the actual narrow sidebar at
            2xl+. */}
        <aside className="cq-aside min-w-0">
          <div className="cq-aside-grid">
            {/* Profile card */}
            <div
              className="rounded-2xl border p-5 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                  style={{ background: 'var(--gradient-accent)' }}
                >
                  {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Profile</p>
                  <h4 className="text-sm font-black text-text-primary truncate">{displayName}</h4>
                  <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live
                </span>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Score</p>
                  <p className="text-sm font-black text-text-primary leading-tight">{dashboard.productivityScore ?? 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Tasks</p>
                  <p className="text-sm font-black text-text-primary mt-0.5">{taskCompletedTotal}/{taskTotals}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Focus</p>
                  <p className="text-sm font-black text-text-primary mt-0.5">
                    {Math.floor(todayFocusMinutes / 60)}h {todayFocusMinutes % 60}m
                  </p>
                </div>
              </div>
            </div>

            {/* Rewards / XP + badges card */}
            <div
              className="rounded-2xl border p-5 flex flex-col gap-3"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-text-primary">Rewards</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-accent">
                  <Sparkles size={12} /> {dashboard.gamification.totalPoints} XP
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary">Level {dashboard.gamification.level}</span>
                <span className="text-[10px] text-text-muted font-semibold">
                  {xpInCurrentBar}/{XP_PER_LEVEL_BAR}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${xpBarPct}%`, background: 'var(--gradient-accent)' }} />
              </div>

              {hasBadges ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <BadgeChip icon={<Flame size={15} />} label="Habit Spark" tier="Bronze" color="var(--color-warning)" />
                  <BadgeChip icon={<CheckCircle2 size={15} />} label="Start Win" tier="Bronze" color="var(--color-accent)" />
                </div>
              ) : (
                <div className="mt-1 rounded-xl border border-dashed p-3 text-center" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-[11px] font-semibold text-text-secondary">No badges yet</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Complete a task, habit, or focus session to unlock your first one.</p>
                </div>
              )}
            </div>

            {/* Recent Activity — vertical list */}
            <div
              className="rounded-2xl border p-5 flex flex-col gap-4 col-span-2"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-accent" />
                  <span className="text-sm font-extrabold text-text-primary">Recent Activity</span>
                </div>
                <button className="text-xs font-bold text-accent hover:underline">View all</button>
              </div>
              <div className="flex flex-col gap-3.5">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)`, color: item.color }}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{item.label}</p>
                      <p className="text-xs font-bold text-text-primary truncate mt-0.5">{item.title}</p>
                    </div>
                    <span className="text-[10px] text-text-muted font-bold whitespace-nowrap shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Quick Actions — inline row, always available regardless of where
          the sidebar currently sits */}
      <div className="cq-actions">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-raised))', borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)', color: 'var(--color-accent)' }}
        >
          <CheckSquare size={15} /> <span className="hidden xs:inline">New Task</span><span className="xs:hidden">Task</span>
        </button>
        <button
          onClick={() => navigate('/focus')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{ background: 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface-raised))', borderColor: 'color-mix(in srgb, var(--color-success) 20%, transparent)', color: 'var(--color-success)' }}
        >
          <Timer size={15} /> <span className="hidden xs:inline">Start Focus</span><span className="xs:hidden">Focus</span>
        </button>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{ background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface-raised))', borderColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)', color: 'var(--color-warning)' }}
        >
          <FolderKanban size={15} /> <span className="hidden xs:inline">New Project</span><span className="xs:hidden">Project</span>
        </button>
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{ background: 'color-mix(in srgb, var(--color-info) 8%, var(--color-surface-raised))', borderColor: 'color-mix(in srgb, var(--color-info) 20%, transparent)', color: 'var(--color-info)' }}
        >
          <FileText size={15} /> <span className="hidden xs:inline">New Note</span><span className="xs:hidden">Note</span>
        </button>
      </div>

      {/* Weekly Progress / Productivity Breakdown — full width, no
          sidebar constraint down here, matching the reference. */}
      <div className="dash-cq cq-12">
        <div className="cq-span-8 min-w-0">
          <WeeklyProgressChart data={weeklyProgress} />
        </div>
        <div className="cq-span-4 min-w-0">
          <DashboardScore
            overallScore={dashboard.productivityScore ?? 72}
            breakdown={{
              taskCompletion,
              focus: Math.min(100, Math.floor((focusMinutesTotal / 120) * 100)),
              habits: habitCompletion,
              planner: plannerScore,
              consistency: currentHabitStreak > 0 ? Math.min(100, currentHabitStreak * 10) : 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;