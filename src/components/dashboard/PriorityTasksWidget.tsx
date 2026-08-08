import { CheckSquare, Clock, Flag, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { FloatingPriorityTasksEmpty } from '../ui/FloatingPriorityTasksEmpty';
import type { TaskDTO, SubTaskDTO } from '../../types';
import { isOverdue } from '../tasks/TaskCard';

interface PriorityTasksWidgetProps {
  tasks: TaskDTO[];
  maxTasks?: number;
}

const priorityColors = {
  CRITICAL: { bg: 'var(--icon-bg-danger)', text: 'var(--icon-text-danger)', border: 'var(--color-danger)' },
  HIGH: { bg: 'var(--icon-bg-warning)', text: 'var(--icon-text-warning)', border: 'var(--color-warning)' },
  MEDIUM: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)', border: 'var(--color-info)' },
  LOW: { bg: 'var(--icon-bg-success)', text: 'var(--icon-text-success)', border: 'var(--color-success)' },
};

const statusLabels = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
  BLOCKED: 'Blocked',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getDaysUntilDue(dueDate: string): string {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

export function PriorityTasksWidget({ tasks, maxTasks = 5 }: PriorityTasksWidgetProps) {
  const navigate = useNavigate();

  // Filter and sort tasks by priority and due date
  const priorityTasks = tasks
    .filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED')
    .sort((a, b) => {
      // Sort by overdue first
      const aOverdue = isOverdue(a.dueDate, a.status);
      const bOverdue = isOverdue(b.dueDate, b.status);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by priority
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return 0;
    })
    .slice(0, maxTasks);

  return (
    <Card variant="default" className="overflow-hidden">
      <div className="p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
            >
              <CheckSquare size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Priority Tasks</h3>
              <p className="text-xs text-text-secondary">Your most important work today</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="text-xs font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            View All
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Task Cards */}
        {priorityTasks.length > 0 ? (
          <div className="space-y-3.5">
            {priorityTasks.map((task) => {
              const colors = priorityColors[task.priority];
              const overdue = isOverdue(task.dueDate, task.status);

              // Calculate subtask progress
              const totalSubtasks = task.subTasks?.length ?? 0;
              const completedSubtasks = task.subTasks?.filter((st: SubTaskDTO) => st.completed).length ?? 0;
              const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

              return (
                <div
                  key={task.id}
                  className="rounded-xl border p-4 group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{
                    background: 'var(--color-surface-raised)',
                    borderColor: 'var(--color-border)',
                    borderLeftWidth: '3px',
                    borderLeftColor: colors.border,
                  }}
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {/* Priority Indicator */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      <Flag size={14} />
                    </div>

                    {/* Task Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-text-primary mb-1 line-clamp-1">{task.title}</h4>
                      {task.project && <p className="text-xs text-text-secondary mb-2">{task.project.name}</p>}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Duration */}
                        {task.estimatedDuration && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{
                              background: 'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            <Clock size={10} />
                            {formatDuration(task.estimatedDuration)}
                          </span>
                        )}

                        {/* Due Date */}
                        {task.dueDate && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{
                              background: overdue
                                ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                                : 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                              color: overdue ? 'var(--color-danger)' : 'var(--color-info)',
                            }}
                          >
                            {getDaysUntilDue(task.dueDate)}
                          </span>
                        )}

                        {/* Status */}
                        <span
                          className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{
                            background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                            color: 'var(--color-accent)',
                          }}
                        >
                          {statusLabels[task.status]}
                        </span>
                      </div>
                    </div>

                    {/* Action Icon */}
                    <ChevronRight
                      size={18}
                      className="text-text-muted group-hover:text-accent transition-colors shrink-0 mt-1"
                    />
                  </div>

                  {/* Subtasks Progress */}
                  {totalSubtasks > 0 && (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'var(--color-border)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            background: 'var(--gradient-accent)',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-text-muted shrink-0">
                        {completedSubtasks}/{totalSubtasks}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <FloatingPriorityTasksEmpty
            title="No priority tasks"
            description="All clear! When you mark tasks as high priority, they'll appear here."
            onViewAllTasks={() => navigate('/tasks')}
          />
        )}
      </div>
    </Card>
  );
}
