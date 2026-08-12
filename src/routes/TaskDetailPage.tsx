import { useRef, useState, useEffect } from 'react';
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
  Paperclip,
  Mic,
  Square,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { TaskTimeAnalysis } from '../components/tasks/TaskTimeAnalysis';
import { VoiceNotePlayer } from '../components/media/VoiceNotePlayer';
import { uploadMediaFile } from '../lib/mediaUpload';
import { formatDuration, getRecurrenceLabel, isOverdue } from '../components/tasks/TaskCard';
import { useTasks, useUpdateTask } from '../features/tasks/hooks/useTasks';
import { tasksApi } from '../features/tasks/api';
import { notesApi } from '../features/notes/api';
import apiClient from '../lib/apiClient';
import type { MediaItemDTO, NoteDTO, TaskDTO, TaskDetailDTO } from '../types';

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

function MediaThumb({ url }: { url: string }) {
  const isImage = isImageUrl(url);
  if (isImage) {
    return (
      <div
        className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
      style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
    >
      <Paperclip size={16} />
    </div>
  );
}

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
      const type = folder === 'voice-notes' ? 'voice_note' : 'attachment';
      await apiClient.post(`/tasks/${id}/media`, {
        url: uploaded.url,
        type,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      await queryClient.invalidateQueries({ queryKey: ['tasks', id] });
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
      await apiClient.delete(`/tasks/${id}/media/${mediaId}`);
      await queryClient.invalidateQueries({ queryKey: ['tasks', id] });
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
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
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
        setVoiceError(err?.message || 'Could not access microphone. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const timeMutation = useMutation({
    mutationFn: () =>
      tasksApi.createTimeEntry(id, {
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
          <Button onClick={() => navigate('/tasks')} className="mt-4">
            Back to Tasks
          </Button>
        </Card>
      </div>
    );
  }

  // Combine task.attachments with legacy attachmentUrl
  const taskWithMedia = task as TaskDetailDTO;
  const attachments = [
    ...(taskWithMedia.attachments ?? []),
    ...(task.attachmentUrl && !(taskWithMedia.attachments ?? []).some((m: MediaItemDTO) => m.url === task.attachmentUrl)
      ? [
          {
            id: 'legacy-attachment',
            url: task.attachmentUrl,
            type: 'attachment' as const,
            fileName: null,
            mimeType: null,
            size: null,
            createdAt: '',
          },
        ]
      : []),
  ];
  const voiceNotes = [
    ...(taskWithMedia.voiceNotes ?? []),
    ...(task.voiceNoteUrl && !(taskWithMedia.voiceNotes ?? []).some((m: MediaItemDTO) => m.url === task.voiceNoteUrl)
      ? [
          {
            id: 'legacy-voice',
            url: task.voiceNoteUrl,
            type: 'voice_note' as const,
            fileName: null,
            mimeType: null,
            size: null,
            createdAt: '',
          },
        ]
      : []),
  ];

  const statusBadgeVariant =
    task.status === 'DONE'
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
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>
            Add Note
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>
            Add Journal
          </Button>
          <Button size="sm" onClick={() => navigate(`/focus?taskId=${task.id}`)}>
            Focus
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 sm:p-6 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <PageHeader
                    icon={<ListChecks size={20} />}
                    title={task.title}
                    subtitle={task.description ?? 'Task detail'}
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant={statusBadgeVariant} size="sm">
                      {statusLabel(task.status)}
                    </Badge>
                    <Badge
                      variant={
                        task.priority === 'CRITICAL'
                          ? 'danger'
                          : task.priority === 'HIGH'
                            ? 'warning'
                            : task.priority === 'MEDIUM'
                              ? 'info'
                              : 'default'
                      }
                      size="sm"
                    >
                      {task.priority}
                    </Badge>
                    {project && (
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                          color: 'var(--color-success)',
                        }}
                      >
                        <FolderKanban size={12} />
                        {project.name}
                      </button>
                    )}
                    {recurrenceLabel && (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        <Repeat size={12} />
                        {recurrenceLabel}
                      </span>
                    )}
                    {overdue && (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                          color: 'var(--color-danger)',
                        }}
                      >
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {task.description && <p className="text-sm leading-relaxed text-text-secondary">{task.description}</p>}

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ──────────── Attachment Section ──────────── */}
                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Attachments{' '}
                      {attachments.length > 0 && <span className="text-accent">({attachments.length})</span>}
                    </p>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {attachments.map((media: MediaItemDTO) => (
                        <div
                          key={media.id}
                          className="flex items-center gap-3 rounded-lg border p-2"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
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
                      <div
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold"
                        style={{
                          color: '#e53935',
                          background: 'rgba(229, 57, 53, 0.08)',
                          border: '1px solid rgba(229, 57, 53, 0.25)',
                        }}
                      >
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#e53935', animation: 'recording-pulse 1.2s ease-in-out infinite' }}
                        />
                        <span>
                          REC {Math.floor(recordingElapsed / 60)}:{String(recordingElapsed % 60).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-100 transition-colors"
                          title="Stop recording"
                        >
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
            </div>

            <div className="lg:w-[340px] shrink-0 space-y-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-success" />
                  <p className="text-sm font-bold">Quick Actions</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateTask.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })
                    }
                  >
                    {task.status === 'DONE' ? 'Reopen' : 'Mark Done'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>
                    Add linked note
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>
                    Add journal entry
                  </Button>
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
            {task.subTasks?.length ? (
              task.subTasks.map((subTask) => (
                <div
                  key={subTask.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => subtaskMutation.mutate({ subTaskId: subTask.id, completed: !subTask.completed })}
                  >
                    <CheckCircle2 size={16} className={subTask.completed ? 'text-success' : 'text-text-muted'} />
                  </button>
                  <span
                    className={`flex-1 text-sm ${subTask.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}
                  >
                    {subTask.title}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">No subtasks yet</p>
            )}
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
            {task.timeEntries.length ? (
              task.timeEntries.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.minutes} min</p>
                    {item.note && <p className="text-xs text-text-muted">{item.note}</p>}
                  </div>
                  <p className="text-[10px] text-text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">No time entries yet</p>
            )}
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
              <Button variant="secondary" size="sm" onClick={() => setNoteOpen('note')}>
                Note
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setNoteOpen('journal')}>
                Journal
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(relatedNotes.data?.data ?? []).map((note: NoteDTO) => (
              <div key={note.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{note.title ?? 'Untitled'}</p>
                  <Badge variant={note.isJournal ? 'warning' : 'accent'} size="sm">
                    {note.isJournal ? 'Journal' : 'Note'}
                  </Badge>
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
