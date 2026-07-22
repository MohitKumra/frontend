import { useEffect, useState } from 'react';
import { useCreateNote, useUpdateNote } from '../../features/notes/hooks/useNotes';
import type { NoteDTO } from '../../types';
import { ModalPortal } from '../ui/ModalRoot';
import { JournalEntryShell } from './JournalEntryShell';
import { NoteEntryShell } from './NoteEntryshell';

export interface EntryFormState {
  title: string;
  content: string;
  isJournal: boolean;
  taskId: string | null;
  projectId: string | null;
  attachmentUrl: string;
  voiceNoteUrl: string;
  mood: NoteDTO['mood'];
  tags: string[];
}

interface EntryFormModalProps {
  isOpen: boolean;
  mode?: 'create' | 'edit';
  note?: NoteDTO;
  editNote?: NoteDTO;
  defaultIsJournal?: boolean;
  taskId?: string | null;
  projectId?: string | null;
  onClose: () => void;
}

// Single form modal for both creating and editing entries. The type toggle
// (Note vs Journal) is only shown in create mode — once an entry exists,
// its type is fixed, so editing can never silently convert one into the
// other. Journal/sticky-note theming is chosen by formData.isJournal and
// is shared by both modes, so there's no separate create/edit JSX to drift.
export function EntryFormModal({ isOpen, mode, note, editNote, defaultIsJournal = false, taskId = null, projectId = null, onClose }: EntryFormModalProps) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const activeMode = mode ?? (note || editNote ? 'edit' : 'create');
  const activeNote = note ?? editNote;

  const [formData, setFormData] = useState<EntryFormState>(() => ({
    title: activeNote?.title ?? '',
    content: activeNote?.content ?? '',
    isJournal: activeNote?.isJournal ?? defaultIsJournal,
    taskId: activeNote?.taskId ?? taskId,
    projectId: activeNote?.projectId ?? projectId,
    attachmentUrl: activeNote?.attachmentUrl ?? '',
    voiceNoteUrl: activeNote?.voiceNoteUrl ?? '',
    mood: activeNote?.mood ?? null,
    tags: activeNote?.tags ?? [],
  }));

  useEffect(() => {
    setFormData({
      title: activeNote?.title ?? '',
      content: activeNote?.content ?? '',
      isJournal: activeNote?.isJournal ?? defaultIsJournal,
      taskId: activeNote?.taskId ?? taskId,
      projectId: activeNote?.projectId ?? projectId,
      attachmentUrl: activeNote?.attachmentUrl ?? '',
      voiceNoteUrl: activeNote?.voiceNoteUrl ?? '',
      mood: activeNote?.mood ?? null,
      tags: activeNote?.tags ?? [],
    });
  }, [activeNote, defaultIsJournal, projectId, taskId]);

  if (!isOpen) return null;

  const isSaving = activeMode === 'create' ? createNote.isPending : updateNote.isPending;

  const handleSubmit = async () => {
    if (!formData.content.trim() || isSaving) return;

    try {
      if (activeMode === 'edit' && activeNote) {
        await updateNote.mutateAsync({ id: activeNote.id, data: formData });
      } else {
        await createNote.mutateAsync(formData);
        setFormData({ title: '', content: '', isJournal: defaultIsJournal, taskId, projectId, attachmentUrl: '', voiceNoteUrl: '', mood: null, tags: [] });
      }
      onClose();
    } catch (error) {
      console.error(`Failed to ${activeMode} note:`, error);
    }
  };

  const shellProps = {
    mode: activeMode,
    note: activeNote,
    formData,
    setFormData,
    onSubmit: handleSubmit,
    onClose,
    isSaving,
    // Type is only choosable at creation — editing an entry keeps its
    // original format, it can't be converted mid-edit.
    allowTypeChange: activeMode === 'create',
  };

  return (
    <ModalPortal>
      {formData.isJournal ? <JournalEntryShell {...shellProps} /> : <NoteEntryShell {...shellProps} />}
    </ModalPortal>
  );
}