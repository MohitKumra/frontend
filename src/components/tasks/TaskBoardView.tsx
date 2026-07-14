import { useState } from 'react';
import { Calendar, RefreshCw, MoreVertical, Edit3, Trash2, Paperclip, Circle, Clock3, CheckCircle2, Inbox } from 'lucide-react';
import { SubtaskBadge } from './SubtaskBadge';
import type { TaskDTO, TaskStatus } from '../../types';

const priorityDot: Record<TaskDTO['priority'], string> = {
  LOW: 'var(--color-info)',
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

const columns: { status: TaskStatus; label: string; accent: string; icon: typeof Circle }[] = [
  { status: 'TODO', label: 'To Do', accent: 'var(--color-info)', icon: Circle },
  { status: 'IN_PROGRESS', label: 'In Progress', accent: 'var(--color-warning)', icon: Clock3 },
  { status: 'DONE', label: 'Done', accent: 'var(--color-success)', icon: CheckCircle2 },
];

interface TaskBoardViewProps {
  tasks: TaskDTO[];
  onStatusChange: (task: TaskDTO, status: TaskStatus) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (id: string) => void;
  formatDueDate: (dateStr: string | null) => string | null;
  isOverdue: (date: string | null, status: string) => boolean;
  getRecurrenceLabel: (rule: string | null) => string | null;
}

export function TaskBoardView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  formatDueDate,
  isOverdue,
  getRecurrenceLabel,
}: TaskBoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const grouped = columns.map((col) => ({ ...col, tasks: tasks.filter((t) => t.status === col.status) }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
      {grouped.map((col) => {
        const ColumnIcon = col.icon;
        const isDragTarget = dragOverCol === col.status;

        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.status);
            }}
            onDragLeave={() => setDragOverCol((c) => (c === col.status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/task-id');
              const task = tasks.find((t) => t.id === id);
              if (task && task.status !== col.status) onStatusChange(task, col.status);
              setDraggingId(null);
              setDragOverCol(null);
            }}
            className="rounded-2xl transition-all duration-150 flex flex-col"
            style={{
              background: 'var(--color-surface-raised)',
              border: `1.5px solid ${isDragTarget ? col.accent : 'var(--color-border)'}`,
              boxShadow: isDragTarget
                ? `0 0 0 3px color-mix(in srgb, ${col.accent} 14%, transparent)`
                : '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-t-2xl"
              style={{
                background: `color-mix(in srgb, ${col.accent} 7%, var(--color-surface-raised))`,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <ColumnIcon size={15} style={{ color: col.accent }} />
                <h3 className="text-xs font-bold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                  {col.label}
                </h3>
              </div>
              <span
                className="text-[11px] font-bold min-w-[22px] text-center px-2 py-0.5 rounded-full"
                style={{
                  background: `color-mix(in srgb, ${col.accent} 16%, transparent)`,
                  color: col.accent,
                }}
              >
                {col.tasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5 p-2.5 min-h-[100px] flex-1">
              {col.tasks.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-center py-9 rounded-xl border-2 border-dashed"
                  style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                >
                  <Inbox size={18} style={{ opacity: 0.5 }} />
                  <span className="text-[11px] font-semibold">
                    {isDragTarget ? 'Drop to move here' : 'No tasks'}
                  </span>
                </div>
              )}

              {col.tasks.map((task) => {
                const dueDate = formatDueDate(task.dueDate);
                const overdue = isOverdue(task.dueDate, task.status);
                const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
                const subTotal = task.subTasks?.length ?? 0;
                const subDone = task.subTasks?.filter((s) => s.completed).length ?? 0;
                const isDone = task.status === 'DONE';

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/task-id', task.id);
                      setDraggingId(task.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className="group relative rounded-xl p-3.5 pt-4 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      opacity: draggingId === task.id ? 0.4 : 1,
                    }}
                  >
                    {/* Priority strip */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
                      style={{ background: priorityDot[task.priority] }}
                    />

                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p
                        className="text-xs font-bold leading-snug flex-1"
                        style={{
                          color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                          textDecorationLine: isDone ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </p>
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)}
                          className="p-1 rounded-md opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--color-text-muted)' }}
                          aria-label="Task actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {menuOpenId === task.id && (
                          <div
                            className="absolute right-0 top-7 w-36 rounded-lg shadow-lg z-10 py-1.5 animate-scale-in"
                            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                          >
                            <button
                              onClick={() => {
                                onEdit(task);
                                setMenuOpenId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-[11px] font-semibold flex items-center gap-2"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => {
                                onDelete(task.id);
                                setMenuOpenId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-[11px] font-semibold flex items-center gap-2"
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {task.description && (
                      <p
                        className="text-[11px] mb-2.5 leading-snug line-clamp-1"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-1.5">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-md"
                        style={{
                          color: priorityDot[task.priority],
                          background: `color-mix(in srgb, ${priorityDot[task.priority]} 12%, transparent)`,
                        }}
                      >
                        {priorityLabel[task.priority]}
                      </span>

                      {dueDate && (
                        <div
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
                          style={{
                            color: overdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
                            background: overdue
                              ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
                              : 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
                          }}
                        >
                          <Calendar size={10} />
                          {dueDate}
                        </div>
                      )}

                      {recurrenceLabel && (
                        <div
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
                          style={{ color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' }}
                        >
                          <RefreshCw size={10} />
                          {recurrenceLabel}
                        </div>
                      )}

                      {task.attachmentUrl && (
                        <a
                          href={task.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md hover:shadow-sm transition-shadow"
                          style={{ color: 'var(--color-text-secondary)', background: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)' }}
                        >
                          <Paperclip size={10} />
                          File
                        </a>
                      )}

                      {subTotal > 0 && <SubtaskBadge completed={subDone} total={subTotal} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
