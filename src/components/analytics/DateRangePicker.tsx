import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check, RotateCcw, X, SlidersHorizontal } from 'lucide-react';

export type DateRangePreset =
  'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
];

/** Utility to compute YYYY-MM-DD for local Date */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computePresetDates(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { startDate: formatDate(today), endDate: formatDate(today) };

    case 'yesterday': {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      return { startDate: formatDate(yest), endDate: formatDate(yest) };
    }

    case 'this_week': {
      const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(monday.getDate() + diffToMon);
      return { startDate: formatDate(monday), endDate: formatDate(today) };
    }

    case 'last_week': {
      const dayOfWeek = today.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const lastMon = new Date(today);
      lastMon.setDate(lastMon.getDate() + diffToMon - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastSun.getDate() + 6);
      return { startDate: formatDate(lastMon), endDate: formatDate(lastSun) };
    }

    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatDate(firstDay), endDate: formatDate(today) };
    }

    case 'last_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
    }

    case 'custom':
      return {
        startDate: customStart || formatDate(today),
        endDate: customEnd || formatDate(today),
      };

    default:
      return { startDate: formatDate(today), endDate: formatDate(today) };
  }
}

/** Format YYYY-MM-DD into readable date (e.g. "Jul 21, 2026") */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const springConfig = { type: 'spring' as const, stiffness: 420, damping: 32 };

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [tempStart, setTempStart] = useState(value.startDate);
  const [tempEnd, setTempEnd] = useState(value.endDate);

  // Track button refs for the sliding pill indicator
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setTempStart(value.startDate);
      setTempEnd(value.endDate);
      setIsCustomModalOpen(true);
      return;
    }

    const dates = computePresetDates(preset);
    onChange({
      preset,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempStart || !tempEnd) return;

    // Ensure start date <= end date
    let start = tempStart;
    let end = tempEnd;
    if (start > end) {
      const swap = start;
      start = end;
      end = swap;
    }

    onChange({
      preset: 'custom',
      startDate: start,
      endDate: end,
    });
    setIsCustomModalOpen(false);
  };

  const handleClear = () => {
    const dates = computePresetDates('this_week');
    onChange({
      preset: 'this_week',
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  };

  const formattedRangeText =
    value.startDate === value.endDate
      ? formatReadableDate(value.startDate)
      : `${formatReadableDate(value.startDate)} – ${formatReadableDate(value.endDate)}`;

  return (
    <>
      {/* Single pill container — all-in-one filter bar */}
      <div
        ref={containerRef}
        className="relative flex items-center gap-2 overflow-hidden rounded-full border px-2 py-1.5 shadow-[0_8px_32px_rgba(2,6,23,0.10)] backdrop-blur-xl sm:gap-3 sm:px-3 sm:py-2 2xl:gap-4 2xl:px-4 2xl:py-2.5"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-elevated) 96%, white), var(--color-surface-elevated))',
          borderColor: 'var(--color-border-subtle)',
        }}
      >
        {/* Filter icon */}
        <div className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 2xl:px-3">
          <SlidersHorizontal size={13} className="text-accent 2xl:hidden" />
          <SlidersHorizontal size={16} className="text-accent hidden 2xl:block" />
        </div>

        {/* Preset pills with sliding indicator */}
        <div className="relative flex items-center gap-1 overflow-x-auto no-scrollbar 2xl:gap-2">
          {PRESETS.map((preset) => {
            const isActive = value.preset === preset.id;
            return (
              <button
                key={preset.id}
                ref={(el) => {
                  if (el) buttonRefs.current.set(preset.id, el);
                  else buttonRefs.current.delete(preset.id);
                }}
                onClick={() => handlePresetSelect(preset.id)}
                className={`relative z-10 flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[10.5px] font-extrabold whitespace-nowrap transition-colors duration-200 2xl:px-4 2xl:py-1.5 2xl:text-sm ${
                  isActive ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {preset.id === 'custom' && (
                  <>
                    <Calendar size={11} className={`2xl:hidden ${isActive ? 'text-white' : 'text-accent'}`} />
                    <Calendar size={14} className={`hidden 2xl:block ${isActive ? 'text-white' : 'text-accent'}`} />
                  </>
                )}
                <span>{preset.label}</span>

                {/* Sliding pill indicator — only for non-custom presets */}
                {isActive && preset.id !== 'custom' && (
                  <motion.div
                    layoutId="activeFilterPill"
                    className="absolute inset-0 -z-10 rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-info) 70%, var(--color-accent)))',
                      boxShadow: '0 2px 8px color-mix(in srgb, var(--color-accent) 35%, transparent)',
                    }}
                    transition={springConfig}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="h-4 w-px shrink-0 2xl:h-5" style={{ background: 'var(--color-border-subtle)' }} />

        {/* Inline date range display + custom edit */}
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 2xl:gap-2 2xl:px-3 2xl:py-1.5"
          style={{ background: 'color-mix(in srgb, var(--color-surface) 90%, transparent)' }}
        >
          <Calendar size={11} className="text-accent 2xl:hidden" />
          <Calendar size={14} className="text-accent hidden 2xl:block" />
          <span
            className="whitespace-nowrap text-[10px] font-bold tracking-tight 2xl:text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {formattedRangeText}
          </span>
          {value.preset === 'custom' && (
            <>
              <button
                onClick={() => {
                  setTempStart(value.startDate);
                  setTempEnd(value.endDate);
                  setIsCustomModalOpen(true);
                }}
                className="ml-0.5 text-[9px] font-black uppercase tracking-wide text-accent hover:underline 2xl:text-xs"
              >
                Edit
              </button>
              <button
                onClick={handleClear}
                title="Clear custom date range"
                className="ml-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-text-muted transition-colors hover:text-text-primary hover:bg-surface-raised 2xl:text-xs 2xl:px-2"
              >
                <RotateCcw size={10} className="2xl:hidden" />
                <RotateCcw size={12} className="hidden 2xl:block" />
                Clear
              </button>
            </>
          )}
        </div>

        {/* Active custom pill indicator (shown separately since custom opens modal) */}
        {value.preset === 'custom' && (
          <motion.div
            layoutId="activeFilterPill"
            className="absolute rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-info) 70%, var(--color-accent)))',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--color-accent) 35%, transparent)',
              opacity: 0.15,
              inset: 0,
            }}
            transition={springConfig}
          />
        )}
      </div>

      {/* Custom Date Modal - portal to body to avoid stacking context issues with parent transforms */}
      {createPortal(
        <AnimatePresence>
          {isCustomModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-sm p-6 rounded-2xl bg-surface border border-border shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-accent-subtle flex items-center justify-center text-accent">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-text-primary">Custom Date Range</h3>
                      <p className="text-xs text-text-muted">Select start and end dates</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCustomModalOpen(false)}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleApplyCustom} className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">Start Date</label>
                      <input
                        type="date"
                        value={tempStart}
                        onChange={(e) => setTempStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">End Date</label>
                      <input
                        type="date"
                        value={tempEnd}
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-raised"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-md hover:opacity-90 flex items-center gap-1.5"
                      style={{ background: 'var(--gradient-accent)' }}
                    >
                      <Check size={14} />
                      Apply Filter
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
