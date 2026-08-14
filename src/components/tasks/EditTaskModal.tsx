import React, { useState, useEffect } from 'react';
import { Calendar, Flag, Plus, Trash2, Repeat, ListChecks, Clock, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpdateTask } from '../../features/tasks/hooks/useTasks';
import type { TaskDTO, UpdateTaskRequest, Priority, TaskStatus, SubTaskDTO, TaskRecurrenceConfig } from '../../types';
import { Modal } from '../ui/Modal';
import { MediaAttachmentsField } from '../media/MediaAttachmentsField';
import { RecurrenceSettingsPanel, validateRecurrenceConfig } from './RecurrenceSettingsPanel';

interface EditTaskModalProps {
  isOpen: boolean;
  task: TaskDTO;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'TODO', label: 'To Do', color: 'var(--color-info)' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'var(--color-warning)' },
  { value: 'DONE', label: 'Done', color: 'var(--color-success)' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'var(--color-text-muted)' },
];

/** True if the task's existing duration matches one of the presets */
function matchesPreset(duration: number | null): boolean {
  if (duration === null) return false;
  return DURATION_OPTIONS.some((o) => o.value === duration);
}

/**
 * Reconstruct a TaskRecurrenceConfig from a stored RRULE string + task fields
 * so the panel populates correctly when editing existing recurring tasks.
 * For tasks created with the new system, the recurrenceConfig JSON will be
 * returned directly from the API (once the DTO includes it); for legacy tasks
 * we derive a best-effort config from the RRULE.
 */
function parseConfigFromTask(task: TaskDTO): TaskRecurrenceConfig | null {
  // Prefer the full config object returned by the API (new tasks)
  if (task.recurrenceConfig) return task.recurrenceConfig;

  // Legacy fallback: derive best-effort config from the RRULE string
  const rule = task.recurrenceRule;
  if (!rule) return null;

  const startsAt = task.dueDate?.split('T')[0] ?? new Date().toISOString().split('T')[0];
  const endsAt = task.recurrenceEndDate?.split('T')[0] ?? null;

  // Parse RRULE fields
  const parts = Object.fromEntries(rule.split(';').map((p) => p.split('=')));
  const freq = parts['FREQ'] ?? 'DAILY';
  const interval = parseInt(parts['INTERVAL'] ?? '1', 10);

  const base: TaskRecurrenceConfig = {
    enabled: true,
    frequency: freq === 'DAILY' ? 'day' : freq === 'WEEKLY' ? 'week' : freq === 'MONTHLY' ? 'month' : 'year',
    interval: isNaN(interval) ? 1 : interval,
    startsAt,
    endsType: endsAt ? 'date' : parts['COUNT'] ? 'occurrences' : 'never',
    endsAt,
    occurrenceCount: parts['COUNT'] ? parseInt(parts['COUNT'], 10) : null,
    repeatBasedOn: 'dueDate',
    missedBehavior: 'skip',
    generateNext: 'onCompletion',
  };

  if ((freq === 'WEEKLY' || freq === 'DAILY') && parts['BYDAY']) {
    const dayMap: Record<string, string> = {
      MO: 'monday',
      TU: 'tuesday',
      WE: 'wednesday',
      TH: 'thursday',
      FR: 'friday',
      SA: 'saturday',
      SU: 'sunday',
    };
    base.weekdays = parts['BYDAY'].split(',').map((d: string) => dayMap[d] ?? d.toLowerCase());
  }

  if (freq === 'MONTHLY') {
    if (parts['BYDAY'] && parts['BYSETPOS']) {
      const dayMap: Record<string, string> = {
        MO: 'monday',
        TU: 'tuesday',
        WE: 'wednesday',
        TH: 'thursday',
        FR: 'friday',
        SA: 'saturday',
        SU: 'sunday',
      };
      base.monthlyMode = 'weekdayPattern';
      base.weekday = dayMap[parts['BYDAY']] ?? parts['BYDAY'].toLowerCase();
      base.weekOfMonth = parseInt(parts['BYSETPOS'], 10);
    } else {
      base.monthlyMode = 'dayOfMonth';
      base.dayOfMonth = parts['BYMONTHDAY']
        ? parseInt(parts['BYMONTHDAY'], 10)
        : new Date(startsAt + 'T00:00:00').getDate();
    }
  }

  return base;
}

export function EditTaskModal({ isOpen, task, onClose }: EditTaskModalProps) {
  const updateTask = useUpdateTask();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [recurrenceConfig, setRecurrenceConfig] = useState<TaskRecurrenceConfig | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  const [subTasks, setSubTasks] = useState<(SubTaskDTO | { title: string; order: number; completed?: boolean })[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  // Populate form from task on open
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate?.split('T')[0] ?? '');
    setDueTime(task.dueTime ?? '');
    setReminderTime(task.reminderTime ?? '');
    setReminderMessage(task.reminderMessage ?? '');
    setRecurrenceConfig(parseConfigFromTask(task));
    setAttachmentUrl(task.attachmentUrl ?? '');
    setVoiceNoteUrl(task.voiceNoteUrl ?? '');
    setSubTasks(task.subTasks ?? []);
    setNewSubTaskTitle('');
    setErrorMessage(null);

    if (task.estimatedDuration) {
      if (matchesPreset(task.estimatedDuration)) {
        setEstimatedDuration(task.estimatedDuration);
        setCustomDuration('');
      } else {
        setEstimatedDuration(null);
        setCustomDuration(String(task.estimatedDuration));
      }
    } else {
      setEstimatedDuration(null);
      setCustomDuration('');
    }
  }, [task]);

  const addSubTask = () => {
    if (newSubTaskTitle.trim()) {
      const nextOrder = subTasks.length > 0 ? Math.max(...subTasks.map((s) => ('order' in s ? s.order : 0))) + 1 : 0;
      setSubTasks([...subTasks, { title: newSubTaskTitle.trim(), order: nextOrder }]);
      setNewSubTaskTitle('');
    }
  };

  const removeSubTask = (index: number) => setSubTasks(subTasks.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rcError = validateRecurrenceConfig(recurrenceConfig);
    if (rcError) {
      setErrorMessage(rcError);
      return;
    }

    try {
      const resolvedDuration = estimatedDuration ?? (customDuration ? parseInt(customDuration, 10) : null);

      const data: UpdateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        reminderTime: reminderTime || null,
        reminderMessage: reminderMessage.trim() || null,
        // Send null to clear recurrence when panel is set to None
        recurrenceConfig: recurrenceConfig ?? null,
        // Clear old plain-text rule when config is null (user turned off recurrence)
        recurrenceRule: recurrenceConfig ? undefined : null,
        recurrenceEndDate: recurrenceConfig?.endsType === 'date' ? (recurrenceConfig.endsAt ?? null) : null,
        attachmentUrl: attachmentUrl.trim() || null,
        voiceNoteUrl: voiceNoteUrl.trim() || null,
        estimatedDuration: resolvedDuration && resolvedDuration > 0 ? resolvedDuration : null,
        subTasks: subTasks.map((st, index) => ({
          id: 'id' in st ? st.id : undefined,
          title: st.title,
          completed: 'completed' in st ? st.completed : false,
          order: 'order' in st ? st.order : index,
        })),
      };

      await updateTask.mutateAsync({ id: task.id, data });
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || (error as Error).message || 'Failed to update task';
      console.error('Failed to update task:', msg, error);
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-accent transition-all';
  const inputStyle = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Edit Task">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMessage && (
          <div
            className="px-4 py-3 rounded-xl text-xs font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger)',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            Task Title <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label
            className="flex items-center gap-1 text-xs font-bold mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <AlignLeft size={12} /> Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, context, or notes..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-accent transition-all resize-none"
            style={inputStyle}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            Status
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {STATUS_OPTIONS.map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className="px-2 py-2 rounded-lg text-[10px] font-bold transition-all"
                style={
                  status === value
                    ? { background: color, color: 'white' }
                    : {
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label
            className="flex items-center gap-1 text-xs font-bold mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Flag size={12} /> Priority
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((p) => {
              const colors: Record<Priority, string> = {
                LOW: 'var(--color-info)',
                MEDIUM: 'var(--color-warning)',
                HIGH: 'var(--color-danger)',
                CRITICAL: '#7c3aed',
              };
              const labels: Record<Priority, string> = {
                LOW: 'Low',
                MEDIUM: 'Medium',
                HIGH: 'High',
                CRITICAL: 'Critical',
              };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className="px-2 py-2 rounded-lg text-[10px] font-bold transition-all"
                  style={
                    priority === p
                      ? { background: colors[p], color: 'white' }
                      : {
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-muted)',
                        }
                  }
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule */}
        <div
          className="rounded-2xl border p-4 flex flex-col gap-3"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          <label className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Calendar size={12} /> Schedule
          </label>

          <div>
            <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
            <label
              className="flex items-center gap-1 text-[10px] font-semibold mt-2 mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Clock size={11} /> Due Time <span className="opacity-60">(optional)</span>
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* ── Recurrence panel ──────────────────────────────── */}
          <div>
            <label
              className="flex items-center gap-1 text-[10px] font-semibold mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Repeat size={11} /> Repeat
            </label>
            <RecurrenceSettingsPanel
              value={recurrenceConfig}
              onChange={setRecurrenceConfig}
              startsAtHint={dueDate || undefined}
            />
          </div>
        </div>

        {/* Reminder */}
        <div
          className="rounded-2xl border p-4 flex flex-col gap-3"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          <label className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Clock size={12} /> Reminder
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Reminder Time <span className="opacity-60">(optional)</span>
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Reminder Message <span className="opacity-60">(optional)</span>
              </label>
              <input
                type="text"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="This will be the notification title"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Leave reminder time blank and we'll automatically use 30 minutes before the due time.
          </p>
        </div>

        {/* Estimated Duration */}
        <div>
          <label
            className="flex items-center gap-1 text-xs font-bold mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Clock size={12} /> Estimated Duration
          </label>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {DURATION_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setEstimatedDuration(estimatedDuration === value ? null : value);
                  setCustomDuration('');
                }}
                className="px-2 py-2 rounded-lg text-[10px] font-bold transition-all"
                style={
                  estimatedDuration === value
                    ? { background: 'var(--color-accent)', color: 'white' }
                    : {
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }
                }
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEstimatedDuration(null)}
              className="px-2 py-2 rounded-lg text-[10px] font-bold transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              Custom
            </button>
          </div>
          {estimatedDuration === null && (
            <input
              type="number"
              min={1}
              max={480}
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="Enter minutes (e.g. 45)"
              className={inputCls}
              style={inputStyle}
            />
          )}
        </div>

        <MediaAttachmentsField
          attachmentUrl={attachmentUrl}
          onAttachmentUrlChange={setAttachmentUrl}
          voiceNoteUrl={voiceNoteUrl}
          onVoiceNoteUrlChange={setVoiceNoteUrl}
        />

        {/* Subtasks */}
        <div
          className="rounded-2xl border p-4"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          <label
            className="flex items-center gap-1 text-xs font-bold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <ListChecks size={12} /> Subtasks
          </label>
          <div className="space-y-1.5 mb-2">
            {subTasks.map((subTask, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <span
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[8px]"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  {index + 1}
                </span>
                <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  {subTask.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubTask(index)}
                  className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubTaskTitle}
              onChange={(e) => setNewSubTaskTitle(e.target.value)}
              placeholder="Add a subtask"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSubTask();
                }
              }}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={addSubTask}
              disabled={!newSubTaskTitle.trim()}
              className="px-3 py-2 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-40"
              style={{ background: 'var(--color-accent)' }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold border transition-all"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || updateTask.isPending || !!validateRecurrenceConfig(recurrenceConfig)}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ background: 'var(--gradient-accent)' }}
          >
            {updateTask.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
