import {
  Sparkles,
  CheckSquare,
  Target,
  Timer,
  Flame,
  TrendingUp,
  Activity,
  Plus,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { LoadingScreen } from '../components/ui/Spinner';
import { ProjectsWidget } from '../components/dashboard/ProjectsWidget';
import { MessagesWidget } from '../components/dashboard/MessagesWidget';
import { ProfileWidget } from '../components/dashboard/ProfileWidget';
import { WeeklyProgressChart } from '../components/dashboard/WeeklyProgressChart';
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines';
import { DailyBriefingCard } from '../components/dashboard/DailyBriefingCard';
import { useAuthStore } from '../store/authStore';
import { useEnhancedDashboard, useDashboardToday } from '../features/dashboard/hooks/useDashboard';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { Card } from '../components/ui/Card';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useEnhancedDashboard();
  const { data: today } = useDashboardToday();
  const { data: tasksData } = useTasks();

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

      <DailyBriefingCard
        tasks={tasksData?.data ?? []}
        focusMinutes={dashboard.focusMinutesTotal}
        pendingTasks={today?.pendingTasks ?? 0}
      />

      {/* Today Snapshot + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <Card
          variant="default"
          className="lg:col-span-7 p-5 sm:p-6 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Today at a Glance</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                A quick pulse check for the day ahead
              </p>
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="text-left p-4 rounded-2xl border transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
                >
                  <CheckSquare size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Tasks
                </span>
              </div>
              <div className="text-2xl font-extrabold text-text-primary">
                {today?.pendingTasks ?? 0}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                pending task{(today?.pendingTasks ?? 0) === 1 ? '' : 's'} today
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/habits')}
              className="text-left p-4 rounded-2xl border transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--icon-bg-warning)', color: 'var(--icon-text-warning)' }}
                >
                  <Target size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Habits
                </span>
              </div>
              <div className="text-2xl font-extrabold text-text-primary">
                {today?.habitsToComplete ?? 0}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                habit{(today?.habitsToComplete ?? 0) === 1 ? '' : 's'} still open
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/focus')}
              className="text-left p-4 rounded-2xl border transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--icon-bg-info)', color: 'var(--icon-text-info)' }}
                >
                  <Timer size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Focus
                </span>
              </div>
              <div className="text-2xl font-extrabold text-text-primary">
                Start
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                launch a 25 minute focus session
              </div>
            </button>
          </div>
        </Card>

        <Card
          variant="default"
          className="lg:col-span-5 p-5 sm:p-6 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Quick Actions</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Jump straight into the main workflow
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
            >
              <Plus size={18} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
              >
                <CheckSquare size={16} />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary">New Task</div>
                <div className="text-[11px] text-text-muted">Capture work quickly</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/notes')}
              className="flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--icon-bg-info)', color: 'var(--icon-text-info)' }}
              >
                <FileText size={16} />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary">New Note</div>
                <div className="text-[11px] text-text-muted">Capture ideas and context</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/planner')}
              className="flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--icon-bg-warning)', color: 'var(--icon-text-warning)' }}
              >
                <Activity size={16} />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary">Open Planner</div>
                <div className="text-[11px] text-text-muted">Block time for the day</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/focus')}
              className="flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--icon-bg-success)', color: 'var(--icon-text-success)' }}
              >
                <Timer size={16} />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary">Start Focus</div>
                <div className="text-[11px] text-text-muted">Launch a deep-work session</div>
              </div>
            </button>
          </div>
        </Card>
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
