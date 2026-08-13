/**
 * frontend/src/components/achievements/LevelBadge.tsx
 * A single, presentational level badge — a tiered trophy with the level
 * number. Pure UI, no data fetching. Drop it anywhere to show "your level".
 */
import React from 'react';
import { getLevelBadge, getLevelTier, tierColors } from './SVGTrophies';

interface LevelBadgeProps {
  level: number;
  /** Overall badge size in px (the SVG inside scales proportionally). */
  size?: number;
  /** Render the level number chip under the trophy. */
  showNumber?: boolean;
}

export function LevelBadge({ level, size = 56, showNumber = true }: LevelBadgeProps) {
  const tier = getLevelTier(level);
  const tierColor = tierColors[tier] ?? '#FFD700';

  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${tierColor} 14%, var(--color-surface-raised))`,
        border: `1px solid ${tierColor}40`,
        boxShadow: `0 4px 14px ${tierColor}30`,
      }}
    >
      <div style={{ width: size * 0.7, height: size * 0.7 }}>{getLevelBadge(level)}</div>
      {showNumber && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full font-black text-white"
          style={{
            minWidth: Math.max(20, size * 0.42),
            height: Math.max(14, size * 0.3),
            padding: '0 4px',
            fontSize: Math.max(9, size * 0.15),
            lineHeight: 1,
            background: tierColor,
            boxShadow: `0 2px 6px ${tierColor}70`,
          }}
        >
          {level}
        </span>
      )}
    </div>
  );
}

export default LevelBadge;
