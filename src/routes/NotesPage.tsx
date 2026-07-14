import React, { useState, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useNotes, useDeleteNote } from '../features/notes/hooks/useNotes';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EntryFormModal } from '../components/notes/EnteryFormModal';
import { NoteViewModal } from '../components/notes/NoteViewModal';
import type { NoteDTO } from '../types';
import '../styles/theme-journal-notes.css';

type ViewMode = 'grid' | 'list';
type NoteFilter = 'all' | 'notes' | 'journal';

interface PillRect {
  left: number;
  top: number;
  width: number;
  height: number;
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

  // Sliding pill background for filter tabs
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Record<NoteFilter, HTMLButtonElement | null>>({
    all: null,
    notes: null,
    journal: null,
  });
  const [pillRect, setPillRect] = useState<PillRect | null>(null);
  const [pillReady, setPillReady] = useState(false);

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

  // Measure the active filter button and position the pill on top of it.
  // Uses offsetLeft/offsetTop (relative to the positioned container) so it
  // works regardless of horizontal scroll position.
  const measurePill = useCallback((f: NoteFilter) => {
    const btn = filterRefs.current[f];
    if (!btn) return;
    setPillRect({
      left: btn.offsetLeft,
      top: btn.offsetTop,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
    });
    setPillReady(true);
  }, []);

  // Reposition the pill whenever the active filter changes. useLayoutEffect
  // avoids a visible flash before the first paint.
  useLayoutEffect(() => {
    measurePill(filter);
  }, [filter, measurePill]);

  // Keep the pill aligned on window resize (button widths can change,
  // e.g. text reflow at different breakpoints).
  useLayoutEffect(() => {
    const handleResize = () => measurePill(filter);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [filter, measurePill]);

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
      className="journal-card group cursor-pointer journal-book-3d"
      style={{ perspective: '1000px' }}
    >
      <div className="journal-book-spine" />
      <div className="journal-book-pages" />
      <div className="journal-book-cover-face">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
          <BookOpen size={22} style={{ color: 'var(--journal-gold)', marginBottom: '6px' }} />
          <h3
            className="text-center font-bold leading-tight"
            style={{
              fontSize: 'clamp(11px, 1.6vw, 13px)',
              color: 'var(--journal-gold)',
              fontFamily: 'Georgia, Garamond, serif',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {note.title || 'Journal Entry'}
          </h3>
          <p
            className="text-center mt-1.5 uppercase tracking-wider"
            style={{
              fontSize: '8px',
              color: 'var(--journal-light)',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {formatJournalDate(note.updatedAt)}
          </p>
        </div>

        <div className="journal-book-footer">
          <span className="journal-book-badge">Journal</span>
          <span className="journal-book-timeago">
            <Calendar size={9} />
            {formatDate(note.updatedAt)}
          </span>
        </div>

        {/* Menu Button */}
        <div className="absolute top-2 right-2 z-20">
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

      <div className="sticky-note-body">
        <h3 className="sticky-note-title">{note.title || 'Untitled'}</h3>
        <p className="sticky-note-text">{note.content}</p>
      </div>

      <div className="sticky-note-footer">
        <Calendar size={9} />
        {formatDate(note.updatedAt)}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          icon={<FileText size={24} />}
          title="Notes & Journal"
          subtitle={`${filteredNotes.length} ${filter === 'all' ? 'total' : filter} entries`}
        />

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg border"
            style={{
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid' ? 'text-white' : 'text-text-muted hover:text-text-primary'
              }`}
              style={
                viewMode === 'grid'
                  ? { background: 'var(--gradient-accent)' }
                  : {}
              }
              aria-label="Grid view"
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list' ? 'text-white' : 'text-text-muted hover:text-text-primary'
              }`}
              style={
                viewMode === 'list'
                  ? { background: 'var(--gradient-accent)' }
                  : {}
              }
              aria-label="List view"
            >
              <List size={16} />
            </button>
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

      {/* Search & Filter Bar */}
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

        {/* Filter Tabs — sliding pill background */}
        <div
          ref={filterContainerRef}
          className="relative flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {pillRect && (
            <div
              className="absolute rounded-xl shadow-md pointer-events-none"
              style={{
                left: pillRect.left,
                top: pillRect.top,
                width: pillRect.width,
                height: pillRect.height,
                background: 'var(--gradient-accent)',
                opacity: pillReady ? 1 : 0,
                transition:
                  'left 300ms cubic-bezier(0.16, 1, 0.3, 1), top 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1), height 300ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease, opacity 150ms ease',
                zIndex: 0,
              }}
            />
          )}

          {(['all', 'notes', 'journal'] as NoteFilter[]).map((f) => {
            const count = counts[f];
            const isActive = filter === f;

            return (
              <button
                key={f}
                ref={(el) => { filterRefs.current[f] = el; }}
                onClick={() => setFilter(f)}
                className={`relative z-10 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-text-muted hover:text-text-secondary'
                }`}
                style={
                  isActive
                    ? undefined
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

      {/* Notes Grid/List */}
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
              ? 'No notes match your search'
              : `No ${filter} entries yet`}
          </p>
          {filter === 'all' && !searchQuery && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 rounded-lg text-sm font-bold text-white transition-all hover:shadow-md"
              style={{
                background: 'var(--gradient-accent)',
              }}
            >
              <Plus size={18} className="inline mr-2" />
              Create Note
            </button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredNotes.map((note) =>
            note.isJournal ? renderJournalCard(note) : renderStickyNote(note)
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div key={note.id}>
              {note.isJournal ? renderJournalCard(note) : renderStickyNote(note)}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {/* Modals */}
<EntryFormModal isOpen={createModalOpen} mode="create" onClose={() => setCreateModalOpen(false)} />

{viewingNote && (
  <NoteViewModal
    isOpen={!!viewingNote}
    note={viewingNote}
    originRect={originRect}
    onClose={() => { setViewingNote(null); setOriginRect(null); }}
    onEdit={() => { setEditingNote(viewingNote); setViewingNote(null); }}
    onDelete={() => handleDeleteNote(viewingNote.id)}
  />
)}

{editingNote && (
  <EntryFormModal isOpen={!!editingNote} mode="edit" note={editingNote} onClose={() => setEditingNote(null)} />
)}
    </div>
  );
}

export default NotesPage;