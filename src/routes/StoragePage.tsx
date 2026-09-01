import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HardDrive,
  Search,
  Download,
  Grid,
  List,
  LayoutGrid,
  X,
  Folder,
  FolderOpen,
  Home,
  ChevronRight,
  UploadCloud,
  Trash2,
  CheckSquare,
  Square,
  Copy,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { storageApi } from '../features/storage/api';
import type {
  StorageFileDTO,
  StorageFileType,
  StorageQuickTab,
  StorageSortField,
  StorageViewMode,
} from '../features/storage/api';
import { useUserPlan, BILLING_QUERY_KEY } from '../features/billing/useUserPlan';
import { useUpgradeModalStore } from '../store/upgradeModalStore';
import { usePageVariants } from '../lib/motionVariants';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { StorageHero } from '../features/storage/components/StorageHero';
import { StorageSidebar } from '../features/storage/components/StorageSidebar';
import { StorageFileGridItem } from '../features/storage/components/StorageFileGridItem';
import { StorageFileListRow } from '../features/storage/components/StorageFileListRow';
import { StoragePreviewModal } from '../features/storage/components/StoragePreviewModal';
import { StorageUploadModal } from '../features/storage/components/StorageUploadModal';
import { TYPE_CONFIG, FOLDER_LABELS, formatBytes } from '../features/storage/storageUtils';

export function StoragePage() {
  const { containerVariants, itemVariants } = usePageVariants();
  const queryClient = useQueryClient();
  const { usage, effectivePlan } = useUserPlan();
  const openUpgrade = useUpgradeModalStore((s) => s.openUpgrade);

  // Filter & Navigation states
  const [quickTab, setQuickTab] = useState<StorageQuickTab>('all');
  const [selectedType, setSelectedType] = useState<StorageFileType | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<StorageSortField>('newest');
  const [viewMode, setViewMode] = useState<StorageViewMode>('grid');

  // UI modal states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<StorageFileDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageFileDTO | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Favorites in localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('finamite_storage_starred');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast('Removed from Starred', { icon: '⭐️' });
      } else {
        next.add(id);
        toast.success('Added to Starred');
      }
      try {
        localStorage.setItem('finamite_storage_starred', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Fetch storage files
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['storage', 'files'],
    queryFn: storageApi.list,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
  }, [queryClient]);

  const files = data?.files ?? [];
  const summary = data?.summary;

  const totalUsedBytes = summary?.totalBytes ?? usage.storageUsedBytes ?? 0;
  const storageLimitBytes = summary?.storageLimitBytes ?? usage.storageLimitBytes ?? null;
  const isUnlimited = storageLimitBytes === null || storageLimitBytes <= 0 || storageLimitBytes === Infinity;

  // Extract distinct folders
  const distinctFolders = useMemo(() => {
    const folders = new Set<string>();
    files.forEach((f) => {
      if (f.folder) folders.add(f.folder);
    });
    return Array.from(folders);
  }, [files]);

  // Handle Quick tab changes
  const handleQuickTabChange = (tab: StorageQuickTab) => {
    setQuickTab(tab);
    if (tab === 'all') {
      setSelectedType('all');
      setSelectedFolder('all');
    } else if (tab === 'images') {
      setSelectedType('image');
      setSelectedFolder('all');
    } else if (tab === 'documents') {
      setSelectedType('document');
      setSelectedFolder('all');
    } else if (tab === 'media') {
      setSelectedType('all');
      setSelectedFolder('all');
    } else if (tab === 'audio') {
      setSelectedType('audio');
      setSelectedFolder('all');
    } else if (tab === 'starred' || tab === 'large') {
      setSelectedType('all');
      setSelectedFolder('all');
    }
  };

  // Filtered & Sorted files
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        // Quick tab filter
        if (quickTab === 'starred' && !favorites.has(file.id)) return false;
        if (quickTab === 'large' && file.sizeBytes < 1024 * 1024) return false;
        if (quickTab === 'media' && file.fileType !== 'image' && file.fileType !== 'video') return false;

        // Type filter
        if (selectedType !== 'all' && file.fileType !== selectedType) return false;

        // Folder filter
        if (selectedFolder !== 'all' && file.folder !== selectedFolder) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = file.name.toLowerCase().includes(q);
          const matchFolder = (FOLDER_LABELS[file.folder] ?? file.folder).toLowerCase().includes(q);
          const matchType = file.fileType.toLowerCase().includes(q);
          if (!matchName && !matchFolder && !matchType) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'size-desc') return b.sizeBytes - a.sizeBytes;
        if (sortBy === 'size-asc') return a.sizeBytes - b.sizeBytes;
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'type') return a.fileType.localeCompare(b.fileType);
        return 0;
      });
  }, [files, quickTab, selectedType, selectedFolder, searchQuery, sortBy, favorites]);

  // Selection handlers
  const handleSelectToggle = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Copy link
  const copyLink = (file: StorageFileDTO, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(file.url);
    setCopiedFileId(file.id);
    toast.success('Direct URL copied to clipboard');
    setTimeout(() => setCopiedFileId((cur) => (cur === file.id ? null : cur)), 2000);
  };

  // Batch download
  const handleBatchDownload = () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id));
    if (selectedFiles.length === 0) return;
    toast.success(`Downloading ${selectedFiles.length} files...`);
    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 200);
    });
  };

  // Batch copy links
  const handleBatchCopyLinks = () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id));
    if (selectedFiles.length === 0) return;
    const links = selectedFiles.map((f) => f.url).join('\n');
    navigator.clipboard.writeText(links);
    toast.success(`${selectedFiles.length} links copied to clipboard!`);
  };

  // Single delete
  const confirmDeleteSingle = async () => {
    if (!deleteTarget) return;
    try {
      await storageApi.deleteFile(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      if (previewFile?.id === deleteTarget.id) setPreviewFile(null);
      void refetch();
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete file');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Batch delete
  const confirmBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await storageApi.batchDelete(ids);
      toast.success(`Successfully deleted ${ids.length} files`);
      setSelectedIds(new Set());
      if (previewFile && selectedIds.has(previewFile.id)) setPreviewFile(null);
      void refetch();
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete selected files');
    } finally {
      setBatchDeleteOpen(false);
    }
  };

  // Upload handler
  const handleUploadFile = async (fileObj: File, folderName = 'attachments') => {
    if (fileObj.size > 10 * 1024 * 1024) {
      toast.error(`File "${fileObj.name}" exceeds 10 MB maximum limit`);
      return;
    }
    if (!isUnlimited && storageLimitBytes && totalUsedBytes + fileObj.size > storageLimitBytes) {
      openUpgrade('storage', 'You have reached your storage quota. Upgrade to unlock extra space.');
      return;
    }

    const toastId = toast.loading(`Uploading ${fileObj.name}...`);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });

      const base64Data = await base64Promise;
      await storageApi.uploadFile({
        fileName: fileObj.name,
        mimeType: fileObj.type || 'application/octet-stream',
        base64Data,
        folder: folderName,
      });

      toast.success(`Uploaded ${fileObj.name}`, { id: toastId });
      void refetch();
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
      setUploadModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Upload failed', { id: toastId });
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      dropped.forEach((f) => handleUploadFile(f));
    }
  };

  const totalCount = files.length;
  const starredCount = useMemo(() => files.filter((f) => favorites.has(f.id)).length, [files, favorites]);
  const largeFilesCount = useMemo(() => files.filter((f) => f.sizeBytes >= 1024 * 1024).length, [files]);

  const hasActiveFilter =
    selectedFolder !== 'all' || selectedType !== 'all' || quickTab !== 'all' || !!searchQuery.trim();

  const handleResetFilters = () => {
    setQuickTab('all');
    setSelectedType('all');
    setSelectedFolder('all');
    setSearchQuery('');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full flex flex-col gap-5 sm:gap-6 px-3.5 pt-3.5 pb-6 sm:px-0 sm:pt-0 sm:pb-8"
    >
      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-accent/20 backdrop-blur-md border-4 border-dashed border-accent m-6 rounded-3xl pointer-events-none"
          >
            <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-surface-raised/95 border border-border shadow-2xl text-center">
              <div className="w-16 h-16 rounded-3xl bg-accent/15 text-accent flex items-center justify-center shadow-inner">
                <UploadCloud size={36} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-text-primary">Drop files here to upload</h3>
                <p className="text-xs text-text-muted mt-1">
                  Files will be instantly processed and added to your storage
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-5 sm:gap-6 w-full">
        {/* Top Hero Banner */}
        <motion.div variants={itemVariants} className="w-full">
          <StorageHero
            planName={effectivePlan.planName}
            totalCount={totalCount}
            totalUsedBytes={totalUsedBytes}
            summary={summary}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={() => void refetch()}
            onUploadClick={() => setUploadModalOpen(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        </motion.div>

        {/* Main Workspace & Sidebar Layout */}
        <div className="flex items-start gap-5 sm:gap-6 w-full">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block w-60 xl:w-64 shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
            <StorageSidebar
              quickTab={quickTab}
              selectedType={selectedType}
              selectedFolder={selectedFolder}
              totalCount={totalCount}
              starredCount={starredCount}
              largeFilesCount={largeFilesCount}
              distinctFolders={distinctFolders}
              summary={summary}
              effectivePlan={effectivePlan}
              totalUsedBytes={totalUsedBytes}
              storageLimitBytes={storageLimitBytes}
              isUnlimited={isUnlimited}
              onQuickTabChange={handleQuickTabChange}
              onTypeSelect={(type) => {
                setQuickTab('all');
                setSelectedType(selectedType === type ? 'all' : type);
                setSelectedFolder('all');
              }}
              onFolderSelect={(folder) => {
                setQuickTab('all');
                setSelectedFolder(selectedFolder === folder ? 'all' : folder);
                setSelectedType('all');
              }}
              onUpgradeClick={() => openUpgrade('storage', 'Upgrade your plan to unlock more storage capacity.')}
            />
          </aside>

          {/* Center Main Panel */}
          <main className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Filter Tabs, Search & Command Controls */}
            <div className="flex flex-col gap-3">
              {/* Segmented Filter Pills */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <div className="np-pill-segmented flex-nowrap shrink-0">
                    {(
                      [
                        { id: 'all', label: 'All Files', count: totalCount },
                        { id: 'images', label: 'Images', count: summary?.byType.image?.count ?? 0 },
                        { id: 'documents', label: 'Documents', count: summary?.byType.document?.count ?? 0 },
                        { id: 'media', label: 'Videos', count: summary?.byType.video?.count ?? 0 },
                        { id: 'audio', label: 'Audio', count: summary?.byType.audio?.count ?? 0 },
                        { id: 'starred', label: 'Starred', count: starredCount },
                        { id: 'large', label: 'Large Files', count: largeFilesCount },
                      ] as const
                    ).map((tab) => {
                      const isActive = quickTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleQuickTabChange(tab.id as StorageQuickTab)}
                          className={`np-pill ${isActive ? 'is-active' : ''}`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="storage-filter-indicator"
                              className="np-pill-indicator"
                              transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 1 }}
                            />
                          )}
                          <span className="relative z-[1] flex items-center gap-1.5">
                            {tab.label}
                            <span className="np-pill-count">{tab.count}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 shadow-xs shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-surface-raised text-accent shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="Grid View"
                  >
                    <Grid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'bg-surface-raised text-accent shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="List View"
                  >
                    <List size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'compact'
                        ? 'bg-surface-raised text-accent shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="Compact Table"
                  >
                    <LayoutGrid size={15} />
                  </button>
                </div>
              </div>

              {/* Search, Sorting Toolbar */}
              <div
                className="rounded-2xl border border-border/80 p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files by name, type, or folder..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
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

                {/* Sort & Folder Options */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={13} className="text-text-muted shrink-0" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as StorageSortField)}
                      className="py-1.5 px-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-secondary focus:outline-none focus:border-accent"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="size-desc">Largest First</option>
                      <option value="size-asc">Smallest First</option>
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="type">File Type</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Folder size={13} className="text-text-muted shrink-0" />
                    <select
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      className="py-1.5 px-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-secondary focus:outline-none focus:border-accent max-w-[140px] truncate"
                    >
                      <option value="all">All Folders</option>
                      {distinctFolders.map((folder) => (
                        <option key={folder} value={folder}>
                          {FOLDER_LABELS[folder] ?? folder}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch Actions Toolbar */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-accent/40 bg-accent/10 p-3 shadow-md flex items-center justify-between gap-3 flex-wrap text-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-accent">
                    <CheckSquare size={16} />
                    <span>
                      {selectedIds.size} {selectedIds.size === 1 ? 'file' : 'files'} selected
                    </span>
                    <button
                      onClick={handleClearSelection}
                      className="text-text-muted hover:text-text-primary ml-2 font-medium hover:underline text-[11px]"
                    >
                      Deselect all
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleBatchDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-text-primary hover:bg-surface-raised font-bold shadow-xs transition-colors"
                    >
                      <Download size={13} />
                      Download
                    </button>
                    <button
                      onClick={handleBatchCopyLinks}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-text-primary hover:bg-surface-raised font-bold shadow-xs transition-colors"
                    >
                      <Copy size={13} />
                      Copy Links
                    </button>
                    <button
                      onClick={() => setBatchDeleteOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 font-bold shadow-xs transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete Selected
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Breadcrumb & Path Status Bar */}
            <div className="flex items-center justify-between text-xs text-text-muted px-1">
              <div className="flex items-center gap-1.5 flex-wrap font-medium">
                <button
                  onClick={handleResetFilters}
                  className="hover:text-accent flex items-center gap-1 transition-colors"
                >
                  <Home size={13} />
                  <span>Files</span>
                </button>

                {selectedFolder !== 'all' && (
                  <>
                    <ChevronRight size={12} className="text-text-muted" />
                    <span className="text-accent font-semibold">{FOLDER_LABELS[selectedFolder] ?? selectedFolder}</span>
                  </>
                )}

                {selectedType !== 'all' && (
                  <>
                    <ChevronRight size={12} className="text-text-muted" />
                    <span className="text-accent font-semibold">{TYPE_CONFIG[selectedType].label}</span>
                  </>
                )}

                {searchQuery.trim() && (
                  <>
                    <ChevronRight size={12} className="text-text-muted" />
                    <span className="text-text-primary">Search: "{searchQuery}"</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="hover:text-accent font-semibold transition-colors flex items-center gap-1 text-[11px]"
                >
                  {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                    <>
                      <CheckSquare size={13} className="text-accent" />
                      <span>Unselect all</span>
                    </>
                  ) : (
                    <>
                      <Square size={13} />
                      <span>Select all</span>
                    </>
                  )}
                </button>
                <span className="tabular-nums font-semibold">
                  {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
                </span>
              </div>
            </div>

            {/* Files View Area */}
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3 text-text-muted">
                <RefreshCw size={28} className="animate-spin text-accent" />
                <p className="text-xs font-semibold">Loading file manager assets...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div
                className="rounded-3xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-3.5"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-inner">
                  <HardDrive size={26} />
                </div>
                <div className="max-w-md">
                  <p className="text-base font-extrabold text-text-primary">No files match this view</p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {hasActiveFilter
                      ? 'Try clearing your search term, switching folders, or selecting another category.'
                      : 'Upload documents, voice notes, attachments, or images to manage them here.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {hasActiveFilter && (
                    <button
                      onClick={handleResetFilters}
                      className="px-3.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-bold text-text-secondary hover:text-accent transition-colors"
                    >
                      Reset all filters
                    </button>
                  )}
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    Upload File
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredFiles.map((file) => (
                  <StorageFileGridItem
                    key={file.id}
                    file={file}
                    isSelected={selectedIds.has(file.id)}
                    isStarred={favorites.has(file.id)}
                    isCopied={copiedFileId === file.id}
                    onSelect={(e) => handleSelectToggle(file.id, e)}
                    onStar={(e) => toggleFavorite(file.id, e)}
                    onPreview={() => setPreviewFile(file)}
                    onCopyLink={(e) => copyLink(file, e)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(file);
                    }}
                  />
                ))}
              </div>
            ) : viewMode === 'list' ? (
              /* List View (Table) */
              <div
                className="rounded-2xl border border-border/80 overflow-hidden shadow-sm divide-y divide-border/60"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                <div className="px-4 py-3 bg-surface/60 grid grid-cols-12 items-center text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                    <button onClick={handleSelectAll} className="hover:text-text-primary">
                      {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                        <CheckSquare size={14} className="text-accent" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                    <span>File Name</span>
                  </div>
                  <span className="hidden sm:block sm:col-span-2">Folder / Source</span>
                  <span className="hidden md:block md:col-span-2">Category</span>
                  <span className="hidden sm:block sm:col-span-1">Size</span>
                  <span className="hidden lg:block lg:col-span-1">Date</span>
                  <span className="col-span-12 sm:col-span-1 text-right">Actions</span>
                </div>

                {filteredFiles.map((file) => (
                  <StorageFileListRow
                    key={file.id}
                    file={file}
                    isSelected={selectedIds.has(file.id)}
                    isStarred={favorites.has(file.id)}
                    isCopied={copiedFileId === file.id}
                    onSelect={(e) => handleSelectToggle(file.id, e)}
                    onStar={(e) => toggleFavorite(file.id, e)}
                    onPreview={() => setPreviewFile(file)}
                    onCopyLink={(e) => copyLink(file, e)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(file);
                    }}
                  />
                ))}
              </div>
            ) : (
              /* Compact View */
              <div
                className="rounded-2xl border border-border/80 overflow-hidden shadow-sm divide-y divide-border/50"
                style={{ background: 'var(--color-surface-raised)' }}
              >
                {filteredFiles.map((file) => {
                  const config = TYPE_CONFIG[file.fileType];
                  const Icon = config.icon;
                  const folderName = FOLDER_LABELS[file.folder] ?? file.folder;
                  const isSelected = selectedIds.has(file.id);

                  return (
                    <div
                      key={file.id}
                      onClick={() => setPreviewFile(file)}
                      className={`px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-surface-raised/80 transition-colors text-xs cursor-pointer ${
                        isSelected ? 'bg-accent/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={(e) => handleSelectToggle(file.id, e)}
                          className="hover:text-accent text-text-muted shrink-0"
                        >
                          {isSelected ? <CheckSquare size={14} className="text-accent" /> : <Square size={14} />}
                        </button>
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${config.bg}`}>
                          <Icon size={12} />
                        </span>
                        <span className="font-bold text-text-primary truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="hidden sm:inline-block text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border/50">
                          {folderName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-[11px] text-text-muted">
                        <span className="tabular-nums font-semibold">{formatBytes(file.sizeBytes)}</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(file);
                          }}
                          className="p-1 rounded text-text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </motion.div>

      {/* File Inspector & Preview Lightbox Modal */}
      <StoragePreviewModal
        file={previewFile}
        isStarred={previewFile ? favorites.has(previewFile.id) : false}
        isCopied={previewFile ? copiedFileId === previewFile.id : false}
        onClose={() => setPreviewFile(null)}
        onToggleStar={() => {
          if (previewFile) toggleFavorite(previewFile.id);
        }}
        onCopyLink={() => {
          if (previewFile) copyLink(previewFile);
        }}
        onDeleteTarget={(file) => {
          setPreviewFile(null);
          setDeleteTarget(file);
        }}
      />

      {/* Upload File Modal */}
      <StorageUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadFile}
      />

      {/* Delete Single File Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and will permanently remove this file.`}
        confirmText="Delete File"
        cancelText="Cancel"
        destructive={true}
        onConfirm={confirmDeleteSingle}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Batch Delete Confirmation Modal */}
      <ConfirmModal
        open={batchDeleteOpen}
        title="Delete Selected Files"
        message={`Are you sure you want to delete ${selectedIds.size} selected files? This action will permanently remove all selected files.`}
        confirmText={`Delete ${selectedIds.size} Files`}
        cancelText="Cancel"
        destructive={true}
        onConfirm={confirmBatchDelete}
        onClose={() => setBatchDeleteOpen(false)}
      />

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div
            className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-surface-raised border-r border-border shadow-2xl flex flex-col"
            style={{ background: 'var(--color-surface-raised)' }}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} style={{ color: 'var(--color-accent)' }} />
                <span className="text-sm font-bold text-text-primary">File Explorer</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                aria-label="Close explorer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StorageSidebar
                quickTab={quickTab}
                selectedType={selectedType}
                selectedFolder={selectedFolder}
                totalCount={totalCount}
                starredCount={starredCount}
                largeFilesCount={largeFilesCount}
                distinctFolders={distinctFolders}
                summary={summary}
                effectivePlan={effectivePlan}
                totalUsedBytes={totalUsedBytes}
                storageLimitBytes={storageLimitBytes}
                isUnlimited={isUnlimited}
                onQuickTabChange={(tab) => {
                  handleQuickTabChange(tab);
                  setSidebarOpen(false);
                }}
                onTypeSelect={(type) => {
                  setQuickTab('all');
                  setSelectedType(selectedType === type ? 'all' : type);
                  setSelectedFolder('all');
                  setSidebarOpen(false);
                }}
                onFolderSelect={(folder) => {
                  setQuickTab('all');
                  setSelectedFolder(selectedFolder === folder ? 'all' : folder);
                  setSelectedType('all');
                  setSidebarOpen(false);
                }}
                onUpgradeClick={() => {
                  setSidebarOpen(false);
                  openUpgrade('storage', 'Upgrade your plan to unlock more storage capacity.');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoragePage;