import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FolderKanban,
  MessageSquare,
  Paperclip,
  Plus,
  Repeat,
  Timer,
  UserRoundPen,
  ListChecks,
  Link2,
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { TaskTimeAnalysis } from '../components/tasks/TaskTimeAnalysis';
import { formatDuration, getRecurrenceLabel, isOverdue } from '../components/tasks/TaskCard';
import { useTasks, useUpdateTask } from '../features/tasks/hooks/useTasks';
import { tasksApi } from '../features/tasks/api';
import { notesApi } from '../features/notes/api';
import apiClient from '../lib/apiClient';
import type { NoteDTO, TaskDetailDTO, TaskDTO, TaskDependencyType } from '../types';

function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

export function TaskDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState<null | 'note' | 'journal'>(null);
  const [comment, setComment] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeNote, setTimeNote] = useState('');
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<TaskDependencyType>('FINISH_TO_START');

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

  const commentMutation = useMutation({
    mutationFn: (content: string) => tasksApi.createComment(id, { content }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ]);
      setComment('');
    },
  });

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

  const dependencyMutation = useMutation({
    mutationFn: () => tasksApi.createDependency(id, {
      dependsOnTaskId: dependencyTaskId,
      type: dependencyType,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      setDependencyTaskId('');
      setDependencyType('FINISH_TO_START');
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

  const taskList = useMemo(() => (allTasks?.data ?? []).filter((t) => t.id !== id), [allTasks, id]);

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
    : task.status === 'BLOCKED'
      ? 'danger'
      : task.status === 'WAITING'
        ? 'warning'
        : task.status === 'IN_REVIEW'
          ? 'info'
          : task.status === 'DELEGATED'
            ? 'accent'
            : 'default';
  const recurrenceLabel = getRecurrenceLabel(task.recurrenceRule);
  const duration = formatDuration(task.estimatedDuration);
  const overdue = isOverdue(task.dueDate, task.status);
  const project = task.project;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-5 sm:gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
      </div>

      <Card className="p-5 sm:p-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white" style={{ background: 'var(--gradient-accent)' }}>
                <ListChecks size={24} />
              </div>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <p className="text-sm font-bold text-text-primary mt-1 flex items-center gap-2"><Paperclip size={14} />{task.attachmentUrl ? 'Linked' : 'None'}</p>
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

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserRoundPen size={16} className="text-accent" />
                <p className="text-sm font-bold">Add Comment</p>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add context or an update..."
                rows={4}
                className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              />
              <Button size="sm" className="mt-3" disabled={!comment.trim() || commentMutation.isPending} onClick={() => commentMutation.mutate(comment)}>
                Add Comment
              </Button>
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-success" />
              <p className="text-sm font-bold">Dependencies</p>
            </div>
            <p className="text-xs text-text-muted">{task.dependencies.length} linked</p>
          </div>
          <div className="flex flex-col gap-2">
            <select
              value={dependencyTaskId}
              onChange={(e) => setDependencyTaskId(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <option value="">Select a task</option>
              {taskList.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <select
              value={dependencyType}
              onChange={(e) => setDependencyType(e.target.value as TaskDependencyType)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <option value="FINISH_TO_START">Finish to Start</option>
              <option value="START_TO_START">Start to Start</option>
              <option value="FINISH_TO_FINISH">Finish to Finish</option>
            </select>
            <Button size="sm" disabled={!dependencyTaskId || dependencyMutation.isPending} onClick={() => dependencyMutation.mutate()}>
              Add dependency
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {task.dependencies.length ? task.dependencies.map((dependency) => (
              <div key={dependency.id} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{dependency.dependsOnTask?.title ?? dependency.dependsOnTaskId}</p>
                  <p className="text-xs text-text-muted">{dependency.type.replaceAll('_', ' ')}</p>
                </div>
                <button type="button" className="text-xs font-bold text-danger" onClick={() => tasksApi.deleteDependency(task.id, dependency.id).then(() => queryClient.invalidateQueries({ queryKey: ['tasks', id] }))}>
                  Remove
                </button>
              </div>
            )) : <p className="text-sm text-text-muted">No dependencies yet</p>}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-info" />
          <p className="text-sm font-bold">Comments</p>
        </div>
        <div className="space-y-3">
          {task.comments.length ? task.comments.map((item) => (
            <div key={item.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{item.content}</p>
              <p className="text-[10px] text-text-muted mt-2">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          )) : <p className="text-sm text-text-muted">No comments yet</p>}
        </div>
      </Card>

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

      <TaskTimeAnalysis task={task as TaskDTO} />

      {noteOpen && (
        <EntryFormModal
          isOpen
          mode="create"
          defaultIsJournal={noteOpen === 'journal'}
          taskId={task.id}
          onClose={() => setNoteOpen(null)}
        />
      )}
    </div>
  );
}
