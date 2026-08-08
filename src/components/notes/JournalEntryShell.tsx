import React, { useEffect, useState } from 'react';
import { BookOpen, StickyNote, Check, X } from 'lucide-react';
import type { NoteDTO } from '../../types';
import type { EntryFormState } from './EnteryFormModal';
import { MediaAttachmentsField } from '../media/MediaAttachmentsField';
import { MoodPicker } from './MoodPicker';
import { TagInput } from './TagInput';
import { JournalEntryAnalysis } from './JournalAnalysis';

interface JournalEntryShellProps {
  mode: 'create' | 'edit';
  note?: NoteDTO;
  formData: EntryFormState;
  setFormData: React.Dispatch<React.SetStateAction<EntryFormState>>;
  onSubmit: () => void;
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
  const [closing, setClosing] = useState(false);

  const dateLabel = new Date(note?.updatedAt ?? Date.now()).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
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
      className={`journal-overlay ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? `Edit ${note?.title || 'journal entry'}` : 'New journal entry'}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button className="entry-close-btn entry-close-btn--desktop" onClick={handleClose} aria-label="Cancel">
        <X size={22} />
      </button>

      <div className={`journal-book-stage ${closing ? 'is-closing' : ''}`}>
        <div className="journal-edit-page">
          <div className="journal-edit-header">
            <span className="journal-edit-date">{dateLabel}</span>

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
                <BookOpen size={12} />
                Journal
              </span>
            )}
          </div>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
            placeholder={mode === 'create' ? "Today's entry" : 'Journal Entry Title'}
            className="journal-edit-title-input"
            autoFocus
          />

          <div className="journal-edit-textarea-wrap">
            <textarea
              value={formData.content}
              onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
              placeholder="Dear journal, today I..."
              className="journal-edit-textarea"
              style={{ minHeight: '120px' }}
            />

            {/* Mood & Tags */}
            <div className="note-edit-extras" style={{ marginTop: '16px' }}>
              <div className="note-extra-row">
                <span className="note-extra-label">Mood</span>
                <MoodPicker value={formData.mood} onChange={(mood) => setFormData((f) => ({ ...f, mood }))} />
              </div>
              <div className="note-extra-row">
                <span className="note-extra-label">Tags</span>
                <TagInput tags={formData.tags} onChange={(tags) => setFormData((f) => ({ ...f, tags }))} />
              </div>
            </div>
          </div>

          {/* AI Journal Analysis — analyze after content is written */}
          {formData.content.trim().length > 20 && (
            <div className="journal-media-field-wrap" style={{ flexShrink: 0, marginTop: 4 }}>
              <JournalEntryAnalysis entryContent={formData.content} entryId={note?.id} />
            </div>
          )}

          {/* Media attachment icons — always visible at bottom */}
          <div className="journal-media-field-wrap" style={{ flexShrink: 0, marginTop: 0 }}>
            <MediaAttachmentsField
              attachmentUrl={formData.attachmentUrl}
              onAttachmentUrlChange={(value) => setFormData((f) => ({ ...f, attachmentUrl: value }))}
              voiceNoteUrl={formData.voiceNoteUrl}
              onVoiceNoteUrlChange={(value) => setFormData((f) => ({ ...f, voiceNoteUrl: value }))}
            />
          </div>
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
          <span>{isSaving ? 'Saving...' : mode === 'create' ? 'Save Entry' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
}
