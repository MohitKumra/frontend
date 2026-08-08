import type { ReactNode } from 'react';

export type Tone = 'default' | 'accent' | 'success' | 'warning' | 'info' | 'danger';

const toneVars: Record<Tone, { fg: string; bg: string }> = {
  default: { fg: 'var(--color-text-primary)', bg: 'var(--color-surface)' },
  accent: { fg: 'var(--color-accent)', bg: 'var(--color-accent-subtle)' },
  success: { fg: 'var(--color-success)', bg: 'var(--color-success-subtle)' },
  warning: { fg: 'var(--color-warning)', bg: 'var(--color-warning-subtle)' },
  info: { fg: 'var(--color-info)', bg: 'var(--color-info-subtle)' },
  danger: { fg: 'var(--color-danger)', bg: 'var(--color-danger-subtle)' },
};

export function getTone(tone: Tone) {
  return toneVars[tone];
}

/**
 * Standard header row for an analytics card: icon chip + eyebrow + title.
 * Keeps every analytics card visually consistent.
 */
export function AnalyticsCardHeader({
  icon,
  eyebrow,
  title,
  iconTone = 'default',
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  iconTone?: Tone;
}) {
  const tone = toneVars[iconTone];
  return (
    <div
      className="flex items-center gap-3 border-b px-5 py-4"
      style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-elevated)' }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: iconTone === 'default' ? 'var(--color-border-subtle)' : tone.bg,
          color: iconTone === 'default' ? 'var(--color-text-secondary)' : tone.fg,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          {eyebrow}
        </div>
        <h3 className="mt-0.5 text-[13.5px] font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
      </div>
    </div>
  );
}

/** Single metric tile used in 2/3/4-column grids inside analytics cards. */
export function StatTile({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: Tone }) {
  const t = toneVars[tone];
  return (
    <div
      className="rounded-xl border px-3 py-3 text-center transition-colors duration-200"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-subtle)' }}
    >
      <div
        className="text-[15px] font-bold leading-none tabular-nums"
        style={{ color: tone === 'default' ? 'var(--color-text-primary)' : t.fg }}
      >
        {value}
      </div>
      <div
        className="mt-1.5 text-[8.5px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </div>
    </div>
  );
}

/** Boxed row of 2-4 evenly-spaced mini metrics, e.g. avg / fastest / longest. */
export function MiniMetricRow({ items }: { items: { label: string; value: string; tone?: Tone }[] }) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-subtle)' }}
    >
      <div
        className="grid gap-2 text-center"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const t = item.tone ? toneVars[item.tone] : toneVars.default;
          return (
            <div key={item.label}>
              <div
                className="text-[8.5px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {item.label}
              </div>
              <div
                className="mt-1 text-[12.5px] font-bold"
                style={{ color: item.tone ? t.fg : 'var(--color-text-primary)' }}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Full-width highlighted takeaway at the base of a card, e.g. "Sessions completed". */
export function CalloutStat({ label, value, tone = 'accent' }: { label: string; value: ReactNode; tone?: Tone }) {
  const t = toneVars[tone];
  return (
    <div
      className="rounded-xl border p-3.5 text-center"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${t.fg} 8%, var(--color-surface)), var(--color-surface-elevated))`,
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <div className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-[17px] font-bold leading-tight" style={{ color: t.fg }}>
        {value}
      </div>
    </div>
  );
}
