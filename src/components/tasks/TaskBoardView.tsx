import { useState } from 'react';
import { Calendar, RefreshCw, MoreVertical, Edit3, Trash2, Paperclip } from 'lucide-react';
import { SubtaskBadge } from './SubtaskBadge';
import type { TaskDTO, TaskStatus } from '../../types';

const priorityDot: Record<TaskDTO['priority'], string> = {
  LOW: 'var(--color-info)',
  MEDIUM: 'var(--color-warning)',
  HIGH: 'var(--color-danger)',
};

const columns: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'TODO', label: 'To Do', accent: 'var(--color-info)' },
  { status: 'IN_PROGRESS', label: 'In Progress', accent: 'var(--color-warning)' },
  { status: 'DONE', label: 'Done', accent: 'var(--color-success)' },
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
      {grouped.map((col) => (
        <div
          key={col.status}
          onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.status); }}
          onDragLeave={() => setDragOverCol((c) => (c === col.status ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/task-id');
            const task = tasks.find((t) => t.id === id);
            if (task && task.status !== col.status) onStatusChange(task, col.status);
            setDraggingId(null);
            setDragOverCol(null);
          }}
          className="rounded-2xl transition-all duration-150"
          style={{
            background: dragOverCol === col.status
              ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface-raised))'
              : 'var(--color-surface-raised)',
            border: `1.5px dashed ${dragOverCol === col.status ? 'var(--color-accent)' : 'transparent'}`,
            padding: '4px',
          }}
        >
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
              <h3 className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{col.label}</h3>
            </div>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)', color: 'var(--color-text-secondary)' }}
            >
              {col.tasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 px-1 pb-2 min-h-[80px]">
            {col.tasks.length === 0 && (
              <div
                className="text-center text-[11px] font-semibold py-8 rounded-xl border-2 border-dashed"
                style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
              >
                Nothing here
              </div>
            )}

            {col.tasks.map((task) => {
              const dueDate = formatDueDate(task.dueDate);
              const overdue = isOverdue(task.dueDate, task.status);
              const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
              const subTotal = task.subTasks?.length ?? 0;
              const subDone = task.subTasks?.filter((s) => s.completed).length ?? 0;

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/task-id', task.id); setDraggingId(task.id); }}
                  onDragEnd={() => setDraggingId(null)}
                  className="group relative rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all duration-150"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${priorityDot[task.priority]}`,
                    opacity: draggingId === task.id ? 0.4 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p
                      className="text-xs font-bold leading-snug flex-1"
                      style={{
                        color: task.status === 'DONE' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        textDecorationLine: task.status === 'DONE' ? 'line-through' : 'none',
                      }}
                    >
                      {task.title}
                    </p>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)}
                      className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <MoreVertical size={14} />
                    </button>

                    {menuOpenId === task.id && (
                      <div
                        className="absolute right-2 top-9 w-36 rounded-lg shadow-lg z-10 py-1.5 animate-scale-in"
                        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                      >
                        <button
                          onClick={() => { onEdit(task); setMenuOpenId(null); }}
                          className="w-full px-3 py-2 text-left text-[11px] font-semibold flex items-center gap-2"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => { onDelete(task.id); setMenuOpenId(null); }}
                          className="w-full px-3 py-2 text-left text-[11px] font-semibold flex items-center gap-2"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5">
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
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
                        style={{ color: 'var(--color-text-secondary)', background: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)' }}
                      >
                        <Paperclip size={10} />
                        Attachment
                      </a>
                    )}
                    {subTotal > 0 && <SubtaskBadge completed={subDone} total={subTotal} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
