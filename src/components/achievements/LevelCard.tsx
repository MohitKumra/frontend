/**
 * frontend/src/components/achievements/LevelCard.tsx
 * Ready-to-place summary card that composes the LevelBadge, the LevelBar and
 * the total XP readout. Swap in a custom layout by composing LevelBadge /
 * LevelBar directly instead of this card.
 */
import React from 'react';
import { Award } from 'lucide-react';
import { Card } from '../ui/Card';
import { LevelBadge } from './LevelBadge';
import { LevelBar } from './LevelBar';
import type { GamificationProfileDTO } from '../../types';

interface LevelCardProps {
  profile: GamificationProfileDTO;
}

export function LevelCard({ profile }: LevelCardProps) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <LevelBadge level={profile.level} size={60} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Level</p>
            <h3 className="mt-0.5 text-lg font-black text-text-primary leading-tight">
              {profile.currentLevelBadge}
            </h3>
            <div className="mt-3">
              <LevelBar {...profile} />
            </div>
          </div>
        </div>
        <div
          className="mt-4 pt-3 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs font-bold text-text-muted">Total XP</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-black text-accent">
            <Award size={14} />
            {profile.totalPoints} XP
          </span>
        </div>
      </div>
    </Card>
  );
}

export default LevelCard;