import { useMemo } from 'react';
import { Sparkles, ArrowRight, Clock, AlertTriangle, Target } from 'lucide-react';
import { Card } from '../ui/Card';
import type { TaskDTO } from '../../types';
import { isOverdue } from '../tasks/TaskCard';

interface DailyBriefingCardProps {
  tasks: TaskDTO[];
  focusMinutes: number;
  pendingTasks: number;
}

function scoreTask(task: TaskDTO): number {
  const priorityScore = { CRITICAL: 100, HIGH: 75, MEDIUM: 45, LOW: 20 }[task.priority];
  const dueScore = task.dueDate ? Math.max(0, 40 - Math.floor((new Date(task.dueDate).getTime() - Date.now()) / 86400000) * 6) : 0;
  const overdueBoost = isOverdue(task.dueDate, task.status) ? 60 : 0;
  const statusPenalty = task.status === 'WAITING' || task.status === 'BLOCKED' ? -25 : 0;
  const durationPenalty = task.estimatedDuration ? Math.min(20, Math.floor(task.estimatedDuration / 30)) : 0;
  return priorityScore + dueScore + overdueBoost + statusPenalty - durationPenalty;
}

export function DailyBriefingCard({ tasks, focusMinutes, pendingTasks }: DailyBriefingCardProps) {
  const briefing = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED');
    const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate, task.status));
    const recommended = [...openTasks].sort((a, b) => scoreTask(b) - scoreTask(a))[0] ?? null;
    const plannedHours = Math.round(tasks.reduce((sum, task) => sum + (task.estimatedDuration ?? 0), 0) / 60);
    const overload = plannedHours > 8;

    return {
      recommended,
      overdueTasks,
      plannedHours,
      overload,
      reason: recommended
        ? recommended.dueDate && isOverdue(recommended.dueDate, recommended.status)
          ? 'It is overdue and needs attention first.'
          : recommended.estimatedDuration && recommended.estimatedDuration <= 60
            ? 'It is a short, high-value task that can be finished quickly.'
            : 'It is the best balance of urgency and effort right now.'
        : 'No open tasks are available.',
    };
  }, [tasks]);

  return (
    <Card className="p-5 sm:p-6 overflow-hidden relative">
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 40%)' }} />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-accent)', color: 'white' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Daily Briefing</p>
            <p className="text-xs text-text-secondary">A quick read on what deserves your attention first.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Today&apos;s Focus</p>
            <p className="text-2xl font-black text-text-primary mt-2">{pendingTasks}</p>
            <p className="text-xs text-text-secondary mt-1">open tasks to choose from</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Workload</p>
            <p className={`text-2xl font-black mt-2 ${briefing.overload ? 'text-danger' : 'text-success'}`}>
              {briefing.plannedHours}h
            </p>
            <p className="text-xs text-text-secondary mt-1">{briefing.overload ? 'plan is heavy today' : 'load looks manageable'}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Focus Minutes</p>
            <p className="text-2xl font-black text-text-primary mt-2">{focusMinutes}m</p>
            <p className="text-xs text-text-secondary mt-1">trackable deep-work time</p>
          </div>
        </div>

        <div className="rounded-2xl border p-4 sm:p-5" style={{ background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))', borderColor: 'var(--color-accent-border)' }}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
              <Target size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Recommended First Task</p>
              {briefing.recommended ? (
                <>
                  <p className="text-base font-bold text-text-primary mt-1">{briefing.recommended.title}</p>
                  <p className="text-sm text-text-secondary mt-1">{briefing.reason}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {briefing.recommended.dueDate && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                        <Clock size={12} />
                        Due {new Date(briefing.recommended.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {briefing.overdueTasks.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', color: 'var(--color-danger)' }}>
                        <AlertTriangle size={12} />
                        {briefing.overdueTasks.length} overdue
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-secondary mt-1">No open tasks right now.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
