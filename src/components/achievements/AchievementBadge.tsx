/**
 * frontend/src/components/achievements/AchievementBadge.tsx
 * A single, reusable achievement badge/card that renders BOTH the unlocked and
 * locked states.
 *
 * Locked hover behaviour: the card gently warms with the tier colour — the
 * grayscale silhouette stays mostly intact (never fully reveals), just gains a
 * soft coloured glow so the player gets a tantalising hint of what's inside.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { getAchievementIcon, tierColors, tierGradients } from './SVGTrophies';
import type { AchievementWithStatusDTO } from '../../types';

interface AchievementBadgeProps {
  achievement: AchievementWithStatusDTO;
  /** Compact sizing for small preview grids. */
  compact?: boolean;
}

/**
 * Scales a 48×48 SVG icon into a target pixel box without clipping.
 * Uses a consistent top-left transform origin so multiple stacked
 * copies (main + silhouette) stay perfectly aligned.
 */
function ScaledIcon({ iconNode, size }: { iconNode: React.ReactNode; size: number }) {
  const scale = size / 48;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ width: 48, height: 48, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {iconNode}
      </div>
    </div>
  );
}

export function AchievementBadge({ achievement, compact = false }: AchievementBadgeProps) {
  const tierColor = tierColors[achievement.tier] ?? '#FFD700';
  const [isHovered, setIsHovered] = useState(false);
  const isUnlocked = achievement.isUnlocked;
  const hasProgress = !isUnlocked && achievement.progress > 0;

  // Icon rendered at a size that comfortably fits the tile
  const iconSize = compact ? 28 : 36;
  // Tile (icon container) dimensions
  const tileSize = compact ? 40 : 48;

  const iconNode = getAchievementIcon(achievement.key, achievement.tier);

  return (
    <motion.div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -3, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <motion.div
        className={`relative flex flex-col items-center text-center rounded-xl overflow-hidden ${
          compact ? 'gap-1.5 p-2' : 'gap-2 p-3'
        }`}
        animate={{
          boxShadow: isHovered
            ? isUnlocked
              ? `0 8px 22px ${tierColor}44`
              : `0 4px 16px ${tierColor}22`
            : isUnlocked
              ? `0 3px 10px ${tierColor}1a`
              : 'none',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          background: isUnlocked ? 'var(--color-surface-raised)' : 'var(--color-surface)',
          border: isUnlocked ? `1px solid ${tierColor}45` : `1px dashed ${tierColor}35`,
        }}
      >
        {/* ── Locked: ambient breathing glow (rest state, very subtle) ── */}
        {!isUnlocked && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${tierColor}12, transparent 70%)`,
            }}
            animate={{ opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ── Locked hover: soft colour wash — NOT a full reveal.
            The tier colour bleeds through at low opacity so the badge
            feels warm and promising without giving the icon away. ── */}
        {!isUnlocked && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-xl"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            style={{
              background: `radial-gradient(circle at 50% 40%, ${tierColor}22 0%, ${tierColor}0a 55%, transparent 80%)`,
            }}
          />
        )}

        {/* ── Icon tile ── */}
        <div
          className="relative flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: tileSize,
            height: tileSize,
            background: isUnlocked
              ? `${tierColor}20`
              : isHovered
                ? `${tierColor}14`
                : `${tierColor}0c`,
            transition: 'background 0.35s ease',
          }}
        >
          {/* Real coloured icon — always rendered but hidden under the
              grayscale layer when locked */}
          <ScaledIcon iconNode={iconNode} size={iconSize} />

          {/* Locked: heavy desaturate + darken overlay that partially
              lifts on hover — stays mostly grey, just gains a hint of
              colour warmth. opacity 1 → 0.55 on hover (never 0). */}
          {!isUnlocked && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center rounded-xl"
              animate={{ opacity: isHovered ? 0.55 : 1 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              style={{ filter: 'grayscale(1) brightness(0.38)' }}
            >
              <ScaledIcon iconNode={iconNode} size={iconSize} />
            </motion.div>
          )}

          {/* Locked: subtle light-leak gradient, always present */}
          {!isUnlocked && (
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: `linear-gradient(150deg, ${tierColor}18 0%, transparent 55%)`,
              }}
            />
          )}

          {/* Locked: lock badge — dims on hover but doesn't disappear */}
          {!isUnlocked && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              animate={{ opacity: isHovered ? 0.5 : 0.9 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: compact ? 20 : 24,
                  height: compact ? 20 : 24,
                  background: 'var(--color-surface-raised)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
                  border: `1px solid ${tierColor}40`,
                }}
              >
                <Lock size={compact ? 10 : 12} style={{ color: tierColor, opacity: 0.85 }} />
              </div>
            </motion.div>
          )}

          {/* Unlocked: sparkle pip */}
          {isUnlocked && (
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
          )}

          {/* Locked + in-progress: % badge */}
          {hasProgress && (
            <div
              className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center rounded-full border-2"
              style={{
                width: 20,
                height: 20,
                background: 'var(--color-surface-raised)',
                borderColor: tierColor,
                zIndex: 10,
              }}
            >
              <span className="text-[7px] font-black leading-none" style={{ color: tierColor }}>
                {Math.round(achievement.progress)}
              </span>
            </div>
          )}
        </div>

        {/* ── Title + description ── */}
        <div className="min-w-0 w-full">
          <p
            className={`font-bold leading-tight truncate ${compact ? 'text-[10px]' : 'text-[11px]'} ${
              isUnlocked ? 'text-text-primary' : 'text-text-muted'
            }`}
          >
            {achievement.title}
          </p>
          {!compact && (
            <p className="text-[9px] font-medium text-text-muted leading-snug mt-0.5 line-clamp-2">
              {achievement.description}
            </p>
          )}
        </div>

        {/* ── XP pill ── */}
        <span
          className={`font-bold rounded-full shrink-0 ${
            compact ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'
          }`}
          style={{
            background: `${tierColor}1a`,
            color: tierColor,
            opacity: isUnlocked ? 1 : 0.5,
          }}
        >
          +{achievement.pointsAwarded} XP
        </span>

        {/* ── Locked + in-progress: progress bar ── */}
        {hasProgress && (
          <div className="w-full">
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-border)' }}
            >
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
      </motion.div>
    </motion.div>
  );
}

export default AchievementBadge;
