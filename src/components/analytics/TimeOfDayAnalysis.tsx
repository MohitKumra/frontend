import { Card } from '../ui/Card';
import { Sun, Cloud, Moon, Stars } from 'lucide-react';
import { AnalyticsCardHeader } from './AnalyticsPrimitives';

interface TimeSlot {
  slot: string;
  tasksCompleted: number;
  focusMinutes: number;
  completionRate: number;
  averageSessionMinutes: number;
}

interface TimeOfDayData {
  timeSlots: TimeSlot[];
}

const SLOT_ICONS: Record<string, React.ReactNode> = {
  morning: <Sun size={14} strokeWidth={1.75} />,
  afternoon: <Cloud size={14} strokeWidth={1.75} />,
  evening: <Moon size={14} strokeWidth={1.75} />,
  night: <Stars size={14} strokeWidth={1.75} />,
};

const SLOT_COLORS: Record<string, string> = {
  morning: 'var(--color-warning)',
  afternoon: 'var(--color-accent)',
  evening: 'var(--color-info)',
  night: 'var(--color-text-primary)',
};

export function TimeOfDayAnalysis({ data }: { data: TimeOfDayData | null }) {
  if (!data || data.timeSlots.length === 0) return null;

  const maxTasks = Math.max(...data.timeSlots.map((s) => s.tasksCompleted), 1);

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
        icon={<Sun size={16} strokeWidth={1.75} />}
        eyebrow="Time of day"
        title="When you work best"
        iconTone="accent"
      />

      <div className="space-y-2 p-5">
        {data.timeSlots.map((slot) => (
          <div key={slot.slot} className="rounded-xl border p-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-subtle)' }}>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span style={{ color: SLOT_COLORS[slot.slot] || 'var(--color-accent)' }}>
                {SLOT_ICONS[slot.slot] || <Sun size={14} strokeWidth={1.75} />}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                {slot.slot}
              </span>
              <span className="ml-auto text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {slot.tasksCompleted} tasks
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-surface-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(slot.tasksCompleted / maxTasks) * 100}%`,
                  background: SLOT_COLORS[slot.slot] || 'var(--color-accent)',
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9.5px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              <span>{slot.completionRate}% completion</span>
              <span>{slot.averageSessionMinutes}m avg session</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}