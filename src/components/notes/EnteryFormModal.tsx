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
}   




interface EntryFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  note?: NoteDTO; // required when mode === 'edit'
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
export function EntryFormModal({ isOpen, mode, note, defaultIsJournal = false, taskId = null, projectId = null, onClose }: EntryFormModalProps) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const [formData, setFormData] = useState<EntryFormState>(() => ({
    title: note?.title ?? '',
    content: note?.content ?? '',
    isJournal: note?.isJournal ?? defaultIsJournal,
    taskId: note?.taskId ?? taskId,
    projectId: note?.projectId ?? projectId,
  }));

  useEffect(() => {
    setFormData({
      title: note?.title ?? '',
      content: note?.content ?? '',
      isJournal: note?.isJournal ?? defaultIsJournal,
      taskId: note?.taskId ?? taskId,
      projectId: note?.projectId ?? projectId,
    });
  }, [defaultIsJournal, note, projectId, taskId]);

  if (!isOpen) return null;

  const isSaving = mode === 'create' ? createNote.isPending : updateNote.isPending;

  const handleSubmit = async () => {
    if (!formData.content.trim() || isSaving) return;

    try {
      if (mode === 'edit' && note) {
        await updateNote.mutateAsync({ id: note.id, data: formData });
      } else {
        await createNote.mutateAsync(formData);
        setFormData({ title: '', content: '', isJournal: defaultIsJournal, taskId, projectId });
      }
      onClose();
    } catch (error) {
      console.error(`Failed to ${mode} note:`, error);
    }
  };

  const shellProps = {
    mode,
    note,
    formData,
    setFormData,
    onSubmit: handleSubmit,
    onClose,
    isSaving,
    // Type is only choosable at creation — editing an entry keeps its
    // original format, it can't be converted mid-edit.
    allowTypeChange: mode === 'create',
  };

  return (
    <ModalPortal>
      {formData.isJournal ? <JournalEntryShell {...shellProps} /> : <NoteEntryShell {...shellProps} />}
    </ModalPortal>
  );
}
