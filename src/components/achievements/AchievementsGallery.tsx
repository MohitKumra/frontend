/**
 * frontend/src/components/achievements/AchievementsGallery.tsx
 * Full achievements gallery with two tabs:
 *   - "Achievements" — all items, locked badges hidden from DOM
 *   - "Trophies" — only unlocked items, showcase view
 *
 * Every badge is rendered by the shared <AchievementBadge /> so the whole
 * card/badge look is owned by one component.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Shuffle } from 'lucide-react';
import { useAchievements } from '../../features/dashboard/hooks/useDashboard';
import { tierColors } from './SVGTrophies';
import { AchievementBadge } from './AchievementBadge';

type Tab = 'achievements' | 'trophies';

const tierOrder = ['bronze', 'silver', 'gold', 'platinum'] as const;

export function AchievementsGallery({
  onClose,
  onBack,
  inline,
}: {
  onClose?: () => void;
  onBack?: () => void;
  inline?: boolean;
}) {
  const { data: achievements } = useAchievements();
  const [activeTab, setActiveTab] = useState<Tab>('achievements');

  if (!achievements) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.isUnlocked);

  const groupedByTier = tierOrder.map((tier) => ({
    tier,
    items: achievements.filter((a) => a.tier === tier),
  }));

  return (
    <div className="w-full">
      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'achievements' ? 'text-white shadow-lg' : 'text-text-muted'
          }`}
          style={activeTab === 'achievements' ? { background: 'var(--gradient-accent)' } : {}}
        >
          <Shuffle size={14} />
          All Achievements
          <span className="text-[10px] opacity-70">({achievements.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('trophies')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'trophies' ? 'text-white shadow-lg' : 'text-text-muted'
          }`}
          style={activeTab === 'trophies' ? { background: 'var(--gradient-accent)' } : {}}
        >
          <Trophy size={14} />
          Trophy Cabinet
          <span className="text-[10px] opacity-70">({unlocked.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-8"
          >
            {groupedByTier.map(({ tier, items }) => (
              <div key={tier}>
                <h3 className="text-sm font-bold text-text-primary capitalize mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: tierColors[tier] }} />
                  {tier}
                  <span className="text-[10px] font-medium text-text-muted">
                    ({items.filter((a) => a.isUnlocked).length}/{items.length})
                  </span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((achievement) => (
                    <AchievementBadge key={achievement.key} achievement={achievement} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'trophies' && (
          <motion.div
            key="trophies"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {unlocked.length === 0 ? (
              <div className="text-center py-12">
                <Trophy size={40} className="mx-auto text-text-muted mb-3 opacity-30" />
                <p className="text-sm font-bold text-text-muted">No trophies yet</p>
                <p className="text-xs text-text-muted mt-1">Complete tasks and habits to earn your first trophy!</p>
              </div>
            ) : (
              <>
                {/* Summary strip */}
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  <span className="text-sm font-bold text-text-primary">{unlocked.length} earned</span>
                  <span className="text-text-muted opacity-40">·</span>
                  {tierOrder.map((tier) => {
                    const tierItems = unlocked.filter((a) => a.tier === tier);
                    if (tierItems.length === 0) return null;
                    return (
                      <span
                        key={tier}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          background: `${tierColors[tier]}10`,
                          border: `1px solid ${tierColors[tier]}20`,
                          color: tierColors[tier],
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tierColors[tier] }} />
                        <span className="capitalize">{tier}</span>
                        <span className="opacity-60">{tierItems.length}</span>
                      </span>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {unlocked.map((achievement, idx) => (
                    <motion.div
                      key={achievement.key}
                      className="w-[104px] sm:w-[116px]"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, type: 'spring', stiffness: 200 }}
                    >
                      <AchievementBadge achievement={achievement} />
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default AchievementsGallery;
