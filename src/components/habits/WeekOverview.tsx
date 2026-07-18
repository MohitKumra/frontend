import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck2, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { habitsApi } from '../../features/habits/api';
import type { WeekDayDTO } from '../../types';

interface WeekOverviewProps {
  onViewDetails?: () => void;
}

const ACCENT = 'var(--color-accent, #6366F1)';
const DANGER = 'var(--color-danger, #EF4444)';
const SUCCESS = '#10B981';

/** Ring with an optional two-tone remainder (used for "today", so the
 *  unfinished portion of the day reads as an active prompt, not a dead track).
 *  Built with a conic-gradient + masked center — far more reliable for a
 *  two-color ring than hand-rotated SVG arcs. */
function DayRing({
  score,
  isFuture,
  isToday,
  size = 56,
}: {
  score: number;
  isFuture: boolean;
  isToday: boolean;
  size?: number;
}) {
  const stroke = 5;
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
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: gradient, opacity: isFuture ? 0.4 : 1 }}
      />
      {/* Mask out the center to turn the filled disc into a ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: stroke,
          background: 'var(--card-bg, var(--color-surface))',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="font-black leading-none"
          style={{
            fontSize: size * 0.26,
            color: isFuture ? 'var(--color-text-muted)' : isToday ? ACCENT : 'var(--color-text-primary)',
          }}
        >
          {isFuture ? '\u2014' : score}
        </p>
      </div>
    </motion.div>
  );
}

/** Small ascending trend bars beneath each day — decorative confirmation of activity level */
function TrendBars({ score, isFuture, isToday }: { score: number; isFuture: boolean; isToday: boolean }) {
  const active = !isFuture && score > 0;
  const color = isToday ? ACCENT : SUCCESS;
  // Four bars with a gentle ascending profile, scaled a little by the day's score
  const heights = [0.35, 0.55, 0.75, 1].map((h) => h * (0.55 + (Math.min(score, 100) / 100) * 0.45));

  return (
    <div className="flex items-end justify-center gap-1 h-4">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full"
          style={{
            height: `${Math.max(h, 0.25) * 100}%`,
            background: active ? color : 'var(--color-border)',
            opacity: active ? (i === heights.length - 1 ? 1 : 0.55 + i * 0.12) : 0.6,
          }}
        />
      ))}
    </div>
  );
}

export function WeekOverview({ onViewDetails }: WeekOverviewProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [dayScores, setDayScores] = useState<WeekDayDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    habitsApi.weekOverview().then((data) => {
      if (!cancelled) {
        setDayScores(data.days);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

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
  const averageScore =
    dayScores.filter((day) => !day.isFuture).length > 0
      ? Math.round(
          dayScores
            .filter((day) => !day.isFuture)
            .reduce((sum, day) => sum + day.score, 0) /
            dayScores.filter((day) => !day.isFuture).length
        )
      : 0;

  return (
    <Card variant="default" className="overflow-hidden p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, ' + ACCENT + ' 12%, transparent)' }}
          >
            <CalendarCheck2 size={18} style={{ color: ACCENT }} />
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
            <BarChart3 size={14} />
            View Details
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Average</p>
          <p className="mt-1 text-lg font-black text-text-primary">{loading ? '--' : `${averageScore}%`}</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Done</p>
          <p className="mt-1 text-lg font-black text-text-primary">{loading ? '--' : completedThisWeek}</p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total</p>
          <p className="mt-1 text-lg font-black text-text-primary">{loading ? '--' : totalThisWeek}</p>
        </div>
      </div>

      {/* Days */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="grid min-w-[620px] grid-cols-7 gap-2">
        {loading ? (
          Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="flex min-h-[128px] flex-col items-center gap-2 rounded-2xl border px-2 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
              <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {days[idx]}
              </p>
              <div className="rounded-full" style={{ width: 52, height: 52, background: 'var(--color-border)' }} />
            </div>
          ))
        ) : (
          dayScores.map((d, idx) => {
            const isToday = d.isToday;
            const label = getStatusLabel(d);
            const labelColor = getStatusColor(d);

            return (
              <div key={days[idx]} className="relative flex justify-center">
                {/* Highlight panel behind today's column */}
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
                  className="flex min-h-[128px] w-full flex-col items-center gap-2 rounded-2xl border px-2 py-3"
                  style={{
                    borderColor: isToday ? 'color-mix(in srgb, var(--color-accent) 34%, var(--color-border))' : 'var(--color-border)',
                    background: isToday ? 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))' : 'var(--color-surface)',
                  }}
                >
                  <p
                    className="text-[10px] font-extrabold uppercase tracking-wider"
                    style={{ color: isToday ? ACCENT : 'var(--color-text-muted)' }}
                  >
                    {days[idx]}
                  </p>

                  <DayRing score={d.score} isFuture={d.isFuture} isToday={isToday} size={52} />

                  <p className="text-[10px] font-bold text-center line-clamp-1" style={{ color: labelColor }}>
                    {label}
                  </p>

                  <TrendBars score={d.score} isFuture={d.isFuture} isToday={isToday} />
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
    </Card>
  );
}
