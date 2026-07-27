import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, CheckCircle2, ChevronDown, FolderKanban, Paperclip, Mic, Square, Trash2, Loader2, Image as ImageIcon, ExternalLink, Plus, Timer } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingScreen } from '../components/ui/Spinner';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { NoteViewModal } from '../components/notes/NoteViewModal';
import { VoiceNotePlayer } from '../components/media/VoiceNotePlayer';
import { uploadMediaFile } from '../lib/mediaUpload';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { useProject, useUpdateProject } from '../features/projects/hooks/useProjects';
import { useDeleteNote } from '../features/notes/hooks/useNotes';
import { notesApi } from '../features/notes/api';
import apiClient from '../lib/apiClient';
import type { ListResponse, MediaItemDTO, NoteDTO, ProjectStatus, TaskDTO } from '../types';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif', '.svg'];

function isImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
}

function shortName(url: string, max = 18): string {
  try {
    const segs = new URL(url).pathname.split('/').filter(Boolean);
    const name = decodeURIComponent(segs[segs.length - 1] || 'file');
    return name.length > max ? name.slice(0, max - 3) + '…' : name;
  } catch {
    return 'file';
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function MediaThumb({ url }: { url: string }) {
  const isImage = isImageUrl(url);
  if (isImage) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: 'var(--color-border)' }}>
        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
      <Paperclip size={16} />
    </div>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState<null | 'note' | 'journal'>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteDTO | null>(null);
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);
  const deleteNote = useDeleteNote();

  // Media upload state
  const attachInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingStartRef = useRef<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const MAX_BYTES = 4 * 1024 * 1024;

  // Live elapsed timer during recording
  useEffect(() => {
    if (!isRecording) {
      setRecordingElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingElapsed(Math.floor((Date.now() - recordingStartRef.current) / 1000));
    }, 200);
    return () => clearInterval(interval);
  }, [isRecording]);

  const uploadFile = async (file: File, folder: 'attachments' | 'voice-notes' = 'attachments') => {
    if (file.size > MAX_BYTES) {
      if (folder === 'voice-notes') {
        setVoiceError('Files must be 4MB or smaller.');
      } else {
        setAttachError('Files must be 4MB or smaller.');
      }
      return;
    }
    if (folder === 'voice-notes') {
      setVoiceError(null);
    } else {
      setAttachError(null);
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadMediaFile(file, folder);
      // Add media via API
      const type = folder === 'voice-notes' ? 'voice_note' : 'attachment';
      await apiClient.post(`/projects/${id}/media`, {
        url: uploaded.url,
        type,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      await queryClient.invalidateQueries({ queryKey: ['projects', id] });
    } catch {
      if (folder === 'voice-notes') {
        setVoiceError('Upload failed.');
      } else {
        setAttachError('Upload failed.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = async (mediaId: string) => {
    try {
      await apiClient.delete(`/projects/${id}/media/${mediaId}`);
      await queryClient.invalidateQueries({ queryKey: ['projects', id] });
    } catch {
      setAttachError('Failed to remove media.');
      setVoiceError('Failed to remove media.');
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceError('Mic not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recordingStartRef.current = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        let ext = '.webm';
        if (mimeType.includes('mp4') || mimeType.includes('mpeg')) ext = '.m4a';
        else if (mimeType.includes('ogg')) ext = '.ogg';
        else if (mimeType.includes('mp3')) ext = '.mp3';
        else if (mimeType.includes('wav')) ext = '.wav';
        const file = new File([blob], `voice-note-${Date.now()}${ext}`, { type: blob.type });
        setVoiceError(null);
        await uploadFile(file, 'voice-notes');
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setVoiceError('No microphone detected. Please connect a microphone.');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone access denied. Please allow microphone permission.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setVoiceError('Microphone is being used by another app.');
      } else {
        setVoiceError('Could not access microphone. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject(id);
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

  // Combine new ProjectMedia items with legacy attachmentUrl/voiceNoteUrl
  const attachments = [
    ...(project.attachments ?? []),
    ...(project.attachmentUrl && !(project.attachments ?? []).some((m) => m.url === project.attachmentUrl)
      ? [{ id: 'legacy-attachment', url: project.attachmentUrl, type: 'attachment' as const, fileName: null, mimeType: null, size: null, createdAt: '' }]
      : []),
  ];
  const voiceNotes = [
    ...(project.voiceNotes ?? []),
    ...(project.voiceNoteUrl && !(project.voiceNotes ?? []).some((m) => m.url === project.voiceNoteUrl)
      ? [{ id: 'legacy-voice', url: project.voiceNoteUrl, type: 'voice_note' as const, fileName: null, mimeType: null, size: null, createdAt: '' }]
      : []),
  ];

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
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <PageHeader icon={<FolderKanban size={24} />} title={project.name} subtitle={project.description ?? 'Project detail'} />
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="relative">
                  <select
                    value={project.status}
                    onChange={(e) => updateProject.mutate({ status: e.target.value as ProjectStatus })}
                    className="text-xs font-bold px-2.5 py-1 pr-6 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                      color: 'var(--color-accent)',
                      borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
                    }}
                    disabled={updateProject.isPending}
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-accent)' }}
                  />
                </div>
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

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ──────────── Attachment Section ──────────── */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Attachments {attachments.length > 0 && <span className="text-accent">({attachments.length})</span>}
                </p>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((media: MediaItemDTO) => (
                    <div key={media.id} className="flex items-center gap-3 rounded-lg border p-2" style={{ borderColor: 'var(--color-border)' }}>
                      <MediaThumb url={media.url} />
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-0 text-xs font-semibold truncate hover:underline"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {media.fileName || shortName(media.url)}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeMedia(media.id)}
                        className="text-danger hover:underline shrink-0"
                        title="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={attachInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = '';
                    if (file) void uploadFile(file, 'attachments');
                  }}
                />
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                ) : (
                  <button
                    type="button"
                    onClick={() => attachInputRef.current?.click()}
                    disabled={isRecording}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:border-accent"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    <Plus size={12} />
                    Add
                  </button>
                )}
                {attachError && <span className="text-xs font-bold text-danger">{attachError}</span>}
              </div>
            </div>

            {/* ──────────── Voice Note Section ──────────── */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Voice Notes {voiceNotes.length > 0 && <span className="text-accent">({voiceNotes.length})</span>}
                </p>
              </div>
              {voiceNotes.length > 0 && (
                <div className="space-y-2 mb-3">
                  {voiceNotes.map((media: MediaItemDTO) => (
                    <div key={media.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <VoiceNotePlayer src={media.url} compact onDelete={() => removeMedia(media.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <div className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold" style={{ color: '#e53935', background: 'rgba(229, 57, 53, 0.08)', border: '1px solid rgba(229, 57, 53, 0.25)' }}>
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#e53935', animation: 'recording-pulse 1.2s ease-in-out infinite' }} />
                    <span>REC {formatDuration(recordingElapsed)}</span>
                    <button type="button" onClick={stopRecording} className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-100 transition-colors" title="Stop recording">
                      <Square size={10} fill="#e53935" />
                    </button>
                  </div>
                ) : (
                  <>
                    {isUploading ? (
                      <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:border-accent"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      >
                        <Mic size={12} />
                        Record
                      </button>
                    )}
                  </>
                )}
                {voiceError && <span className="text-xs font-bold text-danger">{voiceError}</span>}
              </div>
            </div>
          </div>

          {/* Recording pulse animation keyframes */}
          <style>{`
            @keyframes recording-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(0.7); }
            }
          `}</style>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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
              <button
                key={note.id}
                type="button"
                onClick={() => setViewingNote(note)}
                className="w-full text-left rounded-xl border p-3 transition-colors hover:bg-surface-secondary"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{note.title ?? 'Untitled'}</p>
                  <Badge variant={note.isJournal ? 'warning' : 'accent'} size="sm">{note.isJournal ? 'Journal' : 'Note'}</Badge>
                </div>
                <p className="text-xs text-text-secondary line-clamp-3 mt-2">{note.content}</p>
              </button>
            ))}
            {(linkedNotes?.data?.length ?? 0) === 0 && <p className="text-sm text-text-muted">No linked notes yet</p>}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
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
      </motion.div>

      {noteOpen && (
        <EntryFormModal
          isOpen
          mode="create"
          defaultIsJournal={noteOpen === 'journal'}
          projectId={project.id}
          onClose={() => setNoteOpen(null)}
        />
      )}
      {viewingNote && (
        <NoteViewModal
          isOpen
          note={viewingNote}
          onClose={() => {
            setViewingNote(null);
            queryClient.invalidateQueries({ queryKey: ['notes', { projectId: id }] });
          }}
          onEdit={() => {
            setEditingNote(viewingNote);
            setViewingNote(null);
          }}
          onDelete={() => {
            deleteNote.mutate(viewingNote.id, {
              onSuccess: () => {
                setViewingNote(null);
                queryClient.invalidateQueries({ queryKey: ['notes', { projectId: id }] });
              },
            });
          }}
        />
      )}
      {editingNote && (
        <EntryFormModal
          isOpen
          mode="edit"
          note={editingNote}
          onClose={() => {
            setEditingNote(null);
            queryClient.invalidateQueries({ queryKey: ['notes', { projectId: id }] });
          }}
        />
      )}
      <CreateTaskModal
        isOpen={taskOpen}
        onClose={() => setTaskOpen(false)}
        initialProjectId={project.id}
        lockProject
      />
    </motion.div>
  );
}