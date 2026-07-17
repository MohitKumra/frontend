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

  return (
    <Card variant="default" className="p-4 sm:p-5 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, ' + ACCENT + ' 12%, transparent)' }}
          >
            <CalendarCheck2 size={18} className="sm:w-5 sm:h-5" style={{ color: ACCENT }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-text-primary leading-tight truncate">
              Your Week at a Glance
            </h3>
            <p className="text-[11px] sm:text-xs lg:text-[13px] text-text-muted truncate">
              Track your progress and stay consistent every day
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

      {/* Days */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {loading ? (
          Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 py-2 px-0.5 sm:px-1 w-full">
              <p className="text-[9px] sm:text-[10px] lg:text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {days[idx]}
              </p>
              <div className="sm:hidden">
                <div className="rounded-full" style={{ width: 48, height: 48, background: 'var(--color-border)' }} />
              </div>
              <div className="hidden sm:block">
                <div className="rounded-full" style={{ width: 64, height: 64, background: 'var(--color-border)' }} />
              </div>
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
                  className={[
                    'flex flex-col items-center gap-2 py-2 px-0.5 sm:px-1 w-full',
                    idx !== days.length - 1 ? 'border-r' : '',
                  ].join(' ')}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p
                    className="text-[9px] sm:text-[10px] lg:text-xs font-extrabold uppercase tracking-wider"
                    style={{ color: isToday ? ACCENT : 'var(--color-text-muted)' }}
                  >
                    {days[idx]}
                  </p>

                  {/* Responsive DayRing sizes */}
                  <div className="hidden sm:block">
                    <DayRing score={d.score} isFuture={d.isFuture} isToday={isToday} size={64} />
                  </div>
                  <div className="sm:hidden">
                    <DayRing score={d.score} isFuture={d.isFuture} isToday={isToday} size={48} />
                  </div>

                  <p className="text-[9px] sm:text-[11px] lg:text-xs font-bold text-center line-clamp-1" style={{ color: labelColor }}>
                    {label}
                  </p>

                  <TrendBars score={d.score} isFuture={d.isFuture} isToday={isToday} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}