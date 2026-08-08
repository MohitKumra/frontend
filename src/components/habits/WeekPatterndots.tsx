import React from 'react';
import { Check } from 'lucide-react';
import type { WeekPatternDay } from '../../features/habits/Habitpresentation';

interface WeekPatternDotsProps {
  pattern: WeekPatternDay[];
  color: string;
}

export function WeekPatternDots({ pattern, color }: WeekPatternDotsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {pattern.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold" style={{ color: day.isToday ? color : 'var(--color-text-muted)' }}>
            {day.label}
          </span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: day.done ? color : 'transparent',
              border: day.isToday
                ? `1.5px solid ${color}`
                : day.isFuture
                  ? '1px dashed var(--color-border)'
                  : '1px solid var(--color-border)',
              opacity: day.isFuture ? 0.5 : 1,
            }}
          >
            {day.done && <Check size={11} strokeWidth={3} style={{ color: 'white' }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
