import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import {
  FileText,
  Plus,
  Trash2,
  BookOpen,
  StickyNote,
  Edit3,
  Calendar,
  Search,
  MoreVertical,
  Grid3x3,
  List,
  Paperclip,
  Mic,
  Image as ImageIcon,
} from 'lucide-react';
import { useNotes, useDeleteNote } from '../features/notes/hooks/useNotes';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { NoteViewModal } from '../components/notes/NoteViewModal';
import type { NoteDTO } from '../types';
import { isImageMedia } from '../components/media/MediaPreview';
import '../styles/theme-journal-notes.css';

type ViewMode = 'grid' | 'list';
type NoteFilter = 'all' | 'notes' | 'journal';

interface TravelStyle extends React.CSSProperties {
  '--start-x'?: string;
  '--start-y'?: string;
  '--end-x'?: string;
  '--end-y'?: string;
  '--end-scale'?: string;
}

export function NotesPage() {
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteDTO | null>(null);
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);
  const [noteMenuOpen, setNoteMenuOpen] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);

  // Traveling highlight for filter tabs
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Record<NoteFilter, HTMLButtonElement | null>>({
    all: null,
    notes: null,
    journal: null,
  });
  const prevActiveRect = useRef<DOMRect | null>(null);
  const [travelStyle, setTravelStyle] = useState<TravelStyle | null>(null);
  const [travelKey, setTravelKey] = useState(0);

  const { data: allNotes, isLoading } = useNotes();
  const deleteNote = useDeleteNote();

  const notes = allNotes?.data ?? [];

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

      return matchesFilter && matchesSearch;
    });
  }, [notes, filter, searchQuery]);

  const counts = {
    all: notes.length,
    notes: notes.filter((n) => !n.isJournal).length,
    journal: notes.filter((n) => n.isJournal).length,
  };

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

  const formatJournalDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // ── traveling highlight for filter tabs ──────────────────────────────────

  const handleFilterClick = (f: NoteFilter) => {
    if (f === filter) return;
    const oldBtn = filterRefs.current[filter];
    prevActiveRect.current = oldBtn ? oldBtn.getBoundingClientRect() : null;
    setFilter(f);
  };

  useEffect(() => {
    const newBtn = filterRefs.current[filter];
    const prevRect = prevActiveRect.current;
    if (newBtn && prevRect) {
      const newRect = newBtn.getBoundingClientRect();
      const startX = prevRect.left + prevRect.width / 2;
      const startY = prevRect.top + prevRect.height / 2;
      const endX = newRect.left + newRect.width / 2;
      const endY = newRect.top + newRect.height / 2;
      const baseSize = 20;
      setTravelStyle({
        left: 0,
        top: 0,
        width: baseSize,
        height: baseSize,
        marginLeft: -baseSize / 2,
        marginTop: -baseSize / 2,
        background: 'var(--gradient-accent)',
        '--start-x': `${startX}px`,
        '--start-y': `${startY}px`,
        '--end-x': `${endX}px`,
        '--end-y': `${endY}px`,
        '--end-scale': `${Math.max(newRect.width, newRect.height) / baseSize}`,
      });
      setTravelKey((k) => k + 1);
      prevActiveRect.current = null;
    }
  }, [filter]);

  // ── simple media icons for card indicators ─────────────────────────
  /** Small icon indicating a note has attached media. Used on grid cards. */
  const CardMediaIcons = ({ note }: { note: NoteDTO }) => {
    const hasAttach = Boolean(note.attachmentUrl);
    const hasVoice = Boolean(note.voiceNoteUrl);
    const isImage = note.attachmentUrl ? isImageMedia(note.attachmentUrl) : false;
    if (!hasAttach && !hasVoice) return null;
    return (
      <span className="inline-flex items-center gap-1 ml-auto" style={{ color: 'var(--color-text-muted)' }}>
        {hasVoice && <Mic size={11} />}
        {hasAttach && (isImage ? <ImageIcon size={11} /> : <Paperclip size={11} />)}
      </span>
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Shared journal book card renderer (grid + list use the same markup)
  const renderJournalCard = (note: NoteDTO) => (
    <div
      key={note.id}
      onClick={(e) => {
        setOriginRect(e.currentTarget.getBoundingClientRect());
        setViewingNote(note);
      }}
      className="journal-card group cursor-pointer"
    >
      <div className="journal-card-inner">
        {/* Top Ribbon */}
        <div className="journal-ribbon">
          <BookOpen size={11} className="opacity-70" />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Journal</span>
        </div>

        {/* Date */}
        <div className="journal-date">
          <Calendar size={12} className="opacity-60" />
          <span className="text-[10px] font-bold opacity-60">
            {note.createdAt ? formatJournalDate(note.createdAt) : 'Date unknown'}
          </span>
        </div>

        {/* Title — only shown if it exists and isn't a date-based placeholder */}
        <h3 className="journal-title">
          {note.title && !note.title.startsWith('Journal Entry —') ? note.title : 'Daily Reflection'}
        </h3>

        {/* Content Preview */}
        <p className="journal-preview">
          {note.content?.length > 150 ? note.content.slice(0, 150) + '…' : note.content}
        </p>

        {/* Media indicators — simple icons */}
        <div className="absolute bottom-3 left-3 z-10">
          <CardMediaIcons note={note} />
        </div>

        {/* Menu button — visible on hover */}
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id);
            }}
            className="p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
            style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--journal-gold)' }}
          >
            <MoreVertical size={12} />
          </button>

          {noteMenuOpen === note.id && (
            <div
              className="absolute right-0 top-full mt-1 w-40 rounded-lg shadow-xl z-30 py-1"
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
      </div>
    </div>
  );

  // Sticky-note card renderer — yellow post-it with a pin, click area = the note itself
  const renderStickyNote = (note: NoteDTO) => (
    <div
      key={note.id}
      onClick={() => setViewingNote(note)}
      className="sticky-note group cursor-pointer"
    >
      <div className="sticky-note-pin" />

      {/* Menu Button */}
      <div className="absolute top-2 right-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id);
          }}
          className="p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
          style={{ background: 'rgba(0,0,0,0.08)', color: '#5c4a1a' }}
        >
          <MoreVertical size={12} />
        </button>

        {noteMenuOpen === note.id && (
          <div
            className="absolute right-0 top-full mt-1 w-40 rounded-lg shadow-xl z-30 py-1"
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

      {/* Content */}
      <div className="sticky-note-content">
        <p className="sticky-note-text">
          {note.content?.length > 120 ? note.content.slice(0, 120) + '…' : note.content}
        </p>
      </div>

      {/* Footer / date */}
      <div className="sticky-note-footer">
        <span className="text-[9px] font-bold opacity-50">
          {note.createdAt ? formatDate(note.createdAt) : ''}
        </span>
        {note.title && !note.title.startsWith('Journal Entry') && (
          <span className="text-[9px] font-bold opacity-50 truncate ml-2 max-w-[80px]">
            {note.title}
          </span>
        )}
        <CardMediaIcons note={note} />
      </div>
    </div>
  );

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
      <div
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <PageHeader
            icon={<FileText size={28} />}
            title="Notes & Journal"
            subtitle={`${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''}`}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Jot down thoughts, journal entries, and important ideas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            {(['grid', 'list'] as ViewMode[]).map((vm) => (
              <button
                key={vm}
                onClick={() => setViewMode(vm)}
                className="p-2 rounded-md transition-all"
                style={{
                  background: viewMode === vm ? 'var(--gradient-accent)' : 'transparent',
                  color: viewMode === vm ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {vm === 'grid' ? <Grid3x3 size={14} /> : <List size={14} />}
              </button>
            ))}
          </div>

          {/* Create Note Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:shadow-md"
            style={{
              background: 'var(--gradient-accent)',
            }}
          >
            <Plus size={16} />
            New Note
          </button>
        </div>
      </div>
      </motion.div>

        {/* Search & Filter Bar */}
        <motion.div variants={itemVariants}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-bold border rounded-lg focus:outline-none focus:ring-2 transition-all"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Filter Tabs — traveling highlight */}
        <div
          ref={filterContainerRef}
          className="relative flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {(['all', 'notes', 'journal'] as NoteFilter[]).map((f) => {
            const count = counts[f];
            const isActive = filter === f;

            return (
              <button
                key={f}
                ref={(el) => { filterRefs.current[f] = el; }}
                onClick={() => handleFilterClick(f)}
                className={`relative z-10 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-text-muted hover:text-text-secondary'
                }`}
                style={
                  isActive
                    ? { background: 'var(--gradient-accent)' }
                    : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }
                }
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 && (
                  <span className="ml-1.5 opacity-80 font-semibold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      </motion.div>

        {/* ── Traveling highlight portal ──────────────────────────────── */}
      {travelStyle &&
        createPortal(
          <div
            key={travelKey}
            className="filter-highlight-travel"
            style={travelStyle}
            onAnimationEnd={() => setTravelStyle(null)}
          />,
          document.body
        )}

        {/* Notes Grid/List */}
        <motion.div variants={itemVariants}>
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
                className="flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md"
                style={{
                  background: isJournal
                    ? 'var(--journal-card-bg)'
                    : 'var(--color-surface-raised)',
                  borderColor: isJournal
                    ? 'var(--journal-card-border)'
                    : 'var(--color-border)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isJournal
                      ? 'var(--journal-icon-bg)'
                      : 'var(--icon-bg-accent)',
                    color: isJournal
                      ? 'var(--journal-gold)'
                      : 'var(--icon-text-accent)',
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
                  <CardMediaIcons note={note} />
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
                    className="absolute right-0 top-full mt-1 w-40 rounded-lg shadow-xl z-30 py-1"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) =>
            note.isJournal ? renderJournalCard(note) : renderStickyNote(note)
          )}
        </div>
          )}
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
