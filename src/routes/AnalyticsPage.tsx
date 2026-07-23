import { motion } from 'framer-motion';
import { 
  BarChart2, TrendingUp, CheckCircle2, Flame, Timer, Target, Folder, 
  Calendar, Award, Zap, Activity, TrendingDown, ArrowUp, ArrowDown 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, LineChart, Line, Legend, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { FloatingAnalyticsEmpty } from '../components/ui/FloatingAnalyticsEmpty';
import { FloatingProjectsEmpty } from '../components/ui/FloatingProjectsEmpty';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import type { AnalyticsSummaryDTO, DailyAnalyticsDTO, ProjectAnalyticsDTO } from '../types';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];
const CHART_COLORS = {
  tasks: 'var(--color-accent)',
  habits: 'var(--color-success)',
  focus: 'var(--color-info)',
  projects: 'var(--color-warning)',
};

// Enhanced Stat Card with trend indicator
function EnhancedStatCard({ 
  icon, 
  label, 
  value, 
  sub, 
  trend, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  sub?: string; 
  trend?: { value: number; direction: 'up' | 'down' };
  color: 'accent' | 'success' | 'warning' | 'info'; 
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card variant="glass" className="p-4 relative overflow-hidden">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{ 
            background: `radial-gradient(circle at top right, var(--color-${color}), transparent)` 
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                background: `var(--icon-bg-${color})`, 
                color: `var(--icon-text-${color})` 
              }}
            >
              {icon}
            </div>
            {trend && (
              <div 
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                style={{ 
                  background: trend.direction === 'up' 
                    ? 'var(--color-success-subtle)' 
                    : 'var(--color-error-subtle)',
                  color: trend.direction === 'up' 
                    ? 'var(--color-success)' 
                    : 'var(--color-error)'
                }}
              >
                {trend.direction === 'up' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className="text-2xl font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {value}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </div>
          {sub && (
            <div className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
              {sub}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export function AnalyticsPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => apiClient.get<AnalyticsSummaryDTO>('/analytics/summary').then((r) => r.data),
  });

  const { data: daily, isLoading: loadingDaily } = useQuery({
    queryKey: ['analytics', 'daily'],
    queryFn: () => apiClient.get<DailyAnalyticsDTO[]>('/analytics/daily').then((r) => r.data),
  });

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['analytics', 'projects'],
    queryFn: () => apiClient.get<ProjectAnalyticsDTO[]>('/analytics/projects').then((r) => r.data),
  });

  const { data: weekly, isLoading: loadingWeekly } = useQuery({
    queryKey: ['analytics', 'weekly'],
    queryFn: () => apiClient.get<any[]>('/analytics/weekly').then((r) => r.data),
  });

  if (loadingSummary || loadingDaily || loadingProjects || loadingWeekly) return <LoadingScreen />;

  const chartData = (daily ?? []).slice(-14).map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    Tasks: d.tasksCompleted,
    Habits: d.habitsCompleted,
    Focus: d.focusMinutes,
  }));

  const weeklyData = (weekly ?? []).slice(-8).map((w) => ({
    week: w.week.split('-W')[1] ? `W${w.week.split('-W')[1]}` : w.week,
    Tasks: w.tasksCompleted,
    Focus: w.focusMinutes,
    Habits: w.habitsCompleted,
    Projects: w.projectsCompleted,
  }));

  // Project status distribution for pie chart
  const projectsByStatus = projects?.reduce((acc: any, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {}) ?? {};

  const pieData = Object.entries(projectsByStatus).map(([name, value]) => ({
    name: name.charAt(0) + name.slice(1).toLowerCase().replace('_', ' '),
    value,
  }));

  // Completion rate radial data
  const completionData = [
    { 
      name: 'Tasks', 
      value: summary?.taskCompletionRate ?? 0, 
      fill: CHART_COLORS.tasks 
    },
    { 
      name: 'Habits', 
      value: (summary?.habitsTotal ?? 0) > 0 
        ? Math.round((summary?.habitsCompletedToday ?? 0) / (summary?.habitsTotal ?? 1) * 100)
        : 0, 
      fill: CHART_COLORS.habits 
    },
  ];

  const hasData = (daily && daily.length > 0) || (projects && projects.length > 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-[1400px] mx-auto flex flex-col gap-6 sm:gap-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={<BarChart2 size={24} />}
          title="Analytics Dashboard"
          subtitle="Visual insights and performance metrics at a glance"
        />
      </motion.div>

      {/* Enhanced Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <EnhancedStatCard 
          icon={<CheckCircle2 size={20} />} 
          label="Tasks Done" 
          value={summary?.tasksCompleted ?? 0}
          sub={`${summary?.taskCompletionRate ?? 0}% rate`} 
          color="success" 
        />
        <EnhancedStatCard 
          icon={<Target size={20} />} 
          label="Habits Today" 
          value={`${summary?.habitsCompletedToday ?? 0}/${summary?.habitsTotal ?? 0}`} 
          color="accent" 
        />
        <EnhancedStatCard 
          icon={<Flame size={20} />} 
          label="Streak" 
          value={`${summary?.currentHabitStreak ?? 0}d`}
          sub={`Best: ${summary?.longestHabitStreak ?? 0}d`}
          color="warning" 
        />
        <EnhancedStatCard 
          icon={<Award size={20} />} 
          label="Best Streak" 
          value={`${summary?.longestHabitStreak ?? 0}d`} 
          color="accent" 
        />
        <EnhancedStatCard 
          icon={<Timer size={20} />} 
          label="Focus Time" 
          value={`${Math.round((summary?.focusMinutesTotal ?? 0) / 60 * 10) / 10}h`} 
          sub={`${summary?.focusSessionsTotal ?? 0} sessions`} 
          color="info" 
        />
        <EnhancedStatCard 
          icon={<Folder size={20} />} 
          label="Active Projects" 
          value={projects?.filter(p => p.status === 'ACTIVE').length ?? 0}
          sub={`${projects?.length ?? 0} total`}
          color="accent" 
        />
      </motion.div>

      {/* Top Row: Activity + Project Distribution */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Activity Area Chart - 2 cols */}
        <Card variant="default" className="p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
              >
                <Activity size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Daily Activity</h3>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Last 14 days</p>
              </div>
            </div>
            {/* Legend pills */}
            <div className="flex items-center gap-2">
              {[{label: 'Tasks', color: 'accent'}, {label: 'Habits', color: 'success'}].map(l => (
                <span key={l.label} className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: `var(--color-${l.color})` }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[220px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gHabits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)' }} labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 11 }} itemStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="Tasks" stroke="var(--color-accent)" fill="url(#gTasks)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="Habits" stroke="var(--color-success)" fill="url(#gHabits)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <FloatingAnalyticsEmpty />
            )}
          </div>
        </Card>

        {/* Project Status Donut */}
        <Card variant="default" className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--icon-bg-warning)', color: 'var(--icon-text-warning)' }}
            >
              <Folder size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Project Status</h3>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Distribution</p>
            </div>
          </div>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)', fontSize: 11, fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold capitalize" style={{ color: 'var(--color-text-secondary)' }}>{entry.name}</span>
                    </div>
                    <span className="font-black" style={{ color: 'var(--color-text-primary)' }}>{entry.value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <FloatingProjectsEmpty
              title="No projects yet"
              description="Create your first project to see status distribution here"
              showCtaHint={false}
            />
          )}
        </Card>
      </motion.div>

      {/* Middle Row: Weekly Trends + Focus Time */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trends Line Chart */}
        <Card variant="default" className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--icon-bg-info)', color: 'var(--icon-text-info)' }}
              >
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Weekly Trends</h3>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Last 8 weeks</p>
              </div>
            </div>
          </div>
          <div className="h-[240px] w-full">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)' }} labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 11 }} itemStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: '700', paddingTop: 8 }} />
                  <Line type="monotone" dataKey="Tasks" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Habits" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-success)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <FloatingAnalyticsEmpty />
            )}
          </div>
        </Card>

        {/* Focus Time Bar Chart */}
        <Card variant="default" className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--icon-bg-info)', color: 'var(--icon-text-info)' }}
            >
              <Timer size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Focus Minutes</h3>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Daily deep work</p>
            </div>
          </div>
          <div className="h-[240px] w-full">
            {chartData.some(d => d.Focus > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)' }} labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 11 }} itemStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Bar dataKey="Focus" fill="url(#gFocus)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <FloatingAnalyticsEmpty
                compact
                message="No focus sessions yet"
                subMessage="Start a focus session to track your deep work"
              />
            )}
          </div>
        </Card>
      </motion.div>

      {/* Completion Rate Radials + Habit+Task Combined Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Rate Gauges */}
        <Card variant="default" className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--icon-bg-success)', color: 'var(--icon-text-success)' }}
            >
              <Zap size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Completion Rate</h3>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Today's progress</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Task Rate', value: summary?.taskCompletionRate ?? 0, color: CHART_COLORS.tasks },
              { 
                label: 'Habit Rate', 
                value: (summary?.habitsTotal ?? 0) > 0 
                  ? Math.round((summary?.habitsCompletedToday ?? 0) / (summary?.habitsTotal ?? 1) * 100)
                  : 0, 
                color: CHART_COLORS.habits 
              },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                  <span className="font-black text-sm" style={{ color: item.color }}>{item.value}%</span>
                </div>
                <div 
                  className="w-full h-2.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-surface-elevated)' }}
                >
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
            ))}

            {/* Quick stats */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Streak', value: `${summary?.currentHabitStreak ?? 0}d`, icon: <Flame size={12} /> },
                  { label: 'Sessions', value: summary?.focusSessionsTotal ?? 0, icon: <Timer size={12} /> },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-elevated)' }}>
                    <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      {s.icon}
                      <span className="text-[9px] font-bold uppercase tracking-wider">{s.label}</span>
                    </div>
                    <div className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Tasks vs Habits Grouped Bar - 2 cols */}
        <Card variant="default" className="p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
            >
              <BarChart2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Tasks vs Habits</h3>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Grouped daily comparison</p>
            </div>
          </div>
          <div className="h-[240px] w-full">
            {chartData.some(d => d.Tasks > 0 || d.Habits > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(-10)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: '600' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--shadow-md)' }} labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 11 }} itemStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: '700', paddingTop: 8 }} />
                  <Bar dataKey="Tasks" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Habits" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <FloatingAnalyticsEmpty />
            )}
          </div>
        </Card>
      </motion.div>

      {/* Project Performance Cards */}
      <motion.div variants={itemVariants}>
        <Card variant="default" className="overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
              >
                <Folder size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Project Performance</h3>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {projects && projects.length > 0 
                    ? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} tracked`
                    : 'Track your project progress here'
                  }
                </p>
              </div>
            </div>
          </div>
          
          {projects && projects.length > 0 ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.slice(0, 6).map((project, idx) => (
                <motion.div
                  key={project.projectId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-xl p-4 hover:shadow-md transition-all"
                  style={{ background: 'var(--color-surface-elevated)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                      >
                        <Folder size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {project.projectName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span 
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{
                              background: project.status === 'ACTIVE' 
                                ? 'var(--color-success-subtle)' 
                                : project.status === 'COMPLETED'
                                ? 'var(--color-info-subtle)'
                                : 'var(--color-warning-subtle)',
                              color: project.status === 'ACTIVE' 
                                ? 'var(--color-success)' 
                                : project.status === 'COMPLETED'
                                ? 'var(--color-info)'
                                : 'var(--color-warning)',
                            }}
                          >
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div 
                      className="text-xl font-black shrink-0 ml-2"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {Math.round(project.progress)}%
                    </div>
                  </div>

                  <ProgressBar value={project.progress} color="accent" size="sm" />
                  
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      <CheckCircle2 size={11} />
                      {project.completedTasks}/{project.totalTasks} tasks
                    </div>
                    {project.daysRemaining !== null && (
                      <div 
                        className="flex items-center gap-1.5 font-bold"
                        style={{ 
                          color: project.daysRemaining < 0 
                            ? 'var(--color-error)' 
                            : project.daysRemaining < 7 
                            ? 'var(--color-warning)' 
                            : 'var(--color-text-tertiary)' 
                        }}
                      >
                        <Calendar size={11} />
                        {project.daysRemaining < 0 
                          ? `${Math.abs(project.daysRemaining)}d overdue` 
                          : `${project.daysRemaining}d left`
                        }
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-3">
              <FloatingProjectsEmpty
                title="No projects to track yet"
                description="Create projects to visualize performance metrics and progress insights"
                showCtaHint={false}
              />
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default AnalyticsPage;
