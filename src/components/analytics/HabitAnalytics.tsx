import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Target } from 'lucide-react';
import { AnalyticsCardHeader, StatTile, CalloutStat } from './AnalyticsPrimitives';

interface HabitItem {
  id: string;
  title: string;
  completionCount: number;
  totalExpected: number;
  skippedDays: number;
  completionRate: number;
}

interface HabitAnalyticsData {
  habits: HabitItem[];
  overallCompletion: number;
  totalSkippedDays: number;
  weakestHabit: { id: string; title: string; rate: number } | null;
  strongestHabit: { id: string; title: string; rate: number } | null;
  mostSuccessfulHabit: { id: string; title: string; rate: number } | null;
}

function OverallRing({ value }: { value: number }) {
  const size = 92;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {clamped}%
        </span>
        <span
          className="text-[7.5px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Overall
        </span>
      </div>
    </div>
  );
}

export function HabitAnalytics({ data }: { data: HabitAnalyticsData | null }) {
  if (!data || data.habits.length === 0) return null;

  const bestRate = data.strongestHabit?.rate ?? Math.max(...data.habits.map((h) => h.completionRate), 0);

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
        icon={<Target size={16} strokeWidth={1.75} />}
        eyebrow="Habit analytics"
        title="Per-habit completion rates"
        iconTone="success"
      />

      <div className="space-y-3 p-5">
        <div
          className="flex items-center justify-center rounded-xl border p-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-subtle)' }}
        >
          <OverallRing value={data.overallCompletion} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Habits" value={data.habits.length} />
          <StatTile label="Best" value={`${bestRate}%`} tone="success" />
          <StatTile label="Skipped" value={data.totalSkippedDays} tone="warning" />
        </div>

        <div className="space-y-2">
          {data.habits.slice(0, 5).map((habit, idx) => (
            <div
              key={habit.id}
              className="space-y-1.5 rounded-xl border p-3"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-subtle)' }}
            >
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {habit.title}
                </span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      habit.completionRate >= 80
                        ? 'var(--color-success)'
                        : habit.completionRate >= 50
                          ? 'var(--color-warning)'
                          : 'var(--color-danger)',
                  }}
                >
                  {habit.completionRate}%
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{ background: 'var(--color-surface-elevated)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      habit.completionRate >= 80
                        ? 'var(--color-success)'
                        : habit.completionRate >= 50
                          ? 'var(--color-warning)'
                          : 'var(--color-danger)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${habit.completionRate}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                />
              </div>
            </div>
          ))}
        </div>

        <CalloutStat
          label="Most successful"
          value={data.mostSuccessfulHabit?.title ?? data.strongestHabit?.title ?? 'n/a'}
          tone="success"
        />
      </div>
    </Card>
  );
}
