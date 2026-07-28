import { Card } from '../ui/Card';
import { CheckCircle2 } from 'lucide-react';
import { AnalyticsCardHeader, StatTile, MiniMetricRow, CalloutStat } from './AnalyticsPrimitives';

interface TaskAnalyticsData {
  totalCreated: number;
  totalCompleted: number;
  totalOverdue: number;
  totalCancelled: number;
  totalRescheduled: number;
  completionRate: number;
  averageCompletionMinutes: number;
  fastestTaskMinutes: number;
  longestTaskMinutes: number;
  completionVelocityPerDay: number;
}

function formatTime(mins: number) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

export function TaskAnalytics({ data }: { data: TaskAnalyticsData | null }) {
  if (!data) return null;

  return (
    <Card
      variant="glass"
      hoverable
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.08)',
      }}
    >
      <AnalyticsCardHeader
        icon={<CheckCircle2 size={16} strokeWidth={1.75} />}
        eyebrow="Task analytics"
        title="Completion lifecycle & velocity"
        iconTone="accent"
      />

      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Created" value={data.totalCreated} tone="accent" />
          <StatTile label="Completed" value={data.totalCompleted} tone="success" />
          <StatTile label="Overdue" value={data.totalOverdue} tone={data.totalOverdue > 0 ? 'danger' : 'success'} />
          <StatTile label="Rate" value={`${data.completionRate}%`} tone={data.completionRate >= 80 ? 'success' : 'warning'} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Cancelled" value={data.totalCancelled} tone="warning" />
          <StatTile label="Rescheduled" value={data.totalRescheduled} tone="info" />
        </div>

        <MiniMetricRow
          items={[
            { label: 'Avg time', value: formatTime(data.averageCompletionMinutes), tone: 'info' },
            { label: 'Fastest', value: formatTime(data.fastestTaskMinutes), tone: 'success' },
            { label: 'Longest', value: formatTime(data.longestTaskMinutes), tone: 'warning' },
          ]}
        />

        <CalloutStat label="Completion velocity" value={`${data.completionVelocityPerDay}/day`} tone="accent" />
      </div>
    </Card>
  );
}