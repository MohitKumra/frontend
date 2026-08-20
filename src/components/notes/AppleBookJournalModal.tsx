import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import {
  Book,
  BookOpen,
  Edit3,
  Trash2,
  X,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Check,
  Sliders,
  Type,
  Palette,
  List,
  Clock,
  FileText,
  Smile,
  Tag,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Quote,
  ListOrdered,
  Highlighter,
  PenTool,
  Undo2,
  Redo2,
  Eraser,
  ChevronDown,
  Pencil,
  Loader2,
} from 'lucide-react';
import type { NoteDTO, CoverStyle, BookStyle } from '../../types';
import toast from 'react-hot-toast';
import { MediaAttachmentsField } from '../media/MediaAttachmentsField';
import { MoodPicker } from './MoodPicker';
import { TagInput } from './TagInput';
import { JournalEntryAnalysis } from './JournalAnalysis';
import {
  clearJournalDraft,
  extractDocumentBlocks,
  loadJournalDraft,
  normalizeDocumentHtml,
  readCompleteDocument,
  saveJournalDraft,
  serializeDocumentBlocks,
  shouldRecoverDraft,
  type JournalDraft,
} from './journalDocument';
import {
  computePageMetrics,
  createPaginationProbe,
  paginateDocument,
  updateProbeFonts,
  type PageMetrics,
  type PaginationFonts,
  type PaginationProbe,
} from './journalPagination';
import { BookCoverPickerModal } from './BookCoverPickerModal';
import { LiveBookCover } from './LiveBookCover';
import type { CoverProcessResult } from '../../lib/coverImageProcessor';
import {
  resolveCoverStyle,
  setCachedCoverStyle,
} from '../../features/notes/coverStyleCache';
import {
  resolveBookStyle,
  setCachedBookStyle,
} from '../../features/notes/bookStyleCache';

export type JournalSaveReason = 'auto' | 'manual' | 'close' | 'cover';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

export type JournalSavePayload = {
  title: string;
  content: string;
  isJournal: boolean;
  mood: NoteDTO['mood'];
  tags: string[];
  attachmentUrl: string;
  voiceNoteUrl: string;
  contentVersion?: number;
  coverStyle: CoverStyle | null;
};

export type BookTheme = 'parchment' | 'sepia' | 'midnight' | 'paper' | 'emerald';
export type BookFont = 'serif' | 'book' | 'sans' | 'script';
export type BookFontSize = 'sm' | 'md' | 'lg' | 'xl';

interface AppleBookJournalModalProps {
  note?: NoteDTO | null;
  initialMode?: 'read' | 'edit';
  originRect?: DOMRect | null;
  allowTypeChange?: boolean;
  onClose: () => void;
  onSave?: (
    data: JournalSavePayload,
    meta?: { reason: JournalSaveReason }
  ) => Promise<NoteDTO | void> | void;
  onDelete?: () => void;
  /**
   * Called whenever the bookmarks array changes (add or remove).
   * The parent is responsible for persisting to the backend and
   * returning (or updating) the refreshed NoteDTO so the modal
   * stays in sync.
   */
  onToggleBookmark?: (bookmarks: import('../../types').Bookmark[]) => Promise<void> | void;
  /**
   * Called when the user uploads a new custom cover.
   * Receives the pre-processed image data — the parent must call
   * notesApi.uploadCover() and return the updated NoteDTO.
   */
  onUploadCover?: (processed: CoverProcessResult) => Promise<NoteDTO | void>;
  /** Called when the user removes the current cover. */
  onRemoveCover?: () => Promise<void>;
  /**
   * Called when the user commits a cover text-style change (font, color, size).
   * The parent persists it to the backend via notesApi.saveCoverStyle() and
   * returns (or updates) the refreshed NoteDTO so the modal stays in sync.
   */
  onSaveCoverStyle?: (coverStyle: CoverStyle | null) => Promise<NoteDTO | void> | void;
  /**
   * Called when the user commits a reader-side book style change (theme, font,
   * fontSize). The parent persists it to the backend via notesApi.saveBookStyle()
   * and returns (or updates) the refreshed NoteDTO so the modal stays in sync.
   */
  onSaveBookStyle?: (bookStyle: BookStyle | null) => Promise<NoteDTO | void> | void;
  isSaving?: boolean;
  /** When true, persist the current editor contents before the modal closes (used by the read-book flow). */
  autoSaveOnClose?: boolean;
}

const THEMES: { id: BookTheme; name: string; bg: string; text: string; accent: string; paper: string }[] = [
  { id: 'parchment', name: 'Classic Parchment', bg: '#3a281c', text: '#3e2723', accent: '#c19a6b', paper: '#f4e8d8' },
  { id: 'sepia', name: 'Vintage Sepia', bg: '#2d1f17', text: '#3c2415', accent: '#d48839', paper: '#eee1ce' },
  { id: 'midnight', name: 'Midnight Library', bg: '#0b1120', text: '#e2e8f0', accent: '#6366f1', paper: '#1e293b' },
  { id: 'paper', name: 'Modern Paper', bg: '#1f2937', text: '#1e293b', accent: '#3b82f6', paper: '#ffffff' },
  { id: 'emerald', name: 'Emerald Linen', bg: '#0f291e', text: '#1a382b', accent: '#10b981', paper: '#e8f4ed' },
];

const FONTS: { id: BookFont; name: string; css: string }[] = [
  { id: 'serif', name: 'Classic Serif', css: "Georgia, 'Times New Roman', serif" },
  { id: 'book', name: 'Baskerville', css: "Baskerville, 'Garamond', 'Palatino Linotype', serif" },
  { id: 'sans', name: 'Modern UI', css: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { id: 'script', name: 'Handwritten Script', css: "'Caveat', 'Comic Sans MS', cursive" },
];

const FONT_SIZES: Record<BookFontSize, { sizePx: number; leading: number }> = {
  sm: { sizePx: 13, leading: 1.6 },
  md: { sizePx: 15, leading: 1.75 },
  lg: { sizePx: 18, leading: 1.85 },
  xl: { sizePx: 21, leading: 1.95 },
};

/** Shared bookmark colour → hex map used across the cover picker, page tab and TOC */
const BOOKMARK_COLORS: Record<string, string> = {
  red:    '#c0392b',
  yellow: '#d4a017',
  blue:   '#2563eb',
  green:  '#16a34a',
  purple: '#7c3aed',
} as const;

/**
 * Render journal content for the read view.
 *
 * Content is stored as raw innerHTML from the contentEditable editor, so it
 * already contains properly-formatted HTML including:
 *   - <span style="background-color:#fef08a">highlighted text</span>
 *   - <strong>, <em>, <u>, <del>, <h2>, <h3>, <blockquote>, <ul>, <li>
 *
 * We render it verbatim via dangerouslySetInnerHTML so highlights and all
 * other rich formatting survive the read → edit → read round-trip unchanged.
 * Plain-text content (no HTML tags) is also handled — newlines become
 * paragraph breaks.
 */
function parseFormattedContent(content: string): React.ReactNode {
  if (!content) return null;

  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    // Rich HTML from the editor — render as-is, preserving all inline styles
    // (highlight spans, bold, italic, headings, etc.)
    return (
      <div
        className="apple-book-rich-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Plain text — split on blank lines and render each block as a paragraph
  return content
    .split(/\n{2,}/)
    .filter((b) => b.trim())
    .map((block, idx) => (
      <p key={idx} className="apple-book-paragraph">
        {block.replace(/\n/g, ' ')}
      </p>
    ));
}

/** Flippable Page component for 3D Reading Mode */
const FlippableBookPage = React.forwardRef<
  HTMLDivElement,
  {
    pageNumber: number;
    totalPages: number;
    title?: string;
    dateLabel: string;
    shortDate: string;
    content: string;
    isJournal: boolean;
    wordCount: number;
    /** If set, renders a coloured ribbon bookmark tab on the top-right corner */
    bookmarkColor?: import('../../types').BookmarkColor;
    /** Called with the inner page element so the parent can measure real page dimensions */
    onInnerMount?: (el: HTMLDivElement | null) => void;
    /** Called with the page-body element so the parent can measure available text height */
    onBodyMount?: (el: HTMLDivElement | null) => void;
  }
>((props, ref) => {
  // Map BookmarkColor → CSS custom-property value used by the tab
  const tabColor = props.bookmarkColor ? BOOKMARK_COLORS[props.bookmarkColor] : null;

  return (
    <div className="apple-book-flip-page" ref={ref} data-density="soft">
      <div className="apple-book-page-inner" ref={props.onInnerMount}>
        {/* ── Bookmark ribbon tab ────────────────────────────────────── */}
        {tabColor && (
          <div
            className="apple-book-page-bookmark-tab"
            style={{ '--bm-color': tabColor } as React.CSSProperties}
            title={`Bookmarked page ${props.pageNumber}`}
          />
        )}

        <div className="apple-book-page-header">
          <span className="apple-book-page-date">{props.dateLabel}</span>
          <span className="apple-book-header-tag">{props.isJournal ? 'JOURNAL' : 'NOTES'}</span>
        </div>

        {props.pageNumber === 1 && (
          <div className="apple-book-title-area">
            <h2 className="apple-book-page-title">{props.title || 'Daily Reflection'}</h2>
          </div>
        )}

        <div className="apple-book-page-body" ref={props.onBodyMount}>
          <div className="apple-book-text-content">
            {props.content.trim() ? (
              parseFormattedContent(props.content)
            ) : (
              <div className="apple-book-empty-lines">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="apple-book-guided-line" />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="apple-book-page-footer">
          <span className="apple-book-footer-info">{props.pageNumber > 0 ? props.shortDate : ''}</span>
          <span className="apple-book-page-number">
            {props.pageNumber > 0 ? `Page ${props.pageNumber} of ${props.totalPages}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
});

FlippableBookPage.displayName = 'FlippableBookPage';

/**
 * Recursively remove background-color highlight styling from a node tree.
 * Unwraps plain <span>/<mark> highlight wrappers once they have no styling
 * left, so removing a highlight never leaves empty/format-less shells behind.
 * Used by the (safe) manual highlighter in place of the unreliable
 * `document.execCommand('hiliteColor')` which could wipe the whole editor.
 */
function stripBackground(node: Node): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  for (const child of Array.from(node.childNodes)) {
    stripBackground(child);
  }
  const el = node as HTMLElement;
  let removed = false;
  if (el.style && el.style.backgroundColor) {
    el.style.backgroundColor = '';
    removed = true;
  }
  if (removed && (el.tagName === 'SPAN' || el.tagName === 'MARK') && !el.style.length) {
    el.replaceWith(...Array.from(el.childNodes));
  }
}

/**
 * Duplicate utility functions have been removed.
 * We now use the proper implementations from:
 * - journalDocument.ts: normalizeDocumentHtml(), extractDocumentBlocks()
 * - journalPagination.ts: createPaginationProbe(), paginateDocument()
 */

export function AppleBookJournalModal({
  note,
  initialMode = 'read',
  originRect,
  allowTypeChange = false,
  onClose,
  onSave,
  onDelete,
  onToggleBookmark,
  onUploadCover,
  onRemoveCover,
  onSaveCoverStyle,
  onSaveBookStyle,
  isSaving = false,
  autoSaveOnClose = false,
}: AppleBookJournalModalProps) {
  const [mode, setMode] = useState<'read' | 'edit'>(initialMode);
  const [closing, setClosing] = useState(false);
  const [theme, setTheme] = useState<BookTheme>(
    (resolveBookStyle(note?.id, note?.bookStyle)?.theme as BookTheme) ?? 'parchment',
  );
  const [font, setFont] = useState<BookFont>(
    (resolveBookStyle(note?.id, note?.bookStyle)?.font as BookFont) ?? 'serif',
  );
  const [fontSize, setFontSize] = useState<BookFontSize>(
    (resolveBookStyle(note?.id, note?.bookStyle)?.fontSize as BookFontSize) ?? 'md',
  );
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [showTOC, setShowTOC] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  // Open directly in the editor for the create/edit flow; otherwise start on
  // the cover (read flow opens the book from there).
  const [showCover, setShowCover] = useState(initialMode !== 'edit');
  // 'idle' | 'opening' | 'closing' — drives the CSS open/close animations
  const [coverOpening, setCoverOpening] = useState<'idle' | 'opening' | 'closing'>('idle');
  // Only the very first cover mount plays the drift-in animation; after the
  // book has opened once, remounts (on close) should not re-trigger it.
  const [hasAnimatedCoverEnter, setHasAnimatedCoverEnter] = useState(false);
  // True while the book is still measuring/paginating. The open animation is
  // deferred until `paginationReady`; meanwhile "Opening…" is shown on the
  // cover so the book never appears stuck mid-animation.
  const [pendingOpen, setPendingOpen] = useState(false);
  const [showExtrasDrawer, setShowExtrasDrawer] = useState(false);

  // ── Cover picker state ─────────────────────────────────────────────────
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    resolveCoverStyle(note?.id, note?.coverStyle)?.templateId || null,
  );
  // Local cover URL — updated optimistically on upload success
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(note?.coverUrl ?? null);
  // Cover typography / style customization — edited via the Text Style tab and
  // applied live to the rendered cover, persisted on save. Initialized from the
  // fast localStorage cache (falls back to the note's DB value) so the cover
  // opens with the right style immediately.
  const [coverStyle, setCoverStyle] = useState<CoverStyle | null>(
    resolveCoverStyle(note?.id, note?.coverStyle),
  );

  // Keep localCoverUrl in sync when the note prop changes (e.g. after a save)
  React.useEffect(() => {
    setLocalCoverUrl(note?.coverUrl ?? null);
  }, [note?.id, note?.coverUrl]);

  // Keep coverStyle in sync when the note prop changes (e.g. after a save).
  // Read the fast localStorage cache first (if present) so the cover opens
  // instantly without waiting on a DB round-trip for the style.
  React.useEffect(() => {
    const cached = resolveCoverStyle(note?.id, note?.coverStyle);
    setCoverStyle(cached);
    setSelectedTemplateId(cached?.templateId || note?.coverStyle?.templateId || null);
  }, [note?.id, note?.coverStyle]);

  // Keep the localStorage cache fresh whenever the cover style changes so the
  // cache always matches what the user last customized (mirrors backend).
  React.useEffect(() => {
    if (!note?.id) return;
    setCachedCoverStyle(note.id, {
      ...(coverStyle ?? {}),
      templateId: selectedTemplateId ?? '',
    } as CoverStyle);
  }, [note?.id, coverStyle, selectedTemplateId]);

  // ── Reader-side book style (theme / font / fontSize) persistence ─────────
  // Debounced timer so swiping through appearance options doesn't fire a
  // backend request on every click.
  const bookStyleSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate reader-side appearance from the fast cache (falls back to the
  // note's DB value) whenever the note changes, so the pages open correctly.
  React.useEffect(() => {
    const bs = resolveBookStyle(note?.id, note?.bookStyle);
    setTheme((bs?.theme as BookTheme) ?? 'parchment');
    setFont((bs?.font as BookFont) ?? 'serif');
    setFontSize((bs?.fontSize as BookFontSize) ?? 'md');
  }, [note?.id, note?.bookStyle]);

  // Keep the book-style cache fresh whenever the appearance changes.
  React.useEffect(() => {
    if (!note?.id) return;
    setCachedBookStyle(note.id, { theme, font, fontSize });
  }, [note?.id, theme, font, fontSize]);

  // Apply an appearance change optimistically (instant UI), write the local
  // cache immediately, and debounce the backend save so it never feels laggy.
  const updateBookStyle = React.useCallback(
    (patch: Partial<BookStyle>) => {
      setTheme((t) => (patch.theme as BookTheme) ?? t);
      setFont((f) => (patch.font as BookFont) ?? f);
      setFontSize((s) => (patch.fontSize as BookFontSize) ?? s);
      if (!note?.id || !onSaveBookStyle) return;
      const next: BookStyle = { theme, font, fontSize, ...patch };
      if (bookStyleSaveTimerRef.current) clearTimeout(bookStyleSaveTimerRef.current);
      bookStyleSaveTimerRef.current = setTimeout(() => {
        void Promise.resolve(onSaveBookStyle(next)).catch((err) => {
          console.error('[AppleBookJournal] Save book style failed:', err);
        });
      }, 500);
    },
    [theme, font, fontSize, note?.id, onSaveBookStyle],
  );

  // coverFaceStyle, activeCoverStyle, and cs are computed inside LiveBookCover.

  // ── Bookmark state — seeded from note prop, updated optimistically on toggle ──
  const [bookmarks, setBookmarks] = useState<import('../../types').Bookmark[]>(
    () => note?.bookmarks ?? []
  );
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  // Toast shown when user tries to add a 6th bookmark
  const [bookmarkLimitToast, setBookmarkLimitToast] = useState(false);
  // Picker shown on the cover when there are multiple bookmarks
  const [bookmarkPickerOpen, setBookmarkPickerOpen] = useState(false);

  // Keep bookmarks in sync if the note prop changes (e.g. after a save)
  // Only update when note.id changes or bookmarks array reference changes
  // to avoid overwriting an optimistic update with stale data.
  React.useEffect(() => {
    if (note?.bookmarks !== undefined) {
      setBookmarks(note.bookmarks);
    }
  }, [note?.id, note?.bookmarks]);

  // Auto-dismiss the bookmark limit toast after 3 s
  React.useEffect(() => {
    if (!bookmarkLimitToast) return;
    const t = setTimeout(() => setBookmarkLimitToast(false), 3000);
    return () => clearTimeout(t);
  }, [bookmarkLimitToast]);

  // Form State for Book Content — always complete journal document
  const [formData, setFormData] = useState({
    title: note?.title ?? '',
    content: note?.content ?? '',
    isJournal: note?.isJournal ?? true,
    mood: note?.mood ?? null,
    tags: note?.tags ?? [],
    attachmentUrl: note?.attachmentUrl ?? '',
    voiceNoteUrl: note?.voiceNoteUrl ?? '',
  });

  // Save state tracking for autosave
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [contentVersion, setContentVersion] = useState(note?.contentVersion ?? 1);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the content has unsaved edits since the last save, so closing
  // the book can prompt the user to save or discard (there is no autosave).
  const isDirtyRef = useRef(false);

  // On mobile (narrow screens) cap the page height so it never fills the whole
  // viewport — roughly 55 % of screen height keeps both bars visible with room.
  const calcDimensions = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 640;
    const w = Math.min(500, Math.max(300, Math.floor((vw - 100) / 2)));
    const h = isMobile
      ? Math.min(420, Math.max(300, Math.floor(vh * 0.55)))
      : Math.min(620, Math.max(380, Math.floor(vh - 170)));
    return { width: w, height: h };
  };

  const [dimensions, setDimensions] = useState(calcDimensions);

  // Always keep a stable ref to the latest note content so the editor seed
  // callback never closes over a stale value — the ref is updated on every
  // render, so whenever setEditorRef fires it reads the current note.
  const noteContentRef = useRef<string>(note?.content ?? '');
  noteContentRef.current = formData.content || note?.content || '';

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title ?? '',
        content: note.content ?? '',
        isJournal: note.isJournal ?? true,
        mood: note.mood ?? null,
        tags: note.tags ?? [],
        attachmentUrl: note.attachmentUrl ?? '',
        voiceNoteUrl: note.voiceNoteUrl ?? '',
      });
      setContentVersion(note.contentVersion ?? 1);
      setSaveStatus('idle');
    }
  }, [note]);

  // Called by React when the contentEditable div mounts (mode switches to edit).
  // Reads from noteContentRef — always current, never stale.
  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node) {
      node.innerHTML = noteContentRef.current;
    }
  // noteContentRef is a ref — stable identity, no need in deps array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the note prop changes while the editor is already mounted (e.g. after
  // a successful save returns fresh data from the server), re-seed the DOM so
  // the editor always shows the authoritative server content.
  useEffect(() => {
    const el = editorRef.current;
    if (el && note?.content !== undefined) {
      el.innerHTML = note.content ?? '';
    }
  }, [note?.content]);

  const [pages, setPages] = useState<string[]>(['']);
  const leftPageRef = useRef<HTMLDivElement | null>(null);
  const pageBodyRef = useRef<HTMLDivElement | null>(null);
  const probeRef = useRef<PaginationProbe | null>(null);
  const flipBookRef = useRef<any>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // ── Page-flip sound ───────────────────────────────────────────────────────
  const pageFlipAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio('/sounds/page-flip.mp3');
    audio.preload = 'auto';
    audio.volume = 0.45;
    pageFlipAudioRef.current = audio;
    return () => {
      audio.pause();
      pageFlipAudioRef.current = null;
    };
  }, []);

  const playPageFlip = useCallback(() => {
    const audio = pageFlipAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {/* autoplay blocked — ignore */});
  }, []);
  // Set to true while applyHighlight / applyBlockFormat are mutating the DOM
  // so the onInput handler ignores the spurious input event those ops fire.
  const suppressInputRef = useRef(false);
  // Debounce timer for onInput — avoids re-paginating on every single keystroke.
  const inputDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Pagination readiness gate ──────────────────────────────────────────────
  // The HTMLFlipBook must only mount ONCE with the correct final page set.
  // Phase 1: render one invisible probe page to capture live DOM measurements.
  // Phase 2: once both refs (inner + body) are populated, run a final pagination
  //   pass then swap in the real flip book. This eliminates the first-flip
  //   flicker caused by mounting with fallback geometry metrics.
  const [paginationReady, setPaginationReady] = useState(false);
  // Counts how many of the two probe refs (inner + body) have fired.
  const refsPopulatedCountRef = useRef(0);
  // When opening to a specific bookmark, store the target spread here so the
  // useEffect below can flip to it once paginationReady fires.
  const openToSpreadRef = useRef<number | null>(null);

  const activeThemeConfig = useMemo(() => THEMES.find((t) => t.id === theme) ?? THEMES[0], [theme]);
  const activeFontConfig = useMemo(() => FONTS.find((f) => f.id === font) ?? FONTS[0], [font]);
  const activeSizeConfig = useMemo(() => FONT_SIZES[fontSize], [fontSize]);

  const dateLabel = useMemo(() => {
    return new Date(note?.updatedAt ?? Date.now()).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [note?.updatedAt]);

  const shortDate = useMemo(() => {
    return new Date(note?.updatedAt ?? Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [note?.updatedAt]);

  useEffect(() => {
    const fonts: PaginationFonts = {
      fontFamily: activeFontConfig.css,
      fontSizePx: activeSizeConfig.sizePx,
      lineHeight: activeSizeConfig.leading,
    };
    const probe = createPaginationProbe(fonts);
    probeRef.current = probe;
    return () => {
      probe.dispose();
      probeRef.current = null;
    };
  }, [activeFontConfig.css, activeSizeConfig.sizePx, activeSizeConfig.leading]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      // Clean up autosave timer
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (inputDebounceRef.current) {
        clearTimeout(inputDebounceRef.current);
      }
    };
  }, []);

  const recalculatePagination = useCallback(() => {
    const html = normalizeDocumentHtml(formData.content || '');
    if (!html.trim()) {
      setPages(['']);
      // Empty/blank journals still need to be "ready" so the measurement probe
      // unmounts (otherwise its refs keep firing and the open animation hangs).
      if (leftPageRef.current && pageBodyRef.current) {
        setPaginationReady(true);
      }
      return;
    }

    const probe = probeRef.current;
    const pageWidth = Math.max(300, Math.min(540, leftPageRef.current?.clientWidth ?? dimensions.width));
    const pageHeight = Math.max(360, Math.min(640, dimensions.height));

    if (!probe) {
      setPages([html]);
      return;
    }

    updateProbeFonts(probe, {
      fontFamily: activeFontConfig.css,
      fontSizePx: activeSizeConfig.sizePx,
      lineHeight: activeSizeConfig.leading,
    });

    const metrics = computePageMetrics({
      pageWidth,
      pageHeight,
      liveInner: leftPageRef.current,
      liveBody: pageBodyRef.current,
      hasTitle: true,
    });

    const paginatedResult = paginateDocument(probe, html, metrics);
    setPages(paginatedResult);
    // Mark ready only after using live DOM refs — the authoritative page set
    // the flip book should mount with (never the fallback-geometry first pass).
    if (leftPageRef.current && pageBodyRef.current) {
      setPaginationReady(true);
    }
  }, [formData.content, dimensions.width, dimensions.height, activeFontConfig.css, activeSizeConfig.sizePx, activeSizeConfig.leading]);

  // Stable page-measurement ref callbacks. MUST be memoized + null-guarded:
  // inline arrow refs are recreated every render, so React re-invokes them
  // (null, then element) on every render; combined with recalculatePagination()
  // calling setState that produced a "Maximum update depth exceeded" infinite
  // loop — especially on empty journals where the probe never unmounts.
  const handleInnerMount = useCallback(
    (el: HTMLDivElement | null) => {
      leftPageRef.current = el;
      if (!el) return; // unmount — don't count or repaginate
      refsPopulatedCountRef.current += 1;
      if (refsPopulatedCountRef.current >= 2) {
        recalculatePagination();
      }
    },
    [recalculatePagination],
  );
  const handleBodyMount = useCallback(
    (el: HTMLDivElement | null) => {
      pageBodyRef.current = el;
      if (!el) return;
      refsPopulatedCountRef.current += 1;
      if (refsPopulatedCountRef.current >= 2) {
        recalculatePagination();
      }
    },
    [recalculatePagination],
  );

  useEffect(() => {
    recalculatePagination();
  }, [recalculatePagination]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions(calcDimensions());
      // No manual recalculatePagination() call needed — setDimensions triggers
      // a re-render which changes the recalculatePagination dep and the
      // useEffect([recalculatePagination]) fires automatically.
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Root cause: the first flip was happening before the read-mode pagination had
  // settled. That delayed reflow changed the page set mid-animation and caused
  // the 3D book to visually tighten and re-layout. We now compute the pages as
  // soon as the read book mounts, before the user can interact with it.
  useLayoutEffect(() => {
    if (mode !== 'read' || showCover) return;
    recalculatePagination();
  }, [mode, showCover, recalculatePagination]);

  useEffect(() => {
    if (mode === 'read') {
      recalculatePagination();
    }
  }, [mode, theme, font, fontSize, recalculatePagination]);

  const flipBookPages = useMemo(() => {
    const list = pages.length > 0 ? [...pages] : [formData.content || ''];
    if (list.length % 2 !== 0) {
      list.push('');
    }
    return list;
  }, [pages, formData.content]);

  const totalPages = pages.length;
  const totalSpreads = Math.ceil(totalPages / 2);

  useEffect(() => {
    if (!showCover && spreadIndex > Math.max(0, totalSpreads - 1)) {
      setSpreadIndex(Math.max(0, totalSpreads - 1));
    }
  }, [showCover, spreadIndex, totalSpreads]);

  const leftPageIndex = spreadIndex * 2;
  const rightPageIndex = spreadIndex * 2 + 1;

  // Is the left page of the current spread already bookmarked?
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === leftPageIndex + 1);

  const leftPageText = pages[leftPageIndex] ?? '';
  const rightPageText = pages[rightPageIndex] ?? '';

  // Build the payload from the live editor DOM first, falling back to state.
  // This guarantees the exact text the user sees (including any edits that
  // haven't propagated to React state yet) is what gets sent to the backend.
  // CRITICAL: Always includes the complete document + contentVersion for
  // stale-request protection.
  const buildSavePayload = (): JournalSavePayload => {
    const raw = editorRef.current?.innerHTML ?? formData.content;
    const normalized = normalizeDocumentHtml(raw) || raw || '';
    return {
      ...formData,
      content: normalized,
      contentVersion,
      // Persist the selected template id inside the coverStyle JSON so the
      // preset survives save/reload (coverStyle is a JSON column — no migration).
      coverStyle: { ...(coverStyle ?? {}), templateId: selectedTemplateId ?? '' } as CoverStyle | null,
    };
  };

  const closeModal = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  const doSaveAndClose = async () => {
    if (!onSave) {
      isDirtyRef.current = false;
      return closeModal();
    }
    try {
      setSaveStatus('saving');
      await onSave(buildSavePayload(), { reason: 'manual' });
      isDirtyRef.current = false;
      setSaveStatus('saved');
    } catch (err) {
      console.error('[AppleBookJournal] Save before close failed:', err);
      setSaveStatus('error');
      return;
    }
    closeModal();
  };

  const doDiscardAndClose = () => {
    isDirtyRef.current = false;
    closeModal();
  };

  const handleClose = async () => {
    // Flush any pending (debounced) book-style save before closing so the last
    // appearance change is never lost.
    if (bookStyleSaveTimerRef.current && onSaveBookStyle && note?.id) {
      clearTimeout(bookStyleSaveTimerRef.current);
      bookStyleSaveTimerRef.current = null;
      void Promise.resolve(onSaveBookStyle({ theme, font, fontSize })).catch(() => {});
    }

    // If there are unsaved edits, ask the user to save or discard instead of
    // silently saving or closing (there is no autosave while typing).
    if (isDirtyRef.current && onSave && !isSaving) {
      toast(
        (t) => (
          <div style={{ padding: '12px 14px', minWidth: 280 }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>You have unsaved changes</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  void doSaveAndClose();
                }}
                style={{
                  padding: '6px 12px', fontSize: 13, fontWeight: 700, borderRadius: 8,
                  border: 'none', cursor: 'pointer', color: '#fff',
                  background: 'var(--gradient-accent, #7c5cff)',
                }}
              >
                Save changes
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  doDiscardAndClose();
                }}
                style={{
                  padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                  border: '1px solid rgba(128,128,128,0.4)', background: 'transparent',
                  color: 'inherit', cursor: 'pointer',
                }}
              >
                Discard
              </button>
            </div>
          </div>
        ),
        { duration: Infinity },
      );
      return; // keep the modal open until the user chooses
    }

    setClosing(true);
    setTimeout(onClose, 300);
  };

  /**
   * Plays the cover-open animation then transitions to the read view.
   * Phase 1 (0–650ms): CSS class 'is-opening' drives the cover swinging open.
   * Phase 2 (650ms): hide cover, reset animation state, show read mode.
   */
  const performOpen = (onDone?: () => void) => {
    if (coverOpening !== 'idle') return;
    setHasAnimatedCoverEnter(true);
    setCoverOpening('opening');
    setTimeout(() => {
      setShowCover(false);
      setMode('read');
      setCoverOpening('idle');
      setSpreadIndex(0);
      onDone?.();
    }, 650);
  };

  /**
   * Opens the book only once it is ready (measured/paginated). If the book
   * isn't ready yet, it defers the animation and shows "Opening…" on the cover
   * so the book never appears stuck mid-animation.
   */
  const handleOpenBook = () => {
    if (coverOpening !== 'idle' || pendingOpen) return;
    if (!paginationReady) {
      setPendingOpen(true);
      return;
    }
    performOpen();
  };

  // When the book becomes ready while an open is pending, kick off the animation.
  useEffect(() => {
    if (pendingOpen && paginationReady) {
      setPendingOpen(false);
      performOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen, paginationReady]);

  /**
   * Plays the cover-close animation (mirror of the open) and settles the book
   * back onto the cover. Mirrored poses make open→close a connected loop.
   */
  const handleCloseBook = () => {
    if (coverOpening !== 'idle' || pendingOpen) return;
    setShowCover(true);       // swap to the cover stage so it can animate shut
    setCoverOpening('closing');
    setShowTOC(false);
    setShowAppearance(false);
    setTimeout(() => setCoverOpening('idle'), 650);
  };

  /**
   * Open/close the book from the top-bar toggle.
   * - Closed (cover): opens the book (plays the cover-open animation).
   * - Open: closes the book (plays the cover-close animation).
   */
  const handleToggleBook = () => {
    if (coverOpening !== 'idle' || pendingOpen) return;
    if (showCover) {
      handleOpenBook();
    } else {
      handleCloseBook();
    }
  };

  /**
   * Open the book directly to the spread that contains `pageNumber`.
   * Used by the cover bookmark ribbon (single bookmark) and the
   * picker popup (multiple bookmarks).
   */
  const openToBookmark = (pageNumber: number) => {
    if (coverOpening !== 'idle' || pendingOpen) return;
    const targetSpread = Math.floor((pageNumber - 1) / 2);
    // Store the target so the paginationReady effect can flip to it after mount
    openToSpreadRef.current = targetSpread;
    setBookmarkPickerOpen(false);
    if (!paginationReady) {
      setPendingOpen(true);
      return;
    }
    performOpen(() => setSpreadIndex(targetSpread));
  };

  /**
   * Toggle a bookmark for the currently visible spread's left page.
   * - If that page is already bookmarked → remove it.
   * - Otherwise → add it (default color 'red', max 5 enforced).
   * Shows a toast notification when the 5-bookmark limit is reached.
   * Updates state optimistically; calls onToggleBookmark to persist.
   */
  const handleToggleBookmark = async () => {
    if (!onToggleBookmark || bookmarkSaving) return;

    // Page number is 1-based; use the left page of the current spread
    const pageNum = leftPageIndex + 1;

    const existing = bookmarks.find((b) => b.pageNumber === pageNum);
    let nextBookmarks: import('../../types').Bookmark[];

    if (existing) {
      // Remove — filter out this page's bookmark
      nextBookmarks = bookmarks.filter((b) => b.pageNumber !== pageNum);
    } else {
      // Add — enforce max 5, show toast instead of silently returning
      if (bookmarks.length >= 5) {
        setBookmarkLimitToast(true);
        return;
      }
      const newBookmark: import('../../types').Bookmark = {
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pageNumber: pageNum,
        color: 'red',
        createdAt: new Date().toISOString(),
      };
      nextBookmarks = [...bookmarks, newBookmark];
    }

    // Optimistic update
    setBookmarks(nextBookmarks);
    setBookmarkSaving(true);
    try {
      await onToggleBookmark(nextBookmarks);
    } catch (err) {
      console.error('[AppleBookJournal] Bookmark save failed:', err);
      // Roll back
      setBookmarks(bookmarks);
    } finally {
      setBookmarkSaving(false);
    }
  };

  /**
   * Jump an already-mounted flip book to a given spread (0-based) WITH a single
   * animated page-flip. The library's single flip() opens directly toward the
   * target in one animation (fast even for far pages — no page-by-page chain),
   * but it doesn't always land exactly on a far target, so we verify afterwards
   * and, if needed, hard-correct with turnToPage() (instant, always exact) to
   * guarantee we arrive at the marked page.
   */
  const jumpFlipBookTo = (flip: any, targetSpread: number) => {
    const targetSpreadIdx = targetSpread;
    const targetPage = targetSpreadIdx * 2;
    if (Math.floor(flip.getCurrentPageIndex() / 2) === targetSpreadIdx) return; // already there

    // Single animated flip that opens directly toward the target page.
    try {
      flip.flip(targetPage);
    } catch {
      try {
        flip.turnToPage(targetPage);
      } catch {
        /* ignore */
      }
      return;
    }

    // Verify the single flip landed; if not, correct it exactly (instant).
    const verify = (elapsed: number) => {
      const f = flipBookRef.current?.pageFlip();
      if (!f) return;
      if (Math.floor(f.getCurrentPageIndex() / 2) === targetSpreadIdx) return; // landed
      if (elapsed < 800) {
        setTimeout(() => verify(elapsed + 100), 100);
      } else {
        try {
          f.turnToPage(targetPage); // exact correction, no further animation
        } catch {
          /* ignore */
        }
      }
    };
    setTimeout(() => verify(0), 150);
  };

  // Once the flip book is fully mounted and pagination is ready, if we opened
  // to a specific bookmark spread, flip to it now.
  // NOTE: The real StPageFlip controller is only assigned inside the child
  // HTMLFlipBook effect, one render AFTER paginationReady flips to true. The
  // imperative handle (flipBookRef.current.pageFlip) is exposed immediately,
  // so a single requestAnimationFrame can fire before the controller exists,
  // silently dropping the flip and leaving the book stuck on page 1. We poll a
  // short window until the controller is genuinely available and only clear
  // openToSpreadRef once the flip has actually been applied.
  useEffect(() => {
    if (!paginationReady) return;
    const targetSpread = openToSpreadRef.current;
    if (targetSpread === null) return;
    // Target is the very first spread (pages 1-2) — the book already mounts
    // there, so there is nothing to flip to.
    if (targetSpread <= 0) {
      openToSpreadRef.current = null;
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const tryFlip = () => {
      if (cancelled) return;
      const flip = flipBookRef.current?.pageFlip();
      if (flip) {
        // Jump to the target spread (animates adjacent jumps, hard-jumps far ones).
        jumpFlipBookTo(flip, targetSpread);
        openToSpreadRef.current = null;
        return;
      }
      // Controller not ready yet — retry for ~800ms, then give up gracefully.
      if (attempts < 40) {
        attempts += 1;
        requestAnimationFrame(tryFlip);
      } else {
        openToSpreadRef.current = null;
      }
    };

    // Defer one frame so the flip book sibling renders before we start polling.
    const raf = requestAnimationFrame(tryFlip);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [paginationReady, showCover]);

  /**
   * Flip the open book to a given spread (0-based), waiting until the real
   * StPageFlip controller exists. The imperative handle (flipBookRef.current
   * .pageFlip) is exposed as soon as the component mounts, but the underlying
   * controller is only created in a child effect — calling .flip() before that
   * silently drops the request. Poll a short window, then flip exactly once.
   */
  const flipToSpread = (targetSpread: number) => {
    let attempts = 0;
    const tryFlip = () => {
      const flip = flipBookRef.current?.pageFlip();
      if (flip) {
        // Jump to the target spread (animates adjacent jumps, hard-jumps far ones).
        jumpFlipBookTo(flip, targetSpread);
        return;
      }
      // Controller not ready yet — retry for ~400ms, then give up gracefully.
      if (attempts < 20) {
        attempts += 1;
        requestAnimationFrame(tryFlip);
      }
    };
    requestAnimationFrame(tryFlip);
  };

  // Commit any in-flight (still-debounced) editor changes to state BEFORE
  // leaving the editor, so the reader paginates the latest text and nothing
  // typed is lost when switching between Edit and 3D Reader.
  const switchToReader = () => {
    if (mode === 'edit' && editorRef.current) {
      if (inputDebounceRef.current) {
        clearTimeout(inputDebounceRef.current);
        inputDebounceRef.current = null;
      }
      const raw = editorRef.current.innerHTML;
      const normalized = normalizeDocumentHtml(raw) || raw || '';
      const target = normalized || formData.content || '';
      noteContentRef.current = target;
      if (formData.content !== target) {
        setFormData((prev) => ({ ...prev, content: target }));
      }
    }
    setMode('read');
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;

    try {
      setSaveStatus('saving');
      const payload = buildSavePayload();
      setFormData((prev) => ({ ...prev, content: payload.content }));
      await onSave(payload, { reason: 'manual' });
      isDirtyRef.current = false;
      setSaveStatus('saved');
      setMode('read');
      setTimeout(() => setSaveStatus('idle'), 2000);
      setTimeout(() => recalculatePagination(), 150);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('unsaved'), 2000);
    }
  };

  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const bookInstanceKey = useRef(`journal-book-${note?.id ?? 'new'}-${Date.now()}`);

  const [selectedHighlightColor, setSelectedHighlightColor] = useState('#fef08a');

  // ─── Active format state — updated on every selectionchange ──────────────
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strikeThrough: false,
    h2: false, h3: false, blockquote: false, ul: false, highlight: false,
  });

  const updateActiveFormats = useCallback(() => {
    const el = editorRef.current;
    if (!el || document.activeElement !== el) return;
    try {
      const blockValue = document.queryCommandValue('formatBlock').toLowerCase();

      // Detect highlight: check if any node in the current selection has a
      // background-color style. Walk the ancestor chain from the focus node.
      let hasHighlight = false;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        // For a collapsed cursor, walk ancestors; for a selection, also check
        // the common ancestor container's subtree.
        const checkNode = (node: Node | null) => {
          while (node && node !== el) {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              (node as HTMLElement).style?.backgroundColor
            ) {
              hasHighlight = true;
              return;
            }
            node = node.parentNode;
          }
        };
        checkNode(range.commonAncestorContainer);
        if (!hasHighlight && !sel.isCollapsed) {
          // Also check child nodes within the selection for non-collapsed ranges.
          const fragment = range.cloneContents();
          const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
          let n: Node | null = walker.nextNode();
          while (n && !hasHighlight) {
            if ((n as HTMLElement).style?.backgroundColor) hasHighlight = true;
            n = walker.nextNode();
          }
        }
      }

      setActiveFormats({
        bold:          document.queryCommandState('bold'),
        italic:        document.queryCommandState('italic'),
        underline:     document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        h2:            blockValue === 'h2',
        h3:            blockValue === 'h3',
        blockquote:    blockValue === 'blockquote',
        ul:            document.queryCommandState('insertUnorderedList'),
        highlight:     hasHighlight,
      });
    } catch { /* ignore — queryCommandState can throw */ }
  }, []);

  // Listen for selectionchange globally so toolbar always reflects cursor state.
  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [updateActiveFormats]);

  const saveSelectionRange = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return null;
    return range.cloneRange();
  }, []);

  const restoreSelectionRange = useCallback((range: Range | null) => {
    const sel = window.getSelection();
    if (!sel || !range) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  // ─── Shared: capture full innerHTML after any programmatic DOM mutation ───
  // Sets suppressInputRef so the onInput handler ignores spurious events fired
  // by execCommand / DOM mutation ops, then reads the final innerHTML in the
  // next animation frame (after the browser finishes compositing).
  const commitEditorContent = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    suppressInputRef.current = true;
    requestAnimationFrame(() => {
      suppressInputRef.current = false;
      if (editorRef.current) {
        const raw = editorRef.current.innerHTML;
        // Use proper normalization from journalDocument
        const normalized = normalizeDocumentHtml(raw) || raw || '';
        setFormData((prev) => ({ ...prev, content: normalized }));
        setSaveStatus('unsaved');
      }
    });
  }, []);

  // ─── Highlight ────────────────────────────────────────────────────────────
  // Apply: wrap selection in a background-color span (surroundContents fast
  //   path, or extract+wrap for cross-element selections).
  // Remove: walk the live DOM inside the selection range and strip
  //   backgroundColor from every element that has one, then unwrap empty
  //   span/mark shells. Never uses extractContents for removal — that caused
  //   the selection to be lost before the strip could complete.
  const applyHighlight = useCallback((color: string) => {
    const el = editorRef.current;
    if (!el) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const activeRange = saveSelectionRange();
    if (!activeRange || activeRange.collapsed) return;

    el.focus();
    suppressInputRef.current = true;

    if (color === 'transparent') {
      const range = activeRange.cloneRange();
      const allSpans = Array.from(el.querySelectorAll<HTMLElement>('span[style], mark[style]'));

      for (const span of allSpans) {
        if (!span.style.backgroundColor) continue;
        if (!range.intersectsNode(span)) continue;

        span.style.backgroundColor = '';
        if (!span.style.cssText.trim() && (span.tagName === 'SPAN' || span.tagName === 'MARK')) {
          span.replaceWith(...Array.from(span.childNodes));
        }
      }
    } else {
      const range = activeRange.cloneRange();
      const span = document.createElement('span');
      span.style.backgroundColor = color;

      try {
        range.surroundContents(span);
      } catch {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
    }

    restoreSelectionRange(activeRange.cloneRange());
    commitEditorContent();
  }, [commitEditorContent, restoreSelectionRange, saveSelectionRange]);

  // ─── Block format with toggle: applies the tag, or removes it if already active ─
  // Operates on the exact block(s) containing the caret/selection and converts
  // them IN PLACE (replace the element), so a heading can never be wrapped
  // inside another block to create nesting like <p><h2>…</h2></p>. Removing a
  // heading unwraps every heading ancestor down to a plain <p>, so nothing
  // heading-like is left behind.
  const applyBlockFormat = useCallback((tag: 'h2' | 'h3' | 'blockquote') => {
    const el = editorRef.current;
    if (!el) return;

    const activeRange = saveSelectionRange();
    if (!activeRange) return;

    el.focus();
    suppressInputRef.current = true;

    const range = activeRange.cloneRange();

    const BLOCK_RE = /^(p|h[1-6]|blockquote|li|pre|div)$/i;
    const HEADING_RE = /^h[1-6]$/i;
    // A leaf block is the smallest block that holds text/inline content. A
    // <div> (or any block) containing further blocks is a container (e.g.
    // Chrome's per-paragraph wrapper) and is skipped so we never collapse
    // several paragraphs into one heading.
    const isLeafBlock = (elm: Element) =>
      BLOCK_RE.test(elm.tagName) &&
      !elm.querySelector('p, h1, h2, h3, h4, h5, h6, blockquote, li, pre, div');

    // Collect every leaf block touched by the caret/selection.
    const affected = new Set<HTMLElement>();
    const collect = (root: Node | null) => {
      if (!root) return;
      if (root.nodeType === Node.ELEMENT_NODE) {
        const elm = root as HTMLElement;
        if (isLeafBlock(elm)) {
          affected.add(elm);
          return;
        }
      }
      root.childNodes.forEach(collect);
    };
    collect(range.commonAncestorContainer);

    // For a collapsed caret, ensure the block containing the caret is included.
    if (activeRange.collapsed) {
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== el) {
        if (node.nodeType === Node.ELEMENT_NODE && isLeafBlock(node as HTMLElement)) {
          affected.add(node as HTMLElement);
          break;
        }
        node = node.parentElement;
      }
    }

    const toggled: HTMLElement[] = [];

    for (const block of affected) {
      // Only act on blocks that actually intersect a non-collapsed selection.
      if (!activeRange.collapsed && !range.intersectsNode(block)) continue;

      // Walk the ancestor chain collecting every heading above this block.
      const headings: HTMLElement[] = [];
      let cur: HTMLElement | null = block;
      while (cur && cur !== el) {
        if (HEADING_RE.test(cur.tagName)) headings.unshift(cur);
        cur = cur.parentElement as HTMLElement | null;
      }
      const active = headings.some((h) => h.tagName.toLowerCase() === tag);

      if (active) {
        // Remove: replace the OUTERMOST heading ancestor with a plain <p> and
        // flatten any headings nested inside it, so the text is a clean
        // paragraph with no heading wrappers anywhere.
        const outer = headings[0];
        const flat = outer.innerHTML.replace(/<h[1-6][\s\S]*?<\/h[1-6]>/gi, (m) => {
          const tmp = document.createElement('div');
          tmp.innerHTML = m;
          return tmp.textContent ?? '';
        });
        const p = document.createElement('p');
        p.innerHTML = flat;
        outer.replaceWith(p);
        toggled.push(p);
      } else {
        // Apply: convert this leaf block to the target tag in place.
        const node = document.createElement(tag);
        node.innerHTML = block.innerHTML;
        block.replaceWith(node);
        toggled.push(node);
      }
    }

    // Empty collapsed line (e.g. caret in the editor root) — create a heading.
    if (toggled.length === 0 && activeRange.collapsed) {
      const wrapper = document.createElement(tag);
      wrapper.appendChild(document.createElement('br'));
      range.insertNode(wrapper);
      const finalRange = document.createRange();
      finalRange.setStart(wrapper, 0);
      finalRange.collapse(true);
      restoreSelectionRange(finalRange);
      toggled.push(wrapper);
    }

    // Put the caret back inside the first toggled block so typing continues.
    if (toggled.length > 0) {
      const finalRange = document.createRange();
      finalRange.selectNodeContents(toggled[0]);
      finalRange.collapse(false);
      restoreSelectionRange(finalRange);
    }

    commitEditorContent();
  }, [commitEditorContent, restoreSelectionRange, saveSelectionRange]);

  // ─── Generic rich format (bold, italic, underline, lists …) ──────────────
  const applyRichFormat = useCallback((command: string, value?: string) => {
    if (command === 'hiliteColor') { applyHighlight(value ?? ''); return; }
    if (command === 'formatBlock') {
      applyBlockFormat(
        (value ?? 'h2').replace(/[<>]/g, '').toLowerCase() as 'h2' | 'h3' | 'blockquote'
      );
      return;
    }

    const el = editorRef.current;
    if (!el) return;

    const savedRange = saveSelectionRange();
    el.focus();
    suppressInputRef.current = true;

    try {
      if (savedRange) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(savedRange);
        }
      }
      document.execCommand(command, false, value);
      if (savedRange) {
        restoreSelectionRange(savedRange.cloneRange());
      }
    } catch (e) {
      console.warn('execCommand:', e);
    }

    commitEditorContent();
  }, [applyHighlight, applyBlockFormat, commitEditorContent, restoreSelectionRange, saveSelectionRange]);

  // ─── Undo / Redo ─────────────────────────────────────────────────────────
  // Let the browser handle its own contentEditable undo stack natively.
  // Do NOT suppress the input event or use commitEditorContent — the browser
  // fires a native 'input' event after undo/redo which our onInput handler
  // picks up and syncs to React state correctly.
  const handleUndo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('undo', false);
    // Force-sync state after a short delay since undo fires input synchronously
    // but React batching may delay our debounced onInput handler.
    setTimeout(() => {
      if (editorRef.current) {
        setFormData((prev) => ({ ...prev, content: editorRef.current!.innerHTML }));
      }
    }, 20);
  }, []);

  const handleRedo = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('redo', false);
    setTimeout(() => {
      if (editorRef.current) {
        setFormData((prev) => ({ ...prev, content: editorRef.current!.innerHTML }));
      }
    }, 20);
  }, []);

  // ─── Clear formatting — removes all inline styles + tags from the selection ─
  // Converts the selected HTML back to plain text, stripping bold/italic/
  // highlight/headings etc. while keeping the text content intact.
  const handleClearFormatting = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    suppressInputRef.current = true;

    // removeFormat strips bold/italic/underline/color/font changes.
    try { document.execCommand('removeFormat', false); } catch { /* ignore */ }

    // Also strip any remaining background-color highlight spans inside selection.
    const range = sel.getRangeAt(0);
    const fragment = range.cloneContents();
    stripBackground(fragment);
    // Re-walk the live DOM within the range to strip backgrounds there too.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      const htmlEl = node as HTMLElement;
      if (htmlEl.style?.backgroundColor) {
        // Only strip nodes inside (or overlapping) the selection.
        if (sel.containsNode(node, true)) {
          htmlEl.style.backgroundColor = '';
        }
      }
      node = walker.nextNode();
    }

    commitEditorContent();
  }, [commitEditorContent]);

  const wordCount = useMemo(() => {
    const plain = formData.content.replace(/<[^>]*>/g, ' ').trim();
    return plain ? plain.split(/\s+/).length : 0;
  }, [formData.content]);

  const readTimeMins = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  return (
    <div
      className={`apple-book-overlay ${closing ? 'is-closing' : ''}`}
      style={
        {
          '--book-bg': activeThemeConfig.bg,
          '--book-text': activeThemeConfig.text,
          '--book-accent': activeThemeConfig.accent,
          '--book-paper': activeThemeConfig.paper,
          '--book-font-family': activeFontConfig.css,
          '--book-font-size': `${activeSizeConfig.sizePx}px`,
          '--book-leading': activeSizeConfig.leading,
        } as React.CSSProperties
      }
      role="dialog"
      aria-modal="true"
    >
      {/* ── BOOKMARK LIMIT TOAST ──────────────────────────────────────── */}
      {bookmarkLimitToast && (
        <div className="apple-book-toast apple-book-toast--warn" role="alert">
          <Bookmark size={15} />
          <span>Maximum 5 bookmarks reached. Remove one before adding another.</span>
          <button
            className="apple-book-toast-close"
            onClick={() => setBookmarkLimitToast(false)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── TOP APP BAR ───────────────────────────────────────────────── */}
      <header className="apple-book-topbar">
        <div className="apple-book-topbar-left">
          <button className="apple-book-icon-btn" onClick={handleClose} title="Close Book (Esc)">
            <X size={20} />
          </button>
          <div className="apple-book-title-meta">
            <span className="apple-book-badge">
              <BookOpen size={12} />
              {formData.isJournal ? 'Interactive Journal' : 'Notebook Entry'}
            </span>
            <span className="apple-book-header-title truncate">
              {formData.title || (formData.isJournal ? 'Daily Reflection' : 'Untitled')}
            </span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="apple-book-mode-switcher">
          <button
            className={`apple-book-mode-btn ${mode === 'read' ? 'is-active' : ''}`}
            onClick={switchToReader}
            title="3D Reader"
          >
            <BookOpen size={14} />
            <span className="apple-book-mode-btn-label">3D Reader</span>
          </button>
          <button
            className={`apple-book-mode-btn ${mode === 'edit' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('edit');
              // Skip the cover and jump straight into the editor.
              setShowCover(false);
            }}
            title="Direct Book Editor"
          >
            <PenTool size={14} />
            <span className="apple-book-mode-btn-label">Direct Book Editor</span>
          </button>
        </div>

        <div className="apple-book-topbar-right">
          <button
            className={`apple-book-icon-btn ${showTOC ? 'is-active' : ''}`}
            onClick={() => {
              setShowTOC((v) => !v);
              setShowAppearance(false);
            }}
            title="Table of Contents & Chapters"
          >
            <List size={18} />
          </button>

          <button
            className={`apple-book-icon-btn ${showAppearance ? 'is-active' : ''}`}
            onClick={() => {
              setShowAppearance((v) => !v);
              setShowTOC(false);
            }}
            title="Appearance & Typography (Aa)"
          >
            <Type size={18} />
          </button>

          <button
            className={`apple-book-icon-btn ${isCurrentPageBookmarked ? 'is-active' : ''}`}
            onClick={handleToggleBookmark}
            disabled={bookmarkSaving || !onToggleBookmark || showCover}
            title={isCurrentPageBookmarked ? 'Remove bookmark from this page' : 'Bookmark this page'}
          >
            <Bookmark size={18} />
          </button>

          <button
            className="apple-book-icon-btn hidden sm:flex"
            onClick={handleToggleBook}
            title={showCover ? 'Open Book' : 'Close Book'}
          >
            {showCover ? <BookOpen size={18} /> : <Book size={18} />}
          </button>

          {onDelete && (
            <button className="apple-book-icon-btn apple-book-icon-btn--danger" onClick={onDelete} title="Delete Book">
              <Trash2 size={18} />
            </button>
          )}

          {mode === 'edit' && (
            <button
              className="apple-book-save-btn"
              onClick={handleSave}
              disabled={isSaving || !formData.content.trim()}
            >
              <Check size={16} />
              <span className="apple-book-save-btn-label">{isSaving ? 'Saving…' : 'Save Book'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── TOC SIDE DRAWER ─────────────────────────────────────────────── */}
      {showTOC && (
        <aside className="apple-book-drawer apple-book-drawer-toc">
          <div className="apple-book-drawer-header">
            <div className="flex items-center gap-2 font-bold text-sm">
              <List size={16} />
              <span>Journal Outline & Contents</span>
            </div>
            <button className="apple-book-drawer-close" onClick={() => setShowTOC(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="apple-book-drawer-body">
            <div className="apple-book-toc-card">
              <h4 className="apple-book-toc-title">{formData.title || 'Daily Reflection'}</h4>
              <p className="apple-book-toc-date">{dateLabel}</p>
              <div className="apple-book-toc-stats">
                <div className="apple-book-stat-chip">
                  <FileText size={12} />
                  <span>{wordCount} words</span>
                </div>
                <div className="apple-book-stat-chip">
                  <Clock size={12} />
                  <span>{readTimeMins} min read</span>
                </div>
                <div className="apple-book-stat-chip">
                  <BookOpen size={12} />
                  <span>{totalPages} pages</span>
                </div>
              </div>
            </div>

            {/* ── Bookmarks jump-to section ──────────────────────────── */}
            {bookmarks.length > 0 && (
              <div className="apple-book-toc-section" style={{ marginBottom: 16 }}>
                <h5 className="apple-book-toc-label">
                  <Bookmark size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Bookmarks
                </h5>
                <div className="apple-book-toc-list">
                  {[...bookmarks]
                    .sort((a, b) => a.pageNumber - b.pageNumber)
                    .map((bm) => {
                      const spreadIdx = Math.floor((bm.pageNumber - 1) / 2);
                      return (
                        <button
                          key={bm.id}
                          className="apple-book-toc-item"
                          onClick={() => {
                            const targetSpread = Math.floor((bm.pageNumber - 1) / 2);
                            // When opening from the cover, hand the target to the
                            // paginationReady effect so it flips after the book mounts.
                            if (showCover) {
                              openToSpreadRef.current = targetSpread;
                            }
                            setShowCover(false);
                            setShowTOC(false);
                            setMode('read');
                            setSpreadIndex(targetSpread);
                            // Also flip directly (works when the book is already open).
                            flipToSpread(targetSpread);
                            playPageFlip();
                          }}
                        >
                          {/* Ribbon swatch */}
                          <span
                            className="apple-book-bm-swatch"
                            style={{ background: BOOKMARK_COLORS[bm.color] }}
                          />
                          <div className="flex-1 text-left min-w-0">
                            <span className="block font-semibold truncate">
                              {bm.label || `Page ${bm.pageNumber}`}
                            </span>
                            <span className="block text-[11px] opacity-60">
                              Page {bm.pageNumber} · Spread {spreadIdx + 1}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="apple-book-toc-section">
              <h5 className="apple-book-toc-label">Pages & Spreads</h5>              <div className="apple-book-toc-list">
                <button
                  className={`apple-book-toc-item ${showCover ? 'is-active' : ''}`}
                  onClick={() => {
                    setShowCover(true);
                    setShowTOC(false);
                  }}
                >
                  <Bookmark size={14} />
                  <span>Book Cover & Preface</span>
                </button>

                {Array.from({ length: Math.max(1, totalSpreads) }).map((_, idx) => {
                  const pLeft = idx * 2 + 1;
                  const pRight = idx * 2 + 2;
                  const isCurrent = spreadIndex === idx && !showCover;

                  return (
                    <button
                      key={idx}
                      className={`apple-book-toc-item ${isCurrent ? 'is-active' : ''}`}
                      onClick={() => {
                        setSpreadIndex(idx);
                        setShowCover(false);
                        setShowTOC(false);
                        flipToSpread(idx);
                        playPageFlip();
                      }}
                    >
                      <BookOpen size={14} />
                      <div className="flex-1 text-left min-w-0">
                        <span className="block font-semibold truncate">
                          Spread {idx + 1}: Pages {pLeft}-{Math.min(pRight, totalPages)}
                        </span>
                        <span className="block text-[11px] opacity-70 truncate">
                          {pages[idx * 2]?.replace(/<[^>]*>/g, '')?.slice(0, 45) || 'Blank page'}…
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.content.length > 30 && (
              <div className="mt-4">
                <JournalEntryAnalysis entryContent={formData.content} entryId={note?.id} />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── APPEARANCE DRAWER ───────────────────────────────────────────── */}
      {showAppearance && (
        <aside className="apple-book-drawer apple-book-drawer-appearance">
          <div className="apple-book-drawer-header">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Type size={16} />
              <span>Book Styling & Themes</span>
            </div>
            <button className="apple-book-drawer-close" onClick={() => setShowAppearance(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="apple-book-drawer-body">
            <div className="apple-book-appearance-group">
              <label className="apple-book-appearance-label">
                <Palette size={14} />
                <span>Paper Theme</span>
              </label>
              <div className="apple-book-theme-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`apple-book-theme-card ${theme === t.id ? 'is-active' : ''}`}
                    style={{ background: t.paper, color: t.text, borderColor: t.accent }}
                    onClick={() => updateBookStyle({ theme: t.id })}
                  >
                    <span className="font-serif font-bold text-xs">Aa</span>
                    <span className="text-[10px] font-semibold mt-1">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="apple-book-appearance-group mt-5">
              <label className="apple-book-appearance-label">
                <Type size={14} />
                <span>Book Font Style</span>
              </label>
              <div className="apple-book-font-list">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    className={`apple-book-font-item ${font === f.id ? 'is-active' : ''}`}
                    onClick={() => updateBookStyle({ font: f.id })}
                    style={{ fontFamily: f.css }}
                  >
                    <span>{f.name}</span>
                    {font === f.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="apple-book-appearance-group mt-5">
              <label className="apple-book-appearance-label">
                <Sliders size={14} />
                <span>Font Size & Line Spacing</span>
              </label>
              <div className="apple-book-size-segmented">
                {(['sm', 'md', 'lg', 'xl'] as BookFontSize[]).map((sz) => (
                  <button
                    key={sz}
                    className={`apple-book-size-btn ${fontSize === sz ? 'is-active' : ''}`}
                    onClick={() => updateBookStyle({ fontSize: sz })}
                  >
                    <span style={{ fontSize: sz === 'sm' ? 12 : sz === 'md' ? 14 : sz === 'lg' ? 16 : 19 }}>
                      Aa
                    </span>
                    <span className="text-[9px] uppercase font-bold mt-0.5">{sz}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ── MAIN STAGE ─────────────────────────────────────────────────── */}
      <main className="apple-book-stage">
        {/*
          Background pagination probe — measures the read layout in the
          background while the cover is still shown, so paginationReady becomes
          true before the user clicks "Open Book". Invisible and non-interactive;
          fires onInnerMount / onBodyMount so recalculatePagination() can run
          with real DOM measurements BEFORE the cover-open animation starts,
          preventing the book from getting stuck mid-animation.
        */}
        {!paginationReady && (
          <div
            aria-hidden="true"
            style={{ position: 'fixed', visibility: 'hidden', pointerEvents: 'none', top: 0, left: 0 }}
          >
            <FlippableBookPage
              pageNumber={1}
              totalPages={1}
              title={formData.title}
              dateLabel={dateLabel}
              shortDate={shortDate}
              content={flipBookPages[0] ?? ''}
              isJournal={formData.isJournal}
              wordCount={0}
              onInnerMount={handleInnerMount}
              onBodyMount={handleBodyMount}
            />
          </div>
        )}

        {showCover ? (
          /* Hardcover presentation */
          <div className="apple-book-cover-stage">
            {/* 3D book — purely visual, NO interactive children inside the transform */}
            <div className={`apple-book-hardcover-wrapper ${!hasAnimatedCoverEnter ? 'is-entering' : ''} ${coverOpening === 'opening' ? 'is-opening' : coverOpening === 'closing' ? 'is-closing' : ''}`}>
              <div className="apple-book-hardcover">
                <div className="apple-book-hardcover-spine" />
                {/* Parchment first page revealed when the front cover swings open */}
                <div className="apple-book-inside-page" />

                {/* ── Cover face — rendered by LiveBookCover, identical to picker preview ── */}
                <LiveBookCover
                  title={formData.title || (formData.isJournal ? 'Daily Reflections' : 'My Notebook')}
                  dateLabel={dateLabel}
                  coverUrl={localCoverUrl}
                  templateId={selectedTemplateId}
                  coverStyle={coverStyle}
                >
                  {/* "Open Book" button lives inside the cover as a child slot */}
                  <button
                    className="apple-book-open-btn"
                    onClick={handleOpenBook}
                    disabled={coverOpening !== 'idle' || pendingOpen}
                    style={{ position: 'relative', zIndex: 3 }}
                  >
                    <BookOpen size={18} />
                    <span>
                      {coverOpening === 'opening' || pendingOpen
                        ? 'Opening\u2026'
                        : coverOpening === 'closing'
                          ? 'Closing\u2026'
                          : 'Open Book'}
                    </span>
                  </button>
                </LiveBookCover>

                <div className="apple-book-hardcover-pages-stack" />
                {/* Decorative ribbon — purely visual div, never interactive */}
                {bookmarks.length > 0 && <div className="apple-book-hardcover-ribbon" />}
              </div>
            </div>

            {/* "Opening…" status shown on the outside of the book while it's
                still measuring — the animation kicks in only when ready. */}
            {pendingOpen && (
              <div className="apple-book-opening-badge" role="status">
                <Loader2 size={16} className="apple-book-opening-spinner" />
                <span>Opening book\u2026</span>
              </div>
            )}

            {/* ── Buttons row: Customize Cover + Bookmark pill ──────── */}
            {coverOpening === 'idle' && (
              <div className="apple-book-cover-actions-row">
                <button
                  className={`apple-book-cover-customize-btn ${showCoverPicker ? 'is-open' : ''}`}
                  onClick={() => setShowCoverPicker((v) => !v)}
                  type="button"
                >
                  <Pencil size={14} />
                  <span>Customize Cover</span>
                  <ChevronDown size={13} className="bcp-chevron" />
                </button>

                {bookmarks.length > 0 && (
                  <button
                    className="apple-book-cover-bm-trigger"
                    onClick={() => {
                      if (bookmarks.length === 1) {
                        openToBookmark(bookmarks[0].pageNumber);
                      } else {
                        setBookmarkPickerOpen((v) => !v);
                      }
                    }}
                  >
                    <Bookmark size={14} />
                    <span>
                      {bookmarks.length === 1
                        ? `Jump to page ${bookmarks[0].pageNumber}`
                        : `${bookmarks.length} Bookmarks`}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* ── Bookmark picker popup ─────────────────────────────── */}
            {bookmarkPickerOpen && bookmarks.length > 1 && (
              <>
                <div
                  className="apple-book-cover-bm-backdrop"
                  onClick={() => setBookmarkPickerOpen(false)}
                />
                <div className="apple-book-cover-bm-picker" role="dialog" aria-label="Choose a bookmarked page">
                  <div className="apple-book-cover-bm-picker-header">
                    <Bookmark size={13} />
                    <span>Jump to bookmark</span>
                    <button
                      className="apple-book-cover-bm-picker-close"
                      onClick={() => setBookmarkPickerOpen(false)}
                      aria-label="Close"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="apple-book-cover-bm-picker-list">
                    {[...bookmarks]
                      .sort((a, b) => a.pageNumber - b.pageNumber)
                      .map((bm) => (
                        <button
                          key={bm.id}
                          className="apple-book-cover-bm-picker-item"
                          onClick={() => openToBookmark(bm.pageNumber)}
                        >
                          <span
                            className="apple-book-cover-bm-picker-swatch"
                            style={{ background: BOOKMARK_COLORS[bm.color] }}
                          />
                          <span className="apple-book-cover-bm-picker-label">
                            {bm.label || `Page ${bm.pageNumber}`}
                          </span>
                          <span className="apple-book-cover-bm-picker-page">
                            p.{bm.pageNumber}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Cover Picker Modal ────────────────────────────────── */}
            {showCoverPicker && note && onUploadCover && onRemoveCover && (
              <BookCoverPickerModal
                note={note}
                liveTitle={formData.title}
                liveDateLabel={dateLabel}
                selectedTemplateId={selectedTemplateId}
                currentCoverUrl={localCoverUrl}
                coverStyle={coverStyle ?? {}}
                onStyleChange={async (style) => {
                  // Apply the new style to the live cover immediately.
                  setCoverStyle(style);
                  if (!note?.id) return;
                  // Preserve the current template alongside the style fields.
                  const effective = {
                    ...(coverStyle ?? {}),
                    ...style,
                    templateId:
                      selectedTemplateId ?? (note?.coverStyle?.templateId as string | undefined) ?? '',
                  } as CoverStyle;
                  // Keep the fast same-device cache fresh right away.
                  setCachedCoverStyle(note.id, effective);
                  // Persist to the backend so it syncs across devices.
                  if (onSaveCoverStyle) {
                    try {
                      const updated = await onSaveCoverStyle(effective);
                      if (updated && typeof updated === 'object' && 'coverStyle' in updated) {
                        setCoverStyle(
                          (updated as import('../../types').NoteDTO).coverStyle ?? null,
                        );
                      }
                    } catch (err) {
                      console.error('[AppleBookJournal] Save cover style failed:', err);
                    }
                  }
                }}
                onSelectPreset={async (tplId, preset) => {
                  // ── 1. Apply cover style from preset ──────────────────
                  const effectiveCoverStyle: CoverStyle = {
                    ...preset.coverStyle,
                    templateId: tplId,
                  };
                  setSelectedTemplateId(tplId);
                  setCoverStyle(effectiveCoverStyle);
                  // Clear any custom photo so the template takes over
                  setLocalCoverUrl(null);

                  // ── 2. Apply interior book style from preset ───────────
                  const bs = preset.bookStyle;
                  setTheme((bs.theme as BookTheme) ?? 'parchment');
                  setFont((bs.font as BookFont) ?? 'serif');
                  setFontSize((bs.fontSize as BookFontSize) ?? 'md');

                  if (!note?.id) return;

                  // ── 3. Update both caches immediately ─────────────────
                  setCachedCoverStyle(note.id, effectiveCoverStyle);
                  setCachedBookStyle(note.id, bs);

                  // ── 4. Persist cover + book style to backend ───────────
                  try {
                    // Cover style via onSaveCoverStyle (if available)
                    if (onSaveCoverStyle) {
                      const updatedNote = await onSaveCoverStyle(effectiveCoverStyle);
                      if (updatedNote && typeof updatedNote === 'object' && 'coverStyle' in updatedNote) {
                        setCoverStyle((updatedNote as NoteDTO).coverStyle ?? null);
                      }
                    } else {
                      // Fall back to saving via the main onSave path
                      const payload = buildSavePayload();
                      payload.coverStyle = effectiveCoverStyle;
                      await onSave?.(payload, { reason: 'cover' });
                    }

                    // Book style via onSaveBookStyle (if available)
                    if (onSaveBookStyle) {
                      void Promise.resolve(onSaveBookStyle(bs)).catch((err) => {
                        console.error('[AppleBookJournal] Save preset book style failed:', err);
                      });
                    }
                  } catch (err) {
                    console.error('[AppleBookJournal] Failed to save preset theme:', tplId, err);
                  }
                }}
                onUploadCover={async (processed) => {
                  const updated = await onUploadCover(processed);
                  // A photo replaces any template — clear the selected preset.
                  setSelectedTemplateId(null);
                  if (updated && typeof updated === 'object' && 'coverUrl' in updated) {
                    setLocalCoverUrl((updated as import('../../types').NoteDTO).coverUrl ?? null);
                  }
                  return updated;
                }}
                onRemoveCover={async () => {
                  setLocalCoverUrl(null);
                  await onRemoveCover();
                }}
                onClose={() => setShowCoverPicker(false)}
              />
            )}
          </div>
        ) : mode === 'read' ? (
          /* ── 3D FLIPPABLE BOOK READING MODE ──────────────────────────── */
          <div className="apple-book-flip-container">
            {/*
              Two-phase pagination render:
              - Phase 1 (!paginationReady): render a single hidden probe page so
                onInnerMount / onBodyMount fire and populate leftPageRef /
                pageBodyRef with real DOM measurements.
              - Phase 2 (paginationReady): recalculatePagination has now run with
                live refs and produced the authoritative page set. Mount the real
                HTMLFlipBook exactly once with that final set — no re-mount, no
                flicker on the first page-flip.
            */}
            {!paginationReady ? (
              /* Phase 1 — invisible single probe page to capture live refs */
              <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
                <FlippableBookPage
                  pageNumber={1}
                  totalPages={1}
                  title={formData.title}
                  dateLabel={dateLabel}
                  shortDate={shortDate}
                  content={flipBookPages[0] ?? ''}
                  isJournal={formData.isJournal}
                  wordCount={0}
                  onInnerMount={handleInnerMount}
                  onBodyMount={handleBodyMount}
                />
              </div>
            ) : (
              /* Phase 2 — real flip book, mounted once with authoritative pages */
              /* @ts-expect-error react-pageflip typings */
              <HTMLFlipBook
                key={bookInstanceKey.current}
                ref={flipBookRef}
                width={dimensions.width}
                height={dimensions.height}
                size="stretch"
                minWidth={280}
                maxWidth={540}
                minHeight={280}
                maxHeight={640}
                maxShadowOpacity={0.5}
                showCover={false}
                mobileScrollSupport={true}
                onFlip={(e: any) => {
                  const currentFlipPage = e.data;
                  setSpreadIndex(Math.floor(currentFlipPage / 2));
                  playPageFlip();
                }}
                className="apple-book-3d-flipbook"
              >
                {flipBookPages.map((pageContent, idx) => (
                  <FlippableBookPage
                    key={idx}
                    pageNumber={idx + 1}
                    totalPages={flipBookPages.length}
                    title={formData.title}
                    dateLabel={dateLabel}
                    shortDate={shortDate}
                    content={pageContent}
                    isJournal={formData.isJournal}
                    wordCount={0}
                    bookmarkColor={
                      bookmarks.find((b) => b.pageNumber === idx + 1)?.color ?? undefined
                    }
                  />
                ))}
              </HTMLFlipBook>
            )}
          </div>
        ) : (
          /* ── CLEAN NORMAL DOCUMENT EDITOR ── */
          <div className="apple-book-normal-editor-stage">
            <div className="apple-book-normal-editor-card">

              {/* Editor Header Toolbar */}
              <div className="apple-book-normal-toolbar">
                {/* ── Undo / Redo ── */}
                <div className="apple-book-toolbar-group">
                  <button
                    type="button"
                    className="apple-book-tool-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleUndo}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="apple-book-tool-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleRedo}
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    <Redo2 size={15} />
                  </button>
                </div>

                <div className="apple-book-toolbar-divider" />

                {/* ── Bold / Italic / Underline / Strikethrough / Clear ── */}
                <div className="apple-book-toolbar-group">
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.bold ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('bold')}
                    title="Bold — click again to remove (Ctrl+B)"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.italic ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('italic')}
                    title="Italic — click again to remove (Ctrl+I)"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.underline ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('underline')}
                    title="Underline — click again to remove (Ctrl+U)"
                  >
                    <Underline size={15} />
                  </button>
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.strikeThrough ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('strikeThrough')}
                    title="Strikethrough — click again to remove"
                  >
                    <Strikethrough size={15} />
                  </button>
                  <button
                    type="button"
                    className="apple-book-tool-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClearFormatting}
                    title="Clear all formatting from selection (bold, italic, highlight, heading, quote…)"
                  >
                    <Eraser size={15} />
                  </button>
                </div>

                <div className="apple-book-toolbar-divider" />

                {/* ── Headings / Quote / List — all toggle off when active ── */}
                <div className="apple-book-toolbar-group">
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.h2 ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('formatBlock', '<h2>')}
                    title={activeFormats.h2 ? 'Remove Heading 1' : 'Heading 1'}
                  >
                    <Heading1 size={15} />
                  </button>
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.h3 ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('formatBlock', '<h3>')}
                    title={activeFormats.h3 ? 'Remove Heading 2' : 'Heading 2'}
                  >
                    <Heading2 size={15} />
                  </button>
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.blockquote ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('formatBlock', '<blockquote>')}
                    title={activeFormats.blockquote ? 'Remove Quote' : 'Quote'}
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    className={`apple-book-tool-btn ${activeFormats.ul ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyRichFormat('insertUnorderedList')}
                    title={activeFormats.ul ? 'Remove Bullet List' : 'Bullet List'}
                  >
                    <ListOrdered size={15} />
                  </button>

                  {/* Multi-Color Highlighter Picker — active when selection has a highlight;
                      clicking while active removes the highlight directly instead of
                      opening the colour picker. */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      className={`apple-book-tool-btn ${activeFormats.highlight || showHighlightPicker ? 'is-active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (activeFormats.highlight) {
                          // Selection is already highlighted — remove it directly.
                          applyRichFormat('hiliteColor', 'transparent');
                          setShowHighlightPicker(false);
                        } else {
                          setShowHighlightPicker((v) => !v);
                        }
                      }}
                      title={activeFormats.highlight ? 'Remove Highlight' : 'Highlighter — pick a color'}
                    >
                      <Highlighter size={15} />
                    </button>

                    {showHighlightPicker && (
                      <div className="apple-book-highlight-palette">
                        {[
                          { id: 'yellow',  color: '#fef08a', name: 'Yellow'           },
                          { id: 'green',   color: '#bbf7d0', name: 'Green'            },
                          { id: 'blue',    color: '#bfdbfe', name: 'Blue'             },
                          { id: 'pink',    color: '#fbcfe8', name: 'Pink'             },
                          { id: 'orange',  color: '#fed7aa', name: 'Orange'           },
                          { id: 'purple',  color: '#e9d5ff', name: 'Purple'           },
                          { id: 'clear',   color: 'transparent', name: 'Remove Highlight' },
                        ].map((hp) => (
                          <button
                            key={hp.id}
                            type="button"
                            className="apple-book-color-swatch"
                            style={{ background: hp.color === 'transparent' ? '#ffffff' : hp.color }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedHighlightColor(hp.color);
                              applyRichFormat('hiliteColor', hp.color);
                              setShowHighlightPicker(false);
                            }}
                            title={hp.name}
                          >
                            {hp.color === 'transparent' && (
                              <span className="text-[10px] text-red-500 font-bold">✕</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {allowTypeChange && (
                  <div className="apple-book-type-toggle ml-auto">
                    <button
                      type="button"
                      className={`apple-book-type-btn ${formData.isJournal ? 'is-active' : ''}`}
                      onClick={() => setFormData((f) => ({ ...f, isJournal: true }))}
                    >
                      <BookOpen size={12} /> Journal
                    </button>
                    <button
                      type="button"
                      className={`apple-book-type-btn ${!formData.isJournal ? 'is-active' : ''}`}
                      onClick={() => setFormData((f) => ({ ...f, isJournal: false }))}
                    >
                      <FileText size={12} /> Note
                    </button>
                  </div>
                )}
              </div>

              {/* Editor Writing Body */}
              <div className="apple-book-normal-body">
                <span className="apple-book-normal-date">{dateLabel}</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                      setFormData((prev) => ({ ...prev, title: e.target.value }));
                      // Track title-only edits as unsaved too, so closing the
                      // journal prompts to save/discard and the title persists.
                      isDirtyRef.current = true;
                      setSaveStatus('unsaved');
                    }}
                  placeholder={formData.isJournal ? "Today's Reflection Title…" : "Entry Title…"}
                  className="apple-book-normal-title"
                  autoFocus
                />

                <div
                  ref={setEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    if (suppressInputRef.current) return;
                    const el = e.currentTarget;
                    if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);
                    
                    // Debounce: update state ~150ms after last keystroke
                    inputDebounceRef.current = setTimeout(() => {
                      const raw = editorRef.current?.innerHTML ?? el.innerHTML;
                      // Use proper normalization from journalDocument to preserve complete document
                      const normalized = normalizeDocumentHtml(raw) || raw || '';
                      
                      // Update both content and mark as unsaved
                      setFormData((prev) => ({ ...prev, content: normalized }));
                      setSaveStatus('unsaved');
                      isDirtyRef.current = true;
                      
                    }, 150);
                  }}
                  className="apple-book-normal-content"
                  data-placeholder="Start typing your entry here… Formatting is applied visually as you write."
                />
              </div>

              {/* Editor Footer Extras (Mood, Tags, Media) */}
              <div className="apple-book-normal-footer">
                <div className="flex flex-wrap gap-4 items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold opacity-70">Mood</span>
                    <MoodPicker value={formData.mood} onChange={(mood) => setFormData((f) => ({ ...f, mood }))} />
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-xs font-bold opacity-70">Tags</span>
                    <TagInput tags={formData.tags} onChange={(tags) => setFormData((f) => ({ ...f, tags }))} />
                  </div>
                </div>

                <div>
                  <MediaAttachmentsField
                    attachmentUrl={formData.attachmentUrl}
                    onAttachmentUrlChange={(v) => setFormData((f) => ({ ...f, attachmentUrl: v }))}
                    voiceNoteUrl={formData.voiceNoteUrl}
                    onVoiceNoteUrlChange={(v) => setFormData((f) => ({ ...f, voiceNoteUrl: v }))}
                  />
                </div>
              </div>

            </div>
          </div>
        )
        }
      </main>

      {/* ── BOTTOM PROGRESS BAR ─────────────────────────────────────────── */}
      <footer className="apple-book-bottom-bar">
        <div className="apple-book-progress-wrap">
          <button
            className="apple-book-step-btn"
            onClick={() => {
              const prev = Math.max(0, spreadIndex - 1);
              setSpreadIndex(prev);
              flipToSpread(prev);
              playPageFlip();
            }}
            disabled={spreadIndex === 0 || showCover}
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="range"
            min={0}
            max={Math.max(0, totalSpreads - 1)}
            value={showCover ? 0 : spreadIndex}
            onChange={(e) => {
              const targetIdx = Number(e.target.value);
              setSpreadIndex(targetIdx);
              setShowCover(false);
              flipToSpread(targetIdx);
              playPageFlip();
            }}
            className="apple-book-slider"
          />

          <button
            className="apple-book-step-btn"
            onClick={() => {
              const next = Math.min(totalSpreads - 1, spreadIndex + 1);
              setSpreadIndex(next);
              flipToSpread(next);
              playPageFlip();
            }}
            disabled={spreadIndex >= totalSpreads - 1 || showCover}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="apple-book-bottom-counter">
          {showCover ? (
            <span>Front Cover</span>
          ) : (
            <span>
              Pages {leftPageIndex + 1}-{Math.min(rightPageIndex + 1, totalPages)} of {totalPages} (
              {Math.round(((leftPageIndex + 1) / Math.max(1, totalPages)) * 100)}%)
            </span>
          )}
        </div>

        {/* ── In-read bookmark jump — only shown when book is open and bookmarks exist ── */}
        {!showCover && bookmarks.length > 0 && (
          <div className="apple-book-bm-jump-bar">
            {[...bookmarks]
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((bm) => {
                const spreadIdx = Math.floor((bm.pageNumber - 1) / 2);
                const isActive = spreadIndex === spreadIdx;
                return (
                  <button
                    key={bm.id}
                    className={`apple-book-bm-jump-btn ${isActive ? 'is-active' : ''}`}
                    style={{ '--bm-btn-color': BOOKMARK_COLORS[bm.color] } as React.CSSProperties}
                    onClick={() => {
                      setSpreadIndex(spreadIdx);
                      flipToSpread(spreadIdx);
                      playPageFlip();
                    }}
                    title={bm.label || `Page ${bm.pageNumber}`}
                  >
                    <Bookmark size={11} />
                    <span>p.{bm.pageNumber}</span>
                  </button>
                );
              })}
          </div>
        )}
      </footer>
    </div>
  );
}
