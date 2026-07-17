import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HabitCard } from './HabitCard';
import { HabitCardCompact } from './HabitCardCompact';
import type { HabitDTO } from '../../types';

interface HabitListProps {
  habits: HabitDTO[];
  viewMode: 'grid' | 'list';
}

const CARD_WIDTH = 300; // px, matches HabitCard's comfortable min width

export function HabitList({ habits, viewMode }: HabitListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [totalScrollWidth, setTotalScrollWidth] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    setScrollPosition(el.scrollLeft);
    setContainerWidth(el.clientWidth);
    setTotalScrollWidth(el.scrollWidth);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, habits.length]);

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * (CARD_WIDTH + 16) * 2, behavior: 'smooth' });
  };

  const scrollToIndex = (index: number) => {
    scrollRef.current?.scrollTo({ left: index * (CARD_WIDTH + 16), behavior: 'smooth' });
  };

  const currentPage = Math.floor(scrollPosition / (CARD_WIDTH + 16));
  const totalPages = Math.ceil(totalScrollWidth / (CARD_WIDTH + 16));

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-2 sm:gap-3">
        {habits.map((h) => <HabitCardCompact key={h.id} habit={h} />)}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ── Desktop: responsive grid (lg+) ── */}
      <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {habits.map((h) => (
          <HabitCard key={h.id} habit={h} />
        ))}
      </div>

      {/* ── Mobile/tablet: horizontal scroll (below lg) ── */}
      <div className="lg:hidden relative">
        {/* Left fade + arrow */}
        {canScrollLeft && (
          <>
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-12 z-10"
              style={{ background: 'linear-gradient(90deg, var(--color-bg, var(--color-surface)), transparent)' }}
            />
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll habits left"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <ChevronLeft size={14} className="sm:w-4 sm:h-4 text-text-primary" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {habits.map((h) => (
            <div key={h.id} className="shrink-0 snap-start w-[280px] sm:w-[300px]">
              <HabitCard habit={h} />
            </div>
          ))}
        </div>

        {/* Right fade + arrow */}
        {canScrollRight && (
          <>
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-12 z-10"
              style={{ background: 'linear-gradient(270deg, var(--color-bg, var(--color-surface)), transparent)' }}
            />
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll habits right"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <ChevronRight size={14} className="sm:w-4 sm:h-4 text-text-primary" />
            </button>
          </>
        )}

        {/* Scroll indicators (dots) */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToIndex(idx)}
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${
                  idx === currentPage 
                    ? 'bg-accent w-4 sm:w-6' 
                    : 'bg-border hover:bg-accent/50'
                }`}
                aria-label={`Go to page ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}