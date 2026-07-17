import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { useNotes, useDeleteNote } from '../features/notes/hooks/useNotes';
import { LoadingScreen } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { NoteViewModal } from '../components/notes/NoteViewModal';
import type { NoteDTO } from '../types';
import { isImageMedia } from '../components/media/MediaPreview';
import '../styles/theme-journal-notes.css';

type ViewMode = 'grid' | 'list';
type NoteFilter = 'all' | 'notes' | 'journal';
type CardTheme = 'violet' | 'amber' | 'green' | 'blue' | 'pink';

const STARRED_STORAGE_KEY = 'notes:starred';
const NOTE_THEME_ROTATION: CardTheme[] = ['amber', 'blue', 'pink'];

export function NotesPage() {
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteDTO | null>(null);
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);
  const [noteMenuOpen, setNoteMenuOpen] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const { data: allNotes, isLoading } = useNotes();
  const deleteNote = useDeleteNote();

  const notes = allNotes?.data ?? [];

  // Pin/favorite is a client-side convenience (not part of NoteDTO yet) —
  // persisted locally so a starred note keeps showing under "Pinned".
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STARRED_STORAGE_KEY);
      if (raw) setStarredIds(new Set(JSON.parse(raw)));
    } catch {
      /* ignore malformed/blocked storage */
    }
  }, []);

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'notes' && !note.isJournal) ||
        (filter === 'journal' && note.isJournal);

      const matchesSearch =
        searchQuery === '' ||
        note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAttachments =
        !attachmentsOnly || Boolean(note.attachmentUrl || note.voiceNoteUrl);

      return matchesFilter && matchesSearch && matchesAttachments;
    });
  }, [notes, filter, searchQuery, attachmentsOnly]);

  const counts = {
    all: notes.length,
    notes: notes.filter((n) => !n.isJournal).length,
    journal: notes.filter((n) => n.isJournal).length,
  };

  const starredNotes = filteredNotes.filter((n) => starredIds.has(n.id));
  const otherNotes = filteredNotes.filter((n) => !starredIds.has(n.id));

  const journalNotes = useMemo(
    () =>
      notes
        .filter((n) => n.isJournal)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [notes]
  );

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNote.mutate(id);
      setNoteMenuOpen(null);
      setViewingNote((current) => (current?.id === id ? null : current));
    }
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

  // ── theming helpers (derived from real fields — no fake data) ──────────
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

  /** Small icon indicating a note has attached media. */
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  const EntryMenu = ({ note }: { note: NoteDTO }) => (
    <div
      className="absolute right-3 top-[52px] w-40 rounded-lg shadow-xl z-30 py-1"
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
          handleDeleteNote(note.id);
        }}
        className="w-full px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
      >
        <Trash2 size={12} />
        Delete
      </button>
    </div>
  );

  // Shared note card renderer — pastel "premium" card used by the grid view.
  const renderCard = (note: NoteDTO) => {
    const starred = starredIds.has(note.id);
    const theme = themeForNote(note, starred);
    const Icon = iconForNote(note);
    const preview =
      note.content?.length > 140 ? note.content.slice(0, 140) + '…' : note.content;

    return (
      <div
        key={note.id}
        onClick={(e) => {
          setOriginRect(e.currentTarget.getBoundingClientRect());
          setViewingNote(note);
        }}
        className={`np-card np-theme-${theme} group`}
      >
        <div className="flex items-start justify-between">
          <div className="np-card-icon">
            <Icon size={18} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(note.id);
            }}
            className={`np-card-star ${starred ? 'is-starred' : ''}`}
            aria-label={starred ? 'Unpin note' : 'Pin note'}
          >
            <Star size={15} fill={starred ? 'currentColor' : 'none'} />
          </button>
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

        <div className="np-card-footer">
          <span className="np-card-badge">{note.isJournal ? 'Journal' : 'Note'}</span>
          <div className="flex items-center gap-1.5">
            <CardMediaIcons note={note} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id);
              }}
              className="np-card-menu-btn"
            >
              <MoreVertical size={14} />
            </button>
          </div>
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
                  Notes &amp; Journal
                </h1>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-accent)' }}>
                  {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
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
              <div className="flex items-stretch rounded-xl overflow-hidden shadow-md" style={{ background: 'var(--gradient-accent)' }}>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white"
                >
                  <Plus size={16} />
                  New Note
                </button>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  aria-label="More create options"
                  className="px-2.5 flex items-center justify-center border-l transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.9)' }}
                >
                  <ChevronDown size={14} />
                </button>
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
              {(['all', 'notes', 'journal'] as NoteFilter[]).map((f) => {
                const count = counts[f];
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`np-pill ${isActive ? 'is-active' : ''}`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="np-pill-count">({count})</span>
                  </button>
                );
              })}
              <button
                onClick={() => setAttachmentsOnly((v) => !v)}
                className={`np-pill ${attachmentsOnly ? 'is-active' : ''}`}
                title="Show only notes with attachments"
              >
                <Filter size={13} />
                Filters
              </button>
            </div>
          </div>
        </motion.div>

        {/* Notes Grid/List */}
        <motion.div variants={itemVariants} className="flex flex-col gap-8">
          {filteredNotes.length === 0 ? (
            <Card variant="default" className="p-12 text-center">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
              >
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">No notes found</h3>
              <p className="text-sm text-text-muted mb-6">
                {filter === 'all'
                  ? 'Get started by creating your first note'
                  : searchQuery
                    ? 'No notes match your search. Try a different keyword.'
                    : `No ${filter} entries yet. Create one to get started.`}
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md"
                style={{ background: 'var(--gradient-accent)' }}
              >
                Create Note
              </button>
            </Card>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-3">
              {filteredNotes.map((note) => {
                const isJournal = note.isJournal;
                return (
                  <div
                    key={note.id}
                    onClick={() => setViewingNote(note)}
                    className="relative flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md"
                    style={{
                      background: isJournal ? 'var(--journal-card-bg)' : 'var(--color-surface-raised)',
                      borderColor: isJournal ? 'var(--journal-card-border)' : 'var(--color-border)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isJournal ? 'var(--journal-icon-bg)' : 'var(--icon-bg-accent)',
                        color: isJournal ? 'var(--journal-gold)' : 'var(--icon-text-accent)',
                      }}
                    >
                      {isJournal ? <BookOpen size={18} /> : <StickyNote size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {note.title || 'Untitled'}
                        </h4>
                        {isJournal && (
                          <Badge variant="warning" size="sm" className="shrink-0">Journal</Badge>
                        )}
                        {!isJournal && note.createdAt && (
                          <span className="text-[10px] font-semibold text-text-muted shrink-0">
                            {formatDate(note.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {note.content?.length > 120 ? note.content.slice(0, 120) + '…' : note.content}
                      </p>
                      <div className="mt-1">
                        <CardMediaIcons note={note} />
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id);
                      }}
                      className="p-1.5 rounded-md shrink-0 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <MoreVertical size={14} />
                    </button>

                    {noteMenuOpen === note.id && (
                      <div
                        className="absolute right-4 top-14 w-40 rounded-lg shadow-xl z-30 py-1"
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
                            handleDeleteNote(note.id);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {starredNotes.length > 0 && (
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

              {otherNotes.length > 0 && (
                <div>
                  {starredNotes.length > 0 && (
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
            </>
          )}

          {/* Featured journal entry panel */}
          {journalNotes.length > 0 &&
            (() => {
              const entry = journalNotes[featuredIndex % journalNotes.length];
              const words = entry.content
                ? entry.content.trim().split(/\s+/).filter(Boolean).length
                : 0;
              const hasMedia = Boolean(entry.attachmentUrl || entry.voiceNoteUrl);
              const menuKey = `featured-${entry.id}`;

              return (
                <div className="np-featured">
                  <div className="np-featured-header">
                    <div className="flex items-center gap-2.5">
                      <BookOpen size={16} style={{ color: 'var(--color-accent)' }} />
                      <span className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                        Journal Entry
                      </span>
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
                        className="np-card-menu-btn"
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
                    <h3 className="text-xl sm:text-2xl font-black mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      {entry.title && !entry.title.startsWith('Journal Entry —')
                        ? entry.title
                        : 'Daily Reflection'}
                    </h3>
                    <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--color-text-secondary)' }}>
                      {entry.content.length > 200
                        ? entry.content.slice(0, 200) + '…'
                        : entry.content}
                    </p>

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
                        {/* sky */}
                        <rect x="0" y="0" width="460" height="300" fill="url(#npj-sky)" />

                        {/* sun + glow */}
                        <circle cx="322" cy="64" r="72" fill="url(#npj-sun-glow)" />
                        <circle cx="322" cy="64" r="18" fill="#FFE6C2" filter="url(#npj-blur-sm)" />

                        {/* clouds */}
                        <g filter="url(#npj-blur-sm)" opacity="0.8">
                          <ellipse cx="118" cy="52" rx="32" ry="10" fill="#FFFFFF" />
                          <ellipse cx="146" cy="47" rx="22" ry="8" fill="#FFFFFF" />
                          <ellipse cx="246" cy="92" rx="24" ry="7" fill="#FFFFFF" />
                        </g>

                        {/* back mountain range — softened for atmospheric depth */}
                        <path
                          d="M0 208 L68 126 L118 168 L172 106 L248 172 L318 116 L398 172 L460 148 L460 232 L0 232 Z"
                          fill="url(#npj-m1)"
                          filter="url(#npj-blur-sm)"
                        />
                        {/* mid mountain range */}
                        <path
                          d="M0 224 L88 146 L148 192 L228 128 L298 198 L368 148 L460 198 L460 240 L0 240 Z"
                          fill="url(#npj-m2)"
                        />
                        {/* front mountain range */}
                        <path
                          d="M118 238 L214 138 L268 193 L328 148 L408 218 L460 193 L460 250 L98 250 Z"
                          fill="url(#npj-m3)"
                        />

                        {/* pine cluster */}
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

                        {/* lake */}
                        <rect x="0" y="228" width="460" height="72" fill="url(#npj-lake)" />

                        {/* blurred reflection of the front range + sun in the water */}
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
              );
            })()}
        </motion.div>
      </motion.div>

      {/* ── Modals ─────────────────────────────────── */}
      <EntryFormModal
        isOpen={createModalOpen}
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