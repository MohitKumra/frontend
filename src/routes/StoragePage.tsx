import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search,
  Download,
  X,
  FolderOpen,
  UploadCloud,
  Trash2,
  Copy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function GridIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" fill={active ? '#7c6ff7' : '#a0a0b8'} />
    </svg>
  );
}

function ListIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="13" height="2" rx="1" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="1.5" y="7" width="13" height="2" rx="1" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="1.5" y="11" width="13" height="2" rx="1" fill={active ? '#7c6ff7' : '#a0a0b8'} />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 4h10M4 7h6M6 10h2" stroke="#8e8ea0" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5l1.5 1.5H11.5C12.33 3.5 13 4.17 13 5v5.5C13 11.33 12.33 12 11.5 12h-9C1.67 12 1 11.33 1 10.5V3.5z" fill="#a0a0b8" opacity="0.3" />
      <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5l1.5 1.5H11.5C12.33 3.5 13 4.17 13 5v5.5C13 11.33 12.33 12 11.5 12h-9C1.67 12 1 11.33 1 10.5V3.5z" stroke="#8e8ea0" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

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
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage(1);
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
        if (quickTab === 'starred' && !favorites.has(file.id)) return false;
        if (quickTab === 'large' && file.sizeBytes < 1024 * 1024) return false;
        if (quickTab === 'media' && file.fileType !== 'image' && file.fileType !== 'video') return false;
        if (selectedType !== 'all' && file.fileType !== selectedType) return false;
        if (selectedFolder !== 'all' && file.folder !== selectedFolder) return false;
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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const paginatedFiles = filteredFiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [quickTab, selectedType, selectedFolder, searchQuery, sortBy]);

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

  // Tab definitions
  const tabs = [
    { id: 'all' as StorageQuickTab, label: 'All Files', count: totalCount },
    { id: 'images' as StorageQuickTab, label: 'Images', count: summary?.byType.image?.count ?? 0 },
    { id: 'documents' as StorageQuickTab, label: 'Documents', count: summary?.byType.document?.count ?? 0 },
    { id: 'media' as StorageQuickTab, label: 'Videos', count: summary?.byType.video?.count ?? 0 },
    { id: 'audio' as StorageQuickTab, label: 'Audio', count: summary?.byType.audio?.count ?? 0 },
    { id: 'starred' as StorageQuickTab, label: 'Starred', count: starredCount },
    { id: 'large' as StorageQuickTab, label: 'Large Files', count: largeFilesCount },
  ] as const;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full flex flex-col gap-4 px-3.5 pt-3.5 pb-6 sm:px-0 sm:pt-0 sm:pb-8"
    >
      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#7c6ff7]/15 backdrop-blur-md border-4 border-dashed border-[#7c6ff7] m-6 rounded-3xl pointer-events-none"
          >
            <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/95 dark:bg-[#18181b]/95 border border-[#EBEBF0] dark:border-[#28282e] shadow-2xl text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#7c6ff7]/15 flex items-center justify-center shadow-inner">
                <UploadCloud size={36} className="text-[#7c6ff7] animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1a1a2e] dark:text-white">Drop files here to upload</h3>
                <p className="text-xs text-[#8e8ea0] mt-1">Files will be instantly processed and added to your storage</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4 w-full">
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
        <div className="flex items-start gap-4 w-full">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block w-56 xl:w-60 shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
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
          <main className="flex-1 min-w-0 flex flex-col gap-3">
            {/* ── Filter Tabs Row ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Tab Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <div className="flex items-center gap-1 bg-white dark:bg-[#18181b] border border-[#EBEBF0] dark:border-[#28282e] rounded-xl px-1.5 py-1 shadow-xs">
                  {tabs.map((tab) => {
                    const isActive = quickTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleQuickTabChange(tab.id)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-[#7c6ff7] text-white shadow-sm font-bold'
                            : 'text-[#666680] dark:text-[#8888a0] hover:text-[#1a1a2e] dark:hover:text-white hover:bg-[#f8f8fc] dark:hover:bg-[#1e1e26]'
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                            isActive
                              ? 'bg-white/25 text-white'
                              : 'bg-[#f0f0f8] dark:bg-[#222230] text-[#8e8ea0]'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* View mode switcher */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#18181b] border border-[#EBEBF0] dark:border-[#28282e] rounded-xl p-1 shadow-xs shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#f0eeff] dark:bg-[#2a2550] shadow-sm'
                      : 'text-[#a0a0b8] hover:text-[#7c6ff7]'
                  }`}
                  title="Grid View"
                >
                  <GridIcon active={viewMode === 'grid'} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#f0eeff] dark:bg-[#2a2550] shadow-sm'
                      : 'text-[#a0a0b8] hover:text-[#7c6ff7]'
                  }`}
                  title="List View"
                >
                  <ListIcon active={viewMode === 'list'} />
                </button>
              </div>
            </div>

            {/* ── Search & Sort Bar ── */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#18181b] border border-[#EBEBF0] dark:border-[#28282e] rounded-xl px-3 py-2.5 shadow-xs">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b0b0c0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files by name, type, or folder..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#f8f8fc] dark:bg-[#111118] border border-[#EBEBF0] dark:border-[#28282e] text-[12.5px] font-medium text-[#1a1a2e] dark:text-white placeholder:text-[#b0b0c0] focus:outline-none focus:border-[#7c6ff7] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b0b0c0] hover:text-[#666680]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-[#EBEBF0] dark:bg-[#28282e] shrink-0" />

              {/* Sort selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <SortIcon />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as StorageSortField)}
                  className="py-1 px-2 rounded-lg bg-transparent text-[12px] font-semibold text-[#666680] dark:text-[#8888a0] focus:outline-none cursor-pointer appearance-none pr-5"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 3l3 4 3-4' stroke='%238e8ea0' fill='none' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center' }}
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

              {/* Divider */}
              <div className="w-px h-5 bg-[#EBEBF0] dark:bg-[#28282e] shrink-0" />

              {/* Folder selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <FolderIcon />
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="py-1 px-2 rounded-lg bg-transparent text-[12px] font-semibold text-[#666680] dark:text-[#8888a0] focus:outline-none cursor-pointer appearance-none pr-5 max-w-[120px]"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 3l3 4 3-4' stroke='%238e8ea0' fill='none' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center' }}
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

            {/* ── Select All / Count Bar ── */}
            <div className="flex items-center justify-end gap-3 text-[12px] text-[#8e8ea0]">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 hover:text-[#7c6ff7] font-semibold transition-colors"
              >
                {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" fill="#7c6ff7" />
                    <path d="M4 7l2.5 2.5L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="#b0b0c0" strokeWidth="1.3" fill="none" />
                  </svg>
                )}
                <span>Select all</span>
              </button>
              <span className="tabular-nums font-semibold">{filteredFiles.length} files</span>
            </div>

            {/* ── Batch Actions Toolbar ── */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl border border-[#7c6ff7]/30 bg-[#f0eeff] dark:bg-[#2a2550] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap text-[12px]"
                >
                  <div className="flex items-center gap-2 font-bold text-[#7c6ff7]">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <rect x="1.5" y="1.5" width="12" height="12" rx="3" fill="#7c6ff7" />
                      <path d="M4.5 7.5l2.5 2.5L10.5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{selectedIds.size} {selectedIds.size === 1 ? 'file' : 'files'} selected</span>
                    <button
                      onClick={handleClearSelection}
                      className="text-[#8e8ea0] hover:text-[#1a1a2e] ml-1 font-medium hover:underline text-[11px]"
                    >
                      Deselect all
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#18181b] border border-[#EBEBF0] dark:border-[#28282e] text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] font-bold transition-colors"
                    >
                      <Download size={12} />
                      Download
                    </button>
                    <button
                      onClick={handleBatchCopyLinks}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#18181b] border border-[#EBEBF0] dark:border-[#28282e] text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] font-bold transition-colors"
                    >
                      <Copy size={12} />
                      Copy Links
                    </button>
                    <button
                      onClick={() => setBatchDeleteOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 font-bold transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Files View Area ── */}
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3 text-[#8e8ea0]">
                <RefreshCw size={28} className="animate-spin text-[#7c6ff7]" />
                <p className="text-xs font-semibold">Loading file manager assets...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] p-12 text-center flex flex-col items-center justify-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#f0eeff] dark:bg-[#2a2550] text-[#7c6ff7] flex items-center justify-center">
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <rect x="3" y="3" width="20" height="20" rx="4" stroke="#7c6ff7" strokeWidth="1.5" fill="none" />
                    <path d="M13 9v8M9 13h8" stroke="#7c6ff7" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="max-w-md">
                  <p className="text-base font-extrabold text-[#1a1a2e] dark:text-white">No files match this view</p>
                  <p className="text-xs text-[#8e8ea0] mt-1 leading-relaxed">
                    {hasActiveFilter
                      ? 'Try clearing your search term, switching folders, or selecting another category.'
                      : 'Upload documents, voice notes, attachments, or images to manage them here.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {hasActiveFilter && (
                    <button
                      onClick={handleResetFilters}
                      className="px-3.5 py-1.5 rounded-xl border border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] text-xs font-bold text-[#666680] hover:text-[#7c6ff7] transition-colors"
                    >
                      Reset all filters
                    </button>
                  )}
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #7c6ff7 0%, #5b4ef5 100%)' }}
                  >
                    Upload File
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedFiles.map((file) => (
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
            ) : (
              /* List View (Table) */
              <div className="rounded-2xl border border-[#EBEBF0] dark:border-[#28282e] overflow-hidden shadow-xs bg-white dark:bg-[#18181b] divide-y divide-[#F0F0F8] dark:divide-[#222230]">
                <div className="px-4 py-3 bg-[#f8f8fc] dark:bg-[#111118] grid grid-cols-12 items-center text-[10.5px] font-bold text-[#8e8ea0] uppercase tracking-wider">
                  <div className="col-span-5 flex items-center gap-3">
                    <button onClick={handleSelectAll} className="hover:text-[#7c6ff7]">
                      {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" fill="#7c6ff7" />
                          <path d="M4 7l2.5 2.5L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="#b0b0c0" strokeWidth="1.3" fill="none" />
                        </svg>
                      )}
                    </button>
                    <span>File Name</span>
                  </div>
                  <span className="col-span-2">Folder</span>
                  <span className="col-span-2">Category</span>
                  <span className="col-span-1">Size</span>
                  <span className="col-span-1">Date</span>
                  <span className="col-span-1 text-right">Actions</span>
                </div>

                {paginatedFiles.map((file) => (
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
            )}

            {/* ── Pagination ── */}
            {filteredFiles.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-[12px] text-[#8e8ea0] font-medium">
                  Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredFiles.length)} to{' '}
                  {Math.min(currentPage * PAGE_SIZE, filteredFiles.length)} of {filteredFiles.length} files
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] text-[#8e8ea0] hover:text-[#7c6ff7] hover:border-[#7c6ff7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-[12px] text-[#8e8ea0]">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12.5px] font-bold transition-colors border ${
                            currentPage === item
                              ? 'bg-[#7c6ff7] text-white border-[#7c6ff7] shadow-sm'
                              : 'border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] text-[#666680] hover:text-[#7c6ff7] hover:border-[#7c6ff7]'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] text-[#8e8ea0] hover:text-[#7c6ff7] hover:border-[#7c6ff7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
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
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white dark:bg-[#18181b] border-r border-[#EBEBF0] dark:border-[#28282e] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#EBEBF0] dark:border-[#28282e]">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-[#7c6ff7]" />
                <span className="text-sm font-bold text-[#1a1a2e] dark:text-white">File Explorer</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-[#8e8ea0] hover:text-[#1a1a2e] hover:bg-[#f8f8fc] transition-colors"
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