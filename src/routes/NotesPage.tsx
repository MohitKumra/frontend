import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePageVariants } from '../lib/motionVariants';
import {
  FileText,
  Plus,
  Trash2,
  BookOpen,
  Edit3,
  Calendar,
  Search,
  MoreVertical,
  Grid3x3,
  List,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Star,
  Pin,
  Filter,
  ChevronDown,
  Clock,
  StickyNote,
  Archive,
  Bookmark,
  RotateCcw,
  ArrowUpDown,
  Loader2,
  Sparkles,
  Boxes,
} from 'lucide-react';
import {
  useNotes,
  useDeleteNote,
  useUpdateNote,
  useTogglePin,
  useArchiveNote,
  useUnarchiveNote,
} from '../features/notes/hooks/useNotes';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { FloatingNotesEmpty } from '../components/ui/FloatingNotesEmpty';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { NotionImportModal } from '../components/notion/NotionImportModal';
import { useNotionStatus } from '../features/notion/hooks/useNotion';
import { NoteViewModal } from '../components/notes/NoteViewModal';
import { Notes3DCard } from '../components/notes/Notes3DCard';
import { useUIStore } from '../store/uiStore';
import { TagInput } from '../components/notes/TagInput';
import { MoodPicker } from '../components/notes/MoodPicker';
import type { NoteDTO, NoteSortField, NoteSortOrder, NoteMood } from '../types';
import { isImageMedia } from '../components/media/MediaPreview';
import { JournalWeeklyAnalysis } from '../components/notes/JournalAnalysis';
import { notesApi } from '../features/notes/api';
import '../styles/theme-journal-notes.css';

type ViewMode = 'grid' | 'list' | '3d';
type NoteFilter = 'all' | 'notes' | 'journal' | 'archived';
type CardTheme = 'violet' | 'amber' | 'green' | 'blue' | 'pink';

const NOTE_THEME_ROTATION: CardTheme[] = ['amber', 'blue', 'pink'];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const MOOD_EMOJI: Record<string, string> = {
  great: '🌟',
  good: '🙂',
  neutral: '😐',
  bad: '😔',
  awful: '😢',
};

export function NotesPage() {
  const { containerVariants, itemVariants } = usePageVariants();
  const savedNotesView = useUIStore((s) => s.notesViewPreference);
  const setNotesViewPreference = useUIStore((s) => s.setNotesViewPreference);
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(savedNotesView);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalIsJournal, setCreateModalIsJournal] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [notionImportOpen, setNotionImportOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteDTO | null>(null);
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);
  const [noteMenuOpen, setNoteMenuOpen] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Sort & filter state
  const [sortField, setSortField] = useState<NoteSortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<NoteSortOrder>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterMood, setFilterMood] = useState<NoteMood>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const isSearchSettling = searchQuery !== debouncedSearchQuery;

  // Archive state
  const showArchived = filter === 'archived';
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const togglePin = useTogglePin();
  const archiveNote = useArchiveNote();
  const unarchiveNote = useUnarchiveNote();
  const queryClient = useQueryClient();
  const { data: notionStatus } = useNotionStatus();

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      isJournal: filter === 'journal' ? true : filter === 'notes' ? false : undefined,
      archived: showArchived ? true : undefined,
      search: debouncedSearchQuery || undefined,
      sortField,
      sortOrder,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      mood: filterMood || undefined,
      tags: filterTags.length > 0 ? filterTags : undefined,
      hasAttachment: attachmentsOnly || undefined,
    }),
    [filter, debouncedSearchQuery, sortField, sortOrder, dateFrom, dateTo, filterMood, filterTags, showArchived, attachmentsOnly]
  );

  const {
    data: pagesData,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotes(queryFilters);
  const isInitialNotesLoading = isLoading && !pagesData;
  const isNotesRefreshing = (isSearchSettling || (isFetching && !isFetchingNextPage)) && !isInitialNotesLoading;

  // Flatten all pages into a single array
  const allNotes = useMemo(() => pagesData?.pages.flatMap((page) => page.data) ?? [], [pagesData]);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attachment / voice-note filtering is handled on the backend via the
  // `hasAttachment` param, so no client-side re-filter is needed here.
  const filteredNotes = allNotes;

  // ── Filter-tab cooldown — block spam-clicking the tabs for 500ms so we don't
  // fire a request storm (these tabs now query the backend). The tab still
  // switches instantly; further clicks show a "not-allowed" cursor and are ignored.
  const [tabsDisabled, setTabsDisabled] = useState(false);
  const tabCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFilterChange = useCallback(
    (nextFilter: NoteFilter) => {
      if (tabsDisabled) return;
      setFilter(nextFilter);
      setTabsDisabled(true);
      if (tabCooldownRef.current) clearTimeout(tabCooldownRef.current);
      tabCooldownRef.current = setTimeout(() => setTabsDisabled(false), 500);
    },
    [tabsDisabled, setFilter]
  );

  useEffect(() => {
    return () => {
      if (tabCooldownRef.current) clearTimeout(tabCooldownRef.current);
    };
  }, []);

  // Separate pinned and unpinned for grid view
  const starredNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  // Journal notes for featured panel
  const journalNotes = useMemo(
    () =>
      filteredNotes
        .filter((n) => n.isJournal)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filteredNotes]
  );

  // Counts from server meta
  const totalCount = pagesData?.pages[0]?.meta?.total ?? 0;

  const themeForNote = (note: NoteDTO, starred: boolean): CardTheme => {
    if (starred) return 'violet';
    if (note.isJournal) return 'green';
    let hash = 0;
    for (let i = 0; i < note.id.length; i++) hash = (hash * 31 + note.id.charCodeAt(i)) >>> 0;
    return NOTE_THEME_ROTATION[hash % NOTE_THEME_ROTATION.length];
  };

  const iconForNote = (note: NoteDTO) => {
    if (note.voiceNoteUrl) return Mic;
    if (note.attachmentUrl && isImageMedia(note.attachmentUrl)) return ImageIcon;
    if (note.attachmentUrl) return Paperclip;
    if (note.isJournal) return BookOpen;
    return FileText;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const handleDeleteNote = (id: string) => {
    setDeleteConfirmation(id);
    setNoteMenuOpen(null);
  };

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmation) return;
    deleteNote.mutate(deleteConfirmation);
    setViewingNote((current) => (current?.id === deleteConfirmation ? null : current));
    setDeleteConfirmation(null);
  }, [deleteConfirmation, deleteNote]);

  const handleTogglePin = (id: string, currentPinned: boolean) => {
    togglePin.mutate({ id, isPinned: !currentPinned });
    setNoteMenuOpen(null);
  };

  const handleArchive = (id: string) => {
    archiveNote.mutate(id);
    setNoteMenuOpen(null);
  };

  const handleUnarchive = (id: string) => {
    unarchiveNote.mutate(id);
    setNoteMenuOpen(null);
  };

  const CardMediaIcons = ({ note }: { note: NoteDTO }) => {
    const hasAttach = Boolean(note.attachmentUrl);
    const hasVoice = Boolean(note.voiceNoteUrl);
    const isImage = note.attachmentUrl ? isImageMedia(note.attachmentUrl) : false;
    if (!hasAttach && !hasVoice) return null;
    return (
      <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
        {hasVoice && <Mic size={11} />}
        {hasAttach && (isImage ? <ImageIcon size={11} /> : <Paperclip size={11} />)}
      </span>
    );
  };

  // Toggle sort direction
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const setSortFieldAndReset = (field: NoteSortField) => {
    if (sortField === field) {
      toggleSortOrder();
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const EntryMenu = ({ note }: { note: NoteDTO }) => (
    <div
      className="absolute right-3 top-12 w-44 rounded-lg shadow-xl z-30 py-1"
      style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditingNote(note);
          setNoteMenuOpen(null);
        }}
        className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
      >
        <Edit3 size={12} />
        Edit
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleTogglePin(note.id, note.isPinned);
        }}
        className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
      >
        <Pin size={12} />
        {note.isPinned ? 'Unpin' : 'Pin'}
      </button>
      {showArchived ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUnarchive(note.id);
          }}
          className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleArchive(note.id);
          }}
          className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
        >
          <Archive size={12} />
          Archive
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteNote(note.id);
        }}
        className="w-full px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
      >
        <Trash2 size={12} />
        Delete
      </button>
    </div>
  );

  const renderCard = (note: NoteDTO) => {
    const starred = note.isPinned;
    const theme = themeForNote(note, starred);
    const Icon = iconForNote(note);
    const plainContent = note.content
      ? note.content
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
          .replace(/&[a-z]+;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : '';
    const preview = plainContent.length > 140 ? plainContent.slice(0, 140) + '…' : plainContent;
    const moodEmoji = note.mood ? MOOD_EMOJI[note.mood] : null;

    return (
      <div
        key={note.id}
        onClick={(e) => {
          setOriginRect(e.currentTarget.getBoundingClientRect());
          setViewingNote(note);
        }}
        className={`np-card np-theme-${theme} group`}
      >
        {/* Top row: Icon and Action Buttons */}
        <div className="flex items-start justify-between mb-3">
          <div className="np-card-icon">
            <Icon size={18} />
          </div>
          <div className="flex items-center gap-1">
            {moodEmoji && (
              <span className="text-sm" title={`Mood: ${note.mood}`}>
                {moodEmoji}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(note.id, note.isPinned);
              }}
              className={`np-card-action-btn ${starred ? 'is-starred' : ''}`}
              aria-label={starred ? 'Unpin note' : 'Pin note'}
              title={starred ? 'Unpin' : 'Pin'}
            >
              <Pin size={14} fill={starred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (showArchived) {
                  handleUnarchive(note.id);
                } else {
                  handleArchive(note.id);
                }
              }}
              className="np-card-action-btn"
              aria-label={showArchived ? 'Restore note' : 'Archive note'}
              title={showArchived ? 'Restore' : 'Archive'}
            >
              {showArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id);
              }}
              className="np-card-action-btn"
              aria-label="More actions"
              title="More"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        <h3 className="np-card-title">
          {note.title && !note.title.startsWith('Journal Entry —')
            ? note.title
            : note.isJournal
              ? 'Daily Reflection'
              : 'Untitled'}
        </h3>
        <p className="np-card-meta">{note.createdAt ? formatDate(note.createdAt) : ''}</p>
        <p className="np-card-preview">{preview}</p>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  background: 'var(--tag-bg, rgba(99,102,241,0.12))',
                  color: 'var(--tag-color, #6366f1)',
                }}
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[9px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bottom row: Badge and Media Icons */}
        <div className="np-card-footer">
          <div className="flex items-center gap-1.5">
            <span className="np-card-badge">{note.isJournal ? 'Journal' : 'Note'}</span>
            {note.isJournal && note.bookmarkPage && (
              <span className="np-card-bookmark-tag" title={`Bookmarked Page ${note.bookmarkPage}`}>
                <Bookmark size={10} fill="currentColor" />
                <span>Pg {note.bookmarkPage}</span>
              </span>
            )}
          </div>
          <CardMediaIcons note={note} />
        </div>

        {noteMenuOpen === note.id && <EntryMenu note={note} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 sm:gap-8"
      >
        {/* ── Premium Hero Header ─────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <NotesHero
            totalCount={totalCount}
            journalCount={filteredNotes.filter((n) => n.isJournal).length}
            noteCount={filteredNotes.filter((n) => !n.isJournal).length}
            pinnedCount={filteredNotes.filter((n) => n.isPinned).length}
            filter={filter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            notionConnected={!!notionStatus?.connected}
            onNotionImport={() => setNotionImportOpen(true)}
            onNewNote={() => {
              setCreateModalIsJournal(false);
              setCreateModalOpen(true);
            }}
            onNewJournal={() => {
              setCreateModalIsJournal(true);
              setCreateModalOpen(true);
            }}
            newMenuOpen={newMenuOpen}
            setNewMenuOpen={setNewMenuOpen}
          />
        </motion.div>

        {/* Search & Filter Bar */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-xs font-bold rounded-full focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {/* Segmented control for main filters */}
              <div className="np-pill-segmented">
                {(['all', 'notes', 'journal', 'archived'] as NoteFilter[]).map((f) => {
                  const isActive = filter === f;
                  const iconMap: Record<NoteFilter, React.ReactNode> = {
                    all: <FileText size={12} />,
                    notes: <StickyNote size={12} />,
                    journal: <BookOpen size={12} />,
                    archived: <Archive size={12} />,
                  };
                  return (
                    <button
                      key={f}
                      onClick={() => handleFilterChange(f)}
                      disabled={tabsDisabled}
                      style={{ cursor: tabsDisabled ? 'not-allowed' : 'pointer', opacity: tabsDisabled ? 0.6 : 1 }}
                      className={`np-pill ${isActive ? 'is-active' : ''}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="pill-indicator"
                          className="np-pill-indicator"
                          transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 1 }}
                        />
                      )}
                      <span className="relative z-[1] flex items-center gap-[5px]">
                        {iconMap[f]}
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Standalone pills */}
              <button
                onClick={() => setAttachmentsOnly((v) => !v)}
                className={`np-pill-standalone ${attachmentsOnly ? 'is-active' : ''}`}
                title="Show only notes with attachments"
              >
                <Filter size={13} />
                Media
              </button>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`np-pill-standalone ${showFilters ? 'is-active' : ''}`}
                title="Advanced filters"
              >
                <ArrowUpDown size={13} />
                Sort
              </button>
            </div>
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="np-filters-panel">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Sort */}
                <div className="np-filter-section">
                  <label className="np-filter-label">Sort by</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {(['updatedAt', 'createdAt', 'title'] as NoteSortField[]).map((field) => (
                        <button
                          key={field}
                          onClick={() => setSortFieldAndReset(field)}
                          className={`np-filter-btn ${sortField === field ? 'is-active' : ''}`}
                        >
                          {field === 'updatedAt' ? 'Updated' : field === 'createdAt' ? 'Created' : 'Title'}
                        </button>
                      ))}
                    </div>
                    <button onClick={toggleSortOrder} className="np-filter-order-btn">
                      <ArrowUpDown size={13} />
                      {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                    </button>
                  </div>
                </div>

                {/* Date range */}
                <div className="np-filter-section">
                  <label className="np-filter-label">Date range</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="np-filter-date-input"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="np-filter-date-input"
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Mood filter */}
                <div className="np-filter-section">
                  <label className="np-filter-label">Mood</label>
                  <MoodPicker value={filterMood} onChange={setFilterMood} />
                </div>

                {/* Tag filter */}
                <div className="np-filter-section">
                  <label className="np-filter-label">Tags</label>
                  <TagInput tags={filterTags} onChange={setFilterTags} placeholder="Filter by tag..." />
                </div>
              </div>

              {/* Clear filters */}
              {(dateFrom ||
                dateTo ||
                filterMood ||
                filterTags.length > 0 ||
                sortField !== 'updatedAt' ||
                sortOrder !== 'desc') && (
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setFilterMood(null);
                    setFilterTags([]);
                    setSortField('updatedAt');
                    setSortOrder('desc');
                  }}
                  className="np-filter-clear-btn"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Notes Grid/List with Infinite Scroll */}
        <motion.div variants={itemVariants} className="relative flex flex-col gap-8">
          {isNotesRefreshing && (
            <div className="pointer-events-none absolute right-0 top-0 z-20 flex justify-end">
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Loader2 size={12} className="animate-spin" />
                Updating notes
              </div>
            </div>
          )}

          {isInitialNotesLoading ? (
            <Card variant="default" className="p-12 text-center">
              <div className="flex min-h-[260px] items-center justify-center">
                <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader2 size={18} className="animate-spin" />
                  Loading notes
                </div>
              </div>
            </Card>
          ) : filteredNotes.length === 0 ? (
            <Card variant="default" className="p-6 sm:p-10 text-center">
              <FloatingNotesEmpty
                title={
                  showArchived
                    ? 'No archived notes'
                    : filter === 'all'
                      ? 'No Journal / Notes found'
                      : filter === 'journal'
                        ? 'No Journal entries found'
                        : 'No notes found'
                }
                description={
                  showArchived
                    ? 'Archived notes will appear here when you archive them.'
                    : filter === 'all'
                      ? 'Get started by creating your first note or journal entry.'
                      : searchQuery
                        ? 'No notes match your search keyword.'
                        : `No ${filter} entries yet. Create one to get started.`
                }
                onCreateNote={
                  !showArchived
                    ? () => {
                        setCreateModalIsJournal(filter === 'journal');
                        setCreateModalOpen(true);
                      }
                    : undefined
                }
                actionText={
                  filter === 'all'
                    ? 'Create Journal / Note'
                    : filter === 'journal'
                      ? 'Create Journal Entry'
                      : 'Create Note'
                }
                isJournal={filter === 'journal'}
              />
            </Card>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-4">
              {filteredNotes.map((note) => {
                const moodEmoji = note.mood ? MOOD_EMOJI[note.mood] : null;
                const starred = note.isPinned;

                return (
                  <div
                    key={note.id}
                    onClick={(e) => {
                      setOriginRect(e.currentTarget.getBoundingClientRect());
                      setViewingNote(note);
                    }}
                    className="np-list-item group"
                  >
                    {/* Left: Icon */}
                    <div className={`np-list-icon ${note.isJournal ? 'is-journal' : ''}`}>
                      {note.isJournal ? <BookOpen size={20} /> : <FileText size={20} />}
                    </div>

                    {/* Center: Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title Row */}
                      <div className="flex items-center gap-2 mb-2">
                        {moodEmoji && (
                          <span className="text-base" title={`Mood: ${note.mood}`}>
                            {moodEmoji}
                          </span>
                        )}
                        <h4 className="np-list-title">
                          {note.title && !note.title.startsWith('Journal Entry —')
                            ? note.title
                            : note.isJournal
                              ? 'Daily Reflection'
                              : 'Untitled'}
                        </h4>
                        {starred && (
                          <Pin size={13} fill="currentColor" className="shrink-0" style={{ color: '#f5b301' }} />
                        )}
                        <span className="np-list-badge">{note.isJournal ? 'Journal' : 'Note'}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={12} className="shrink-0 opacity-70" />
                        <span className="np-list-date">{note.createdAt ? formatFullDate(note.createdAt) : ''}</span>
                        <CardMediaIcons note={note} />
                      </div>

                      {/* Preview */}
                      <p className="np-list-preview">
                        {(() => {
                          const plain = note.content
                            ? note.content.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
                            : '';
                          return plain.length > 180 ? plain.slice(0, 180) + '…' : plain;
                        })()}
                      </p>

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {note.tags.slice(0, 5).map((tag) => (
                            <span key={tag} className="np-list-tag">
                              {tag}
                            </span>
                          ))}
                          {note.tags.length > 5 && (
                            <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                              +{note.tags.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="np-list-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note.id, note.isPinned);
                        }}
                        className={`np-list-action-btn ${starred ? 'is-starred' : ''}`}
                        aria-label={starred ? 'Unpin note' : 'Pin note'}
                        title={starred ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={16} fill={starred ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (showArchived) {
                            handleUnarchive(note.id);
                          } else {
                            handleArchive(note.id);
                          }
                        }}
                        className="np-list-action-btn"
                        aria-label={showArchived ? 'Restore note' : 'Archive note'}
                        title={showArchived ? 'Restore' : 'Archive'}
                      >
                        {showArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id);
                        }}
                        className="np-list-action-btn"
                        aria-label="More actions"
                        title="More"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {/* Dropdown Menu */}
                    {noteMenuOpen === note.id && <EntryMenu note={note} />}
                  </div>
                );
              })}
            </div>
          ) : viewMode === '3d' ? (
            <div className="np3d-grid">
              {filteredNotes.map((note) => (
                <Notes3DCard
                  key={note.id}
                  note={note}
                  showArchived={showArchived}
                  starred={note.isPinned}
                  menuOpen={noteMenuOpen === note.id}
                  onOpen={(e, n) => {
                    setOriginRect(e.currentTarget.getBoundingClientRect());
                    setViewingNote(n);
                  }}
                  onTogglePin={handleTogglePin}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onMenuToggle={(id) => setNoteMenuOpen(noteMenuOpen === id ? null : id)}
                  menu={noteMenuOpen === note.id ? <EntryMenu note={note} /> : null}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Grid View — Pinned section */}
              {!showArchived && starredNotes.length > 0 && (
                <div>
                  <div className="np-eyebrow">
                    <Pin size={12} />
                    Pinned
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {starredNotes.map((note) => (
                      <div key={note.id} className="sm:col-span-2">
                        {renderCard(note)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid View — Other notes */}
              {otherNotes.length > 0 && (
                <div>
                  {!showArchived && starredNotes.length > 0 && (
                    <div className="np-eyebrow">
                      <Pin size={12} style={{ opacity: 0.4 }} />
                      Others
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {otherNotes.map((note) => renderCard(note))}
                  </div>
                </div>
              )}

              {/* Grid View — archived items (no eyebrow sections) */}
              {showArchived && filteredNotes.map((note) => renderCard(note))}
            </>
          )}

          {/* Featured journal entry panel */}
          {!showArchived &&
            journalNotes.length > 0 &&
            viewMode === 'grid' &&
            (() => {
              const entry = journalNotes[featuredIndex % journalNotes.length];
              const words = entry.content
                ? entry.content
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/&[a-z]+;/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean).length
                : 0;
              const hasMedia = Boolean(entry.attachmentUrl || entry.voiceNoteUrl);
              const moodEmoji = entry.mood ? MOOD_EMOJI[entry.mood] : null;
              const menuKey = `featured-${entry.id}`;

              return (
                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {/* Differentiating Section Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-accent">
                      <Sparkles size={14} className="text-amber-500 fill-amber-500/20" />
                      <span>Journal Spotlight</span>
                    </div>
                    <span className="text-[11px] font-bold text-text-muted">
                      {featuredIndex + 1} of {journalNotes.length} reflections
                    </span>
                  </div>

                  <div className="np-featured">
                    <div className="np-featured-header">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <BookOpen size={14} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md">
                          Featured Reflection
                        </span>
                        {moodEmoji && <span className="text-base">{moodEmoji}</span>}
                      </div>
                      <div className="relative flex items-center gap-2">
                        <button
                          onClick={() => setFeaturedIndex((i) => (i + 1) % journalNotes.length)}
                          className="np-featured-date-btn"
                          disabled={journalNotes.length < 2}
                        >
                          <Calendar size={13} />
                          {entry.createdAt ? formatFullDate(entry.createdAt) : 'Undated'}
                          {journalNotes.length > 1 && <ChevronDown size={12} />}
                        </button>
                        <button
                          onClick={() => setNoteMenuOpen(noteMenuOpen === menuKey ? null : menuKey)}
                          className="np-card-action-btn"
                          style={{ opacity: 1, position: 'static' }}
                        >
                          <MoreVertical size={15} />
                        </button>
                        {noteMenuOpen === menuKey && <EntryMenu note={entry} />}
                      </div>
                    </div>

                    <div
                      className="np-featured-body cursor-pointer"
                      onClick={(e) => {
                        setOriginRect(e.currentTarget.getBoundingClientRect());
                        setViewingNote(entry);
                      }}
                    >
                      <h3
                        className="relative z-10 text-xl sm:text-2xl font-black mb-3"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {entry.title && !entry.title.startsWith('Journal Entry —') ? entry.title : 'Daily Reflection'}
                      </h3>
                      <p
                        className="relative z-10 text-sm leading-relaxed max-w-xl"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {(() => {
                          const plain = entry.content
                            ? entry.content.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
                            : '';
                          return plain.length > 200 ? plain.slice(0, 200) + '…' : plain;
                        })()}
                      </p>

                      {/* Tags */}
                      {entry.tags.length > 0 && (
                        <div className="relative z-10 flex flex-wrap gap-1.5 mt-3">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="np-list-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="np-featured-stats">
                        <div className="np-stat">
                          <div className="np-stat-icon">
                            <Clock size={14} />
                          </div>
                          <div>
                            <div className="np-stat-label">Time</div>
                            <div className="np-stat-value">{entry.createdAt ? formatTime(entry.createdAt) : '—'}</div>
                          </div>
                        </div>
                        <div className="np-stat">
                          <div className="np-stat-icon">
                            <FileText size={14} />
                          </div>
                          <div>
                            <div className="np-stat-label">Words</div>
                            <div className="np-stat-value">{words}</div>
                          </div>
                        </div>
                        <div className="np-stat">
                          <div className="np-stat-icon">{hasMedia ? <Paperclip size={14} /> : <Edit3 size={14} />}</div>
                          <div>
                            <div className="np-stat-label">{hasMedia ? 'Attached' : 'Updated'}</div>
                            <div className="np-stat-value">
                              {hasMedia ? 'Media file' : entry.updatedAt ? formatDate(entry.updatedAt) : '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <svg
                        className="np-featured-illustration"
                        viewBox="0 0 460 300"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient id="npj-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FDEEE3" />
                            <stop offset="38%" stopColor="#F1E1F1" />
                            <stop offset="68%" stopColor="#DBD1F6" />
                            <stop offset="100%" stopColor="#C6BAEE" />
                          </linearGradient>
                          <radialGradient id="npj-sun-glow" cx="70%" cy="20%" r="42%">
                            <stop offset="0%" stopColor="#FFDDB0" stopOpacity="0.9" />
                            <stop offset="50%" stopColor="#F6C6C4" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#F6C6C4" stopOpacity="0" />
                          </radialGradient>
                          <linearGradient id="npj-m1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#CBC1EF" />
                            <stop offset="100%" stopColor="#AFA1E0" />
                          </linearGradient>
                          <linearGradient id="npj-m2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9C8DD9" />
                            <stop offset="100%" stopColor="#8477C9" />
                          </linearGradient>
                          <linearGradient id="npj-m3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7A6BC3" />
                            <stop offset="100%" stopColor="#584C9E" />
                          </linearGradient>
                          <linearGradient id="npj-lake" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E9E1F8" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#B6A8E5" stopOpacity="0.25" />
                          </linearGradient>
                          <radialGradient id="npj-fade" cx="78%" cy="80%" r="78%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                            <stop offset="58%" stopColor="#ffffff" stopOpacity="0.92" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                          </radialGradient>
                          <mask id="npj-edge-mask">
                            <rect x="0" y="0" width="460" height="300" fill="url(#npj-fade)" />
                          </mask>
                          <clipPath id="npj-lake-clip">
                            <rect x="0" y="228" width="460" height="72" />
                          </clipPath>
                          <filter id="npj-blur-sm" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="2.4" />
                          </filter>
                          <filter id="npj-blur-lg" x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur stdDeviation="6" />
                          </filter>
                        </defs>

                        <g mask="url(#npj-edge-mask)">
                          <rect x="0" y="0" width="460" height="300" fill="url(#npj-sky)" />
                          <circle cx="322" cy="64" r="72" fill="url(#npj-sun-glow)" />
                          <circle cx="322" cy="64" r="18" fill="#FFE6C2" filter="url(#npj-blur-sm)" />
                          <g filter="url(#npj-blur-sm)" opacity="0.8">
                            <ellipse cx="118" cy="52" rx="32" ry="10" fill="#FFFFFF" />
                            <ellipse cx="146" cy="47" rx="22" ry="8" fill="#FFFFFF" />
                            <ellipse cx="246" cy="92" rx="24" ry="7" fill="#FFFFFF" />
                          </g>
                          <path
                            d="M0 208 L68 126 L118 168 L172 106 L248 172 L318 116 L398 172 L460 148 L460 232 L0 232 Z"
                            fill="url(#npj-m1)"
                            filter="url(#npj-blur-sm)"
                          />
                          <path
                            d="M0 224 L88 146 L148 192 L228 128 L298 198 L368 148 L460 198 L460 240 L0 240 Z"
                            fill="url(#npj-m2)"
                          />
                          <path
                            d="M118 238 L214 138 L268 193 L328 148 L408 218 L460 193 L460 250 L98 250 Z"
                            fill="url(#npj-m3)"
                          />
                          <g fill="#463B85">
                            <path d="M366 176 L376 203 L356 203 Z" />
                            <path d="M383 188 L394 216 L372 216 Z" />
                            <path d="M400 174 L411 201 L389 201 Z" />
                            <path d="M418 192 L429 218 L407 218 Z" />
                            <rect x="371" y="201" width="4" height="9" />
                            <rect x="389" y="214" width="4" height="9" />
                            <rect x="405" y="199" width="4" height="9" />
                            <rect x="423" y="216" width="4" height="9" />
                          </g>
                          <rect x="0" y="228" width="460" height="72" fill="url(#npj-lake)" />
                          <g
                            clipPath="url(#npj-lake-clip)"
                            transform="translate(0 456) scale(1 -1)"
                            opacity="0.38"
                            filter="url(#npj-blur-lg)"
                          >
                            <path
                              d="M118 238 L214 138 L268 193 L328 148 L408 218 L460 193 L460 250 L98 250 Z"
                              fill="url(#npj-m3)"
                            />
                            <circle cx="322" cy="64" r="18" fill="#FFE6C2" />
                          </g>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* AI Weekly Journal Summary */}
          {filter === 'journal' && <JournalWeeklyAnalysis />}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
                />
                Loading more...
              </div>
            )}
            {!hasNextPage && filteredNotes.length > 0 && (
              <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                All {totalCount} notes loaded
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Modals ─────────────────────────────────── */}
      <NotionImportModal isOpen={notionImportOpen} onClose={() => setNotionImportOpen(false)} mode="notes" />
      <EntryFormModal
        isOpen={createModalOpen}
        defaultIsJournal={createModalIsJournal}
        onClose={() => setCreateModalOpen(false)}
      />
      {viewingNote && (
        <NoteViewModal
          isOpen
          note={viewingNote}
          originRect={originRect}
          onClose={() => {
            setViewingNote(null);
            setOriginRect(null);
          }}
          onEdit={() => {
            setEditingNote(viewingNote);
            setViewingNote(null);
          }}
          onDelete={() => handleDeleteNote(viewingNote.id)}
          onSave={async (data) => {
            const updated = await updateNote.mutateAsync({ id: viewingNote.id, data });
            // Refresh the open book so the edited content is shown immediately.
            setViewingNote((cur) => (cur && cur.id === updated.id ? updated : cur));
          }}
          onToggleBookmark={async (bookmarks) => {
            const updated = await updateNote.mutateAsync({ id: viewingNote.id, data: { bookmarks } });
            // Keep viewingNote in sync so the bookmark ribbon stays accurate
            // if the user closes and reopens the book in the same session.
            setViewingNote((cur) => (cur && cur.id === updated.id ? updated : cur));
          }}
          onUploadCover={async (processed) => {
            const updated = await notesApi.uploadCover(viewingNote.id, processed);
            setViewingNote((cur) => (cur && cur.id === updated.id ? updated : cur));
            void queryClient.invalidateQueries({ queryKey: ['notes'] });
            return updated;
          }}
          onRemoveCover={async () => {
            const updated = await notesApi.removeCover(viewingNote.id);
            setViewingNote((cur) => (cur && cur.id === updated.id ? updated : cur));
            void queryClient.invalidateQueries({ queryKey: ['notes'] });
          }}
          onSaveCoverStyle={async (style) => {
            const updated = await notesApi.saveCoverStyle(viewingNote.id, style);
            setViewingNote((cur) => (cur && cur.id === updated.id ? updated : cur));
            void queryClient.invalidateQueries({ queryKey: ['notes'] });
            return updated;
          }}
          onSaveBookStyle={async (bookStyle) => {
            const updated = await notesApi.saveBookStyle(viewingNote.id, bookStyle);
            setViewingNote((cur) => (cur && cur.id === updated.id ? updated : cur));
            void queryClient.invalidateQueries({ queryKey: ['notes'] });
            return updated;
          }}
          autoSaveOnClose
        />
      )}
      {editingNote && <EntryFormModal isOpen mode="edit" note={editingNote} onClose={() => setEditingNote(null)} />}

      {/* Delete confirmation modal */}
      <Modal open={deleteConfirmation !== null} onClose={() => setDeleteConfirmation(null)} title="Confirm Deletion">
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {(() => {
              const note = allNotes.find((n) => n.id === deleteConfirmation);
              return note ? (
                <>
                  Are you sure you want to delete{' '}
                  <strong>{note.title || (note.isJournal ? 'This Journal' : 'This Note')}</strong>? This action cannot
                  be undone.
                </>
              ) : (
                <>Are you sure you want to delete this? This action cannot be undone.</>
              );
            })()}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ───────────────────────── Notes Page Premium Hero ───────────────────────── */

function NotesHero({
  totalCount,
  journalCount,
  noteCount,
  pinnedCount,
  filter,
  viewMode,
  setViewMode,
  notionConnected,
  onNotionImport,
  onNewNote,
  onNewJournal,
  newMenuOpen,
  setNewMenuOpen,
}: {
  totalCount: number;
  journalCount: number;
  noteCount: number;
  pinnedCount: number;
  filter: NoteFilter;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  notionConnected: boolean;
  onNotionImport: () => void;
  onNewNote: () => void;
  onNewJournal: () => void;
  newMenuOpen: boolean;
  setNewMenuOpen: (fn: (v: boolean) => boolean) => void;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 18 });
  const blob1X = useTransform(springX, [0, 1], ['-5%', '5%']);
  const blob1Y = useTransform(springY, [0, 1], ['-5%', '5%']);
  const blob2X = useTransform(springX, [0, 1], ['5%', '-5%']);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  // Mini bar data — proportional widths
  const barTotal = Math.max(noteCount + journalCount, 1);
  const noteBarPct = Math.round((noteCount / barTotal) * 100);
  const journalBarPct = 100 - noteBarPct;

  function setNotesViewPreference(vm: string) {
    throw new Error('Function not implemented.');
  }

  return (
    <div
      ref={heroRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden rounded-[28px]"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow:
          '0 0 0 1px color-mix(in srgb, var(--color-accent) 6%, transparent), 0 20px 60px -12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Ambient blobs */}
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full"
        aria-hidden="true"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 13%, transparent), transparent 70%)',
            filter: 'blur(36px)',
          }}
        />
      </motion.div>
      <motion.div
        style={{ x: blob2X }}
        className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full"
        aria-hidden="true"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, #EC4899 10%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </motion.div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:p-5">
        {/* Row 1: eyebrow + CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <FileText size={11} />
            </motion.span>
            Notes &amp; Journal
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div
              className="flex items-center gap-1 rounded-2xl border p-1"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              {(['grid', 'list', '3d'] as ViewMode[]).map((vm) => (
                <button
                  key={vm}
                  onClick={() => {
                    setViewMode(vm);
                    setNotesViewPreference(vm);
                  }}
                  className="flex items-center justify-center rounded-xl p-2 transition-all"
                  style={
                    viewMode === vm
                      ? { background: 'linear-gradient(135deg, var(--color-accent), #818CF8)', color: 'white' }
                      : { color: 'var(--color-text-muted)' }
                  }
                >
                  {vm === 'grid' ? <Grid3x3 size={14} /> : vm === 'list' ? <List size={14} /> : <Boxes size={14} />}
                </button>
              ))}
            </div>

            {/* Notion import */}
            {notionConnected && (
              <button
                onClick={onNotionImport}
                className="inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-black transition-all hover:opacity-80 active:scale-95"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <BookOpen size={14} /> Notion Import
              </button>
            )}

            {/* Split create button */}
            <div
              className="relative flex items-stretch"
              style={{ boxShadow: '0 4px 14px color-mix(in srgb, var(--color-accent) 28%, transparent)' }}
            >
              <div className="flex items-stretch overflow-hidden rounded-2xl">
                <button
                  onClick={onNewNote}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), #818CF8)' }}
                >
                  <Plus size={14} /> New Note
                </button>
                <button
                  onClick={() => setNewMenuOpen((o) => !o)}
                  className="flex items-center justify-center border-l px-2.5 text-white transition-colors hover:opacity-80"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent), #818CF8)',
                    borderColor: 'rgba(255,255,255,0.25)',
                  }}
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              {newMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-40 overflow-hidden rounded-2xl border shadow-lg z-30"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onNewJournal();
                      setNewMenuOpen(() => false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-left transition-colors hover:opacity-80"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <BookOpen size={13} style={{ color: '#EC4899' }} />
                    New Journal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Headline + stat cluster */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: headline + sub */}
          <div className="min-w-0">
            <h1
              className="font-black tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.6rem)', lineHeight: 1.08, color: 'var(--color-text-primary)' }}
            >
              Your <span style={{ color: 'var(--color-accent)' }}>thoughts,</span> captured.
            </h1>
            <p className="mt-2 text-sm leading-relaxed max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {totalCount > 0
                ? `${totalCount} entr${totalCount !== 1 ? 'ies' : 'y'} — ${noteCount} note${noteCount !== 1 ? 's' : ''}, ${journalCount} journal${journalCount !== 1 ? 's' : ''}.`
                : 'Start writing — notes and journal entries live here.'}
            </p>

            {/* Stacked composition bar */}
            {totalCount > 0 && (
              <div className="mt-4 max-w-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    Composition
                  </span>
                  <span className="text-[11px] font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {noteCount} notes · {journalCount} journals
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden flex"
                  style={{ background: 'var(--color-border-subtle)' }}
                >
                  <motion.div
                    className="h-full rounded-l-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${noteBarPct}%` }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: 'linear-gradient(90deg, var(--color-accent), #818CF8)' }}
                  />
                  <motion.div
                    className="h-full rounded-r-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${journalBarPct}%` }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                    style={{ background: 'linear-gradient(90deg, #EC4899, #F9A8D4)' }}
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      Notes
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: '#EC4899' }} />
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      Journal
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: inline stats strip */}
          <div
            className="flex items-center divide-x overflow-hidden rounded-2xl border lg:shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {[
              { value: noteCount, label: 'Notes', color: 'var(--color-accent)' },
              { value: journalCount, label: 'Journals', color: '#EC4899' },
              { value: pinnedCount, label: 'Pinned', color: 'var(--color-warning)' },
              { value: totalCount, label: 'Total', color: 'var(--color-text-primary)' },
            ].map((s, i) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-0.5 px-5 py-3 min-w-[72px]"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.15em] leading-none"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {s.label}
                </span>
                <motion.span
                  className="text-2xl font-black leading-tight"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  style={{ color: s.color }}
                >
                  {s.value}
                </motion.span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotesPage;
