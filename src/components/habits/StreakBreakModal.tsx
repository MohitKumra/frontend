import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useModalRoot } from '../ui/ModalRoot';
import type { HabitStreakBreakDTO } from '../../types';

interface StreakBreakModalProps {
  open: boolean;
  brokenStreaks: HabitStreakBreakDTO[];
  onClose: () => void;
  onDismiss: () => void;
}

export function StreakBreakModal({ open, brokenStreaks, onClose, onDismiss }: StreakBreakModalProps) {
  const modalRoot = useModalRoot();

  if (!modalRoot || brokenStreaks.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'var(--overlay-bg, rgba(0,0,0,0.5))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[51] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md shadow-2xl border rounded-2xl overflow-hidden"
              style={{
                background: 'var(--modal-bg)',
                borderColor: 'var(--modal-border)',
                boxShadow: 'var(--modal-shadow)',
              }}
              initial={{ scale: 0.94, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 8, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'color-mix(in srgb, var(--color-danger, #EF4444) 12%, transparent)',
                    }}
                  >
                    <Flame size={20} style={{ color: 'var(--color-danger, #EF4444)' }} />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">Streak Broken!</h2>
                </div>
                <button
                  onClick={onDismiss}
                  className="tap-target w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <p className="text-sm text-text-primary mb-4">
                  Oh no! You've missed a day and your streak has been broken.
                </p>

                <div className="flex flex-col gap-3 mb-6">
                  {brokenStreaks.map((s) => (
                    <div
                      key={s.habitId}
                      className="p-3 rounded-xl flex items-center justify-between"
                      style={{
                        background: 'color-mix(in srgb, var(--color-danger, #EF4444) 6%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-danger, #EF4444) 18%, transparent)',
                      }}
                    >
                      <span className="text-sm font-semibold text-text-primary">{s.title}</span>
                      <span className="text-xs font-bold text-text-muted">
                        Was on a <span style={{ color: 'var(--color-danger, #EF4444)' }}>{s.previousStreak}</span>-day streak
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
                    style={{
                      background: 'transparent',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    Let's rebuild!
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    modalRoot
  );
}