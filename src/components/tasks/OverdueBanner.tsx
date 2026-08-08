import React from 'react';
import { AlertTriangle, ArrowRight, Clock, SkipForward } from 'lucide-react';
import type { TaskDTO, TaskStatus } from '../../types';
import { formatDuration } from './TaskCard';

interface OverdueBannerProps {
  tasks: TaskDTO[];
  onViewOverdue: () => void;
  onRescheduleAll: () => void;
  onStartHighestPriority: () => void;
}

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function OverdueBanner({ tasks, onViewOverdue, onRescheduleAll, onStartHighestPriority }: OverdueBannerProps) {
  if (tasks.length === 0) return null;

  // Calculate total estimated hours for overdue tasks
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimatedDuration ?? 30), 0);
  const durationLabel = formatDuration(totalMinutes);

  // Find highest priority overdue task
  const sorted = [...tasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
  const topTask = sorted[0];

  const hasHighPriority = tasks.some((t) => t.priority === 'CRITICAL' || t.priority === 'HIGH');

  return (
    <div
      className="rounded-2xl border p-5 shadow-sm"
      style={{
        background: 'color-mix(in srgb, var(--color-danger) 5%, var(--color-surface))',
        borderColor: 'color-mix(in srgb, var(--color-danger) 50%, transparent)',
        borderWidth: '1.5px',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon + text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)',
              color: 'var(--color-danger)',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-danger)' }}>
              {tasks.length} overdue {tasks.length === 1 ? 'task requires' : 'tasks require'} your attention
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Approximately{' '}
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {durationLabel}
              </span>{' '}
              of work — {hasHighPriority ? 'includes high-priority items' : 'all lower priority'}.
              {topTask && (
                <>
                  {' '}
                  Top task:{' '}
                  <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {topTask.title}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onStartHighestPriority}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ background: 'var(--color-danger)' }}
            title={topTask ? `Start: ${topTask.title}` : 'Start highest priority task'}
          >
            <ArrowRight size={13} />
            Start Top Task
          </button>
          <button
            type="button"
            onClick={onRescheduleAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:shadow-sm"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))',
              color: 'var(--color-danger)',
            }}
            title="Reschedule all overdue tasks to today"
          >
            <SkipForward size={13} />
            Reschedule All
          </button>
          <button
            type="button"
            onClick={onViewOverdue}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:shadow-sm"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Clock size={13} />
            Review All
          </button>
        </div>
      </div>
    </div>
  );
}
