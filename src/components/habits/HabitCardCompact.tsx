import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Circle, Flame, Clock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToggleHabit, useUpdateHabit, useDeleteHabit } from '../../features/habits/hooks/useHabits';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { HabitCelebrationModal } from './HabitCelebration';
import { getCategory } from '../../features/habits/Habitpresentation';
import type { HabitDTO } from '../../types';

function MiniRing({ value, color, size = 44 }: { value: number; color: string; size?: number }) {
  const stroke = 4.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="var(--color-border)" strokeWidth={stroke} opacity={0.35}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
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

export function HabitCardCompact({ habit }: { habit: HabitDTO }) {
  const toggle = useToggleHabit();
  const [showCelebration, setShowCelebration] = useState(false);

  // Edit / Delete modal state
  const [editTarget, setEditTarget] = useState<HabitDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HabitDTO | null>(null);

  const category = getCategory(habit.title);
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
      <Card
        variant="default"
        className="relative overflow-hidden p-4"
        style={{
          borderRadius: '20px',
          border: habit.completedToday
            ? `1.5px solid color-mix(in srgb, ${category.color} 45%, var(--color-border))`
            : '1px solid var(--color-border)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: `linear-gradient(180deg, ${category.color}, ${category.color}99)` }}
        />

        {/* Menu button top-right */}
        <div className="absolute top-2 right-2 z-20">
          <HabitMenu habit={habit} onEdit={handleEdit} onDelete={handleDelete} />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pl-1.5 pr-12">
          {/* Checkbox */}
          <button
            onClick={handleToggle}
            disabled={toggle.isPending}
            className="shrink-0 transition-colors duration-150 tap-target"
            aria-label={habit.completedToday ? 'Unmark today' : 'Mark done today'}
          >
            {habit.completedToday ? (
              <CheckCircle2 size={26} style={{ color: 'var(--color-success)' }} fill="var(--color-success)" fillOpacity={0.16} />
            ) : (
              <Circle size={26} className="text-text-muted" />
            )}
          </button>

          {/* Icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `color-mix(in srgb, ${category.color} 14%, transparent)`,
              color: category.color,
              boxShadow: `0 3px 10px color-mix(in srgb, ${category.color} 20%, transparent)`,
            }}
          >
            <Icon size={19} strokeWidth={2.25} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className={`text-sm font-extrabold truncate ${habit.completedToday ? 'text-success' : 'text-text-primary'}`}>
                {habit.title}
              </p>
              {habit.currentStreak > 0 && (
                <span
                  className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: 'var(--color-warning)', background: 'color-mix(in srgb, var(--color-warning) 14%, transparent)' }}
                >
                  <Flame size={10} /> {habit.currentStreak}d
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: category.color, background: `color-mix(in srgb, ${category.color} 12%, transparent)` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: category.color }} />
                {category.name}
              </span>
              <p className="text-[10px] font-semibold text-text-muted">
                {habit.completionsThisWeek}/{habit.targetPerWeek} this week
              </p>
              {/* Skip days */}
              {habit.skipDays && habit.skipDays.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  Skip: {habit.skipDays.map((d) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(',')}
                </span>
              )}
              {/* Duration completed */}
              {habit.durationDays && !habit.isActive && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
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
                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {habit.completionDates.length}/{habit.durationDays}d
                </span>
              )}
            </div>
          </div>

          {/* Reminder time */}
          {habit.reminderTime && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-text-muted shrink-0">
              <Clock size={12} />
              <span>{habit.reminderTime}</span>
            </div>
          )}

          {/* Mini progress ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <MiniRing value={progress} color={category.color} />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[10px] font-black text-text-primary">{progress}%</p>
            </div>
          </div>
        </div>
      </Card>

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