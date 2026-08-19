import { JournalBookModal } from './JournalBookModal';
import { NotePageModal } from './NotesPageModal';
import { ModalPortal } from '../ui/ModalRoot';
import type { NoteDTO, Bookmark, CoverStyle, BookStyle } from '../../types';
import type { CoverProcessResult } from '../../lib/coverImageProcessor';

interface NoteViewModalProps {
  isOpen: boolean;
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

export function NoteViewModal({
  isOpen,
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
}: NoteViewModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      {note.isJournal ? (
        <JournalBookModal
          note={note}
          originRect={originRect}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
          onSave={onSave}
          onToggleBookmark={onToggleBookmark}
          onUploadCover={onUploadCover}
          onRemoveCover={onRemoveCover}
          onSaveCoverStyle={onSaveCoverStyle}
          onSaveBookStyle={onSaveBookStyle}
          autoSaveOnClose={autoSaveOnClose}
        />
      ) : (
        <NotePageModal note={note} originRect={originRect} onClose={onClose} onEdit={onEdit} onDelete={onDelete} />
      )}
    </ModalPortal>
  );
}
