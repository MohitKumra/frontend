import { useMemo } from 'react';
import { Sparkles, ArrowRight, Clock, AlertTriangle, Zap, Brain, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import type { TaskDTO } from '../../types';
import { isOverdue } from '../tasks/TaskCard';

interface AIBriefWidgetProps {
  tasks: TaskDTO[];
  focusMinutes: number;
  pendingTasks: number;
  habits: { total: number; completed: number };
}

function scoreTask(task: TaskDTO): number {
  const priorityScore = { CRITICAL: 100, HIGH: 75, MEDIUM: 45, LOW: 20 }[task.priority];
  const dueScore = task.dueDate ? Math.max(0, 40 - Math.floor((new Date(task.dueDate).getTime() - Date.now()) / 86400000) * 6) : 0;
  const overdueBoost = isOverdue(task.dueDate, task.status) ? 60 : 0;
  const durationPenalty = task.estimatedDuration ? Math.min(20, Math.floor(task.estimatedDuration / 30)) : 0;
  return priorityScore + dueScore + overdueBoost - durationPenalty;
}

function getBestWorkWindow(): string {
  const hour = new Date().getHours();
  if (hour < 9) return '9:00 AM – 11:00 AM';
  if (hour < 14) return '2:00 PM – 4:00 PM';
  return 'Tomorrow 9:00 AM – 11:00 AM';
}

export function AIBriefWidget({ tasks, focusMinutes, pendingTasks, habits }: AIBriefWidgetProps) {
  const navigate = useNavigate();

  const briefing = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED');
    const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate, task.status));
    const highPriorityTasks = openTasks.filter((task) => task.priority === 'CRITICAL' || task.priority === 'HIGH');
    const recommended = [...openTasks].sort((a, b) => scoreTask(b) - scoreTask(a))[0] ?? null;
    const plannedMinutes = openTasks.reduce((sum, task) => sum + (task.estimatedDuration ?? 30), 0);
    const estimatedHours = Math.floor(plannedMinutes / 60);
    const estimatedMinutes = plannedMinutes % 60;
    const overload = plannedMinutes > 480; // More than 8 hours

    // Generate intelligent summary
    let summary = 'You have enough time to finish your high-priority work.';
    if (overload) {
      summary = 'Your schedule is packed. Focus on the most critical tasks.';
    } else if (overdueTasks.length > 0) {
      summary = 'You have overdue tasks that need immediate attention.';
    } else if (highPriorityTasks.length > 3) {
      summary = 'Several high-priority items need your focus today.';
    } else if (pendingTasks === 0) {
      summary = 'Great! You have a clear schedule ahead.';
    }

    // Identify potential blockers
    const blockers: string[] = [];
    if (habits.total > habits.completed) {
      blockers.push(`${habits.total - habits.completed} habit${habits.total - habits.completed > 1 ? 's' : ''} pending`);
    }
    if (overdueTasks.length > 0) {
      blockers.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`);
    }

    return {
      summary,
      recommended,
      estimatedFocus: estimatedHours > 0 ? `${estimatedHours}h ${estimatedMinutes}m` : `${estimatedMinutes}m`,
      blockers: blockers.length > 0 ? blockers.join(', ') : null,
      bestWorkWindow: getBestWorkWindow(),
      overdueTasks,
      highPriorityTasks,
      overload,
    };
  }, [tasks, pendingTasks, habits]);

  return (
    <Card variant="default" className="overflow-hidden relative">
      {/* Subtle gradient background */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none" 
        style={{ 
          background: 'radial-gradient(circle at top left, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 50%)' 
        }} 
      />
      
      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" 
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Brain size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-text-primary">Today's Brief</h3>
            <p className="text-xs text-text-secondary">AI-powered daily assistant</p>
          </div>
          <div 
            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            Live
          </div>
        </div>

        {/* Summary Statement */}
        <div 
          className="rounded-xl p-4 mb-4"
          style={{ 
            background: 'color-mix(in srgb, var(--color-surface-raised) 80%, var(--color-accent) 5%)',
            border: '1px solid var(--color-border)'
          }}
        >
          <p className="text-sm font-bold text-text-primary leading-relaxed">
            {briefing.summary}
          </p>
        </div>

        {/* Recommended Task */}
        {briefing.recommended ? (
          <div 
            className="rounded-xl border p-4 mb-4 group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ 
              background: 'var(--color-surface-raised)', 
              borderColor: 'var(--color-accent-border)' 
            }}
            onClick={() => navigate('/tasks')}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
              >
                <Zap size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Recommended First Task
                </p>
                <p className="text-sm font-bold text-text-primary mb-1 truncate">
                  {briefing.recommended.title}
                </p>
                {briefing.recommended.project && (
                  <p className="text-xs text-text-secondary">
                    {briefing.recommended.project.name}
                  </p>
                )}
              </div>
              <ArrowRight size={16} className="text-text-muted group-hover:text-accent transition-colors shrink-0 mt-1" />
            </div>
          </div>
        ) : (
          <div 
            className="rounded-xl border p-4 mb-4 text-center"
            style={{ 
              background: 'var(--color-surface-raised)', 
              borderColor: 'var(--color-border)' 
            }}
          >
            <p className="text-sm text-text-secondary">No open tasks right now. Great job! 🎉</p>
          </div>
        )}

        {/* Insights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Estimated Focus */}
          <div 
            className="rounded-xl p-3"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-text-muted" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Estimated Focus
              </span>
            </div>
            <p className="text-lg font-extrabold text-text-primary">{briefing.estimatedFocus}</p>
          </div>

          {/* Best Work Window */}
          <div 
            className="rounded-xl p-3"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-text-muted" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Best Window
              </span>
            </div>
            <p className="text-xs font-bold text-text-primary leading-tight">{briefing.bestWorkWindow}</p>
          </div>

          {/* Potential Blockers */}
          <div 
            className="rounded-xl p-3"
            style={{ 
              background: briefing.blockers 
                ? 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface-raised))' 
                : 'var(--color-surface-raised)', 
              border: `1px solid ${briefing.blockers ? 'var(--color-warning)' : 'var(--color-border)'}` 
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className={briefing.blockers ? 'text-warning' : 'text-text-muted'} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Blockers
              </span>
            </div>
            <p className="text-xs font-bold text-text-primary leading-tight">
              {briefing.blockers ?? 'None detected'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
