import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { PartyPopper, Sparkles, Trophy } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getAchievementIcon, tierColors, tierGradients } from './SVGTrophies';
import type { AchievementWithStatusDTO } from '../../types';

interface AchievementCelebrationModalProps {
  open: boolean;
  achievement: AchievementWithStatusDTO | null;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const tierLabel: Record<AchievementWithStatusDTO['tier'], string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export function AchievementCelebrationModal({ open, achievement, onClose }: AchievementCelebrationModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');

  const confetti = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.5 + Math.random() * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        width: 4 + Math.random() * 5,
      })),
    [achievement?.key, open],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 3800);
    return () => window.clearTimeout(timer);
  }, [open, onClose, achievement?.key]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      onClose();
    }
  };

  if (typeof document === 'undefined' || !achievement) return null;

  const tierColor = tierColors[achievement.tier] ?? '#FFD700';
  const icon = getAchievementIcon(achievement.key, achievement.tier);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'color-mix(in srgb, black 52%, transparent)', zIndex: 10020 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Achievement unlocked"
        >
          <style>{`
            @keyframes achievementConfettiFall {
              0% { transform: translateY(-18px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(230px) rotate(540deg); opacity: 0; }
            }
            @keyframes achievementPulse {
              0% { box-shadow: 0 0 0 0 color-mix(in srgb, ${tierColor} 45%, transparent); }
              100% { box-shadow: 0 0 0 24px color-mix(in srgb, ${tierColor} 0%, transparent); }
            }
          `}</style>

          <motion.div
            className="relative w-full max-w-md rounded-[28px] p-6 sm:p-8 text-center overflow-hidden shadow-2xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              touchAction: isMobile ? 'none' : 'auto',
            }}
            initial={{ scale: 0.88, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0, y: isMobile ? 56 : 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 340 }}
            {...(isMobile
              ? {
                  drag: 'y' as const,
                  dragDirectionLock: true,
                  dragConstraints: { top: 0, bottom: 0 },
                  dragElastic: { top: 0, bottom: 0.5 },
                  onDragEnd: handleDragEnd,
                }
              : {})}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div className="flex justify-center mb-3 cursor-grab active:cursor-grabbing">
                <div
                  className="w-10 h-1.5 rounded-full"
                  style={{ background: 'var(--color-border-strong, var(--color-border))' }}
                />
              </div>
            )}

            <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden">
              {confetti.map((piece) => (
                <span
                  key={piece.id}
                  className="absolute rounded-sm"
                  style={{
                    left: `${piece.left}%`,
                    top: '-10px',
                    width: piece.width,
                    height: piece.width * 0.42,
                    background: piece.color,
                    animation: `achievementConfettiFall ${piece.duration}s ease-in ${piece.delay}s forwards`,
                  }}
                />
              ))}
            </div>

            <div
              className="relative mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: `color-mix(in srgb, ${tierColor} 16%, transparent)`,
                color: tierColor,
                animation: 'achievementPulse 1.5s ease-out',
              }}
            >
              <div className="text-[22px]">{icon}</div>
              <div
                className="absolute -right-1 -top-1 flex items-center justify-center rounded-full w-7 h-7 shadow-md"
                style={{ background: tierGradients[achievement.tier] ?? tierColor }}
              >
                <Sparkles size={14} className="text-white" fill="white" />
              </div>
            </div>

            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-text-muted mb-2">
              Achievement unlocked
            </p>
            <h3 className="text-2xl font-black text-text-primary mb-2 leading-tight">
              {achievement.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-5">
              {achievement.description}
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap mb-5">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-extrabold"
                style={{
                  color: tierColor,
                  background: `color-mix(in srgb, ${tierColor} 14%, transparent)`,
                }}
              >
                <Trophy size={15} /> {tierLabel[achievement.tier]}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-extrabold"
                style={{
                  color: 'var(--color-success)',
                  background: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
                }}
              >
                +{achievement.pointsAwarded} XP
              </span>
            </div>

            <p className="text-xs font-bold text-text-muted mb-5">
              Great work. Keep going and the next one is waiting.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl text-sm font-extrabold text-white transition-transform active:scale-95"
              style={{ background: 'var(--gradient-accent)' }}
            >
              Nice!
            </button>

            <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
