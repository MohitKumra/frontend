import React, { useEffect, useState } from 'react';
import { BookOpen, StickyNote, Check, X } from 'lucide-react';
import type { NoteDTO } from '../../types';
import type { EntryFormState } from './EnteryFormModal';
import { MediaAttachmentsField } from '../media/MediaAttachmentsField';
import { MoodPicker } from './MoodPicker';
import { TagInput } from './TagInput';

interface NoteEntryShellProps {
  mode: 'create' | 'edit';
  note?: NoteDTO;
  formData: EntryFormState;
  setFormData: React.Dispatch<React.SetStateAction<EntryFormState>>;
  onSubmit: () => void;
  onClose: () => void;
  isSaving: boolean;
  allowTypeChange: boolean;
}

export function NoteEntryShell({
  mode,
  note,
  formData,
  setFormData,
  onSubmit,
  onClose,
  isSaving,
  allowTypeChange,
}: NoteEntryShellProps) {
  const [closing, setClosing] = useState(false);

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

  const handleSave = () => {
    if (!formData.content.trim() || isSaving) return;
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  return (
    <div
      className={`note-overlay ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? `Edit ${note?.title || 'note'}` : 'New note'}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button className="entry-close-btn entry-close-btn--desktop" onClick={handleClose} aria-label="Cancel">
        <X size={22} />
      </button>

      <div className={`note-sheet ${closing ? 'is-closing' : ''}`}>
        <div className="note-edit-header">
          {allowTypeChange ? (
            <div className="entry-type-toggle">
              <button
                type="button"
                className={`entry-type-btn ${!formData.isJournal ? 'is-active' : ''}`}
                onClick={() => setFormData((f) => ({ ...f, isJournal: false }))}
              >
                <StickyNote size={12} />
                Note
              </button>
              <button
                type="button"
                className={`entry-type-btn ${formData.isJournal ? 'is-active' : ''}`}
                onClick={() => setFormData((f) => ({ ...f, isJournal: true }))}
              >
                <BookOpen size={12} />
                Journal
              </button>
            </div>
          ) : (
            <span className="entry-type-static">
              <StickyNote size={12} />
              Note
            </span>
          )}
        </div>

        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
          placeholder="Note Title"
          className="note-edit-title-input"
          autoFocus
        />

        <div className="note-sheet-scroll" style={{ flex: 1, marginTop: '10px' }}>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
            placeholder="Write your note..."
            className="note-edit-textarea"
            style={{ minHeight: '120px' }}
          />

          {/* Mood & Tags */}
          <div className="note-edit-extras">
            <div className="note-extra-row">
              <span className="note-extra-label">Mood</span>
              <MoodPicker
                value={formData.mood}
                onChange={(mood) => setFormData((f) => ({ ...f, mood }))}
              />
            </div>
            <div className="note-extra-row">
              <span className="note-extra-label">Tags</span>
              <TagInput
                tags={formData.tags}
                onChange={(tags) => setFormData((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
        </div>

        {/* Media attachment icons — always visible at bottom of sheet */}
        <div className="note-media-field-wrap" style={{ flexShrink: 0, marginTop: 0, paddingTop: '10px' }}>
          <MediaAttachmentsField
            attachmentUrl={formData.attachmentUrl}
            onAttachmentUrlChange={(value) => setFormData((f) => ({ ...f, attachmentUrl: value }))}
            voiceNoteUrl={formData.voiceNoteUrl}
            onVoiceNoteUrlChange={(value) => setFormData((f) => ({ ...f, voiceNoteUrl: value }))}
          />
        </div>
      </div>

      <div className="entry-action-bar">
        <button type="button" className="entry-btn entry-btn-ghost entry-btn-close" onClick={handleClose}>
          <X size={16} />
          <span>Cancel</span>
        </button>
        <button
          type="button"
          className="entry-btn entry-btn-primary"
          onClick={handleSave}
          disabled={isSaving || !formData.content.trim()}
        >
          <Check size={16} />
          <span>{isSaving ? 'Saving...' : mode === 'create' ? 'Create Note' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
}