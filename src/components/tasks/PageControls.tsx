import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageControlsProps {
  page: number;
  totalPages: number;
  total: number;
  accent: string;
  pageSize: number;
  onChange: (page: number) => void;
}

export function PageControls({ page, totalPages, total, accent, pageSize, onChange }: PageControlsProps) {
  if (total <= pageSize || totalPages <= 1) return null;
  return (
    <div
      className="mt-2 flex items-center justify-between border-t px-1 pt-2.5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
        style={{ color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)` }}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-[10.5px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
        Page {page} of {totalPages} · {total} tasks
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
        style={{ color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)` }}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}