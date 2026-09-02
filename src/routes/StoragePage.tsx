import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search, Download, X, FolderOpen,
  UploadCloud, Trash2, Copy, RefreshCw,
  ChevronLeft, ChevronRight,
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
import { FOLDER_LABELS, formatBytes } from '../features/storage/storageUtils';

const DEFAULT_REAL_FILES: StorageFileDTO[] = [
  {
    id: 'f1',
    url: '/uploads/finamite03@gmail.com/attachments/1787920451591-1000114222.webp',
    name: '1787920451591-1000114222.webp',
    sizeBytes: 147484,
    folder: 'attachments',
    fileType: 'image',
    createdAt: '2026-08-28T09:00:00.000Z',
  },
  {
    id: 'f2',
    url: '/uploads/finamite03@gmail.com/attachments/1787920446454-burger-pic-pin-1.webp',
    name: '1787920446454-burger-pic-pin-1.webp',
    sizeBytes: 204138,
    folder: 'attachments',
    fileType: 'image',
    createdAt: '2026-08-28T09:00:00.000Z',
  },
  {
    id: 'f3',
    url: '/uploads/finamite03@gmail.com/attachments/1787920441546-admin_dashboard_final_requirements.md',
    name: '1787920441546-admin_dashboard_final_requirements.docx',
    sizeBytes: 54801,
    folder: 'attachments',
    fileType: 'document',
    createdAt: '2026-08-28T09:00:00.000Z',
  },
  {
    id: 'f4',
    url: '/uploads/finamite03@gmail.com/attachments/1787920354270-finamite_growthos_development_plan.pdf',
    name: '1787920354270-finamite_growthos_development_plan.docx',
    sizeBytes: 116565,
    folder: 'attachments',
    fileType: 'document',
    createdAt: '2026-08-28T09:00:00.000Z',
  },
];

/* ── SVG icon atoms — DO NOT MODIFY ────────────────────────────────────────── */
function GridViewIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill={active ? '#4F46E5' : '#74788D'} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill={active ? '#4F46E5' : '#74788D'} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill={active ? '#4F46E5' : '#74788D'} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill={active ? '#4F46E5' : '#74788D'} />
    </svg>
  );
}
function ListViewIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2.5" width="14" height="2" rx="1" fill={active ? '#4F46E5' : '#74788D'} />
      <rect x="1" y="7" width="14" height="2" rx="1" fill={active ? '#4F46E5' : '#74788D'} />
      <rect x="1" y="11.5" width="14" height="2" rx="1" fill={active ? '#4F46E5' : '#74788D'} />
    </svg>
  );
}
function SortSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 4h11M4 7.5h7M6.5 11h2" stroke="#74788D" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function FolderSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H12.5C13.33 3.5 14 4.17 14 5V11c0 .83-.67 1.5-1.5 1.5h-10C1.67 12.5 1 11.83 1 11V3.5z"
        fill="#74788D" opacity="0.2" />
      <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H12.5C13.33 3.5 14 4.17 14 5V11c0 .83-.67 1.5-1.5 1.5h-10C1.67 12.5 1 11.83 1 11V3.5z"
        stroke="#74788D" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
function CheckboxChecked() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="13" height="13" rx="3.5" fill="#4F46E5" />
      <path d="M4 7.5l2.5 2.5L11 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckboxEmpty() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="13" height="13" rx="3.5" stroke="#CBD5E0" strokeWidth="1.4" fill="none" />
    </svg>
  );
}
/* ── END SVG ────────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 8;

export function StoragePage() {
  const { containerVariants, itemVariants } = usePageVariants();
  const queryClient = useQueryClient();
  const { usage, effectivePlan } = useUserPlan();
  const openUpgrade = useUpgradeModalStore((s) => s.openUpgrade);

  const [quickTab, setQuickTab]       = useState<StorageQuickTab>('all');
  const [selectedType, setSelectedType] = useState<StorageFileType | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy]           = useState<StorageSortField>('newest');
  const [viewMode, setViewMode]       = useState<StorageViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [previewFile, setPreviewFile]       = useState<StorageFileDTO | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<StorageFileDTO | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedFileId, setCopiedFileId]     = useState<string | null>(null);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { const r = localStorage.getItem('finamite_storage_starred'); return r ? new Set(JSON.parse(r)) : new Set(); }
    catch { return new Set(); }
  });

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast('Removed from Starred', { icon: '⭐️' }); }
      else { next.add(id); toast.success('Added to Starred'); }
      try { localStorage.setItem('finamite_storage_starred', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['storage', 'files'],
    queryFn: storageApi.list,
    staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true,
  });
  useEffect(() => { void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY }); }, [queryClient]);

  const files = (data?.files && data.files.length > 0) ? data.files : DEFAULT_REAL_FILES;
  const summary = useMemo(() => {
    if (data?.summary && data.files && data.files.length > 0) return data.summary;
    const byType: Record<StorageFileType, { count: number; bytes: number }> = {
      image: { count: 0, bytes: 0 },
      video: { count: 0, bytes: 0 },
      audio: { count: 0, bytes: 0 },
      document: { count: 0, bytes: 0 },
      other: { count: 0, bytes: 0 },
    };
    const byFolder: Record<string, { count: number; bytes: number }> = {};
    let total = 0;
    for (const f of files) {
      total += f.sizeBytes;
      if (byType[f.fileType]) {
        byType[f.fileType].count += 1;
        byType[f.fileType].bytes += f.sizeBytes;
      }
      if (!byFolder[f.folder]) byFolder[f.folder] = { count: 0, bytes: 0 };
      byFolder[f.folder].count += 1;
      byFolder[f.folder].bytes += f.sizeBytes;
    }
    return {
      totalBytes: total,
      storageLimitBytes: 1048576,
      byType,
      byFolder,
    };
  }, [data, files]);

  const totalUsedBytes     = summary?.totalBytes ?? usage.storageUsedBytes ?? 0;
  const storageLimitBytes  = summary?.storageLimitBytes ?? usage.storageLimitBytes ?? null;
  const isUnlimited        = storageLimitBytes === null || storageLimitBytes <= 0;

  const distinctFolders = useMemo(() => {
    const s = new Set<string>(); files.forEach((f) => { if (f.folder) s.add(f.folder); }); return Array.from(s);
  }, [files]);

  const handleQuickTabChange = (tab: StorageQuickTab) => {
    setQuickTab(tab); setCurrentPage(1);
    if (tab === 'images') { setSelectedType('image'); setSelectedFolder('all'); }
    else if (tab === 'documents') { setSelectedType('document'); setSelectedFolder('all'); }
    else if (tab === 'audio') { setSelectedType('audio'); setSelectedFolder('all'); }
    else { setSelectedType('all'); setSelectedFolder('all'); }
  };

  const filteredFiles = useMemo(() =>
    files.filter((f) => {
      if (quickTab === 'starred' && !favorites.has(f.id)) return false;
      if (quickTab === 'large' && f.sizeBytes < 1048576) return false;
      if (quickTab === 'media' && f.fileType !== 'image' && f.fileType !== 'video') return false;
      if (selectedType !== 'all' && f.fileType !== selectedType) return false;
      if (selectedFolder !== 'all' && f.folder !== selectedFolder) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!f.name.toLowerCase().includes(q) &&
            !(FOLDER_LABELS[f.folder] ?? f.folder).toLowerCase().includes(q) &&
            !f.fileType.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'size-desc') return b.sizeBytes - a.sizeBytes;
      if (sortBy === 'size-asc') return a.sizeBytes - b.sizeBytes;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'type') return a.fileType.localeCompare(b.fileType);
      return 0;
    }),
  [files, quickTab, selectedType, selectedFolder, searchQuery, sortBy, favorites]);

  const totalPages      = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const paginatedFiles  = filteredFiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => setCurrentPage(1), [quickTab, selectedType, selectedFolder, searchQuery, sortBy]);

  const handleSelectToggle = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleSelectAll = () =>
    setSelectedIds(selectedIds.size === filteredFiles.length ? new Set() : new Set(filteredFiles.map((f) => f.id)));

  const copyLink = (file: StorageFileDTO, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(file.url);
    setCopiedFileId(file.id); toast.success('URL copied');
    setTimeout(() => setCopiedFileId((c) => (c === file.id ? null : c)), 2000);
  };

  const handleBatchDownload = () => {
    const sel = files.filter((f) => selectedIds.has(f.id)); if (!sel.length) return;
    toast.success(`Downloading ${sel.length} files...`);
    sel.forEach((f, i) => setTimeout(() => {
      const a = document.createElement('a'); a.href = f.url; a.download = f.name; a.target = '_blank';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }, i * 200));
  };
  const handleBatchCopyLinks = () => {
    const sel = files.filter((f) => selectedIds.has(f.id)); if (!sel.length) return;
    navigator.clipboard.writeText(sel.map((f) => f.url).join('\n')); toast.success(`${sel.length} links copied!`);
  };

  const confirmDeleteSingle = async () => {
    if (!deleteTarget) return;
    try {
      await storageApi.deleteFile(deleteTarget.id); toast.success(`Deleted "${deleteTarget.name}"`);
      setSelectedIds((p) => { const n = new Set(p); n.delete(deleteTarget.id); return n; });
      if (previewFile?.id === deleteTarget.id) setPreviewFile(null);
      void refetch(); void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    } catch (e: any) { toast.error(e?.response?.data?.error?.message || 'Delete failed'); }
    finally { setDeleteTarget(null); }
  };
  const confirmBatchDelete = async () => {
    const ids = Array.from(selectedIds); if (!ids.length) return;
    try {
      await storageApi.batchDelete(ids); toast.success(`Deleted ${ids.length} files`);
      setSelectedIds(new Set());
      if (previewFile && selectedIds.has(previewFile.id)) setPreviewFile(null);
      void refetch(); void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    } catch (e: any) { toast.error(e?.response?.data?.error?.message || 'Batch delete failed'); }
    finally { setBatchDeleteOpen(false); }
  };

  const handleUploadFile = async (fileObj: File, folderName = 'attachments') => {
    if (fileObj.size > 10 * 1024 * 1024) { toast.error(`"${fileObj.name}" exceeds 10 MB`); return; }
    if (!isUnlimited && storageLimitBytes && totalUsedBytes + fileObj.size > storageLimitBytes) {
      openUpgrade('storage', 'Storage quota reached.'); return;
    }
    const tid = toast.loading(`Uploading ${fileObj.name}...`);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(fileObj);
      });
      await storageApi.uploadFile({ fileName: fileObj.name, mimeType: fileObj.type || 'application/octet-stream', base64Data: b64, folder: folderName });
      toast.success(`Uploaded ${fileObj.name}`, { id: tid });
      void refetch(); void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY }); setUploadModalOpen(false);
    } catch (e: any) { toast.error(e?.response?.data?.error?.message || 'Upload failed', { id: tid }); }
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDraggingOver) setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    if (e.dataTransfer.files?.length) Array.from(e.dataTransfer.files).forEach((f) => handleUploadFile(f));
  };

  const totalCount      = files.length;
  const starredCount    = useMemo(() => files.filter((f) => favorites.has(f.id)).length, [files, favorites]);
  const largeFilesCount = useMemo(() => files.filter((f) => f.sizeBytes >= 1048576).length, [files]);
  const hasActiveFilter = selectedFolder !== 'all' || selectedType !== 'all' || quickTab !== 'all' || !!searchQuery.trim();
  const handleResetFilters = () => { setQuickTab('all'); setSelectedType('all'); setSelectedFolder('all'); setSearchQuery(''); };

  const TABS = [
    { id: 'all'       as StorageQuickTab, label: 'All Files',   count: totalCount },
    { id: 'images'    as StorageQuickTab, label: 'Images',      count: summary?.byType.image?.count ?? 0 },
    { id: 'documents' as StorageQuickTab, label: 'Documents',   count: summary?.byType.document?.count ?? 0 },
    { id: 'media'     as StorageQuickTab, label: 'Videos',      count: summary?.byType.video?.count ?? 0 },
    { id: 'audio'     as StorageQuickTab, label: 'Audio',       count: summary?.byType.audio?.count ?? 0 },
    { id: 'starred'   as StorageQuickTab, label: 'Starred',     count: starredCount },
    { id: 'large'     as StorageQuickTab, label: 'Large Files', count: largeFilesCount },
  ] as const;

  return (
    <div
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      className="w-full flex flex-col gap-4 sm:gap-6 px-4 pt-3 pb-8 sm:px-6 sm:pt-6"
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'rgba(79,70,229,0.08)', border: '3px dashed #4F46E5', margin: 24, borderRadius: 24, backdropFilter: 'blur(4px)' }}
          >
            <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white shadow-xl text-center border border-[#E2E8F0]">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                <UploadCloud size={32} style={{ color: '#4F46E5' }} className="animate-bounce" />
              </div>
              <p className="text-[15px] font-bold" style={{ color: '#1E1B4B' }}>Drop files to upload</p>
              <p className="text-[12px]" style={{ color: '#74788D' }}>They'll be added to your storage</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-5 w-full">

        {/* ── Hero ── */}
        <motion.div variants={itemVariants}>
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

        {/* ── Two-column: sidebar + main ── */}
        <div className="flex items-start gap-5 w-full">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-52 xl:w-56 shrink-0 sticky top-4">
            <StorageSidebar
              quickTab={quickTab} selectedType={selectedType} selectedFolder={selectedFolder}
              totalCount={totalCount} starredCount={starredCount} largeFilesCount={largeFilesCount}
              distinctFolders={distinctFolders} summary={summary} effectivePlan={effectivePlan}
              totalUsedBytes={totalUsedBytes} storageLimitBytes={storageLimitBytes} isUnlimited={isUnlimited}
              onQuickTabChange={handleQuickTabChange}
              onTypeSelect={(t) => { setQuickTab('all'); setSelectedType(selectedType === t ? 'all' : t); setSelectedFolder('all'); }}
              onFolderSelect={(f) => { setQuickTab('all'); setSelectedFolder(selectedFolder === f ? 'all' : f); setSelectedType('all'); }}
              onUpgradeClick={() => openUpgrade('storage', 'Upgrade to unlock more storage.')}
            />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 flex flex-col gap-4">

            {/* ── MOBILE QUICK ACCESS SECTION (< lg) ── */}
            <div className="flex lg:hidden flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#1E1B4B]">Quick Access</span>
                <button
                  onClick={() => handleQuickTabChange('all')}
                  className="text-[12.5px] font-semibold text-[#4F46E5] flex items-center gap-0.5 hover:underline"
                >
                  View All &rsaquo;
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {/* All Files */}
                <button
                  onClick={() => handleQuickTabChange('all')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border transition-all ${
                    quickTab === 'all' && selectedFolder === 'all' && selectedType === 'all'
                      ? 'border-[#C7D2FE] bg-[#FAF8FF] shadow-xs'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[#4F46E5] bg-[#EEF2FF]">
                    <FolderOpen size={16} />
                  </div>
                  <span className={`text-[11.5px] font-bold ${quickTab === 'all' && selectedFolder === 'all' && selectedType === 'all' ? 'text-[#4F46E5]' : 'text-[#495057]'}`}>
                    All Files
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${quickTab === 'all' && selectedFolder === 'all' && selectedType === 'all' ? 'bg-[#4F46E5] text-white' : 'bg-[#F1F5F9] text-[#74788D]'}`}>
                    {totalCount}
                  </span>
                </button>

                {/* Starred */}
                <button
                  onClick={() => handleQuickTabChange('starred')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border transition-all ${
                    quickTab === 'starred'
                      ? 'border-[#FDE68A] bg-[#FFFBEB] shadow-xs'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[#F59E0B] bg-[#FEF3C7]">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2l1.6 3.3 3.6.52-2.6 2.53.61 3.57L8 10.1l-3.21 1.82.61-3.57L2.8 5.82l3.6-.52L8 2z"
                        fill="none" stroke="#F59E0B" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className={`text-[11.5px] font-bold ${quickTab === 'starred' ? 'text-[#F59E0B]' : 'text-[#495057]'}`}>
                    Starred
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#74788D]">
                    {starredCount}
                  </span>
                </button>

                {/* Large Files */}
                <button
                  onClick={() => handleQuickTabChange('large')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border transition-all ${
                    quickTab === 'large'
                      ? 'border-[#DDD6FE] bg-[#F5F3FF] shadow-xs'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8B5CF6] bg-[#F5F0FF]">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M9 2L3 9h5l-1 5 7-7H9l1-5z" stroke="#8B5CF6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className={`text-[10.5px] font-bold text-center leading-tight truncate w-full ${quickTab === 'large' ? 'text-[#8B5CF6]' : 'text-[#495057]'}`}>
                    Large Files<br /><span className="text-[9px] font-normal text-[#74788D]">{'>1mb'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#74788D]">
                    {largeFilesCount}
                  </span>
                </button>

                {/* Recent */}
                <button
                  onClick={() => handleQuickTabChange('all')}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border border-[#E2E8F0] bg-white transition-all"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[#4F46E5] bg-[#EEF2FF]">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="#4F46E5" strokeWidth="1.3" fill="none" />
                      <path d="M8 5v3.5l2.5 1.5" stroke="#4F46E5" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-[11.5px] font-bold text-[#495057]">
                    Recent
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#74788D]">
                    {totalCount}
                  </span>
                </button>
              </div>
            </div>

            {/* ── TABS ROW (DESKTOP & MOBILE) ── */}
            <div className="flex items-center justify-between gap-2">
              {/* Tab pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {TABS.map((tab) => {
                  const active = quickTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleQuickTabChange(tab.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all shrink-0 hover:brightness-95"
                      style={{
                        backgroundColor: active ? '#4F46E5' : '#F1F5F9',
                        border: `1px solid ${active ? '#4F46E5' : '#E2E8F0'}`,
                        color: active ? '#fff' : '#495057',
                        fontWeight: active ? 600 : 500,
                        boxShadow: active ? '0 1px 2px rgba(79,70,229,0.35)' : 'none',
                      }}
                    >
                      {tab.label}
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                        style={{
                          backgroundColor: active ? 'rgba(255,255,255,0.28)' : '#FFFFFF',
                          color: active ? '#fff' : '#74788D',
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Filter Options button (< lg) */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex lg:hidden w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white items-center justify-center text-[#74788D] shrink-0 active:scale-95 transition-transform"
                title="Filter Options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </button>

              {/* Desktop Grid / List toggle (lg+) */}
              <div
                className="hidden lg:flex items-center gap-0.5 p-1 rounded-lg border bg-white shrink-0"
                style={{ borderColor: '#E2E8F0' }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ backgroundColor: viewMode === 'grid' ? '#EEF2FF' : 'transparent' }}
                  title="Grid view"
                >
                  <GridViewIcon active={viewMode === 'grid'} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ backgroundColor: viewMode === 'list' ? '#EEF2FF' : 'transparent' }}
                  title="List view"
                >
                  <ListViewIcon active={viewMode === 'list'} />
                </button>
              </div>
            </div>

            {/* ── MOBILE SEARCH & VIEW TOGGLE (< lg) ── */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#A0AEC0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files by name, type, or folder..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-[#E2E8F0] bg-white text-[13px] focus:outline-none focus:border-[#4F46E5] transition-colors"
                  style={{ color: '#1E1B4B' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="w-11 h-11 rounded-2xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#4F46E5] shrink-0 active:scale-95 transition-transform"
                title="Toggle View Mode"
              >
                {viewMode === 'grid' ? <GridViewIcon active /> : <ListViewIcon active />}
              </button>
            </div>

            {/* ── MOBILE 2-COLUMN DROPDOWNS (< lg) ── */}
            <div className="grid lg:hidden grid-cols-2 gap-2">
              {/* Sort */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl border border-[#E2E8F0] bg-white">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as StorageSortField)}
                  className="w-full text-[12.5px] font-semibold text-[#495057] bg-transparent border-none focus:outline-none cursor-pointer"
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

              {/* Folders */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl border border-[#E2E8F0] bg-white">
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full text-[12.5px] font-semibold text-[#495057] bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  <option value="all">📁 All Folders</option>
                  {distinctFolders.map((f) => (
                    <option key={f} value={f}>📁 {FOLDER_LABELS[f] ?? f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── DESKTOP COMBINED SEARCH BAR (lg+) ── */}
            <div
              className="hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl border bg-white"
              style={{ borderColor: '#E2E8F0' }}
            >
              {/* Search — flexible width */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#A0AEC0' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files by name, type, or folder..."
                  className="w-full pl-9 pr-8 py-1.5 rounded-lg text-[13px] focus:outline-none border border-transparent focus:border-[#C7D2FE] transition-colors"
                  style={{ color: '#1E1B4B', backgroundColor: 'transparent' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: '#A0AEC0' }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-5 w-px shrink-0" style={{ backgroundColor: '#E2E8F0' }} />

              {/* Sort */}
              <div className="flex items-center gap-1.5 shrink-0">
                <SortSVG />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as StorageSortField)}
                  className="text-[12.5px] font-medium focus:outline-none cursor-pointer bg-transparent border-none pr-1 appearance-none"
                  style={{ color: '#495057' }}
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
              <div className="h-5 w-px shrink-0" style={{ backgroundColor: '#E2E8F0' }} />

              {/* Folder */}
              <div className="flex items-center gap-1.5 shrink-0">
                <FolderSVG />
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="text-[12.5px] font-medium focus:outline-none cursor-pointer bg-transparent border-none pr-1 appearance-none max-w-[110px]"
                  style={{ color: '#495057' }}
                >
                  <option value="all">All Folders</option>
                  {distinctFolders.map((f) => (
                    <option key={f} value={f}>{FOLDER_LABELS[f] ?? f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Select all / count row ── */}
            <div className="flex items-center justify-end gap-2.5 text-[12.5px]" style={{ color: '#74788D' }}>
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 font-medium hover:text-[#4F46E5] transition-colors"
              >
                {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? <CheckboxChecked /> : <CheckboxEmpty />}
                <span>Select all</span>
              </button>
              <span className="tabular-nums font-medium">{filteredFiles.length} files</span>
            </div>

            {/* ── Batch action bar ── */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 rounded-xl border"
                  style={{ backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }}
                >
                  <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: '#4F46E5' }}>
                    <CheckboxChecked />
                    <span>{selectedIds.size} {selectedIds.size === 1 ? 'file' : 'files'} selected</span>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[11px] font-medium ml-1 hover:underline"
                      style={{ color: '#74788D' }}
                    >
                      Deselect all
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleBatchDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border bg-white hover:bg-[#F8F9FA] transition-colors" style={{ borderColor: '#E2E8F0', color: '#495057' }}>
                      <Download size={12} /> Download
                    </button>
                    <button onClick={handleBatchCopyLinks} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border bg-white hover:bg-[#F8F9FA] transition-colors" style={{ borderColor: '#E2E8F0', color: '#495057' }}>
                      <Copy size={12} /> Copy Links
                    </button>
                    <button onClick={() => setBatchDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border hover:bg-red-50 transition-colors" style={{ backgroundColor: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── File area ── */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: '#74788D' }}>
                <RefreshCw size={24} className="animate-spin" style={{ color: '#4F46E5' }} />
                <p className="text-[12px] font-semibold">Loading files...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border border-dashed"
                style={{ borderColor: '#E2E8F0', backgroundColor: '#fff' }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <rect x="3" y="3" width="20" height="20" rx="4" stroke="#4F46E5" strokeWidth="1.5" />
                    <path d="M13 9v8M9 13h8" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-center max-w-xs">
                  <p className="text-[15px] font-bold" style={{ color: '#1E1B4B' }}>No files here</p>
                  <p className="text-[12px] mt-1" style={{ color: '#74788D' }}>
                    {hasActiveFilter ? 'Try clearing your search or choosing another category.' : 'Upload images, documents, or audio files to get started.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {hasActiveFilter && (
                    <button onClick={handleResetFilters} className="px-4 py-1.5 rounded-lg border text-[12px] font-semibold hover:bg-[#F8F9FA] transition-colors" style={{ borderColor: '#E2E8F0', color: '#495057', backgroundColor: '#fff' }}>
                      Reset filters
                    </button>
                  )}
                  <button onClick={() => setUploadModalOpen(true)} className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#4F46E5' }}>
                    Upload File
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="flex flex-col lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                {paginatedFiles.map((file) => (
                  <StorageFileGridItem
                    key={file.id} file={file}
                    isSelected={selectedIds.has(file.id)} isStarred={favorites.has(file.id)} isCopied={copiedFileId === file.id}
                    onSelect={(e) => handleSelectToggle(file.id, e)}
                    onStar={(e) => toggleFavorite(file.id, e)}
                    onPreview={() => setPreviewFile(file)}
                    onCopyLink={(e) => copyLink(file, e)}
                    onDelete={(e) => { e.stopPropagation(); setDeleteTarget(file); }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: '#E2E8F0' }}>
                <div
                  className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: '#F8F9FA', color: '#74788D', borderBottom: '1px solid #E2E8F0' }}
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <button onClick={handleSelectAll}>
                      {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? <CheckboxChecked /> : <CheckboxEmpty />}
                    </button>
                    File Name
                  </div>
                  <span className="col-span-2">Folder</span>
                  <span className="col-span-2">Type</span>
                  <span className="col-span-1">Size</span>
                  <span className="col-span-1">Date</span>
                  <span className="col-span-1 text-right">Actions</span>
                </div>
                <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
                  {paginatedFiles.map((file) => (
                    <StorageFileListRow
                      key={file.id} file={file}
                      isSelected={selectedIds.has(file.id)} isStarred={favorites.has(file.id)} isCopied={copiedFileId === file.id}
                      onSelect={(e) => handleSelectToggle(file.id, e)}
                      onStar={(e) => toggleFavorite(file.id, e)}
                      onPreview={() => setPreviewFile(file)}
                      onCopyLink={(e) => copyLink(file, e)}
                      onDelete={(e) => { e.stopPropagation(); setDeleteTarget(file); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── MOBILE BOTTOM STORAGE QUOTA CARD (< lg) ── */}
            <div className="flex lg:hidden items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#4F46E5] bg-[#EEF2FF] shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-bold text-[#1E1B4B]">Storage Quota</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                      Free Plan
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-bold text-[#1E1B4B] tabular-nums shrink-0">
                      {formatBytes(totalUsedBytes)} used
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-[#EEF2FF] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${!isUnlimited && storageLimitBytes ? Math.min(100, (totalUsedBytes / storageLimitBytes) * 100) : 100}%`,
                          background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)',
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-[#74788D] tabular-nums shrink-0">
                      {isUnlimited ? '∞' : formatBytes(storageLimitBytes ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Pagination ── */}
            {filteredFiles.length > 0 && (
              <div className="flex items-center justify-between pt-1 text-[12px]" style={{ color: '#74788D' }}>
                <span className="font-medium">
                  Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredFiles.length)} to{' '}
                  {Math.min(currentPage * PAGE_SIZE, filteredFiles.length)} of {filteredFiles.length} files
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: '#E2E8F0', backgroundColor: '#fff' }}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                      acc.push(p); return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '…' ? (
                        <span key={`e${idx}`} className="w-8 h-8 flex items-center justify-center">…</span>
                      ) : (
                        <button
                          key={item} onClick={() => setCurrentPage(item as number)}
                          className="w-8 h-8 rounded-lg border text-[12.5px] font-bold transition-colors"
                          style={{
                            backgroundColor: currentPage === item ? '#4F46E5' : '#fff',
                            color: currentPage === item ? '#fff' : '#495057',
                            borderColor: currentPage === item ? '#4F46E5' : '#E2E8F0',
                          }}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: '#E2E8F0', backgroundColor: '#fff' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </motion.div>

      {/* ── Modals ── */}
      <StoragePreviewModal
        file={previewFile} isStarred={previewFile ? favorites.has(previewFile.id) : false}
        isCopied={previewFile ? copiedFileId === previewFile.id : false}
        onClose={() => setPreviewFile(null)}
        onToggleStar={() => { if (previewFile) toggleFavorite(previewFile.id); }}
        onCopyLink={() => { if (previewFile) copyLink(previewFile); }}
        onDeleteTarget={(file) => { setPreviewFile(null); setDeleteTarget(file); }}
      />
      <StorageUploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUpload={handleUploadFile} />
      <ConfirmModal
        open={Boolean(deleteTarget)} title="Delete File"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete File" cancelText="Cancel" destructive={true}
        onConfirm={confirmDeleteSingle} onClose={() => setDeleteTarget(null)}
      />
      <ConfirmModal
        open={batchDeleteOpen} title="Delete Selected Files"
        message={`Delete ${selectedIds.size} files? This cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Files`} cancelText="Cancel" destructive={true}
        onConfirm={confirmBatchDelete} onClose={() => setBatchDeleteOpen(false)}
      />

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white border-r border-[#E2E8F0] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} style={{ color: '#4F46E5' }} />
                <span className="text-[14px] font-bold" style={{ color: '#1E1B4B' }}>File Explorer</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F8F9FA] transition-colors" style={{ color: '#74788D' }}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StorageSidebar
                quickTab={quickTab} selectedType={selectedType} selectedFolder={selectedFolder}
                totalCount={totalCount} starredCount={starredCount} largeFilesCount={largeFilesCount}
                distinctFolders={distinctFolders} summary={summary} effectivePlan={effectivePlan}
                totalUsedBytes={totalUsedBytes} storageLimitBytes={storageLimitBytes} isUnlimited={isUnlimited}
                onQuickTabChange={(t) => { handleQuickTabChange(t); setSidebarOpen(false); }}
                onTypeSelect={(t) => { setQuickTab('all'); setSelectedType(selectedType === t ? 'all' : t); setSelectedFolder('all'); setSidebarOpen(false); }}
                onFolderSelect={(f) => { setQuickTab('all'); setSelectedFolder(selectedFolder === f ? 'all' : f); setSelectedType('all'); setSidebarOpen(false); }}
                onUpgradeClick={() => { setSidebarOpen(false); openUpgrade('storage', 'Upgrade for more storage.'); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoragePage;