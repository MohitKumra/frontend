import { useState, useMemo, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  Calendar,
  MoreVertical,
  RefreshCw,
  LayoutList,
  Columns3,
  CheckCircle2,
  Circle,
  ChevronDown,
  X,
  Search,
  Square,
  Paperclip,
} from 'lucide-react';
import { useTasks, useUpdateTask, useDeleteTask } from '../features/tasks/hooks/useTasks';
import { tasksApi } from '../features/tasks/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskCheckbox } from '../components/tasks/TaskCheckbox';
import { TaskBoardView } from '../components/tasks/TaskBoardView';
import type { TaskDTO, TaskStatus } from '../types';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';
type ViewMode = 'list' | 'board';

const priorityConfig = {
  LOW: { color: 'info', label: 'Low' },
  MEDIUM: { color: 'warning', label: 'Medium' },
  HIGH: { color: 'danger', label: 'High' },
} as const;

const statusConfig = {
  TODO: { color: 'info', label: 'To Do' },
  IN_PROGRESS: { color: 'warning', label: 'In Progress' },
  DONE: { color: 'success', label: 'Done' },
} as const;

interface PillRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Helper to get recurrence label from RRULE
function getRecurrenceLabel(recurrenceRule: string | null): string | null {
  if (!recurrenceRule) return null;
  if (recurrenceRule.includes('FREQ=DAILY')) return 'Daily';
  if (recurrenceRule.includes('FREQ=WEEKLY')) return 'Weekly';
  if (recurrenceRule.includes('FREQ=MONTHLY')) return 'Monthly';
  if (recurrenceRule.includes('FREQ=YEARLY')) return 'Yearly';
  if (recurrenceRule.includes('INTERVAL=2') && recurrenceRule.includes('FREQ=WEEKLY')) return 'Fortnightly';
  if (recurrenceRule.includes('INTERVAL=3') && recurrenceRule.includes('FREQ=MONTHLY')) return 'Quarterly';
  return 'Recurring';
}

function getNextRecurrenceDate(task: TaskDTO): string | null {
  if (!task.recurrenceRule || !task.dueDate) return null;
  try {
    const currentDate = new Date(task.dueDate);
    const nextDate = new Date(currentDate);
    if (task.recurrenceRule.includes('FREQ=DAILY')) {
      nextDate.setDate(currentDate.getDate() + 1);
    } else if (task.recurrenceRule.includes('FREQ=WEEKLY')) {
      nextDate.setDate(currentDate.getDate() + 7);
    } else if (task.recurrenceRule.includes('FREQ=MONTHLY')) {
      nextDate.setMonth(currentDate.getMonth() + (task.recurrenceRule.includes('INTERVAL=3') ? 3 : 1));
    }
    return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

export function TasksPage() {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [taskMenuOpen, setTaskMenuOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set<string>());
  const [bulkAction, setBulkAction] = useState<'done' | 'todo' | 'delete' | null>(null);

  // Subtasks: which tasks have their subtask panel expanded, and draft text
  // for the "add subtask" inputs, keyed by task id.
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Sliding pill background for filter tabs
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Record<TaskFilter, HTMLButtonElement | null>>({
    all: null,
    today: null,
    upcoming: null,
    completed: null,
    overdue: null,
  });
  const [pillRect, setPillRect] = useState<PillRect | null>(null);
  const [pillReady, setPillReady] = useState(false);

  const { data: tasksData, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = tasksData?.data ?? [];

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  // Subtask mutations — each hits the dedicated subtask endpoint directly
  // rather than round-tripping the whole task through updateTask, so toggling
  // or adding one subtask can never clobber the others' state.
  const updateSubTaskMutation = useMutation({
    mutationFn: ({ taskId, subTaskId, data }: { taskId: string; subTaskId: string; data: { completed?: boolean; title?: string } }) =>
      tasksApi.updateSubTask(taskId, subTaskId, data),
    onSuccess: invalidateTasks,
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? 'Failed to update subtask');
    },
  });

  const createSubTaskMutation = useMutation({
    mutationFn: ({ taskId, title, order }: { taskId: string; title: string; order: number }) =>
      tasksApi.createSubTask(taskId, { title, order }),
    onSuccess: invalidateTasks,
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? 'Failed to create subtask');
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: ({ taskId, subTaskId }: { taskId: string; subTaskId: string }) =>
      tasksApi.deleteSubTask(taskId, subTaskId),
    onSuccess: invalidateTasks,
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message ?? 'Failed to delete subtask');
    },
  });

  const getNextSubTaskOrder = useCallback((task: TaskDTO) => {
    const orders = task.subTasks?.map((subTask) => subTask.order) ?? [];
    return orders.length > 0 ? Math.max(...orders) + 1 : 0;
  }, []);

  const handleAddSubtask = async (taskId: string) => {
    const title = (subtaskDraft[taskId] ?? '').trim();
    if (!title) return;
    const task = tasks.find((t) => t.id === taskId);
    const order = task ? getNextSubTaskOrder(task) : 0;
    try {
      await createSubTaskMutation.mutateAsync({ taskId, title, order });
      setSubtaskDraft((prev) => ({ ...prev, [taskId]: '' }));
    } catch {
      // Toast is handled by the mutation; keep the draft so the user can retry.
    }
  };

  const toggleSubtaskPanel = (taskId: string) => {
    setExpandedSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set<string>());
  }, []);

  // Helper functions
  const isToday = (date: string | null) => {
    if (!date) return false;
    const today = new Date();
    const taskDate = new Date(date);
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  };

  const isOverdue = (date: string | null, status: string) => {
    if (!date || status === 'DONE') return false;
    return new Date(date) < new Date();
  };

  const isUpcoming = (date: string | null) => {
    if (!date) return false;
    const taskDate = new Date(date);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    return taskDate > today && taskDate <= weekFromNow;
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      switch (filter) {
        case 'today':
          if (!(isToday(task.dueDate) && task.status !== 'DONE')) return false;
          break;
        case 'upcoming':
          if (!(isUpcoming(task.dueDate) && task.status !== 'DONE')) return false;
          break;
        case 'completed':
          if (task.status !== 'DONE') return false;
          break;
        case 'overdue':
          if (!isOverdue(task.dueDate, task.status)) return false;
          break;
        default:
          break;
      }

      if (!query) return true;

      const haystack = [
        task.title,
        task.description ?? '',
        task.priority,
        task.status,
        task.recurrenceRule ?? '',
        task.attachmentUrl ?? '',
        ...(task.subTasks?.map((subTask) => subTask.title) ?? []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [tasks, filter, searchQuery]);

  useEffect(() => {
    clearSelection();
  }, [filter, view, searchQuery, clearSelection]);

  const visibleSelectedTasks = useMemo(
    () => filteredTasks.filter((task) => selectedTaskIds.has(task.id)),
    [filteredTasks, selectedTaskIds]
  );

  const allVisibleSelected = filteredTasks.length > 0 && visibleSelectedTasks.length === filteredTasks.length;

  const toggleVisibleSelection = () => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredTasks.forEach((task) => next.delete(task.id));
      } else {
        filteredTasks.forEach((task) => next.add(task.id));
      }
      return next;
    });
  };

  const handleBulkStatusChange = async (status: TaskStatus) => {
    if (visibleSelectedTasks.length === 0) return;
    setBulkAction(status === 'DONE' ? 'done' : 'todo');
    try {
      await Promise.all(
        visibleSelectedTasks.map((task) => tasksApi.update(task.id, { status }))
      );
      await invalidateTasks();
      clearSelection();
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkDelete = async () => {
    if (visibleSelectedTasks.length === 0) return;
    if (!confirm(`Delete ${visibleSelectedTasks.length} selected task${visibleSelectedTasks.length === 1 ? '' : 's'}?`)) {
      return;
    }

    setBulkAction('delete');
    try {
      await Promise.all(visibleSelectedTasks.map((task) => tasksApi.delete(task.id)));
      await invalidateTasks();
      clearSelection();
      setTaskMenuOpen(null);
    } finally {
      setBulkAction(null);
    }
  };

  // Count by filter
  const counts = {
    all: tasks.length,
    today: tasks.filter((t) => isToday(t.dueDate) && t.status !== 'DONE').length,
    upcoming: tasks.filter((t) => isUpcoming(t.dueDate) && t.status !== 'DONE').length,
    completed: tasks.filter((t) => t.status === 'DONE').length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
  };

  const measurePill = useCallback((f: TaskFilter) => {
    const btn = filterRefs.current[f];
    if (!btn) return;
    setPillRect({
      left: btn.offsetLeft,
      top: btn.offsetTop,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
    });
    setPillReady(true);
  }, []);

  useLayoutEffect(() => {
    measurePill(filter);
  }, [filter, measurePill]);

  useLayoutEffect(() => {
    const handleResize = () => measurePill(filter);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [filter, measurePill]);

  const toggleTaskStatus = (task: TaskDTO) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    updateTask.mutate({ id: task.id, data: { status: nextStatus } });
  };

  const changeTaskStatus = (task: TaskDTO, status: TaskStatus) => {
    updateTask.mutate({ id: task.id, data: { status } });
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(id);
      setTaskMenuOpen(null);
    }
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isToday(dateStr)) return 'Today';
    if (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    ) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const isPillDanger = filter === 'overdue';
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-[1400px] mx-auto">
      {/* Premium Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="pb-6">
          <PageHeader
            icon={<CheckSquare size={28} />}
            title="Tasks"
            subtitle={`${filteredTasks.length} visible task${filteredTasks.length === 1 ? '' : 's'}${hasSearch ? ` for "${searchQuery.trim()}"` : ''}`}
          />
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
            Manage and track all your work in one place
          </p>
        </div>

        <div className="flex items-center gap-2 pb-6 sm:pb-0">
          {/* View Switcher */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={
                view === 'list'
                  ? { background: 'var(--gradient-accent)', color: 'white' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              <LayoutList size={14} /> List
            </button>
            <button
              onClick={() => setView('board')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={
                view === 'board'
                  ? { background: 'var(--gradient-accent)', color: 'white' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              <Columns3 size={14} /> Board
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {counts.overdue > 0 && filter !== 'overdue' && (
        <div
          className="border rounded-2xl p-5 sm:p-6 shadow-sm animate-fade-in backdrop-blur-sm"
          style={{
            background: 'color-mix(in srgb, var(--color-danger) 5%, var(--color-surface))',
            borderColor: 'var(--color-danger)',
            borderWidth: '1.5px',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--icon-bg-danger)',
                color: 'var(--icon-text-danger)',
              }}
            >
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--color-danger)' }}>
                Overdue Tasks Alert
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                You have{' '}
                <span className="font-bold" style={{ color: 'var(--color-danger)' }}>
                  {counts.overdue} overdue {counts.overdue === 1 ? 'task' : 'tasks'}
                </span>{' '}
                that need your attention. Address them to stay on track.
              </p>
            </div>
            <button
              onClick={() => setFilter('overdue')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 shrink-0 whitespace-nowrap"
              style={{ background: 'var(--color-danger)' }}
            >
              View Tasks
            </button>
          </div>
        </div>
      )}

      {/* Search + bulk actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="relative flex-1"
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, description, subtasks, attachments..."
            className="w-full rounded-xl border pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            style={{
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            disabled={!hasSearch}
            className="px-4 py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Clear Search
          </button>

          {view === 'list' && (
            <button
              type="button"
              onClick={toggleVisibleSelection}
              disabled={filteredTasks.length === 0}
              className="px-4 py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {allVisibleSelected ? 'Deselect Visible' : 'Select Visible'}
            </button>
          )}
        </div>
      </div>

      {view === 'list' && visibleSelectedTasks.length > 0 && (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border p-4 shadow-sm"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))',
            borderColor: 'var(--color-accent-border)',
          }}
        >
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {visibleSelectedTasks.length} task{visibleSelectedTasks.length === 1 ? '' : 's'} selected
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Bulk changes apply only to the tasks currently visible in this view.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkStatusChange('DONE')}
              disabled={bulkAction !== null}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'var(--color-success)' }}
            >
              {bulkAction === 'done' ? 'Updating...' : 'Mark Done'}
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusChange('TODO')}
              disabled={bulkAction !== null}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-60"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {bulkAction === 'todo' ? 'Updating...' : 'Mark To Do'}
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkAction !== null}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'var(--color-danger)' }}
            >
              {bulkAction === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkAction !== null}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-60"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs — sliding pill background */}
      <div
        ref={filterContainerRef}
        className="relative flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
      >
        {pillRect && (
          <div
            className="absolute rounded-xl shadow-md pointer-events-none"
            style={{
              left: pillRect.left,
              top: pillRect.top,
              width: pillRect.width,
              height: pillRect.height,
              background: isPillDanger ? 'var(--color-danger)' : 'var(--gradient-accent)',
              opacity: pillReady ? 1 : 0,
              transition:
                'left 300ms cubic-bezier(0.16, 1, 0.3, 1), top 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1), height 300ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease, opacity 150ms ease',
              zIndex: 0,
            }}
          />
        )}

        {(['all', 'today', 'upcoming', 'completed', 'overdue'] as TaskFilter[]).map((f) => {
          const count = counts[f];
          const isActive = filter === f;

          return (
            <button
              key={f}
              ref={(el) => { filterRefs.current[f] = el; }}
              onClick={() => setFilter(f)}
              className={`relative z-10 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-text-muted hover:text-text-secondary'
              }`}
              style={
                isActive
                  ? undefined
                  : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }
              }
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {count > 0 && (
                <span className="ml-2 opacity-80 font-semibold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tasks by View */}
      {view === 'board' ? (
        <TaskBoardView
          tasks={filteredTasks}
          onStatusChange={changeTaskStatus}
          onEdit={setEditingTask}
          onDelete={handleDeleteTask}
          formatDueDate={formatDueDate}
          isOverdue={isOverdue}
          getRecurrenceLabel={getRecurrenceLabel}
        />
      ) : filteredTasks.length === 0 ? (
        <Card variant="default" className="p-16 text-center border-2" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
          >
            <CheckSquare size={40} />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-3">No tasks found</h3>
          <p className="text-sm text-text-muted mb-8">
            {filter === 'all' ? 'Get started by creating your first task' : `No ${filter} tasks at the moment`}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 inline-flex items-center gap-2"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Plus size={18} />
              Create Task
            </button>
          )}
        </Card>
      ) : (
        /* Enterprise-style list view with inline subtasks */
        <div className="space-y-3">
          {filteredTasks.map((task, index) => {
            const dueDate = formatDueDate(task.dueDate);
            const overdue = isOverdue(task.dueDate, task.status);
            const today = isToday(task.dueDate);
            const done = task.status === 'DONE';
            const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
            const nextRecurrence = getNextRecurrenceDate(task);
            const subTotal = task.subTasks?.length ?? 0;
            const subDone = task.subTasks?.filter((s) => s.completed).length ?? 0;
            const subPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;
            const subExpanded = !!expandedSubtasks[task.id];
            const isSelected = selectedTaskIds.has(task.id);
            const priorityAccent =
              task.priority === 'HIGH'
                ? 'var(--color-danger)'
                : task.priority === 'MEDIUM'
                ? 'var(--color-warning)'
                : 'var(--color-info)';

            return (
              <Card
                key={task.id}
                variant="default"
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-md"
                style={{
                  borderColor: isSelected ? 'var(--color-accent-border)' : 'var(--color-border)',
                  background: done
                    ? 'color-mix(in srgb, var(--color-success) 3%, var(--color-surface))'
                    : isSelected
                    ? 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))'
                    : 'var(--color-surface)',
                  animation: `fade-in 0.3s ease-out both`,
                  animationDelay: `${index * 30}ms`,
                }}
              >
                {/* Full-height priority/status accent bar */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-[3px]"
                  style={{ background: done ? 'var(--color-success)' : priorityAccent }}
                />

                <div className="pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-4">
                  <div className="flex items-start gap-3.5">
                    {/* Completion control */}
                    <div className="pt-0.5 shrink-0">
                      <TaskCheckbox checked={done} onToggle={() => toggleTaskStatus(task)} />
                    </div>

                    {/* Main content column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3
                              className="text-sm font-bold leading-tight transition-colors duration-300"
                              style={{
                                color: done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                                textDecorationLine: done ? 'line-through' : 'none',
                                textDecorationColor: 'var(--color-success)',
                                textDecorationThickness: '1.5px',
                              }}
                            >
                              {task.title}
                            </h3>
                            {recurrenceLabel && (
                              <div
                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                                style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}
                              >
                                <RefreshCw size={10} />
                                <span>{recurrenceLabel}</span>
                                {nextRecurrence && <span className="opacity-70">· Next {nextRecurrence}</span>}
                              </div>
                            )}
                          </div>

                          {task.description && (
                            <p
                              className="text-xs mt-1.5 line-clamp-2 leading-relaxed transition-colors duration-300"
                              style={{ color: done ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}
                            >
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Actions cluster */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleTaskSelection(task.id)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{
                              color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                              background: isSelected ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent',
                              opacity: isSelected ? 1 : 0.45,
                            }}
                            aria-label={isSelected ? 'Deselect task' : 'Select task'}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setTaskMenuOpen(taskMenuOpen === task.id ? null : task.id)}
                              className="p-1.5 rounded-lg transition-all opacity-45 hover:opacity-100"
                              style={{ color: 'var(--color-text-muted)' }}
                              aria-label="Task actions"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {taskMenuOpen === task.id && (
                              <div
                                className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-lg z-10 py-2 animate-scale-in"
                                style={{
                                  background: 'var(--color-surface-raised)',
                                  border: '1px solid var(--color-border)',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setTaskMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-xs font-semibold transition-all flex items-center gap-3 hover:pl-5"
                                  style={{ color: 'var(--color-text-primary)' }}
                                >
                                  <Edit3 size={14} />
                                  Edit Task
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="w-full px-4 py-2.5 text-left text-xs font-semibold transition-all flex items-center gap-3 hover:pl-5"
                                  style={{ color: 'var(--color-danger)' }}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Meta chips row */}
                      <div className="flex items-center flex-wrap gap-2 mt-3">
                        <Badge
                          variant={priorityConfig[task.priority].color}
                          size="sm"
                          className="inline-flex items-center gap-1 font-semibold text-xs"
                        >
                          {task.priority === 'HIGH' ? '🚩 ' : task.priority === 'MEDIUM' ? '📌 ' : '📋 '}
                          {priorityConfig[task.priority].label}
                        </Badge>

                        {task.status !== 'TODO' && (
                          <Badge
                            variant={statusConfig[task.status].color}
                            size="sm"
                            className="inline-flex items-center gap-1 font-semibold text-xs"
                          >
                            {statusConfig[task.status].label}
                          </Badge>
                        )}

                        {task.dueDate && (
                          <div
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                            style={{
                              color: overdue
                                ? 'var(--color-danger)'
                                : today
                                ? 'var(--color-warning)'
                                : 'var(--color-text-muted)',
                              background: overdue
                                ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                                : today
                                ? 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
                                : 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
                            }}
                          >
                            <Calendar size={12} />
                            <span>{dueDate}</span>
                            {overdue && <span className="opacity-75">• Overdue</span>}
                          </div>
                        )}

                        {task.attachmentUrl && (
                          <a
                            href={task.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:shadow-sm"
                            style={{
                              color: 'var(--color-text-secondary)',
                              background: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
                            }}
                          >
                            <Paperclip size={12} />
                            <span>Attachment</span>
                          </a>
                        )}
                      </div>

                      {/* Subtasks */}
                      <div
                        className="mt-3.5 rounded-xl border overflow-hidden"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSubtaskPanel(task.id)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:brightness-95"
                          style={{ background: 'var(--color-surface-raised)' }}
                        >
                          <ChevronDown
                            size={14}
                            className="shrink-0 transition-transform duration-200"
                            style={{
                              color: 'var(--color-text-muted)',
                              transform: subExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            }}
                          />

                          <span
                            className="text-[11px] font-bold shrink-0"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            Subtasks
                          </span>

                          {subTotal > 0 ? (
                            <>
                              <span
                                className="relative flex-1 max-w-[120px] h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'color-mix(in srgb, var(--color-text-muted) 18%, transparent)' }}
                              >
                                <span
                                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${subPct}%`,
                                    background: subPct === 100 ? 'var(--color-success)' : 'var(--color-accent)',
                                  }}
                                />
                              </span>
                              <span
                                className="text-[11px] font-bold shrink-0 ml-auto"
                                style={{ color: subPct === 100 ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                              >
                                {subDone}/{subTotal}
                              </span>
                            </>
                          ) : (
                            <span
                              className="text-[11px] font-medium ml-auto italic"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              No subtasks yet — add one below
                            </span>
                          )}
                        </button>

                        {subExpanded && (
                          <div
                            className="px-3.5 py-3 space-y-1"
                            style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
                          >
                            {task.subTasks?.map((subTask) => (
                              <div
                                key={subTask.id}
                                className="flex items-center gap-2.5 group/sub py-1 -mx-1.5 px-1.5 rounded-lg hover:bg-black/[0.02]"
                              >
                                <button
                                  type="button"
                                  onClick={() => updateSubTaskMutation.mutate({
                                    taskId: task.id,
                                    subTaskId: subTask.id,
                                    data: { completed: !subTask.completed }
                                  })}
                                  className="shrink-0"
                                >
                                  {subTask.completed ? (
                                    <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                                  ) : (
                                    <Circle size={16} style={{ color: 'var(--color-border)' }} />
                                  )}
                                </button>
                                <span
                                  className="text-xs leading-tight flex-1 transition-colors"
                                  style={{
                                    color: subTask.completed ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                                    textDecorationLine: subTask.completed ? 'line-through' : 'none',
                                  }}
                                >
                                  {subTask.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deleteSubTaskMutation.mutate({ taskId: task.id, subTaskId: subTask.id })}
                                  className="shrink-0 p-1 rounded-md opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                  style={{ color: 'var(--color-danger)' }}
                                  aria-label="Delete subtask"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}

                            {/* Quick add */}
                            <div className="flex items-center gap-2 pt-1.5">
                              <Plus size={14} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                              <input
                                type="text"
                                value={subtaskDraft[task.id] ?? ''}
                                onChange={(e) => setSubtaskDraft((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubtask(task.id);
                                  }
                                }}
                                placeholder="Add a subtask and press Enter"
                                className="flex-1 text-xs font-medium bg-transparent focus:outline-none py-1"
                                style={{ color: 'var(--color-text-primary)' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {createModalOpen && (
        <CreateTaskModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}

      {editingTask && (
        <EditTaskModal
          isOpen={!!editingTask}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

export default TasksPage;