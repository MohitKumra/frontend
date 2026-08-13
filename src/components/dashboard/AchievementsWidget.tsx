import React from 'react';
import { Trophy } from 'lucide-react';
import { LevelCard } from '../achievements/LevelCard';
import { AchievementBadge } from '../achievements/AchievementBadge';
import type { AchievementDTO, GamificationProfileDTO } from '../../types';

/**
 * A ready-made rewards widget: level summary card + recent unlocked badges.
 * Composes the shared LevelCard / AchievementBadge components so it can be
 * re-themed by editing those primitives rather than this file.
 */

function toBadgeShape(badge: AchievementDTO) {
  return {
    key: badge.key,
    title: badge.title,
    description: badge.description,
    tier: badge.tier,
    icon: badge.icon,
    pointsAwarded: badge.pointsAwarded,
    isUnlocked: true,
    unlockedAt: badge.unlockedAt,
    progress: 100,
    progressCurrent: 1,
    progressTarget: 1,
  } as const;
}

export function AchievementsWidget({ profile }: { profile: GamificationProfileDTO }) {
  const recentBadges = profile.recentAchievements.slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      <LevelCard profile={profile} />

      {recentBadges.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted flex items-center gap-1.5">
            <Trophy size={12} /> Recent Badges
          </p>
          <div className="grid grid-cols-2 gap-3">
            {recentBadges.map((badge) => (
              <AchievementBadge key={badge.id} achievement={toBadgeShape(badge)} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AchievementsWidget;
