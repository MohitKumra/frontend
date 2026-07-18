import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  Flag,
  Inbox,
  ListChecks,
  MoreVertical,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { TaskDTO, TaskStatus } from '../../types';

const priorityColor: Record<TaskDTO['priority'], string> = {
  LOW: 'var(--color-success)',
  MEDIUM: 'var(--color-warning)',
  HIGH: 'var(--color-danger)',
  CRITICAL: '#7c3aed',
};

const priorityLabel: Record<TaskDTO['priority'], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const columns: {
  status: TaskStatus;
  label: string;
  helper: string;
  accent: string;
  icon: typeof Circle;
  empty: string;
}[] = [
  {
    status: 'TODO',
    label: 'To Do',
    helper: 'Tasks to be started',
    accent: 'var(--color-info)',
    icon: Circle,
    empty: 'Nothing waiting here',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    helper: "Tasks you're working on",
    accent: 'var(--color-warning)',
    icon: Clock3,
    empty: 'No active task',
  },
  {
    status: 'DONE',
    label: 'Done',
    helper: 'Completed tasks',
    accent: 'var(--color-success)',
    icon: CheckCircle2,
    empty: 'No wins logged yet',
  },
];

interface TaskBoardViewProps {
  tasks: TaskDTO[];
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (id: string) => void;
  onAddTask?: (status: TaskStatus) => void;
  formatDueDate: (dateStr: string | null) => string | null;
  isOverdue: (date: string | null, status: string) => boolean;
  getRecurrenceLabel: (rule: string | null) => string | null;
}

function progressFor(task: TaskDTO) {
  const total = task.subTasks?.length ?? 0;
  if (total > 0) {
    const done = task.subTasks?.filter((subtask) => subtask.completed).length ?? 0;
    return Math.round((done / total) * 100);
  }
  if (task.status === 'DONE') return 100;
  if (task.status === 'IN_PROGRESS') return 40;
  return 0;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function TaskBoardCard({
  task,
  accent,
  dragging,
  menuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
  onStatusChange,
  formatDueDate,
  isOverdue,
  getRecurrenceLabel,
}: {
  task: TaskDTO;
  accent: string;
  dragging: boolean;
  menuOpen: boolean;
  onMenuToggle: (id: string | null) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (id: string) => void;
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  formatDueDate: (dateStr: string | null) => string | null;
  isOverdue: (date: string | null, status: string) => boolean;
  getRecurrenceLabel: (rule: string | null) => string | null;
}) {
  const isDone = task.status === 'DONE';
  const dueDate = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);
  const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
  const totalSubtasks = task.subTasks?.length ?? 0;
  const completedSubtasks = task.subTasks?.filter((subtask) => subtask.completed).length ?? 0;
  const progress = progressFor(task);
  const duration = formatDuration(task.estimatedDuration);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border bg-[var(--color-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-24px_rgba(15,23,42,0.42)]"
      style={{
        borderColor: isDone
          ? 'color-mix(in srgb, var(--color-success) 24%, var(--color-border))'
          : overdue
          ? 'color-mix(in srgb, var(--color-danger) 32%, var(--color-border))'
          : 'var(--color-border)',
        boxShadow: '0 10px 24px -22px rgba(15, 23, 42, 0.38)',
        opacity: dragging ? 0.45 : 1,
      }}
    >
      <div
        className="absolute bottom-0 left-0 top-0 w-1"
        style={{ background: isDone ? 'var(--color-success)' : overdue ? 'var(--color-danger)' : accent }}
      />

      <div className="relative p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: isDone
                ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
                : `color-mix(in srgb, ${priorityColor[task.priority]} 12%, transparent)`,
              color: isDone ? 'var(--color-success)' : priorityColor[task.priority],
            }}
          >
            {isDone ? <CheckCircle2 size={22} /> : <ListChecks size={21} />}
            {isDone && (
              <span
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2"
                style={{ background: 'var(--color-success)', borderColor: 'var(--color-surface)' }}
              >
                <CheckCircle2 size={12} className="text-white" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => onEdit(task)} className="min-w-0 text-left">
                <h4
                  className="truncate text-sm font-black leading-snug text-text-primary"
                  style={{
                    textDecorationLine: isDone ? 'line-through' : 'none',
                    color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  }}
                >
                  {task.title}
                </h4>
              </button>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => onMenuToggle(menuOpen ? null : task.id)}
                  className="rounded-lg p-1 text-text-muted opacity-60 transition-opacity hover:bg-black/[0.04] hover:opacity-100 dark:hover:bg-white/[0.05]"
                  aria-label="Task actions"
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpen && (
                  <>
                    <button className="fixed inset-0 z-20 cursor-default" onClick={() => onMenuToggle(null)} aria-label="Close task menu" />
                    <div
                      className="absolute right-0 top-8 z-30 w-40 overflow-hidden rounded-xl border py-1.5 shadow-xl"
                      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onEdit(task);
                          onMenuToggle(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <Edit3 size={13} />
                        Edit task
                      </button>
                      {task.status !== 'IN_PROGRESS' && !isDone && (
                        <button
                          type="button"
                          onClick={() => {
                            onStatusChange(task, 'IN_PROGRESS');
                            onMenuToggle(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                        >
                          <Play size={13} />
                          Start
                        </button>
                      )}
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => {
                            onStatusChange(task, 'DONE');
                            onMenuToggle(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                        >
                          <CheckCircle2 size={13} />
                          Mark done
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(task.id);
                          onMenuToggle(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-danger hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black"
                style={{
                  background: `color-mix(in srgb, ${priorityColor[task.priority]} 12%, transparent)`,
                  color: priorityColor[task.priority],
                }}
              >
                <Flag size={11} fill="currentColor" />
                {priorityLabel[task.priority]}
              </span>

              {dueDate && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
                  style={{
                    background: overdue
                      ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                      : 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
                    color: overdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
                  }}
                >
                  <Calendar size={11} />
                  {dueDate}
                </span>
              )}

              {recurrenceLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-1 text-[10px] font-bold text-accent">
                  <RefreshCw size={10} />
                  {recurrenceLabel}
                </span>
              )}

              {task.attachmentUrl && (
                <a
                  href={task.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-text-muted"
                  style={{ background: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)' }}
                >
                  <Paperclip size={10} />
                  File
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Progress</span>
            <span className="text-xs font-black" style={{ color: isDone ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
              {progress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--color-border-subtle)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: isDone ? 'var(--color-success)' : accent,
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <MetaItem icon={<ListChecks size={13} />} label="Subtasks" value={`${completedSubtasks}/${totalSubtasks}`} />
          <MetaItem icon={<Clock3 size={13} />} label="Est. time" value={duration ?? '-'} />
          <MetaItem icon={<Calendar size={13} />} label="Due" value={dueDate ?? '-'} />
        </div>

        {isDone && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black text-success" style={{ background: 'color-mix(in srgb, var(--color-success) 8%, transparent)' }}>
            <CheckCircle2 size={14} />
            Great job. Task completed.
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-text-muted">{icon}<span className="truncate text-[9px] font-bold uppercase tracking-wider">{label}</span></div>
      <p className="mt-1 truncate text-xs font-black text-text-primary">{value}</p>
    </div>
  );
}

export function TaskBoardView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  onAddTask,
  formatDueDate,
  isOverdue,
  getRecurrenceLabel,
}: TaskBoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const grouped = useMemo(
    () => columns.map((col) => ({ ...col, tasks: tasks.filter((task) => task.status === col.status) })),
    [tasks],
  );

  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
      <div className="grid min-w-[980px] grid-cols-3 gap-4 xl:min-w-0 xl:gap-5">
        {grouped.map((col) => {
          const ColumnIcon = col.icon;
          const isDragTarget = dragOverCol === col.status;

          return (
            <section
              key={col.status}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverCol(col.status);
              }}
              onDragLeave={() => setDragOverCol((current) => (current === col.status ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData('text/task-id');
                const task = tasks.find((item) => item.id === id);
                if (task && task.status !== col.status) onStatusChange(task, col.status);
                setDraggingId(null);
                setDragOverCol(null);
              }}
              className="flex min-h-[540px] flex-col rounded-3xl border p-3 transition-all duration-200"
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${col.accent} 4%, var(--color-surface-raised)) 0%, var(--color-surface-raised) 100%)`,
                borderColor: isDragTarget ? col.accent : 'var(--color-border)',
                boxShadow: isDragTarget
                  ? `0 0 0 4px color-mix(in srgb, ${col.accent} 14%, transparent)`
                  : '0 18px 38px -34px rgba(15, 23, 42, 0.34)',
              }}
            >
              <header className="px-2 pb-4 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                      style={{ color: col.accent, background: `color-mix(in srgb, ${col.accent} 12%, transparent)` }}
                    >
                      <ColumnIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-text-primary">{col.label}</h3>
                      <p className="mt-0.5 truncate text-xs font-medium text-text-muted">{col.helper}</p>
                    </div>
                  </div>
                  <span
                    className="flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-black"
                    style={{ color: col.accent, background: `color-mix(in srgb, ${col.accent} 12%, transparent)` }}
                  >
                    {col.tasks.length}
                  </span>
                </div>
                <div className="mt-4 h-1 overflow-hidden rounded-full" style={{ background: 'var(--color-border-subtle)' }}>
                  <div className="h-full w-1/4 rounded-full" style={{ background: col.accent }} />
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-3">
                {col.tasks.length === 0 && (
                  <div
                    className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    <Inbox size={22} className="opacity-45" />
                    <p className="mt-2 text-xs font-black">{isDragTarget ? 'Drop task here' : col.empty}</p>
                  </div>
                )}

                {col.tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/task-id', task.id);
                      setDraggingId(task.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TaskBoardCard
                      task={task}
                      accent={col.accent}
                      dragging={draggingId === task.id}
                      menuOpen={menuOpenId === task.id}
                      onMenuToggle={setMenuOpenId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      formatDueDate={formatDueDate}
                      isOverdue={isOverdue}
                      getRecurrenceLabel={getRecurrenceLabel}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onAddTask?.(col.status)}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: col.accent,
                }}
              >
                <Plus size={16} />
                Add Task
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
