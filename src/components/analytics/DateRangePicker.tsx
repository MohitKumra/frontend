import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, Check, X, SlidersHorizontal } from 'lucide-react';

export type DateRangePreset = 
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
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

export function computePresetDates(preset: DateRangePreset, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
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

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [tempStart, setTempStart] = useState(value.startDate);
  const [tempEnd, setTempEnd] = useState(value.endDate);

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

  const activeLabel = PRESETS.find(p => p.id === value.preset)?.label || 'Custom';
  const formattedRangeText = value.startDate === value.endDate
    ? formatReadableDate(value.startDate)
    : `${formatReadableDate(value.startDate)} – ${formatReadableDate(value.endDate)}`;

  return (
    <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl border bg-surface/80 backdrop-blur-md shadow-sm border-border">
      {/* Scrollable preset pills container */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 max-w-full">
        <div className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg text-text-muted shrink-0 mr-1 hidden md:flex">
          <SlidersHorizontal size={14} className="text-accent" />
          <span>Filter:</span>
        </div>
        {PRESETS.map((preset) => {
          const isActive = value.preset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`relative flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 shrink-0 ${
                isActive
                  ? 'text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised/80'
              }`}
              style={{
                background: isActive ? 'var(--gradient-accent)' : 'transparent',
              }}
            >
              {preset.id === 'custom' && <Calendar size={12} className={isActive ? 'text-white' : 'text-accent'} />}
              <span>{preset.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeFilterGlow"
                  className="absolute inset-0 rounded-xl bg-accent/20 -z-10 blur-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Range badge + indicator */}
      <div className="flex items-center justify-between sm:justify-end gap-2 px-2.5 py-1.5 rounded-xl bg-surface-raised/60 border border-border/50 shrink-0 text-xs font-bold text-text-primary">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-accent" />
          <span className="text-[11px] font-black tracking-wide text-text-secondary">
            {formattedRangeText}
          </span>
        </div>
        {value.preset === 'custom' && (
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="ml-2 text-[10px] font-black uppercase text-accent hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {/* Custom Date Modal */}
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
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => setTempStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      End Date
                    </label>
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
                    className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-accent shadow-md hover:opacity-90 flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    Apply Filter
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
