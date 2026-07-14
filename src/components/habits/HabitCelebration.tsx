import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Flame, PartyPopper, Sparkles } from 'lucide-react';
import { getAchievement } from '../../features/habits/Habitpresentation';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface HabitCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  habitTitle: string;
  currentStreak: number;
  color: string;
}

const MESSAGES = [
  "Nice work — that's one more day in the books.",
  "Consistency wins. See you tomorrow.",
  "Small steps, real progress. Keep going.",
  "That's how streaks are built — one day at a time.",
  "Locked in for today. Same time tomorrow?",
];

const CONFETTI_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export function HabitCelebrationModal({
  open, onClose, habitTitle, currentStreak, color,
}: HabitCelebrationModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const achievement = getAchievement(currentStreak);

  const message = useMemo(
    () => MESSAGES[(currentStreak + habitTitle.length) % MESSAGES.length],
    [currentStreak, habitTitle],
  );

  const confetti = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.4 + Math.random() * 0.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 5 + Math.random() * 5,
      })),
    // Re-generate confetti each time the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  // Auto-dismiss after 3.4 s
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 3400);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  // Escape key to dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Drag-to-dismiss handler (mobile only)
  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      onClose();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: 'color-mix(in srgb, black 50%, transparent)', zIndex: 9999 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
          >
            <style>{`
              @keyframes habitConfettiFall {
                0%   { transform: translateY(-16px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(220px) rotate(480deg); opacity: 0; }
              }
              @keyframes habitRingPulse {
                0%   { box-shadow: 0 0 0 0   color-mix(in srgb, ${color} 45%, transparent); }
                100% { box-shadow: 0 0 0 24px color-mix(in srgb, ${color}  0%, transparent); }
              }
            `}</style>

            <motion.div
              className="relative w-full max-w-sm rounded-3xl p-6 sm:p-8 text-center overflow-hidden shadow-2xl"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                touchAction: isMobile ? 'none' : 'auto',
                zIndex: 10000,
              }}
              // Entry pop animation
              initial={{ scale: 0.85, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0, y: isMobile ? 60 : 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 340 }}
              // Drag-to-dismiss on mobile
              {...(isMobile
                ? {
                    drag: 'y',
                    dragDirectionLock: true,
                    dragConstraints: { top: 0, bottom: 0 },
                    dragElastic: { top: 0, bottom: 0.5 },
                    onDragEnd: handleDragEnd,
                  }
                : {})}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle — mobile only */}
              {isMobile && (
                <div className="flex justify-center mb-3 cursor-grab active:cursor-grabbing">
                  <div
                    className="w-10 h-1.5 rounded-full"
                    style={{ background: 'var(--color-border-strong, var(--color-border))' }}
                  />
                </div>
              )}

              {/* Confetti */}
              <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden">
                {confetti.map((p) => (
                  <span
                    key={p.id}
                    className="absolute rounded-sm"
                    style={{
                      left: `${p.left}%`,
                      top: '-10px',
                      width: p.w,
                      height: p.w * 0.4,
                      background: p.color,
                      animation: `habitConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
                    }}
                  />
                ))}
              </div>

              {/* Icon ring */}
              <div
                className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: `color-mix(in srgb, ${color} 16%, transparent)`,
                  color,
                  animation: 'habitRingPulse 1.4s ease-out',
                }}
              >
                <PartyPopper size={28} />
              </div>

              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1 truncate px-4">
                {habitTitle}
              </p>
              <h3 className="text-xl font-black text-text-primary mb-2">Done for today!</h3>
              <p className="text-sm font-medium text-text-secondary mb-5 px-2 leading-relaxed">
                {message}
              </p>

              <div className="flex items-center justify-center gap-2 flex-wrap mb-5">
                <span
                  className="flex items-center gap-1.5 text-sm font-extrabold px-3 py-1.5 rounded-full"
                  style={{
                    color: 'var(--color-warning)',
                    background: 'color-mix(in srgb, var(--color-warning) 14%, transparent)',
                  }}
                >
                  <Flame size={15} /> {currentStreak} day{currentStreak === 1 ? '' : 's'} streak
                </span>
                {achievement && (
                  <span
                    className="flex items-center gap-1.5 text-sm font-extrabold px-3 py-1.5 rounded-full"
                    style={{
                      color: achievement.color,
                      background: `color-mix(in srgb, ${achievement.color} 14%, transparent)`,
                    }}
                  >
                    <Sparkles size={15} /> {achievement.label}
                  </span>
                )}
              </div>

              <p className="text-xs font-bold text-text-muted mb-5">
                Come back tomorrow to keep it going.
              </p>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl text-sm font-extrabold text-white transition-transform active:scale-95"
                style={{ background: 'var(--gradient-accent)' }}
              >
                Nice!
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
