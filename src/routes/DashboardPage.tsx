
import {
  Sparkles,
  CheckSquare,
  Target,
  Timer,
  Flame,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { LoadingScreen } from '../components/ui/Spinner';
import { ProjectsWidget } from '../components/dashboard/ProjectsWidget';
import { MessagesWidget } from '../components/dashboard/MessagesWidget';
import { ProfileWidget } from '../components/dashboard/ProfileWidget';
import { WeeklyProgressChart } from '../components/dashboard/WeeklyProgressChart';
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines';
import { useAuthStore } from '../store/authStore';
import { useEnhancedDashboard } from '../features/dashboard/hooks/useDashboard';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: dashboard, isLoading } = useEnhancedDashboard();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

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

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-[1400px] mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          icon={<Sparkles size={20} />}
          title={`${greeting()}, ${user?.name ? user.name.split(' ')[0] : 'User'}`}
          subtitle={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        />
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger animate-fade-in">
        <StatCard
          icon={<CheckSquare size={18} />}
          label="Tasks Completed"
          value={dashboard.tasksCompleted}
          change={dashboard.taskCompletionRate}
          color="accent"
          isLive
        />
        <StatCard
          icon={<Target size={18} />}
          label="Habits Today"
          value={`${dashboard.habitsCompletedToday}/${dashboard.habitsTotal}`}
          change={dashboard.habitsTotal ? Math.round((dashboard.habitsCompletedToday / dashboard.habitsTotal) * 100) : 0}
          color="success"
          isLive
        />
<StatCard
          icon={<Flame size={18} />}
          label="Productivity Score"
          value={`${dashboard.productivityScore ?? 0}/100`}
          color="warning"
          isLive
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Current Streak"
          value={`${dashboard.currentHabitStreak}d`}
          color="accent"
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Best Streak"
          value={`${dashboard.longestHabitStreak}d`}
          color="accent"
        />
        <StatCard
          icon={<Timer size={18} />}
          label="Focus Time"
          value={`${dashboard.focusMinutesTotal}m`}
          change={dashboard.focusSessionsTotal}
          color="info"
          isLive
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column - Main Content (8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6">
          {/* Weekly Progress Chart */}
          <WeeklyProgressChart data={dashboard.weeklyProgress} />

          {/* Projects Widget */}
          <ProjectsWidget projects={dashboard.activeProjects} />

          {/* Upcoming Deadlines */}
          <UpcomingDeadlines deadlines={dashboard.upcomingDeadlines} />
        </div>

        {/* Right Column - Sidebar (4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-5 sm:gap-6">
          {/* Profile Widget */}
          <ProfileWidget summary={dashboard} />

          {/* Messages Widget */}
          <MessagesWidget messages={dashboard.recentMessages} />

          {/* Project Stats Card */}
          <div 
            className="card-interactive p-5 rounded-2xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--icon-bg-accent)',
                  color: 'var(--icon-text-accent)',
                }}
              >
                <Activity size={16} />
              </div>
              <h3 className="text-sm font-bold text-text-primary">Quick Stats</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Total Projects</span>
                <span className="text-sm font-extrabold text-text-primary">
                  {dashboard.projectStats.totalProjects}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Active Projects</span>
                <span className="text-sm font-extrabold text-accent">
                  {dashboard.projectStats.activeProjectsCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Completed Projects</span>
                <span className="text-sm font-extrabold text-success">
                  {dashboard.projectStats.completedProjectsCount}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <span className="text-xs font-bold text-text-muted">Total Tasks</span>
                <span className="text-sm font-extrabold text-text-primary">
                  {dashboard.tasksTotal}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Completion Rate</span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-success" />
                  <span className="text-sm font-extrabold text-success">
                    {dashboard.taskCompletionRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;