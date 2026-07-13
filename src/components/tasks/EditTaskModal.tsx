import React, { useState, useEffect } from 'react';
import { Calendar, Flag, Plus, Trash2, Repeat, ListChecks, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpdateTask } from '../../features/tasks/hooks/useTasks';
import type { TaskDTO, UpdateTaskRequest, Priority, TaskStatus, SubTaskDTO } from '../../types';
import { Modal } from '../ui/Modal';

interface EditTaskModalProps {
  isOpen: boolean;
  task: TaskDTO;
  onClose: () => void;
}

type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

/** Maps recurrence to an auto-suggested due date offset from today. */
function suggestedDueDate(recurrence: RecurrenceOption): string {
  const today = new Date();
  switch (recurrence) {
    case 'daily':
      return today.toISOString().split('T')[0];
    case 'weekly': {
      const day = today.getDay();
      const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
      const next = new Date(today);
      next.setDate(today.getDate() + daysUntilMonday);
      return next.toISOString().split('T')[0];
    }
    case 'biweekly': {
      const day = today.getDay();
      const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
      const next = new Date(today);
      next.setDate(today.getDate() + daysUntilMonday);
      return next.toISOString().split('T')[0];
    }
    case 'monthly': {
      const next = new Date(today);
      next.setMonth(today.getMonth() + 1);
      return next.toISOString().split('T')[0];
    }
    case 'quarterly': {
      const next = new Date(today);
      next.setMonth(today.getMonth() + 3);
      return next.toISOString().split('T')[0];
    }
    default:
      return '';
  }
}

export function EditTaskModal({ isOpen, task, onClose }: EditTaskModalProps) {
  const updateTask = useUpdateTask();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateTaskRequest>({
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.split('T')[0] ?? '',
    recurrenceEndDate: task.recurrenceEndDate?.split('T')[0] ?? '',
    skipDates: task.skipDates ?? [],
    attachmentUrl: task.attachmentUrl ?? '',
  });
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('none');
  const [subTasks, setSubTasks] = useState<(SubTaskDTO | { title: string; order: number })[]>(task.subTasks ?? []);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  // Parse recurrence rule on task change
  useEffect(() => {
    if (task.recurrenceRule) {
      if (task.recurrenceRule.includes('DAILY;INTERVAL=1')) setRecurrence('daily');
      else if (task.recurrenceRule.includes('WEEKLY;INTERVAL=1')) setRecurrence('weekly');
      else if (task.recurrenceRule.includes('WEEKLY;INTERVAL=2')) setRecurrence('biweekly');
      else if (task.recurrenceRule.includes('MONTHLY;INTERVAL=1')) setRecurrence('monthly');
      else if (task.recurrenceRule.includes('MONTHLY;INTERVAL=3')) setRecurrence('quarterly');
    } else {
      setRecurrence('none');
    }
    setSubTasks(task.subTasks ?? []);
  }, [task]);

  const handleRecurrenceChange = (option: RecurrenceOption) => {
    setRecurrence(option);
    if (option !== 'none' && !formData.dueDate) {
      setFormData((prev) => ({ ...prev, dueDate: suggestedDueDate(option) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setErrorMessage(null);
      let recurrenceRule: string | null | undefined;
      switch (recurrence) {
        case 'daily':
          recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
          break;
        case 'weekly':
          recurrenceRule = 'FREQ=WEEKLY;INTERVAL=1';
          break;
        case 'biweekly':
          recurrenceRule = 'FREQ=WEEKLY;INTERVAL=2';
          break;
        case 'monthly':
          recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1';
          break;
        case 'quarterly':
          recurrenceRule = 'FREQ=MONTHLY;INTERVAL=3';
          break;
        default:
          recurrenceRule = null;
      }

      // Strip empty strings to avoid Zod validation failures
      const cleanData = { ...formData };
      if (cleanData.dueDate === '') delete cleanData.dueDate;
      if (!cleanData.description) delete cleanData.description;
      if (cleanData.attachmentUrl !== undefined) {
        const attachmentUrl = typeof cleanData.attachmentUrl === 'string'
          ? cleanData.attachmentUrl.trim()
          : '';
        cleanData.attachmentUrl = attachmentUrl ? attachmentUrl : null;
      }

      await updateTask.mutateAsync({
        id: task.id,
        data: {
          ...cleanData,
          recurrenceRule,
          subTasks: subTasks.map((st, index) => ({
            id: 'id' in st ? st.id : undefined,
            title: st.title,
            completed: 'completed' in st ? st.completed : false,
            order: 'order' in st ? (st as SubTaskDTO).order : index,
          })),
        },
      });
      onClose();
    } catch (error) {
      const msg = (error as any)?.response?.data?.error?.message || (error as Error).message || 'Failed to update task';
      console.error('Failed to update task:', msg, error);
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const addSubTask = () => {
    if (newSubTaskTitle.trim()) {
      const nextOrder = subTasks.length > 0
        ? Math.max(...subTasks.map((subTask) => ('order' in subTask ? subTask.order : 0))) + 1
        : 0;
      setSubTasks([...subTasks, { title: newSubTaskTitle.trim(), order: nextOrder }]);
      setNewSubTaskTitle('');
    }
  };

  const removeSubTask = (index: number) => {
    setSubTasks(subTasks.filter((_, i) => i !== index));
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Edit Task">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Task Title */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">
            Task Title <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title"
            required
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">Description</label>
          <textarea
            value={formData.description ?? ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter task description (optional)"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all resize-none"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">
            <Flag size={14} className="inline mr-1" />
            Priority
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setFormData({ ...formData, priority })}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  formData.priority === priority
                    ? 'text-white shadow-sm'
                    : 'text-text-muted border hover:border-accent'
                }`}
                style={
                  formData.priority === priority
                    ? {
                        background:
                          priority === 'LOW'
                            ? 'var(--color-info)'
                            : priority === 'MEDIUM'
                            ? 'var(--color-warning)'
                            : 'var(--color-danger)',
                      }
                    : {
                        background: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                      }
                }
              >
                {priority === 'LOW' ? '📋 Low' : priority === 'MEDIUM' ? '📌 Medium' : '🚩 High'}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Section */}
        <div
          className="rounded-2xl p-4 border"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          <label className="block text-xs font-bold text-text-primary mb-3">
            <Calendar size={14} className="inline mr-1" />
            Schedule
          </label>

          {/* Due Date */}
          <div className="mb-3">
            <label className="block text-[10px] font-semibold text-text-muted mb-1.5">Due Date</label>
            <input
              type="date"
              value={formData.dueDate ?? ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-[10px] font-semibold text-text-muted mb-1.5">
              <Repeat size={12} className="inline mr-1" />
              Repeat
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly'] as RecurrenceOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleRecurrenceChange(option)}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    recurrence === option
                      ? 'text-white shadow-sm'
                      : 'text-text-muted border hover:border-accent'
                  }`}
                  style={
                    recurrence === option
                      ? { background: 'var(--color-accent)' }
                      : {
                          background: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                        }
                  }
                >
                  {option === 'biweekly' ? 'Fortnightly' : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            {recurrence !== 'none' && (
              <div>
                <label className="block text-[10px] font-semibold text-text-muted mb-1.5">
                  End Date <span className="opacity-60">(optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.recurrenceEndDate ?? ''}
                  onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Attachment */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">
            <Paperclip size={14} className="inline mr-1" />
            Attachment URL
          </label>
          <input
            type="url"
            value={formData.attachmentUrl ?? ''}
            onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <p className="text-[10px] font-medium mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Optional link to a file, document, or attachment.
          </p>
        </div>

        {/* Subtasks */}
        <div
          className="rounded-2xl p-4 border"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          <label className="block text-xs font-bold text-text-primary mb-3">
            <ListChecks size={14} className="inline mr-1" />
            Subtasks
          </label>
          <div className="space-y-2">
            {subTasks.map((subTask, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-[8px] text-text-muted">{index + 1}</span>
                </span>
                <span className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  {subTask.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubTask(index)}
                  className="p-1 rounded-lg hover:bg-danger/10 transition-colors"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
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
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                type="button"
                onClick={addSubTask}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md"
                style={{ background: 'var(--color-accent)' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            className="p-3 rounded-xl text-xs font-bold border"
            style={{
              background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.title || updateTask.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--gradient-accent)' }}
          >
            {updateTask.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
