// frontend/src/components/notion/NotionSettingsPanel.tsx
// Notion integration panel for the Settings page.
// Supports both legacy Database API and new Data Source API.

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  FileText,
  ListChecks,
  Loader2,
  PlugZap,
  RefreshCw,
  Unplug,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  useNotionStatus,
  useNotionStartOAuth,
  useNotionDisconnect,
  useNotionDatabases,
  useNotionDatabaseProperties,
  useNotionImportTasks,
  useNotionImportNotes,
} from '../../features/notion/hooks/useNotion';
import type { NotionDatabaseProperty } from '../../types';

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-1 rounded-full"
      style={{
        background: active ? 'var(--icon-bg-success)' : 'var(--icon-bg-warning)',
        color: active ? 'var(--icon-text-success)' : 'var(--icon-text-warning)',
      }}
    >
      {label}
    </span>
  );
}

const SYSTEM_FIELDS_TASKS = [
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
];

const SYSTEM_FIELDS_NOTES = [
  { value: 'title', label: 'Title' },
  { value: 'content', label: 'Content' },
  { value: 'tags', label: 'Tags' },
];

export function NotionSettingsPanel() {
  const { data: notionStatus, isLoading: statusLoading } = useNotionStatus();
  const notionStart = useNotionStartOAuth();
  const notionDisconnect = useNotionDisconnect();
  const { data: databases, isLoading: dbsLoading } = useNotionDatabases();
  const importTasks = useNotionImportTasks();
  const importNotes = useNotionImportNotes();

  const [selectedDb, setSelectedDb] = useState<{ id: string; object: 'database' | 'data_source' } | null>(null);
  const [importMode, setImportMode] = useState<'tasks' | 'notes'>('tasks');
  const [propertyMapping, setPropertyMapping] = useState<Record<string, string>>({});

  const { data: dbProperties } = useNotionDatabaseProperties(
    selectedDb?.id ?? null,
    selectedDb?.object ?? null,
  );

  const handleConnect = async () => {
    try {
      const result = await notionStart.mutateAsync('/settings?tab=integrations');
      window.location.href = result.url;
    } catch (err) {
      toast.error('Could not start Notion connection.');
    }
  };

  const handleDisconnect = () => {
    notionDisconnect.mutate();
    setSelectedDb(null);
    setPropertyMapping({});
  };

  const handleDbSelect = (db: { id: string; object: 'database' | 'data_source'; title: string; icon: string | null }) => {
    setSelectedDb({ id: db.id, object: db.object });
    setPropertyMapping({});
  };

  const handleMappingChange = (notionProp: string, systemField: string) => {
    setPropertyMapping((prev) => {
      const next = { ...prev };
      // Remove any existing mapping for this system field
      for (const [key, val] of Object.entries(next)) {
        if (val === systemField) {
          delete next[key];
        }
      }
      if (systemField) {
        next[notionProp] = systemField;
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (!selectedDb) {
      toast.error('Please select a database first');
      return;
    }
    if (Object.keys(propertyMapping).length === 0) {
      toast.error('Please map at least one property');
      return;
    }

    if (importMode === 'tasks') {
      await importTasks.mutateAsync({ collectionId: selectedDb.id, object: selectedDb.object, propertyMapping });
    } else {
      await importNotes.mutateAsync({ collectionId: selectedDb.id, object: selectedDb.object, propertyMapping });
    }
  };

  const systemFields = importMode === 'tasks' ? SYSTEM_FIELDS_TASKS : SYSTEM_FIELDS_NOTES;

  return (
    <div className="rounded-xl sm:rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
      {/* Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            <p className="text-sm font-bold text-text-primary">Notion</p>
          </div>
          <p className="text-xs text-text-muted mt-1 leading-snug break-words">
            {notionStatus?.connected
              ? `Connected to ${notionStatus.workspaceName ?? 'Notion'}`
              : 'Connect your Notion workspace to import tasks and notes.'}
          </p>
          {notionStatus?.workspaceName && (
            <p className="text-[11px] text-text-muted mt-1">
              Workspace: {notionStatus.workspaceName}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <StatusPill
            label={notionStatus?.connected ? 'Connected' : 'Not connected'}
            active={Boolean(notionStatus?.connected)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
        <Button
          size="sm"
          leftIcon={<PlugZap size={14} />}
          loading={notionStart.isPending}
          onClick={handleConnect}
        >
          {notionStatus?.connected ? 'Reconnect' : 'Connect Notion'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Unplug size={14} />}
          loading={notionDisconnect.isPending}
          onClick={handleDisconnect}
          disabled={!notionStatus?.connected}
        >
          Disconnect
        </Button>
      </div>

      {notionStatus?.lastSyncedAt && (
        <p className="mt-3 text-[11px] text-text-muted flex items-center gap-1.5">
          <RefreshCw size={12} />
          Last import {new Date(notionStatus.lastSyncedAt).toLocaleString()}
        </p>
      )}

      {/* Import Section (only when connected) */}
      {notionStatus?.connected && (
        <div className="mt-5 space-y-4">
          <hr style={{ borderColor: 'var(--color-border)' }} />

          {/* Database Selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-accent" />
              <p className="text-xs font-bold text-text-primary">Select a database</p>
            </div>
            {dbsLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Loader2 size={12} className="animate-spin" />
                Loading databases...
              </div>
            ) : databases && databases.length > 0 ? (
              <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                {databases.map((db) => (
                  <button
                    key={db.id}
                    onClick={() => handleDbSelect(db)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: selectedDb?.id === db.id ? 'var(--icon-bg-accent)' : 'var(--color-surface)',
                      color: selectedDb?.id === db.id ? 'var(--icon-text-accent)' : 'var(--color-text-primary)',
                      border: `1px solid ${selectedDb?.id === db.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >
                    <span>{db.icon ?? '📄'}</span>
                    <span className="truncate">{db.title}</span>
                    <span className="text-[9px] text-text-muted ml-1 uppercase">
                      {db.object === 'data_source' ? 'DS' : 'DB'}
                    </span>
                    {selectedDb?.id === db.id && <CheckCircle2 size={12} className="shrink-0 ml-auto" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                No databases found. Make sure your integration has access to at least one database in Notion.
              </p>
            )}
          </div>

          {/* Import Mode Toggle */}
          {selectedDb && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-accent" />
                <p className="text-xs font-bold text-text-primary">Import as</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setImportMode('tasks'); setPropertyMapping({}); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    background: importMode === 'tasks' ? 'var(--icon-bg-accent)' : 'var(--color-surface)',
                    color: importMode === 'tasks' ? 'var(--icon-text-accent)' : 'var(--color-text-secondary)',
                    border: `1px solid ${importMode === 'tasks' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <ListChecks size={12} />
                  Tasks
                </button>
                <button
                  onClick={() => { setImportMode('notes'); setPropertyMapping({}); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    background: importMode === 'notes' ? 'var(--icon-bg-accent)' : 'var(--color-surface)',
                    color: importMode === 'notes' ? 'var(--icon-text-accent)' : 'var(--color-text-secondary)',
                    border: `1px solid ${importMode === 'notes' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <FileText size={12} />
                  Notes
                </button>
              </div>
            </div>
          )}

          {/* Property Mapping */}
          {selectedDb && dbProperties && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks size={14} className="text-accent" />
                <p className="text-xs font-bold text-text-primary">Map properties</p>
              </div>
              <p className="text-[10px] text-text-muted mb-2">
                Map Notion database properties to system fields. Each system field can only be mapped once.
              </p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {Object.entries(dbProperties).map(([propName, prop]) => (
                  <div
                    key={propName}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <span className="text-[10px] font-mono uppercase text-text-muted min-w-[60px]">
                      {prop.type}
                    </span>
                    <span className="font-medium text-text-primary min-w-0 flex-1 truncate">
                      {propName}
                    </span>
                    <select
                      value={propertyMapping[propName] ?? ''}
                      onChange={(e) => handleMappingChange(propName, e.target.value)}
                      className="text-[10px] px-1.5 py-1 rounded border bg-transparent text-text-primary"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <option value="">— Skip —</option>
                      {systemFields.map((sf) => (
                        <option
                          key={sf.value}
                          value={sf.value}
                          disabled={Object.values(propertyMapping).includes(sf.value) && propertyMapping[propName] !== sf.value}
                        >
                          {sf.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Button */}
          {selectedDb && (
            <Button
              size="sm"
              leftIcon={<Cloud size={14} />}
              loading={importTasks.isPending || importNotes.isPending}
              onClick={handleImport}
              disabled={Object.keys(propertyMapping).length === 0}
              fullWidth
            >
              Import {importMode === 'tasks' ? 'Tasks' : 'Notes'} from Notion
            </Button>
          )}
        </div>
      )}
    </div>
  );
}