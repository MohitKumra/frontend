import React from 'react';
import { Zap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TaskDTO } from '../../types';
import { isToday } from './TaskCard';

interface DailyWorkloadMeterProps {
  tasks: TaskDTO[];
  /** Daily capacity in hours (default 8) */
  capacityHours?: number;
}

const DEFAULT_DURATION_MIN = 30; // fallback when estimatedDuration is null
const DEFAULT_CAPACITY_HOURS = 8;

type WorkloadStatus = 'empty' | 'light' | 'healthy' | 'busy' | 'overloaded';

interface StatusInfo {
  label: string;
  color: string;
  icon: React.ReactNode;
  tip: string;
}

const STATUS_INFO: Record<WorkloadStatus, StatusInfo> = {
  empty: {
    label: 'Nothing Planned',
    color: 'var(--color-text-muted)',
    icon: <CheckCircle2 size={13} />,
    tip: 'No tasks scheduled today. A great time to plan ahead.',
  },
  light: {
    label: 'Light Day',
    color: 'var(--color-info)',
    icon: <CheckCircle2 size={13} />,
    tip: 'You have plenty of room for today.',
  },
  healthy: {
    label: 'Healthy',
    color: 'var(--color-success)',
    icon: <CheckCircle2 size={13} />,
    tip: "Today's workload looks balanced.",
  },
  busy: {
    label: 'Busy',
    color: 'var(--color-warning)',
    icon: <TrendingUp size={13} />,
    tip: 'Getting close to capacity. Consider deferring lower-priority work.',
  },
  overloaded: {
    label: 'Overloaded',
    color: 'var(--color-danger)',
    icon: <AlertTriangle size={13} />,
    tip: 'Too much planned today. Move some tasks to tomorrow.',
  },
};

function getStatus(pct: number): WorkloadStatus {
  if (pct === 0) return 'empty';
  if (pct <= 40) return 'light';
  if (pct <= 75) return 'healthy';
  if (pct <= 100) return 'busy';
  return 'overloaded';
}

export function DailyWorkloadMeter({ tasks, capacityHours = DEFAULT_CAPACITY_HOURS }: DailyWorkloadMeterProps) {
  const capacityMin = capacityHours * 60;

  // Tasks due today and not done/cancelled
  const todayTasks = tasks.filter((t) => isToday(t.dueDate) && t.status !== 'DONE' && t.status !== 'CANCELLED');

  const plannedMin = todayTasks.reduce((sum, t) => sum + (t.estimatedDuration ?? DEFAULT_DURATION_MIN), 0);
  const plannedHours = (plannedMin / 60).toFixed(1);
  const pct = Math.min(Math.round((plannedMin / capacityMin) * 100), 130); // cap display at 130%
  const fillPct = Math.min(pct, 100);

  const status = getStatus(pct);
  const info = STATUS_INFO[status];

  // Gradient for the bar
  const barGradient =
    status === 'overloaded'
      ? 'linear-gradient(90deg, var(--color-warning), var(--color-danger))'
      : status === 'busy'
        ? 'linear-gradient(90deg, var(--color-success), var(--color-warning))'
        : status === 'healthy'
          ? 'var(--gradient-accent)'
          : 'var(--color-info)';

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
          >
            <Zap size={15} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Today's Capacity
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
        </div>
        <span
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{
            background: `color-mix(in srgb, ${info.color} 12%, transparent)`,
            color: info.color,
          }}
        >
          {info.icon}
          {info.label}
        </span>
      </div>

      {/* Bar */}
      <div
        className="relative h-3 rounded-full overflow-hidden mb-2"
        style={{ background: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${fillPct}%`, background: barGradient }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
          <span style={{ color: 'var(--color-text-primary)' }}>{plannedHours}h</span> planned of{' '}
          <span style={{ color: 'var(--color-text-primary)' }}>{capacityHours}h</span> capacity
        </p>
        <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {pct > 100 ? `${pct - 100}% over` : `${100 - pct}% free`}
        </p>
      </div>

      {/* Tip */}
      {status !== 'empty' && (
        <p className="text-[10.5px] mt-2.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {info.tip}
        </p>
      )}
    </div>
  );
}
