// frontend/src/components/goals/GoalDeleteModal.tsx
// Confirmation modal shown before deleting a goal.
// Lets the user individually choose whether to also delete linked habits,
// tasks, and projects — or keep them as standalone records.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, BookOpen, CheckSquare, FolderOpen } from 'lucide-react';
import { useModalRoot } from '../ui/ModalRoot';
import type { GoalDTO } from '../../types';
import type { DeleteGoalOptions } from '../../features/goals/api';

interface GoalDeleteModalProps {
  open: boolean;
  goal: GoalDTO;
  onClose: () => void;
  onConfirm: (options: DeleteGoalOptions) => void;
  isDeleting?: boolean;
}

export function GoalDeleteModal({ open, goal, onClose, onConfirm, isDeleting }: GoalDeleteModalProps) {
  const modalRoot = useModalRoot();

  const [deleteHabits, setDeleteHabits] = useState(false);
  const [deleteTasks, setDeleteTasks] = useState(false);
  const [deleteProjects, setDeleteProjects] = useState(false);

  const hasLinkedItems =
    goal.habitCount > 0 || goal.taskCount > 0 || goal.projectCount > 0;

  const handleConfirm = () => {
    onConfirm({
      deleteLinkedHabits: deleteHabits,
      deleteLinkedTasks: deleteTasks,
      deleteLinkedProjects: deleteProjects,
    });
  };

  if (!modalRoot) return null;

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
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-[51] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="goal-delete-title"
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border"
              style={{
                background: 'var(--modal-bg, var(--color-surface))',
                borderColor: 'var(--modal-border, var(--color-border))',
                boxShadow: 'var(--modal-shadow, 0 24px 64px rgba(0,0,0,0.3))',
              }}
              initial={{ scale: 0.94, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 8, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'color-mix(in srgb, var(--color-danger, #EF4444) 12%, transparent)' }}
                  >
                    <AlertTriangle size={20} style={{ color: 'var(--color-danger, #EF4444)' }} />
                  </div>
                  <div className="min-w-0">
                    <h2 id="goal-delete-title" className="text-base font-black text-text-primary">
                      Delete goal?
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5 truncate max-w-[240px]">
                      {goal.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 pb-6">
                <p className="text-sm text-text-secondary mb-5">
                  The goal will be permanently deleted. Choose what to do with its linked items below — anything you keep will remain as a standalone record.
                </p>

                {hasLinkedItems ? (
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                      Also delete linked items?
                    </p>

                    {goal.habitCount > 0 && (
                      <LinkedItemRow
                        icon={<BookOpen size={15} />}
                        label="Habits"
                        count={goal.habitCount}
                        checked={deleteHabits}
                        onChange={setDeleteHabits}
                        color="var(--color-accent, #4F46E5)"
                      />
                    )}

                    {goal.taskCount > 0 && (
                      <LinkedItemRow
                        icon={<CheckSquare size={15} />}
                        label="Tasks"
                        count={goal.taskCount}
                        checked={deleteTasks}
                        onChange={setDeleteTasks}
                        color="var(--color-warning, #F59E0B)"
                      />
                    )}

                    {goal.projectCount > 0 && (
                      <LinkedItemRow
                        icon={<FolderOpen size={15} />}
                        label="Projects"
                        count={goal.projectCount}
                        checked={deleteProjects}
                        onChange={setDeleteProjects}
                        color="var(--color-success, #10B981)"
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className="rounded-xl px-4 py-3 mb-6 text-sm text-text-muted border"
                    style={{
                      background: 'var(--color-surface-raised)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    This goal has no linked habits, tasks, or projects.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: 'transparent',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--color-danger, #EF4444)' }}
                  >
                    <Trash2 size={15} />
                    {isDeleting ? 'Deleting…' : 'Delete goal'}
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

// ─── Sub-component ────────────────────────────────────────────────────────────

interface LinkedItemRowProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  checked: boolean;
  onChange: (val: boolean) => void;
  color: string;
}

function LinkedItemRow({ icon, label, count, checked, onChange, color }: LinkedItemRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all"
      style={{
        borderColor: checked ? 'var(--color-danger, #EF4444)' : 'var(--color-border)',
        background: checked
          ? 'color-mix(in srgb, var(--color-danger, #EF4444) 6%, var(--color-surface-raised))'
          : 'var(--color-surface-raised)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          <p className="text-xs text-text-muted">
            {count} {count === 1 ? label.toLowerCase().replace(/s$/, '') : label.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Custom checkbox */}
      <div
        className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          borderColor: checked ? 'var(--color-danger, #EF4444)' : 'var(--color-border)',
          background: checked ? 'var(--color-danger, #EF4444)' : 'transparent',
        }}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  );
}
