import React from 'react';
import { ListChecks } from 'lucide-react';

interface SubtaskBadgeProps {
  completed: number;
  total: number;
  onClick?: () => void;
}

export function SubtaskBadge({ completed, total, onClick }: SubtaskBadgeProps) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  const done = completed === total;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-[11px] font-bold transition-all hover:shadow-sm"
      style={{
        background: done
          ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
          : 'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
        color: done ? 'var(--color-success)' : 'var(--color-text-secondary)',
      }}
    >
      <ListChecks size={12} />
      <span
        className="relative w-10 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'color-mix(in srgb, var(--color-text-muted) 20%, transparent)' }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: done ? 'var(--color-success)' : 'var(--color-accent)' }}
        />
      </span>
      <span>
        {completed}/{total}
      </span>
    </button>
  );
}
