import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  formatDueDateInTimeZone,
  isOverdueInTimeZone,
  isTodayInTimeZone,
} from '../../lib/taskDateUtils';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Eye,
  Flag,
  ListChecks,
  MoreVertical,
  Paperclip,
  Pause,
  Play,
  RefreshCw,
  Timer,
  Trash2,
  X,
  CheckSquare,
  Ban,
  FolderKanban,
  ChevronDown,
} from 'lucide-react';
import type { TaskDTO, TaskStatus } from '../../types';

// ── helpers ────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function getRecurrenceLabel(rule: string | null): string | null {
  if (!rule) return null;
  if (rule.includes('INTERVAL=2') && rule.includes('WEEKLY')) return 'Fortnightly';
  if (rule.includes('INTERVAL=3') && rule.includes('MONTHLY')) return 'Quarterly';
  if (rule.includes('FREQ=DAILY')) {
    // A daily rule narrowed with BYDAY means some weekdays are skipped.
    const bydayMatch = rule.match(/BYDAY=([A-Z,]+)/);
    if (bydayMatch) {
      const included = bydayMatch[1].split(',').map((d) => d.trim());
      if (included.length > 0 && included.length < 7) {
        const ALL = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
        const SHORT: Record<string, string> = {
          MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
        };
        const skipped = ALL.filter((d) => !included.includes(d)).map((d) => SHORT[d]);
      }
    }
    return 'Daily';
  }
  if (rule.includes('FREQ=WEEKLY')) return 'Weekly';
  if (rule.includes('FREQ=MONTHLY')) return 'Monthly';
  if (rule.includes('FREQ=YEARLY')) return 'Yearly';
  return 'Recurring';
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return false;
  if (isToday(dueDate)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dueDate);
  return d < today;
}

export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  );
}

export function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isToday(dateStr)) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  ) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── status config ──────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
}

export const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  TODO: { label: 'To Do', color: 'var(--color-info)', icon: <Circle size={10} /> },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--color-warning)', icon: <Play size={10} /> },
  DONE: { label: 'Done', color: 'var(--color-success)', icon: <CheckCircle2 size={10} /> },
  CANCELLED: { label: 'Cancelled', color: 'var(--color-text-muted)', icon: <Ban size={10} /> },
};

// ── priority config ────────────────────────────────────────────────────────

export const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'var(--color-info)',
  MEDIUM: 'var(--color-warning)',
  HIGH: 'var(--color-danger)',
  CRITICAL: '#7c3aed',
};

function priorityAccent(priority: string, done: boolean, cancelled: boolean): string {
  if (done) return 'var(--color-success)';
  if (cancelled) return 'var(--color-text-muted)';
  return PRIORITY_COLOR[priority] ?? 'var(--color-info)';
}

// ── small shared bits ────────────────────────────────────────────────────────

function Chip({ children, color, icon }: { children: React.ReactNode; color: string; icon?: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-[3px] text-[9.5px] font-bold leading-none"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      {icon}
      {children}
    </span>
  );
}

// ── props ──────────────────────────────────────────────────────────────────

export interface TaskCardProps {
  task: TaskDTO;
  timeZone?: string;
  isSelected: boolean;
  isMenuOpen: boolean;
  subExpanded: boolean;
  subtaskDraft: string;
  isHighlighted?: boolean;
  onToggleStatus: (task: TaskDTO) => void;
  onToggleSelect: (taskId: string) => void;
  onToggleMenu: (taskId: string | null) => void;
  onToggleSubtasks: (taskId: string) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (taskId: string) => void;
  onChangeStatus: (task: TaskDTO, status: TaskStatus) => void;
  onSubtaskDraftChange: (taskId: string, value: string) => void;
  onAddSubtask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subTaskId: string, completed: boolean) => void;
  onDeleteSubtask: (taskId: string, subTaskId: string) => void;
  onFocus: (taskId: string) => void;
  onOpen?: (taskId: string) => void;
  index: number;
}

// ── component ──────────────────────────────────────────────────────────────

const TaskCardInner = React.forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
  {
    task,
    timeZone,
    isSelected,
    isMenuOpen,
    subExpanded,
    subtaskDraft,
    isHighlighted,
    onToggleStatus,
    onToggleSelect,
    onToggleMenu,
    onToggleSubtasks,
    onEdit,
    onDelete,
    onChangeStatus,
    onSubtaskDraftChange,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask,
    onFocus,
    onOpen,
  },
  forwardedRef
) {
  const effectiveTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  const done = task.status === 'DONE';
  const cancelled = task.status === 'CANCELLED';
  const overdue = isOverdueInTimeZone(task.dueDate, task.status, effectiveTimeZone);
  const today = isTodayInTimeZone(task.dueDate, effectiveTimeZone);
  const dueDateLabel = formatDueDateInTimeZone(task.dueDate, effectiveTimeZone);
  const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
  const duration = formatDuration(task.estimatedDuration);

  const subTotal = task.subTasks?.length ?? 0;
  const subDone = task.subTasks?.filter((s) => s.completed).length ?? 0;
  const subPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;

  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.TODO;
  const accent = priorityAccent(task.priority, done, cancelled);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // Position the portal menu relative to its trigger button
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    } else {
      setMenuPosition(null);
    }
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onToggleMenu(null);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, onToggleMenu]);

  return (
    <motion.div
      ref={forwardedRef}
      id={`task-card-${task.id}`}
      className="relative"
      style={{ zIndex: isMenuOpen ? 9997 : 1 }}
      data-task-id={task.id}
    >
      <div
        className="relative overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5"
        style={{
          borderColor: isHighlighted
            ? 'var(--color-accent)'
            : isSelected
              ? 'var(--color-accent)'
              : overdue
                ? 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))'
                : 'var(--color-border)',
          background: 'var(--color-surface)',
          transform: isHighlighted ? 'translateY(-4px)' : 'none',
          boxShadow: isHighlighted
            ? '0 8px 30px color-mix(in srgb, var(--color-accent) 30%, transparent), 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent)'
            : isSelected
              ? '0 0 0 3px color-mix(in srgb, var(--color-accent) 22%, transparent)'
              : '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {/* slim priority/status accent line replaces the old tall gradient header */}
        <div className="h-[3px] w-full" style={{ background: accent }} />

        <div className="p-3 sm:p-3.5">
          {/* Row 1 — complete toggle (circle), title, menu */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleStatus(task)}
              className="shrink-0 transition-transform hover:scale-110"
              title={done ? 'Mark as To Do' : 'Mark as Done'}
            >
              {done ? (
                <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
              ) : (
                <Circle size={20} style={{ color: 'var(--color-border-subtle)' }} strokeWidth={1.5} />
              )}
            </button>

            <button type="button" onClick={() => onOpen?.(task.id)} className="min-w-0 flex-1 text-left">
              <h3
                className="truncate text-[13px] font-bold leading-snug"
                style={{
                  color: done || cancelled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  textDecorationLine: done || cancelled ? 'line-through' : 'none',
                  textDecorationColor: done ? 'var(--color-success)' : 'var(--color-text-muted)',
                  textDecorationThickness: '1.5px',
                }}
              >
                {task.title}
              </h3>
            </button>

            <div className="relative shrink-0">
              <button
                ref={buttonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu(isMenuOpen ? null : task.id);
                }}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                aria-label="Task actions"
              >
                <MoreVertical size={16} />
              </button>

              {isMenuOpen &&
                menuPosition &&
                createPortal(
                  <>
                    <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => onToggleMenu(null)} />
                    <div
                      ref={menuRef}
                      className="fixed w-48 rounded-xl py-2"
                      style={{
                        top: `${menuPosition.top}px`,
                        right: `${menuPosition.right}px`,
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        zIndex: 9999,
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onOpen?.(task.id);
                          onToggleMenu(null);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        <Eye size={13} style={{ color: 'var(--color-accent)' }} /> View Details
                      </button>
                      <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />

                      {task.status !== 'IN_PROGRESS' && !done && !cancelled && (
                        <button
                          onClick={() => {
                            onChangeStatus(task, 'IN_PROGRESS');
                            onToggleMenu(null);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          <Play size={13} style={{ color: 'var(--color-warning)' }} /> Start Progress
                        </button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => {
                            onChangeStatus(task, 'TODO');
                            onToggleMenu(null);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          <Pause size={13} style={{ color: 'var(--color-text-muted)' }} /> Pause Progress
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onEdit(task);
                          onToggleMenu(null);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        <Edit3 size={13} /> Edit Task
                      </button>
                      <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
                      <button
                        onClick={() => {
                          onDelete(task.id);
                          onToggleMenu(null);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </>,
                  document.body
                )}
            </div>
          </div>

          {/* Row 2 — description, one line max */}
          {task.description && (
            <p
              className="mt-1 line-clamp-1 pl-[34px] text-[11px] leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {task.description}
            </p>
          )}

          {/* Row 3 — compact meta chips */}
          <div className="mt-2 flex flex-wrap items-center gap-1 pl-[34px]">
            {task.project && (
              <Chip color="var(--color-success)" icon={<FolderKanban size={9} />}>
                {task.project.name}
              </Chip>
            )}
            {task.status !== 'TODO' && (
              <Chip color={statusCfg.color} icon={statusCfg.icon}>
                {statusCfg.label}
              </Chip>
            )}
            {recurrenceLabel && (
              <Chip color="var(--color-accent)" icon={<RefreshCw size={9} />}>
                {recurrenceLabel}
              </Chip>
            )}
            <Chip
              color={PRIORITY_COLOR[task.priority] ?? 'var(--color-text-muted)'}
              icon={<Flag size={9} fill="currentColor" />}
            >
              {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
            </Chip>
            {dueDateLabel && (
              <Chip
                color={overdue ? 'var(--color-danger)' : today ? 'var(--color-warning)' : 'var(--color-text-muted)'}
                icon={<Calendar size={9} />}
              >
                {overdue ? `Overdue · ${dueDateLabel}` : dueDateLabel}
              </Chip>
            )}
          </div>

          {/* Row 4 — thin subtask progress, only if there are subtasks */}
          {subTotal > 0 && (
            <div className="mt-2.5 flex items-center gap-2 pl-[50px]">
              <div
                className="relative h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ background: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)' }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${subPct}%`, background: subPct === 100 ? 'var(--color-success)' : accent }}
                />
              </div>
              <span className="shrink-0 text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                {subDone}/{subTotal}
              </span>
            </div>
          )}

          {/* Row 5 — footer utility icons */}
          <div className="mt-2.5 flex items-center justify-between pl-[50px]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onToggleSubtasks(task.id)}
                className="flex items-center gap-1 text-[10.5px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: subTotal > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}
                title="Toggle subtasks"
              >
                <ListChecks size={12} />
                <span>{subTotal > 0 ? `${subDone}/${subTotal}` : 'Subtasks'}</span>
                <ChevronDown
                  size={11}
                  style={{ transform: subExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
              </button>

              {task.attachmentUrl && (
                <a
                  href={task.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10.5px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-accent)' }}
                  title="Open attachment"
                >
                  <Paperclip size={12} />
                </a>
              )}

              {duration && (
                <span
                  className="flex items-center gap-1 text-[10.5px] font-semibold"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Clock size={11} />
                  {duration}
                </span>
              )}
            </div>

            {!done && !cancelled && (
              <button
                type="button"
                onClick={() => onFocus(task.id)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                style={{ color: 'var(--color-accent)' }}
                title="Focus on this task"
              >
                <Timer size={12} />
                Focus
              </button>
            )}
          </div>

          {/* Subtasks expandable panel */}
          {subExpanded && (
            <div
              className="mt-2.5 space-y-1 rounded-xl border px-3 py-2.5"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              {task.subTasks?.map((subTask) => (
                <div
                  key={subTask.id}
                  className="group/sub -mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <button
                    type="button"
                    onClick={() => onToggleSubtask(task.id, subTask.id, !subTask.completed)}
                    className="shrink-0"
                  >
                    {subTask.completed ? (
                      <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <Circle size={15} style={{ color: 'var(--color-border)' }} />
                    )}
                  </button>
                  <span
                    className="flex-1 text-[11.5px] leading-tight"
                    style={{
                      color: subTask.completed ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                      textDecoration: subTask.completed ? 'line-through' : 'none',
                    }}
                  >
                    {subTask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteSubtask(task.id, subTask.id)}
                    className="shrink-0 rounded-md p-1 opacity-0 transition-opacity group-hover/sub:opacity-100"
                    style={{ color: 'var(--color-danger)' }}
                    aria-label="Delete subtask"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {subTotal === 0 && (
                <p className="py-1 text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  No subtasks yet
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={subtaskDraft}
                  onChange={(e) => onSubtaskDraftChange(task.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddSubtask(task.id);
                    }
                  }}
                  placeholder="Add a subtask…"
                  className="flex-1 bg-transparent text-[11.5px] font-medium focus:outline-none"
                  style={{ color: 'var(--color-text-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => onAddSubtask(task.id)}
                  disabled={!subtaskDraft.trim()}
                  className="rounded-md p-1 transition-opacity disabled:opacity-30"
                  style={{ color: 'var(--color-accent)' }}
                >
                  <CheckSquare size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// Wrap in React.memo so re-renders only happen when this card's own props change.
// This prevents the entire grid from re-rendering when unrelated parent state
// changes (e.g. another card's menu opens, subtask draft in a different card, etc.).
export const TaskCard = React.memo(TaskCardInner) as typeof TaskCardInner;
