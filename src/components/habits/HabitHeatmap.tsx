import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HabitHeatmapProps {
  completionDates: string[]; // 'YYYY-MM-DD' UTC strings from the API — real history
  color?: string;
  weeks?: number; // how many weeks to show per page, default 4
}

const CELL_DEFAULT = 13; // px — cell size, bumped up from 10 for visibility
const CELL_MIN = 8; // minimum cell size when squeezed

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * GitHub-style contribution heatmap.
 * Layout: weeks as rows (top to bottom), days as columns (left to right).
 * Top-left = oldest week Monday of the page, Top-right = oldest week Sunday.
 * Bottom-left = newest week Monday, Bottom-right = newest week Sunday.
 *
 * A prev/next filter above the grid lets the user page backward and forward
 * through history in `weeks`-sized chunks, so they can reach older months/years.
 */
export function HabitHeatmap({ completionDates, color = 'var(--color-accent)', weeks = 4 }: HabitHeatmapProps) {
  const completedSet = useMemo(() => new Set(completionDates), [completionDates]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(CELL_DEFAULT);

  // Responsive cell sizing: shrink cells when container is narrow
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computeSize = () => {
      const containerWidth = el.clientWidth;
      // Total grid width = (7 cells * cellSize) + (6 gaps * 3px) + some padding
      const GAP = 3;
      const maxGridWidth = containerWidth - 4; // 2px margin each side
      const idealWidth = 7 * CELL_DEFAULT + 6 * GAP;
      if (idealWidth <= maxGridWidth) {
        setCellSize(CELL_DEFAULT);
      } else {
        // Shrink proportionally — cellSize = (maxGridWidth - 6*GAP) / 7
        const shrunk = Math.max(CELL_MIN, Math.floor((maxGridWidth - 6 * GAP) / 7));
        setCellSize(shrunk);
      }
    };

    computeSize();
    const observer = new ResizeObserver(computeSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);


  // 0 = current page (most recent), 1 = one page back, etc.
  const [page, setPage] = useState(0);

  const { cells, gridStart, gridEnd } = useMemo(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const dow = today.getUTCDay(); // 0=Sun..6=Sat
    const offsetToMonday = (dow + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(thisMonday.getUTCDate() - offsetToMonday);

    // Shift the whole window back by `page` chunks of `weeks` weeks.
    const pageStart = new Date(thisMonday);
    pageStart.setUTCDate(pageStart.getUTCDate() - page * weeks * 7);

    const start = new Date(pageStart);
    start.setUTCDate(start.getUTCDate() - (weeks - 1) * 7);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + weeks * 7 - 1);

    const totalDays = weeks * 7;
    const cells = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isFuture = d.getTime() > today.getTime();
      const isToday = dateStr === today.toISOString().split('T')[0];
      const done = !isFuture && completedSet.has(dateStr);
      const weekIdx = Math.floor(i / 7); // row (0 = oldest week on this page)
      const dayIdx = i % 7; // column (0 = Monday)
      return { dateStr, done, isFuture, isToday, weekIdx, dayIdx };
    });

    return { cells, gridStart: start, gridEnd: end };
  }, [completedSet, weeks, page]);

  const label = useMemo(() => {
    const startMonth = MONTH_LABELS[gridStart.getUTCMonth()];
    const endMonth = MONTH_LABELS[gridEnd.getUTCMonth()];
    const startYear = gridStart.getUTCFullYear();
    const endYear = gridEnd.getUTCFullYear();

    if (startYear === endYear) {
      return startMonth === endMonth ? `${startMonth} ${startYear}` : `${startMonth} – ${endMonth} ${startYear}`;
    }
    return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
  }, [gridStart, gridEnd]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors tap-target"
          aria-label="Show earlier period"
        >
          <ChevronLeft size={14} />
        </button>

        <p className="text-[10px] font-extrabold text-text-primary uppercase tracking-wider whitespace-nowrap">
          {label}
        </p>

        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors tap-target disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          aria-label="Show later period"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="grid mx-auto"
        style={{
          gridTemplateColumns: `repeat(7, ${cellSize}px)`,
          gridTemplateRows: `repeat(${weeks}, ${cellSize}px)`,
          gap: '3px',
        }}
        role="img"
        aria-label={`${weeks}-week completion history, ${label}`}
      >
        {cells.map((cell) => (
          <div
            key={cell.dateStr}
            title={`${cell.dateStr}${cell.done ? ' — completed' : ''}`}
            className="rounded-[3px] transition-transform hover:scale-110"
            style={{
              gridColumn: cell.dayIdx + 1,
              gridRow: cell.weekIdx + 1,
              background: cell.done ? color : 'color-mix(in srgb, var(--color-text-muted) 18%, transparent)',
              border: cell.done ? 'none' : '1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)',
              opacity: cell.isFuture ? 0.35 : 1,
              outline: cell.isToday ? `1.5px solid ${color}` : 'none',
              outlineOffset: '1.5px',
              boxShadow: cell.done ? `0 0 0 1px color-mix(in srgb, ${color} 40%, transparent)` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}