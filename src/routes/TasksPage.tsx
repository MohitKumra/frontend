import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  LayoutList,
  Columns3,
  Search,
  Keyboard,
} from 'lucide-react';
import { useTasks, useUpdateTask, useDeleteTask } from '../features/tasks/hooks/useTasks';
import { tasksApi } from '../features/tasks/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskBoardView } from '../components/tasks/TaskBoardView';
import { TaskCard, isOverdue, isToday } from '../components/tasks/TaskCard';
import { OverdueBanner } from '../components/tasks/OverdueBanner';
import { DailyWorkloadMeter } from '../components/tasks/DailyWorkloadMeter';
import { TasksEmptyState } from '../components/tasks/TasksEmptyState';
import { useTaskKeyboardShortcuts } from '../hooks/useTaskKeyboardShortcuts';
import type { TaskDTO, TaskStatus } from '../types';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';
type ViewMode = 'list' | 'board';

interface TravelStyle extends React.CSSProperties {
  '--start-x'?: string;
  '--start-y'?: string;
  '--end-x'?: string;
  '--end-y'?: string;
  '--end-scale'?: string;
}

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  return d > today && d <= weekFromNow;
}

// ── component ──────────────────────────────────────────────────────────────

export function TasksPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [taskMenuOpen, setTaskMenuOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set<string>());
  const [bulkAction, setBulkAction] = useState<'done' | 'todo' | 'delete' | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Traveling highlight refs for filter tabs
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Record<TaskFilter, HTMLButtonElement | null>>({
    all: null, today: null, upcoming: null, completed: null, overdue: null,
  });
  const prevActiveRect = useRef<DOMRect | null>(null);
  const [travelStyle, setTravelStyle] = useState<TravelStyle | null>(null);
  const [travelKey, setTravelKey] = useState(0);

  const { data: tasksData, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = tasksData?.data ?? [];
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

  // ── filter helpers ───────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    all:       tasks.length,
    today:     tasks.filter((t) => isToday(t.dueDate) && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    upcoming:  tasks.filter((t) => isUpcoming(t.dueDate) && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    completed: tasks.filter((t) => t.status === 'DONE').length,
    overdue:   tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
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
  }, [tasks, filter, searchQuery]);

  const overdueTasks = useMemo(() => tasks.filter((t) => isOverdue(t.dueDate, t.status)), [tasks]);

  // ── selection ────────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => setSelectedTaskIds(new Set<string>()), []);

  const visibleSelectedTasks = useMemo(
    () => filteredTasks.filter((t) => selectedTaskIds.has(t.id)),
    [filteredTasks, selectedTaskIds],
  );

  const allVisibleSelected = filteredTasks.length > 0 && visibleSelectedTasks.length === filteredTasks.length;

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
    if (confirm('Delete this task?')) {
      deleteTask.mutate(id);
      setTaskMenuOpen(null);
    }
  }, [deleteTask]);

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
    if (overdueTasks.length === 0) return;
    const top = [...overdueTasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))[0];
    setEditingTask(top);
  }, [overdueTasks]);

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
    if (!confirm(`Delete ${visibleSelectedTasks.length} selected task${visibleSelectedTasks.length !== 1 ? 's' : ''}?`)) return;
    setBulkAction('delete');
    try {
      await Promise.all(visibleSelectedTasks.map((t) => tasksApi.delete(t.id)));
      await invalidateTasks();
      clearSelection();
    } finally { setBulkAction(null); }
  };

  // ── traveling highlight for filter tabs ──────────────────────────────────

  const handleFilterClick = (f: TaskFilter) => {
    if (f === filter) return;
    const oldBtn = filterRefs.current[filter];
    prevActiveRect.current = oldBtn ? oldBtn.getBoundingClientRect() : null;
    setFilter(f);
  };

  useEffect(() => {
    const newBtn = filterRefs.current[filter];
    const prevRect = prevActiveRect.current;
    if (newBtn && prevRect) {
      const newRect = newBtn.getBoundingClientRect();
      const startX = prevRect.left + prevRect.width / 2;
      const startY = prevRect.top + prevRect.height / 2;
      const endX = newRect.left + newRect.width / 2;
      const endY = newRect.top + newRect.height / 2;
      const baseSize = 20;
      setTravelStyle({
        left: 0,
        top: 0,
        width: baseSize,
        height: baseSize,
        marginLeft: -baseSize / 2,
        marginTop: -baseSize / 2,
        background: 'var(--gradient-accent)',
        '--start-x': `${startX}px`,
        '--start-y': `${startY}px`,
        '--end-x': `${endX}px`,
        '--end-y': `${endY}px`,
        '--end-scale': `${Math.max(newRect.width, newRect.height) / baseSize}`,
      });
      setTravelKey((k) => k + 1);
      prevActiveRect.current = null;
    }
  }, [filter]);

  // ── keyboard shortcuts ───────────────────────────────────────────────────

  // First selected task (for E / Space shortcuts)
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

  // ── render ───────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingScreen />;

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-[1400px] mx-auto">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <PageHeader
            icon={<CheckSquare size={28} />}
            title="Tasks"
            subtitle={`${filteredTasks.length} visible task${filteredTasks.length !== 1 ? 's' : ''}${hasSearch ? ` for "${searchQuery.trim()}"` : ''}`}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Manage and track all your work in one place
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Keyboard shortcuts hint */}
          <button
            type="button"
            onClick={() => setShowShortcuts((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{
              background: showShortcuts ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))' : 'var(--color-surface-raised)',
              borderColor: showShortcuts ? 'var(--color-accent-border)' : 'var(--color-border)',
              color: showShortcuts ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
            title="Keyboard shortcuts"
          >
            <Keyboard size={13} />
            Shortcuts
          </button>

          {/* View switcher */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            {(['list', 'board'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={
                  view === v
                    ? { background: 'var(--gradient-accent)', color: 'white' }
                    : { color: 'var(--color-text-muted)' }
                }
              >
                {v === 'list' ? <LayoutList size={14} /> : <Columns3 size={14} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={16} />
            New Task
            <span className="ml-1 opacity-60 text-[9px] font-semibold tracking-wider hidden sm:inline">Q</span>
          </button>
        </div>
      </div>

      {/* ── Keyboard shortcuts cheatsheet ────────────────────────────── */}
      {showShortcuts && (
        <div
          className="rounded-2xl border p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          {[
            ['Q', 'New Task'],
            ['E', 'Edit selected'],
            ['Space', 'Complete selected'],
            ['/', 'Focus search'],
            ['F', 'Focus Mode'],
            ['Ctrl+Enter', 'Save form'],
          ].map(([key, action]) => (
            <div key={key} className="flex items-center gap-2">
              <kbd
                className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'monospace',
                }}
              >
                {key}
              </kbd>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{action}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Overdue Banner ────────────────────────────────────────────── */}
      {overdueTasks.length > 0 && filter !== 'overdue' && (
        <OverdueBanner
          tasks={overdueTasks}
          onViewOverdue={() => setFilter('overdue')}
          onRescheduleAll={handleRescheduleAll}
          onStartHighestPriority={handleStartHighestPriority}
        />
      )}

      {/* ── Daily Workload Meter (only on 'today' or 'all' filter) ─── */}
      {(filter === 'today' || filter === 'all') && tasks.length > 0 && (
        <DailyWorkloadMeter tasks={tasks} />
      )}

      {/* ── Search + bulk controls ────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks…  ( / )"
            className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            style={{
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>

        {view === 'list' && (
          <button
            type="button"
            onClick={toggleVisibleSelection}
            disabled={filteredTasks.length === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-40"
            style={{
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────── */}
      {view === 'list' && visibleSelectedTasks.length > 0 && (
        <div
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
        </div>
      )}

      {/* ── Filter tabs — traveling highlight ─────────────────────────── */}
      <div
        ref={filterContainerRef}
        className="relative flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
      >
        {(['all', 'today', 'upcoming', 'completed', 'overdue'] as TaskFilter[]).map((f) => (
          <button
            key={f}
            ref={(el) => { filterRefs.current[f] = el; }}
            onClick={() => handleFilterClick(f)}
            className={`relative z-10 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 ${
              filter === f ? 'text-white' : 'text-text-muted hover:text-text-secondary'
            }`}
            style={filter === f ? { background: 'var(--gradient-accent)' } : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {counts[f] > 0 && (
              <span className="ml-2 opacity-80 font-semibold">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Traveling highlight portal ──────────────────────────────── */}
      {travelStyle &&
        createPortal(
          <div
            key={travelKey}
            className="filter-highlight-travel"
            style={travelStyle}
            onAnimationEnd={() => setTravelStyle(null)}
          />,
          document.body
        )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      {view === 'board' ? (
        <TaskBoardView
          tasks={filteredTasks}
          onStatusChange={changeTaskStatus}
          onEdit={setEditingTask}
          onDelete={handleDeleteTask}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTasks.map((task, index) => (
            <TaskCard
              key={task.id}
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
          ))}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <CreateTaskModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      {editingTask && (
        <EditTaskModal
          isOpen
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}