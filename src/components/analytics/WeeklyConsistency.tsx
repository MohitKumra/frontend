import { Card } from '../ui/Card';
import { Calendar } from 'lucide-react';
import { AnalyticsCardHeader, CalloutStat } from './AnalyticsPrimitives';

interface DayData {
  day: string;
  tasksPerDay: number;
  habitsPerDay: number;
  focusPerDay: number;
  score: number;
}

interface ConsistencyData {
  days: DayData[];
  overallScore: number;
}

const RING_SIZE = 52;
const STROKE = 5;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score: number) {
  return score >= 7 ? 'var(--color-success)' : score >= 4 ? 'var(--color-warning)' : 'var(--color-danger)';
}

function DayRing({ day, score, best, worst }: { day: DayData; score: number; best: number; worst: number }) {
  const pct = Math.min(Math.max(score / 10, 0), 1);
  const dash = pct * CIRCUMFERENCE;
  const isBest = score > 0 && score === best && best !== worst;
  const isWorst = score > 0 && score === worst && best !== worst;

  return (
    <div
      className="flex flex-1 flex-col items-center gap-1.5"
      title={`${day.day}: ${day.tasksPerDay} tasks · ${day.habitsPerDay} habits · ${day.focusPerDay} focus sessions`}
    >
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={STROKE}
          />
          {pct > 0 && (
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={scoreColor(score)}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          )}
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums"
          style={{ color: score > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
        >
          {score}
        </div>
      </div>
      <span
        className="text-[9px] font-bold uppercase tracking-[0.14em]"
        style={{
          color: isBest ? 'var(--color-success)' : isWorst ? 'var(--color-danger)' : 'var(--color-text-muted)',
        }}
      >
        {day.day}
      </span>
    </div>
  );
}

export function WeeklyConsistency({ data }: { data: ConsistencyData | null }) {
  if (!data || data.days.length === 0) return null;

  const activeDays = data.days.filter((d) => d.score > 0);
  const best = activeDays.length ? Math.max(...activeDays.map((d) => d.score)) : 0;
  const worst = activeDays.length ? Math.min(...activeDays.map((d) => d.score)) : 0;

  const totalTasks = data.days.reduce((sum, d) => sum + d.tasksPerDay, 0);
  const totalHabits = data.days.reduce((sum, d) => sum + d.habitsPerDay, 0);
  const totalFocus = data.days.reduce((sum, d) => sum + d.focusPerDay, 0);

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
        icon={<Calendar size={16} strokeWidth={1.75} />}
        eyebrow="Weekly consistency"
        title="Day-by-day breakdown"
        iconTone="warning"
      />

      <div className="p-5">
        <div className="flex gap-2">
          {data.days.map((d) => (
            <DayRing key={d.day} day={d} score={d.score} best={best} worst={worst} />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          <div className="rounded-lg py-2.5 text-center" style={{ background: 'var(--color-surface-elevated)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {activeDays.length}/{data.days.length}
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              Active days
            </div>
          </div>
          <div className="rounded-lg py-2.5 text-center" style={{ background: 'var(--color-surface-elevated)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {totalTasks}
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              Tasks
            </div>
          </div>
          <div className="rounded-lg py-2.5 text-center" style={{ background: 'var(--color-surface-elevated)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {totalHabits}
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              Habits
            </div>
          </div>
          <div className="rounded-lg py-2.5 text-center" style={{ background: 'var(--color-surface-elevated)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {totalFocus}
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              Focus
            </div>
          </div>
        </div>

        <div className="mt-4">
          <CalloutStat
            label="Consistency score"
            value={`${data.overallScore}%`}
            tone={data.overallScore >= 80 ? 'success' : data.overallScore >= 50 ? 'warning' : 'danger'}
          />
        </div>
      </div>
    </Card>
  );
}
