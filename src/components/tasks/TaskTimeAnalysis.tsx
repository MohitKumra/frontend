import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Hourglass, Zap, Coffee, Target } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { Card } from '../ui/Card';
import type { TaskDTO, FocusSessionDTO, ListResponse } from '../../types';

// ─── Duration formatter ──────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface TaskTimeAnalysisProps {
  task: TaskDTO;
  /** Optional pre-fetched sessions. If omitted, the component fetches its own. */
  sessions?: FocusSessionDTO[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskTimeAnalysis({ task, sessions: propSessions }: TaskTimeAnalysisProps) {
  // Fetch sessions if not provided as prop
  const { data: fetchedSessions } = useQuery({
    queryKey: ['focus'],
    queryFn: () => apiClient.get<ListResponse<FocusSessionDTO>>('/focus').then((r) => r.data),
    enabled: !propSessions,
  });

  const sessions = propSessions ?? fetchedSessions?.data ?? [];

  const taskSessions = useMemo(
    () => sessions.filter((s) => s.taskId === task.id),
    [sessions, task.id]
  );

  const focusSessions = useMemo(() => taskSessions.filter((s) => !s.isBreak), [taskSessions]);
  const breakSessions = useMemo(() => taskSessions.filter((s) => s.isBreak), [taskSessions]);

  const totalFocusMin = useMemo(() => focusSessions.reduce((a, s) => a + s.durationMin, 0), [focusSessions]);
  const totalBreakMin = useMemo(() => breakSessions.reduce((a, s) => a + s.durationMin, 0), [breakSessions]);

  const now = new Date();

  // 1. Total lifetime: createdAt → completedAt or now
  const createdAt = new Date(task.createdAt);
  const endTime = task.completedAt ? new Date(task.completedAt) : now;
  const lifetimeMs = endTime.getTime() - createdAt.getTime();

  // 2. Active duration: inProgressAt → completedAt or now
  const inProgressAt = task.inProgressAt ? new Date(task.inProgressAt) : null;
  const activeDurationMs = inProgressAt ? (endTime.getTime() - inProgressAt.getTime()) : null;

  // 3. Focus & break time
  const focusMs = totalFocusMin * 60000;
  const breakMs = totalBreakMin * 60000;

  const metrics = [
    {
      icon: <Clock size={18} />,
      label: 'Total Lifetime',
      sublabel: task.completedAt ? 'Created → Completed' : 'Created → Now',
      value: formatDuration(lifetimeMs),
      color: 'var(--color-accent)',
      bgColor: 'var(--color-accent-subtle)',
    },
    {
      icon: <Hourglass size={18} />,
      label: 'Active Duration',
      sublabel: task.completedAt ? 'In Progress → Completed' : (inProgressAt ? 'In Progress → Now' : 'Not started'),
      value: activeDurationMs !== null ? formatDuration(activeDurationMs) : '—',
      color: 'var(--color-info)',
      bgColor: 'color-mix(in srgb, var(--color-info) 14%, transparent)',
    },
    {
      icon: <Zap size={18} />,
      label: 'Focus Time',
      sublabel: `${focusSessions.length} session${focusSessions.length !== 1 ? 's' : ''}`,
      value: formatDuration(focusMs),
      color: 'var(--color-success)',
      bgColor: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
    },
    {
      icon: <Coffee size={18} />,
      label: 'Break Time',
      sublabel: `${breakSessions.length} break${breakSessions.length !== 1 ? 's' : ''}`,
      value: formatDuration(breakMs),
      color: 'var(--color-warning)',
      bgColor: 'color-mix(in srgb, var(--color-warning) 14%, transparent)',
    },
  ];

  return (
    <Card variant="default" className="w-full p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
          <Target size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Task Analysis</p>
          <p className="text-sm font-bold text-text-primary truncate">{task.title}</p>
        </div>
        {task.status === 'DONE' && (
          <span className="ml-auto shrink-0 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
            style={{ background: 'color-mix(in srgb, var(--color-success) 14%, transparent)', color: 'var(--color-success)' }}>
            Completed
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-4 border transition-all hover:scale-[1.01]"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.bgColor, color: m.color }}>
                {m.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{m.label}</p>
                <p className="text-[10px] text-text-muted">{m.sublabel}</p>
              </div>
            </div>
            <p className="text-lg font-black tabular-nums" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}