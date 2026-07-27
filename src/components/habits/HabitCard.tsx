import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Clock,
  Flame,
  Trophy,
  Zap,
  Star,
  Moon,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useToggleHabit, useUpdateHabit, useDeleteHabit } from '../../features/habits/hooks/useHabits';
import { Card } from '../ui/Card';
import { HabitCelebrationModal } from './HabitCelebration';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { getAchievement, getCategory } from '../../features/habits/Habitpresentation';
import type { HabitDTO } from '../../types';

const RING_SIZE = 88; 

function MiniRing({ value, color, completed = false }: { value: number; color: string; completed?: boolean }) {
  const size = RING_SIZE;
  const stroke = 5; // thin, refined — not a thick gamified band
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-[1]">
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--color-border)" strokeWidth={stroke} opacity="0.4"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          opacity={completed ? 1 : 0.85}
        />
      </svg>
    </div>
  );
}

/** Micro heatmap — small, quiet, refined pips */
function MiniHeatmapStrip({ completionDates, color, skipDays }: { completionDates: string[]; color: string; skipDays?: number[] }) {
  const cells = useMemo(() => {
    const completedSet = new Set(completionDates || []);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dow = (d.getUTCDay() + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
      const isSkip = skipDays ? skipDays.includes(dow) : false;
      return { dateStr, done: completedSet.has(dateStr), isToday: i === 6, isSkip };
    });
  }, [completionDates, skipDays]);

  return (
    <div className="flex items-center gap-2" role="img" aria-label="Last 7 days activity">
      {cells.map((c, i) => (
        <div key={c.dateStr} className="relative flex-1 aspect-square max-w-[22px]">
          {c.isToday && (
            <motion.div
              className="absolute -inset-[2.5px] rounded-full pointer-events-none"
              style={{ border: `1.5px solid color-mix(in srgb, ${color} 55%, transparent)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
            />
          )}
          {c.isSkip ? (
            <motion.div
              title={`${c.dateStr} — Rest day`}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, #8B5CF6 35%, transparent)',
                opacity: 0.7,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              title={c.dateStr}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: c.done ? `color-mix(in srgb, ${color} 88%, transparent)` : 'var(--color-border)',
                opacity: c.done ? 1 : 0.45,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: c.done ? 1 : 0.45 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              {c.done && <Check size={9} color="#fff" strokeWidth={3} />}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Dropdown menu for edit/delete actions — rendered via portal to escape all overflow clipping */
function HabitMenu({
  habit,
  onEdit,
  onDelete,
}: {
  habit: HabitDTO;
  onEdit: (habit: HabitDTO) => void;
  onDelete: (habit: HabitDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  // Compute position for the dropdown
  const dropdownStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!open || !btnRef.current) return undefined;
    const rect = btnRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
      minWidth: 140,
      background: 'var(--color-surface)',
      borderColor: 'var(--color-border)',
    };
  }, [open]);

  return (
    <div className="inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        aria-label="More options"
        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-accent/10 transition-colors tap-target"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && dropdownStyle && typeof document !== 'undefined' && createPortal(
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={undefined}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="rounded-xl overflow-hidden shadow-xl border"
          style={dropdownStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(habit); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-text-primary hover:bg-accent/10 transition-colors text-left"
          >
            <Pencil size={13} strokeWidth={2} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete(habit); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors text-left"
          >
            <Trash2 size={13} strokeWidth={2} />
            Delete
          </button>
        </motion.div>,
        document.body
      )}
    </div>
  );
}

/** Edit habit modal */
function EditHabitModal({
  habit,
  open,
  onClose,
}: {
  habit: HabitDTO | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateHabit = useUpdateHabit();
  const [title, setTitle] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // Sync state when habit changes
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setReminderTime(habit.reminderTime || '');
    }
  }, [habit]);

  const previewCategory = title.trim() ? getCategory(title) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habit) return;
    updateHabit.mutate(
      { id: habit.id, data: { title, reminderTime: reminderTime || undefined } },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Habit">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        <div>
          <Input
            id="edit-habit-title"
            label="Habit name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Read 30 minutes"
          />
          {previewCategory && (
            <motion.div
              className="flex items-center gap-1.5 mt-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: previewCategory.bg, color: previewCategory.color }}
              >
                <previewCategory.icon size={11} />
              </div>
              <p className="text-[11px] font-bold text-text-muted">
                Detected: <span style={{ color: previewCategory.color }}>{previewCategory.name}</span>
              </p>
            </motion.div>
          )}
        </div>

        <Input
          id="edit-habit-reminder"
          label="Reminder (optional)"
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
        />

        <Button type="submit" fullWidth loading={updateHabit.isPending}>
          Save Changes
        </Button>
      </form>
    </Modal>
  );
}

/** Delete confirmation dialog */
function DeleteHabitModal({
  habit,
  open,
  onClose,
}: {
  habit: HabitDTO | null;
  open: boolean;
  onClose: () => void;
}) {
  const deleteHabit = useDeleteHabit();

  const handleDelete = () => {
    if (!habit) return;
    deleteHabit.mutate(habit.id, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete Habit">
      <div className="flex flex-col gap-5 pt-2">
        <p className="text-sm text-text-primary">
          Are you sure you want to delete <strong>{habit?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteHabit.isPending} className="flex-1">
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function HabitCard({ habit, isFocused }: { habit: HabitDTO; isFocused?: boolean }) {
  const toggle = useToggleHabit();
  const [showCelebration, setShowCelebration] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Edit / Delete modal state
  const [editTarget, setEditTarget] = useState<HabitDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HabitDTO | null>(null);

  const category = getCategory(habit.title);
  const achievement = getAchievement(Math.max(habit.currentStreak, habit.bestStreak));
  const Icon = category.icon;

  const progress = useMemo(() => {
    // If duration is set, progress = completionDates / durationDays
    if (habit.durationDays) {
      return Math.round((habit.completionDates.length / habit.durationDays) * 100);
    }
    // Otherwise, weekly progress from available days (7 - skipDays)
    const availableDays = 7 - (habit.skipDays?.length ?? 0);
    const target = Math.max(availableDays, habit.targetPerWeek || 1);
    return Math.round((habit.completionsThisWeek / target) * 100);
  }, [habit.completionsThisWeek, habit.completionDates.length, habit.durationDays, habit.targetPerWeek, habit.skipDays]);

  // Check if today is a skip day
  const isSkipDay = useMemo(() => {
    if (!habit.skipDays || habit.skipDays.length === 0) return false;
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
    return habit.skipDays.includes(dow);
  }, [habit.skipDays]);

  const handleToggle = () => {
    const wasCompleted = habit.completedToday;
    toggle.mutate(habit.id, {
      onSuccess: (updated) => {
        if (!wasCompleted && updated?.completedToday) setShowCelebration(true);
      },
    });
  };

  const handleEdit = (h: HabitDTO) => setEditTarget(h);
  const handleDelete = (h: HabitDTO) => setDeleteTarget(h);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="relative h-full rounded-2xl"
        id={`habit-card-${habit.id}`}
        style={{
          // A quiet ambient shadow rather than a colored glow — the wrapper carries
          // it so it's never clipped by the Card's own border radius.
          boxShadow: isFocused
            ? `0 0 0 2px ${category.color}, 0 0 20px color-mix(in srgb, ${category.color} 50%, transparent)`
            : isHovered
              ? '0 12px 28px rgba(15, 15, 15, 0.09), 0 2px 6px rgba(15, 15, 15, 0.05)'
              : '0 2px 10px rgba(15, 15, 15, 0.045)',
          transition: 'box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Card
          variant="default"
          className="relative h-full flex flex-col group p-4"
          style={{
            borderRadius: '16px',
            border: habit.completedToday
              ? `1px solid color-mix(in srgb, ${category.color} 35%, var(--color-border))`
              : undefined,
            transition: 'border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Top-right: completed check + menu — small and quiet */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <AnimatePresence>
              {habit.completedToday && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--color-success, #22C55E) 88%, transparent)' }}
                >
                  <Check size={11} color="#fff" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
            <HabitMenu habit={habit} onEdit={handleEdit} onDelete={handleDelete} />
          </div>

          {/* Header: Icon + title + streak */}
          <div className="relative flex items-start gap-2.5 mb-4 pr-9">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in srgb, ${category.color} 10%, transparent)`,
                color: category.color,
              }}
            >
              <Icon size={16} strokeWidth={2} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight mb-1 truncate text-text-primary tracking-tight">
                {habit.title}
              </h4>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide"
                  style={{
                    background: `color-mix(in srgb, ${category.color} 9%, transparent)`,
                    color: category.color,
                  }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: category.color }} />
                  {category.name}
                </span>

                {/* Skip days */}
                {habit.skipDays && habit.skipDays.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                    title="Intentionally skipped days"
                  >
                    Skip: {habit.skipDays.map((d) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(', ')}
                  </span>
                )}

                {/* Duration */}
                {habit.durationDays && !habit.isActive && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      color: 'var(--color-success, #22C55E)',
                      border: '1px solid color-mix(in srgb, var(--color-success, #22C55E) 30%, transparent)',
                    }}
                  >
                    Completed 🎉
                  </span>
                )}
                {habit.durationDays && habit.isActive && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {habit.completionDates.length}/{habit.durationDays}d
                  </span>
                )}

                {/* Streak — small, refined outline pill instead of a filled badge */}
                {habit.currentStreak > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <Flame size={9} strokeWidth={2.25} style={{ color: '#C2740A' }} />
                    {habit.currentStreak}d
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress ring + Stats */}
          <div className="relative flex items-center gap-3.5 mb-4">
            <div className="relative flex items-center justify-center shrink-0">
              <MiniRing value={progress} color={category.color} completed={habit.completedToday} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-base font-semibold leading-none text-text-primary tracking-tight">
                  {progress}%
                </p>
                <p className="text-[7px] font-medium uppercase tracking-wider text-text-muted mt-0.5">
                  Done
                </p>
              </div>
            </div>

            {/* Info column — plain, quiet text pairs */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted flex items-center gap-1 text-[10px] font-medium shrink-0">
                  <Clock size={10} strokeWidth={2} /> Next
                </span>
                <span className="font-medium text-text-primary text-[11px] truncate">{habit.reminderTime || '8:00 PM'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted text-[10px] font-medium shrink-0">Duration</span>
                <span className="font-medium text-text-primary text-[11px] truncate">
                  {habit.durationDays ? `${habit.completionDates.length}/${habit.durationDays}d` : 'Forever'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted flex items-center gap-1 text-[10px] font-medium shrink-0">
                  <Zap size={10} strokeWidth={2} /> XP
                </span>
                <span className="font-medium text-[11px] truncate text-text-primary">{habit.totalXp}</span>
              </div>
            </div>
          </div>

          {/* Progress bar — thin, subtle */}
          <div className="relative h-[3px] rounded-full overflow-hidden mb-4" style={{ background: 'var(--color-border)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: category.color, opacity: 0.85 }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
            />
          </div>

          {/* Micro heatmap */}
          <div className="mb-4">
            <p className="text-[9px] font-medium text-text-muted uppercase tracking-wider mb-2">
              Last 7 Days
            </p>
            <MiniHeatmapStrip completionDates={habit.completionDates || []} color={category.color} skipDays={habit.skipDays} />
          </div>

          {/* Footer: Achievement + Complete button */}
          <div className="mt-auto pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              {achievement ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Trophy size={12} strokeWidth={2} style={{ color: achievement.color }} />
                  <span className="text-[10px] font-medium truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {achievement.label}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-medium text-text-muted flex items-center gap-1.5">
                  <Star size={9} strokeWidth={2} /> Best: {habit.bestStreak}d
                </span>
              )}
            </div>

            {/* Mark Done / Rest Day / Completed */}
            {isSkipDay ? (
              <motion.button
                disabled
                className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-default"
                style={{
                  color: 'var(--color-text-muted)',
                  background: 'color-mix(in srgb, var(--color-text-muted) 6%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
                  opacity: 0.7,
                }}
              >
                <Moon size={14} strokeWidth={1.5} />
                Rest Day
              </motion.button>
            ) : (
              <motion.button
                onClick={handleToggle}
                disabled={toggle.isPending}
                className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all tap-target flex items-center justify-center gap-2"
                style={{
                  color: habit.completedToday ? 'var(--color-success, #16A34A)' : 'var(--color-text-primary)',
                  background: habit.completedToday
                    ? 'color-mix(in srgb, var(--color-success, #22C55E) 10%, transparent)'
                    : 'transparent',
                  border: habit.completedToday
                    ? '1px solid color-mix(in srgb, var(--color-success, #22C55E) 30%, transparent)'
                    : '1px solid var(--color-border)',
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.2 }}
              >
                {habit.completedToday ? (
                  <>
                    <Check size={14} strokeWidth={2.5} />
                    Completed Today
                  </>
                ) : (
                  <>
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ border: '1.5px solid var(--color-text-muted)' }}
                    />
                    Mark Done
                  </>
                )}
              </motion.button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Edit modal */}
      <EditHabitModal
        habit={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
      />

      {/* Delete confirmation */}
      <DeleteHabitModal
        habit={deleteTarget}
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
      />

      <HabitCelebrationModal
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        habitTitle={habit.title}
        currentStreak={habit.currentStreak}
        color={category.color}
      />
    </>
  );
}