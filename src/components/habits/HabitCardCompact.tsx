import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Flame, Clock } from 'lucide-react';
import { useToggleHabit } from '../../features/habits/hooks/useHabits';
import { Card } from '../ui/Card';
import { HabitCelebrationModal } from './HabitCelebration';
import { getCategory } from '../../features/habits/Habitpresentation';
import type { HabitDTO } from '../../types';

function MiniRing({ value, color, size = 44 }: { value: number; color: string; size?: number }) {
  const stroke = 4.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="var(--color-border)" strokeWidth={stroke} opacity={0.35}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}

export function HabitCardCompact({ habit }: { habit: HabitDTO }) {
  const toggle = useToggleHabit();
  const [showCelebration, setShowCelebration] = useState(false);
  const category = getCategory(habit.title);
  const Icon = category.icon;

  const progress = useMemo(() => {
    if (!habit.targetPerWeek) return 0;
    return Math.round((habit.completionsThisWeek / habit.targetPerWeek) * 100);
  }, [habit.completionsThisWeek, habit.targetPerWeek]);

  const handleToggle = () => {
    const wasCompleted = habit.completedToday;
    toggle.mutate(habit.id, {
      onSuccess: (updated) => {
        if (!wasCompleted && updated?.completedToday) setShowCelebration(true);
      },
    });
  };

  return (
    <>
      <Card
        variant="default"
        className="relative overflow-hidden p-4"
        style={{
          borderRadius: '20px',
          border: habit.completedToday
            ? `1.5px solid color-mix(in srgb, ${category.color} 45%, var(--color-border))`
            : '1px solid var(--color-border)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: `linear-gradient(180deg, ${category.color}, ${category.color}99)` }}
        />

        <div className="flex items-center gap-4 pl-1.5">
          {/* Checkbox */}
          <button
            onClick={handleToggle}
            disabled={toggle.isPending}
            className="shrink-0 transition-colors duration-150 tap-target"
            aria-label={habit.completedToday ? 'Unmark today' : 'Mark done today'}
          >
            {habit.completedToday ? (
              <CheckCircle2 size={26} style={{ color: 'var(--color-success)' }} fill="var(--color-success)" fillOpacity={0.16} />
            ) : (
              <Circle size={26} className="text-text-muted" />
            )}
          </button>

          {/* Icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `color-mix(in srgb, ${category.color} 14%, transparent)`,
              color: category.color,
              boxShadow: `0 3px 10px color-mix(in srgb, ${category.color} 20%, transparent)`,
            }}
          >
            <Icon size={19} strokeWidth={2.25} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className={`text-sm font-extrabold truncate ${habit.completedToday ? 'text-success' : 'text-text-primary'}`}>
                {habit.title}
              </p>
              {habit.currentStreak > 0 && (
                <span
                  className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: 'var(--color-warning)', background: 'color-mix(in srgb, var(--color-warning) 14%, transparent)' }}
                >
                  <Flame size={10} /> {habit.currentStreak}d
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: category.color, background: `color-mix(in srgb, ${category.color} 12%, transparent)` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: category.color }} />
                {category.name}
              </span>
              <p className="text-[10px] font-semibold text-text-muted">
                {habit.completionsThisWeek}/{habit.targetPerWeek} this week
              </p>
            </div>
          </div>

          {/* Reminder time */}
          {habit.reminderTime && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-text-muted shrink-0">
              <Clock size={12} />
              <span>{habit.reminderTime}</span>
            </div>
          )}

          {/* Mini progress ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <MiniRing value={progress} color={category.color} />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[10px] font-black text-text-primary">{progress}%</p>
            </div>
          </div>
        </div>
      </Card>

      <HabitCelebrationModal
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        habitTitle={habit.title}
        currentStreak={habit.currentStreak}
        color={category.color}
      />
    </>
  );
}