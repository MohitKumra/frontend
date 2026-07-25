import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles, Lock, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAchievements } from '../../features/dashboard/hooks/useDashboard';
import { getAchievementIcon, tierColors, tierGradients } from '../achievements/SVGTrophies';
import { AchievementsGallery } from '../achievements/AchievementsGallery';

export function AchievementsPanel() {
  const { data: achievements, isLoading } = useAchievements();
  const [showAll, setShowAll] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (isLoading || !achievements) {
    return (
      <Card variant="default" className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
            <Trophy size={18} className="text-warning" />
            Achievements
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl animate-pulse" style={{ background: 'var(--color-surface)' }}>
              <div className="w-12 h-12 rounded-xl bg-border" />
              <div className="h-3 w-14 bg-border rounded" />
              <div className="h-2 w-10 bg-border rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  // Preview — first 4, unlocked first then by progress
  const preview = [...achievements]
    .sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
      return b.progress - a.progress;
    })
    .slice(0, 4);

  return (
    <Card variant="default" className="p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
          <Trophy size={18} className="text-warning" />
          Achievements
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          {showAll ? 'Show less' : `View all (${achievements.length})`}
          {showAll ? <ChevronUp size={12} /> : <Trophy size={12} />}
        </button>
      </div>

      {/* Content — scrollable when taller than max-height */}
      <div className="overflow-y-auto -mx-6 px-6" style={{ maxHeight: '400px' }}>

      {showAll ? (
        /* ─── Full gallery inline ─── */
        <div className="-mx-1 px-1">
          <AchievementsGallery inline onBack={() => setShowAll(false)} />
        </div>
      ) : (
        /* ─── 4-item preview ─── */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {preview.map((achievement, idx) => {
            const tierColor = tierColors[achievement.tier] ?? '#FFD700';
            const isLocked = !achievement.isUnlocked;
            const isHovered = hoveredKey === achievement.key;
            const hasProgress = achievement.progress > 0;

            return (
              <motion.div
                key={achievement.key}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3, scale: achievement.isUnlocked ? 1.02 : 1, transition: { duration: 0.2, delay: 0 } }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                onMouseEnter={() => setHoveredKey(achievement.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div
                  className="relative flex flex-col items-center text-center gap-2 p-3 rounded-xl overflow-hidden"
                  style={{
                    background: achievement.isUnlocked
                      ? 'var(--color-surface-raised)'
                      : 'var(--color-surface)',
                    border: achievement.isUnlocked
                      ? `1px solid ${tierColor}30`
                      : `1px dashed ${tierColor}40`,
                  }}
                >
                  {/* Ambient breathing glow for locked cards */}
                  {isLocked && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 50% 25%, ${tierColor}12, transparent 65%)` }}
                      animate={{ opacity: [0.35, 0.85, 0.35] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Hover glow for unlocked cards */}
                  {!isLocked && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(circle at center, ${tierColor}15, transparent 70%)` }}
                      animate={{ opacity: isHovered ? 1 : 0.5 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  {/* Full-card lock overlay for locked achievements */}
                  {isLocked && (
                    <div
                      className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none z-10"
                      style={{
                        background: `linear-gradient(135deg, ${tierColor}08 0%, ${tierColor}18 50%, ${tierColor}08 100%)`,
                        backdropFilter: 'blur(1px)',
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: 32,
                          height: 32,
                          background: `${tierColor}25`,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <Lock size={18} className="text-text-muted" style={{ opacity: 0.85 }} />
                      </div>
                    </div>
                  )}

                  {/* Icon container */}
                  <div className="relative">
                    <motion.div
                      className="relative w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                      style={{
                        background: achievement.isUnlocked
                          ? `${tierColor}20`
                          : `${tierColor}12`,
                      }}
                      animate={achievement.isUnlocked ? { rotate: isHovered ? [0, -5, 5, -5, 0] : 0 } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {achievement.isUnlocked ? (
                        <>
                          {getAchievementIcon(achievement.key, achievement.tier)}

                          {/* Shine sweep on hover — same motif as the locked-card shimmer */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: `linear-gradient(115deg, transparent 40%, ${tierColor}50 50%, transparent 60%)`,
                            }}
                            animate={{ x: isHovered ? '140%' : '-120%' }}
                            transition={{ duration: 0.7, ease: 'easeInOut' }}
                          />

                          {/* Sparkle burst on hover */}
                          {isHovered && (
                            <>
                              {[...Array(4)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute w-1 h-1 rounded-full"
                                  style={{ background: tierColor, top: '50%', left: '50%' }}
                                  animate={{
                                    x: [0, Math.cos((i * Math.PI) / 2) * 16],
                                    y: [0, Math.sin((i * Math.PI) / 2) * 16],
                                    opacity: [1, 0],
                                    scale: [1, 0],
                                  }}
                                  transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                    delay: i * 0.1,
                                  }}
                                />
                              ))}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Silhouette — sharp, single-tone shape. No blur. */}
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ filter: 'grayscale(1) brightness(0) opacity(0.3)' }}
                          >
                            {getAchievementIcon(achievement.key, achievement.tier)}
                          </div>

                          {/* True-color peek on hover, like scratching a scratch card */}
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            animate={{ opacity: isHovered ? 0.55 : 0 }}
                            transition={{ duration: 0.35 }}
                          >
                            {getAchievementIcon(achievement.key, achievement.tier)}
                          </motion.div>

                          {/* Shimmer sweep */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: `linear-gradient(115deg, transparent 30%, ${tierColor}40 48%, transparent 66%)`,
                            }}
                            animate={{ x: ['-120%', '140%'] }}
                            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut', delay: idx * 0.3 }}
                          />

                          {/* Lock overlay — semi-transparent backdrop */}
                          <div
                            className="absolute inset-0 flex items-center justify-center rounded-xl"
                            style={{ background: `${tierColor}20` }}
                          >
                            <Lock size={18} className="text-text-muted" style={{ opacity: 0.7 }} />
                          </div>
                        </>
                      )}
                    </motion.div>

                    {achievement.isUnlocked ? (
                      <motion.div
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{
                          background: tierGradients[achievement.tier] ?? tierColor,
                          boxShadow: `0 2px 6px ${tierColor}60`,
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                      >
                        <Sparkles size={8} className="text-white" fill="white" />
                      </motion.div>
                    ) : (
                      /* Badge — live percentage while in progress, lock while untouched */
                      <div
                        className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2"
                        style={{
                          width: hasProgress ? 20 : 18,
                          height: hasProgress ? 20 : 18,
                          background: 'var(--color-surface-raised)',
                          borderColor: tierColor,
                        }}
                      >
                        {hasProgress ? (
                          <span className="text-[7px] font-black leading-none" style={{ color: tierColor }}>
                            {Math.round(achievement.progress)}
                          </span>
                        ) : (
                          <Lock size={9} style={{ color: tierColor }} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="relative">
                    <p className={`text-[12px] font-bold leading-tight ${achievement.isUnlocked ? 'text-text-primary' : 'text-text-muted'}`}>
                      {achievement.title}
                    </p>
                    <p className="text-[9px] font-medium text-text-muted leading-tight mt-0.5">
                      {achievement.description}
                    </p>
                  </div>

                  {/* Progress bar for locked */}
                  {isLocked && achievement.progress > 0 && (
                    <div className="w-full absolute bottom-0 inset-x-0 h-1 bg-border rounded-b-xl overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ background: tierColor, opacity: 0.4 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${achievement.progress}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
    </Card>
  );
}