import React from 'react';
import { FolderOpen, Star, Zap, Folder, HardDrive, Sparkles } from 'lucide-react';
import { formatBytes, TYPE_ORDER, TYPE_CONFIG, FOLDER_LABELS, FOLDER_COLORS } from '../storageUtils';
import type { StorageFileType, StorageQuickTab, StorageSummaryDTO } from '../api';

interface StorageSidebarProps {
  quickTab: StorageQuickTab;
  selectedType: StorageFileType | 'all';
  selectedFolder: string;
  totalCount: number;
  starredCount: number;
  largeFilesCount: number;
  distinctFolders: string[];
  summary?: StorageSummaryDTO;
  effectivePlan: { planName: string };
  totalUsedBytes: number;
  storageLimitBytes: number | null;
  isUnlimited: boolean;
  onQuickTabChange: (tab: StorageQuickTab) => void;
  onTypeSelect: (type: StorageFileType) => void;
  onFolderSelect: (folder: string) => void;
  onUpgradeClick: () => void;
}

export function StorageSidebar({
  quickTab,
  selectedType,
  selectedFolder,
  totalCount,
  starredCount,
  largeFilesCount,
  distinctFolders,
  summary,
  effectivePlan,
  totalUsedBytes,
  storageLimitBytes,
  isUnlimited,
  onQuickTabChange,
  onTypeSelect,
  onFolderSelect,
  onUpgradeClick,
}: StorageSidebarProps) {
  const imageBytes = summary?.byType.image?.bytes ?? 0;
  const videoBytes = summary?.byType.video?.bytes ?? 0;
  const docBytes = summary?.byType.document?.bytes ?? 0;
  const audioBytes = summary?.byType.audio?.bytes ?? 0;
  const otherBytes = summary?.byType.other?.bytes ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Navigation Card */}
      <div
        className="rounded-2xl border border-border/80 p-3 shadow-xs"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
          Quick Access
        </p>

        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onQuickTabChange('all')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              quickTab === 'all' && selectedFolder === 'all' && selectedType === 'all'
                ? 'bg-accent/10 text-accent font-bold shadow-xs'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            <FolderOpen size={15} className="shrink-0" />
            <span>All Files</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface border border-border/50 text-text-muted tabular-nums">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => onQuickTabChange('starred')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              quickTab === 'starred'
                ? 'bg-accent/10 text-accent font-bold shadow-xs'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            <Star size={15} className="shrink-0 text-amber-500 fill-amber-500/20" />
            <span>Starred</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface border border-border/50 text-text-muted tabular-nums">
              {starredCount}
            </span>
          </button>

          <button
            onClick={() => onQuickTabChange('large')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              quickTab === 'large'
                ? 'bg-accent/10 text-accent font-bold shadow-xs'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            <Zap size={15} className="shrink-0 text-purple-500" />
            <span>Large Files (&gt;1 MB)</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface border border-border/50 text-text-muted tabular-nums">
              {largeFilesCount}
            </span>
          </button>
        </div>
      </div>

      {/* Categories Card */}
      <div
        className="rounded-2xl border border-border/80 p-3 shadow-xs"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
          Categories
        </p>

        <div className="flex flex-col gap-0.5">
          {TYPE_ORDER.map((typeKey) => {
            const config = TYPE_CONFIG[typeKey];
            const Icon = config.icon;
            const isSelected =
              selectedType === typeKey && selectedFolder === 'all' && quickTab !== 'starred' && quickTab !== 'large';
            const ts = summary?.byType[typeKey] ?? { count: 0, bytes: 0 };
            return (
              <button
                key={typeKey}
                onClick={() => onTypeSelect(typeKey)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-accent/10 text-accent font-bold shadow-xs'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${config.bg}`}>
                  <Icon size={12} />
                </span>
                <span className="truncate">{config.label}</span>
                <div className="ml-auto flex items-center gap-1.5 text-text-muted text-[10px]">
                  <span className="tabular-nums font-semibold">{formatBytes(ts.bytes)}</span>
                  <span className="font-bold px-1.5 py-0.2 rounded-full bg-surface border border-border/40">
                    {ts.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Folders & Modules Card */}
      {distinctFolders.length > 0 && (
        <div
          className="rounded-2xl border border-border/80 p-3 shadow-xs"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
            Folders & Modules
          </p>

          <div className="flex flex-col gap-0.5">
            {distinctFolders.map((folder) => {
              const isSelected = selectedFolder === folder && quickTab !== 'starred' && quickTab !== 'large';
              const fs = summary?.byFolder[folder] ?? { count: 0, bytes: 0 };
              const label = FOLDER_LABELS[folder] ?? folder;
              const color = FOLDER_COLORS[folder] ?? '#6c63ff';

              return (
                <button
                  key={folder}
                  onClick={() => onFolderSelect(folder)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-accent/10 text-accent font-bold shadow-xs'
                      : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                  }`}
                >
                  <Folder size={14} className="shrink-0" style={{ color }} />
                  <span className="truncate">{label}</span>
                  <div className="ml-auto flex items-center gap-1 text-text-muted text-[10px]">
                    <span className="font-bold px-1.5 py-0.2 rounded-full bg-surface border border-border/40">
                      {fs.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Storage Quota Card */}
      <div
        className="rounded-2xl border border-border/80 p-3.5 shadow-xs"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-bold text-text-primary">Storage Quota</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
            {effectivePlan.planName}
          </span>
        </div>

        {/* Multi-segment Storage Bar */}
        <div className="mt-3 h-2 w-full rounded-full bg-surface border border-border/60 overflow-hidden flex">
          {isUnlimited ? (
            <div className="h-full w-full bg-accent opacity-80" />
          ) : totalUsedBytes > 0 ? (
            <>
              <div
                style={{ width: `${(imageBytes / (storageLimitBytes || 1)) * 100}%` }}
                className="h-full bg-blue-500"
                title={`Images: ${formatBytes(imageBytes)}`}
              />
              <div
                style={{ width: `${(videoBytes / (storageLimitBytes || 1)) * 100}%` }}
                className="h-full bg-purple-500"
                title={`Videos: ${formatBytes(videoBytes)}`}
              />
              <div
                style={{ width: `${(docBytes / (storageLimitBytes || 1)) * 100}%` }}
                className="h-full bg-amber-500"
                title={`Documents: ${formatBytes(docBytes)}`}
              />
              <div
                style={{ width: `${(audioBytes / (storageLimitBytes || 1)) * 100}%` }}
                className="h-full bg-emerald-500"
                title={`Audio: ${formatBytes(audioBytes)}`}
              />
              <div
                style={{ width: `${(otherBytes / (storageLimitBytes || 1)) * 100}%` }}
                className="h-full bg-slate-400"
                title={`Other: ${formatBytes(otherBytes)}`}
              />
            </>
          ) : (
            <div className="h-full w-0" />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
          <span>
            <strong className="text-text-primary font-semibold">{formatBytes(totalUsedBytes)}</strong> used
          </span>
          <span>
            {isUnlimited ? (
              <span className="text-accent font-semibold">∞ Unlimited</span>
            ) : (
              formatBytes(storageLimitBytes || 0)
            )}
          </span>
        </div>

        {!isUnlimited && (
          <button
            onClick={onUpgradeClick}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Sparkles size={12} />
            Upgrade Storage
          </button>
        )}
      </div>
    </div>
  );
}
