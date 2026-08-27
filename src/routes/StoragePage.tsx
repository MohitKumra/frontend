import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  HardDrive,
  Image as ImageIcon,
  Video as VideoIcon,
  Music2,
  FileText,
  FileQuestion,
  Search,
  Filter,
  Download,
  ExternalLink,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  Grid,
  List,
  X,
  Folder,
} from 'lucide-react';
import { storageApi } from '../features/storage/api';
import type { StorageFileDTO, StorageFileType } from '../features/storage/api';
import { useUserPlan, BILLING_QUERY_KEY } from '../features/billing/useUserPlan';
import { useUpgradeModalStore } from '../store/upgradeModalStore';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const TYPE_CONFIG: Record<
  StorageFileType,
  { label: string; icon: typeof ImageIcon; color: string; bg: string; badgeClass: string }
> = {
  image: {
    label: 'Images',
    icon: ImageIcon,
    color: '#3B82F6',
    bg: 'bg-blue-500/10 text-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/50',
  },
  video: {
    label: 'Videos',
    icon: VideoIcon,
    color: '#8B5CF6',
    bg: 'bg-purple-500/10 text-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/50',
  },
  audio: {
    label: 'Audio & Voice',
    icon: Music2,
    color: '#10B981',
    bg: 'bg-emerald-500/10 text-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50',
  },
  document: {
    label: 'Documents',
    icon: FileText,
    color: '#F59E0B',
    bg: 'bg-amber-500/10 text-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/50',
  },
  other: {
    label: 'Other',
    icon: FileQuestion,
    color: '#6B7280',
    bg: 'bg-slate-500/10 text-slate-500',
    badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200/50',
  },
};

const FOLDER_LABELS: Record<string, string> = {
  attachment: 'Attachments',
  attachments: 'Attachments',
  'task-attachment': 'Tasks',
  'project-attachment': 'Projects',
  'note-attachment': 'Notes',
  'goal-attachment': 'Goals',
  'ai-attachment': 'AI & Chat',
  avatar: 'Avatar',
  avatars: 'Avatar',
  'voice-note': 'Voice Notes',
  'voice-notes': 'Voice Notes',
  'note-covers': 'Note Covers',
};

export function StoragePage() {
  const queryClient = useQueryClient();
  const { usage, effectivePlan } = useUserPlan();
  const openUpgrade = useUpgradeModalStore((s) => s.openUpgrade);

  const [selectedType, setSelectedType] = useState<StorageFileType | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size-desc' | 'size-asc' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<StorageFileDTO | null>(null);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['storage', 'files'],
    queryFn: storageApi.list,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Instantly sync latest plan storage usage with backend when opening the storage page
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
  }, [queryClient]);

  const files = data?.files ?? [];
  const summary = data?.summary;

  const totalUsedBytes = summary?.totalBytes ?? usage.storageUsedBytes ?? 0;
  const storageLimitBytes = summary?.storageLimitBytes ?? usage.storageLimitBytes ?? null;
  const isUnlimited = storageLimitBytes === null || storageLimitBytes <= 0 || storageLimitBytes === Infinity;

  const storagePct = isUnlimited || !storageLimitBytes
    ? 0
    : Math.min(100, Math.round((totalUsedBytes / storageLimitBytes) * 100));

  // Extract distinct folders for filter dropdown
  const distinctFolders = useMemo(() => {
    const folders = new Set<string>();
    files.forEach((f) => {
      if (f.folder) folders.add(f.folder);
    });
    return Array.from(folders);
  }, [files]);

  // Filtered & Sorted files
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        if (selectedType !== 'all' && file.fileType !== selectedType) return false;
        if (selectedFolder !== 'all' && file.folder !== selectedFolder) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = file.name.toLowerCase().includes(q);
          const matchFolder = (FOLDER_LABELS[file.folder] ?? file.folder).toLowerCase().includes(q);
          if (!matchName && !matchFolder) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'size-desc') return b.sizeBytes - a.sizeBytes;
        if (sortBy === 'size-asc') return a.sizeBytes - b.sizeBytes;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [files, selectedType, selectedFolder, searchQuery, sortBy]);

  return (
    <div className="min-h-screen w-full p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ background: 'var(--sidebar-active-bg, rgba(109,94,245,0.12))' }}
            >
              <Database size={22} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
                Storage & Attachments
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Overview of all uploaded files, media attachments, and storage quota usage.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary shadow-sm transition-colors"
          >
            <RefreshCw size={14} className={isLoading || isRefetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          {!isUnlimited && (
            <button
              onClick={() => openUpgrade('storage', 'Upgrade your plan to unlock more storage space.')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Sparkles size={14} />
              Upgrade Storage
            </button>
          )}
        </div>
      </div>

      {/* Storage Capacity Bar Card */}
      <div
        className="rounded-3xl border border-border/80 p-6 sm:p-7 shadow-sm transition-all relative overflow-hidden"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Storage Quota ({effectivePlan.planName} Plan)
              </span>
              <span className="text-xs font-bold text-text-secondary">
                {isUnlimited ? 'Unlimited' : `${storagePct}% used`}
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-surface border border-border/60 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: isUnlimited ? '15%' : `${Math.max(2, storagePct)}%`,
                  background: isUnlimited
                    ? 'var(--color-accent)'
                    : storagePct >= 90
                      ? 'var(--color-danger)'
                      : storagePct >= 75
                        ? 'var(--color-warning)'
                        : 'var(--color-accent)',
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-text-muted pt-1">
              <span>
                <strong className="text-text-primary font-semibold">{formatBytes(totalUsedBytes)}</strong> used
              </span>
              <span>
                {isUnlimited ? (
                  <span className="text-accent font-semibold">∞ Unlimited capacity</span>
                ) : (
                  <span>
                    Limit: <strong className="text-text-primary font-semibold">{formatBytes(storageLimitBytes || 0)}</strong>
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6">
            <div className="text-left md:text-right">
              <p className="text-xs text-text-muted font-medium">Total Uploaded Files</p>
              <p className="text-2xl font-extrabold text-text-primary mt-0.5">{files.length}</p>
            </div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--sidebar-active-bg, rgba(109,94,245,0.12))' }}
            >
              <HardDrive size={22} style={{ color: 'var(--color-accent)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {(Object.keys(TYPE_CONFIG) as StorageFileType[]).map((typeKey) => {
          const config = TYPE_CONFIG[typeKey];
          const Icon = config.icon;
          const typeSummary = summary?.byType[typeKey] ?? { count: 0, bytes: 0 };
          const isSelected = selectedType === typeKey;

          return (
            <button
              key={typeKey}
              onClick={() => setSelectedType(isSelected ? 'all' : typeKey)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-accent shadow-sm ring-2 ring-accent/20'
                  : 'border-border/80 hover:border-border hover:bg-surface-raised/50'
              }`}
              style={{ background: isSelected ? 'var(--color-surface-raised)' : 'var(--color-surface)' }}
            >
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${config.bg}`}>
                  <Icon size={16} />
                </span>
                <span className="text-[11px] font-bold text-text-muted">
                  {typeSummary.count} {typeSummary.count === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">{config.label}</p>
                <p className="text-xs text-text-muted font-medium mt-0.5">
                  {formatBytes(typeSummary.bytes)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls Bar (Search, Filters, View toggle) */}
      <div
        className="rounded-2xl border border-border/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files or folders..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Folder filter */}
          {distinctFolders.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Folder size={14} className="text-text-muted shrink-0" />
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-border bg-surface text-xs font-medium text-text-secondary focus:outline-none focus:border-accent"
              >
                <option value="all">All Folders</option>
                {distinctFolders.map((f) => (
                  <option key={f} value={f}>
                    {FOLDER_LABELS[f] ?? f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort selection */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-text-muted shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1.5 px-2.5 rounded-xl border border-border bg-surface text-xs font-medium text-text-secondary focus:outline-none focus:border-accent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* View Mode & Type reset */}
        <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
          {selectedType !== 'all' && (
            <button
              onClick={() => setSelectedType('all')}
              className="text-xs font-semibold text-accent hover:underline px-2 py-1"
            >
              Clear type filter ({TYPE_CONFIG[selectedType].label})
            </button>
          )}

          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-surface-raised text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
              aria-label="Grid view"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-surface-raised text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Files List / Grid / Empty State */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-text-muted">
          <RefreshCw size={24} className="animate-spin text-accent" />
          <p className="text-xs font-medium">Loading stored files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div
          className="rounded-3xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-3"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--sidebar-active-bg, rgba(109,94,245,0.12))' }}
          >
            <HardDrive size={22} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="max-w-xs">
            <p className="text-sm font-bold text-text-primary">No files found</p>
            <p className="text-xs text-text-muted mt-1">
              {searchQuery || selectedType !== 'all' || selectedFolder !== 'all'
                ? 'Try adjusting your filters or search keywords.'
                : 'Upload files, voice notes, or attachments in Tasks, Projects, and Notes to see them here.'}
            </p>
          </div>
          {(searchQuery || selectedType !== 'all' || selectedFolder !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedFolder('all');
              }}
              className="mt-2 text-xs font-bold text-accent hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const config = TYPE_CONFIG[file.fileType];
            const Icon = config.icon;
            const folderName = FOLDER_LABELS[file.folder] ?? file.folder;

            return (
              <div
                key={file.id}
                className="group rounded-2xl border border-border/80 hover:border-border hover:shadow-md transition-all flex flex-col overflow-hidden"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                {/* Thumbnail / Header Preview */}
                <div className="h-36 w-full bg-surface border-b border-border/50 relative overflow-hidden flex items-center justify-center">
                  {file.fileType === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : file.fileType === 'video' ? (
                    <div className="flex flex-col items-center gap-2 text-purple-500">
                      <VideoIcon size={32} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Video</span>
                    </div>
                  ) : file.fileType === 'audio' ? (
                    <div className="flex flex-col items-center gap-2 text-emerald-500">
                      <Music2 size={32} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Audio</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <Icon size={32} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{file.fileType}</span>
                    </div>
                  )}

                  {/* Overlay Quick Actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-2 rounded-xl bg-white/90 text-slate-800 hover:bg-white transition-transform hover:scale-110 shadow"
                      title="Preview file"
                    >
                      <Eye size={15} />
                    </button>
                    <a
                      href={file.url}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/90 text-slate-800 hover:bg-white transition-transform hover:scale-110 shadow"
                      title="Download file"
                    >
                      <Download size={15} />
                    </a>
                  </div>

                  {/* Folder Tag */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface/90 backdrop-blur text-text-secondary border border-border/40 shadow-sm">
                    {folderName}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3
                      className="text-xs font-bold text-text-primary truncate"
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-text-muted mt-1">
                      <span>{formatBytes(file.sizeBytes)}</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                      {config.label}
                    </span>
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Layout */
        <div
          className="rounded-2xl border border-border/80 overflow-hidden shadow-sm divide-y divide-border/60"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          <div className="px-5 py-3 bg-surface/50 grid grid-cols-12 text-[11px] font-bold text-text-muted uppercase tracking-wider">
            <span className="col-span-5 sm:col-span-4">File Name</span>
            <span className="col-span-3 sm:col-span-2">Folder</span>
            <span className="hidden sm:block sm:col-span-2">Type</span>
            <span className="col-span-2 sm:col-span-2">Size</span>
            <span className="hidden md:block md:col-span-1">Date</span>
            <span className="col-span-2 sm:col-span-1 text-right">Actions</span>
          </div>

          {filteredFiles.map((file) => {
            const config = TYPE_CONFIG[file.fileType];
            const Icon = config.icon;
            const folderName = FOLDER_LABELS[file.folder] ?? file.folder;

            return (
              <div
                key={file.id}
                className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-surface-raised/60 transition-colors text-xs"
              >
                <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0 pr-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                    <Icon size={14} />
                  </span>
                  <span
                    className="font-semibold text-text-primary truncate cursor-pointer hover:text-accent transition-colors"
                    onClick={() => setPreviewFile(file)}
                    title={file.name}
                  >
                    {file.name}
                  </span>
                </div>

                <div className="col-span-3 sm:col-span-2 truncate">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-border/50">
                    <Layers size={11} className="text-text-muted shrink-0" />
                    {folderName}
                  </span>
                </div>

                <div className="hidden sm:block sm:col-span-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                    {config.label}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-2 font-medium text-text-muted">
                  {formatBytes(file.sizeBytes)}
                </div>

                <div className="hidden md:block md:col-span-1 text-[11px] text-text-muted truncate">
                  {new Date(file.createdAt).toLocaleDateString()}
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface transition-colors"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface transition-colors"
                    title="Download"
                  >
                    <Download size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal / Lightbox */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-3xl rounded-3xl border border-border bg-surface-raised shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: 'var(--color-surface-raised)' }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-4">
                <h3 className="text-sm font-bold text-text-primary truncate" title={previewFile.name}>
                  {previewFile.name}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatBytes(previewFile.sizeBytes)} • {FOLDER_LABELS[previewFile.folder] ?? previewFile.folder} •{' '}
                  {new Date(previewFile.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary transition-colors"
                >
                  <Download size={13} />
                  Download
                </a>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary transition-colors"
                >
                  <ExternalLink size={13} />
                  Open in New Tab
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-black/5 dark:bg-black/20 min-h-[300px]">
              {previewFile.fileType === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow"
                />
              ) : previewFile.fileType === 'video' ? (
                <video
                  src={previewFile.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] max-w-full rounded-xl shadow"
                />
              ) : previewFile.fileType === 'audio' ? (
                <div className="w-full max-w-md p-6 bg-surface rounded-2xl border border-border text-center space-y-4 shadow">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <Music2 size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary truncate">{previewFile.name}</p>
                    <p className="text-xs text-text-muted mt-1">{formatBytes(previewFile.sizeBytes)}</p>
                  </div>
                  <audio src={previewFile.url} controls className="w-full" autoPlay />
                </div>
              ) : (
                <div className="text-center p-8 space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <FileText size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{previewFile.name}</p>
                    <p className="text-xs text-text-muted mt-1">
                      Direct preview is not available for this document type.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <a
                      href={previewFile.url}
                      download={previewFile.name}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow"
                      style={{ background: 'var(--gradient-accent)' }}
                    >
                      Download File
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default StoragePage;
