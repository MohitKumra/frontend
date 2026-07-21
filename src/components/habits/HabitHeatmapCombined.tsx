import React, { useMemo } from 'react';
import { HabitHeatmap } from './HabitHeatmap';
import type { HabitDTO } from '../../types';

interface HabitHeatmapCombinedProps {
  habits: HabitDTO[];
}

/**
 * Combines completion dates from all habits into a single heatmap view
 */
export function HabitHeatmapCombined({ habits }: HabitHeatmapCombinedProps) {
  const allCompletionDates = useMemo(() => {
    const dates = new Set<string>();
    habits.forEach(habit => {
      if (habit.completionDates) {
        habit.completionDates.forEach(date => dates.add(date));
      }
    });
    return Array.from(dates).sort();
  }, [habits]);

  const currentStreakDays = habits.reduce((sum, h) => sum + h.currentStreak, 0);

  return (
    <div className="min-w-0">
      <div className="mb-4">
        <p className="text-xs font-medium text-text-muted mb-1">
          Current streak: <span className="font-bold text-success">{currentStreakDays} days</span>
        </p>
      </div>
      <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <HabitHeatmap 
          completionDates={allCompletionDates} 
          color="var(--color-accent)"
          weeks={4}
        />
      </div>
      <div className="flex items-center justify-between px-0.5 mt-3 text-[10px] font-medium text-text-muted">
        <span>Less</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{
                background: i === 0 
                  ? 'color-mix(in srgb, var(--color-text-muted) 18%, transparent)' 
                  : `color-mix(in srgb, var(--color-accent) ${20 + i * 20}%, transparent)`,
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
