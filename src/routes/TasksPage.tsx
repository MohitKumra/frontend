import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import {
  CheckSquare,
  Plus,
  Search,
  Keyboard,
  ChevronDown,
  Zap,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Settings2,
  ListChecks,
  Columns3,
  X,
} from 'lucide-react';
import { useTasks, useUpdateTask, useDeleteTask } from '../features/tasks/hooks/useTasks';
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard';
import { tasksApi } from '../features/tasks/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { LoadingScreen } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskBoardView } from '../components/tasks/TaskBoardView';
import { TaskCard, isOverdue, isToday } from '../components/tasks/TaskCard';
import { TasksEmptyState } from '../components/tasks/TasksEmptyState';
import { useTaskKeyboardShortcuts } from '../hooks/useTaskKeyboardShortcuts';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import type { DailyAnalyticsDTO, TaskDTO, TaskStatus } from '../types';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';
type ViewMode = 'list' | 'board';
type SortKey = 'priority' | 'dueDate' | 'created';

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  return d > today && d <= weekFromNow;
}

/** Small inline trend line — no chart library needed for a 4-6 point sparkline. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const safePoints = points.length > 0 ? points : [0];
  const w = 96;
  const h = 28;
  const max = Math.max(...safePoints, 1);
  const min = Math.min(...safePoints, 0);
  const range = Math.max(max - min, 1);
  const step = w / (safePoints.length - 1 || 1);
  const coords = safePoints.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const path = `M${coords.join(' L')}`;
  const areaPath = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function sumSeries(points: number[]): number {
  return points.reduce((sum, value) => sum + value, 0);
}

function formatTrend(current: number, previous: number): string {
  if (previous <= 0) {
    if (current <= 0) return '0%';
    return '+100%';
  }
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? '+' : ''}${change}%`;
}

// ── component ──────────────────────────────────────────────────────────────

export function TasksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('priority');
  const savedTaskView = useUIStore((s) => s.taskViewPreference);
  const setTaskViewPreference = useUIStore((s) => s.setTaskViewPreference);
  const [view, setView] = useState<ViewMode>(savedTaskView);

  useEffect(() => {
    setView(savedTaskView);
  }, [savedTaskView]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [taskMenuOpen, setTaskMenuOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set<string>());
  const [bulkAction, setBulkAction] = useState<'done' | 'todo' | 'delete' | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'single'; task: TaskDTO } | { type: 'bulk'; count: number } | null>(null);

  const queryClient = useQueryClient();

  const { data: tasksData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTasks();
  const { data: dashboardSummary } = useDashboardSummary();
  const { data: dailyAnalytics } = useQuery({
    queryKey: ['analytics', 'daily', 14],
    queryFn: () => apiClient.get<DailyAnalyticsDTO[]>('/analytics/daily', { params: { days: 14 } }).then((r) => r.data),
  });
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = useMemo(() => tasksData?.pages.flatMap((p) => p.data) ?? [], [tasksData]);
  const { ref: sentinelRef, inView: sentinelInView } = useInView({ 
    threshold: 0,
    rootMargin: '150px',
    triggerOnce: false,
  });

  // Prevent multiple simultaneous pagination calls
  const fetchingRef = useRef(false);
  
  useEffect(() => {
    const shouldFetch = sentinelInView && hasNextPage && !isFetchingNextPage && !fetchingRef.current;
    
    if (shouldFetch) {
      fetchingRef.current = true;
      fetchNextPage().finally(() => {
        // Small delay to prevent immediate re-trigger
        setTimeout(() => {
          fetchingRef.current = false;
        }, 500);
      });
    }
  }, [sentinelInView, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const invalidateTasks = useCallback(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }), [queryClient]);

  // ── subtask mutations ────────────────────────────────────────────────────

  const updateSubTaskMutation = useMutation({
    mutationFn: ({ taskId, subTaskId, data }: { taskId: string; subTaskId: string; data: { completed?: boolean } }) =>
      tasksApi.updateSubTask(taskId, subTaskId, data),
    onSuccess: invalidateTasks,
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to update subtask'),
  });

  const createSubTaskMutation = useMutation({
    mutationFn: ({ taskId, title, order }: { taskId: string; title: string; order: number }) =>
      tasksApi.createSubTask(taskId, { title, order }),
    onSuccess: invalidateTasks,
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to create subtask'),
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: ({ taskId, subTaskId }: { taskId: string; subTaskId: string }) =>
      tasksApi.deleteSubTask(taskId, subTaskId),
    onSuccess: invalidateTasks,
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to delete subtask'),
  });

  // ── filter + sort helpers ────────────────────────────────────────────────

  const counts = useMemo(() => ({
    all:       tasks.length,
    today:     tasks.filter((t) => isToday(t.dueDate) && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    upcoming:  tasks.filter((t) => isUpcoming(t.dueDate) && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    completed: tasks.filter((t) => t.status === 'DONE').length,
    overdue:   tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
  }), [tasks]);

  const analyticsWindow = useMemo(() => {
    const series = dailyAnalytics ?? [];
    const recent = series.slice(-7);
    const previous = series.slice(0, Math.max(0, series.length - 7));

    const recentTasks = sumSeries(recent.map((item) => item.tasksCompleted));
    const previousTasks = sumSeries(previous.map((item) => item.tasksCompleted));
    const recentFocus = sumSeries(recent.map((item) => item.focusMinutes));
    const previousFocus = sumSeries(previous.map((item) => item.focusMinutes));
    const recentSignal = sumSeries(recent.map((item) => item.tasksCompleted * 10 + item.focusMinutes + item.habitsCompleted * 8));
    const previousSignal = sumSeries(previous.map((item) => item.tasksCompleted * 10 + item.focusMinutes + item.habitsCompleted * 8));

    return {
      recent,
      tasksTrend: formatTrend(recentTasks, previousTasks),
      focusTrend: formatTrend(recentFocus, previousFocus),
      scoreTrend: formatTrend(recentSignal, previousSignal),
      scoreSignal: recentSignal,
    };
  }, [dailyAnalytics]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = tasks.filter((task) => {
      switch (filter) {
        case 'today':     if (!(isToday(task.dueDate) && task.status !== 'DONE' && task.status !== 'CANCELLED')) return false; break;
        case 'upcoming':  if (!(isUpcoming(task.dueDate) && task.status !== 'DONE' && task.status !== 'CANCELLED')) return false; break;
        case 'completed': if (task.status !== 'DONE') return false; break;
        case 'overdue':   if (!isOverdue(task.dueDate, task.status)) return false; break;
        default: break;
      }
      if (!query) return true;
      const haystack = [
        task.title,
        task.description ?? '',
        task.priority,
        task.status,
        ...(task.subTasks?.map((s) => s.title) ?? []),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...base].sort((a, b) => {
      if (sortBy === 'priority') {
        return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

    return sorted;
  }, [tasks, filter, searchQuery, sortBy]);

  const overdueTasks = useMemo(() => tasks.filter((t) => isOverdue(t.dueDate, t.status)), [tasks]);
  const overdueMinutes = useMemo(
    () => overdueTasks.reduce((sum, t) => sum + (t.estimatedDuration ?? 0), 0),
    [overdueTasks],
  );
  const topOverdueTask = useMemo(
    () => [...overdueTasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))[0] ?? null,
    [overdueTasks],
  );

  // ── selection ────────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => setSelectedTaskIds(new Set<string>()), []);

  const visibleSelectedTasks = useMemo(
    () => filteredTasks.filter((t) => selectedTaskIds.has(t.id)),
    [filteredTasks, selectedTaskIds],
  );

  const allVisibleSelected = filteredTasks.length > 0 && visibleSelectedTasks.length === filteredTasks.length;

  // Handle taskId from URL query parameter (for notification clicks)
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks && !editingTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setEditingTask(task);
        // Clear the query parameter after opening the task
        setSearchParams({});
      }
    }
  }, [searchParams, tasks, editingTask, setSearchParams]);

  useEffect(() => { clearSelection(); }, [filter, view, searchQuery, clearSelection]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const toggleVisibleSelection = () => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filteredTasks.forEach((t) => next.delete(t.id));
      else filteredTasks.forEach((t) => next.add(t.id));
      return next;
    });
  };

  // ── task actions ─────────────────────────────────────────────────────────

  const toggleTaskStatus = useCallback((task: TaskDTO) => {
    const nextStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    updateTask.mutate({ id: task.id, data: { status: nextStatus } });
  }, [updateTask]);

  const changeTaskStatus = useCallback((task: TaskDTO, status: TaskStatus) => {
    updateTask.mutate({ id: task.id, data: { status } });
  }, [updateTask]);

  const handleDeleteTask = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setDeleteConfirmation({ type: 'single', task });
    }
  }, [tasks]);

  const handleAddSubtask = useCallback(async (taskId: string) => {
    const title = (subtaskDraft[taskId] ?? '').trim();
    if (!title) return;
    const task = tasks.find((t) => t.id === taskId);
    const orders = task?.subTasks?.map((s) => s.order) ?? [];
    const order = orders.length > 0 ? Math.max(...orders) + 1 : 0;
    try {
      await createSubTaskMutation.mutateAsync({ taskId, title, order });
      setSubtaskDraft((prev) => ({ ...prev, [taskId]: '' }));
    } catch { /* toast handled by mutation */ }
  }, [subtaskDraft, tasks, createSubTaskMutation]);

  const handleRescheduleAll = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    await Promise.all(overdueTasks.map((t) => tasksApi.update(t.id, { dueDate: today })));
    await invalidateTasks();
    toast.success(`Rescheduled ${overdueTasks.length} tasks to today`);
  }, [overdueTasks, invalidateTasks]);

  const handleStartHighestPriority = useCallback(() => {
    if (topOverdueTask) setEditingTask(topOverdueTask);
  }, [topOverdueTask]);

  // ── bulk actions ─────────────────────────────────────────────────────────

  const handleBulkStatusChange = async (status: TaskStatus) => {
    if (visibleSelectedTasks.length === 0) return;
    setBulkAction(status === 'DONE' ? 'done' : 'todo');
    try {
      await Promise.all(visibleSelectedTasks.map((t) => tasksApi.update(t.id, { status })));
      await invalidateTasks();
      clearSelection();
    } finally { setBulkAction(null); }
  };

  const handleBulkDelete = async () => {
    if (visibleSelectedTasks.length === 0) return;
    setDeleteConfirmation({ type: 'bulk', count: visibleSelectedTasks.length });
  };

  // ── confirm delete ───────────────────────────────────────────────────────

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmation) return;
    
    if (deleteConfirmation.type === 'single') {
      deleteTask.mutate(deleteConfirmation.task.id);
      setTaskMenuOpen(null);
    } else {
      setBulkAction('delete');
      const taskIds = Array.from(selectedTaskIds);
      Promise.all(taskIds.map((id) => tasksApi.delete(id))).then(() => {
        invalidateTasks();
        clearSelection();
      }).finally(() => {
        setBulkAction(null);
      });
    }
    
    setDeleteConfirmation(null);
  }, [deleteConfirmation, deleteTask, selectedTaskIds, invalidateTasks, clearSelection]);

  // ── keyboard shortcuts ───────────────────────────────────────────────────

  const firstSelected = useMemo(
    () => visibleSelectedTasks[0] ?? filteredTasks[0] ?? null,
    [visibleSelectedTasks, filteredTasks],
  );

  useTaskKeyboardShortcuts({
    onNewTask:          () => setCreateModalOpen(true),
    onEditSelected:     () => { if (firstSelected) setEditingTask(firstSelected); },
    onCompleteSelected: () => { if (firstSelected) toggleTaskStatus(firstSelected); },
    onFocusSearch:      () => searchRef.current?.focus(),
    onFocusMode:        () => { if (firstSelected) navigate(`/focus?taskId=${firstSelected.id}`); else navigate('/focus'); },
    isBlocked:          () => createModalOpen || editingTask !== null,
  });

  // ── capacity + productivity summary numbers ─────────────────────────────

  const plannedMinutesToday = useMemo(
    () =>
      tasks
        .filter((t) => isToday(t.dueDate) && t.status !== 'CANCELLED')
        .reduce((sum, t) => sum + (t.estimatedDuration ?? 0), 0),
    [tasks],
  );
  const capacityMinutes = 8 * 60;
  const capacityUsedPct = Math.min(100, Math.round((plannedMinutesToday / capacityMinutes) * 100));
  const capacityFreePct = 100 - capacityUsedPct;
  const capacityLabel = capacityUsedPct <= 40 ? 'Light Day' : capacityUsedPct <= 75 ? 'Balanced Day' : 'Heavy Day';
  const tasksScheduledToday = tasks.filter((t) => isToday(t.dueDate) && t.status !== 'CANCELLED').length;

  const sortLabel: Record<SortKey, string> = { priority: 'Priority', dueDate: 'Due date', created: 'Newest' };

  // ── render ───────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingScreen />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex min-h-full flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-5 border-b px-4 py-5 sm:px-6 xl:px-8"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-text-primary">Tasks</h1>
            <p className="mt-2 text-sm font-semibold text-text-secondary">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] ?? 'there'}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {filteredTasks.length} visible task{filteredTasks.length !== 1 ? 's' : ''}. Keep the board moving.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-[360px]">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks... ( / )"
                className="w-full rounded-2xl border py-3 pl-11 pr-4 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-2xl border p-1 shadow-sm" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => { setView('list'); setTaskViewPreference('list'); }}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all"
                  style={view === 'list' ? { background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)' } : { color: 'var(--color-text-muted)' }}
                >
                  <ListChecks size={14} />
                  List
                </button>
                <button
                  onClick={() => { setView('board'); setTaskViewPreference('board'); }}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all"
                  style={view === 'board' ? { background: 'var(--gradient-accent)', color: 'white' } : { color: 'var(--color-text-muted)' }}
                >
                  <Columns3 size={14} />
                  Board
                </button>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Plus size={18} />
                New Task
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {(['all', 'today', 'upcoming', 'completed', 'overdue'] as TaskFilter[]).map((f) => {
              const icons = {
                all: <CheckSquare size={14} />,
                today: <Zap size={14} />,
                upcoming: <Calendar size={14} />,
                completed: <CheckCircle2 size={14} />,
                overdue: <TrendingUp size={14} />,
              };
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all"
                  style={
                    filter === f
                      ? { background: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface-raised))', color: 'var(--color-accent)', boxShadow: '0 10px 22px -18px var(--color-accent)' }
                      : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }
                  }
                >
                  {icons[f]}
                  <span>{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                  <span className="font-black">{counts[f]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="hidden items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-black sm:flex"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <Keyboard size={14} />
              Shortcuts
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSortMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black whitespace-nowrap"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Sort by: {sortLabel[sortBy]}
                <ChevronDown size={13} />
              </button>
              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border shadow-lg z-20"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    {(Object.keys(sortLabel) as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setSortBy(key); setSortMenuOpen(false); }}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold transition-colors"
                        style={{
                          color: sortBy === key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                          background: sortBy === key ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                        }}
                      >
                        {sortLabel[key]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content area */}
      <motion.div variants={itemVariants} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 px-4 py-5 sm:px-6 xl:px-8">

          {/* Select all */}
          {view === 'list' && filteredTasks.length > 0 && (
          <motion.div variants={itemVariants} className="flex items-center justify-end">
              <button
                type="button"
                onClick={toggleVisibleSelection}
                className="flex items-center gap-2 text-xs font-bold shrink-0"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center border"
                  style={
                    allVisibleSelected
                      ? { background: 'var(--gradient-accent)', borderColor: 'transparent' }
                      : { borderColor: 'var(--color-border)' }
                  }
                >
                  {allVisibleSelected && <CheckSquare size={11} className="text-white" />}
                </span>
                Select All
              </button>
          </motion.div>
          )}

          {/* Bulk action bar */}
          {view === 'list' && visibleSelectedTasks.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))',
                borderColor: 'var(--color-accent-border)',
              }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {visibleSelectedTasks.length} task{visibleSelectedTasks.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Bulk changes apply to visible selected tasks only.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('DONE')}
                  disabled={bulkAction !== null}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
                  style={{ background: 'var(--color-success)' }}
                >
                  {bulkAction === 'done' ? 'Updating…' : 'Mark Done'}
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('TODO')}
                  disabled={bulkAction !== null}
                  className="px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-60 transition-all"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  {bulkAction === 'todo' ? 'Updating…' : 'Mark To Do'}
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkAction !== null}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all"
                  style={{ background: 'var(--color-danger)' }}
                >
                  {bulkAction === 'delete' ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={bulkAction !== null}
                  className="px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-60 transition-all"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}

          {/* Task list / board */}
          <motion.div variants={itemVariants}>
            {view === 'board' ? (
              <TaskBoardView
                tasks={filteredTasks}
                onStatusChange={changeTaskStatus}
                onEdit={setEditingTask}
                onDelete={handleDeleteTask}
                onViewDetails={(task) => navigate(`/tasks/${task.id}`)}
                onAddTask={() => setCreateModalOpen(true)}
                formatDueDate={(d) => {
                  if (!d) return null;
                  const date = new Date(d);
                  if (isToday(d)) return 'Today';
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                isOverdue={isOverdue}
                getRecurrenceLabel={(rule) => {
                  if (!rule) return null;
                  if (rule.includes('INTERVAL=2') && rule.includes('WEEKLY')) return 'Fortnightly';
                  if (rule.includes('INTERVAL=3') && rule.includes('MONTHLY')) return 'Quarterly';
                  if (rule.includes('FREQ=DAILY')) return 'Daily';
                  if (rule.includes('FREQ=WEEKLY')) return 'Weekly';
                  if (rule.includes('FREQ=MONTHLY')) return 'Monthly';
                  return 'Recurring';
                }}
              />
            ) : filteredTasks.length === 0 ? (
              <TasksEmptyState
                filter={filter}
                onCreateTask={() => setCreateModalOpen(true)}
                onChangeFilter={setFilter}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTasks.map((task, index) => (
                    <motion.div key={task.id} variants={itemVariants}>
                      <TaskCard
                        task={task}
                        index={index}
                        isSelected={selectedTaskIds.has(task.id)}
                        isMenuOpen={taskMenuOpen === task.id}
                        subExpanded={!!expandedSubtasks[task.id]}
                        subtaskDraft={subtaskDraft[task.id] ?? ''}
                        onToggleStatus={toggleTaskStatus}
                        onToggleSelect={toggleTaskSelection}
                        onToggleMenu={setTaskMenuOpen}
                        onToggleSubtasks={(id) => setExpandedSubtasks((prev) => ({ ...prev, [id]: !prev[id] }))}
                        onEdit={setEditingTask}
                        onDelete={handleDeleteTask}
                        onChangeStatus={changeTaskStatus}
                        onSubtaskDraftChange={(id, val) => setSubtaskDraft((prev) => ({ ...prev, [id]: val }))}
                        onAddSubtask={handleAddSubtask}
                        onToggleSubtask={(taskId, subTaskId, completed) =>
                          updateSubTaskMutation.mutate({ taskId, subTaskId, data: { completed } })
                        }
                        onDeleteSubtask={(taskId, subTaskId) =>
                          deleteSubTaskMutation.mutate({ taskId, subTaskId })
                        }
                        onFocus={(taskId) => navigate(`/focus?taskId=${taskId}`)}
                        onOpen={(taskId) => navigate(`/tasks/${taskId}`)}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Cursor pagination sentinel + loading indicator */}
                <div 
                  ref={sentinelRef} 
                  className="w-full flex items-center justify-center py-8 min-h-[100px]"
                  style={{ 
                    visibility: hasNextPage || isFetchingNextPage ? 'visible' : 'visible',
                    opacity: hasNextPage || isFetchingNextPage ? 1 : 0.6
                  }}
                >
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      <Loader2 size={16} className="animate-spin" />
                      Loading more tasks…
                    </div>
                  ) : hasNextPage ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 size={12} className="opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        Scroll to load more
                      </span>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </motion.div>

          {/* Overdue banner — sits below the task grid */}
          {overdueTasks.length > 0 && filter !== 'overdue' && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5"
              style={{
                background: 'color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))',
                borderColor: 'color-mix(in srgb, var(--color-danger) 25%, var(--color-border))',
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)', color: 'var(--color-danger)' }}
                >
                  <AlertTriangle size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''} require{overdueTasks.length === 1 ? 's' : ''} your attention
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {overdueMinutes > 0 && `Approximately ${overdueMinutes >= 60 ? `${Math.round(overdueMinutes / 60)}h` : `${overdueMinutes}m`} of work — `}
                    all lower priority.
                    {topOverdueTask && <> Top task: <span className="font-semibold">{topOverdueTask.title}</span></>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleStartHighestPriority}
                  disabled={!topOverdueTask}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: 'var(--color-danger)' }}
                >
                  Start Top Task
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleRescheduleAll}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <RotateCcw size={13} />
                  Reschedule All
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('overdue')}
                  className="px-3 py-2 text-xs font-bold underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Review All
                </button>
              </div>
            </motion.div>
          )}

          {/* Capacity + Productivity summary — one merged row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Zap size={16} style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Today's Capacity</h3>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)' }}
                >
                  {capacityLabel}
                </span>
              </div>
              <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {tasksScheduledToday} task{tasksScheduledToday !== 1 ? 's' : ''} scheduled
              </p>

              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {(plannedMinutesToday / 60).toFixed(1)}h planned of {capacityMinutes / 60}h capacity
              </p>
              <p className="text-[11px] mt-1 mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {capacityFreePct >= 50 ? 'You have plenty of room today' : 'Your day is filling up'}
              </p>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
                  <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{capacityFreePct}% free</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)' }}>
                  <div className="h-full rounded-full" style={{ width: `${capacityUsedPct}%`, background: 'var(--gradient-accent)' }} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Productivity Summary</h3>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>This Week</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Tasks Completed</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{counts.completed}</span>
                    {dashboardSummary && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                          color: 'var(--color-success)',
                        }}
                      >
                        {analyticsWindow.tasksTrend}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <Sparkline points={analyticsWindow.recent.map((item) => item.tasksCompleted)} color="var(--color-success)" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} style={{ color: 'var(--color-accent)' }} />
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Focus Time</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                      {formatMinutes(dashboardSummary?.focusMinutesTotal ?? 0)}
                    </span>
                    {dashboardSummary && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {analyticsWindow.focusTrend}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <Sparkline points={analyticsWindow.recent.map((item) => item.focusMinutes / 60)} color="var(--color-accent)" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} style={{ color: 'var(--color-warning)' }} />
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Productivity Score</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                      {(dashboardSummary?.productivityScore ?? 0)}%
                    </span>
                    {dashboardSummary && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                          color: 'var(--color-success)',
                        }}
                      >
                        {analyticsWindow.scoreTrend}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <Sparkline
                      points={analyticsWindow.recent.map((item) => item.tasksCompleted * 10 + item.focusMinutes + item.habitsCompleted * 8)}
                      color="var(--color-warning)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <CreateTaskModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      {editingTask && (
        <EditTaskModal
          isOpen
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {showShortcuts && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowShortcuts(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Keyboard shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} style={{ color: 'var(--color-text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                ['N', 'New task'],
                ['E', 'Edit selected task'],
                ['Space', 'Toggle complete'],
                ['/', 'Focus search'],
                ['F', 'Start focus mode'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                  <kbd
                    className="px-2 py-1 rounded-md text-[10px] font-bold border"
                    style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={deleteConfirmation !== null}
        onClose={() => setDeleteConfirmation(null)}
        title="Delete Task"
      >
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {deleteConfirmation?.type === 'single' ? (
              <>Are you sure you want to delete <strong>{deleteConfirmation.task.title}</strong>? This action cannot be undone.</>
            ) : deleteConfirmation?.type === 'bulk' ? (
              <>Are you sure you want to delete <strong>{deleteConfirmation.count}</strong> selected task{deleteConfirmation.count !== 1 ? 's' : ''}? This action cannot be undone.</>
            ) : null}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
