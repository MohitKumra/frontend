import React from 'react';
import type { NoteDTO } from '../../types';
import { AppleBookJournalModal } from './AppleBookJournalModal';

interface JournalBookModalProps {
  note: NoteDTO;
  originRect?: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave?: (data: {
    title: string;
    content: string;
    isJournal: boolean;
    mood: NoteDTO['mood'];
    tags: string[];
    attachmentUrl: string;
    voiceNoteUrl: string;
  }) => Promise<void> | void;
  autoSaveOnClose?: boolean;
}

export function JournalBookModal({
  note,
  originRect,
  onClose,
  onEdit,
  onDelete,
  onSave,
  autoSaveOnClose,
}: JournalBookModalProps) {
  return (
    <AppleBookJournalModal
      note={note}
      initialMode="read"
      originRect={originRect}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      autoSaveOnClose={autoSaveOnClose}
    />
  );
}
