import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePageVariants } from '../lib/motionVariants';
// Analytics (with recharts) is deferred until the user toggles to it — it only
// loads on demand instead of inflating the Dashboard's initial chunk.
const AnalyticsPage = lazy(() =>
  import('./AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
import {
  CheckSquare,
  FolderKanban,
  Timer,
  TrendingUp,
  Sparkles,
  MapPin,
  ChevronRight,
  Flame,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { LoadingScreen } from '../components/ui/Spinner';
import apiClient from '../lib/apiClient';
import { useEnhancedDashboard, useActivityFeed } from '../features/dashboard/hooks/useDashboard';
import { useTasks, useUpdateTask } from '../features/tasks/hooks/useTasks';
import { useHabits } from '../features/habits/hooks/useHabits';
import { useAuthStore } from '../store/authStore';
import { DashboardScore } from '../components/dashboard/DashboardScore';
import { WeeklyProgressChart } from '../components/dashboard/WeeklyProgressChart';
import { WeatherWidget } from '../components/habits/WeatherWidget';
import { PriorityTasksWidget } from '../components/dashboard/PriorityTasksWidget';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { FloatingCalendarEmpty } from '../components/ui/FloatingCalendarEmpty';
import { FloatingProjectsEmpty } from '../components/ui/FloatingProjectsEmpty';
import { Avatar } from '../components/ui/Avatar';
import { AchievementsPanel } from '../components/habits/AchievementsPanel';
import { DailyBrief } from '../components/dashboard/DailyBrief.tsx';
import { useAIInsights } from '../features/ai/hooks/useAI';
import type { FocusSessionDTO, ListResponse, TaskStatus } from '../types';

function toUtcDateKey(value: string | Date): string {
  return new Date(value).toISOString().split('T')[0];
}

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
     becomes the actual ~360px sidebar at 2xl+. */
  .cq-aside { container-type: inline-size; container-name: aside; }
  .cq-aside-grid {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  @container aside (min-width: 700px) {
    .cq-aside-grid { display: grid; grid-template-columns: repeat(2, 1fr); align-items: start; }
  }

  .cq-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }
`;

export function DashboardPage() {
  const { containerVariants, itemVariants } = usePageVariants();
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
  const updateTask = useUpdateTask();
  const { data: aiInsightsData } = useAIInsights();

  // View toggle: dashboard widgets vs analytics
  const [view, setView] = useState<'dashboard' | 'analytics'>('dashboard');
  const reducedMotion = useReducedMotion();
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  // Update the hour every minute to keep the greeting current
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
    () => focusSessions.filter((session) => session.status === 'COMPLETED' && !session.isBreak),
    [focusSessions]
  );

  const todayFocusMinutes = useMemo(() => {
    const todayKey = toUtcDateKey(new Date());
    return completedFocusSessions
      .filter((session) => toUtcDateKey(session.startedAt) === todayKey)
      .reduce((sum, session) => sum + session.durationMin, 0);
  }, [completedFocusSessions]);

  const todayTasks = useMemo(() => {
    if (!tasksData) return [];
    const todayKey = toUtcDateKey(new Date());
    return tasks
      .filter(
        (task) =>
          task.dueDate &&
          toUtcDateKey(task.dueDate) === todayKey &&
          (task.status === 'TODO' || task.status === 'IN_PROGRESS')
      )
      .slice(0, 5);
  }, [tasks, tasksData]);

  const topProjects = dashboard?.activeProjects.slice(0, 3) ?? [];
  const taskCompletion = taskTotals > 0 ? Math.round((taskCompletedTotal / taskTotals) * 100) : 0;
  const habitCompletion = habitTotal > 0 ? Math.round((habitCompletedToday / habitTotal) * 100) : 0;
  const plannerScore =
    projectStats.totalProjects > 0
      ? Math.round((projectStats.completedProjectsCount / projectStats.totalProjects) * 100)
      : 0;

  // Compute real sparkline data from weekly progress
  const sparklineFocus =
    weeklyProgress.length > 0
      ? weeklyProgress.slice(-7).map((w) => Math.max(w.focusMinutes, 5))
      : [45, 60, 90, 80, 110, 120, 135];

  // Score trend uses tasks + habits combined as a proxy
  const sparklineScore =
    weeklyProgress.length > 0
      ? weeklyProgress.slice(-7).map((w) => {
          const taskVal = Math.min(w.tasksCompleted * 12, 50);
          const habitVal = Math.min(w.habitsCompleted * 8, 40);
          return Math.max(taskVal + habitVal + 10, 20);
        })
      : [55, 62, 58, 67, 72, 70, 72];

  // Compute real "vs yesterday" using focus session data
  const yesterdayKey = toUtcDateKey(new Date(Date.now() - 86400000));
  const yesterdayFocusMinutes = completedFocusSessions
    .filter((session) => toUtcDateKey(session.startedAt) === yesterdayKey)
    .reduce((sum, session) => sum + session.durationMin, 0);
  const focusDiff = todayFocusMinutes - yesterdayFocusMinutes;
  const focusDiffStr = focusDiff >= 0 ? `+${focusDiff}m` : `${focusDiff}m`;
  const focusDiffColor = focusDiff >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

  // Compute real "+X% this week" for productivity score
  const thisWeekScore =
    weeklyProgress.length > 0 ? (weeklyProgress[weeklyProgress.length - 1]?.tasksCompleted ?? 0) : 0;
  const lastWeekScore =
    weeklyProgress.length > 1 ? (weeklyProgress[weeklyProgress.length - 2]?.tasksCompleted ?? 0) : 0;
  const scorePctChange =
    lastWeekScore > 0
      ? Math.round(((thisWeekScore - lastWeekScore) / lastWeekScore) * 100)
      : thisWeekScore > 0
        ? 100
        : 0;
  const scoreChangeStr = scorePctChange >= 0 ? `+${scorePctChange}%` : `${scorePctChange}%`;

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

  // Decorative weekly consistency dots for the Habit Streak card — filled
  // for each day of the current streak (capped at 5 slots), matching the
  // reference's small dot row under the streak number.
  const streakDots = Array.from({ length: 5 }, (_, i) => i < Math.min(currentHabitStreak, 5));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative flex w-full flex-col gap-6 sm:gap-8 p-4 sm:p-6 lg:p-8 2xl:p-10"
    >
      <style>{DASHBOARD_RESPONSIVE_CSS}</style>

      {/* Background gradients */}
      <div
        className="pointer-events-none absolute rounded-xl inset-x-0 top-0 h-[28rem] -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 28%), radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--color-info) 8%, transparent), transparent 24%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 50%, transparent) 0%, transparent 100%)',
        }}
      />

      {/* ── Dashboard Header — flat, no card wrapping ────────────────── */}
      <motion.div variants={itemVariants}>
        <DashboardHero
          displayName={displayName}
          currentHour={currentHour}
          view={view}
          setView={setView}
          reducedMotion={!!reducedMotion}
          taskCompletion={taskCompletion}
          habitCompletion={habitCompletion}
          focusMinutesToday={todayFocusMinutes}
          productivityScore={dashboard.productivityScore}
          scorePctChange={scorePctChange}
          currentHabitStreak={currentHabitStreak}
          activeProjects={projectStats.activeProjectsCount}
        />
      </motion.div>

      {/* Animated view switcher — crossfade between dashboard widgets and analytics */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          variants={itemVariants}
          initial={reducedMotion ? undefined : 'hidden'}
          animate={reducedMotion ? undefined : 'visible'}
          exit={reducedMotion ? undefined : 'hidden'}
          className={
            view === 'analytics'
              ? 'w-full'
              : 'grid grid-cols-1 2xl:grid-cols-[67fr_33fr] gap-6 lg:gap-8 items-start'
          }
        >
          {view === 'dashboard' ? (
            <>
              <div className="dash-cq flex flex-col gap-6 sm:gap-8 min-w-0">
                {/* Daily Brief — AI-powered */}
                <div className="mb-2">
                  <DailyBrief />
                </div>

                {/* Stats + Weather */}
                <div className="cq-top-row">
                  <div className="cq-stats items-stretch">
                    {/* ── Tasks Today ── */}
                    <div
                      className="relative rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[158px] overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
                    >
                      {/* Subtle glow blob */}
                      <div
                        className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl"
                        style={{ background: 'var(--color-accent)' }}
                      />
                      {/* Top accent bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                        style={{ background: 'var(--gradient-accent)' }}
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{ background: 'var(--gradient-accent)', color: 'white' }}
                          >
                            <CheckSquare size={16} />
                          </span>
                          <span className="text-xs font-bold text-text-secondary">Tasks Today</span>
                        </div>
                        {/* Ring progress */}
                        <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90 shrink-0">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 14}`}
                            strokeDashoffset={`${2 * Math.PI * 14 * (1 - taskCompletion / 100)}`}
                            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
                          />
                        </svg>
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-text-primary leading-none">
                            {taskCompletedTotal}
                          </span>
                          <span className="text-base font-bold text-text-muted">/ {taskTotals}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 font-medium">{taskCompletion}% completed</p>
                      </div>

                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--color-border-subtle)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${taskCompletion}%`,
                            background: 'var(--gradient-accent)',
                            boxShadow: '0 0 8px color-mix(in srgb, var(--color-accent) 60%, transparent)',
                          }}
                        />
                      </div>
                    </div>

                    {/* ── Focus Time ── */}
                    <div
                      className="relative rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[158px] overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
                    >
                      <div
                        className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-15 blur-2xl"
                        style={{ background: 'var(--color-info)' }}
                      />
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                        style={{ background: 'linear-gradient(90deg, var(--color-info), var(--color-accent))' }}
                      />

                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{
                            background:
                              'linear-gradient(135deg, var(--color-info), color-mix(in srgb, var(--color-info) 70%, var(--color-accent)))',
                            color: 'white',
                          }}
                        >
                          <Timer size={16} />
                        </span>
                        <span className="text-xs font-bold text-text-secondary">Focus Time</span>
                      </div>

                      <div>
                        <span className="text-3xl font-black text-text-primary leading-none block">
                          {Math.floor(todayFocusMinutes / 60)}h {todayFocusMinutes % 60}m
                        </span>
                        <p className="text-xs font-bold mt-1" style={{ color: focusDiffColor }}>
                          {focusDiffStr} <span className="text-text-muted font-normal">vs yesterday</span>
                        </p>
                      </div>

                      {/* Sparkline with gradient fill */}
                      <div className="h-9">
                        <svg className="w-full h-full" viewBox="0 0 70 30" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-info)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="var(--color-info)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                            d={`M ${sparklineFocus.map((val, idx) => `${idx * 10},${30 - (val / 150) * 25}`).join(' L ')} L 60,30 L 0,30 Z`}
                            fill="url(#focusGrad)"
                          />
                          <path
                            d={`M ${sparklineFocus.map((val, idx) => `${idx * 10},${30 - (val / 150) * 25}`).join(' L ')}`}
                            fill="none"
                            stroke="var(--color-info)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Live dot at end */}
                          <circle
                            cx="60"
                            cy={`${30 - (sparklineFocus[6] / 150) * 25}`}
                            r="2.5"
                            fill="var(--color-info)"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* ── Productivity Score ── */}
                    <div
                      className="relative rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[158px] overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
                    >
                      <div
                        className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-15 blur-2xl"
                        style={{ background: 'var(--color-success)' }}
                      />
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                        style={{ background: 'linear-gradient(90deg, var(--color-success), var(--color-info))' }}
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              background:
                                'linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 70%, var(--color-info)))',
                              color: 'white',
                            }}
                          >
                            <TrendingUp size={16} />
                          </span>
                          <span className="text-xs font-bold text-text-secondary">Productivity Score</span>
                        </div>
                        {/* Score badge */}
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{
                            background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                            color: 'var(--color-success)',
                          }}
                        >
                          TOP
                        </span>
                      </div>

                      <div>
                        <span className="text-3xl font-black text-text-primary leading-none block">
                          {dashboard.productivityScore ?? 72}
                        </span>
                        <p
                          className="text-xs font-bold mt-1"
                          style={{ color: scorePctChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                        >
                          {scoreChangeStr} <span className="text-text-muted font-normal">this week</span>
                        </p>
                      </div>

                      <div className="h-9">
                        <svg className="w-full h-full" viewBox="0 0 70 30" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="scoreGrad2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                            d={`M ${sparklineScore.map((val, idx) => `${idx * 10},${30 - (val / 100) * 25}`).join(' L ')} L 60,30 L 0,30 Z`}
                            fill="url(#scoreGrad2)"
                          />
                          <path
                            d={`M ${sparklineScore.map((val, idx) => `${idx * 10},${30 - (val / 100) * 25}`).join(' L ')}`}
                            fill="none"
                            stroke="var(--color-success)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="60"
                            cy={`${30 - (sparklineScore[6] / 100) * 25}`}
                            r="2.5"
                            fill="var(--color-success)"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* ── Habit Streak ── */}
                    <div
                      className="relative rounded-2xl border p-5 flex flex-col gap-3 justify-between min-h-[158px] overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
                    >
                      <div
                        className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl"
                        style={{ background: 'var(--color-warning)' }}
                      />
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                        style={{ background: 'linear-gradient(90deg, var(--color-warning), var(--color-danger))' }}
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              background:
                                'linear-gradient(135deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 70%, var(--color-danger)))',
                              color: 'white',
                            }}
                          >
                            <Flame size={16} />
                          </span>
                          <span className="text-xs font-bold text-text-secondary">Habit Streak</span>
                        </div>
                        {currentHabitStreak > 0 && (
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                              color: 'var(--color-warning)',
                            }}
                          >
                            🔥 ON FIRE
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-text-primary leading-none">
                            {currentHabitStreak}
                          </span>
                          <span className="text-sm font-bold text-text-muted">days</span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 font-medium">in a row</p>
                      </div>

                      {/* Streak dots — filled with flame gradient */}
                      <div className="flex items-center gap-1.5">
                        {streakDots.map((checked, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all duration-300"
                            style={
                              checked
                                ? {
                                    background: 'linear-gradient(135deg, var(--color-warning), var(--color-danger))',
                                    borderColor: 'transparent',
                                    color: 'white',
                                    boxShadow: '0 0 6px color-mix(in srgb, var(--color-warning) 50%, transparent)',
                                  }
                                : {
                                    borderColor: 'var(--color-border)',
                                    background: 'var(--color-surface)',
                                    color: 'transparent',
                                  }
                            }
                          >
                            {checked && '✓'}
                          </span>
                        ))}
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
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-extrabold text-text-primary">Today's Plan</span>
                        <button
                          onClick={() => navigate('/calendar')}
                          className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
                        >
                          View Calendar
                        </button>
                      </div>

                      {todayTasks.length > 0 ? (
                        <div className="flex-1">
                          {/* Progress bar */}
                          <div
                            className="h-1.5 rounded-full overflow-hidden mb-5"
                            style={{ background: 'var(--color-border-subtle)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.round((todayTasks.filter((t) => t.status === 'IN_PROGRESS').length / todayTasks.length) * 100)}%`,
                                background: 'var(--gradient-accent)',
                              }}
                            />
                          </div>

                          <div className="space-y-3">
                            {todayTasks.map((task) => {
                              const priorityColors: Record<string, string> = {
                                CRITICAL: '#ef4444',
                                HIGH: '#f59e0b',
                                MEDIUM: 'var(--color-info)',
                                LOW: '#9ca3af',
                              };
                              const priorityBg: Record<string, string> = {
                                CRITICAL: 'color-mix(in srgb, #ef4444 12%, transparent)',
                                HIGH: 'color-mix(in srgb, #f59e0b 12%, transparent)',
                                MEDIUM: 'color-mix(in srgb, var(--color-info) 12%, transparent)',
                                LOW: 'color-mix(in srgb, #9ca3af 12%, transparent)',
                              };
                              const dotColor = priorityColors[task.priority] ?? 'var(--color-info)';
                              const durStr = task.estimatedDuration ? `${task.estimatedDuration}m` : null;

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => navigate(`/tasks/${task.id}`)}
                                  className="group flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer"
                                  style={{
                                    background: 'var(--color-surface)',
                                    borderColor: 'var(--color-border)',
                                  }}
                                >
                                  {/* Checkbox circle */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateTask.mutate({
                                        id: task.id,
                                        data: { status: 'DONE' as TaskStatus },
                                      });
                                    }}
                                    className="mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all hover:scale-110"
                                    style={{
                                      borderColor: dotColor,
                                      background: task.status === 'IN_PROGRESS' ? dotColor : 'transparent',
                                    }}
                                    aria-label={`Mark ${task.title} as done`}
                                  >
                                    {task.status === 'IN_PROGRESS' && (
                                      <span className="text-white text-[9px] font-black">✓</span>
                                    )}
                                  </button>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-black text-text-primary truncate">{task.title}</h4>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      <span
                                        className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                        style={{
                                          background: priorityBg[task.priority] ?? priorityBg.MEDIUM,
                                          color: dotColor,
                                        }}
                                      >
                                        {task.priority}
                                      </span>
                                      {durStr && <span className="text-[9px] font-bold text-text-muted">{durStr}</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <FloatingCalendarEmpty />
                      )}
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
                          <span className="text-sm font-extrabold text-text-primary">Smart Insights</span>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        {(aiInsightsData?.insights && aiInsightsData.insights.length > 0
                          ? aiInsightsData.insights
                          : dashboard.insights || []
                        ).length > 0 ? (
                          (aiInsightsData?.insights && aiInsightsData.insights.length > 0
                            ? aiInsightsData.insights
                            : dashboard.insights || []
                          ).map((insight) => {
                            const iconMap: Record<string, React.ReactNode> = {
                              trend: <TrendingUp size={13} />,
                              clock: <Timer size={13} />,
                              calendar: <CheckSquare size={13} />,
                              alert: <MapPin size={13} />,
                            };
                            const isPositive = insight.type === 'positive';
                            const isWarning = insight.type === 'warning';
                            const bgColor = isPositive
                              ? 'var(--color-success)'
                              : isWarning
                                ? 'var(--color-warning)'
                                : 'var(--color-info)';
                            return (
                              <div
                                key={insight.id}
                                className="rounded-xl p-3 flex gap-3 border"
                                style={{
                                  background: `color-mix(in srgb, ${bgColor} 8%, var(--color-surface))`,
                                  borderColor: `color-mix(in srgb, ${bgColor} 20%, transparent)`,
                                }}
                              >
                                <div
                                  className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                                  style={{
                                    background: `color-mix(in srgb, ${bgColor} 15%, transparent)`,
                                    color: bgColor,
                                  }}
                                >
                                  {iconMap[insight.icon] ?? <Sparkles size={13} />}
                                </div>
                                <p className="text-xs font-medium text-text-primary leading-relaxed">{insight.text}</p>
                              </div>
                            );
                          })
                        ) : (
                          <div
                            className="rounded-xl p-4 text-center border border-dashed"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <p className="text-xs font-semibold text-text-secondary">
                              No insights yet. Keep using tasks, habits, and focus sessions to unlock personalized
                              patterns.
                            </p>
                          </div>
                        )}
                      </div>
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
                                <div
                                  className="flex-1 h-2 rounded-full overflow-hidden"
                                  style={{ background: 'var(--color-border)' }}
                                >
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

                        {topProjects.length === 0 && <FloatingProjectsEmpty />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar — Profile, Rewards (with badges), Recent Activity.
            2-up grid when it's rendered full-width (below 2xl), single
            stacked column once it becomes the actual narrow sidebar at
            2xl+. */}
              <aside className="cq-aside min-w-0 h-full">
                <div className="cq-aside-grid h-full">
                  {/* Profile card — redesigned */}
                  <div
                    className="rounded-2xl border overflow-hidden flex flex-col"
                    style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
                  >
                    {/* Thin accent bar at top */}
                    <div
                      className="h-[3px] w-full shrink-0"
                      style={{ background: 'var(--gradient-accent)' }}
                    />

                    <div className="p-5 flex flex-col gap-4">
                      {/* Top row — avatar + name + live badge */}
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar
                            src={user.avatarUrl}
                            name={user.name}
                            email={user.email}
                            size="lg"
                            showBorder
                            onClick={() => navigate('/profile')}
                            className="cursor-pointer"
                          />
                          {/* Live dot on avatar */}
                          <span
                            className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2"
                            style={{
                              background: 'var(--color-success)',
                              borderColor: 'var(--color-surface-raised)',
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-text-primary truncate leading-snug">
                            {displayName}
                          </h4>
                          <p className="text-[10px] text-text-muted truncate">{user.email}</p>
                        </div>
                        {/* Score badge */}
                        <div
                          className="shrink-0 flex flex-col items-center px-3 py-2 rounded-xl"
                          style={{
                            background: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))',
                            border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
                          }}
                        >
                          <span
                            className="text-lg font-black leading-none"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {dashboard.productivityScore ?? 0}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted mt-0.5">
                            Score
                          </span>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div
                        className="grid grid-cols-3 rounded-xl overflow-hidden border"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {[
                          { label: 'Tasks', value: `${taskCompletedTotal}/${taskTotals}`, color: 'var(--color-accent)' },
                          {
                            label: 'Focus',
                            value: `${Math.floor(todayFocusMinutes / 60)}h ${todayFocusMinutes % 60}m`,
                            color: 'var(--color-info)',
                          },
                          { label: 'Streak', value: `${currentHabitStreak}d`, color: 'var(--color-warning)' },
                        ].map((stat, i) => (
                          <div
                            key={stat.label}
                            className="flex flex-col items-center gap-0.5 py-3"
                            style={{
                              background: 'var(--color-surface)',
                              borderRight: i < 2 ? '1px solid var(--color-border)' : undefined,
                            }}
                          >
                            <span className="text-sm font-black" style={{ color: stat.color }}>
                              {stat.value}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted">
                              {stat.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* View Profile button */}
                      <button
                        onClick={() => navigate('/profile')}
                        className="w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{
                          background: 'var(--gradient-accent)',
                          color: 'white',
                          boxShadow: '0 2px 12px color-mix(in srgb, var(--color-accent) 30%, transparent)',
                        }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>

                  {/* Achievements — same panel used in Habits page */}
                  <AchievementsPanel />

                  {/* Recent Activity — real data from backend */}
                  <div className="col-span-2">
                    <ActivityFeed
                      activities={activityFeed?.data ?? []}
                      isLoading={isActivityFeedLoading}
                      maxItems={5}
                    />
                  </div>

                  {/* Productivity Score breakdown — full width in the sidebar */}
                  <div className="col-span-2">
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
              </aside>
            </>
          ) : (
            <Suspense fallback={null}>
              <AnalyticsPage embedded={true} />
            </Suspense>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quick Actions — inline row, always available regardless of where
          the sidebar currently sits */}
      <motion.div variants={itemVariants} className="cq-actions">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-raised))',
            borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          <CheckSquare size={15} /> <span className="hidden xs:inline">New Task</span>
          <span className="xs:hidden">Task</span>
        </button>
        <button
          onClick={() => navigate('/focus')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface-raised))',
            borderColor: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
            color: 'var(--color-success)',
          }}
        >
          <Timer size={15} /> <span className="hidden xs:inline">Start Focus</span>
          <span className="xs:hidden">Focus</span>
        </button>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface-raised))',
            borderColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
            color: 'var(--color-warning)',
          }}
        >
          <FolderKanban size={15} /> <span className="hidden xs:inline">New Project</span>
          <span className="xs:hidden">Project</span>
        </button>
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--color-info) 8%, var(--color-surface-raised))',
            borderColor: 'color-mix(in srgb, var(--color-info) 20%, transparent)',
            color: 'var(--color-info)',
          }}
        >
          <FileText size={15} /> <span className="hidden xs:inline">New Note</span>
          <span className="xs:hidden">Note</span>
        </button>
      </motion.div>

      {/* Weekly Progress — full width */}
      <motion.div variants={itemVariants} className="w-full min-w-0">
        <WeeklyProgressChart data={weeklyProgress} />
      </motion.div>

    </motion.div>
  );
}

// ─── DashboardHero ────────────────────────────────────────────────────────────
// Flat header row — no card border, blends directly into the page bg so the
// DailyBrief card beneath it reads as the first visual "block".

function DashboardHero({
  displayName,
  currentHour,
  view,
  setView,
  reducedMotion,
  taskCompletion,
  habitCompletion,
  focusMinutesToday,
  productivityScore,
  scorePctChange,
  currentHabitStreak,
  activeProjects,
}: {
  displayName: string;
  currentHour: number;
  view: 'dashboard' | 'analytics';
  setView: (v: 'dashboard' | 'analytics') => void;
  reducedMotion: boolean;
  taskCompletion: number;
  habitCompletion: number;
  focusMinutesToday: number;
  productivityScore: number;
  scorePctChange: number;
  currentHabitStreak: number;
  activeProjects: number;
}) {
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const scorePositive = scorePctChange >= 0;

  const focusLabel =
    focusMinutesToday >= 60
      ? `${Math.floor(focusMinutesToday / 60)}h${focusMinutesToday % 60 > 0 ? ` ${focusMinutesToday % 60}m` : ''}`
      : `${focusMinutesToday}m`;

  const stats = [
    { value: `${taskCompletion}%`, label: 'Tasks', color: 'var(--color-accent)' },
    { value: `${currentHabitStreak}d`, label: 'Streak', color: 'var(--color-warning)' },
    { value: focusLabel, label: 'Focus', color: 'var(--color-info)' },
    { value: String(activeProjects), label: 'Projects', color: 'var(--color-success)' },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Top row: greeting + view toggle */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Greeting */}
        <div>
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 mb-2 text-[10px] font-black uppercase tracking-[0.22em]"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <motion.span
              animate={{ rotate: [0, 12, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <Sparkles size={11} />
            </motion.span>
            Command center
          </div>
          <h1
            className="font-black tracking-tight"
            style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.4rem)', lineHeight: 1.1, color: 'var(--color-text-primary)' }}
          >
            {greeting}, <span style={{ color: 'var(--color-accent)' }}>{displayName}.</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Here's your productivity snapshot for today.
          </p>
        </div>

        {/* View toggle — same spring pill */}
        <div
          className="relative inline-flex items-center rounded-full border p-1 shrink-0 mt-1"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <motion.div
            className="absolute top-1 bottom-1 rounded-full"
            initial={false}
            animate={{ left: view === 'dashboard' ? '4px' : '50%' }}
            transition={reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              width: 'calc(50% - 4px)',
              background: 'linear-gradient(135deg, var(--color-accent), #818CF8)',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--color-accent) 28%, transparent)',
            }}
          />
          {(['dashboard', 'analytics'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="relative z-10 px-5 py-2 text-xs font-black rounded-full transition-colors"
              style={{ color: view === v ? 'white' : 'var(--color-text-muted)' }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom row: score badge + stats strip side by side */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Score badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2"
          style={{
            background: scorePositive
              ? 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface))'
              : 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
            borderColor: scorePositive
              ? 'color-mix(in srgb, var(--color-success) 22%, transparent)'
              : 'color-mix(in srgb, var(--color-warning) 22%, transparent)',
          }}
        >
          <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ArrowUpRight
              size={12}
              style={{
                color: scorePositive ? 'var(--color-success)' : 'var(--color-warning)',
                transform: scorePositive ? 'none' : 'rotate(90deg)',
              }}
            />
          </motion.span>
          <span
            className="text-xs font-black"
            style={{ color: scorePositive ? 'var(--color-success)' : 'var(--color-warning)' }}
          >
            {productivityScore} score
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {scorePctChange >= 0 ? `+${scorePctChange}%` : `${scorePctChange}%`} this week
          </span>
        </div>

        {/* Divider-separated stat strip */}
        <div
          className="flex items-center divide-x overflow-hidden rounded-2xl border"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 px-3.5 py-2"
              style={{ background: 'var(--color-surface)' }}
            >
              <motion.span
                className="text-sm font-black leading-none"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                style={{ color: s.color }}
              >
                {s.value}
              </motion.span>
              <span
                className="text-[10px] font-mono uppercase tracking-[0.12em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
