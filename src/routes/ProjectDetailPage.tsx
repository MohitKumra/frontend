import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, CheckCircle2, FolderKanban, Plus, Timer } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingScreen } from '../components/ui/Spinner';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { MediaPreview } from '../components/media/MediaPreview';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { useProject } from '../features/projects/hooks/useProjects';
import { notesApi } from '../features/notes/api';
import apiClient from '../lib/apiClient';
import type { ListResponse, NoteDTO, TaskDTO } from '../types';

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState<null | 'note' | 'journal'>(null);
  const [taskOpen, setTaskOpen] = useState(false);

  const { data: project, isLoading } = useProject(id);
  const { data: linkedNotes } = useQuery({
    queryKey: ['notes', { projectId: id }],
    queryFn: () => notesApi.list({ projectId: id }),
    enabled: !!id,
  });
  const { data: projectTasks } = useQuery({
    queryKey: ['projects', id, 'tasks'],
    queryFn: () => apiClient.get<ListResponse<TaskDTO>>(`/projects/${id}/tasks`).then((r) => r.data),
    enabled: !!id,
  });

  const linkedCount = linkedNotes?.data?.length ?? 0;
  const tasks = projectTasks?.data ?? [];

  const removeTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/projects/${id}/tasks/${taskId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects', id] }),
        queryClient.invalidateQueries({ queryKey: ['projects', id, 'tasks'] }),
      ]);
    },
  });

  if (isLoading) return <LoadingScreen />;
  if (!project) {
    return (
      <Card className="p-8 text-center">
        <p className="text-text-muted">Project not found</p>
        <Button onClick={() => navigate('/projects')} className="mt-4">Back to Projects</Button>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-5 sm:gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back to projects
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setTaskOpen(true)}>
            <Plus size={14} />
            Add Task
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>Add Note</Button>
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>Add Journal</Button>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <PageHeader icon={<FolderKanban size={24} />} title={project.name} subtitle={project.description ?? 'Project detail'} />
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="accent" size="sm">{project.status}</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-info) 10%, transparent)', color: 'var(--color-info)' }}>
                <Calendar size={12} />
                {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No deadline'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', color: 'var(--color-success)' }}>
                <CheckCircle2 size={12} />
                {project.progress}% complete
              </span>
            </div>
          </div>
          <div className="w-full md:w-72">
            <div className="h-2 rounded-full overflow-hidden bg-border">
              <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: 'var(--gradient-accent)' }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Attachment</p>
            <div className="mt-2">
              {project.attachmentUrl ? (
                <MediaPreview attachmentUrl={project.attachmentUrl} compact />
              ) : (
                <p className="text-sm font-bold text-text-primary">None</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Voice Note</p>
            <div className="mt-2">
              {project.voiceNoteUrl ? (
                <MediaPreview voiceNoteUrl={project.voiceNoteUrl} compact />
              ) : (
                <p className="text-sm font-bold text-text-primary">None</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm font-bold">Project Tasks</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{tasks.length} tasks</span>
              <button
                type="button"
                onClick={() => setTaskOpen(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:text-accent"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                title="Add task"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {tasks.length ? tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <button type="button" onClick={() => navigate(`/tasks/${task.id}`)} className="text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary truncate">{task.title}</p>
                  <p className="text-xs text-text-muted">{task.status}</p>
                </button>
                <button
                  type="button"
                  onClick={() => removeTaskMutation.mutate(task.id)}
                  className="text-xs font-bold text-danger"
                >
                  Remove
                </button>
              </div>
            )) : <p className="text-sm text-text-muted">No tasks linked to this project</p>}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm font-bold">Linked Notes & Journal</p>
            <span className="text-xs text-text-muted">{linkedCount} entries</span>
          </div>
          <div className="space-y-2">
            {linkedNotes?.data?.map((note: NoteDTO) => (
              <div key={note.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{note.title ?? 'Untitled'}</p>
                  <Badge variant={note.isJournal ? 'warning' : 'accent'} size="sm">{note.isJournal ? 'Journal' : 'Note'}</Badge>
                </div>
                <p className="text-xs text-text-secondary line-clamp-3 mt-2">{note.content}</p>
              </div>
            ))}
            {(linkedNotes?.data?.length ?? 0) === 0 && <p className="text-sm text-text-muted">No linked notes yet</p>}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Timer size={16} className="text-accent" />
          <p className="text-sm font-bold">Project Focus View</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate(`/focus?projectId=${id}`)}>Open Focus</Button>
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>Add project note</Button>
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>Add journal entry</Button>
        </div>
      </Card>

      {noteOpen && (
        <EntryFormModal
          isOpen
          mode="create"
          defaultIsJournal={noteOpen === 'journal'}
          projectId={project.id}
          onClose={() => setNoteOpen(null)}
        />
      )}
      <CreateTaskModal
        isOpen={taskOpen}
        onClose={() => setTaskOpen(false)}
        initialProjectId={project.id}
        lockProject
      />
    </div>
  );
}
