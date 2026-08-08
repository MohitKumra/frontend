import React, {
  Component,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Edit3, Trash2, X, Calendar, Bookmark } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { NoteDTO } from '../../types';
import { MediaPreview } from '../media/MediaPreview';
import { useUpdateNote } from '../../features/notes/hooks/useNotes';

interface JournalBookModalProps {
  note: NoteDTO;
  originRect?: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function paginateContent(content: string, maxCharsPerPage = 220): string[] {
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
        pushCurrent();
        current = word;
      } else {
        current = candidate;
      }
    }
  }
  pushCurrent();

  return pages.length ? pages : [''];
}

/** Simple paper-style journal rendering - no flipbook library needed */
function JournalPaperView({
  note,
  journalDate,
  lastUpdated,
}: {
  note: NoteDTO;
  journalDate: string;
  lastUpdated: string;
}) {
  const contentPages = useMemo(() => paginateContent(note.content), [note.content]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'var(--journal-paper)',
        backgroundImage: `
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139,111,71,0.03) 2px, rgba(139,111,71,0.03) 4px),
        radial-gradient(circle at 15% 15%, rgba(212,175,55,0.06), transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(92,64,51,0.05), transparent 45%)
      `,
        boxShadow: 'inset 0 0 40px rgba(92,64,51,0.12), 0 30px 60px rgba(0,0,0,0.55)',
        maxWidth: '560px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Spine effect */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '14px',
          background: 'linear-gradient(90deg, var(--journal-darker), var(--journal-dark))',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5), 2px 0 8px rgba(0,0,0,0.25)',
          zIndex: 1,
        }}
      />

      {/* Cover header */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '32px 10% 24px',
          background: 'var(--journal-darker)',
          backgroundImage: 'var(--leather-texture)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <span
          style={{
            color: 'var(--journal-gold)',
            fontFamily: 'Georgia, serif',
            fontSize: '11px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          Journal
        </span>
        <div
          style={{
            width: '48px',
            height: '2px',
            margin: '12px 0 16px',
            background: 'linear-gradient(90deg, transparent, var(--journal-gold), transparent)',
            opacity: 0.8,
          }}
        />
        <h2
          style={{
            color: 'var(--journal-gold)',
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            fontSize: 'clamp(18px, 3vw, 24px)',
            lineHeight: 1.3,
            textShadow: '2px 2px 6px rgba(0,0,0,0.5)',
            margin: 0,
          }}
        >
          {note.title || 'Untitled Entry'}
        </h2>
        <span
          style={{
            color: 'var(--journal-light)',
            fontFamily: 'Georgia, serif',
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginTop: '12px',
            opacity: 0.75,
          }}
        >
          {journalDate}
        </span>
      </div>

      {/* Content area */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          overflowY: 'auto',
          padding: '20px 10%',
        }}
      >
        {contentPages.map((chunk, i) => (
          <div key={i} style={{ marginBottom: i < contentPages.length - 1 ? '24px' : 0 }}>
            {i === 0 && (
              <div style={{ marginBottom: '14px' }}>
                <span
                  style={{
                    color: 'var(--journal-accent)',
                    fontFamily: 'Georgia, serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  {journalDate}
                </span>
                {note.title && (
                  <h2
                    style={{
                      color: 'var(--journal-dark)',
                      fontFamily: 'Georgia, serif',
                      fontWeight: 700,
                      fontSize: 'clamp(16px, 2.5vw, 20px)',
                      margin: '8px 0 0',
                    }}
                  >
                    {note.title}
                  </h2>
                )}
              </div>
            )}
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                color: 'var(--journal-text)',
                fontSize: 'clamp(13px, 1.6vw, 15px)',
                lineHeight: 1.8,
                letterSpacing: '0.3px',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {chunk}
            </p>
          </div>
        ))}

        {(note.attachmentUrl || note.voiceNoteUrl) && (
          <div style={{ marginTop: '20px' }}>
            <span
              style={{
                color: 'var(--journal-accent)',
                fontFamily: 'Georgia, serif',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '10px',
              }}
            >
              Attachments
            </span>
            <MediaPreview attachmentUrl={note.attachmentUrl} voiceNoteUrl={note.voiceNoteUrl} compact />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 10%',
          borderTop: '1px solid rgba(92,64,51,0.2)',
        }}
      >
        <Badge variant="accent" size="sm">
          Journal Entry
        </Badge>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--journal-text)',
            opacity: 0.65,
          }}
        >
          <Calendar size={11} />
          Updated {lastUpdated}
        </span>
      </div>
    </div>
  );
}

const Page = forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
  ({ className, children }, ref) => (
    <div className={className} ref={ref} style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
      {children}
    </div>
  )
);
Page.displayName = 'Page';

// ── Error Boundary ──────────────────────────────────────────────

interface FlipBookBoundaryState {
  hasError: boolean;
}

class FlipBookBoundary extends Component<{ children: React.ReactNode; onFallback: () => void }, FlipBookBoundaryState> {
  constructor(props: { children: React.ReactNode; onFallback: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): FlipBookBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('FlipBookBoundary caught an error:', error, errorInfo);
    this.props.onFallback();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ── FlipBook Content ────────────────────────────────────────────
// Bookmark buttons are intentionally NOT inside flipbook pages because
// react-pageflip intercepts click events for its flip gestures, making
// buttons inside pages unreliable. The bookmark toggle lives in the
// action bar of JournalBookModal instead.

function FlipBookContent({
  note,
  journalDate,
  lastUpdated,
  bookmarkedPage,
  onFlip,
}: {
  note: NoteDTO;
  journalDate: string;
  lastUpdated: string;
  bookmarkedPage: number | null;
  onFlip?: (pageIndex: number) => void;
}) {
  const bookRef = useRef<any>(null);
  const contentPages = useMemo(() => paginateContent(note.content), [note.content]);

  // Auto-flip to bookmarked page (or page 1) after flipbook mounts
  useEffect(() => {
    const targetPage = bookmarkedPage && bookmarkedPage > 0 ? bookmarkedPage : 1;
    const flipTimer = setTimeout(() => {
      try {
        bookRef.current?.pageFlip()?.flip(targetPage);
      } catch (err) {
        console.error('Error flipping page:', err);
      }
    }, 650);
    return () => clearTimeout(flipTimer);
  }, []);

  const FlipBook = HTMLFlipBook as any;

  const bookChildren = React.useMemo(() => {
    const children = [
      // Front Cover
      <div
        className="rpf-page rpf-cover rpf-cover-front"
        key="cover-front"
        style={{ overflow: 'hidden', width: '100%', height: '100%' }}
      >
        <div className="journal-cover-face">
          <span className="journal-cover-kicker">Journal</span>
          <div className="journal-cover-rule" />
          <h2 className="journal-cover-title">{note.title || 'Untitled Entry'}</h2>
          <span className="journal-cover-date">{journalDate}</span>

          {bookmarkedPage && (
            <div className="journal-cover-bookmark-badge">
              <Bookmark size={13} fill="currentColor" />
              <span>Bookmarked Page {bookmarkedPage}</span>
            </div>
          )}

          <div className="journal-cover-corner journal-cover-corner-tl" />
          <div className="journal-cover-corner journal-cover-corner-tr" />
          <div className="journal-cover-corner journal-cover-corner-bl" />
          <div className="journal-cover-corner journal-cover-corner-br" />
        </div>
      </div>,
      // Content Pages
      ...contentPages.map((chunk, i) => {
        const pageNum = i + 1;
        const isBookmarked = bookmarkedPage === pageNum;

        return (
          <div
            className="rpf-page rpf-content"
            key={`content-${i}`}
            style={{ overflow: 'hidden', width: '100%', height: '100%' }}
          >
            <div className="journal-paper-face" style={{ position: 'relative' }}>
              {/* Visual bookmark indicator on bookmarked page */}
              {isBookmarked && (
                <div className="journal-page-bookmark-indicator" aria-label={`Page ${pageNum} is bookmarked`}>
                  <Bookmark size={10} fill="currentColor" />
                </div>
              )}

              <span className="journal-header-date">{journalDate}</span>
              {i === 0 && note.title && <h2 className="journal-header-title">{note.title}</h2>}

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
                  Page {pageNum} of {contentPages.length}
                </span>
              </div>
            </div>
          </div>
        );
      }),
      // Media Page (conditional)
      note.attachmentUrl || note.voiceNoteUrl ? (
        <div className="rpf-page rpf-content" key="media" style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
          <div className="journal-paper-face">
            <span className="journal-header-date">Attachments</span>
            <h2 className="journal-header-title">Linked media</h2>
            <div className="journal-paper-scroll" style={{ padding: '0 8%' }}>
              <MediaPreview attachmentUrl={note.attachmentUrl} voiceNoteUrl={note.voiceNoteUrl} compact />
            </div>
          </div>
        </div>
      ) : null,
      // Back Cover
      <div
        className="rpf-page rpf-cover rpf-cover-back"
        key="cover-back"
        style={{ overflow: 'hidden', width: '100%', height: '100%' }}
      >
        <div className="journal-cover-face journal-cover-face-back">
          <div className="journal-cover-rule" />
          <span className="journal-cover-endnote">— end of entry —</span>
        </div>
      </div>,
    ];
    return children.filter(Boolean);
  }, [note, journalDate, lastUpdated, contentPages, bookmarkedPage]);

  // Handle flipbook page change events
  const handleFlip = useCallback(
    (e: any) => {
      const pageIndex = e?.data ?? e;
      if (typeof pageIndex === 'number' && onFlip) {
        onFlip(pageIndex);
      }
    },
    [onFlip]
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Hanging Satin Bookmark Ribbon Stripe */}
      {bookmarkedPage && (
        <button
          type="button"
          onClick={() => {
            try {
              bookRef.current?.pageFlip()?.flip(bookmarkedPage);
            } catch (e) {
              console.error(e);
            }
          }}
          className="journal-bookmark-ribbon-stripe"
          title={`Click to jump to bookmarked Page ${bookmarkedPage}`}
        >
          <div className="journal-bookmark-ribbon-body">
            <Bookmark size={11} className="journal-ribbon-icon" fill="currentColor" />
            <span className="journal-ribbon-text">{bookmarkedPage}</span>
          </div>
          <div className="journal-bookmark-ribbon-tail" />
        </button>
      )}

      <FlipBook
        width={320}
        height={400}
        size="stretch"
        minWidth={200}
        maxWidth={420}
        minHeight={260}
        maxHeight={500}
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
        onFlip={handleFlip}
      >
        {bookChildren}
      </FlipBook>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export function JournalBookModal({ note, originRect, onClose, onEdit, onDelete }: JournalBookModalProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Bookmark state — owned here, outside the flipbook so clicks always work
  const updateNote = useUpdateNote();
  const [bookmarkedPage, setBookmarkedPage] = useState<number | null>(note.bookmarkPage ?? null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const contentPages = useMemo(() => paginateContent(note.content), [note.content]);
  const totalContentPages = contentPages.length;

  // Current content page number (1-indexed). 0 means cover / back cover.
  const currentContentPage = currentPage >= 1 && currentPage <= totalContentPages ? currentPage : 0;
  const isOnContentPage = currentContentPage > 0;
  const isCurrentPageBookmarked = isOnContentPage && bookmarkedPage === currentContentPage;

  const handleToggleBookmark = () => {
    if (!isOnContentPage) return;
    const newPage = isCurrentPageBookmarked ? null : currentContentPage;
    setBookmarkedPage(newPage);
    updateNote.mutate({ id: note.id, data: { bookmarkPage: newPage } });
  };

  const handleFlip = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, []);

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
    setUseFallback(false);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const growTimer = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(growTimer);
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

      <div className={`journal-book-stage ${originRect ? 'journal-book-stage--flip' : ''}`} ref={stageRef}>
        <FlipBookContent
          note={note}
          journalDate={journalDate}
          lastUpdated={lastUpdated}
          bookmarkedPage={bookmarkedPage}
          onFlip={handleFlip}
        />
      </div>

      <div className="entry-action-bar">
        <button type="button" className="entry-btn entry-btn-danger" onClick={onDelete}>
          <Trash2 size={16} />
          <span>Delete</span>
        </button>

        {/* Bookmark button — outside the flipbook so clicks always work */}
        <button
          type="button"
          className={`entry-btn ${isCurrentPageBookmarked ? 'entry-btn-bookmark-active' : 'entry-btn-bookmark'}`}
          onClick={handleToggleBookmark}
          disabled={!isOnContentPage}
          title={
            !isOnContentPage
              ? 'Flip to a content page to bookmark'
              : isCurrentPageBookmarked
                ? `Remove bookmark from Page ${currentContentPage}`
                : `Bookmark Page ${currentContentPage}`
          }
        >
          <Bookmark size={16} fill={isCurrentPageBookmarked ? 'currentColor' : 'white'} />
          <span>
            {isCurrentPageBookmarked
              ? `Bookmarked Pg ${currentContentPage}`
              : isOnContentPage
                ? `Bookmark Pg ${currentContentPage}`
                : 'Bookmark'}
          </span>
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
