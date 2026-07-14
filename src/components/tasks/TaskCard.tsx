import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
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
  Eye,
  UserCheck,
  AlertOctagon,
  FolderKanban,
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
  if (rule.includes('FREQ=DAILY')) return 'Daily';
  if (rule.includes('FREQ=WEEKLY')) return 'Weekly';
  if (rule.includes('FREQ=MONTHLY')) return 'Monthly';
  if (rule.includes('FREQ=YEARLY')) return 'Yearly';
  return 'Recurring';
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

export function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isToday(dateStr)) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth() && date.getFullYear() === tomorrow.getFullYear()) {
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
  TODO:        { label: 'To Do',      color: 'var(--color-info)',         icon: <Circle size={12} /> },
  IN_PROGRESS: { label: 'In Progress',color: 'var(--color-warning)',      icon: <Play size={12} /> },
  WAITING:     { label: 'Waiting',    color: '#8b5cf6',                   icon: <Clock size={12} /> },
  BLOCKED:     { label: 'Blocked',    color: 'var(--color-danger)',        icon: <AlertOctagon size={12} /> },
  IN_REVIEW:   { label: 'In Review',  color: '#0ea5e9',                   icon: <Eye size={12} /> },
  DELEGATED:   { label: 'Delegated',  color: '#f59e0b',                   icon: <UserCheck size={12} /> },
  DONE:        { label: 'Done',       color: 'var(--color-success)',       icon: <CheckCircle2 size={12} /> },
  CANCELLED:   { label: 'Cancelled',  color: 'var(--color-text-muted)',    icon: <Ban size={12} /> },
};

// ── priority config ────────────────────────────────────────────────────────

export const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'var(--color-info)',
  MEDIUM:   'var(--color-warning)',
  HIGH:     'var(--color-danger)',
  CRITICAL: '#7c3aed',
};

function priorityHeaderGradient(priority: string, done: boolean): string {
  if (done) return 'linear-gradient(135deg, var(--color-success), color-mix(in srgb, var(--color-success) 55%, black))';
  switch (priority) {
    case 'CRITICAL': return 'linear-gradient(135deg, #7c3aed, #4c1d95)';
    case 'HIGH':     return 'linear-gradient(135deg, var(--color-danger), color-mix(in srgb, var(--color-danger) 55%, black))';
    case 'MEDIUM':   return 'linear-gradient(135deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 55%, black))';
    default:         return 'linear-gradient(135deg, var(--color-info), color-mix(in srgb, var(--color-info) 55%, black))';
  }
}

// ── props ──────────────────────────────────────────────────────────────────

export interface TaskCardProps {
  task: TaskDTO;
  isSelected: boolean;
  isMenuOpen: boolean;
  subExpanded: boolean;
  subtaskDraft: string;
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

export function TaskCard({
  task,
  isSelected,
  isMenuOpen,
  subExpanded,
  subtaskDraft,
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
  index,
}: TaskCardProps) {
  const done = task.status === 'DONE';
  const cancelled = task.status === 'CANCELLED';
  const overdue = isOverdue(task.dueDate, task.status);
  const today = isToday(task.dueDate);
  const dueDateLabel = formatDueDate(task.dueDate);
  const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
  const duration = formatDuration(task.estimatedDuration);

  const subTotal = task.subTasks?.length ?? 0;
  const subDone = task.subTasks?.filter((s) => s.completed).length ?? 0;
  const subPct = subTotal > 0
    ? Math.round((subDone / subTotal) * 100)
    : done ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0;

  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.TODO;

  return (
    <div
      className="relative group/card"
      style={{
        zIndex: isMenuOpen ? 50 : 1,
        animation: 'fade-in 0.35s ease-out both',
        animationDelay: `${index * 30}ms`,
      }}
    >
      <div
        className="relative rounded-[22px] border overflow-hidden transition-all duration-300 hover:-translate-y-1"
        style={{
          borderColor: isSelected ? 'var(--color-accent)' : overdue ? 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))' : 'var(--color-border)',
          background: 'var(--color-surface)',
          boxShadow: isSelected
            ? '0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent), 0 12px 28px -12px rgba(0,0,0,0.18)'
            : overdue
            ? '0 0 0 1px color-mix(in srgb, var(--color-danger) 15%, transparent)'
            : '0 1px 2px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.boxShadow = '0 18px 34px -16px rgba(0,0,0,0.22)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.boxShadow = overdue
            ? '0 0 0 1px color-mix(in srgb, var(--color-danger) 15%, transparent)'
            : '0 1px 2px rgba(0,0,0,0.04)';
        }}
        onDoubleClick={() => onOpen?.(task.id)}
      >
        {/* Header band */}
        <div
          className="relative h-[72px] px-4 flex items-center justify-between overflow-hidden"
          style={{ background: priorityHeaderGradient(task.priority, done) }}
        >
          {/* decorative highlight */}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{ backgroundImage: 'radial-gradient(circle at 85% -20%, white 0%, transparent 55%)' }}
          />

          {/* Left: Selection checkbox + Status icon */}
          <div className="relative flex items-center gap-3">
            {/* Selection checkbox - now inline with status icon */}
            <button
              type="button"
              onClick={() => onToggleSelect(task.id)}
              className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all hover:scale-110 shrink-0"
              style={{
                background: isSelected ? 'white' : 'rgba(255,255,255,0.2)',
                borderColor: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                opacity: isSelected ? 1 : undefined,
              }}
            >
              <span className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'}`}>
                {isSelected ? (
                  <CheckCircle2 size={12} style={{ color: 'var(--color-accent)' }} />
                ) : (
                  <Circle size={12} style={{ color: 'white' }} />
                )}
              </span>
            </button>

            {/* Status icon */}
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-sm shrink-0">
              {done ? <CheckCircle2 size={18} /> : task.status === 'IN_PROGRESS' ? <Play size={16} /> : task.status === 'BLOCKED' ? <AlertOctagon size={16} /> : task.status === 'WAITING' ? <Clock size={16} /> : task.status === 'CANCELLED' ? <Ban size={16} /> : <CheckSquare size={16} />}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="relative flex items-center gap-1">
            {!done && !cancelled && (
              <button
                type="button"
                onClick={() => onFocus(task.id)}
                className="p-1.5 rounded-lg text-white/90 hover:bg-white/20 transition-all"
                title="Focus on this task"
              >
                <Timer size={15} />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => onToggleMenu(isMenuOpen ? null : task.id)}
                className="p-1.5 rounded-lg text-white/90 hover:bg-white/20 transition-all"
                aria-label="Task actions"
              >
                <MoreVertical size={16} />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 top-9 w-48 rounded-xl shadow-xl z-[60] py-2 animate-scale-in"
                  style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                >
                  {task.status !== 'IN_PROGRESS' && !done && !cancelled && (
                    <button
                      onClick={() => { onChangeStatus(task, 'IN_PROGRESS'); onToggleMenu(null); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Play size={13} style={{ color: 'var(--color-warning)' }} /> Start Progress
                    </button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => { onChangeStatus(task, 'TODO'); onToggleMenu(null); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Pause size={13} style={{ color: 'var(--color-text-muted)' }} /> Pause Progress
                    </button>
                  )}
                  {task.status !== 'WAITING' && !done && !cancelled && (
                    <button
                      onClick={() => { onChangeStatus(task, 'WAITING'); onToggleMenu(null); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Clock size={13} style={{ color: '#8b5cf6' }} /> Mark Waiting
                    </button>
                  )}
                  {task.status !== 'BLOCKED' && !done && !cancelled && (
                    <button
                      onClick={() => { onChangeStatus(task, 'BLOCKED'); onToggleMenu(null); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <AlertOctagon size={13} style={{ color: 'var(--color-danger)' }} /> Mark Blocked
                    </button>
                  )}
                  <button
                    onClick={() => { onEdit(task); onToggleMenu(null); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <Edit3 size={13} /> Edit Task
                  </button>
                  <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
                  <button
                    onClick={() => onDelete(task.id)}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-3.5 pb-4">
          {/* Title + complete toggle */}
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpen?.(task.id)}
              className="text-left flex-1"
            >
              <h3
              className="text-[13.5px] font-bold leading-snug flex-1"
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
            <button
              type="button"
              onClick={() => onToggleStatus(task)}
              className="shrink-0 mt-0.5 transition-transform hover:scale-110"
              title={done ? 'Mark as To Do' : 'Mark as Done'}
            >
              {done ? (
                <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
              ) : (
                <Circle size={18} style={{ color: 'var(--color-border)' }} />
              )}
            </button>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-[11.5px] mt-1.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {task.description}
            </p>
          )}

          {/* Status + Recurrence badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {task.project && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', color: 'var(--color-success)' }}
              >
                <FolderKanban size={9} />
                {task.project.name}
              </span>
            )}
            {task.status !== 'TODO' && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `color-mix(in srgb, ${statusCfg.color} 12%, transparent)`,
                  color: statusCfg.color,
                }}
              >
                {statusCfg.icon}
                {statusCfg.label}
              </span>
            )}

            {recurrenceLabel && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}
              >
                <RefreshCw size={9} />
                {recurrenceLabel}
              </span>
            )}

            {overdue && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: 'var(--color-danger)' }}
              >
                Overdue
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Progress</span>
              <span className="text-[11px] font-bold" style={{ color: subPct === 100 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                {subPct}%
              </span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)' }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${subPct}%`,
                  background: subPct === 100 ? 'var(--color-success)' : 'var(--gradient-accent)',
                  boxShadow: subPct > 0 ? '0 0 8px rgba(99, 102, 241, 0.4)' : 'none',
                }}
              />
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              {/* Subtasks toggle */}
              <button
                type="button"
                onClick={() => onToggleSubtasks(task.id)}
                className="flex items-center gap-1.5 text-[11px] font-semibold transition-all hover:scale-105"
                style={{ color: subTotal > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}
                title="Toggle subtasks"
              >
                <ListChecks size={14} />
                <span>{subTotal > 0 ? `${subDone}/${subTotal}` : '0'}</span>
              </button>

              {/* Attachment indicator */}
              {task.attachmentUrl && (
                <a
                  href={task.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-semibold hover:scale-105 transition-all"
                  style={{ color: 'var(--color-accent)' }}
                  title="Open attachment"
                >
                  <Paperclip size={13} />
                </a>
              )}

              {/* Duration */}
              {duration && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  <Clock size={12} />
                  <span>{duration}</span>
                </span>
              )}

              {/* Priority flag */}
              <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                <Flag size={12} style={{ color: PRIORITY_COLOR[task.priority] ?? 'var(--color-text-muted)', fill: PRIORITY_COLOR[task.priority] ?? 'none' }} />
                <span>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</span>
              </span>
            </div>

            {/* Due date badge */}
            {dueDateLabel && (
              <div
                className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
                style={{
                  color: overdue ? 'var(--color-danger)' : today ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  background: overdue
                    ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
                    : today
                    ? 'color-mix(in srgb, var(--color-warning) 12%, transparent)'
                    : 'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
                }}
              >
                <Calendar size={11} />
                <span>{dueDateLabel}</span>
              </div>
            )}
          </div>

          {/* Subtasks expandable panel */}
          {subExpanded && (
            <div
              className="mt-3 rounded-xl border px-3.5 py-3 space-y-1"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              {task.subTasks?.map((subTask) => (
                <div key={subTask.id} className="flex items-center gap-2.5 group/sub py-1 -mx-1.5 px-1.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <button type="button" onClick={() => onToggleSubtask(task.id, subTask.id, !subTask.completed)} className="shrink-0">
                    {subTask.completed ? (
                      <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <Circle size={15} style={{ color: 'var(--color-border)' }} />
                    )}
                  </button>
                  <span
                    className="text-[11.5px] leading-tight flex-1"
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
                    className="shrink-0 p-1 rounded-md opacity-0 group-hover/sub:opacity-100 transition-opacity"
                    style={{ color: 'var(--color-danger)' }}
                    aria-label="Delete subtask"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {subTotal === 0 && (
                <p className="text-[11px] text-center py-1" style={{ color: 'var(--color-text-muted)' }}>No subtasks yet</p>
              )}

              {/* Quick-add subtask */}
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="text"
                  value={subtaskDraft}
                  onChange={(e) => onSubtaskDraftChange(task.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddSubtask(task.id); } }}
                  placeholder="Add a subtask…"
                  className="flex-1 bg-transparent text-[11.5px] font-medium focus:outline-none"
                  style={{ color: 'var(--color-text-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => onAddSubtask(task.id)}
                  disabled={!subtaskDraft.trim()}
                  className="p-1 rounded-md transition-opacity disabled:opacity-30"
                  style={{ color: 'var(--color-accent)' }}
                >
                  <CheckSquare size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
