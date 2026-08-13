/**
 * frontend/src/components/achievements/LevelBar.tsx
 * The level progress bar (Level N, badge name, current/next XP, fill %).
 * Pure presentational — feed it the level fields from GamificationProfileDTO.
 */
import React from 'react';

export interface LevelBarData {
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progressPercent: number;
  currentLevelBadge?: string;
}

interface LevelBarProps extends LevelBarData {
  /** Show the "current/next XP" readout on the right. */
  showXpLabel?: boolean;
}

export function LevelBar({
  level,
  currentLevelPoints,
  nextLevelPoints,
  progressPercent,
  currentLevelBadge,
  showXpLabel = true,
}: LevelBarProps) {
  const pct = Math.max(0, Math.min(100, progressPercent));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-black text-text-primary leading-tight">Level {level}</span>
          {currentLevelBadge && (
            <span
              className="truncate text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {currentLevelBadge}
            </span>
          )}
        </div>
        {showXpLabel && (
          <span className="shrink-0 text-[10px] font-bold text-text-muted tabular-nums">
            {currentLevelPoints}/{nextLevelPoints} XP
          </span>
        )}
      </div>
      <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'var(--gradient-accent)' }}
        />
      </div>
    </div>
  );
}

export default LevelBar;
