import { useMemo, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckSquare,
  FolderKanban,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { LoadingScreen } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useEnhancedDashboard } from '../features/dashboard/hooks/useDashboard';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { useHabits } from '../features/habits/hooks/useHabits';
import { useAuthStore } from '../store/authStore';
import { DashboardScore } from '../components/dashboard/DashboardScore';
import { WeeklyProgressChart } from '../components/dashboard/WeeklyProgressChart';
import { PriorityTasksWidget } from '../components/dashboard/PriorityTasksWidget';
import { ProjectsWidget } from '../components/dashboard/ProjectsWidget';
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines';
import { FocusWidget } from '../components/dashboard/FocusWidget';
import { HabitsWidget } from '../components/dashboard/HabitsWidget';
import { ProductivityInsights } from '../components/dashboard/ProductivityInsights';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { QuickActionsPanel } from '../components/dashboard/QuickActionsPanel';

/**
 * StatTile
 * ---------------------------------------------------------------------
 * Previously: icon sat inline, to the right of the label, inside a
 * `justify-between` row. At real column widths (2-4 tiles per row on a
 * laptop-width screen) the uppercase, wide-tracking label had nowhere
 * to go and wrapped mid-word, colliding with the icon.
 *
 * Fix: icon moves to its own row, above the text. Nothing shares
 * horizontal space with the label anymore, so there is no width at
 * which this can overlap — it just reduces to a single column on
 * mobile automatically.
 */
function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: 'accent' | 'success' | 'info' | 'warning';
}) {
  const toneMap = {
    accent: { bg: 'var(--icon-bg-accent)', text: 'var(--icon-text-accent)' },
    success: { bg: 'var(--icon-bg-success)', text: 'var(--icon-text-success)' },
    info: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' },
    warning: { bg: 'var(--icon-bg-warning)', text: 'var(--icon-text-warning)' },
  };
  const colors = toneMap[tone];

  return (
    <div
      className="group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        style={{ background: colors.bg, color: colors.text }}
      >
        <Icon size={16} />
      </div>

      <p className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted leading-tight">
        {label}
      </p>
      <p className="mt-1 text-[26px] sm:text-3xl font-black text-text-primary leading-none tabular-nums">
        {value}
      </p>
      {detail && <p className="mt-1.5 text-xs text-text-secondary leading-snug">{detail}</p>}
    </div>
  );
}

function RightRailProfileCard({
  name,
  productivityScore,
  tasksCompleted,
  tasksTotal,
  focusMinutes,
  currentHabitStreak,
}: {
  name: string;
  productivityScore: number;
  tasksCompleted: number;
  tasksTotal: number;
  focusMinutes: number;
  currentHabitStreak: number;
}) {
  const user = useAuthStore((s) => s.user);
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const completion = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-95 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface-raised)) 0%, var(--color-surface-raised) 100%)',
        }}
      />
      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-lg overflow-hidden"
                style={{ background: 'var(--gradient-accent)' }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div
                className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full border-2"
                style={{
                  background: 'var(--color-success)',
                  borderColor: 'var(--color-surface-raised)',
                }}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                Profile
              </p>
              <h2 className="mt-1 text-lg font-black text-text-primary truncate">{name}</h2>
              <p className="text-xs text-text-secondary truncate">
                {user?.email ?? 'Workspace member'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              Live
            </div>
            <p className="mt-1 text-3xl font-black text-text-primary leading-none">
              {productivityScore}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
              Score
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl border p-3.5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tasks</p>
            <p className="mt-1 text-xl font-black text-text-primary">
              {tasksCompleted}/{tasksTotal}
            </p>
            <p className="text-xs text-text-secondary">{completion}% complete</p>
          </div>
          <div
            className="rounded-2xl border p-3.5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Focus</p>
            <p className="mt-1 text-xl font-black text-text-primary">{focusMinutes}m</p>
            <p className="text-xs text-text-secondary">{currentHabitStreak} day streak</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * PremiumHero
 * ---------------------------------------------------------------------
 * The right-hand "Today" panel previously repeated task completion,
 * habits, and focus in three separate nested boxes (once again inside
 * the same card that already shows them below in the stat grid). That
 * repetition — not the layout math — was the main source of visual
 * noise. It's now a single focused panel: date, the one number that
 * actually changes minute to minute (pending tasks), and streak.
 */
function PremiumHero({
  name,
  today,
  productivityScore,
  tasksCompleted,
  tasksTotal,
  habitsCompleted,
  habitsTotal,
  focusMinutes,
}: {
  name: string;
  today: string;
  productivityScore: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  focusMinutes: number;
}) {
  const navigate = useNavigate();
  const completion = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const habitCompletion = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;
  const pendingTasks = Math.max(0, tasksTotal - tasksCompleted);

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at top right, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 45%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface-raised) 95%, transparent) 0%, var(--color-surface) 100%)',
        }}
      />
      <div
        className="absolute -top-16 right-8 h-40 w-40 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-accent), transparent 68%)' }}
      />

      <div className="relative grid gap-8 p-6 sm:p-10 xl:grid-cols-[1.4fr_0.9fr] xl:gap-10">
        {/* Left: greeting + primary actions + the ONE stat grid */}
        <div className="min-w-0">
          <h1 className="max-w-2xl text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-text-primary leading-[1.08]">
            Welcome back, {name}
          </h1>
          <p className="mt-4 max-w-xl text-sm sm:text-base leading-7 text-text-secondary">
            Your workspace is organized for today. Review what matters, jump into focus,
            and keep the week moving.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/focus')}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--gradient-accent)' }}
            >
              Start focus
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition-colors"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              Open projects
              <FolderKanban size={16} />
            </button>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile
              label="Task completion"
              value={`${completion}%`}
              detail={`${tasksCompleted} of ${tasksTotal} tasks`}
              icon={CheckSquare}
              tone="accent"
            />
            <StatTile
              label="Focus time"
              value={`${focusMinutes}m`}
              detail="deep work today"
              icon={Timer}
              tone="info"
            />
            <StatTile
              label="Habits"
              value={`${habitCompletion}%`}
              detail={`${habitsCompleted} of ${habitsTotal}`}
              icon={Target}
              tone="success"
            />
            <StatTile
              label="Productivity"
              value={productivityScore}
              detail="overall score"
              icon={TrendingUp}
              tone="warning"
            />
          </div>
        </div>

        {/* Right: a single quiet "today" panel, not a repeat of the stats above */}
        <div className="min-w-0">
          <div
            className="rounded-[28px] border p-6 sm:p-8 h-full flex flex-col"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                  Today
                </p>
                <p className="mt-1 text-xl font-black text-text-primary">{today}</p>
              </div>
              <div
                className="rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                Priority board
              </div>
            </div>

            <div className="mt-8 flex-1 flex flex-col justify-center gap-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                  Pending tasks
                </p>
                <p className="mt-2 text-5xl font-black text-text-primary leading-none">
                  {pendingTasks}
                </p>
                <p className="mt-1.5 text-xs text-text-secondary">ready for action today</p>
              </div>

              <div className="h-px w-full" style={{ background: 'var(--color-border)' }} />

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                  Habit streak
                </p>
                <p className="mt-2 text-5xl font-black text-text-primary leading-none">
                  {habitCompletion}%
                </p>
                <p className="mt-1.5 text-xs text-text-secondary">of today&apos;s habits done</p>
              </div>
            </div>

            <div
              className="mt-8 pt-6 flex items-center justify-between border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                  Focus logged
                </p>
                <p className="mt-1 text-2xl font-black text-text-primary">{focusMinutes}m</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                  Momentum
                </p>
                <p className="mt-1 text-2xl font-black text-text-primary">{productivityScore}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useEnhancedDashboard();
  const { data: tasksData } = useTasks();
  const { data: habitsData } = useHabits();
  const user = useAuthStore((s) => s.user);
  const tasks = tasksData?.data ?? [];
  const habits = habitsData?.data ?? [];
  const habitsForWidget = useMemo(
    () =>
      habits.slice(0, 6).map((habit) => ({
        id: habit.id,
        name: habit.title,
        completedToday: habit.completedToday ?? false,
        currentStreak: habit.currentStreak ?? 0,
        weeklyProgress: 70,
      })),
    [habits]
  );

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

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const recentActivities = [
    {
      id: '1',
      type: 'task_completed' as const,
      title: 'Completed dashboard refinement',
      timestamp: new Date(Date.now() - 2 * 60000),
    },
    {
      id: '2',
      type: 'focus_session' as const,
      title: 'Started a deep work session',
      description: 'Forty five minutes of quiet focus',
      timestamp: new Date(Date.now() - 45 * 60000),
      metadata: { duration: 45 },
    },
  ];

  const topProjects = dashboard.activeProjects.slice(0, 3);
  const taskCompletion =
    dashboard.tasksTotal > 0 ? Math.round((dashboard.tasksCompleted / dashboard.tasksTotal) * 100) : 0;
  const habitCompletion =
    dashboard.habitsTotal > 0
      ? Math.round((dashboard.habitsCompletedToday / dashboard.habitsTotal) * 100)
      : 0;

  return (
    <div className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-8 sm:gap-10 lg:gap-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] -z-10 opacity-90"
        style={{
          background:
            'radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 28%), radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--color-info) 10%, transparent), transparent 24%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 80%, transparent) 0%, transparent 100%)',
        }}
      />

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.5fr)_420px] gap-8 sm:gap-10 lg:gap-12">
        <div className="flex flex-col gap-8 sm:gap-10">
          <PremiumHero
            name={user.name ?? user.email.split('@')[0]}
            today={todayLabel}
            productivityScore={dashboard.productivityScore ?? 0}
            tasksCompleted={dashboard.tasksCompleted}
            tasksTotal={dashboard.tasksTotal}
            habitsCompleted={dashboard.habitsCompletedToday}
            habitsTotal={dashboard.habitsTotal}
            focusMinutes={dashboard.focusMinutesTotal}
          />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 sm:gap-10">
            <div className="xl:col-span-8 min-w-0">
              <WeeklyProgressChart data={dashboard.weeklyProgress} />
            </div>
            <div className="xl:col-span-4 min-w-0">
              <DashboardScore
                overallScore={dashboard.productivityScore ?? 0}
                breakdown={{
                  taskCompletion,
                  focus: Math.min(100, Math.floor((dashboard.focusMinutesTotal / 120) * 100)),
                  habits: habitCompletion,
                  planner: 82,
                  consistency:
                    dashboard.currentHabitStreak > 0
                      ? Math.min(100, dashboard.currentHabitStreak * 10)
                      : 0,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10">
            <PriorityTasksWidget tasks={tasks} maxTasks={5} />
            <ProjectsWidget projects={dashboard.activeProjects} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10">
            <FocusWidget
              todayMinutes={dashboard.focusMinutesTotal}
              totalMinutes={dashboard.focusMinutesTotal}
              currentStreak={dashboard.currentHabitStreak}
              bestStreak={dashboard.longestHabitStreak}
              longestSession={90}
              averageSession={45}
            />
            <UpcomingDeadlines deadlines={dashboard.upcomingDeadlines} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10">
            <HabitsWidget
              habits={habitsForWidget}
              totalHabits={dashboard.habitsTotal}
              completedToday={dashboard.habitsCompletedToday}
            />
            <ProductivityInsights />
          </div>
        </div>

        <div className="flex flex-col gap-8 sm:gap-10 2xl:sticky 2xl:top-8 self-start">
          <RightRailProfileCard
            name={user.name ?? user.email.split('@')[0]}
            productivityScore={dashboard.productivityScore ?? 0}
            tasksCompleted={dashboard.tasksCompleted}
            tasksTotal={dashboard.tasksTotal}
            focusMinutes={dashboard.focusMinutesTotal}
            currentHabitStreak={dashboard.currentHabitStreak}
          />

          <Card variant="elevated" className="overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                    Current projects
                  </p>
                  <h3 className="mt-1 text-lg font-black text-text-primary">Active work</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover transition-colors"
                >
                  View all
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {topProjects.map((project) => {
                  const progress = Math.max(0, Math.min(100, project.progress));
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-text-primary truncate">
                            {project.name}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                            {project.description ?? 'No project description yet.'}
                          </p>
                        </div>
                        <Badge variant="accent" size="sm">
                          {progress}%
                        </Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progress}%`, background: project.color || 'var(--gradient-accent)' }}
                        />
                      </div>
                    </button>
                  );
                })}
                {topProjects.length === 0 && (
                  <p className="text-sm text-text-muted">No active projects yet.</p>
                )}
              </div>
            </div>
          </Card>

          <QuickActionsPanel />

          <ActivityFeed activities={recentActivities} maxItems={4} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;