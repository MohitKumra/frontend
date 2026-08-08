/**
 * frontend/src/components/achievements/AchievementsGallery.tsx
 * Full achievements gallery with two tabs:
 *   - "Achievements" — all 17 items, locked SVGs hidden from DOM
 *   - "Trophies" — only unlocked items, showcase view
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Lock, Shuffle } from 'lucide-react';
import { useAchievements } from '../../features/dashboard/hooks/useDashboard';
import { getAchievementIcon, tierColors, tierGradients } from './SVGTrophies';
import type { AchievementWithStatusDTO } from '../../types';

type Tab = 'achievements' | 'trophies';

const tierOrder = ['bronze', 'silver', 'gold', 'platinum'] as const;

/**
 * Locked card — "frosted vault" treatment.
 * The real icon is always rendered fully desaturated and dim underneath a
 * frosted pane, so hovering never lets true color leak through — a locked
 * card should never look like it might already be unlocked. A centered lock
 * badge and an explicit status line ("Locked" / "3 / 10") make the state
 * unambiguous at a glance, not just implied by dimness. In-progress items
 * get a live percentage badge and a filled progress bar, so "almost there"
 * reads as almost-mine rather than simply closed off. Motion is limited to
 * a slow ambient glow, a slow diagonal shimmer, and a small hover lift —
 * all continuous and gentle, nothing that fires on interaction and jars.
 */
function LockedCard({ achievement }: { achievement: AchievementWithStatusDTO }) {
  const tierColor = tierColors[achievement.tier] ?? '#FFD700';
  const hasProgress = achievement.progress > 0;

  return (
    <motion.div className="relative" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <div
        className="relative flex flex-col items-center text-center gap-2 p-3 rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: `1px dashed ${tierColor}35`,
        }}
      >
        {/* Ambient breathing glow — signals "not dead, just waiting" */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 20%, ${tierColor}10, transparent 65%)` }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Icon area */}
        <div className="relative">
          <div
            className="relative w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ background: `${tierColor}0d` }}
          >
            {/* Silhouette — fixed, muted, never brightens. This is the whole
                point: no interaction should make a locked icon look earned. */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ filter: 'grayscale(1) brightness(0)', opacity: 0.22 }}
            >
              {getAchievementIcon(achievement.key, achievement.tier)}
            </div>

            {/* Frosted glass pane — the "behind glass" cue */}
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(150deg, ${tierColor}16 0%, transparent 55%)` }}
            />

            {/* Slow diagonal shimmer — reads as "waiting", not "peeking" */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(115deg, transparent 35%, ${tierColor}2e 50%, transparent 65%)`,
              }}
              animate={{ x: ['-130%', '150%'] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
            />

            {/* Lock badge, centered and always visible — the one unambiguous signal */}
            <div
              className="relative z-10 flex items-center justify-center rounded-full"
              style={{
                width: 26,
                height: 26,
                background: 'var(--color-surface-raised)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                border: `1px solid ${tierColor}30`,
              }}
            >
              <Lock size={13} style={{ color: tierColor, opacity: 0.85 }} />
            </div>
          </div>

          {/* Live percentage badge, only while in progress */}
          {hasProgress && (
            <div
              className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2"
              style={{
                width: 20,
                height: 20,
                background: 'var(--color-surface-raised)',
                borderColor: tierColor,
              }}
            >
              <span className="text-[7px] font-black leading-none" style={{ color: tierColor }}>
                {Math.round(achievement.progress)}
              </span>
            </div>
          )}
        </div>

        {/* Title — muted so hierarchy still favors unlocked cards */}
        <div className="relative">
          <p className="text-[12px] font-bold leading-tight text-text-muted">{achievement.title}</p>
          <p className="text-[9px] font-medium text-text-muted leading-tight mt-0.5 opacity-70">
            {achievement.description}
          </p>
        </div>

        {/* XP reward — visible but clearly secondary to the lock state */}
        <div className="relative">
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${tierColor}0a`, color: tierColor, opacity: 0.45 }}
          >
            +{achievement.pointsAwarded} XP
          </span>
        </div>

        {/* Progress bar */}
        {hasProgress && (
          <div className="w-full relative">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: tierColor }}
                initial={{ width: 0 }}
                animate={{ width: `${achievement.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Unlocked card — full SVG visible with effects */
function UnlockedCard({ achievement, compact = false }: { achievement: AchievementWithStatusDTO; compact?: boolean }) {
  const tierColor = tierColors[achievement.tier] ?? '#FFD700';
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative "
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`relative flex flex-col items-center  text-center ${compact ? 'gap-1 p-2' : 'gap-2 p-3'} rounded-xl`}
        style={{
          background: 'var(--color-surface-raised)',
          border: `1px solid ${tierColor}30`,
        }}
      >
        {/* Glow */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${tierColor}15, transparent 70%)`,
            opacity: isHovered ? 1 : 0.5,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Icon */}
        <div className="relative">
          <motion.div
            className={`relative ${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl flex items-center justify-center overflow-hidden`}
            style={{ background: `${tierColor}20` }}
            animate={{ rotate: isHovered ? [0, -5, 5, -5, 0] : 0 }}
            transition={{ duration: 0.5 }}
          >
            {getAchievementIcon(achievement.key, achievement.tier)}

            {/* Shine sweep on hover — same motif as the locked-card shimmer, so
                a card reads as "the same object, earned" rather than a different system */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(115deg, transparent 40%, ${tierColor}50 50%, transparent 60%)`,
              }}
              animate={{ x: isHovered ? '140%' : '-120%' }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            />

            {/* Sparkles */}
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
          </motion.div>

          {/* Unlocked badge */}
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
        </div>

        {/* Label */}
        {!compact && (
          <div className="relative">
            <p className="text-[12px] font-bold leading-tight text-text-primary">{achievement.title}</p>
            <p className="text-[9px] font-medium text-text-muted leading-tight mt-0.5">{achievement.description}</p>
          </div>
        )}

        {/* XP badge */}
        {!compact && (
          <div className="relative">
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${tierColor}20`, color: tierColor }}
            >
              +{achievement.pointsAwarded} XP
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Gallery Component ─────────────────────────────────────────────────

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
  const locked = achievements.filter((a) => !a.isUnlocked);

  const groupedByTier = tierOrder.map((tier) => ({
    tier,
    items: achievements.filter((a) => a.tier === tier),
  }));

  return (
    <div className="w-full">
      {/* Header */}

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
                  {items.map((achievement) =>
                    achievement.isUnlocked ? (
                      <UnlockedCard key={achievement.key} achievement={achievement} />
                    ) : (
                      <LockedCard key={achievement.key} achievement={achievement} />
                    )
                  )}
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
                {/* Summary strip — same tier-header language as the Achievements tab,
                    placed up top so it reads as context for the grid below, not a leftover */}
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  <span className="text-sm font-bold text-text-primary">{unlocked.length} earned</span>
                  <span className="text-text-muted opacity-40">·</span>
                  {tierOrder.map((tier) => {
                    const tierItems = unlocked.filter((a) => a.tier === tier);
                    if (tierItems.length === 0) return null;
                    return (
                      <span
                        key={tier}
                        className="flex items-center  gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
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

                {/* Same card used in All Achievements, wrapped instead of stretched into a
                    fixed-column grid — a handful of trophies cluster naturally instead of
                    floating in empty columns */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {unlocked.map((achievement, idx) => (
                    <motion.div
                      key={achievement.key}
                      className="w-[104px] sm:w-[116px] "
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, type: 'spring', stiffness: 200 }}
                    >
                      <UnlockedCard achievement={achievement} />
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
