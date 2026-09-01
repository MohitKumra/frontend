import React from 'react';
import { Database, FolderOpen, Image as ImageIcon, FileText, Music2, RefreshCw, Upload, Menu, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../storageUtils';
import type { StorageSummaryDTO } from '../api';

interface StorageHeroProps {
  planName: string;
  totalCount: number;
  totalUsedBytes: number;
  summary?: StorageSummaryDTO;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onUploadClick: () => void;
  onOpenSidebar: () => void;
}

export function StorageHero({
  planName,
  totalCount,
  totalUsedBytes,
  summary,
  isLoading,
  isRefetching,
  onRefresh,
  onUploadClick,
  onOpenSidebar,
}: StorageHeroProps) {
  const imageCount = summary?.byType.image?.count ?? 0;
  const imageBytes = summary?.byType.image?.bytes ?? 0;
  const videoCount = summary?.byType.video?.count ?? 0;
  const videoBytes = summary?.byType.video?.bytes ?? 0;
  const mediaCount = imageCount + videoCount;
  const mediaBytes = imageBytes + videoBytes;

  const docCount = summary?.byType.document?.count ?? 0;
  const docBytes = summary?.byType.document?.bytes ?? 0;

  const audioCount = summary?.byType.audio?.count ?? 0;
  const audioBytes = summary?.byType.audio?.bytes ?? 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 p-4 sm:p-6 shadow-xs transition-all w-full"
      style={{
        background:
          'linear-gradient(135deg, var(--color-surface-raised) 0%, color-mix(in srgb, var(--color-accent) 4%, var(--color-surface-raised)) 100%)',
      }}
    >
      {/* Top row: Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 text-white"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Database size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                Storage & Assets
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                <ShieldCheck size={11} />
                {planName} Plan
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5 font-medium">
              Browse, preview, organize, and manage files across all modules.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow transition-all active:scale-[0.98]"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Upload size={14} />
            Upload File
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary shadow-xs transition-colors"
          >
            <RefreshCw size={13} className={isLoading || isRefetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onOpenSidebar}
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary shadow-xs transition-colors lg:hidden"
          >
            <Menu size={13} />
            <span>Folders</span>
          </button>
        </div>
      </div>

      {/* ─── Metric cards row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 sm:mt-5">
        {/* Total Files */}
        <div
          className="p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Total Stored</span>
            <div className="w-6 h-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <FolderOpen size={13} />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-base sm:text-lg font-extrabold text-text-primary tabular-nums">
              {totalCount} <span className="text-xs font-medium text-text-muted">items</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">{formatBytes(totalUsedBytes)} used</p>
          </div>
        </div>

        {/* Media */}
        <div
          className="p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Images & Media</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ImageIcon size={13} />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-base sm:text-lg font-extrabold text-text-primary tabular-nums">
              {mediaCount} <span className="text-xs font-medium text-text-muted">files</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">{formatBytes(mediaBytes)} space</p>
          </div>
        </div>

        {/* Documents */}
        <div
          className="p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Documents</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FileText size={13} />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-base sm:text-lg font-extrabold text-text-primary tabular-nums">
              {docCount} <span className="text-xs font-medium text-text-muted">docs</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">{formatBytes(docBytes)} space</p>
          </div>
        </div>

        {/* Audio */}
        <div
          className="p-3.5 sm:p-4 rounded-xl border border-border/70 shadow-xs flex flex-col justify-between"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Audio & Voice</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Music2 size={13} />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-base sm:text-lg font-extrabold text-text-primary tabular-nums">
              {audioCount} <span className="text-xs font-medium text-text-muted">tracks</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">{formatBytes(audioBytes)} space</p>
          </div>
        </div>
      </div>
    </div>
  );
}
