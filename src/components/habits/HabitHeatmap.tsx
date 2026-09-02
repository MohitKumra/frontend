import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HabitHeatmapProps {
  /** Date -> ratio 0..1 of habits completed on that day */
  dayFrequency: Map<string, number>;
  color?: string;
  /** Dates where ALL habits are on rest/skip day */
  restDays?: Set<string>;
}

const CELL_MIN = 8; // minimum cell size when squeezed
const CELL_DEFAULT = 16; // px — comfortable size when there's room to breathe
const CELL_MAX = 22; // px — cap so cells don't get comically large in wide cards
const GAP_RATIO = 0.22; // gap scales with cell size so proportions stay consistent

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * GitHub-style contribution heatmap showing completion *frequency* per day,
 * scoped to a single calendar month at a time.
 *
 * Each cell's opacity/intensity reflects what fraction of the user's habits
 * (that existed on that date) were completed:
 *   0%      → muted background (no completion)
 *   1–25%   → 25% intensity
 *   26–50%  → 50% intensity
 *   51–75%  → 75% intensity
 *   76–100% → 100% intensity (full accent)
 *
 * Layout: weeks as rows (top to bottom), days as columns (left to right).
 * The grid is padded with empty (non-interactive) cells before day 1 and
 * after the last day of the month so every row lines up Mon–Sun.
 */
export function HabitHeatmap({ dayFrequency, color = 'var(--color-accent)', restDays }: HabitHeatmapProps) {
  // 0 = current month, 1 = one month back, etc.
  const [page, setPage] = useState(0);

  const { cells, monthIndex, monthYear } = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const targetMonthFirst = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - page, 1));
    const mIndex = targetMonthFirst.getUTCMonth();
    const mYear = targetMonthFirst.getUTCFullYear();

    const lastOfMonth = new Date(Date.UTC(mYear, mIndex + 1, 0));
    const daysInMonth = lastOfMonth.getUTCDate();

    const firstDow = targetMonthFirst.getUTCDay(); // 0=Sun..6=Sat
    const leadingPad = (firstDow + 6) % 7;

    const lastDow = lastOfMonth.getUTCDay();
    const trailingPad = (7 - lastDow) % 7;

    const totalCells = leadingPad + daysInMonth + trailingPad;

    const gridStart = new Date(targetMonthFirst);
    gridStart.setUTCDate(gridStart.getUTCDate() - leadingPad);

    const cells = Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(gridStart);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const inMonth = d.getUTCMonth() === mIndex;
      const intensity = dayFrequency.get(dateStr) ?? 0;
      const done = intensity > 0;
      const isFuture = d > today;
      const isToday = d.getTime() === today.getTime();
      return { dateStr, inMonth, done, isFuture, isToday, intensity };
    });

    return { cells, monthIndex: mIndex, monthYear: mYear };
  }, [dayFrequency, page]);

  const label = `${MONTH_LABELS[monthIndex]} ${monthYear}`;
  const isCurrentMonth = page === 0;

  const intensityOpacity = (intensity: number): number => {
    if (intensity <= 0) return 0;
    if (intensity <= 0.25) return 0.25;
    if (intensity <= 0.5) return 0.5;
    if (intensity <= 0.75) return 0.75;
    return 1;
  };

  const cellTooltip = (dateStr: string, intensity: number) => {
    if (intensity <= 0) {
      return `${dateStr} — no habits completed`;
    }
    const pct = Math.round(intensity * 100);
    return `${dateStr} — ${pct}% completed`;
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="flex items-center justify-center w-6 h-6 rounded-full text-text-muted hover:text-text-primary transition-colors tap-target"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          aria-label="Show previous month"
        >
          <ChevronLeft size={13} />
        </button>

        <p className="text-[13px] font-black text-text-primary tracking-tight whitespace-nowrap min-w-[92px] text-center">
          {label}
        </p>

        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={isCurrentMonth}
          className="flex items-center justify-center w-6 h-6 rounded-full text-text-muted hover:text-text-primary transition-colors tap-target disabled:opacity-30 disabled:hover:text-text-muted disabled:cursor-not-allowed"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          aria-label="Show next month"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Grid panel */}
      <div
        className="w-full rounded-2xl px-3 py-3.5 flex flex-col items-center gap-2"
        style={{ background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))' }}
      >
        {/* Weekday labels */}
        <div
          className="grid grid-cols-7 gap-1.5 sm:gap-2 w-full max-w-[240px] mx-auto justify-items-center"
          aria-hidden="true"
        >
          {WEEKDAY_LABELS.map((d, i) => (
            <span
              key={i}
              className="text-center text-[9px] font-bold uppercase text-text-muted/60 select-none leading-none tracking-wider"
            >
              {d}
            </span>
          ))}
        </div>

        <div
          key={`${monthIndex}-${monthYear}`}
          className="grid grid-cols-7 gap-1.5 sm:gap-2 w-full max-w-[240px] mx-auto justify-items-center"
          role="img"
          aria-label={`Completion history for ${label}`}
        >
          {cells.map((cell) => {
            const opacity = intensityOpacity(cell.intensity);
            const isRestDay = restDays?.has(cell.dateStr);

            if (!cell.inMonth) {
              return (
                <div
                  key={cell.dateStr}
                  className="aspect-square w-full max-w-[22px]"
                />
              );
            }

            return (
              <div
                key={cell.dateStr}
                title={isRestDay ? `${cell.dateStr} — Rest day` : cellTooltip(cell.dateStr, cell.intensity)}
                className="aspect-square w-full max-w-[22px] rounded-[5px] transition-all duration-150 hover:scale-[1.15] hover:z-10 relative flex items-center justify-center"
                style={{
                  background: isRestDay
                    ? 'color-mix(in srgb, #8B5CF6 30%, transparent)'
                    : cell.done
                      ? `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`
                      : 'color-mix(in srgb, var(--color-text-muted) 14%, transparent)',
                  border: isRestDay
                    ? '1px solid color-mix(in srgb, #8B5CF6 25%, transparent)'
                    : cell.done
                      ? 'none'
                      : '1px solid color-mix(in srgb, var(--color-text-muted) 22%, transparent)',
                  opacity: cell.isFuture ? 0.35 : 1,
                  outline: cell.isToday ? `2px solid ${color}` : 'none',
                  outlineOffset: '1.5px',
                  boxShadow: cell.done
                    ? `0 1px 3px color-mix(in srgb, ${color} 35%, transparent)`
                    : isRestDay
                      ? '0 1px 3px color-mix(in srgb, #8B5CF6 25%, transparent)'
                      : 'none',
                }}
              >
                {isRestDay && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.7"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
