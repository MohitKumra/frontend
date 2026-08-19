// frontend/src/components/notes/Notes3DCard.tsx
import React from 'react';
import { Pin, Archive, RotateCcw, MoreVertical } from 'lucide-react';
import type { NoteDTO } from '../../types';
import { LiveBookCoverPreview } from './LiveBookCover';

interface Notes3DCardProps {
  note: NoteDTO;
  showArchived: boolean;
  starred: boolean;
  menuOpen: boolean;
  onOpen: (e: React.MouseEvent<HTMLDivElement>, note: NoteDTO) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onMenuToggle: (id: string) => void;
  menu?: React.ReactNode;
}

export function Notes3DCard({
  note,
  showArchived,
  starred,
  menuOpen,
  onOpen,
  onTogglePin,
  onArchive,
  onUnarchive,
  onMenuToggle,
  menu,
}: Notes3DCardProps) {
  const title =
    note.title && !note.title.startsWith('Journal Entry —')
      ? note.title
      : note.isJournal
        ? 'Daily Reflection'
        : 'Untitled';

  const plainContent = note.content
    ? note.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  return (
    <div
      className="np3d-card"
      onClick={(e) => onOpen(e, note)}
    >
      {note.isJournal ? (
        <div className="np3d-book">
          <div className="np3d-book-face">
            <LiveBookCoverPreview
              title={title}
              dateLabel={''}
              coverUrl={note.coverUrl ?? null}
              templateId={note.coverStyle?.templateId ?? null}
              coverStyle={note.coverStyle ?? null}
            />
          </div>
        </div>
      ) : (
        <div className="np3d-sticky">
          <div className="np3d-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note.id, note.isPinned);
              }}
              className="np3d-action-btn"
              aria-label={starred ? 'Unpin' : 'Pin'}
              title={starred ? 'Unpin' : 'Pin'}
              style={{ color: starred ? '#f5b301' : 'inherit' }}
            >
              <Pin size={13} fill={starred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                showArchived ? onUnarchive(note.id) : onArchive(note.id);
              }}
              className="np3d-action-btn"
              aria-label={showArchived ? 'Restore' : 'Archive'}
              title={showArchived ? 'Restore' : 'Archive'}
            >
              {showArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle(note.id);
              }}
              className="np3d-action-btn"
              aria-label="More"
              title="More"
            >
              <MoreVertical size={13} />
            </button>
          </div>
          <div className="np3d-sticky-title">{title}</div>
          <div className="np3d-sticky-preview">
            {plainContent.slice(0, 120)}
          </div>
        </div>
      )}
      {menuOpen && menu}
    </div>
  );
}