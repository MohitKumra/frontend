import { Target, TrendingUp, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';

interface Habit {
  id: string;
  name: string;
  completedToday: boolean;
  currentStreak: number;
}

interface HabitsWidgetProps {
  habits: Habit[];
  totalHabits: number;
  completedToday: number;
}

export function HabitsWidget({ habits, totalHabits, completedToday }: HabitsWidgetProps) {
  const navigate = useNavigate();

  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const allDone = totalHabits > 0 && completedToday === totalHabits;

  // Show top 6 habits
  const displayHabits = habits.slice(0, 6);

  return (
    <Card variant="default" className="overflow-hidden">
      <div className="p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-warning)' }}
            >
              <Target size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Daily Habits</h3>
              <p className="text-xs text-text-secondary">Build consistent routines</p>
            </div>
          </div>
        </div>

        {/* Completion Summary */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: allDone
              ? 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface-raised))'
              : 'var(--color-surface-raised)',
            border: `1px solid ${allDone ? 'var(--color-success)' : 'var(--color-border)'}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-black text-text-primary">
                {completedToday}/{totalHabits}
              </p>
              <p className="text-xs text-text-secondary font-bold">Completed today</p>
            </div>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: allDone
                  ? 'var(--gradient-success)'
                  : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
              }}
            >
              <span className="text-lg font-black" style={{ color: allDone ? 'white' : 'var(--color-accent)' }}>
                {completionRate}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completionRate}%`,
                background: allDone ? 'var(--gradient-success)' : 'var(--gradient-accent)',
              }}
            />
          </div>
        </div>

        {/* Habit Chips — simplified design without progress bars */}
        {displayHabits.length > 0 ? (
          <div className="space-y-2 mb-5">
            {displayHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all"
                style={{
                  background: habit.completedToday
                    ? 'color-mix(in srgb, var(--color-success) 6%, var(--color-surface-raised))'
                    : 'var(--color-surface-raised)',
                  border: `1px solid ${habit.completedToday ? 'color-mix(in srgb, var(--color-success) 25%, transparent)' : 'var(--color-border)'}`,
                }}
              >
                {/* Status icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: habit.completedToday ? 'var(--gradient-success)' : 'var(--color-border)',
                  }}
                >
                  {habit.completedToday ? (
                    <CheckCircle2 size={16} className="text-white" />
                  ) : (
                    <Circle size={14} className="text-white" />
                  )}
                </div>

                {/* Habit name */}
                <span
                  className={`text-sm font-bold flex-1 min-w-0 truncate ${
                    habit.completedToday ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {habit.name}
                </span>

                {/* Streak badge */}
                {habit.currentStreak > 0 && (
                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
                      color: 'var(--color-warning)',
                    }}
                  >
                    <TrendingUp size={10} />
                    <span className="text-[10px] font-bold">{habit.currentStreak}d</span>
                  </div>
                )}

                {/* Status label */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                    habit.completedToday ? 'text-success' : 'text-text-muted'
                  }`}
                  style={{
                    background: habit.completedToday
                      ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
                      : 'var(--color-border)',
                  }}
                >
                  {habit.completedToday ? 'Done' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl border p-6 text-center mb-4"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--icon-bg-warning)', color: 'var(--icon-text-warning)' }}
            >
              <Target size={20} />
            </div>
            <p className="text-sm font-bold text-text-primary mb-1">No habits yet</p>
            <p className="text-xs text-text-secondary">Start building consistent daily routines</p>
          </div>
        )}

        {/* View All Button */}
        <button
          type="button"
          onClick={() => navigate('/habits')}
          className="w-full rounded-xl p-3.5 font-bold transition-all hover:shadow-sm text-center"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-accent)',
          }}
        >
          View All Habits
        </button>
      </div>
    </Card>
  );
}
