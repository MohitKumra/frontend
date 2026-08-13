/**
 * frontend/src/routes/AchievementsTestPage.tsx
 * Test page to preview all achievements with their SVG icons.
 * Visit /achievements-test to see them.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { useAchievements } from '../features/dashboard/hooks/useDashboard';
import { getAchievementIcon, tierColors, tierGradients } from '../components/achievements/SVGTrophies';
import { LevelBadge } from '../components/achievements/LevelBadge';
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
              <span className="w-3 h-3 rounded-full" style={{ background: tierColors[tier] }} />
              {tier}
              <span className="text-xs font-medium text-text-muted ml-1">({items.length})</span>
            </h2>

            <div className="flex flex-col gap-6">
              {items.map((achievement) => {
                const tierColor = tierColors[achievement.tier] ?? '#FFD700';
                return (
                  <div key={achievement.key} className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: tierColor }} />
                      {achievement.title}
                      <code className="text-[9px] text-text-muted opacity-50 font-mono">({achievement.key})</code>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Locked version */}
                      <div
                        className="flex flex-col items-center text-center gap-2 p-4 rounded-xl border border-dashed"
                        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                      >
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center"
                          style={{ background: 'var(--color-border)' }}
                        >
                          <div style={{ filter: 'grayscale(1) brightness(0) opacity(0.3)', width: 36, height: 36 }}>
                            {getAchievementIcon(achievement.key, achievement.tier)}
                          </div>
                        </div>
                        <p className="text-xs font-bold text-text-muted">{achievement.title}</p>
                        <p className="text-[10px] text-text-muted">{achievement.description}</p>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                        >
                          +{achievement.pointsAwarded} XP
                        </span>
                        <div className="w-full">
                          <div className="flex justify-between text-[9px] text-text-muted mb-0.5">
                            <span>{achievement.progressCurrent}</span>
                            <span>{achievement.progressTarget}</span>
                          </div>
                          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ background: tierColor, width: `${achievement.progress}%`, opacity: 0.4 }}
                            />
                          </div>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted">LOCKED</span>
                      </div>

                      {/* Unlocked version */}
                      <div
                        className="flex flex-col items-center text-center gap-2 p-4 rounded-xl border"
                        style={{ background: 'var(--color-surface-raised)', borderColor: `${tierColor}40` }}
                      >
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center"
                          style={{ background: `${tierColor}20` }}
                        >
                          <div style={{ width: 36, height: 36 }}>
                            {getAchievementIcon(achievement.key, achievement.tier)}
                          </div>
                        </div>
                        <p className="text-xs font-bold text-text-primary">{achievement.title}</p>
                        <p className="text-[10px] text-text-muted">{achievement.description}</p>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${tierColor}20`, color: tierColor }}
                        >
                          +{achievement.pointsAwarded} XP
                        </span>
                        <div className="w-full">
                          <div className="flex justify-between text-[9px] text-text-muted mb-0.5">
                            <span>{achievement.progressCurrent}</span>
                            <span>{achievement.progressTarget}</span>
                          </div>
                          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ background: tierColor, width: `${achievement.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: tierColor }}>
                          UNLOCKED
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Level badge showcase */}
      <Card variant="default" className="p-6 mt-8">
        <h3 className="text-base font-bold text-text-primary mb-3">Level Badges</h3>
        <p className="text-xs text-text-muted mb-4">
          Each level maps to a tiered trophy badge — higher levels look more prestigious.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1, 5, 10, 25, 50].map((level) => (
            <div
              key={level}
              className="flex flex-col items-center gap-2 p-3 rounded-xl"
              style={{ background: 'var(--color-surface)' }}
            >
              <LevelBadge level={level} size={64} />
              <p className="text-xs font-bold text-text-primary">Level {level}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary card */}
      <Card variant="default" className="p-6 mt-8">
        <h3 className="text-base font-bold text-text-primary mb-3">Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {tierOrder.map((tier) => (
            <div
              key={tier}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--color-surface)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${tierColors[tier]}30` }}
              >
                <div style={{ width: 20, height: 20 }}>{getAchievementIcon('level_five', tier)}</div>
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
