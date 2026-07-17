import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Clock,
  Flame,
  Trophy,
  Zap,
  Star,
  MoreHorizontal,
} from 'lucide-react';
import { useToggleHabit } from '../../features/habits/hooks/useHabits';
import { Card } from '../ui/Card';
import { HabitCelebrationModal } from './HabitCelebration';
import { getAchievement, getCategory } from '../../features/habits/Habitpresentation';
import type { HabitDTO } from '../../types';

const RING_SIZE = 88; // fixed — the card lives in a narrow grid column, so we don't
                       // switch sizes on viewport breakpoints (those don't reflect
                       // the actual space this card has).

function MiniRing({ value, color, completed = false }: { value: number; color: string; completed?: boolean }) {
  const size = RING_SIZE;
  const stroke = 5; // thin, refined — not a thick gamified band
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-[1]">
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--color-border)" strokeWidth={stroke} opacity="0.4"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          opacity={completed ? 1 : 0.85}
        />
      </svg>
    </div>
  );
}

/** Micro heatmap — small, quiet, refined pips */
function MiniHeatmapStrip({ completionDates, color }: { completionDates: string[]; color: string }) {
  const cells = useMemo(() => {
    const completedSet = new Set(completionDates || []);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return { dateStr, done: completedSet.has(dateStr), isToday: i === 6 };
    });
  }, [completionDates]);

  return (
    <div className="flex items-center gap-2" role="img" aria-label="Last 7 days activity">
      {cells.map((c, i) => (
        <div key={c.dateStr} className="relative flex-1 aspect-square max-w-[22px]">
          {c.isToday && (
            <motion.div
              className="absolute -inset-[2.5px] rounded-full pointer-events-none"
              style={{ border: `1.5px solid color-mix(in srgb, ${color} 55%, transparent)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
            />
          )}
          <motion.div
            title={c.dateStr}
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{
              background: c.done ? `color-mix(in srgb, ${color} 88%, transparent)` : 'var(--color-border)',
              opacity: c.done ? 1 : 0.45,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: c.done ? 1 : 0.45 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            {c.done && <Check size={9} color="#fff" strokeWidth={3} />}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

export function HabitCard({ habit }: { habit: HabitDTO }) {
  const toggle = useToggleHabit();
  const [showCelebration, setShowCelebration] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const category = getCategory(habit.title);
  const achievement = getAchievement(Math.max(habit.currentStreak, habit.bestStreak));
  const Icon = category.icon;

  const progress = useMemo(() => {
    if (!habit.targetPerWeek) return 0;
    return Math.round((habit.completionsThisWeek / habit.targetPerWeek) * 100);
  }, [habit.completionsThisWeek, habit.targetPerWeek]);

  const xpValue = 50;

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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="relative h-full rounded-2xl"
        style={{
          // A quiet ambient shadow rather than a colored glow — the wrapper carries
          // it so it's never clipped by the Card's own border radius.
          boxShadow: isHovered
            ? '0 12px 28px rgba(15, 15, 15, 0.09), 0 2px 6px rgba(15, 15, 15, 0.05)'
            : '0 2px 10px rgba(15, 15, 15, 0.045)',
          transition: 'box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Card
          variant="default"
          className="relative h-full flex flex-col group p-4"
          style={{
            borderRadius: '16px',
            border: habit.completedToday
              ? `1px solid color-mix(in srgb, ${category.color} 35%, var(--color-border))`
              : undefined,
            transition: 'border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Top-right: completed check + menu — small and quiet */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <AnimatePresence>
              {habit.completedToday && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--color-success, #22C55E) 88%, transparent)' }}
                >
                  <Check size={11} color="#fff" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              aria-label="More options"
              className="w-5 h-5 rounded-full flex items-center justify-center text-text-muted/70 hover:text-text-primary transition-colors"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>

          {/* Header: Icon + title + streak */}
          <div className="relative flex items-start gap-2.5 mb-4 pr-9">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in srgb, ${category.color} 10%, transparent)`,
                color: category.color,
              }}
            >
              <Icon size={16} strokeWidth={2} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight mb-1 truncate text-text-primary tracking-tight">
                {habit.title}
              </h4>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide"
                  style={{
                    background: `color-mix(in srgb, ${category.color} 9%, transparent)`,
                    color: category.color,
                  }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: category.color }} />
                  {category.name}
                </span>

                {/* Streak — small, refined outline pill instead of a filled badge */}
                {habit.currentStreak > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <Flame size={9} strokeWidth={2.25} style={{ color: '#C2740A' }} />
                    {habit.currentStreak}d
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress ring + Stats */}
          <div className="relative flex items-center gap-3.5 mb-4">
            <div className="relative flex items-center justify-center shrink-0">
              <MiniRing value={progress} color={category.color} completed={habit.completedToday} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-base font-semibold leading-none text-text-primary tracking-tight">
                  {progress}%
                </p>
                <p className="text-[7px] font-medium uppercase tracking-wider text-text-muted mt-0.5">
                  Done
                </p>
              </div>
            </div>

            {/* Info column — plain, quiet text pairs */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted flex items-center gap-1 text-[10px] font-medium shrink-0">
                  <Clock size={10} strokeWidth={2} /> Next
                </span>
                <span className="font-medium text-text-primary text-[11px] truncate">{habit.reminderTime || '8:00 PM'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted text-[10px] font-medium shrink-0">Duration</span>
                <span className="font-medium text-text-primary text-[11px] truncate">{habit.targetPerWeek * 5} min</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted flex items-center gap-1 text-[10px] font-medium shrink-0">
                  <Zap size={10} strokeWidth={2} /> XP
                </span>
                <span className="font-medium text-[11px] truncate text-text-primary">{xpValue}</span>
              </div>
            </div>
          </div>

          {/* Progress bar — thin, subtle */}
          <div className="relative h-[3px] rounded-full overflow-hidden mb-4" style={{ background: 'var(--color-border)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: category.color, opacity: 0.85 }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
            />
          </div>

          {/* Micro heatmap */}
          <div className="mb-4">
            <p className="text-[9px] font-medium text-text-muted uppercase tracking-wider mb-2">
              Last 7 Days
            </p>
            <MiniHeatmapStrip completionDates={habit.completionDates || []} color={category.color} />
          </div>

          {/* Footer: Achievement + Complete button */}
          <div className="mt-auto pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              {achievement ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Trophy size={12} strokeWidth={2} style={{ color: achievement.color }} />
                  <span className="text-[10px] font-medium truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {achievement.label}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-medium text-text-muted flex items-center gap-1.5">
                  <Star size={9} strokeWidth={2} /> Best: {habit.bestStreak}d
                </span>
              )}
            </div>

            {/* Mark Done / Completed — subtle, no gradients or heavy shadow */}
            <motion.button
              onClick={handleToggle}
              disabled={toggle.isPending}
              className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all tap-target flex items-center justify-center gap-2"
              style={{
                color: habit.completedToday ? 'var(--color-success, #16A34A)' : 'var(--color-text-primary)',
                background: habit.completedToday
                  ? 'color-mix(in srgb, var(--color-success, #22C55E) 10%, transparent)'
                  : 'transparent',
                border: habit.completedToday
                  ? '1px solid color-mix(in srgb, var(--color-success, #22C55E) 30%, transparent)'
                  : '1px solid var(--color-border)',
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.2 }}
            >
              {habit.completedToday ? (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  Completed Today
                </>
              ) : (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ border: '1.5px solid var(--color-text-muted)' }}
                  />
                  Mark Done
                </>
              )}
            </motion.button>
          </div>
        </Card>
      </motion.div>

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