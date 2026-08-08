import { JournalBookModal } from './JournalBookModal';
import { NotePageModal } from './NotesPageModal';
import { ModalPortal } from '../ui/ModalRoot';
import type { NoteDTO } from '../../types';

interface NoteViewModalProps {
  isOpen: boolean;
  note: NoteDTO;
  originRect?: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NoteViewModal({ isOpen, note, originRect, onClose, onEdit, onDelete }: NoteViewModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      {note.isJournal ? (
        <JournalBookModal note={note} originRect={originRect} onClose={onClose} onEdit={onEdit} onDelete={onDelete} />
      ) : (
        <NotePageModal note={note} originRect={originRect} onClose={onClose} onEdit={onEdit} onDelete={onDelete} />
      )}
    </ModalPortal>
  );
}
