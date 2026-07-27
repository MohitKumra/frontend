import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck2, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import type { HabitDTO, WeekDayDTO } from '../../types';

interface WeekOverviewProps {
  habits: HabitDTO[];
  onViewDetails?: () => void;
}

const ACCENT = 'var(--color-accent, #6366F1)';
const DANGER = 'var(--color-danger, #EF4444)';
const SUCCESS = '#10B981';

/** Ring with an optional two-tone remainder (used for "today", so the
 *  unfinished portion of the day reads as an active prompt, not a dead track). */
function DayRing({
  score,
  isFuture,
  isToday,
}: {
  score: number;
  isFuture: boolean;
  isToday: boolean;
}) {
  const clamped = Math.min(Math.max(score, 0), 100);

  const primaryColor = isToday ? ACCENT : SUCCESS;
  const remainderColor = isToday ? DANGER : 'var(--color-border)';

  const gradient =
    isFuture || clamped === 0
      ? 'var(--color-border)'
      : `conic-gradient(${primaryColor} 0% ${clamped}%, ${remainderColor} ${clamped}% 100%)`;

  return (
    <motion.div
      className="relative"
      style={{ width: 'clamp(34px, 11cqw, 56px)', height: 'clamp(34px, 11cqw, 56px)' }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: gradient, opacity: isFuture ? 0.4 : 1 }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: 'clamp(3px, 1cqw, 5px)',
          background: 'var(--card-bg, var(--color-surface))',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="font-black leading-none"
          style={{
            fontSize: 'clamp(9px, 2.9cqw, 15px)',
            color: isFuture ? 'var(--color-text-muted)' : isToday ? ACCENT : 'var(--color-text-primary)',
          }}
        >
          {isFuture ? '\u2014' : score}
        </p>
      </div>
    </motion.div>
  );
}

/** Small ascending trend bars beneath each day */
function TrendBars({ score, isFuture, isToday }: { score: number; isFuture: boolean; isToday: boolean }) {
  const active = !isFuture && score > 0;
  const color = isToday ? ACCENT : SUCCESS;
  const heights = [0.35, 0.55, 0.75, 1].map((h) => h * (0.55 + (Math.min(score, 100) / 100) * 0.45));

  return (
    <div className="flex items-end justify-center gap-1" style={{ height: 'clamp(12px, 3.5cqw, 16px)' }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 'clamp(2px, 0.8cqw, 4px)',
            height: `${Math.max(h, 0.25) * 100}%`,
            background: active ? color : 'var(--color-border)',
            opacity: active ? (i === heights.length - 1 ? 1 : 0.55 + i * 0.12) : 0.6,
          }}
        />
      ))}
    </div>
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return (d.getUTCDay() + 6) % 7;
}

function parseSkipDays(raw: number[]): number[] {
  return raw || [];
}

function utcMondayOfThisWeek(): Date {
  const today = utcToday();
  const dow = today.getUTCDay();
  const offset = (dow + 6) % 7;
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() - offset);
  return monday;
}

export function WeekOverview({ habits, onViewDetails }: WeekOverviewProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const dayScores: WeekDayDTO[] = useMemo(() => {
    const monday = utcMondayOfThisWeek();
    const today = utcToday();

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = toDateStr(d);

      const eligibleHabits = habits.filter((h) => {
        const createdDate = h.createdAt ? h.createdAt.split('T')[0] : null;
        return createdDate && createdDate <= dateStr;
      });

      const completed = eligibleHabits.filter((h) => {
        const skipDayIndices = parseSkipDays(h.skipDays);
        const dow = getDayOfWeek(dateStr);
        // Skip days count as automatically completed
        if (skipDayIndices.includes(dow)) return true;
        return (h.completionDates || []).some((c) => c === dateStr);
      }).length;

      const total = eligibleHabits.length;
      const score = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        date: dateStr,
        score,
        completed,
        total,
        isFuture: d > today,
        isToday: toDateStr(d) === toDateStr(today),
      };
    });
  }, [habits]);

  const getStatusLabel = (d: WeekDayDTO) => {
    if (d.isFuture) return 'Upcoming';
    if (d.score === 0) return 'Not Started';
    if (d.score >= 90) return 'Great';
    if (d.score >= 70) return d.isToday ? 'Keep Going' : 'Good';
    if (d.score >= 50) return 'Keep Going';
    return 'Fair';
  };

  const getStatusColor = (d: WeekDayDTO) => {
    if (d.isFuture || d.score === 0) return 'var(--color-text-muted)';
    if (d.isToday && d.score < 100) return DANGER;
    return SUCCESS;
  };

  const completedThisWeek = dayScores.reduce((sum, day) => sum + (day.isFuture ? 0 : day.completed), 0);
  const totalThisWeek = dayScores.reduce((sum, day) => sum + (day.isFuture ? 0 : day.total), 0);
  const averageScore = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;

  return (
    <Card
      variant="default"
      className="overflow-hidden p-4 sm:p-5"
      style={{ containerType: 'inline-size', containerName: 'weekoverview' } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, ' + ACCENT + ' 12%, transparent)' }}
          >
            <CalendarCheck2 size={18} style={{ stroke: ACCENT }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-text-primary leading-tight">
              Week Overview
            </h3>
            <p className="text-[11px] sm:text-xs text-text-muted">
              Daily consistency without the clutter
            </p>
          </div>
        </div>

        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold shrink-0 transition-colors"
            style={{
              color: ACCENT,
              border: `1.5px solid color-mix(in srgb, ${ACCENT} 30%, transparent)`,
              background: 'color-mix(in srgb, ' + ACCENT + ' 5%, transparent)',
            }}
          >
            <BarChart3 size={14} style={{ stroke: ACCENT }} />
            View Details
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Average</p>
          <p className="mt-1 text-lg font-black text-text-primary">{averageScore}%</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Done</p>
          <p className="mt-1 text-lg font-black text-text-primary">{completedThisWeek}</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total</p>
          <p className="mt-1 text-lg font-black text-text-primary">{totalThisWeek}</p>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-7"
        style={{ gap: 'clamp(3px, 1.2cqw, 8px)' }}
      >
        {dayScores.map((d, idx) => {
          const isToday = d.isToday;
          const label = getStatusLabel(d);
          const labelColor = getStatusColor(d);

          return (
            <div key={days[idx]} className="relative flex justify-center min-w-0">
              {isToday && (
                <motion.div
                  layoutId="week-today-highlight"
                  className="absolute -inset-y-2 -inset-x-0.5 rounded-2xl -z-[1]"
                  style={{ background: 'color-mix(in srgb, ' + ACCENT + ' 6%, transparent)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              <div
                className="flex w-full flex-col items-center gap-1.5 rounded-2xl border min-w-0"
                style={{
                  minHeight: 'clamp(92px, 30cqw, 128px)',
                  padding: 'clamp(4px, 1.6cqw, 10px) clamp(2px, 1cqw, 8px)',
                  borderColor: isToday ? 'color-mix(in srgb, var(--color-accent) 34%, var(--color-border))' : 'var(--color-border)',
                  background: isToday ? 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))' : 'var(--color-surface)',
                }}
              >
                <p
                  className="font-extrabold uppercase tracking-wider"
                  style={{ fontSize: 'clamp(8px, 2.4cqw, 10px)', color: isToday ? ACCENT : 'var(--color-text-muted)' }}
                >
                  {days[idx]}
                </p>

                <DayRing score={d.score} isFuture={d.isFuture} isToday={isToday} />

                <p
                  className="font-bold text-center line-clamp-1 w-full"
                  style={{ fontSize: 'clamp(8px, 2.4cqw, 10px)', color: labelColor }}
                >
                  {label}
                </p>

                <TrendBars score={d.score} isFuture={d.isFuture} isToday={isToday} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}