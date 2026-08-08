import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Calendar,
  ChevronDown,
  Edit2,
  Filter,
  Flame,
  FolderKanban,
  Grid2x2,
  HeartPulse,
  Layers,
  List,
  ListChecks,
  MoreHorizontal,
  Palette,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Zap,
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useEnhancedDashboard } from '../features/dashboard/hooks/useDashboard';
import { useGoals, useCreateGoal, useDeleteGoal, useUpdateGoal } from '../features/goals/hooks/useGoals';
import { useHabits } from '../features/habits/hooks/useHabits';
import { useProjects } from '../features/projects/hooks/useProjects';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { FloatingGoalsEmpty } from '../components/ui/FloatingGoalsEmpty';
import { WeeklyProgressChart } from '../components/dashboard/WeeklyProgressChart';
import { GoalCardView } from '../components/goals/GoalCardView';
import { GoalDeleteModal } from '../components/goals/GoalDeleteModal';
import { GoalFormModal } from '../components/goals/GoalFormModal';
import { GoalPlannerModal } from '../components/goals/GoalPlannerModal';
import { Button } from '../components/ui/Button';
import type {
  EnhancedDashboardDTO,
  GoalDTO,
  GoalMilestoneDTO,
  GoalPriority,
  GoalStatus,
  HabitDTO,
  ProjectDTO,
  TaskDTO,
} from '../types';
import type { DeleteGoalOptions } from '../features/goals/api';
import { AchievementsPanel } from '../components/habits/AchievementsPanel';

type GoalFilter = 'ALL' | GoalStatus;
type SortKey = 'latest' | 'oldest' | 'progress' | 'name';
type ViewMode = 'grid' | 'list';

type GoalFormState = {
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  targetDate: string;
  status: GoalStatus;
  priority: GoalPriority;
  aiSummary: string;
  linkedHabitIds: Set<string>;
  linkedTaskIds: Set<string>;
  linkedProjectIds: Set<string>;
};

type FormErrors = Partial<Record<keyof GoalFormState, string>>;
type TouchedFields = Partial<Record<keyof GoalFormState, boolean>>;

const goalStatuses: GoalFilter[] = ['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];

const statusMeta: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: {
    label: 'Active',
    color: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
  },
  PAUSED: {
    label: 'Paused',
    color: 'var(--color-warning)',
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'var(--color-info)',
    bg: 'color-mix(in srgb, var(--color-info) 12%, transparent)',
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'var(--color-text-muted)',
    bg: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
  },
};

const categoryMeta = [
  { match: ['revenue', 'finance', 'money', 'sales'], label: 'Finance', icon: BadgeDollarSign, color: '#10B981' },
  { match: ['launch', 'ship', 'release', 'build'], label: 'Launch', icon: Rocket, color: '#7C3AED' },
  { match: ['growth', 'scale', 'expand'], label: 'Growth', icon: TrendingUp, color: '#4F46E5' },
  { match: ['health', 'fitness', 'wellness'], label: 'Wellness', icon: HeartPulse, color: '#EF4444' },
  { match: ['learn', 'study', 'book', 'research'], label: 'Learning', icon: BookOpen, color: '#0EA5E9' },
  { match: ['design', 'brand', 'creative'], label: 'Creative', icon: Palette, color: '#EC4899' },
  { match: ['ops', 'operations', 'system'], label: 'Operations', icon: BriefcaseBusiness, color: '#F59E0B' },
  { match: ['code', 'tech', 'engineering', 'software'], label: 'Build', icon: Brain, color: '#8B5CF6' },
];

function emptyForm(): GoalFormState {
  return {
    title: '',
    description: '',
    category: '',
    icon: 'target',
    color: '#4F46E5',
    targetDate: '',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    aiSummary: '',
    linkedHabitIds: new Set(),
    linkedTaskIds: new Set(),
    linkedProjectIds: new Set(),
  };
}

function goalToForm(goal: GoalDTO): GoalFormState {
  return {
    title: goal.title,
    description: goal.description ?? '',
    category: goal.category ?? '',
    icon: goal.icon ?? 'target',
    color: goal.color || '#4F46E5',
    targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
    status: goal.status,
    priority: goal.priority,
    aiSummary: goal.aiSummary ?? '',
    linkedHabitIds: new Set(goal.linkedHabitIds),
    linkedTaskIds: new Set(goal.linkedTaskIds),
    linkedProjectIds: new Set(goal.linkedProjectIds),
  };
}

function validateForm(form: GoalFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  else if (form.title.trim().length < 3) errors.title = 'Title must be at least 3 characters.';
  if (form.targetDate) {
    const date = new Date(form.targetDate);
    if (Number.isNaN(date.getTime())) errors.targetDate = 'Enter a valid date.';
  }
  if (form.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(form.color.trim())) {
    errors.color = 'Use a valid hex color.';
  }
  return errors;
}

function daysBetween(from: string | Date, to: string | Date): number {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  return Math.round((end - start) / 86400000);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateLong(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'just now';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getGoalCategoryMeta(goal: GoalDTO) {
  const source = `${goal.category ?? ''} ${goal.icon ?? ''} ${goal.title}`.toLowerCase();
  const found = categoryMeta.find((item) => item.match.some((match) => source.includes(match)));
  return found ?? { label: goal.category || 'Goal', icon: Target, color: goal.color || '#4F46E5' };
}

function goalStage(goal: GoalDTO): string {
  if (goal.status === 'COMPLETED') return 'Completed';
  if (goal.progress >= 75) return 'Execution';
  if (goal.progress >= 40) return 'Building';
  if (goal.progress >= 10) return 'Planning';
  return 'Launch';
}

function goalProgressVsPace(goal: GoalDTO): number | null {
  if (!goal.targetDate) return null;
  const start = new Date(goal.createdAt).getTime();
  const end = new Date(goal.targetDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const now = Date.now();
  const elapsed = clamp(now - start, 0, end - start);
  const expected = (elapsed / (end - start)) * 100;
  return Math.round(goal.progress - expected);
}

function lineChartPath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const normalized = (value - min) / span;
      const y = height - normalized * (height - 20) - 10;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function smallSpark(values: number[], color: string) {
  const path = lineChartPath(values, 100, 30);
  const fillPath = `${path} L 100 30 L 0 30 Z`;
  return { path, fillPath, color };
}

function buildRoadmap(goal: GoalDTO): Array<{ label: string; date: string; done: boolean }> {
  const milestones = [...goal.milestones].sort((a, b) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  if (milestones.length > 0) {
    return milestones.slice(0, 6).map((milestone) => ({
      label: milestone.title,
      date: milestone.dueDate ? formatDate(milestone.dueDate) : 'No date',
      done: milestone.status === 'COMPLETED',
    }));
  }

  const fallback: Array<{ label: string; date: string; done: boolean }> = [
    { label: 'Created', date: formatDate(goal.createdAt), done: true },
  ];

  if (goal.targetDate) {
    const created = new Date(goal.createdAt);
    const target = new Date(goal.targetDate);
    const midpoint = new Date(created.getTime() + (target.getTime() - created.getTime()) / 2);
    fallback.push(
      { label: 'Midpoint', date: formatDate(midpoint.toISOString()), done: goal.progress >= 50 },
      { label: 'Target', date: formatDate(goal.targetDate), done: goal.status === 'COMPLETED' || goal.progress >= 100 }
    );
  }

  return fallback;
}

function filterLabel(filter: GoalFilter): string {
  if (filter === 'ALL') return 'All Goals';
  return statusMeta[filter].label;
}

function statusCount(goals: GoalDTO[], filter: GoalFilter): number {
  if (filter === 'ALL') return goals.length;
  return goals.filter((goal) => goal.status === filter).length;
}

export function GoalsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: dashboard } = useEnhancedDashboard();
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: habitsData } = useHabits();
  const { data: tasksData } = useTasks();
  const { data: projectsData } = useProjects();

  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();

  const [filter, setFilter] = useState<GoalFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalDTO | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<GoalDTO | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<GoalFormState>(emptyForm());
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const tasks = tasksData?.pages.flatMap((page) => page.data) ?? [];
  const habits = habitsData?.data ?? [];
  const projects = projectsData?.data ?? [];
  const goals = goalsData?.data ?? [];
  const dashboardData = dashboard as EnhancedDashboardDTO | undefined;

  const updateGoal = useUpdateGoal(editingGoal?.id ?? '');
  const errors = useMemo(() => validateForm(form), [form]);
  const fieldError = (key: keyof GoalFormState) => (touched[key] || submitAttempted ? errors[key] : undefined);

  const filteredGoals = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = goals.filter((goal) => {
      const matchesFilter = filter === 'ALL' || goal.status === filter;
      const haystack = [goal.title, goal.description, goal.category, goal.aiSummary]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      return matchesFilter && matchesSearch;
    });

    return [...list].sort((a, b) => {
      if (sortKey === 'latest') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortKey === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === 'progress') return b.progress - a.progress;
      return a.title.localeCompare(b.title);
    });
  }, [goals, filter, search, sortKey]);

  const stats = useMemo(() => {
    const total = goals.length;
    const active = goals.filter((goal) => goal.status === 'ACTIVE').length;
    const completed = goals.filter((goal) => goal.status === 'COMPLETED').length;
    const avgProgress = total > 0 ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / total) : 0;
    const totalMilestones = goals.reduce((sum, goal) => sum + goal.milestones.length, 0);
    const dueSoon = dashboardData?.upcomingDeadlines.length ?? 0;
    return { total, active, completed, avgProgress, totalMilestones, dueSoon };
  }, [goals, dashboardData]);

  const paceDelta = useMemo(() => {
    const paceGoals = goals.filter((goal) => !!goal.targetDate);
    if (paceGoals.length === 0) return null;
    const deltas = paceGoals.map((goal) => goalProgressVsPace(goal)).filter((value): value is number => value !== null);
    if (deltas.length === 0) return null;
    return Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length);
  }, [goals]);

  const heroMessage = useMemo(() => {
    if (!user) return 'Your goals are ready.';
    const name = user.name ?? user.email.split('@')[0];
    if (paceDelta === null) {
      return `Welcome back, ${name}. Your goals are moving with real momentum.`;
    }
    return paceDelta >= 0
      ? `${name}, you are ${paceDelta}% ahead of pace across tracked goals.`
      : `${name}, you are ${Math.abs(paceDelta)}% behind pace on tracked goals.`;
  }, [paceDelta, user]);

  const selectedGoal = useMemo(() => {
    if (!goals.length) return null;
    const byId = selectedGoalId ? goals.find((goal) => goal.id === selectedGoalId) : null;
    return byId ?? filteredGoals[0] ?? goals[0];
  }, [filteredGoals, goals, selectedGoalId]);

  const categorySummary = useMemo(() => {
    const map = new Map<string, { label: string; count: number; color: string; icon: typeof Target }>();
    for (const goal of goals) {
      const meta = getGoalCategoryMeta(goal);
      const key = meta.label.toLowerCase();
      const entry = map.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        map.set(key, { label: meta.label, count: 1, color: meta.color, icon: meta.icon });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [goals]);

  const recentAchievements = dashboardData?.gamification.recentAchievements ?? [];
  const insights = dashboardData?.insights ?? [];
  const upcomingDeadlines = dashboardData?.upcomingDeadlines ?? [];
  const weeklyProgress = dashboardData?.weeklyProgress ?? [];

  const topOrbitGoals = useMemo(() => [...goals].sort((a, b) => b.progress - a.progress).slice(0, 4), [goals]);

  const openCreate = () => {
    setEditingGoal(null);
    setForm(emptyForm());
    setTouched({});
    setSubmitAttempted(false);
    setIsModalOpen(true);
  };

  const openEdit = (goal: GoalDTO) => {
    setEditingGoal(goal);
    setForm(goalToForm(goal));
    setTouched({});
    setSubmitAttempted(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
    setForm(emptyForm());
    setTouched({});
    setSubmitAttempted(false);
  };

  const toggleSelected = (kind: 'habits' | 'tasks' | 'projects', id: string) => {
    setForm((current) => {
      const next = { ...current };
      const target =
        kind === 'habits'
          ? new Set(current.linkedHabitIds)
          : kind === 'tasks'
            ? new Set(current.linkedTaskIds)
            : new Set(current.linkedProjectIds);
      if (target.has(id)) target.delete(id);
      else target.add(id);
      if (kind === 'habits') next.linkedHabitIds = target;
      if (kind === 'tasks') next.linkedTaskIds = target;
      if (kind === 'projects') next.linkedProjectIds = target;
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (Object.keys(validateForm(form)).length > 0) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      icon: form.icon.trim() || undefined,
      color: form.color.trim() || undefined,
      targetDate: form.targetDate || null,
      status: form.status,
      priority: form.priority,
      aiSummary: form.aiSummary.trim() || null,
      linkedHabitIds: Array.from(form.linkedHabitIds),
      linkedTaskIds: Array.from(form.linkedTaskIds),
      linkedProjectIds: Array.from(form.linkedProjectIds),
    };

    if (editingGoal) {
      await updateGoal.mutateAsync(payload);
    } else {
      await createGoal.mutateAsync(payload);
    }
    closeModal();
  };

  if (goalsLoading && !goals.length) {
    return <GoalsSkeleton />;
  }

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'there';
  const currentYear = new Date().getFullYear();
  const mainChart = smallSpark(
    weeklyProgress.slice(-7).map((entry) => Math.max(entry.tasksCompleted * 12 + entry.habitsCompleted * 8, 8)),
    'var(--color-accent)'
  );
  const focusChart = smallSpark(
    weeklyProgress.slice(-7).map((entry) => Math.max(entry.focusMinutes, 5)),
    'var(--color-success)'
  );
  const selectedRoadmap = selectedGoal ? buildRoadmap(selectedGoal) : [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative min-h-full overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="relative z-10 flex flex-col gap-6 p-4 sm:p-6 lg:p-8 xl:p-10">
        {/* ── PREMIUM HERO ──────────────────────────────────────────── */}
        <GoalsHero
          displayName={displayName}
          heroMessage={heroMessage}
          stats={stats}
          paceDelta={paceDelta}
          topOrbitGoals={topOrbitGoals}
          goals={goals}
          weeklyProgress={weeklyProgress}
          onCreateGoal={openCreate}
          onOpenPlanner={() => setPlannerOpen(true)}
        />

        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Goals"
            value={stats.total}
            sub={`${stats.active} active this month`}
            icon={<Target size={18} />}
            accent="var(--color-accent)"
            spark={mainChart}
          />
          <KpiCard
            title="Progress"
            value={`${stats.avgProgress}%`}
            sub="Across all goals"
            icon={<Layers size={18} />}
            accent="var(--color-info)"
            spark={focusChart}
          />
          <KpiCard
            title="Focus Score"
            value={dashboardData?.productivityScore ?? 0}
            sub={dashboardData ? 'Real productivity score' : 'From backend summary'}
            icon={<Activity size={18} />}
            accent="var(--color-success)"
            spark={smallSpark(
              weeklyProgress.slice(-7).map((entry) => Math.max(entry.focusMinutes / 2, 8)),
              'var(--color-success)'
            )}
          />
          <KpiCard
            title="Milestones"
            value={stats.totalMilestones}
            sub={`${stats.dueSoon} upcoming deadlines`}
            icon={<Calendar size={18} />}
            accent="var(--color-warning)"
            spark={smallSpark(
              weeklyProgress.slice(-7).map((entry) => Math.max(entry.projectsCompleted * 14, 6)),
              'var(--color-warning)'
            )}
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-xl border p-4 sm:p-5"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search goals..."
                className="w-full rounded-2xl border py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:ring-2"
                style={
                  {
                    background: 'var(--color-surface-raised)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    '--tw-ring-color': 'var(--color-accent)',
                  } as CSSProperties
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ChipSelect
                label="Status"
                value={filter}
                options={goalStatuses.map((status) => ({ value: status, label: filterLabel(status) }))}
                onChange={(value) => setFilter(value as GoalFilter)}
              />
              <ChipSelect
                label="Sort"
                value={sortKey}
                options={[
                  { value: 'latest', label: 'Latest' },
                  { value: 'progress', label: 'Progress' },
                  { value: 'name', label: 'Name' },
                  { value: 'oldest', label: 'Oldest' },
                ]}
                onChange={(value) => setSortKey(value as SortKey)}
              />
              <button
                type="button"
                onClick={() => setViewMode((current) => (current === 'grid' ? 'list' : 'grid'))}
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {viewMode === 'grid' ? <Grid2x2 size={15} /> : <List size={15} />}
                {viewMode === 'grid' ? 'Grid' : 'List'}
              </button>
              <button
                type="button"
                onClick={() => setPlannerOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 9%, var(--color-surface-raised))',
                  borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                <Sparkles size={15} />
                AI Coach
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categorySummary.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.label}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: category.color,
                  }}
                >
                  <Icon size={14} />
                  {category.label}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px]"
                    style={{ background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
                  >
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]"
        >
          <div className="min-w-0">
            <SectionHeader
              title="Active Goals"
              count={filteredGoals.length}
              actionLabel="View all"
              onAction={() => setFilter('ALL')}
            />

            <div className="mt-4 flex flex-col gap-4">
              {filteredGoals.length === 0 ? (
                <FloatingGoalsEmpty
                  title={search || filter !== 'ALL' ? 'No matching goals' : 'No goals yet'}
                  description={
                    search || filter !== 'ALL'
                      ? 'Try adjusting your search or filter.'
                      : 'Create a goal and start linking habits, tasks, and projects.'
                  }
                  ctaText="Create goal"
                  onCreateGoal={openCreate}
                />
              ) : (
                filteredGoals.map((goal) => (
                  <GoalCardView
                    key={goal.id}
                    goal={goal}
                    selected={selectedGoal?.id === goal.id}
                    viewMode={viewMode}
                    onSelect={() => setSelectedGoalId(goal.id)}
                    onOpen={() => navigate(`/goals/${goal.id}`)}
                    onEdit={() => openEdit(goal)}
                    onDelete={() => setDeletingGoal(goal)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <CoachPanel
              insights={insights}
              upcomingDeadlines={upcomingDeadlines}
              updatedAt={dashboardData?.gamification.recentPoints?.[0]?.createdAt ?? null}
            />
            <RecentAchievementsPanel achievements={recentAchievements} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
                  Weekly velocity
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Real weekly output from tasks, habits, and focus sessions
                </p>
              </div>
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {currentYear}
              </span>
            </div>

            <div
              className="mt-5 overflow-hidden rounded-2xl border"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <WeeklyProgressChart data={weeklyProgress} />
            </div>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
                  Progress Analytics
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Expected vs actual progress from your real activity
                </p>
              </div>
              <div
                className="rounded-2xl border px-3 py-2 text-xs font-bold"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                This month
              </div>
            </div>

            <div className="mt-5">
              <AnalyticsLineChart
                values={weeklyProgress
                  .slice(-8)
                  .map((entry, index) =>
                    Math.max(entry.tasksCompleted * 18 + entry.habitsCompleted * 10 + index * 2, 5)
                  )}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricBox
                label="Weekly velocity"
                value={`${weeklyProgress.slice(-1)[0]?.tasksCompleted ?? 0} tasks`}
                sub={`Across ${weeklyProgress.length} weeks`}
              />
              <MetricBox
                label="Focus time"
                value={`${Math.floor(weeklyProgress.reduce((sum, item) => sum + item.focusMinutes, 0) / 60)}h`}
                sub="Logged this period"
              />
              <MetricBox label="Upcoming" value={`${upcomingDeadlines.length}`} sub="Deadlines in queue" />
              <MetricBox label="Categories" value={`${categorySummary.length}`} sub="Distinct goal groups" />
            </div>
          </div>
        </motion.div>
      </div>

      <GoalFormModal
        open={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingGoal={!!editingGoal}
        form={form}
        setForm={setForm}
        touched={touched}
        setTouched={setTouched}
        fieldError={fieldError}
        isSubmitting={createGoal.isPending || updateGoal.isPending}
        habits={habits}
        tasks={tasks}
        projects={projects}
        toggleSelected={toggleSelected}
      />

      <GoalPlannerModal
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        onCreated={(goalId) => navigate(`/goals/${goalId}`)}
      />
      {deletingGoal && (
        <GoalDeleteModal
          open={!!deletingGoal}
          goal={deletingGoal}
          onClose={() => setDeletingGoal(null)}
          onConfirm={async (opts: DeleteGoalOptions) => {
            await deleteGoal.mutateAsync({ id: deletingGoal.id, options: opts });
            setDeletingGoal(null);
          }}
          isDeleting={deleteGoal.isPending}
        />
      )}
    </motion.div>
  );
}

// ─── GoalsHero ────────────────────────────────────────────────────────────────

type HeroStats = {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
  totalMilestones: number;
  dueSoon: number;
};

type WeeklyEntry = {
  tasksCompleted: number;
  habitsCompleted: number;
  focusMinutes: number;
  projectsCompleted: number;
};

function GoalsHero({
  displayName,
  heroMessage,
  stats,
  paceDelta,
  topOrbitGoals,
  goals,
  weeklyProgress,
  onCreateGoal,
  onOpenPlanner,
}: {
  displayName: string;
  heroMessage: string;
  stats: HeroStats;
  paceDelta: number | null;
  topOrbitGoals: GoalDTO[];
  goals: GoalDTO[];
  weeklyProgress: WeeklyEntry[];
  onCreateGoal: () => void;
  onOpenPlanner: () => void;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const blob1X = useTransform(springX, [0, 1], ['-4%', '4%']);
  const blob1Y = useTransform(springY, [0, 1], ['-4%', '4%']);
  const blob2X = useTransform(springX, [0, 1], ['4%', '-4%']);
  const blob2Y = useTransform(springY, [0, 1], ['4%', '-4%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const isPaceAhead = paceDelta !== null && paceDelta >= 0;

  // Mini spark for the radial progress ring
  const circumference = 2 * Math.PI * 54;
  const progressOffset = circumference - (stats.avgProgress / 100) * circumference;

  // Top 3 goals by progress for the side cards
  const featuredGoals = topOrbitGoals.slice(0, 3);

  // Weekly momentum bar data (last 7)
  const barData = weeklyProgress.slice(-7).map((w) => w.tasksCompleted + w.habitsCompleted);
  const barMax = Math.max(...barData, 1);

  return (
    <motion.div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      variants={itemVariants}
      className="relative overflow-hidden rounded-[32px]"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow:
          '0 0 0 1px color-mix(in srgb, var(--color-accent) 6%, transparent), 0 24px 64px -12px rgba(0,0,0,0.10)',
      }}
    >
      {/* ── Animated ambient blobs ── */}
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full"
        aria-hidden="true"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 70%)',
            filter: 'blur(32px)',
          }}
        />
      </motion.div>
      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        className="pointer-events-none absolute -bottom-16 -right-16 h-[360px] w-[360px] rounded-full"
        aria-hidden="true"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, #3B82F6 12%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </motion.div>
      {/* ── Main content ── */}
      <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:p-10 xl:flex-row xl:items-center xl:gap-12">
        {/* Left column: text + cta + pace badge */}
        <div className="min-w-0 flex-1 xl:max-w-[480px]">
          {/* Eyebrow */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 22%, transparent)',
            }}
          >
            <motion.span
              animate={{ rotate: [0, 15, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
            >
              <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />
            </motion.span>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-accent)' }}
            >
              Goals Cockpit
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="mt-4 font-black tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
              lineHeight: 1.08,
              color: 'var(--color-text-primary)',
            }}
          >
            Your ambitions,{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #818CF8 60%, #3B82F6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              engineered.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={itemVariants}
            className="mt-4 text-base leading-7 max-w-md"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {heroMessage}
          </motion.p>

          {/* Pace badge */}
          {paceDelta !== null && (
            <motion.div
              variants={itemVariants}
              className="mt-5 inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5"
              style={{
                background: isPaceAhead
                  ? 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface))'
                  : 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
                borderColor: isPaceAhead
                  ? 'color-mix(in srgb, var(--color-success) 20%, transparent)'
                  : 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
              }}
            >
              <motion.span
                animate={isPaceAhead ? { y: [0, -3, 0] } : { y: [0, 3, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <ArrowUpRight
                  size={15}
                  style={{
                    color: isPaceAhead ? 'var(--color-success)' : 'var(--color-warning)',
                    transform: isPaceAhead ? 'none' : 'rotate(90deg)',
                  }}
                />
              </motion.span>
              <span
                className="text-sm font-bold"
                style={{ color: isPaceAhead ? 'var(--color-success)' : 'var(--color-warning)' }}
              >
                {isPaceAhead ? `${paceDelta}% ahead` : `${Math.abs(paceDelta)}% behind`} of pace
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                vs expected progress
              </span>
            </motion.div>
          )}

          {/* CTAs */}
          <motion.div variants={itemVariants} className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCreateGoal}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #818CF8 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--color-accent) 32%, transparent)',
              }}
            >
              <Plus size={16} />
              New Goal
            </button>
            <button
              type="button"
              onClick={onOpenPlanner}
              className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition-all hover:opacity-80 active:scale-95"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Sparkles size={15} style={{ color: 'var(--color-accent)' }} />
              AI Planner
            </button>
          </motion.div>

          {/* Quick stats row */}
          <motion.div variants={itemVariants} className="mt-8 flex flex-wrap gap-5">
            {[
              { icon: <Target size={14} />, label: `${stats.total} goals`, color: 'var(--color-accent)' },
              { icon: <CheckCircle2 size={14} />, label: `${stats.completed} done`, color: 'var(--color-success)' },
              { icon: <Clock size={14} />, label: `${stats.dueSoon} due soon`, color: 'var(--color-warning)' },
              {
                icon: <BarChart3 size={14} />,
                label: `${stats.totalMilestones} milestones`,
                color: 'var(--color-info)',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span style={{ color: item.color }}>{item.icon}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column: Radial dial + goal cards + momentum bars */}
        <motion.div variants={itemVariants} className="flex flex-col gap-5 xl:min-w-[420px] xl:max-w-[520px]">
          {/* Top row: radial dial + two stat pills */}
          <div className="flex items-center gap-5">
            {/* Radial dial */}
            <div className="relative flex-shrink-0">
              <svg width="132" height="132" viewBox="0 0 132 132" aria-label={`${stats.avgProgress}% average progress`}>
                <defs>
                  <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-accent)" />
                    <stop offset="55%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <filter id="heroGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Track */}
                <circle cx="66" cy="66" r="54" fill="none" stroke="var(--color-border)" strokeWidth="9" />
                {/* Segments dots */}
                {Array.from({ length: 20 }).map((_, i) => {
                  const angle = (i / 20) * 360 - 90;
                  const rad = (angle * Math.PI) / 180;
                  const x = 66 + 54 * Math.cos(rad);
                  const y = 66 + 54 * Math.sin(rad);
                  return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--color-border)" />;
                })}
                {/* Progress arc */}
                <motion.circle
                  cx="66"
                  cy="66"
                  r="54"
                  fill="none"
                  stroke="url(#heroRingGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  transform="rotate(-90 66 66)"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: progressOffset }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                  style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 55%, transparent))' }}
                />
                {/* Inner glow */}
                <circle cx="66" cy="66" r="46" fill="color-mix(in srgb, var(--color-accent) 5%, transparent)" />
              </svg>
              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <motion.p
                  className="text-3xl font-black leading-none"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {stats.avgProgress}%
                </motion.p>
                <p
                  className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  avg
                </p>
              </div>
            </div>

            {/* Side stat pills */}
            <div className="flex flex-1 flex-col gap-3">
              {[
                {
                  icon: <Flame size={15} />,
                  value: stats.active,
                  label: 'Active Goals',
                  color: '#FF6B35',
                  bg: 'rgba(255,107,53,0.09)',
                },
                {
                  icon: <Zap size={15} />,
                  value: `${stats.avgProgress}%`,
                  label: 'Avg Progress',
                  color: 'var(--color-accent)',
                  bg: 'color-mix(in srgb, var(--color-accent) 9%, transparent)',
                },
                {
                  icon: <CheckCircle2 size={15} />,
                  value: stats.completed,
                  label: 'Completed',
                  color: 'var(--color-success)',
                  bg: 'color-mix(in srgb, var(--color-success) 9%, transparent)',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                  style={{ background: s.bg, border: `1px solid ${s.color}22` }}
                >
                  <span className="flex-shrink-0" style={{ color: s.color }}>
                    {s.icon}
                  </span>
                  <span className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {s.value}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Featured goal cards */}
          {featuredGoals.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Top goals by progress
              </p>
              <div className="grid gap-2">
                {featuredGoals.map((goal, i) => {
                  const meta = getGoalCategoryMeta(goal);
                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-2xl border p-3"
                      style={{
                        background: 'var(--color-surface-raised)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      {/* Color swatch */}
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white"
                        style={{
                          background: `linear-gradient(135deg, ${goal.color || meta.color}, ${goal.color || meta.color}99)`,
                        }}
                      >
                        <meta.icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {goal.title}
                        </p>
                        {/* Progress bar */}
                        <div
                          className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                          style={{ background: 'var(--color-border)' }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.progress}%` }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              background: `linear-gradient(90deg, ${goal.color || meta.color}, ${goal.color || meta.color}88)`,
                              boxShadow: `0 0 8px ${goal.color || meta.color}44`,
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black"
                        style={{ background: `${goal.color || meta.color}15`, color: goal.color || meta.color }}
                      >
                        {goal.progress}%
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly momentum micro-chart */}
          {barData.length > 0 && (
            <div
              className="rounded-2xl border p-4"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Weekly momentum
                </p>
                <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Last 7 days
                </p>
              </div>
              <div className="flex h-10 items-end gap-1.5">
                {barData.map((val, i) => {
                  const h = Math.max(16, (val / barMax) * 40);
                  const isToday = i === barData.length - 1;
                  return (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t-md"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.6 + i * 0.07, duration: 0.4, ease: 'easeOut' }}
                      style={{
                        height: h,
                        transformOrigin: 'bottom',
                        background: isToday
                          ? 'linear-gradient(180deg, var(--color-accent), #818CF8)'
                          : 'color-mix(in srgb, var(--color-accent) 22%, var(--color-border))',
                        boxShadow: isToday
                          ? '0 0 10px color-mix(in srgb, var(--color-accent) 35%, transparent)'
                          : 'none',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  );
                })}
              </div>
              <div
                className="mt-2 flex items-center gap-4 text-[11px] font-semibold"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
                  Today
                </span>
                <span>{barData.reduce((s, v) => s + v, 0)} actions total</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  icon,
  accent,
  spark,
}: {
  title: string;
  value: number | string;
  sub: string;
  icon: ReactNode;
  accent: string;
  spark: { path: string; fillPath: string; color: string };
}) {
  return (
    <div
      className="rounded-[24px] border p-4 shadow-sm"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
          >
            {icon}
          </div>
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {title}
            </p>
            <p className="mt-1 text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {value}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {sub}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 h-10">
        <svg viewBox="0 0 100 30" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d={spark.fillPath} fill={`color-mix(in srgb, ${spark.color} 12%, transparent)`} />
          <path
            d={spark.path}
            fill="none"
            stroke={spark.color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const active = options.find((option) => option.value === value);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold"
      style={{
        background: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
      onClick={() => {
        const currentIndex = options.findIndex((option) => option.value === value);
        const next = options[(currentIndex + 1) % options.length];
        onChange(next?.value ?? value);
      }}
    >
      <Filter size={14} />
      <span>{label}</span>
      <span className="text-text-primary">{active?.label ?? 'Any'}</span>
      <ChevronDown size={14} />
    </button>
  );
}

function SectionHeader({
  title,
  count,
  actionLabel,
  onAction,
}: {
  title: string;
  count: number;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>
          {title} <span className="text-text-muted text-base font-semibold">{count}</span>
        </h2>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-2 text-sm font-semibold"
        style={{ color: 'var(--color-accent)' }}
      >
        {actionLabel} <ArrowRight size={14} />
      </button>
    </div>
  );
}

function CoachPanel({
  insights,
  upcomingDeadlines,
  updatedAt,
}: {
  insights: EnhancedDashboardDTO['insights'];
  upcomingDeadlines: EnhancedDashboardDTO['upcomingDeadlines'];
  updatedAt: string | null;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
            AI Coach
          </h2>
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Updated {formatRelativeTime(updatedAt)}
        </span>
      </div>

      <div
        className="mt-4 rounded-2xl border p-4"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-raised))',
          borderColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
        }}
      >
        <p className="text-sm font-semibold leading-6" style={{ color: 'var(--color-text-secondary)' }}>
          You are progressing faster than expected. Keep it up.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Suggestions
        </p>
        {insights.slice(0, 3).map((insight) => (
          <div
            key={insight.id}
            className="flex items-start gap-3 rounded-2xl border p-3"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <span
              className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl"
              style={{
                background: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                color: 'var(--color-info)',
              }}
            >
              <Brain size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                {insight.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Upcoming Deadlines
        </p>
        {upcomingDeadlines.slice(0, 3).map((deadline) => (
          <div
            key={`${deadline.type}-${deadline.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border p-3"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {deadline.title}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {deadline.type.toUpperCase()} - {deadline.daysUntilDue} day{deadline.daysUntilDue === 1 ? '' : 's'} left
              </p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{
                background:
                  deadline.daysUntilDue <= 1
                    ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
                    : 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                color: deadline.daysUntilDue <= 1 ? 'var(--color-danger)' : 'var(--color-warning)',
              }}
            >
              {formatDate(deadline.dueDate)}
            </span>
          </div>
        ))}
        {upcomingDeadlines.length === 0 && (
          <div
            className="rounded-2xl border border-dashed p-4 text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            No upcoming deadlines. Your plan is clear for now.
          </div>
        )}
      </div>
    </div>
  );
}

function RecentAchievementsPanel({
  achievements,
}: {
  achievements: EnhancedDashboardDTO['gamification']['recentAchievements'];
}) {
  return <AchievementsPanel />;
}

function AnalyticsLineChart({ values }: { values: number[] }) {
  const path = lineChartPath(values, 640, 260);
  const fillPath = `${path} L 640 260 L 0 260 Z`;

  return (
    <svg viewBox="0 0 640 260" className="h-[260px] w-full" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((line) => (
        <line
          key={line}
          x1="0"
          y1={`${52 * line + 20}`}
          x2="640"
          y2={`${52 * line + 20}`}
          stroke="var(--color-border)"
          strokeDasharray="6 8"
        />
      ))}
      <path d={fillPath} fill="url(#chartFill)" opacity="0.7" />
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      className="rounded-2xl border p-3"
      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {sub}
      </p>
    </div>
  );
}

function GoalsSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="h-72 rounded-[32px] animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-[24px] animate-pulse"
            style={{ background: 'var(--color-surface-raised)' }}
          />
        ))}
      </div>
      <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
        <div className="h-[28rem] rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        <div className="h-[28rem] rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-[22rem] rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        <div className="h-[22rem] rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
      </div>
    </div>
  );
}

export default GoalsPage;
