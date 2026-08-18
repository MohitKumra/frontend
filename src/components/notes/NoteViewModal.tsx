import { JournalBookModal } from './JournalBookModal';
import { NotePageModal } from './NotesPageModal';
import { ModalPortal } from '../ui/ModalRoot';
import type { NoteDTO, Bookmark } from '../../types';

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
          autoSaveOnClose={autoSaveOnClose}
        />
      ) : (
        <NotePageModal note={note} originRect={originRect} onClose={onClose} onEdit={onEdit} onDelete={onDelete} />
      )}
    </ModalPortal>
  );
}
