/**
 * frontend/src/routes/AchievementsTestPage.tsx
 * Test page to preview all 17 achievements with their SVG icons.
 * Visit /achievements-test to see them.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { useAchievements } from '../features/dashboard/hooks/useDashboard';
import { getAchievementIcon, tierColors, tierGradients } from '../components/achievements/SVGTrophies';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';

const tierOrder = ['bronze', 'silver', 'gold', 'platinum'] as const;

export function AchievementsTestPage() {
  const { data: achievements, isLoading } = useAchievements();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (isLoading) return <LoadingScreen />;

  const grouped = tierOrder.map((tier) => ({
    tier,
    items: (achievements ?? []).filter((a) => a.tier === tier),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <a
          href="/habits"
          className="inline-flex items-center gap-1 text-sm font-bold text-accent hover:text-accent-hover mb-4"
        >
          <ArrowLeft size={16} />
          Back to Habits
        </a>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-3">
          <Trophy size={28} className="text-warning" />
          Achievements Gallery
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {achievements?.filter((a) => a.isUnlocked).length ?? 0} / {achievements?.length ?? 0} unlocked
        </p>
      </div>

      {/* Group by tier */}
      <div className="flex flex-col gap-8">
        {grouped.map(({ tier, items }) => (
          <div key={tier}>
            <h2 className="text-lg font-bold text-text-primary capitalize mb-4 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: tierColors[tier] }}
              />
              {tier}
              <span className="text-xs font-medium text-text-muted ml-1">
                ({items.length})
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((achievement) => {
                const isHovered = hoveredKey === achievement.key;
                const tierColor = tierColors[achievement.tier] ?? '#FFD700';

                return (
                  <motion.div
                    key={achievement.key}
                    className="relative"
                    onMouseEnter={() => setHoveredKey(achievement.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="relative flex flex-col items-center text-center gap-3 p-5 rounded-2xl"
                      style={{
                        background: achievement.isUnlocked
                          ? 'var(--color-surface-raised)'
                          : 'var(--color-surface)',
                        border: achievement.isUnlocked
                          ? `2px solid ${tierColor}40`
                          : '1px solid var(--color-border)',
                      }}
                      whileHover={{ y: -6, scale: 1.03 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Glow */}
                      {achievement.isUnlocked && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at center, ${tierColor}20, transparent 70%)`,
                            opacity: isHovered ? 1 : 0.5,
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      )}

                      {/* Icon */}
                      <div className="relative">
                        <motion.div
                          className="w-20 h-20 rounded-2xl flex items-center justify-center relative overflow-hidden"
                          style={{
                            background: achievement.isUnlocked
                              ? `${tierColor}20`
                              : 'var(--color-border)',
                          }}
                          animate={{
                            rotate: achievement.isUnlocked && isHovered ? [0, -8, 8, -8, 0] : 0,
                            scale: achievement.isUnlocked && isHovered ? [1, 1.1, 1] : 1,
                          }}
                          transition={{ duration: 0.6 }}
                        >
                          <div style={{ width: 40, height: 40 }}>
                            {getAchievementIcon(achievement.key, achievement.tier)}
                          </div>

                          {!achievement.isUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-2xl">
                              <Lock size={22} className="text-text-muted" />
                            </div>
                          )}
                        </motion.div>

                        {/* Unlocked badge */}
                        {achievement.isUnlocked && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              background: tierGradients[achievement.tier] ?? tierColor,
                              boxShadow: `0 2px 10px ${tierColor}60`,
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                          >
                            <Sparkles size={12} className="text-white" fill="white" />
                          </motion.div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="relative">
                        <p
                          className={`text-sm font-bold mb-1 ${
                            achievement.isUnlocked ? 'text-text-primary' : 'text-text-muted'
                          }`}
                        >
                          {achievement.title}
                        </p>
                        <p className="text-[11px] font-medium text-text-muted leading-tight">
                          {achievement.description}
                        </p>
                      </div>

                      {/* Points */}
                      <div className="relative">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: achievement.isUnlocked ? `${tierColor}20` : 'var(--color-border)',
                            color: achievement.isUnlocked ? tierColor : 'var(--color-text-muted)',
                          }}
                        >
                          +{achievement.pointsAwarded} XP
                        </span>
                      </div>

                      {/* Progress */}
                      {!achievement.isUnlocked && (
                        <div className="w-full relative">
                          <div className="flex justify-between text-[10px] text-text-muted mb-1">
                            <span>{achievement.progressCurrent}</span>
                            <span>{achievement.progressTarget}</span>
                          </div>
                          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: tierColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${achievement.progress}%` }}
                              transition={{ duration: 1, delay: 0.2 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Key identifier */}
                      <div className="relative mt-1">
                        <code className="text-[9px] text-text-muted opacity-50">
                          {achievement.key}
                        </code>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary card */}
      <Card variant="default" className="p-6 mt-8">
        <h3 className="text-base font-bold text-text-primary mb-3">Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {tierOrder.map((tier) => (
            <div key={tier} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface)' }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${tierColors[tier]}30` }}
              >
                <div style={{ width: 20, height: 20 }}>
                  {getAchievementIcon('level_five', tier)}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary capitalize">{tier}</p>
                <p className="text-[10px] text-text-muted">{tierColors[tier]}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default AchievementsTestPage;