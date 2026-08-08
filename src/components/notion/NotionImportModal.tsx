// frontend/src/components/notion/NotionImportModal.tsx
// Modal for importing from Notion on Tasks and Notes pages.
// Supports both legacy Database API and new Data Source API.
// Simplified 2-step flow: Select DB → Preview & select pages (auto-mapped).

import { useState, useCallback } from 'react';
import { BookOpen, CheckCircle2, CheckSquare, Cloud, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import {
  useNotionDatabases,
  useNotionImportTasks,
  useNotionAutoPreview,
  useNotionImportNotes,
  useNotionAutoPreviewNotes,
} from '../../features/notion/hooks/useNotion';

interface NotionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'tasks' | 'notes';
}

const TASKS_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  dueDate: 'Due Date',
};

const NOTES_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  content: 'Content',
  tags: 'Tags',
};

export function NotionImportModal({ isOpen, onClose, mode = 'tasks' }: NotionImportModalProps) {
  const { data: databases, isLoading: dbsLoading } = useNotionDatabases();
  const importTasks = useNotionImportTasks();
  const autoPreview = useNotionAutoPreview();
  const importNotes = useNotionImportNotes();
  const autoPreviewNotes = useNotionAutoPreviewNotes();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDb, setSelectedDb] = useState<{
    id: string;
    object: 'database' | 'data_source';
    title: string;
  } | null>(null);
  const [propertyMapping, setPropertyMapping] = useState<Record<string, string>>({});
  const [pages, setPages] = useState<Array<{ id: string; title: string; alreadyImported: boolean }>>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [pagesLoading, setPagesLoading] = useState(false);
  const [isJournal, setIsJournal] = useState(false);

  const isTasksMode = mode === 'tasks';
  const fieldLabels = isTasksMode ? TASKS_FIELD_LABELS : NOTES_FIELD_LABELS;
  const autoPreviewMutation = isTasksMode ? autoPreview : autoPreviewNotes;
  const importMutation = isTasksMode ? importTasks : importNotes;

  const reset = useCallback(() => {
    setStep(1);
    setSelectedDb(null);
    setPropertyMapping({});
    setPages([]);
    setSelectedPageIds(new Set());
    setIsJournal(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDbSelect = async (db: { id: string; object: 'database' | 'data_source'; title: string }) => {
    setSelectedDb(db);
    setPagesLoading(true);

    try {
      const result = await autoPreviewMutation.mutateAsync({
        collectionId: db.id,
        object: db.object,
      });

      setPropertyMapping(result.propertyMapping);
      const pagesWithStatus = result.pages.map((p) => ({
        ...p,
        alreadyImported: p.alreadyImported,
      }));
      setPages(pagesWithStatus);

      const autoSelect = new Set<string>();
      for (const p of pagesWithStatus) {
        if (!p.alreadyImported) {
          autoSelect.add(p.id);
        }
      }
      setSelectedPageIds(autoSelect);
      setStep(2);
    } catch {
      toast.error('Failed to preview pages');
    } finally {
      setPagesLoading(false);
    }
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (!selectedDb) return;
    if (selectedPageIds.size === 0) {
      toast.error('Please select at least one page to import');
      return;
    }

    try {
      await importMutation.mutateAsync({
        collectionId: selectedDb.id,
        object: selectedDb.object,
        propertyMapping,
        pageIds: Array.from(selectedPageIds),
        ...(isTasksMode ? {} : { isJournal }),
      });
      handleClose();
    } catch {
      // Error handled by hook
    }
  };

  const newCount = pages.filter((p) => !p.alreadyImported).length;
  const alreadyImportedCount = pages.filter((p) => p.alreadyImported).length;

  const mappingSummary = Object.entries(propertyMapping)
    .map(([notionProp, systemField]) => `${notionProp} → ${fieldLabels[systemField] ?? systemField}`)
    .join(', ');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Import from Notion{isTasksMode ? '' : isJournal ? ' (Journal)' : ' (Notes)'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator + Notes journal toggle */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            {([1, 2] as const).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: step >= s ? 'var(--gradient-accent)' : 'var(--color-surface)',
                    color: step >= s ? 'white' : 'var(--color-text-muted)',
                    border: step < s ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  {step > s ? <CheckCircle2 size={12} /> : s}
                </div>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: step >= s ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                >
                  {s === 1 ? 'Database' : 'Preview'}
                </span>
                {s < 2 && <div className="w-6 h-px" style={{ background: 'var(--color-border)' }} />}
              </div>
            ))}
          </div>

          {!isTasksMode && step === 2 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsJournal(false)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                style={{
                  background: !isJournal ? 'var(--icon-bg-accent)' : 'var(--color-surface)',
                  color: !isJournal ? 'var(--icon-text-accent)' : 'var(--color-text-secondary)',
                  border: `1px solid ${!isJournal ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                Note
              </button>
              <button
                onClick={() => setIsJournal(true)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                style={{
                  background: isJournal ? 'var(--icon-bg-accent)' : 'var(--color-surface)',
                  color: isJournal ? 'var(--icon-text-accent)' : 'var(--color-text-secondary)',
                  border: `1px solid ${isJournal ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                Journal
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Select a Notion database to import from
              </p>
              {dbsLoading ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader2 size={12} className="animate-spin" />
                  Loading databases...
                </div>
              ) : databases && databases.length > 0 ? (
                <div className="grid gap-1.5 max-h-64 overflow-y-auto">
                  {databases.map((db) => (
                    <button
                      key={db.id}
                      onClick={() => handleDbSelect(db)}
                      disabled={autoPreviewMutation.isPending}
                      className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: selectedDb?.id === db.id ? 'var(--icon-bg-accent)' : 'var(--color-surface)',
                        color: selectedDb?.id === db.id ? 'var(--icon-text-accent)' : 'var(--color-text-primary)',
                        border: `1px solid ${selectedDb?.id === db.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      }}
                    >
                      <span>{db.icon ?? '📄'}</span>
                      <span className="truncate flex-1">{db.title}</span>
                      <span className="text-[9px] uppercase opacity-50">
                        {db.object === 'data_source' ? 'DS' : 'DB'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No databases found.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              {mappingSummary && (
                <div
                  className="text-[10px] px-3 py-2 rounded-lg mb-3"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Auto-detected: {mappingSummary}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Pages from <span className="text-accent">{selectedDb?.title}</span>
                </p>
                <div className="flex items-center gap-2 text-[10px]">
                  <span style={{ color: 'var(--color-success)' }}>{newCount} new</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{alreadyImportedCount} imported</span>
                </div>
              </div>

              {pagesLoading || autoPreviewMutation.isPending ? (
                <div
                  className="flex items-center gap-2 text-xs py-8 justify-center"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Loading pages...
                </div>
              ) : pages.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {pages.map((page) => {
                    const isSelected = selectedPageIds.has(page.id);
                    const isImported = page.alreadyImported;
                    return (
                      <button
                        key={page.id}
                        onClick={() => !isImported && togglePageSelection(page.id)}
                        disabled={isImported}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: isSelected ? 'var(--icon-bg-accent)' : 'var(--color-surface)',
                          color: isImported ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                          border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          opacity: isImported ? 0.6 : 1,
                          cursor: isImported ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded flex items-center justify-center border"
                          style={
                            isSelected
                              ? { background: 'var(--gradient-accent)', borderColor: 'transparent' }
                              : { borderColor: 'var(--color-border)' }
                          }
                        >
                          {isSelected && <CheckSquare size={10} className="text-white" />}
                        </span>
                        <span className="truncate flex-1">{page.title}</span>
                        {isImported && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                              color: 'var(--color-success)',
                            }}
                          >
                            Imported
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  No pages found.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {step > 1 ? (
            <button
              onClick={() => {
                setStep(1);
                setSelectedDb(null);
                setPages([]);
              }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Fields are auto-mapped
            </p>
          )}

          {step === 2 && (
            <Button
              size="sm"
              leftIcon={<Cloud size={14} />}
              onClick={handleImport}
              loading={importMutation.isPending}
              disabled={selectedPageIds.size === 0}
            >
              Import {selectedPageIds.size} {isTasksMode ? 'task' : isJournal ? 'journal' : 'note'}
              {selectedPageIds.size !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
