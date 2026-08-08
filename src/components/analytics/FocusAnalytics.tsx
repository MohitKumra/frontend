import { Card } from '../ui/Card';
import { Activity } from 'lucide-react';
import { AnalyticsCardHeader, StatTile, MiniMetricRow, CalloutStat } from './AnalyticsPrimitives';

interface FocusAnalyticsData {
  totalFocusMinutes: number;
  totalSessions: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  shortestSessionMinutes: number;
  interruptions: number;
  cancelledSessions: number;
  breakMinutes: number;
}

export function FocusAnalytics({ data }: { data: FocusAnalyticsData | null }) {
  if (!data) return null;

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

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
        icon={<Activity size={16} strokeWidth={1.75} />}
        eyebrow="Focus analytics"
        title="Session metrics & breakdown"
        iconTone="info"
      />

      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Total focus" value={formatTime(data.totalFocusMinutes)} tone="info" />
          <StatTile label="Sessions" value={data.totalSessions} tone="accent" />
          <StatTile label="Avg session" value={formatTime(data.averageSessionMinutes)} tone="success" />
          <StatTile label="Longest" value={formatTime(data.longestSessionMinutes)} tone="warning" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Shortest" value={formatTime(data.shortestSessionMinutes)} />
          <StatTile
            label="Interruptions"
            value={data.interruptions}
            tone={data.interruptions > 0 ? 'warning' : 'success'}
          />
        </div>

        <MiniMetricRow
          items={[
            { label: 'Avg time', value: formatTime(data.averageSessionMinutes), tone: 'info' },
            { label: 'Fastest', value: formatTime(data.shortestSessionMinutes) },
            { label: 'Longest', value: formatTime(data.longestSessionMinutes), tone: 'warning' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Cancelled"
            value={data.cancelledSessions}
            tone={data.cancelledSessions > 0 ? 'danger' : 'success'}
          />
          <StatTile label="Break time" value={formatTime(data.breakMinutes)} tone="warning" />
        </div>

        <CalloutStat
          label="Sessions completed"
          value={`${data.totalSessions - data.cancelledSessions}/${data.totalSessions}`}
          tone="info"
        />
      </div>
    </Card>
  );
}
