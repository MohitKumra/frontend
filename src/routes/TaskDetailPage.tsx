import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FolderKanban,
  Repeat,
  Timer,
  ListChecks,
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { TaskTimeAnalysis } from '../components/tasks/TaskTimeAnalysis';
import { MediaPreview } from '../components/media/MediaPreview';
import { formatDuration, getRecurrenceLabel, isOverdue } from '../components/tasks/TaskCard';
import { useTasks, useUpdateTask } from '../features/tasks/hooks/useTasks';
import { tasksApi } from '../features/tasks/api';
import { notesApi } from '../features/notes/api';
import type { NoteDTO, TaskDTO } from '../types';

function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

export function TaskDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState<null | 'note' | 'journal'>(null);
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeNote, setTimeNote] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.getOne(id),
    enabled: !!id,
  });

  const { data: allTasks } = useTasks();
  const relatedNotes = useQuery({
    queryKey: ['notes', { taskId: id }],
    queryFn: () => notesApi.list({ taskId: id }),
    enabled: !!id,
  });

  const updateTask = useUpdateTask();

  const timeMutation = useMutation({
    mutationFn: () => tasksApi.createTimeEntry(id, {
      minutes: Number(timeMinutes),
      note: timeNote.trim() || undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      setTimeMinutes('');
      setTimeNote('');
    },
  });

  const subtaskMutation = useMutation({
    mutationFn: ({ subTaskId, completed }: { subTaskId: string; completed: boolean }) => {
      if (!task) throw new Error('Task not loaded');
      return tasksApi.updateSubTask(task.id, subTaskId, { completed });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });

  if (isLoading) return <LoadingScreen />;
  if (!task) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <p className="text-text-muted">Task not found</p>
          <Button onClick={() => navigate('/tasks')} className="mt-4">Back to Tasks</Button>
        </Card>
      </div>
    );
  }

  const statusBadgeVariant = task.status === 'DONE'
    ? 'success'
    : task.status === 'CANCELLED'
      ? 'default'
      : task.status === 'IN_PROGRESS'
        ? 'accent'
        : 'default';
  const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
  const duration = formatDuration(task.estimatedDuration);
  const overdue = isOverdue(task.dueDate, task.status);
  const project = task.project;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto flex flex-col gap-5 sm:gap-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back to tasks
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>Add Note</Button>
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>Add Journal</Button>
          <Button size="sm" onClick={() => navigate(`/focus?taskId=${task.id}`)}>Focus</Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 sm:p-6 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <PageHeader icon={<ListChecks size={20} />} title={task.title} subtitle={task.description ?? 'Task detail'} />
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant={statusBadgeVariant} size="sm">{statusLabel(task.status)}</Badge>
                    <Badge variant={task.priority === 'CRITICAL' ? 'danger' : task.priority === 'HIGH' ? 'warning' : task.priority === 'MEDIUM' ? 'info' : 'default'} size="sm">
                      {task.priority}
                    </Badge>
                    {project && (
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }}
                      >
                        <FolderKanban size={12} />
                        {project.name}
                      </button>
                    )}
                    {recurrenceLabel && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}>
                        <Repeat size={12} />
                        {recurrenceLabel}
                      </span>
                    )}
                    {overdue && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', color: 'var(--color-danger)' }}>
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {task.description && <p className="text-sm leading-relaxed text-text-secondary">{task.description}</p>}

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                <Card className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Due Date</p>
                  <p className="text-sm font-bold text-text-primary mt-1 flex items-center gap-2"><Calendar size={14} />{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Estimate</p>
                  <p className="text-sm font-bold text-text-primary mt-1 flex items-center gap-2"><Clock size={14} />{duration ?? 'Unestimated'}</p>
                </Card>
                <Card className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Attachments</p>
                  <div className="mt-2">
                    {task.attachmentUrl ? (
                      <MediaPreview attachmentUrl={task.attachmentUrl} compact />
                    ) : (
                      <p className="text-sm font-bold text-text-primary">None</p>
                    )}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Voice Note</p>
                  <div className="space-y-2 mt-1">
                    {task.voiceNoteUrl ? (
                      <MediaPreview voiceNoteUrl={task.voiceNoteUrl} compact />
                    ) : (
                      <p className="text-sm font-bold text-text-primary">None</p>
                    )}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Focus</p>
                  <p className="text-sm font-bold text-text-primary mt-1 flex items-center gap-2"><Timer size={14} />{task.completedAt ? 'Tracked' : 'Available'}</p>
                </Card>
              </div>
            </div>

            <div className="lg:w-[340px] shrink-0 space-y-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-success" />
                  <p className="text-sm font-bold">Quick Actions</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => updateTask.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })}>
                    {task.status === 'DONE' ? 'Reopen' : 'Mark Done'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>Add linked note</Button>
                  <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>Add journal entry</Button>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-accent" />
              <p className="text-sm font-bold">Subtasks</p>
            </div>
            <p className="text-xs text-text-muted">{task.subTasks?.length ?? 0} items</p>
          </div>
          <div className="space-y-2">
            {task.subTasks?.length ? task.subTasks.map((subTask) => (
              <div key={subTask.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => subtaskMutation.mutate({ subTaskId: subTask.id, completed: !subTask.completed })}
                >
                  <CheckCircle2 size={16} className={subTask.completed ? 'text-success' : 'text-text-muted'} />
                </button>
                <span className={`flex-1 text-sm ${subTask.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>{subTask.title}</span>
              </div>
            )) : <p className="text-sm text-text-muted">No subtasks yet</p>}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-warning" />
              <p className="text-sm font-bold">Time Entries</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(e.target.value)}
              type="number"
              min="1"
              placeholder="Minutes"
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            />
            <input
              value={timeNote}
              onChange={(e) => setTimeNote(e.target.value)}
              placeholder="Optional note"
              className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            />
          </div>
          <Button size="sm" disabled={!timeMinutes || timeMutation.isPending} onClick={() => timeMutation.mutate()}>
            Log time
          </Button>
          <div className="mt-4 space-y-2">
            {task.timeEntries.length ? task.timeEntries.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.minutes} min</p>
                  {item.note && <p className="text-xs text-text-muted">{item.note}</p>}
                </div>
                <p className="text-[10px] text-text-muted">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            )) : <p className="text-sm text-text-muted">No time entries yet</p>}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-success" />
              <p className="text-sm font-bold">Linked Notes & Journal</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>Note</Button>
              <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>Journal</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(relatedNotes.data?.data ?? []).map((note: NoteDTO) => (
              <div key={note.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{note.title ?? 'Untitled'}</p>
                  <Badge variant={note.isJournal ? 'warning' : 'accent'} size="sm">{note.isJournal ? 'Journal' : 'Note'}</Badge>
                </div>
                <p className="text-xs text-text-secondary line-clamp-3">{note.content}</p>
              </div>
            ))}
            {(relatedNotes.data?.data ?? []).length === 0 && (
              <p className="text-sm text-text-muted">No linked notes yet</p>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <TaskTimeAnalysis task={task as TaskDTO} />
      </motion.div>

      {noteOpen && (
        <EntryFormModal
          isOpen
          mode="create"
          defaultIsJournal={noteOpen === 'journal'}
          taskId={task.id}
          onClose={() => setNoteOpen(null)}
        />
      )}
    </motion.div>
  );
}

export default TaskDetailPage;