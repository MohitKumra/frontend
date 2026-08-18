import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import {
  BookOpen,
  Edit3,
  Trash2,
  X,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  Sparkles,
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
} from 'lucide-react';
import type { NoteDTO } from '../../types';
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

export type JournalSavePayload = {
  title: string;
  content: string;
  isJournal: boolean;
  mood: NoteDTO['mood'];
  tags: string[];
  attachmentUrl: string;
  voiceNoteUrl: string;
  contentVersion?: number;
};

export type JournalSaveReason = 'auto' | 'manual' | 'close';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

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
    /** Called with the inner page element so the parent can measure real page dimensions */
    onInnerMount?: (el: HTMLDivElement | null) => void;
    /** Called with the page-body element so the parent can measure available text height */
    onBodyMount?: (el: HTMLDivElement | null) => void;
  }
>((props, ref) => {
  return (
    <div className="apple-book-flip-page" ref={ref} data-density="soft">
      <div className="apple-book-page-inner" ref={props.onInnerMount}>
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
  isSaving = false,
  autoSaveOnClose = false,
}: AppleBookJournalModalProps) {
  const [mode, setMode] = useState<'read' | 'edit'>(initialMode);
  const [closing, setClosing] = useState(false);
  const [theme, setTheme] = useState<BookTheme>('parchment');
  const [font, setFont] = useState<BookFont>('serif');
  const [fontSize, setFontSize] = useState<BookFontSize>('md');
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [showTOC, setShowTOC] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  // Always start on the cover — the user opens from there
  const [showCover, setShowCover] = useState(true);
  // 'idle' | 'opening' — drives the CSS animation when user clicks "Open Book"
  const [coverOpening, setCoverOpening] = useState<'idle' | 'opening'>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExtrasDrawer, setShowExtrasDrawer] = useState(false);

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

  const [dimensions, setDimensions] = useState({
    width: Math.min(500, Math.max(300, Math.floor((window.innerWidth - 100) / 2))),
    height: Math.min(620, Math.max(380, Math.floor(window.innerHeight - 170))),
  });

  // Always keep a stable ref to the latest note content so the editor seed
  // callback never closes over a stale value — the ref is updated on every
  // render, so whenever setEditorRef fires it reads the current note.
  const noteContentRef = useRef<string>(note?.content ?? '');
  noteContentRef.current = note?.content ?? formData.content ?? '';

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

  useEffect(() => {
    recalculatePagination();
  }, [recalculatePagination]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width:  Math.min(500, Math.max(300, Math.floor((window.innerWidth  - 100) / 2))),
        height: Math.min(620, Math.max(380, Math.floor(window.innerHeight - 170))),
      });
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
    };
  };

  const handleClose = async () => {
    if (autoSaveOnClose && mode === 'edit' && onSave && !isSaving) {
      try {
        await onSave(buildSavePayload());
      } catch (err) {
        console.error('Auto-save on close failed:', err);
      }
    }
    setClosing(true);
    setTimeout(onClose, 300);
  };

  /**
   * Plays the cover-open animation then transitions to the read view.
   * Phase 1 (0–650ms): CSS class 'is-opening' drives a 3D tilt-open keyframe.
   * Phase 2 (650ms): hide cover, reset animation state, show read mode.
   */
  const handleOpenBook = () => {
    if (coverOpening === 'opening') return; // prevent double-click
    setCoverOpening('opening');
    setTimeout(() => {
      setShowCover(false);
      setMode('read');
      setCoverOpening('idle');
      setSpreadIndex(0);
    }, 650);
  };

  // Reset pagination gate whenever read mode is entered so the probe page
  // re-fires and we always get a fresh live-measurement pass.
  useEffect(() => {
    if (mode === 'read' && !showCover) {
      setPaginationReady(false);
      refsPopulatedCountRef.current = 0;
    }
  }, [mode, showCover]);

  const handleSave = async () => {
    if (!onSave || isSaving) return;

    try {
      setSaveStatus('saving');
      const payload = buildSavePayload();
      setFormData((prev) => ({ ...prev, content: payload.content }));
      await onSave(payload, { reason: 'manual' });
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
  const applyBlockFormat = useCallback((tag: 'h2' | 'h3' | 'blockquote') => {
    const el = editorRef.current;
    if (!el) return;

    const activeRange = saveSelectionRange();
    if (!activeRange || activeRange.collapsed) return;

    el.focus();
    suppressInputRef.current = true;

    const range = activeRange.cloneRange();
    const isActive = (() => {
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== el) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toLowerCase() === tag) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    })();

    if (isActive) {
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== el) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toLowerCase() === tag) break;
        node = node.parentNode;
      }
      if (node && node !== el) {
        const p = document.createElement('p');
        p.innerHTML = (node as HTMLElement).innerHTML;
        el.replaceChild(p, node);
      }
    } else {
      const wrapper = document.createElement(tag);
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      restoreSelectionRange(newRange);
    }

    restoreSelectionRange(activeRange.cloneRange());
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
            onClick={() => setMode('read')}
          >
            <BookOpen size={14} />
            <span>3D Reader</span>
          </button>
          <button
            className={`apple-book-mode-btn ${mode === 'edit' ? 'is-active' : ''}`}
            onClick={() => setMode('edit')}
          >
            <PenTool size={14} />
            <span>Direct Book Editor</span>
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
            className={`apple-book-icon-btn ${showCover ? 'is-active' : ''}`}
            onClick={() => setShowCover((v) => !v)}
            title="Toggle Book Cover"
          >
            <Bookmark size={18} />
          </button>

          <button
            className="apple-book-icon-btn hidden sm:flex"
            onClick={() => setIsFullscreen((v) => !v)}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
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
              <span>{isSaving ? 'Saving…' : 'Save Book'}</span>
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

            <div className="apple-book-toc-section">
              <h5 className="apple-book-toc-label">Pages & Spreads</h5>
              <div className="apple-book-toc-list">
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
                        if (flipBookRef.current?.pageFlip) {
                          flipBookRef.current.pageFlip().flip(idx * 2);
                        }
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
                    onClick={() => setTheme(t.id)}
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
                    onClick={() => setFont(f.id)}
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
                    onClick={() => setFontSize(sz)}
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
      <main className={`apple-book-stage ${isFullscreen ? 'is-fullscreen' : ''}`}>
        {showCover ? (
          /* Hardcover presentation */
          <div className="apple-book-cover-stage">
            <div className={`apple-book-hardcover-wrapper ${coverOpening === 'opening' ? 'is-opening' : ''}`}>
              <div className="apple-book-hardcover">
                <div className="apple-book-hardcover-spine" />
                <div className="apple-book-hardcover-face">
                  <div className="apple-book-cover-gold-border" />
                  <div className="apple-book-cover-emblem">
                    <Sparkles size={36} />
                  </div>
                  <h1 className="apple-book-cover-title">
                    {formData.title || (formData.isJournal ? 'Daily Reflections' : 'My Notebook')}
                  </h1>
                  <p className="apple-book-cover-subtitle">{dateLabel}</p>
                  <div className="apple-book-cover-divider" />
                  <p className="apple-book-cover-author">Personal Journal Edition</p>

                  <button
                    className="apple-book-open-btn"
                    onClick={handleOpenBook}
                    disabled={coverOpening === 'opening'}
                  >
                    <BookOpen size={18} />
                    <span>{coverOpening === 'opening' ? 'Opening…' : 'Open Book'}</span>
                  </button>
                </div>
                <div className="apple-book-hardcover-pages-stack" />
                {/* Ribbon bookmark hanging from top */}
                <div className="apple-book-hardcover-ribbon" />
              </div>
            </div>
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
                  onInnerMount={(el) => {
                    leftPageRef.current = el;
                    refsPopulatedCountRef.current += 1;
                    if (refsPopulatedCountRef.current >= 2) {
                      recalculatePagination();
                    }
                  }}
                  onBodyMount={(el) => {
                    pageBodyRef.current = el;
                    refsPopulatedCountRef.current += 1;
                    if (refsPopulatedCountRef.current >= 2) {
                      recalculatePagination();
                    }
                  }}
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
                minHeight={360}
                maxHeight={640}
                maxShadowOpacity={0.5}
                showCover={false}
                mobileScrollSupport={true}
                onFlip={(e: any) => {
                  const currentFlipPage = e.data;
                  setSpreadIndex(Math.floor(currentFlipPage / 2));
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
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
                      
                      // Schedule autosave after another debounce
                      if (autosaveTimerRef.current) {
                        clearTimeout(autosaveTimerRef.current);
                      }
                      autosaveTimerRef.current = setTimeout(async () => {
                        if (!onSave) {
                          console.log('[AppleBookJournal] Autosave skipped: onSave callback not provided');
                          return;
                        }
                        if (isSaving) {
                          console.log('[AppleBookJournal] Autosave skipped: already saving');
                          return;
                        }
                        try {
                          setSaveStatus('saving');
                          const payload = buildSavePayload();
                          console.log('[AppleBookJournal] Autosave: triggering', { contentLength: payload.content.length, version: payload.contentVersion });
                          const result = await onSave(payload, { reason: 'auto' });
                          console.log('[AppleBookJournal] Autosave: successful', result);
                          setSaveStatus('saved');
                          // Auto-reset saved status after 2 seconds
                          setTimeout(() => setSaveStatus('idle'), 2000);
                        } catch (err) {
                          console.error('[AppleBookJournal] Autosave failed:', err);
                          setSaveStatus('error');
                          // Keep unsaved state on error for retry
                          setTimeout(() => setSaveStatus('unsaved'), 2000);
                        }
                      }, 500);
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
              if (flipBookRef.current?.pageFlip) {
                flipBookRef.current.pageFlip().flip(prev * 2);
              }
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
              if (flipBookRef.current?.pageFlip) {
                flipBookRef.current.pageFlip().flip(targetIdx * 2);
              }
            }}
            className="apple-book-slider"
          />

          <button
            className="apple-book-step-btn"
            onClick={() => {
              const next = Math.min(totalSpreads - 1, spreadIndex + 1);
              setSpreadIndex(next);
              if (flipBookRef.current?.pageFlip) {
                flipBookRef.current.pageFlip().flip(next * 2);
              }
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
      </footer>
    </div>
  );
}
