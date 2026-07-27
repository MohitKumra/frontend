import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
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
  RotateCcw,
  ArrowUpDown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useNotes, useDeleteNote, useUpdateNote, useTogglePin, useArchiveNote, useUnarchiveNote } from '../features/notes/hooks/useNotes';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FloatingNotesEmpty } from '../components/ui/FloatingNotesEmpty';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { NoteViewModal } from '../components/notes/NoteViewModal';
import { TagInput } from '../components/notes/TagInput';
import { MoodPicker } from '../components/notes/MoodPicker';
import type { NoteDTO, NoteSortField, NoteSortOrder, NoteMood } from '../types';
import { isImageMedia } from '../components/media/MediaPreview';
import '../styles/theme-journal-notes.css';

type ViewMode = 'grid' | 'list';
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
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalIsJournal, setCreateModalIsJournal] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteDTO | null>(null);
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);
  const [noteMenuOpen, setNoteMenuOpen] = useState<string | null>(null);
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

  // Build query filters
  const queryFilters = useMemo(() => ({
    isJournal: filter === 'journal' ? true : filter === 'notes' ? false : undefined,
    archived: showArchived ? true : undefined,
    search: debouncedSearchQuery || undefined,
    sortField,
    sortOrder,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    mood: filterMood || undefined,
    tags: filterTags.length > 0 ? filterTags : undefined,
  }), [filter, debouncedSearchQuery, sortField, sortOrder, dateFrom, dateTo, filterMood, filterTags, showArchived]);

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
  const allNotes = useMemo(
    () => pagesData?.pages.flatMap((page) => page.data) ?? [],
    [pagesData]
  );

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

  // Apply client-side attachment filter
  const filteredNotes = useMemo(() => {
    if (!attachmentsOnly) return allNotes;
    return allNotes.filter((n) => Boolean(n.attachmentUrl || n.voiceNoteUrl));
  }, [allNotes, attachmentsOnly]);

  // Separate pinned and unpinned for grid view
  const starredNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  // Journal notes for featured panel
  const journalNotes = useMemo(
    () =>
      filteredNotes
        .filter((n) => n.isJournal)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
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
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNote.mutate(id);
      setNoteMenuOpen(null);
      setViewingNote((current) => (current?.id === id ? null : current));
    }
  };

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
    const preview = note.content?.length > 140 ? note.content.slice(0, 140) + '…' : note.content;
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
            {moodEmoji && <span className="text-sm" title={`Mood: ${note.mood}`}>{moodEmoji}</span>}
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
          <span className="np-card-badge">{note.isJournal ? 'Journal' : 'Note'}</span>
          <CardMediaIcons note={note} />
        </div>

        {noteMenuOpen === note.id && <EntryMenu note={note} />}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 sm:gap-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 sm:gap-8"
      >
        {/* ── Header ─────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                style={{ background: 'var(--gradient-accent)', color: 'white' }}
              >
                <FileText size={22} />
              </div>
              <div>
                <h1 className="text-[1.9rem] font-black text-text-primary tracking-tight leading-tight">
                  Notes & Journal
                </h1>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-accent)' }}>
                  {totalCount} note{totalCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Jot down thoughts, journal entries, and important ideas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* View toggle */}
              <div
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
              >
                {(['grid', 'list'] as ViewMode[]).map((vm) => (
                  <button
                    key={vm}
                    onClick={() => setViewMode(vm)}
                    className="p-2 rounded-lg transition-all"
                    style={{
                      background: viewMode === vm ? 'var(--gradient-accent)' : 'transparent',
                      color: viewMode === vm ? 'white' : 'var(--color-text-muted)',
                    }}
                  >
                    {vm === 'grid' ? <Grid3x3 size={15} /> : <List size={15} />}
                  </button>
                ))}
              </div>

              {/* Create Note split button */}
              <div className="relative flex items-stretch rounded-xl overflow-hidden shadow-md" style={{ background: 'var(--gradient-accent)' }}>
                <button
                  onClick={() => {
                    setCreateModalIsJournal(filter === 'journal');
                    setCreateModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white"
                >
                  <Plus size={16} />
                  {filter === 'journal' ? 'New Journal' : 'New Note'}
                </button>
                <button
                  onClick={() => setNewMenuOpen((o) => !o)}
                  aria-label="More create options"
                  className="px-2.5 flex items-center justify-center border-l transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.9)' }}
                >
                  <ChevronDown size={14} />
                </button>
                {newMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border shadow-lg z-20 overflow-hidden"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCreateModalIsJournal(false);
                        setCreateModalOpen(true);
                        setNewMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      📝 New Note
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateModalIsJournal(true);
                        setCreateModalOpen(true);
                        setNewMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      📓 New Journal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
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
              {(['all', 'notes', 'journal', 'archived'] as NoteFilter[]).map((f) => {
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`np-pill ${isActive ? 'is-active' : ''}`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                );
              })}
              <button
                onClick={() => setAttachmentsOnly((v) => !v)}
                className={`np-pill ${attachmentsOnly ? 'is-active' : ''}`}
                title="Show only notes with attachments"
              >
                <Filter size={13} />
                Media
              </button>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`np-pill ${showFilters ? 'is-active' : ''}`}
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
                    <button
                      onClick={toggleSortOrder}
                      className="np-filter-order-btn"
                    >
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
                  <TagInput
                    tags={filterTags}
                    onChange={setFilterTags}
                    placeholder="Filter by tag..."
                  />
                </div>
              </div>

              {/* Clear filters */}
              {(dateFrom || dateTo || filterMood || filterTags.length > 0 || sortField !== 'updatedAt' || sortOrder !== 'desc') && (
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
                        {moodEmoji && <span className="text-base" title={`Mood: ${note.mood}`}>{moodEmoji}</span>}
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
                        <span className="np-list-date">
                          {note.createdAt ? formatFullDate(note.createdAt) : ''}
                        </span>
                        <CardMediaIcons note={note} />
                      </div>

                      {/* Preview */}
                      <p className="np-list-preview">
                        {note.content?.length > 180 ? note.content.slice(0, 180) + '…' : note.content}
                      </p>

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {note.tags.slice(0, 5).map((tag) => (
                            <span key={tag} className="np-list-tag">{tag}</span>
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
          {!showArchived && journalNotes.length > 0 && viewMode === 'grid' &&
            (() => {
              const entry = journalNotes[featuredIndex % journalNotes.length];
              const words = entry.content
                ? entry.content.trim().split(/\s+/).filter(Boolean).length
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
                    <h3 className="relative z-10 text-xl sm:text-2xl font-black mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      {entry.title && !entry.title.startsWith('Journal Entry —')
                        ? entry.title
                        : 'Daily Reflection'}
                    </h3>
                    <p className="relative z-10 text-sm leading-relaxed max-w-xl" style={{ color: 'var(--color-text-secondary)' }}>
                      {entry.content.length > 200
                        ? entry.content.slice(0, 200) + '…'
                        : entry.content}
                    </p>

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                      <div className="relative z-10 flex flex-wrap gap-1.5 mt-3">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="np-list-tag">{tag}</span>
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
                          <div className="np-stat-value">
                            {entry.createdAt ? formatTime(entry.createdAt) : '—'}
                          </div>
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
                        <div className="np-stat-icon">
                          {hasMedia ? <Paperclip size={14} /> : <Edit3 size={14} />}
                        </div>
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
                        <path d="M0 208 L68 126 L118 168 L172 106 L248 172 L318 116 L398 172 L460 148 L460 232 L0 232 Z" fill="url(#npj-m1)" filter="url(#npj-blur-sm)" />
                        <path d="M0 224 L88 146 L148 192 L228 128 L298 198 L368 148 L460 198 L460 240 L0 240 Z" fill="url(#npj-m2)" />
                        <path d="M118 238 L214 138 L268 193 L328 148 L408 218 L460 193 L460 250 L98 250 Z" fill="url(#npj-m3)" />
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
                        <g clipPath="url(#npj-lake-clip)" transform="translate(0 456) scale(1 -1)" opacity="0.38" filter="url(#npj-blur-lg)">
                          <path d="M118 238 L214 138 L268 193 L328 148 L408 218 L460 193 L460 250 L98 250 Z" fill="url(#npj-m3)" />
                          <circle cx="322" cy="64" r="18" fill="#FFE6C2" />
                        </g>
                      </g>
                    </svg>
                  </div>
                </div>
                </div>
              );
            })()}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-text-muted)' }}>
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
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
          onClose={() => { setViewingNote(null); setOriginRect(null); }}
          onEdit={() => {
            setEditingNote(viewingNote);
            setViewingNote(null);
          }}
          onDelete={() => handleDeleteNote(viewingNote.id)}
        />
      )}
      {editingNote && (
        <EntryFormModal
          isOpen
          mode="edit"
          note={editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}

export default NotesPage;
