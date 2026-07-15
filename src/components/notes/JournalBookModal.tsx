import React, { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Edit3, Trash2, X, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { NoteDTO } from '../../types';
import { MediaPreview } from '../media/MediaPreview';

interface JournalBookModalProps {
  note: NoteDTO;
  originRect?: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const Page = forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
  ({ className, children }, ref) => (
    <div className={className} ref={ref} style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
      {children}
    </div>
  )
);
Page.displayName = 'Page';

function paginateContent(content: string, maxCharsPerPage = 420): string[] {
  if (!content) return [''];

  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  const pages: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) pages.push(current.trim());
    current = '';
  };

  for (const para of paragraphs) {
    if ((current ? current + '\n\n' + para : para).length <= maxCharsPerPage) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }

    const words = para.split(/\s+/);
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxCharsPerPage) {
        pushCurrent();       // push exactly once
        current = word;      // start the new page with this word
      } else {
        current = candidate;
      }
    }
  }
  pushCurrent();

  return pages.length ? pages : [''];
}

export function JournalBookModal({ note, originRect, onClose, onEdit, onDelete }: JournalBookModalProps) {
  const bookRef = useRef<any>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const FlipBook = HTMLFlipBook as any;

  const journalDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const lastUpdated = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // One unique chunk per physical page — no pairing, no duplication
  const contentPages = useMemo(() => paginateContent(note.content), [note.content]);
  const hasMediaPage = Boolean(note.attachmentUrl || note.voiceNoteUrl);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !originRect) return;

    const finalRect = stage.getBoundingClientRect();
    if (finalRect.width === 0 || finalRect.height === 0) return;

    const dx = originRect.left + originRect.width / 2 - (finalRect.left + finalRect.width / 2);
    const dy = originRect.top + originRect.height / 2 - (finalRect.top + finalRect.height / 2);
    const sx = originRect.width / finalRect.width;
    const sy = originRect.height / finalRect.height;

    stage.style.transition = 'none';
    stage.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    stage.style.opacity = '0.4';

    void stage.offsetWidth;

    requestAnimationFrame(() => {
      stage.style.transition = 'transform 0.55s var(--ease-book), opacity 0.4s ease';
      stage.style.transform = 'translate(0, 0) scale(1, 1)';
      stage.style.opacity = '1';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const growTimer = requestAnimationFrame(() => setMounted(true));
    const flipTimer = setTimeout(() => {
      try {
        bookRef.current?.pageFlip()?.flipNext();
      } catch {
        /* library not ready yet */
      }
    }, 650);

    return () => {
      cancelAnimationFrame(growTimer);
      clearTimeout(flipTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleClose = () => {
    setClosing(true);

    const stage = stageRef.current;
    if (stage && originRect) {
      const finalRect = stage.getBoundingClientRect();
      const dx = originRect.left + originRect.width / 2 - (finalRect.left + finalRect.width / 2);
      const dy = originRect.top + originRect.height / 2 - (finalRect.top + finalRect.height / 2);
      const sx = originRect.width / finalRect.width;
      const sy = originRect.height / finalRect.height;

      stage.style.transition = 'transform 0.32s ease-in, opacity 0.28s ease-in';
      stage.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      stage.style.opacity = '0.3';
    }

    setTimeout(onClose, 320);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  return (
    <div
      className={`journal-overlay ${mounted ? 'is-mounted' : ''} ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={note.title || 'Journal entry'}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button className="entry-close-btn entry-close-btn--desktop" onClick={handleClose} aria-label="Close journal">
        <X size={22} />
      </button>

      <div
        className={`journal-book-stage ${originRect ? 'journal-book-stage--flip' : ''}`}
        ref={stageRef}
      >
        <FlipBook
            width={420}
            height={580}
            size="stretch"
            minWidth={260}
            maxWidth={560}
            minHeight={360}
            maxHeight={720}
            showCover={true}
            usePortrait
            mobileScrollSupport
            drawShadow
            maxShadowOpacity={0.6}
            flippingTime={650}
            startPage={0}
            startZIndex={0}
            autoSize={true}
            clickEventForward={true}
            useMouseEvents={true}
            className="journal-flipbook"
            ref={bookRef}
            style={{}}
>

          {/* Fake front cover using CSS class (not library cover) */}
          <Page className="rpf-page rpf-cover rpf-cover-front">
            <div className="journal-cover-face">
              <span className="journal-cover-kicker">Journal</span>
              <div className="journal-cover-rule" />
              <h2 className="journal-cover-title">{note.title || 'Untitled Entry'}</h2>
              <span className="journal-cover-date">{journalDate}</span>
              <div className="journal-cover-corner journal-cover-corner-tl" />
              <div className="journal-cover-corner journal-cover-corner-tr" />
              <div className="journal-cover-corner journal-cover-corner-bl" />
              <div className="journal-cover-corner journal-cover-corner-br" />
            </div>
          </Page>

          {/* One unique chunk per page — no left/right columns */}
          {contentPages.map((chunk, i) => (
            <Page className="rpf-page rpf-content" key={`content-${i}`}>
              <div className="journal-paper-face">
                {i === 0 && (
                  <>
                    <span className="journal-header-date">{journalDate}</span>
                    {note.title && <h2 className="journal-header-title">{note.title}</h2>}
                  </>
                )}
                <div className="journal-paper-scroll">
                  <p className="journal-text">{chunk}</p>
                </div>
                <div className="journal-paper-footer">
                  {i === 0 ? (
                    <Badge variant="accent" size="sm">
                      Journal Entry
                    </Badge>
                  ) : (
                    <span className="journal-footer-date">
                      <Calendar size={11} />
                      Updated {lastUpdated}
                    </span>
                  )}
                  <span className="journal-page-number">
                    Page {i + 1} of {contentPages.length}
                  </span>
                </div>
              </div>
            </Page>
          ))}

          {(note.attachmentUrl || note.voiceNoteUrl) && (
            <Page className="rpf-page rpf-content" key="media">
              <div className="journal-paper-face">
                <span className="journal-header-date">Attachments</span>
                <h2 className="journal-header-title">Linked media</h2>
                <div className="journal-paper-scroll space-y-4">
                  <MediaPreview
                    attachmentUrl={note.attachmentUrl}
                    voiceNoteUrl={note.voiceNoteUrl}
                    compact
                  />
                </div>
              </div>
            </Page>
          )}

          {/* Fake back cover */}
          <Page className="rpf-page rpf-cover rpf-cover-back">
            <div className="journal-cover-face journal-cover-face-back">
              <div className="journal-cover-rule" />
              <span className="journal-cover-endnote">— end of entry —</span>
            </div>
          </Page>
        </FlipBook>
      </div>

      <div className="entry-action-bar">
        <button type="button" className="entry-btn entry-btn-danger" onClick={onDelete}>
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
        <button type="button" className="entry-btn entry-btn-primary" onClick={onEdit}>
          <Edit3 size={16} />
          <span>Edit Entry</span>
        </button>
        <button type="button" className="entry-btn entry-btn-ghost entry-btn-close" onClick={handleClose}>
          <X size={16} />
          <span>Close</span>
        </button>
      </div>
    </div>
  );
}
