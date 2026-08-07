import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Flag, FolderKanban, Plus, Trash2, Repeat,
  ListChecks, Clock, AlignLeft, Wand2, CheckSquare,
  Bell, Layers, ArrowRight, Target,
} from 'lucide-react';
import { useCreateTask } from '../../features/tasks/hooks/useTasks';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { useGoals } from '../../features/goals/hooks/useGoals';
import { NaturalTaskInput } from './NaturalTaskInput';
import { MediaAttachmentsField } from '../media/MediaAttachmentsField';
import type {
  CreateTaskRequest, Priority, CreateSubTaskRequest,
  TaskRecurrenceConfig, TaskStatus,
} from '../../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProjectId?: string | null;
  lockProject?: boolean;
  initialTitle?: string;
  initialDuration?: number | null;
  initialGoalId?: string | null;
}

type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

const DURATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '2 hrs',  value: 120 },
  { label: '4 hrs',  value: 240 },
];

const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  'none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly',
];

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  LOW:      { label: 'Low',      color: 'var(--color-info)' },
  MEDIUM:   { label: 'Medium',   color: 'var(--color-warning)' },
  HIGH:     { label: 'High',     color: 'var(--color-danger)' },
  CRITICAL: { label: 'Critical', color: '#7c3aed' },
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function suggestedDueDate(recurrence: RecurrenceOption): string {
  const today = new Date();
  if (recurrence === 'daily') return today.toISOString().split('T')[0];
  if (recurrence === 'weekly' || recurrence === 'biweekly') {
    const day = today.getDay();
    const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    const next = new Date(today); next.setDate(today.getDate() + diff);
    return next.toISOString().split('T')[0];
  }
  if (recurrence === 'monthly') {
    const next = new Date(today); next.setMonth(today.getMonth() + 1);
    return next.toISOString().split('T')[0];
  }
  if (recurrence === 'quarterly') {
    const next = new Date(today); next.setMonth(today.getMonth() + 3);
    return next.toISOString().split('T')[0];
  }
  return '';
}

function buildRecurrenceConfig(
  recurrence: RecurrenceOption, dueDate: string, recurrenceEndDate: string,
): TaskRecurrenceConfig | null {
  if (recurrence === 'none') return null;
  const start = dueDate || new Date().toISOString().split('T')[0];
  const interval = recurrence === 'biweekly' ? 2 : recurrence === 'quarterly' ? 3 : 1;
  const frequency = recurrence === 'daily' ? 'day'
    : (recurrence === 'weekly' || recurrence === 'biweekly') ? 'week' : 'month';
  const weekday = new Date(`${start}T00:00:00`)
    .toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return {
    enabled: true, frequency, interval,
    weekdays: frequency === 'week' ? [weekday] : undefined,
    monthlyMode: frequency === 'month' ? 'dayOfMonth' : undefined,
    dayOfMonth: frequency === 'month' ? Number(start.slice(8, 10)) : undefined,
    startsAt: start,
    endsType: recurrenceEndDate ? 'date' : 'never',
    endsAt: recurrenceEndDate || null,
    occurrenceCount: null, repeatBasedOn: 'dueDate',
    missedBehavior: 'skip', generateNext: 'onCompletion',
  };
}

// ── design primitives ─────────────────────────────────────────────────────────
const iStyle: React.CSSProperties = {
  background: 'var(--color-surface-raised)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
};
const iCls = 'w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-all';

function FieldLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{children}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  );
}

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-4 sm:p-5 flex flex-col gap-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl shrink-0"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)' }}>
          {icon}
        </span>
        <span className="text-xs font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-text-muted)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── chip toggle button ────────────────────────────────────────────────────────
function Chip({
  active, color, onClick, children,
}: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-95"
      style={active
        ? { background: color ?? 'var(--color-accent)', color: 'white', boxShadow: `0 3px 10px ${color ?? 'var(--color-accent)'}44` }
        : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
      {children}
    </button>
  );
}

// ── main export ───────────────────────────────────────────────────────────────
export function CreateTaskModal({
  isOpen, onClose,
  initialProjectId = null, lockProject = false,
  initialTitle = '', initialDuration = null,
  initialGoalId = null,
}: CreateTaskModalProps) {
  const createTask = useCreateTask();
  const { data: projectsData } = useProjects();
  const goalsQuery = useGoals();
  const titleRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // fields
  const [title,             setTitle]             = useState('');
  const [dueDate,           setDueDate]           = useState('');
  const [dueTime,           setDueTime]           = useState('');
  const [priority,          setPriority]          = useState<Priority>('MEDIUM');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? '');
  const [selectedGoalId,    setSelectedGoalId]    = useState(initialGoalId ?? '');
  const [description,       setDescription]       = useState('');
  const [reminderTime,      setReminderTime]      = useState('');
  const [reminderMessage,   setReminderMessage]   = useState('');
  const [status,            setStatus]            = useState<TaskStatus>('TODO');
  const [recurrence,        setRecurrence]        = useState<RecurrenceOption>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [customDuration,    setCustomDuration]    = useState('');
  const [attachmentUrl,     setAttachmentUrl]     = useState('');
  const [voiceNoteUrl,      setVoiceNoteUrl]      = useState('');
  const [subTasks,          setSubTasks]          = useState<CreateSubTaskRequest[]>([]);
  const [newSubTaskTitle,   setNewSubTaskTitle]   = useState('');

  const projects = projectsData?.data ?? [];
  const goals = goalsQuery.data?.data ?? [];

  useEffect(() => {
    if (isOpen) {
      setSelectedProjectId(initialProjectId ?? '');
      setSelectedGoalId(initialGoalId ?? '');
      if (initialTitle)    setTitle(initialTitle);
      if (initialDuration) setEstimatedDuration(initialDuration);
      // Only auto-focus on non-touch devices; on mobile it would
      // immediately pop the virtual keyboard before the user is ready.
      const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      if (!isTouchDevice) {
        setTimeout(() => titleRef.current?.focus(), 140);
      }
    }
  }, [initialProjectId, initialGoalId, isOpen, initialTitle, initialDuration]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleRecurrenceChange = (opt: RecurrenceOption) => {
    setRecurrence(opt);
    if (opt !== 'none' && !dueDate) setDueDate(suggestedDueDate(opt));
  };

  const addSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    const order = subTasks.length > 0 ? Math.max(...subTasks.map((s) => s.order ?? 0)) + 1 : 0;
    setSubTasks([...subTasks, { title: newSubTaskTitle.trim(), order }]);
    setNewSubTaskTitle('');
  };

  const resetForm = () => {
    setTitle(''); setDueDate(''); setDueTime(''); setPriority('MEDIUM');
    setSelectedProjectId(initialProjectId ?? ''); setSelectedGoalId(initialGoalId ?? '');
    setDescription('');
    setReminderTime(''); setReminderMessage(''); setStatus('TODO');
    setRecurrence('none'); setRecurrenceEndDate(''); setEstimatedDuration(null);
    setCustomDuration(''); setAttachmentUrl(''); setVoiceNoteUrl('');
    setSubTasks([]); setNewSubTaskTitle(''); setErrorMessage(null);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMessage(null);
    if (!title.trim()) return;
    try {
      let recurrenceRule: string | undefined;
      if (recurrence === 'daily')     recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
      if (recurrence === 'weekly')    recurrenceRule = 'FREQ=WEEKLY;INTERVAL=1';
      if (recurrence === 'biweekly')  recurrenceRule = 'FREQ=WEEKLY;INTERVAL=2';
      if (recurrence === 'monthly')   recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1';
      if (recurrence === 'quarterly') recurrenceRule = 'FREQ=MONTHLY;INTERVAL=3';

      const resolvedDuration = estimatedDuration ?? (customDuration ? parseInt(customDuration, 10) : null);
      const body: Record<string, unknown> = { title: title.trim(), status };
      if (description.trim())     body.description      = description.trim();
      if (priority)               body.priority         = priority;
      if (dueDate)                body.dueDate          = dueDate;
      if (dueTime)                body.dueTime          = dueTime;
      if (reminderTime)           body.reminderTime     = reminderTime;
      if (reminderMessage.trim()) body.reminderMessage  = reminderMessage.trim();
      if (selectedProjectId)      body.projectId        = selectedProjectId;
      if (selectedGoalId)         body.goalId           = selectedGoalId;
      if (recurrenceRule)         body.recurrenceRule   = recurrenceRule;
      if (recurrenceEndDate)      body.recurrenceEndDate = recurrenceEndDate;
      const rc = buildRecurrenceConfig(recurrence, dueDate, recurrenceEndDate);
      if (rc) body.recurrenceConfig = rc;
      if (resolvedDuration && resolvedDuration > 0) body.estimatedDuration = resolvedDuration;
      if (attachmentUrl.trim()) body.attachmentUrl = attachmentUrl.trim();
      if (voiceNoteUrl.trim())  body.voiceNoteUrl  = voiceNoteUrl.trim();
      if (subTasks.length > 0)  body.subTasks = subTasks.map((s, i) => ({ title: s.title, order: s.order ?? i }));
      await createTask.mutateAsync(body as unknown as CreateTaskRequest);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } }; message?: string })
        ?.response?.data?.error?.message ?? (err as { message?: string })?.message ?? 'Something went wrong';
      setErrorMessage(msg);
    }
  };

  const handleTaskParsed = (task: {
    title?: string; description?: string; priority?: Priority; dueDate?: string;
    dueTime?: string; reminderTime?: string; reminderMessage?: string;
    estimatedDuration?: number; status?: TaskStatus;
    recurrence?: RecurrenceOption; subTasks?: { title: string }[];
  }) => {
    if (task.title)             setTitle(task.title);
    if (task.description)       setDescription(task.description);
    if (task.priority)          setPriority(task.priority);
    if (task.dueDate)           setDueDate(task.dueDate);
    if (task.dueTime)           setDueTime(task.dueTime);
    if (task.reminderTime)      setReminderTime(task.reminderTime);
    if (task.reminderMessage)   setReminderMessage(task.reminderMessage);
    if (task.estimatedDuration) setEstimatedDuration(task.estimatedDuration);
    if (task.status)            setStatus(task.status);
    if (task.recurrence && task.recurrence !== 'none') {
      setRecurrence(task.recurrence);
      if (!task.dueDate) setDueDate(suggestedDueDate(task.recurrence));
    }
    if (task.subTasks?.length) setSubTasks(task.subTasks.map((s, i) => ({ title: s.title, order: i })));
  };

  const advancedCount = [
    description, reminderTime, reminderMessage, recurrence !== 'none',
    estimatedDuration, attachmentUrl, voiceNoteUrl, subTasks.length > 0,
  ].filter(Boolean).length;

  // ── render ───────────────────────────────────────────────────────────────
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div key="ctm-bd"
            className="fixed inset-0 z-[90]"
            style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Panel — slides down from top, single centred column */}
          <motion.div key="ctm-panel"
            className="fixed inset-x-0 top-0 z-[91] flex flex-col"
            style={{ height: '100dvh', background: 'var(--color-bg)' }}
            initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 1 }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 border-b px-4 sm:px-6 py-4 shrink-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), #818CF8)', color: 'white' }}>
                  <CheckSquare size={17} />
                </div>
                <div>
                  <p className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>New Task</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Fill in the details or use AI to build instantly</p>
                </div>
              </div>
              <button type="button" onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border transition-all hover:opacity-70"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)' }}>
                <X size={17} />
              </button>
            </div>

            {/* Scrollable body — single centred column, capped at 720px */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[720px] flex flex-col gap-4 px-4 sm:px-6 py-6">

                {/* Error */}
                {errorMessage && (
                  <div className="rounded-2xl px-4 py-3 text-sm font-semibold"
                    style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)' }}>
                    {errorMessage}
                  </div>
                )}

                {/* ── AI Builder ─────────────────────────────────────── */}
                <Section icon={<Wand2 size={14} />} title="AI Builder">
                  <NaturalTaskInput onTaskParsed={handleTaskParsed} />
                </Section>

                {/* ── What needs to be done ──────────────────────────── */}
                <Section icon={<CheckSquare size={14} />} title="Task Title">
                  <input ref={titleRef} type="text" value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    required className={iCls} style={iStyle} />
                </Section>

                {/* ── Description ───────────────────────────────────── */}
                <Section icon={<AlignLeft size={14} />} title="Description">
                  <textarea value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context, details or notes…"
                    rows={3}
                    className="w-full rounded-2xl border px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 transition-all"
                    style={iStyle} />
                </Section>

                {/* ── Project + Goal + Status row ─────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Section icon={<FolderKanban size={14} />} title="Project">
                    <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
                      disabled={lockProject} className={iCls} style={iStyle}>
                      <option value="">No project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </Section>

                  <Section icon={<Target size={14} />} title="Goal">
                    <select value={selectedGoalId} onChange={(e) => setSelectedGoalId(e.target.value)}
                      className={iCls} style={iStyle}>
                      <option value="">No goal</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </Section>

                  <Section icon={<CheckSquare size={14} />} title="Status">
                    <div className="grid grid-cols-2 gap-2">
                      {STATUS_OPTIONS.map(({ value, label }) => (
                        <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
                          {label}
                        </Chip>
                      ))}
                    </div>
                  </Section>
                </div>

                {/* ── Priority ───────────────────────────────────────── */}
                <Section icon={<Flag size={14} />} title="Priority">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                      <Chip key={p} active={priority === p} color={PRIORITY_META[p].color} onClick={() => setPriority(p)}>
                        {PRIORITY_META[p].label}
                      </Chip>
                    ))}
                  </div>
                </Section>

                {/* ── Due date + time ────────────────────────────────── */}
                <Section icon={<Calendar size={14} />} title="Due Date & Time">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Date</FieldLabel>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                        className={iCls} style={iStyle} />
                    </div>
                    <div>
                      <FieldLabel sub="optional">Time</FieldLabel>
                      <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                        className={iCls} style={iStyle} />
                    </div>
                  </div>
                </Section>

                {/* ── Reminder ───────────────────────────────────────── */}
                <Section icon={<Bell size={14} />} title="Reminder">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel sub="optional">Reminder time</FieldLabel>
                      <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
                        className={iCls} style={iStyle} />
                    </div>
                    <div>
                      <FieldLabel sub="becomes notification title">Message</FieldLabel>
                      <input type="text" value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)}
                        placeholder="e.g. Don't forget this!"
                        className={iCls} style={iStyle} />
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Leave time blank — we'll remind you 30 min before the due time.
                  </p>
                </Section>

                {/* ── Duration ───────────────────────────────────────── */}
                <Section icon={<Clock size={14} />} title="Estimated Duration">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DURATION_OPTIONS.map(({ label, value }) => (
                      <Chip key={value}
                        active={estimatedDuration === value}
                        onClick={() => { setEstimatedDuration(estimatedDuration === value ? null : value); setCustomDuration(''); }}>
                        {label}
                      </Chip>
                    ))}
                    <Chip active={false} onClick={() => setEstimatedDuration(null)}>Custom</Chip>
                  </div>
                  {estimatedDuration === null && (
                    <input type="number" min={1} max={480} value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="Enter minutes, e.g. 45"
                      className={iCls} style={iStyle} />
                  )}
                </Section>

                {/* ── Recurrence ─────────────────────────────────────── */}
                <Section icon={<Repeat size={14} />} title="Repeat">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <Chip key={opt} active={recurrence === opt} onClick={() => handleRecurrenceChange(opt)}>
                        {opt === 'biweekly' ? 'Fortnight' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </Chip>
                    ))}
                  </div>
                  {recurrence !== 'none' && (
                    <div>
                      <FieldLabel sub="optional">End date</FieldLabel>
                      <input type="date" value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className={iCls} style={iStyle} />
                    </div>
                  )}
                </Section>

                {/* ── Subtasks ────────────────────────────────────────── */}
                <Section icon={<ListChecks size={14} />} title="Subtasks">
                  {subTasks.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {subTasks.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-2xl border px-4 py-2.5"
                          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                            style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{i + 1}</span>
                          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.title}</span>
                          <button type="button" onClick={() => setSubTasks(subTasks.filter((_, j) => j !== i))}
                            className="rounded-xl p-1.5 transition-opacity hover:opacity-60" style={{ color: 'var(--color-danger)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={newSubTaskTitle}
                      onChange={(e) => setNewSubTaskTitle(e.target.value)}
                      placeholder="Add a subtask…"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubTask(); } }}
                      className={`flex-1 ${iCls}`} style={iStyle} />
                    <button type="button" onClick={addSubTask} disabled={!newSubTaskTitle.trim()}
                      className="rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-40"
                      style={{ background: 'var(--color-accent)' }}>
                      <Plus size={15} />
                    </button>
                  </div>
                </Section>

                {/* ── Attachments ─────────────────────────────────────── */}
                <Section icon={<Layers size={14} />} title="Attachments">
                  <MediaAttachmentsField
                    attachmentUrl={attachmentUrl} onAttachmentUrlChange={setAttachmentUrl}
                    voiceNoteUrl={voiceNoteUrl}   onVoiceNoteUrlChange={setVoiceNoteUrl}
                  />
                </Section>

                {/* bottom padding so footer doesn't clip last section */}
                <div className="h-4" />
              </div>
            </form>

            {/* Sticky footer */}
            <div className="flex items-center justify-between gap-3 border-t px-4 sm:px-6 py-4 shrink-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>

              {/* Live summary chips */}
              <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                {title.trim() && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold max-w-[180px] truncate"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface-raised)' }}>
                    <CheckSquare size={11} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                    {title.trim()}
                  </span>
                )}
                {priority !== 'MEDIUM' && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold shrink-0"
                    style={{ borderColor: `${PRIORITY_META[priority].color}33`, color: PRIORITY_META[priority].color, background: `${PRIORITY_META[priority].color}12` }}>
                    <Flag size={11} /> {PRIORITY_META[priority].label}
                  </span>
                )}
                {dueDate && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold shrink-0"
                    style={{ borderColor: 'color-mix(in srgb, var(--color-info) 25%, transparent)', color: 'var(--color-info)', background: 'color-mix(in srgb, var(--color-info) 10%, transparent)' }}>
                    <Calendar size={11} /> {dueDate}
                  </span>
                )}
                {advancedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold shrink-0"
                    style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)', color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' }}>
                    <Layers size={11} /> {advancedCount} extra
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={handleClose}
                  className="rounded-2xl border px-5 py-2.5 text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" form=""
                  onClick={handleSubmit}
                  disabled={!title.trim() || createTask.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent), #818CF8)',
                    boxShadow: title.trim() ? '0 4px 16px color-mix(in srgb, var(--color-accent) 30%, transparent)' : 'none',
                  }}>
                  {createTask.isPending ? 'Creating…' : <><span>Create Task</span><ArrowRight size={15} /></>}
                </button>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
