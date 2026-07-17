import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, CheckCircle2, Flame, Timer, Target, Folder, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import type { AnalyticsSummaryDTO, DailyAnalyticsDTO, ProjectAnalyticsDTO } from '../types';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

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
          title="Analytics"
          subtitle="Comprehensive insights on your productivity metrics"
        />
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard 
          icon={<CheckCircle2 size={20} />} 
          label="Tasks Completed" 
          value={summary?.tasksCompleted ?? 0}
          sub={`${summary?.taskCompletionRate ?? 0}% rate`} 
          color="success" 
        />
        <StatCard 
          icon={<Target size={20} />} 
          label="Habits Today" 
          value={`${summary?.habitsCompletedToday ?? 0}/${summary?.habitsTotal ?? 0}`} 
          color="accent" 
        />
        <StatCard 
          icon={<Flame size={20} />} 
          label="Current Streak" 
          value={`${summary?.currentHabitStreak ?? 0}d`} 
          color="warning" 
        />
        <StatCard 
          icon={<Flame size={20} />} 
          label="Best Streak" 
          value={`${summary?.longestHabitStreak ?? 0}d`} 
          color="accent" 
        />
        <StatCard 
          icon={<Timer size={20} />} 
          label="Focus Time" 
          value={`${summary?.focusMinutesTotal ?? 0}m`} 
          sub={`${summary?.focusSessionsTotal ?? 0} sessions`} 
          color="info" 
        />
        <StatCard 
          icon={<Folder size={20} />} 
          label="Active Projects" 
          value={projects?.filter(p => p.status === 'ACTIVE').length ?? 0} 
          color="accent" 
        />
      </motion.div>

      {/* Main Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trends */}
        <Card variant="default" className="p-6">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-5">Weekly Trends — Last 8 Weeks</p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTasks2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorHabits2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="week" 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--color-surface-raised)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 12, 
                    boxShadow: 'var(--shadow-md)' 
                  }} 
                  labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 12 }} 
                  itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold', paddingTop: 10 }} />
                <Line type="monotone" dataKey="Tasks" stroke="var(--color-accent)" fill="url(#colorTasks2)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Habits" stroke="var(--color-success)" fill="url(#colorHabits2)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Project Status Distribution */}
        <Card variant="default" className="p-6">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-5">Project Status Distribution</p>
          <div className="h-[280px] w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--color-surface-raised)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: 12, 
                      boxShadow: 'var(--shadow-md)',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-text-muted">No projects yet</p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Daily Activity Chart */}
      <motion.div variants={itemVariants}>
        <Card variant="default" className="p-6 sm:p-8">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-5">Daily Activity — Last 14 Days</p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gHabits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--color-surface-raised)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 12, 
                    boxShadow: 'var(--shadow-md)' 
                  }} 
                  labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 12 }} 
                  itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Tasks" stroke="var(--color-accent)" fill="url(#gTasks)" strokeWidth={3} dot={false} />
                <Area type="monotone" dataKey="Habits" stroke="var(--color-success)" fill="url(#gHabits)" strokeWidth={3} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Focus Time Chart */}
      <motion.div variants={itemVariants}>
        <Card variant="default" className="p-6 sm:p-8">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-5">Focus Minutes — Last 14 Days</p>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--color-surface-raised)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 12, 
                    boxShadow: 'var(--shadow-md)' 
                  }} 
                  labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold', fontSize: 12 }}
                  itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                />
                <Bar dataKey="Focus" fill="var(--color-info)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Project Analytics Table */}
      {projects && projects.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card variant="default" className="overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
                >
                  <Folder size={16} />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Project Performance</h3>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {projects.slice(0, 5).map((project) => (
                <div key={project.projectId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-text-primary truncate">{project.projectName}</h4>
                      <span 
                        className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: 'var(--color-accent-subtle)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {project.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-text-muted shrink-0 ml-4">
                      {project.completedTasks}/{project.totalTasks} tasks
                    </div>
                  </div>
                  <ProgressBar value={project.progress} color="accent" size="sm" showLabel />
                  {project.daysRemaining !== null && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
                      <Calendar size={10} />
                      {project.daysRemaining < 0 
                        ? `${Math.abs(project.daysRemaining)} days overdue` 
                        : `${project.daysRemaining} days remaining`
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

export default AnalyticsPage;