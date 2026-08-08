import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HabitCard } from './HabitCard';
import { HabitCardCompact } from './HabitCardCompact';
import type { HabitDTO } from '../../types';

interface HabitListProps {
  habits: HabitDTO[];
  viewMode: 'grid' | 'list';
  focusedHabitId?: string | null;
}

const PAGE_SIZE = 10;

/** Builds a page-number sequence with ellipses, e.g. [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10] */
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const delta = 1;
  const range: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const withDots: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const i of range) {
    if (prev) {
      if (i - prev === 2) withDots.push(prev + 1);
      else if (i - prev > 2) withDots.push('ellipsis');
    }
    withDots.push(i);
    prev = i;
  }
  return withDots;
}

/**
 * Single pagination bar used by both list and grid views. This replaces the
 * old pattern of horizontal-scroll dots (representing scroll position) stacked
 * on top of Prev/Next page buttons (representing a page of 10) — two controls
 * that didn't correspond to each other. There is now exactly one way to move
 * through the set, and it's the same control in both view modes.
 */
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number; // 0-indexed
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const current = page + 1; // 1-indexed for display/logic
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  const rangeStart = page * pageSize + 1;
  const rangeEnd = Math.min((page + 1) * pageSize, total);
  const pageNumbers = getPageNumbers(current, totalPages);

  const pageButtonClass = (active: boolean) =>
    `min-w-[26px] h-[26px] px-1 rounded-lg text-[11px] font-bold transition-colors ${
      active ? 'text-white' : 'text-text-muted hover:text-text-primary hover:bg-accent/10'
    }`;

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 mt-4 border-t"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <span className="text-[11px] font-medium text-text-muted order-2 sm:order-1">
        Showing {rangeStart}–{rangeEnd} of {total}
      </span>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 text-text-muted hover:text-text-primary hover:bg-accent/10"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Numbered pages — hidden on the narrowest screens in favor of "2 / 5" text */}
        <div className="hidden sm:flex items-center gap-0.5">
          {pageNumbers.map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`dots-${i}`} className="px-1 text-[11px] text-text-muted select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p - 1)}
                aria-label={`Go to page ${p}`}
                aria-current={p === current ? 'page' : undefined}
                className={pageButtonClass(p === current)}
                style={p === current ? { background: 'var(--gradient-accent)' } : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Compact fallback for narrow viewports */}
        <span className="sm:hidden text-[11px] font-bold text-text-muted px-1.5 whitespace-nowrap">
          {current} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label="Next page"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 text-text-muted hover:text-text-primary hover:bg-accent/10"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function HabitList({ habits, viewMode, focusedHabitId }: HabitListProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(habits.length / PAGE_SIZE));
  const paginatedHabits = habits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset to a valid page if the underlying list shrinks (e.g. a habit is deleted)
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  if (habits.length === 0) return null;

  return (
    <div className="relative">
      {/* ── List View ── */}
      {viewMode === 'list' && (
        <div className="flex flex-col">
          <div className="flex flex-col gap-2 sm:gap-3">
            {paginatedHabits.map((h) => (
              <HabitCardCompact key={h.id} habit={h} isFocused={h.id === focusedHabitId} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={habits.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* ── Grid View ── */}
      {/* One responsive grid at every breakpoint — no separate mobile scroll
          rail. Pagination is the only navigation, on every screen size. */}
      {viewMode === 'grid' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {paginatedHabits.map((h) => (
              <HabitCard key={h.id} habit={h} isFocused={h.id === focusedHabitId} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={habits.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
