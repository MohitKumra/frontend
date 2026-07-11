import React, { useState } from 'react';
import { Trash2, Flame, CheckCircle2, Circle, Award, Bell } from 'lucide-react';
import { useToggleHabit, useDeleteHabit } from '../../features/habits/hooks/useHabits';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { WeekPatternDots } from './WeekPatterndots';
import { HabitHeatmap } from './HabitHeatmap';
import { HabitCelebrationModal } from './HabitCelebration';
import { getCategory, buildWeekPattern, getAchievement } from '../../features/habits/Habitpresentation';
import type { HabitDTO } from '../../types';

export function HabitCard({ habit }: { habit: HabitDTO }) {
  const toggle = useToggleHabit();
  const remove = useDeleteHabit();
  const [showCelebration, setShowCelebration] = useState(false);

  const category = getCategory(habit.title);
  const weekPattern = buildWeekPattern(habit.weekPattern);
  const achievement = getAchievement(Math.max(habit.currentStreak, habit.bestStreak));
  const Icon = category.icon;

  const handleToggle = () => {
    const wasCompleted = habit.completedToday;
    toggle.mutate(habit.id, {
      onSuccess: (updated) => {
        if (!wasCompleted && updated?.completedToday) setShowCelebration(true);
      },
    });
  };

  return (
    <Card variant="default" hoverable className="relative overflow-hidden p-5 sm:p-6 group">
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: category.color }} />

      <div className="flex items-start gap-4">
        <button
          onClick={handleToggle}
          disabled={toggle.isPending}
          className="shrink-0 mt-0.5 tap-target transition-transform duration-150 active:scale-90"
          aria-label={habit.completedToday ? 'Unmark today' : 'Mark done today'}
        >
          {habit.completedToday ? (
            <CheckCircle2 size={26} style={{ color: 'var(--color-success)' }} />
          ) : (
            <Circle size={26} className="text-text-muted hover:text-accent transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: category.bg, color: category.color }}
              >
                <Icon size={14} />
              </div>
              <p
                className={[
                  'text-base sm:text-lg font-bold transition-all duration-200',
                  habit.completedToday ? 'text-success' : 'text-text-primary',
                ].join(' ')}
              >
                {habit.title}
              </p>
              {habit.currentStreak > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning font-extrabold bg-warning/10 px-2 py-0.5 rounded-full">
                  <Flame size={13} /> {habit.currentStreak}d
                </span>
              )}
              {achievement && (
                <span
                  className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{
                    color: achievement.color,
                    background: `color-mix(in srgb, ${achievement.color} 12%, transparent)`,
                  }}
                >
                  <Award size={11} /> {achievement.label}
                </span>
              )}
            </div>

            <button
              onClick={() => remove.mutate(habit.id)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-all shrink-0 tap-target"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <p className="text-[11px] font-bold text-text-muted mt-1">
            {category.name} · Best streak {habit.bestStreak}d
          </p>

          <div className="mt-4 mb-1">
            <ProgressBar
              value={habit.completionsThisWeek}
              max={habit.targetPerWeek}
              color="accent"
              size="sm"
              showLabel
              label={`${habit.completionsThisWeek}/${habit.targetPerWeek} completed this week`}
            />
          </div>

          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <WeekPatternDots pattern={weekPattern} color={category.color} />

            <div>a
              <HabitHeatmap completionDates={habit.completionDates} color={category.color} />
            </div>
          </div>

          {habit.reminderTime && (
            <p className="text-xs text-text-muted font-bold flex items-center gap-1.5 mt-3">
              <Bell size={12} /> Reminds at {habit.reminderTime}
            </p>
          )}
        </div>
      </div>

      <HabitCelebrationModal
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        habitTitle={habit.title}
        currentStreak={habit.currentStreak}
        color={category.color}
      />
    </Card>
  );
}