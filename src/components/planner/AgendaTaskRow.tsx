import React from 'react';
import { Clock } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { TaskCheckbox } from '../tasks/TaskCheckbox';
import { formatTime } from '../../lib/dateUtils';
import type { TaskDTO } from '../../types';

interface AgendaTaskRowProps {
  task: TaskDTO;
  onToggle: () => void;
  isLast?: boolean;
}

const dotColor: Record<TaskDTO['status'], string> = {
  TODO: 'var(--color-info)',
  IN_PROGRESS: 'var(--color-warning)',
  WAITING: '#8b5cf6',
  BLOCKED: 'var(--color-danger)',
  IN_REVIEW: '#0ea5e9',
  DELEGATED: '#f59e0b',
  DONE: 'var(--color-success)',
  CANCELLED: 'var(--color-text-muted)',
};

/**
 * A single entry in a day's agenda — a calendar-app-style timeline row:
 * time label, a connecting rail with a status dot, and the task card.
 * This is the shared building block for both the Day view column and the
 * day-detail modal, so a scheduled day reads like a schedule, not a form list.
 */
export function AgendaTaskRow({ task, onToggle, isLast = false }: AgendaTaskRowProps) {
  const done = task.status === 'DONE';
  return (
    <div className="flex gap-3 sm:gap-4">
      {/* Rail: time + dot + connecting line */}
      <div className="flex flex-col items-center w-12 sm:w-14 shrink-0 pt-1.5">
        <span className="text-[10px] sm:text-[11px] font-bold text-text-muted mb-2 tabular-nums whitespace-nowrap">
          {task.createdAt ? formatTime(task.createdAt) : '—'}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            background: dotColor[task.status],
            boxShadow: `0 0 0 3px color-mix(in srgb, ${dotColor[task.status]} 18%, transparent)`,
          }}
        />
        {!isLast && (
          <div
            className="w-px flex-1 mt-2 min-h-[8px]"
            style={{ background: 'var(--color-border)' }}
          />
        )}
      </div>

      {/* Card */}
      <div
        className="flex-1 min-w-0 pb-3 sm:pb-4 -mt-0.5 rounded-xl border p-3 sm:p-4 transition-all duration-200 hover:shadow-sm"
        style={{
          background: done
            ? 'color-mix(in srgb, var(--color-success) 4%, var(--color-surface))'
            : 'var(--color-surface)',
          borderColor: 'var(--color-border-subtle)',
        }}
      >
        <div className="flex items-start gap-3">
          <TaskCheckbox checked={done} onToggle={onToggle} size={18} />

          <div className="flex-1 min-w-0">
            <p
              className="text-xs sm:text-sm font-bold leading-snug transition-colors duration-300"
              style={{
                color: done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                textDecorationLine: done ? 'line-through' : 'none',
                textDecorationColor: 'var(--color-success)',
                textDecorationThickness: '1.5px',
              }}
            >
              {task.title}
            </p>

            {task.description && (
              <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            <div className="flex items-center flex-wrap gap-2 mt-2.5">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.dueDate && (
              <span className="flex items-center gap-1.5 text-[11px] text-text-muted font-bold">
                  <Clock size={11} /> {task.dueDate ? formatTime(task.dueDate) : formatTime(task.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
