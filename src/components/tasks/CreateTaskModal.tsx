import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Flag,
  FolderKanban,
  Plus,
  Trash2,
  Repeat,
  ListChecks,
  ChevronDown,
  Clock,
  AlignLeft,
  Layers,
} from 'lucide-react';
import { useCreateTask } from '../../features/tasks/hooks/useTasks';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { CreateTaskRequest, Priority, CreateSubTaskRequest, TaskStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { DraggableModal } from '../ui/DraggableModal';
import { MediaAttachmentsField } from '../media/MediaAttachmentsField';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProjectId?: string | null;
  lockProject?: boolean;
  initialTitle?: string;
  initialDuration?: number | null;
}

type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

const DURATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
];

function suggestedDueDate(recurrence: RecurrenceOption): string {
  const today = new Date();
  switch (recurrence) {
    case 'daily':
      return today.toISOString().split('T')[0];
    case 'weekly':
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

export function CreateTaskModal({ isOpen, onClose, initialProjectId = null, lockProject = false, initialTitle = '', initialDuration = null }: CreateTaskModalProps) {
  const createTask = useCreateTask();
  const { data: projectsData } = useProjects();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Core fields (always visible)
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? '');

  // Extended fields (More Options)
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [voiceNoteUrl, setVoiceNoteUrl] = useState('');
  const [subTasks, setSubTasks] = useState<CreateSubTaskRequest[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const projects = projectsData?.data ?? [];

  useEffect(() => {
    if (isOpen) {
      setSelectedProjectId(initialProjectId ?? '');
      if (initialTitle) setTitle(initialTitle);
      if (initialDuration) setEstimatedDuration(initialDuration);
    }
  }, [initialProjectId, isOpen, initialTitle, initialDuration]);

  const handleRecurrenceChange = (option: RecurrenceOption) => {
    setRecurrence(option);
    if (option !== 'none' && !dueDate) {
      setDueDate(suggestedDueDate(option));
    }
  };

  const addSubTask = () => {
    if (newSubTaskTitle.trim()) {
      const nextOrder =
        subTasks.length > 0 ? Math.max(...subTasks.map((s) => s.order ?? 0)) + 1 : 0;
      setSubTasks([...subTasks, { title: newSubTaskTitle.trim(), order: nextOrder }]);
      setNewSubTaskTitle('');
    }
  };

  const removeSubTask = (index: number) =>
    setSubTasks(subTasks.filter((_, i) => i !== index));

  const resetForm = () => {
    setTitle('');
    setDueDate('');
    setPriority('MEDIUM');
    setSelectedProjectId(initialProjectId ?? '');
    setDescription('');
    setStatus('TODO');
    setRecurrence('none');
    setRecurrenceEndDate('');
    setEstimatedDuration(null);
    setCustomDuration('');
    setAttachmentUrl('');
    setVoiceNoteUrl('');
    setSubTasks([]);
    setNewSubTaskTitle('');
    setShowMore(false);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      let recurrenceRule: string | undefined;
      switch (recurrence) {
        case 'daily':     recurrenceRule = 'FREQ=DAILY;INTERVAL=1'; break;
        case 'weekly':    recurrenceRule = 'FREQ=WEEKLY;INTERVAL=1'; break;
        case 'biweekly':  recurrenceRule = 'FREQ=WEEKLY;INTERVAL=2'; break;
        case 'monthly':   recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1'; break;
        case 'quarterly': recurrenceRule = 'FREQ=MONTHLY;INTERVAL=3'; break;
      }

      const resolvedDuration =
        estimatedDuration ?? (customDuration ? parseInt(customDuration, 10) : null);

      const body: Record<string, any> = { title: title.trim(), status };
      if (description.trim()) body.description = description.trim();
      if (priority) body.priority = priority;
      if (dueDate) body.dueDate = dueDate;
      if (selectedProjectId) body.projectId = selectedProjectId;
      if (recurrenceRule) body.recurrenceRule = recurrenceRule;
      if (recurrenceEndDate) body.recurrenceEndDate = recurrenceEndDate;
      if (resolvedDuration && resolvedDuration > 0) body.estimatedDuration = resolvedDuration;
      if (attachmentUrl.trim()) body.attachmentUrl = attachmentUrl.trim();
      if (voiceNoteUrl.trim()) body.voiceNoteUrl = voiceNoteUrl.trim();
      if (subTasks.length > 0)
        body.subTasks = subTasks.map((s, i) => ({ title: s.title, order: s.order ?? i }));

      await createTask.mutateAsync(body as CreateTaskRequest);
      handleClose();
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message || error?.message || 'Unknown error';
      console.error('[CreateTask] Error:', msg, error);
      setErrorMessage(msg);
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-accent transition-all';
  const inputStyle = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  // ── Extended fields — shared between inline (desktop) and sheet (mobile) ──
  const extendedFields = (
    <div className="flex flex-col gap-4">
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
        <label
          className="block text-xs font-bold mb-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Status
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className="px-2 py-2 rounded-lg text-[10px] font-bold transition-all"
              style={
                status === value
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
        </div>
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
              background:
                estimatedDuration === null && !customDuration
                  ? 'var(--color-surface-raised)'
                  : 'var(--color-surface)',
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

      {/* Recurrence */}
      <div>
        <label
          className="flex items-center gap-1 text-xs font-bold mb-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <Repeat size={12} /> Repeat
        </label>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {(
            ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly'] as RecurrenceOption[]
          ).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleRecurrenceChange(opt)}
              className="px-2 py-2 rounded-lg text-[10px] font-bold transition-all"
              style={
                recurrence === opt
                  ? { background: 'var(--color-accent)', color: 'white' }
                  : {
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)',
                    }
              }
            >
              {opt === 'biweekly'
                ? 'Fortnightly'
                : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
        {recurrence !== 'none' && (
          <div>
            <label
              className="block text-[10px] font-semibold mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              End Date <span className="opacity-60">(optional)</span>
            </label>
            <input
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        )}
      </div>

      <MediaAttachmentsField
        attachmentUrl={attachmentUrl}
        onAttachmentUrlChange={setAttachmentUrl}
        voiceNoteUrl={voiceNoteUrl}
        onVoiceNoteUrlChange={setVoiceNoteUrl}
      />

      {/* Subtasks */}
      <div>
        <label
          className="flex items-center gap-1 text-xs font-bold mb-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <ListChecks size={12} /> Subtasks
        </label>
        <div className="space-y-1.5 mb-2">
          {subTasks.map((subTask, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[8px]"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {index + 1}
              </span>
              <span
                className="text-xs font-medium flex-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
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

      {/* Done button — only shown inside the mobile sheet */}
      {isMobile && (
        <button
          type="button"
          onClick={() => setShowMore(false)}
          className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white mt-2"
          style={{ background: 'var(--gradient-accent)' }}
        >
          Done
        </button>
      )}
    </div>
  );

  return (
    <>
      <Modal open={isOpen} onClose={handleClose} title="New Task">
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

          {/* ── Core fields ─────────────────────────────────────── */}
          {/* Title */}
          <div>
            <label
              className="block text-xs font-bold mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Task Title <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
              autoFocus={!isMobile}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Project */}
          <div>
            <label
              className="flex items-center gap-1 text-xs font-bold mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <FolderKanban size={12} /> Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={lockProject}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date + Priority side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="flex items-center gap-1 text-xs font-bold mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <Calendar size={12} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="flex items-center gap-1 text-xs font-bold mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <Flag size={12} /> Priority
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((p) => {
                  const colors: Record<Priority, string> = {
                    LOW: 'var(--color-info)',
                    MEDIUM: 'var(--color-warning)',
                    HIGH: 'var(--color-danger)',
                    CRITICAL: '#7c3aed',
                  };
                  const labels: Record<Priority, string> = {
                    LOW: 'Low',
                    MEDIUM: 'Med',
                    HIGH: 'High',
                    CRITICAL: 'Crit',
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
          </div>

          {/* ── More Options toggle ─────────────────────────────── */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-xl border transition-all w-full"
            style={{
              background: showMore
                ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                : 'var(--color-surface-raised)',
              borderColor: showMore ? 'var(--color-accent-border)' : 'var(--color-border)',
              color: showMore ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            <Layers size={13} />
            <span>More Options</span>
            {/* On desktop show a chevron; on mobile a pill badge shows active fields count */}
            {isMobile && (description || recurrence !== 'none' || estimatedDuration || attachmentUrl || voiceNoteUrl || subTasks.length > 0) ? (
              <span
                className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                {[description, recurrence !== 'none', estimatedDuration, attachmentUrl, voiceNoteUrl, subTasks.length > 0].filter(Boolean).length}
              </span>
            ) : (
              <ChevronDown
                size={13}
                className="ml-auto transition-transform duration-200"
                style={{ transform: showMore && !isMobile ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            )}
          </button>

          {/* ── Extended fields — desktop: inline; mobile: separate DraggableModal ── */}
          {!isMobile && showMore && (
            <div
              className="flex flex-col gap-4 rounded-2xl border p-4"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
              }}
            >
              {extendedFields}
            </div>
          )}

          {/* ── Submit ──────────────────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
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
              disabled={!title.trim() || createTask.isPending}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ background: 'var(--gradient-accent)' }}
            >
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mobile: More Options opens as its own draggable bottom sheet */}
      {isMobile && (
        <DraggableModal
          isOpen={showMore}
          onClose={() => setShowMore(false)}
          title="More Options"
        >
          {extendedFields}
        </DraggableModal>
      )}
    </>
  );
}
