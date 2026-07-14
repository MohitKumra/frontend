import { LoadingScreen } from '../components/ui/Spinner';
import { ProfileHero } from '../components/dashboard/ProfileWidget';
import { AIBriefWidget } from '../components/dashboard/AIBriefWidget';
import { PriorityTasksWidget } from '../components/dashboard/PriorityTasksWidget';
import { FocusWidget } from '../components/dashboard/FocusWidget';
import { HabitsWidget } from '../components/dashboard/HabitsWidget';
import { ProductivityInsights } from '../components/dashboard/ProductivityInsights';
import { DashboardScore } from '../components/dashboard/DashboardScore';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { QuickActionsPanel } from '../components/dashboard/QuickActionsPanel';
import { WeeklyProgressChart } from '../components/dashboard/WeeklyProgressChart';
import { ProjectsWidget } from '../components/dashboard/ProjectsWidget';
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines';
import { useEnhancedDashboard, useDashboardToday } from '../features/dashboard/hooks/useDashboard';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { useHabits } from '../features/habits/hooks/useHabits';
import { useUpdateAvatar, useRemoveAvatar } from '../features/dashboard/hooks/useProfile';

// Small layout primitive so every section on the page shares the same
// label style and rhythm, instead of each widget inventing its own header.
function Section({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <span className="px-1 text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

export function DashboardPage() {
  const { data: dashboard, isLoading } = useEnhancedDashboard();
  const { data: today } = useDashboardToday();
  const { data: tasksData } = useTasks();
  const { data: habitsData } = useHabits();

  const updateAvatar = useUpdateAvatar();
  const removeAvatar = useRemoveAvatar();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted">Unable to load dashboard</p>
      </div>
    );
  }

  const tasks = tasksData?.data ?? [];
  const habits = habitsData?.data ?? [];

  // Mock activity feed data - will be replaced with real data later
  const recentActivities = [
    {
      id: '1',
      type: 'task_completed' as const,
      title: 'Completed Dashboard UI',
      timestamp: new Date(Date.now() - 2 * 60000),
    },
    {
      id: '2',
      type: 'focus_session' as const,
      title: 'Started Focus Session',
      description: 'Deep work mode',
      timestamp: new Date(Date.now() - 45 * 60000),
      metadata: { duration: 45 },
    },
  ];

  const habitsForWidget = habits.slice(0, 6).map((h) => ({
    id: h.id,
    name: h.title,
    completedToday: h.completedToday ?? false,
    currentStreak: h.currentStreak ?? 0,
    weeklyProgress: 70, // Mock - calculate from actual data
  }));

  return (
    // gap-10/12 between major sections (not gap-6) - the page needs clear
    // breaks between "who you are", "what to do today", and "how you're
    // trending", not one uniform rhythm for everything.
    <div className="flex flex-col gap-10 sm:gap-12 max-w-[1800px] mx-auto w-full">
      {/* ── Section 1: Identity + today's single most important read ── */}
      <div className="flex flex-col gap-6 sm:gap-8">
        <ProfileHero
          summary={dashboard}
          onAvatarUpload={async (file) => {
            await updateAvatar.mutateAsync(file);
          }}
          onAvatarRemove={async () => {
            await removeAvatar.mutateAsync();
          }}
        />

        <AIBriefWidget
          tasks={tasks}
          focusMinutes={dashboard.focusMinutesTotal}
          pendingTasks={today?.pendingTasks ?? 0}
          habits={{
            total: dashboard.habitsTotal,
            completed: dashboard.habitsCompletedToday,
          }}
        />
      </div>

      {/* ── Section 2: "What do I do right now" - actions before analytics.
          Score card moved out of the sidebar and next to the actions that
          drive it, so cause (do a task/focus session) sits beside effect
          (score moves). It no longer competes with tasks/habits for the
          same rail all the way down the page. ── */}
      <Section label="Right now">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-4">
            <QuickActionsPanel />
          </div>
          <div className="lg:col-span-8">
            <DashboardScore
              overallScore={dashboard.productivityScore ?? 76}
              breakdown={{
                taskCompletion: dashboard.taskCompletionRate,
                focus: Math.min(
                  100,
                  Math.floor((dashboard.focusMinutesTotal / 120) * 100)
                ),
                habits: Math.floor(
                  (dashboard.habitsCompletedToday /
                    Math.max(1, dashboard.habitsTotal)) *
                    100
                ),
                planner: 80, // Mock
                consistency:
                  dashboard.currentHabitStreak > 0
                    ? Math.min(100, dashboard.currentHabitStreak * 10)
                    : 0,
              }}
            />
          </div>
        </div>
      </Section>

      {/* ── Section 3: Work in flight - tasks and projects together since
          they're the same kind of "what am I working on" question. Chart
          moved out of this column; a trend line doesn't belong beside an
          active task list, it belongs beside the score that it explains. ── */}
      <Section label="Work in progress">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">
            <PriorityTasksWidget tasks={tasks} maxTasks={5} />
            <ProjectsWidget projects={dashboard.activeProjects} />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8">
            <UpcomingDeadlines deadlines={dashboard.upcomingDeadlines} />
          </div>
        </div>
      </Section>

      {/* ── Section 4: Habits + focus - the two recurring daily rituals,
          paired together, with the trend chart directly beneath since it's
          the history of exactly these two things plus tasks. ── */}
      <Section label="Daily rhythm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <FocusWidget
            todayMinutes={dashboard.focusMinutesTotal}
            totalMinutes={dashboard.focusMinutesTotal}
            currentStreak={dashboard.currentHabitStreak}
            bestStreak={dashboard.longestHabitStreak}
            longestSession={90} // Mock
            averageSession={45} // Mock
          />
          <HabitsWidget
            habits={habitsForWidget}
            totalHabits={dashboard.habitsTotal}
            completedToday={dashboard.habitsCompletedToday}
          />
        </div>
        <WeeklyProgressChart data={dashboard.weeklyProgress} />
      </Section>

      {/* ── Section 5: Reflection - insights and history are the least
          time-sensitive content on the page, so they sit last. ── */}
      <Section label="Insights">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <ProductivityInsights />
          <ActivityFeed activities={recentActivities} maxItems={6} />
        </div>
      </Section>
    </div>
  );
}

export default DashboardPage;