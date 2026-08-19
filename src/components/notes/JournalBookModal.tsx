import React from 'react';
import type { NoteDTO, Bookmark, CoverStyle, BookStyle } from '../../types';
import { AppleBookJournalModal } from './AppleBookJournalModal';
import type { CoverProcessResult } from '../../lib/coverImageProcessor';

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
  onToggleBookmark?: (bookmarks: Bookmark[]) => Promise<void> | void;
  onUploadCover?: (processed: CoverProcessResult) => Promise<NoteDTO | void>;
  onRemoveCover?: () => Promise<void>;
  onSaveCoverStyle?: (coverStyle: CoverStyle | null) => Promise<NoteDTO | void> | void;
  onSaveBookStyle?: (bookStyle: BookStyle | null) => Promise<NoteDTO | void> | void;
  autoSaveOnClose?: boolean;
}

export function JournalBookModal({
  note,
  originRect,
  onClose,
  onEdit,
  onDelete,
  onSave,
  onToggleBookmark,
  onUploadCover,
  onRemoveCover,
  onSaveCoverStyle,
  onSaveBookStyle,
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
      onToggleBookmark={onToggleBookmark}
      onUploadCover={onUploadCover}
      onRemoveCover={onRemoveCover}
      onSaveCoverStyle={onSaveCoverStyle}
      onSaveBookStyle={onSaveBookStyle}
      autoSaveOnClose={autoSaveOnClose}
    />
  );
}
