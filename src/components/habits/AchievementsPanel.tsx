import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAchievements, useGamificationProfile } from '../../features/dashboard/hooks/useDashboard';
import { LevelBar } from '../achievements/LevelBar';
import { LevelBadge } from '../achievements/LevelBadge';
import { AchievementBadge } from '../achievements/AchievementBadge';
import { AchievementsGallery } from '../achievements/AchievementsGallery';

export const AchievementsPanel = memo(function AchievementsPanel() {
  const { data: achievements, isLoading } = useAchievements();
  const { data: profile } = useGamificationProfile();
  const [showAll, setShowAll] = useState(false);

  if (isLoading || !achievements) {
    return (
      <Card variant="default" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
            <Trophy size={18} className="text-warning" /> Achievements
          </h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-xl animate-pulse"
              style={{ background: 'var(--color-surface)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-border" />
              <div className="h-2.5 w-14 bg-border rounded" />
              <div className="h-2 w-10 bg-border rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Preview — first 4, unlocked first then by highest progress
  const preview = [...achievements]
    .sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
      return b.progress - a.progress;
    })
    .slice(0, 4);

  return (
    <Card variant="default" className="p-5 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
          <Trophy size={18} className="text-warning" /> Achievements
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          {showAll ? 'Show less' : `View all (${achievements.length})`}
          {showAll ? <ChevronUp size={12} /> : <Trophy size={12} />}
        </button>
      </div>

      {/* Level bar — shown only in preview mode */}
      {profile && !showAll && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl shrink-0"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <LevelBadge level={profile.level} size={48} />
          <div className="min-w-0 flex-1">
            <LevelBar {...profile} />
          </div>
        </div>
      )}

      {/* Content */}
      {showAll ? (
        <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
          <AchievementsGallery inline onBack={() => setShowAll(false)} />
        </div>
      ) : (
        /* 4-column grid, non-compact so descriptions show — matches the reference design */
        <div className="grid grid-cols-4 gap-2">
          {preview.map((achievement, idx) => (
            <motion.div
              key={achievement.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.35 }}
            >
              <AchievementBadge achievement={achievement} />
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
});

export default AchievementsPanel;
