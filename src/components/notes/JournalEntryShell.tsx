import React from 'react';
import type { NoteDTO } from '../../types';
import type { EntryFormState } from './EnteryFormModal';
import { AppleBookJournalModal } from './AppleBookJournalModal';

interface JournalEntryShellProps {
  mode: 'create' | 'edit';
  note?: NoteDTO;
  formData: EntryFormState;
  setFormData: React.Dispatch<React.SetStateAction<EntryFormState>>;
  onSubmit: (data?: EntryFormState) => void | Promise<void>;
  onClose: () => void;
  isSaving: boolean;
  allowTypeChange: boolean;
}

export function JournalEntryShell({
  mode,
  note,
  formData,
  setFormData,
  onSubmit,
  onClose,
  isSaving,
  allowTypeChange,
}: JournalEntryShellProps) {
  const dummyNote: NoteDTO = {
    id: note?.id ?? 'new-journal',
    title: formData.title,
    content: formData.content,
    isJournal: formData.isJournal,
    taskId: note?.taskId ?? formData.taskId ?? null,
    projectId: note?.projectId ?? formData.projectId ?? null,
    isPinned: note?.isPinned ?? false,
    mood: formData.mood,
    tags: formData.tags,
    attachmentUrl: formData.attachmentUrl,
    voiceNoteUrl: formData.voiceNoteUrl,
    createdAt: note?.createdAt ?? new Date().toISOString(),
    updatedAt: note?.updatedAt ?? new Date().toISOString(),
    archived: note?.archived ?? false,
    userId: note?.userId ?? 'user',
  };

  const handleSaveData = async (data: {
    title: string;
    content: string;
    isJournal: boolean;
    mood: NoteDTO['mood'];
    tags: string[];
    attachmentUrl: string;
    voiceNoteUrl: string;
  }) => {
    // Merge the book's freshly-edited fields into the current form state so we
    // keep taskId/projectId, then submit the merged state directly. We must NOT
    // rely on EnteryFormModal reading its own (still-stale) `formData` after a
    // queued setState — that used to drop the edited content.
    const updated: EntryFormState = { ...formData, ...data };
    setFormData(updated);
    await onSubmit(updated);
  };

  return (
    <AppleBookJournalModal
      note={dummyNote}
      initialMode="edit"
      allowTypeChange={allowTypeChange}
      onClose={onClose}
      onSave={handleSaveData}
      isSaving={isSaving}
    />
  );
}
