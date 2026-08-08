import React from 'react';
import { motion } from 'framer-motion';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface SkipDaysPickerProps {
  value: number[]; // day indices 0-6 (0=Mon..6=Sun)
  onChange: (days: number[]) => void;
}

export function SkipDaysPicker({ value, onChange }: SkipDaysPickerProps) {
  const toggle = (idx: number) => {
    if (value.includes(idx)) {
      onChange(value.filter((d) => d !== idx));
    } else {
      onChange([...value, idx].sort());
    }
  };

  return (
    <div>
      <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
        Skip days (optional)
      </label>
      <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
        Selected days will be skipped — no reminders, no streak break, and marked as "intentionally skipped" in your
        heatmap.
      </p>
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label, idx) => {
          const selected = value.includes(idx);
          return (
            <motion.button
              key={label}
              type="button"
              onClick={() => toggle(idx)}
              className={`py-3 rounded-xl text-xs font-bold transition-all ${
                selected ? 'text-white shadow-lg' : 'text-text-secondary border'
              }`}
              style={
                selected
                  ? { background: 'var(--gradient-accent)' }
                  : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
              }
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {label}
              {selected && (
                <motion.span
                  className="block text-[8px] font-medium mt-0.5 opacity-80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                >
                  Skipped
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
