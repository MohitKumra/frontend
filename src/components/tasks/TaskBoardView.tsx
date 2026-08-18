import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useFloatingEnabled } from '../../hooks/useAnimationPrefs';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  ExternalLink,
  Flag,
  ListChecks,
  MoreVertical,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TaskDTO, TaskStatus } from '../../types';
import { PageControls } from './PageControls';

const PAGE_SIZE = 6;

const priorityColor: Record<TaskDTO['priority'], string> = {
  LOW: 'var(--color-success)',
  MEDIUM: 'var(--color-warning)',
  HIGH: 'var(--color-danger)',
  CRITICAL: '#7c3aed',
};

const priorityLabel: Record<TaskDTO['priority'], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const columns: {
  status: TaskStatus;
  label: string;
  accent: string;
  icon: typeof Circle;
  empty: string;
}[] = [
  { status: 'TODO', label: 'To Do', accent: 'var(--color-info)', icon: Circle, empty: 'Nothing waiting here' },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    accent: 'var(--color-warning)',
    icon: Clock3,
    empty: 'No active task',
  },
  { status: 'DONE', label: 'Done', accent: 'var(--color-success)', icon: CheckCircle2, empty: 'No wins logged yet' },
];

interface TaskBoardViewProps {
  tasks: TaskDTO[];
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (task: TaskDTO) => void;
  onAddTask?: (status: TaskStatus) => void;
  formatDueDate: (dateStr: string | null) => string | null;
  isOverdue: (date: string | null, status: string) => boolean;
  getRecurrenceLabel: (rule: string | null) => string | null;
  highlightedTaskId?: string | null;
}

function progressFor(task: TaskDTO) {
  const total = task.subTasks?.length ?? 0;
  if (total > 0) {
    const done = task.subTasks?.filter((subtask) => subtask.completed).length ?? 0;
    return Math.round((done / total) * 100);
  }
  if (task.status === 'DONE') return 100;
  if (task.status === 'IN_PROGRESS') return 40;
  return 0;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}


// ── Draggable wrapper for a task card (desktop board only) ─────────────────
function DraggableTaskCard({
  task,
  accent,
  dragging,
  menuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
  onViewDetails,
  onStatusChange,
  formatDueDate,
  isOverdue,
  getRecurrenceLabel,
  isHighlighted,
}: {
  task: TaskDTO;
  accent: string;
  dragging: boolean;
  menuOpen: boolean;
  onMenuToggle: (id: string | null) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (task: TaskDTO) => void;
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  formatDueDate: (dateStr: string | null) => string | null;
  isOverdue: (date: string | null, status: string) => boolean;
  getRecurrenceLabel: (rule: string | null) => string | null;
  isHighlighted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      <TaskBoardCard
        task={task}
        accent={accent}
        dragging={dragging || isDragging}
        menuOpen={menuOpen}
        onMenuToggle={onMenuToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewDetails={onViewDetails}
        onStatusChange={onStatusChange}
        formatDueDate={formatDueDate}
        isOverdue={isOverdue}
        getRecurrenceLabel={getRecurrenceLabel}
        isHighlighted={isHighlighted}
      />
    </div>
  );
}

// ── Droppable column wrapper (desktop board only) ───────────────────────────
function DroppableColumn({
  id,
  children,
  className,
  style: externalStyle,
  accent,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  accent: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={className}
      style={{
        ...externalStyle,
        borderColor: isOver ? accent : 'var(--color-border)',
        boxShadow: isOver
          ? `0 0 0 4px color-mix(in srgb, ${accent} 14%, transparent)`
          : '0 12px 28px -26px rgba(15, 23, 42, 0.3)',
      }}
    >
      {children}
    </section>
  );
}

// ── Compact task card used inside board columns ─────────────────────────────
function TaskBoardCard({
  task,
  accent,
  dragging,
  menuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
  onViewDetails,
  onStatusChange,
  formatDueDate,
  isOverdue,
  getRecurrenceLabel,
  isHighlighted,
}: {
  task: TaskDTO;
  accent: string;
  dragging: boolean;
  menuOpen: boolean;
  onMenuToggle: (id: string | null) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (task: TaskDTO) => void;
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  formatDueDate: (dateStr: string | null) => string | null;
  isOverdue: (date: string | null, status: string) => boolean;
  getRecurrenceLabel: (rule: string | null) => string | null;
  isHighlighted?: boolean;
}) {
  const isDone = task.status === 'DONE';
  const dueDate = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);
  const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
  const totalSubtasks = task.subTasks?.length ?? 0;
  const completedSubtasks = task.subTasks?.filter((subtask) => subtask.completed).length ?? 0;
  const progress = progressFor(task);
  const duration = formatDuration(task.estimatedDuration);
  const lineColor = isDone ? 'var(--color-success)' : overdue ? 'var(--color-danger)' : accent;

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // Menus are portaled to <body> because the card itself uses overflow-hidden
  // (needed for the rounded corners + accent line), which would otherwise clip the dropdown.
  useEffect(() => {
    if (menuOpen && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuWidth = 160; // w-40
      const rawRight = window.innerWidth - rect.right;
      // Clamp so the menu never overflows the left edge of the viewport
      const right = Math.max(8, Math.min(rawRight, window.innerWidth - menuWidth - 8));
      setMenuPosition({ top: rect.bottom + 6, right });
    } else {
      setMenuPosition(null);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        onMenuToggle(null);
      }
    };
    const timeoutId = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, onMenuToggle]);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-[var(--color-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(15,23,42,0.4)]"
      style={{
        borderColor: isHighlighted
          ? 'var(--color-accent)'
          : isDone
            ? 'color-mix(in srgb, var(--color-success) 24%, var(--color-border))'
            : overdue
              ? 'color-mix(in srgb, var(--color-danger) 30%, var(--color-border))'
              : 'var(--color-border)',
        boxShadow: isHighlighted
          ? '0 8px 30px color-mix(in srgb, var(--color-accent) 30%, transparent), 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent)'
          : '0 1px 2px rgba(15, 23, 42, 0.05)',
        opacity: dragging ? 0.45 : 1,
        transform: isHighlighted ? 'translateY(-4px)' : 'none',
        touchAction: 'none',
      }}
    >
      <div className="h-[3px] w-full" style={{ background: lineColor }} />

      <div className="p-2.5 sm:p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onEdit(task)}
            className="min-w-0 flex-1 text-left"
          >
            <h4
              className="truncate text-[12.5px] font-black leading-snug"
              style={{
                textDecorationLine: isDone ? 'line-through' : 'none',
                color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
              }}
            >
              {task.title}
            </h4>
          </button>

          <div className="relative shrink-0">
            <button
              ref={menuButtonRef}
              type="button"
              // Stop the pointer event from reaching the DnD listeners on the wrapper,
              // otherwise a quick tap on the menu button can be consumed as a drag start.
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onMenuToggle(menuOpen ? null : task.id)}
              className="rounded-lg p-1 text-text-muted opacity-70 transition-opacity hover:bg-black/[0.05] hover:opacity-100 dark:hover:bg-white/[0.06]"
              aria-label="Task actions"
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen &&
              menuPosition &&
              createPortal(
                <>
                  <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => onMenuToggle(null)} />
                  <div
                    key={task.id}
                    ref={menuRef}
                    className="fixed w-40 overflow-hidden rounded-xl border py-1.5 shadow-xl"
                    style={{
                      top: `${menuPosition.top}px`,
                      right: `${menuPosition.right}px`,
                      background: 'var(--color-surface-raised)',
                      borderColor: 'var(--color-border)',
                      zIndex: 9999,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {onViewDetails && (
                      <button
                        type="button"
                        onClick={() => {
                          onViewDetails(task);
                          onMenuToggle(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <ExternalLink size={12} /> View Details
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(task);
                        onMenuToggle(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    {task.status !== 'IN_PROGRESS' && !isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          onStatusChange(task, 'IN_PROGRESS');
                          onMenuToggle(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <Play size={12} /> Start
                      </button>
                    )}
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          onStatusChange(task, 'DONE');
                          onMenuToggle(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <CheckCircle2 size={12} /> Mark done
                      </button>
                    )}
                    {isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          onStatusChange(task, 'TODO');
                          onMenuToggle(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <Circle size={12} /> Unmark done
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(task.id);
                        onMenuToggle(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-danger hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </>,
                document.body
              )}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-[3px] text-[9px] font-black"
            style={{
              background: `color-mix(in srgb, ${priorityColor[task.priority]} 12%, transparent)`,
              color: priorityColor[task.priority],
            }}
          >
            <Flag size={9} fill="currentColor" />
            {priorityLabel[task.priority]}
          </span>

          {dueDate && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-[3px] text-[9px] font-bold"
              style={{
                background: overdue
                  ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                  : 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
                color: overdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
              }}
            >
              <Calendar size={9} />
              {dueDate}
            </span>
          )}

          {recurrenceLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-1.5 py-[3px] text-[9px] font-bold text-accent">
              {recurrenceLabel}
            </span>
          )}
        </div>

        {totalSubtasks > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ background: 'var(--color-border-subtle)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: isDone ? 'var(--color-success)' : accent }}
              />
            </div>
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-text-muted">
              <ListChecks size={11} />
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
        )}

        {duration && (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-text-muted">
            <Clock3 size={10} />
            {duration}
          </p>
        )}
      </div>
    </div>
  );
}

/** "Move tasks here" dropdown button — shown when other columns have tasks */
function MoveTasksHereBtn({
  tasks,
  targetStatus,
  accent,
  onMove,
}: {
  tasks: TaskDTO[];
  targetStatus: TaskStatus;
  accent: string;
  onMove: (task: TaskDTO) => void;
}) {
  const [open, setOpen] = useState(false);

  // Group by current status — must be called before any early return (Rules of Hooks)
  const grouped = useMemo(() => {
    const map: Record<string, TaskDTO[]> = {};
    for (const t of tasks) {
      const key = t.status === 'TODO' ? 'To Do' : t.status === 'IN_PROGRESS' ? 'In Progress' : 'Done';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasks]);

  // No tasks to move — don't render anything (after all hooks)
  if (tasks.length === 0) return null;

  return (
    <div className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black transition-all"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: accent }}
      >
        <Plus size={16} />
        Move task here
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-60 overflow-y-auto rounded-2xl border p-2 shadow-xl"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          {Object.entries(grouped).map(([statusLabel, items]) => (
            <div key={statusLabel}>
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">{statusLabel}</p>
              {items.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    onMove(task);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-bold transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <CheckCircle2 size={12} style={{ color: accent }} />
                  <span className="line-clamp-1">{task.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-column animated empty state ────────────────────────────────────────
function BoardColumnEmpty({
  status,
  accent,
  isDragTarget,
  onAddTask,
}: {
  status: TaskStatus;
  accent: string;
  isDragTarget: boolean;
  onAddTask?: () => void;
}) {
  const floating = useFloatingEnabled();
  if (isDragTarget) {
    return (
      <div
        className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center transition-all"
        style={{ borderColor: accent, color: accent, background: `color-mix(in srgb, ${accent} 6%, transparent)` }}
      >
        <motion.div
          animate={floating ? { scale: [1, 1.12, 1] } : undefined}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Plus size={22} />
        </motion.div>
        <p className="mt-2 text-xs font-black">Drop task here</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-1 flex-col items-center justify-center rounded-2xl px-4 py-6 text-center"
      style={{ background: `color-mix(in srgb, ${accent} 4%, transparent)` }}
    >
      {/* Illustration */}
      <div className="relative mb-4 flex items-center justify-center" style={{ width: 100, height: 80 }}>
        {/* Dashed ring */}
        <svg className="absolute inset-0" width="100" height="80" viewBox="0 0 100 80" fill="none">
          <motion.ellipse
            cx="50"
            cy="40"
            rx="44"
            ry="34"
            stroke={accent}
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.25"
            animate={floating ? { rotate: 360 } : undefined}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '50px 40px' }}
          />
        </svg>

        {status === 'TODO' && (
          <svg width="70" height="62" viewBox="0 0 70 62" fill="none">
            {/* Back card */}
            <motion.g
              animate={floating ? { y: [0, -3, 0], rotate: [-3, -4, -3] } : undefined}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              style={{ transformOrigin: '20px 30px' }}
            >
              <rect
                x="4"
                y="14"
                width="38"
                height="32"
                rx="6"
                fill="var(--color-surface-raised)"
                stroke="var(--color-border)"
                strokeWidth="1.2"
              />
              <circle cx="14" cy="24" r="3.5" fill="none" stroke="var(--color-border)" strokeWidth="1.2" />
              <rect x="21" y="22.5" width="16" height="3" rx="1.5" fill="var(--color-border)" opacity="0.5" />
              <circle cx="14" cy="33" r="3.5" fill="none" stroke="var(--color-border)" strokeWidth="1.2" />
              <rect x="21" y="31.5" width="12" height="3" rx="1.5" fill="var(--color-border)" opacity="0.4" />
            </motion.g>
            {/* Front card */}
            <motion.g
              animate={floating ? { y: [0, -5, 0] } : undefined}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '46px 28px' }}
            >
              <rect
                x="24"
                y="6"
                width="42"
                height="50"
                rx="7"
                fill="var(--color-surface-raised)"
                stroke={accent}
                strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 4px 10px color-mix(in srgb, ${accent} 25%, transparent))` }}
              />
              {/* Top accent bar */}
              <rect x="24" y="6" width="42" height="4" rx="2" fill={accent} opacity="0.5" />
              {/* Empty checkbox rows */}
              <circle cx="34" cy="24" r="4" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.7" />
              <rect x="42" y="22" width="18" height="3.5" rx="1.75" fill={accent} opacity="0.3" />
              <circle cx="34" cy="36" r="4" fill="none" stroke="var(--color-border)" strokeWidth="1.2" />
              <rect x="42" y="34" width="14" height="3.5" rx="1.75" fill="var(--color-border)" opacity="0.4" />
              <circle cx="34" cy="48" r="4" fill="none" stroke="var(--color-border)" strokeWidth="1.2" />
              <rect x="42" y="46" width="16" height="3.5" rx="1.75" fill="var(--color-border)" opacity="0.3" />
            </motion.g>
          </svg>
        )}

        {status === 'IN_PROGRESS' && (
          <svg width="70" height="62" viewBox="0 0 70 62" fill="none">
            {/* Back card */}
            <motion.g
              animate={floating ? { y: [0, -3, 0], rotate: [3, 4, 3] } : undefined}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              style={{ transformOrigin: '50px 30px' }}
            >
              <rect
                x="28"
                y="14"
                width="38"
                height="32"
                rx="6"
                fill="var(--color-surface-raised)"
                stroke="var(--color-border)"
                strokeWidth="1.2"
              />
              <rect x="34" y="24" width="26" height="3" rx="1.5" fill="var(--color-border)" opacity="0.5" />
              <rect x="34" y="31" width="18" height="3" rx="1.5" fill="var(--color-border)" opacity="0.35" />
              {/* half-filled progress bar */}
              <rect x="34" y="39" width="26" height="3" rx="1.5" fill="var(--color-border)" opacity="0.3" />
              <rect x="34" y="39" width="14" height="3" rx="1.5" fill="var(--color-border)" opacity="0.5" />
            </motion.g>
            {/* Front card */}
            <motion.g
              animate={floating ? { y: [0, -5, 0] } : undefined}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '28px 28px' }}
            >
              <rect
                x="4"
                y="4"
                width="46"
                height="54"
                rx="8"
                fill="var(--color-surface-raised)"
                stroke={accent}
                strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 4px 10px color-mix(in srgb, ${accent} 25%, transparent))` }}
              />
              <rect x="4" y="4" width="46" height="4" rx="2" fill={accent} opacity="0.5" />
              {/* Animated partial-fill clock arc */}
              <circle cx="27" cy="26" r="10" fill="none" stroke="var(--color-border)" strokeWidth="2" opacity="0.3" />
              <motion.circle
                cx="27"
                cy="26"
                r="10"
                fill="none"
                stroke={accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="62.8"
                animate={floating ? { strokeDashoffset: [47, 25, 47] } : undefined}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '27px 26px' }}
              />
              {/* Clock hands */}
              <line
                x1="27"
                y1="26"
                x2="27"
                y2="19"
                stroke={accent}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.8"
              />
              <line
                x1="27"
                y1="26"
                x2="32"
                y2="29"
                stroke={accent}
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.6"
              />
              {/* Labels */}
              <rect x="12" y="44" width="28" height="3.5" rx="1.75" fill={accent} opacity="0.25" />
              <rect x="12" y="51" width="20" height="3" rx="1.5" fill="var(--color-border)" opacity="0.35" />
            </motion.g>
          </svg>
        )}

        {status === 'DONE' && (
          <svg width="70" height="62" viewBox="0 0 70 62" fill="none">
            {/* Back card */}
            <motion.g
              animate={floating ? { y: [0, -3, 0], rotate: [-3, -4, -3] } : undefined}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              style={{ transformOrigin: '20px 30px' }}
            >
              <rect
                x="4"
                y="14"
                width="36"
                height="30"
                rx="6"
                fill="var(--color-surface-raised)"
                stroke="var(--color-border)"
                strokeWidth="1.2"
              />
              <circle cx="15" cy="25" r="4" fill="var(--color-border)" opacity="0.3" />
              <path
                d="M13 25 L14.5 26.5 L17.5 23.5"
                stroke="var(--color-border)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
              />
              <rect x="23" y="23" width="12" height="3" rx="1.5" fill="var(--color-border)" opacity="0.4" />
              <circle cx="15" cy="36" r="4" fill="var(--color-border)" opacity="0.3" />
              <path
                d="M13 36 L14.5 37.5 L17.5 34.5"
                stroke="var(--color-border)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
              />
              <rect x="23" y="34" width="9" height="3" rx="1.5" fill="var(--color-border)" opacity="0.3" />
            </motion.g>
            {/* Front card — with animated check */}
            <motion.g
              animate={floating ? { y: [0, -5, 0] } : undefined}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '44px 28px' }}
            >
              <rect
                x="22"
                y="4"
                width="44"
                height="52"
                rx="8"
                fill="var(--color-surface-raised)"
                stroke={accent}
                strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 4px 10px color-mix(in srgb, ${accent} 25%, transparent))` }}
              />
              <rect x="22" y="4" width="44" height="4" rx="2" fill={accent} opacity="0.5" />
              {/* Big check circle */}
              <motion.circle
                cx="44"
                cy="28"
                r="14"
                fill={`color-mix(in srgb, ${accent} 18%, transparent)`}
                stroke={accent}
                strokeWidth="1.5"
                animate={floating ? { scale: [1, 1.06, 1] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.path
                d="M37 28 L42 33 L51 22"
                fill="none"
                stroke={accent}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={floating ? { opacity: [0.6, 1, 0.6] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <rect x="30" y="48" width="28" height="3" rx="1.5" fill={accent} opacity="0.2" />
            </motion.g>
          </svg>
        )}

        {/* Floating accent sparkles */}
        {[
          { x: 2, y: 4, delay: 0 },
          { x: 88, y: 8, delay: 0.6 },
          { x: 10, y: 68, delay: 1.1 },
          { x: 82, y: 64, delay: 0.3 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: 4, height: 4, left: dot.x, top: dot.y, background: accent, opacity: 0 }}
            animate={floating ? { scale: [1, 1.8, 1], opacity: [0, 0.5, 0], y: [0, -4, 0] } : undefined}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: dot.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-xs font-black mb-1" style={{ color: accent }}>
        {status === 'TODO' && 'Nothing planned yet'}
        {status === 'IN_PROGRESS' && 'Nothing in progress'}
        {status === 'DONE' && 'No wins logged yet'}
      </p>
      <p className="text-[10px] text-text-muted leading-relaxed mb-3 max-w-[140px]">
        {status === 'TODO' && 'Add your first task to get started'}
        {status === 'IN_PROGRESS' && 'Start a task to track active work'}
        {status === 'DONE' && 'Complete a task to celebrate here'}
      </p>

      {onAddTask && status === 'TODO' && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAddTask}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black transition-all"
          style={{
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            color: accent,
            border: `1.5px solid color-mix(in srgb, ${accent} 30%, transparent)`,
          }}
        >
          <Plus size={12} />
          Add task
        </motion.button>
      )}
    </motion.div>
  );
}

export function TaskBoardView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  onViewDetails,
  onAddTask,
  formatDueDate,
  isOverdue,
  getRecurrenceLabel,
  highlightedTaskId,
}: TaskBoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  // Separate menu state for mobile and desktop so CSS-hidden cards
  // don't both fire their portals when the same task ID matches.
  const [mobileMenuOpenId, setMobileMenuOpenId] = useState<string | null>(null);
  const [desktopMenuOpenId, setDesktopMenuOpenId] = useState<string | null>(null);
  const [pages, setPages] = useState<Record<TaskStatus, number>>({ TODO: 1, IN_PROGRESS: 1, DONE: 1, CANCELLED: 1 });
  const [mobileTab, setMobileTab] = useState<TaskStatus>('TODO');

  const grouped = useMemo(
    () => columns.map((col) => ({ ...col, tasks: tasks.filter((task) => task.status === col.status) })),
    [tasks]
  );

  const setPage = (status: TaskStatus, page: number) => setPages((prev) => ({ ...prev, [status]: page }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id));

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (overId && columns.some((col) => col.status === overId)) {
      setDragOverCol(overId as TaskStatus);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingId(null);
    setDragOverCol(null);
    if (!over) return;

    const taskId = String(active.id);
    const targetColumnStatus = String(over.id) as TaskStatus;
    const task = tasks.find((item) => item.id === taskId);

    if (task && task.status !== targetColumnStatus) {
      onStatusChange(task, targetColumnStatus);
    }
  };

  return (
    <div>
      {/* ── Mobile: tab switcher + single paginated list (no horizontal scrolling, no giant stacked columns) ── */}
      <div className="lg:hidden">
        <div
          className="flex gap-1.5 rounded-2xl border p-1.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
        >
          {grouped.map((col) => {
            const ColIcon = col.icon;
            const active = mobileTab === col.status;
            return (
              <button
                key={col.status}
                type="button"
                onClick={() => setMobileTab(col.status)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all"
                style={{
                  background: active ? col.accent : 'transparent',
                  color: active ? 'white' : 'var(--color-text-muted)',
                }}
              >
                <ColIcon size={13} />
                <span className="hidden xs:inline sm:inline">{col.label}</span>
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px]"
                  style={{
                    background: active
                      ? 'rgba(255,255,255,0.25)'
                      : `color-mix(in srgb, ${col.accent} 14%, transparent)`,
                    color: active ? 'white' : col.accent,
                  }}
                >
                  {col.tasks.length}
                </span>
              </button>
            );
          })}
        </div>

        {grouped
          .filter((col) => col.status === mobileTab)
          .map((col) => {
            const totalPages = Math.max(1, Math.ceil(col.tasks.length / PAGE_SIZE));
            const page = Math.min(pages[col.status], totalPages);
            const pageTasks = col.tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            return (
              <div key={col.status} className="mt-3 flex flex-col gap-2.5">
                {pageTasks.length === 0 && (
                  <BoardColumnEmpty
                    status={col.status}
                    accent={col.accent}
                    isDragTarget={false}
                    onAddTask={onAddTask ? () => onAddTask(col.status) : undefined}
                  />
                )}

                {pageTasks.map((task) => (
                  <TaskBoardCard
                    key={task.id}
                    task={task}
                    accent={col.accent}
                    dragging={false}
                    menuOpen={mobileMenuOpenId === task.id}
                    onMenuToggle={setMobileMenuOpenId}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    onStatusChange={onStatusChange}
                    formatDueDate={formatDueDate}
                    isOverdue={isOverdue}
                    getRecurrenceLabel={getRecurrenceLabel}
                    isHighlighted={highlightedTaskId === task.id}
                  />
                ))}

                <PageControls
                  page={page}
                  totalPages={totalPages}
                  total={col.tasks.length}
                  accent={col.accent}
                  pageSize={PAGE_SIZE}
                  onChange={(p) => setPage(col.status, p)}
                />

                <MoveTasksHereBtn
                  tasks={tasks.filter((t) => t.status !== col.status)}
                  targetStatus={col.status}
                  accent={col.accent}
                  onMove={(task) => onStatusChange(task, col.status)}
                />
              </div>
            );
          })}
      </div>

      {/* ── Desktop: 3-column drag & drop board, each column capped in height with its own pagination ── */}
      <style>{`
        .board-scroll-todo::-webkit-scrollbar { width: 5px; }
        .board-scroll-todo::-webkit-scrollbar-track { background: color-mix(in srgb, var(--color-info) 10%, transparent); border-radius: 9999px; }
        .board-scroll-todo::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color-info) 50%, transparent); border-radius: 9999px; }
        .board-scroll-todo::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color-info) 75%, transparent); }

        .board-scroll-inprogress::-webkit-scrollbar { width: 5px; }
        .board-scroll-inprogress::-webkit-scrollbar-track { background: color-mix(in srgb, var(--color-warning) 10%, transparent); border-radius: 9999px; }
        .board-scroll-inprogress::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color-warning) 50%, transparent); border-radius: 9999px; }
        .board-scroll-inprogress::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color-warning) 75%, transparent); }

        .board-scroll-done::-webkit-scrollbar { width: 5px; }
        .board-scroll-done::-webkit-scrollbar-track { background: color-mix(in srgb, var(--color-success) 10%, transparent); border-radius: 9999px; }
        .board-scroll-done::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color-success) 50%, transparent); border-radius: 9999px; }
        .board-scroll-done::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color-success) 75%, transparent); }
      `}</style>
      <div className="hidden lg:block">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-5">
            {grouped.map((col) => {
              const ColumnIcon = col.icon;
              const isDragTarget = dragOverCol === col.status;
              const totalPages = Math.max(1, Math.ceil(col.tasks.length / PAGE_SIZE));
              const page = Math.min(pages[col.status], totalPages);
              const pageTasks = col.tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

              return (
                <DroppableColumn
                  key={col.status}
                  id={col.status}
                  accent={col.accent}
                  className="flex h-[calc(100vh-260px)] min-h-[480px] max-h-[720px] flex-col rounded-3xl border p-3 transition-all duration-200"
                  style={{
                    background: `linear-gradient(180deg, color-mix(in srgb, ${col.accent} 4%, var(--color-surface-raised)) 0%, var(--color-surface-raised) 100%)`,
                  }}
                >
                  <header className="shrink-0 px-1 pb-3 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            color: col.accent,
                            background: `color-mix(in srgb, ${col.accent} 12%, transparent)`,
                          }}
                        >
                          <ColumnIcon size={16} />
                        </div>
                        <h3 className="truncate text-sm font-black text-text-primary">{col.label}</h3>
                      </div>
                      <span
                        className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black"
                        style={{ color: col.accent, background: `color-mix(in srgb, ${col.accent} 12%, transparent)` }}
                      >
                        {col.tasks.length}
                      </span>
                    </div>
                  </header>

                  {/* scrollable card area — fixed column height instead of growing forever */}
                  <div
                    className={`flex flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5 ${
                      col.status === 'TODO'
                        ? 'board-scroll-todo'
                        : col.status === 'IN_PROGRESS'
                          ? 'board-scroll-inprogress'
                          : 'board-scroll-done'
                    }`}
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: `color-mix(in srgb, ${col.accent} 50%, transparent) color-mix(in srgb, ${col.accent} 10%, transparent)`,
                    }}
                  >
                    {pageTasks.length === 0 && !draggingId && (
                      <BoardColumnEmpty
                        status={col.status}
                        accent={col.accent}
                        isDragTarget={isDragTarget}
                        onAddTask={onAddTask ? () => onAddTask(col.status) : undefined}
                      />
                    )}

                    {pageTasks.map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        accent={col.accent}
                        dragging={draggingId === task.id}
                        menuOpen={desktopMenuOpenId === task.id}
                        onMenuToggle={setDesktopMenuOpenId}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewDetails={onViewDetails}
                        onStatusChange={onStatusChange}
                        formatDueDate={formatDueDate}
                        isOverdue={isOverdue}
                        getRecurrenceLabel={getRecurrenceLabel}
                        isHighlighted={highlightedTaskId === task.id}
                      />
                    ))}

                    {draggingId && pageTasks.length === 0 && (
                      <BoardColumnEmpty
                        status={col.status}
                        accent={col.accent}
                        isDragTarget={true}
                        onAddTask={undefined}
                      />
                    )}
                  </div>

                  <div className="shrink-0">
                    <PageControls
                      page={page}
                      totalPages={totalPages}
                      total={col.tasks.length}
                      accent={col.accent}
                      pageSize={PAGE_SIZE}
                      onChange={(p) => setPage(col.status, p)}
                    />

                    <MoveTasksHereBtn
                      tasks={tasks.filter((t) => t.status !== col.status)}
                      targetStatus={col.status}
                      accent={col.accent}
                      onMove={(task) => onStatusChange(task, col.status)}
                    />
                  </div>
                </DroppableColumn>
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
