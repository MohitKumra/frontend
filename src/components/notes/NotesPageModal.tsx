import React, { useEffect, useState } from 'react';
import { Edit3, Trash2, X, Calendar, StickyNote } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { NoteDTO } from '../../types';
import { MediaPreview } from '../media/MediaPreview';

interface NotePageModalProps {
  note: NoteDTO;
  originRect?: DOMRect | null; // unused (notes don't flip-animate from the card), kept for prop-shape parity with JournalBookModal
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NotePageModal({ note, onClose, onEdit, onDelete }: NotePageModalProps) {
  const [closing, setClosing] = useState(false);

  const lastUpdated = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Lock body scroll when modal opens
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 280);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  return (
    <div
      className={`note-overlay ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={note.title || 'Note'}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Desktop close button - hidden on mobile, mobile uses the Close button in the action bar */}
      <button className="entry-close-btn entry-close-btn--desktop" onClick={handleClose} aria-label="Close note">
        <X size={22} />
      </button>

      <div className={`note-sheet ${closing ? 'is-closing' : ''}`}>
        <div className="note-sheet-header">
          <div className="note-sheet-icon">
            <StickyNote size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="note-title">{note.title || 'Untitled Note'}</h2>
            <div className="note-date">Last updated {lastUpdated}</div>
          </div>
        </div>

        <div className="note-sheet-scroll">
          <p className="note-text">{note.content}</p>
          {(note.attachmentUrl || note.voiceNoteUrl) && (
            <div className="note-media-field-wrap" style={{ marginTop: '20px' }}>
              <MediaPreview
                attachmentUrl={note.attachmentUrl}
                voiceNoteUrl={note.voiceNoteUrl}
                compact
              />
            </div>
          )}
        </div>

        <div className="note-sheet-footer">
          <Badge variant="info" size="sm">
            Note
          </Badge>
          <span className="note-footer-date">
            <Calendar size={11} />
            {lastUpdated}
          </span>
        </div>
      </div>

      <div className="entry-action-bar">
        <button type="button" className="entry-btn entry-btn-danger" onClick={onDelete}>
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
        <button type="button" className="entry-btn entry-btn-primary" onClick={onEdit}>
          <Edit3 size={16} />
          <span>Edit Note</span>
        </button>
        <button type="button" className="entry-btn entry-btn-ghost entry-btn-close" onClick={handleClose}>
          <X size={16} />
          <span>Close</span>
        </button>
      </div>
    </div>
  );
}
