import React, { useMemo } from 'react';
import { Calendar, Flame, TrendingUp, Info, Trophy } from 'lucide-react';
import { HabitHeatmap } from './HabitHeatmap';
import { Card } from '../ui/Card';
import type { HabitDTO } from '../../types';

interface HabitHeatmapCombinedProps {
  habits: HabitDTO[];
  /** Use the compact mobile layout (smaller header, tighter spacing, no footer). */
  compact?: boolean;
}

/**
 * Combines completion data from all habits into a single frequency-based heatmap,
 * wrapped in the full card chrome: icon + title, a unified stat row (streak +
 * consistency), the month grid, a legend, and an encouragement footer.
 *
 * For each date the ratio is: completed habits / habits that existed on that day.
 * A habit is considered "existing" on a date if its `createdAt` ≤ that date.
 * This prevents adding new habits today from retroactively diluting or inflating
 * past days' completion rates.
 */
export function HabitHeatmapCombined({ habits, compact = false }: HabitHeatmapCombinedProps) {
  const { dayFrequency, consistencyPct, streakDays, restDays } = useMemo(() => {
    const frequency = new Map<string, number>(); // date -> ratio 0–1
    const restSet = new Set<string>(); // dates where ALL habits are on skip/rest

    // Map day-of-week indices (Mon=0..Sun=6) for each habit
    const habitMeta = habits.map((h) => ({
      completionSet: new Set(h.completionDates ?? []),
      skipDaySet: new Set(h.skipDays ?? []), // 0=Mon..6=Sun
      createdDate: h.createdAt ? h.createdAt.split('T')[0] : null,
    }));

    const allDates = new Set<string>();
    for (const h of habits) {
      if (h.completionDates) {
        for (const d of h.completionDates) {
          allDates.add(d);
        }
      }
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    allDates.add(todayStr);

    // Add a bit of history so the current week/month never looks sparse
    for (let i = 1; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      allDates.add(d.toISOString().split('T')[0]);
    }

    // Helper: get day-of-week (Mon=0..Sun=6) from a YYYY-MM-DD string
    const getDow = (dateStr: string): number => {
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      return (d.getUTCDay() + 6) % 7;
    };

    let sumCompleted = 0;
    let sumTotal = 0;

    for (const dateStr of allDates) {
      let completed = 0;
      let total = 0;
      let hadAnyHabit = false;
      let allSkipped = true;

      for (let i = 0; i < habits.length; i++) {
        const meta = habitMeta[i];
        if (meta.createdDate && meta.createdDate <= dateStr) {
          hadAnyHabit = true;
          const dow = getDow(dateStr);
          // If this habit skips this day-of-week, don't count it in total
          if (meta.skipDaySet.has(dow)) {
            continue;
          }
          total++;
          allSkipped = false;
          if (meta.completionSet.has(dateStr)) {
            completed++;
          }
        }
      }

      // Only mark as rest day if at least one habit existed on this date
      if (hadAnyHabit && allSkipped) {
        restSet.add(dateStr);
      }

      frequency.set(dateStr, total > 0 ? completed / total : 0);

      // Only count consistency over days that had a habit to complete,
      // and never count today (it isn't over yet) or future days.
      if (total > 0 && dateStr <= todayStr && dateStr !== todayStr) {
        sumCompleted += completed;
        sumTotal += total;
      }
    }

    const consistencyPct = sumTotal > 0 ? Math.round((sumCompleted / sumTotal) * 100) : 0;
    const streakDays = habits.length > 0 ? Math.max(...habits.map((h) => h.currentStreak), 0) : 0;

    return { dayFrequency: frequency, consistencyPct, streakDays, restDays: restSet };
  }, [habits]);

  const encouragement =
    consistencyPct >= 70
      ? { title: 'Great job!', body: "You're building a strong habit streak." }
      : consistencyPct >= 40
      ? { title: 'Keep it going!', body: 'Every completion moves your streak forward.' }
      : { title: 'Let\u2019s build momentum', body: 'Small, consistent steps add up fast.' };

  return (
    <Card
      variant="default"
      className={compact ? 'p-4 flex flex-col min-w-0 overflow-hidden' : 'p-5 sm:p-6 flex flex-col'}
      style={{ borderRadius: compact ? '20px' : '24px' }}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 ${compact ? 'mb-3' : 'mb-5'}`}>
        <div
          className="flex items-center justify-center rounded-2xl shrink-0"
          style={{
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 22%, transparent), color-mix(in srgb, var(--color-accent) 8%, transparent))',
            color: 'var(--color-accent)',
            boxShadow: '0 2px 8px color-mix(in srgb, var(--color-accent) 18%, transparent)',
          }}
        >
          <Calendar size={compact ? 15 : 19} strokeWidth={2.3} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-[15px] font-black text-text-primary flex items-center gap-1.5 truncate tracking-tight">
            Habit Heatmap
            <Info size={12} className="text-text-muted shrink-0" />
          </h3>
          {!compact && (
            <p className="text-[11.5px] text-text-muted truncate mt-0.5">Track your consistency over time</p>
          )}
        </div>
      </div>

      {/* Unified stat row — streak and consistency read as one dataset, with
          a soft accent-tinted background so it reads as a highlighted summary */}
      {!compact && (
        <div
          className="flex items-stretch mb-5 rounded-2xl overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex-1 flex items-center gap-2.5 px-4 py-3">
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 30,
                height: 30,
                background: 'color-mix(in srgb, #f97316 16%, transparent)',
                color: '#f97316',
              }}
            >
              <Flame size={14} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-text-primary leading-tight">
                {streakDays} day{streakDays === 1 ? '' : 's'}
              </p>
              <p className="text-[10px] font-semibold text-text-muted leading-tight mt-0.5">Current streak</p>
            </div>
          </div>

          <div className="w-px my-2.5" style={{ background: 'var(--color-border)' }} />

          <div className="flex-1 flex items-center gap-2.5 px-4 py-3">
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 30,
                height: 30,
                background: 'color-mix(in srgb, var(--color-success, #22c55e) 16%, transparent)',
                color: 'var(--color-success, #22c55e)',
              }}
            >
              <TrendingUp size={14} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-text-primary leading-tight">{consistencyPct}%</p>
              <p className="text-[10px] font-semibold text-text-muted leading-tight mt-0.5">Consistency</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        className="flex-1 flex items-center justify-center overflow-x-auto py-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <HabitHeatmap dayFrequency={dayFrequency} color="var(--color-accent)" restDays={restDays} />
      </div>

      {/* Legend — gradient strip with a swatch on each end for clearer contrast */}
      <div className={`flex items-center justify-center gap-2.5 ${compact ? 'mt-3' : 'mt-4'}`}>
        <span className="text-[10px] font-semibold text-text-muted">Less</span>
        <div
          className="h-[7px] w-20 rounded-full"
          style={{
            background: `linear-gradient(to right,
              color-mix(in srgb, var(--color-text-muted) 16%, transparent),
              color-mix(in srgb, var(--color-accent) 100%, transparent))`,
            boxShadow: 'inset 0 0 0 1px var(--color-border)',
          }}
        />
        <span className="text-[10px] font-semibold text-text-muted">More</span>
      </div>

      {/* Footer encouragement */}
      {!compact && (
        <div
          className="flex items-center gap-3 mt-5 pt-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 22%, transparent), color-mix(in srgb, var(--color-accent) 8%, transparent))',
              color: 'var(--color-accent)',
            }}
          >
            <Trophy size={16} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-text-primary">{encouragement.title}</p>
            <p className="text-[11.5px] text-text-muted truncate">{encouragement.body}</p>
          </div>
        </div>
      )}
    </Card>
  );
}