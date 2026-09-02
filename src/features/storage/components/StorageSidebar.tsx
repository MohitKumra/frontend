import React from 'react';
import { formatBytes, TYPE_ORDER, TYPE_CONFIG, FOLDER_LABELS, FOLDER_COLORS } from '../storageUtils';
import type { StorageFileType, StorageQuickTab, StorageSummaryDTO } from '../api';

interface StorageSidebarProps {
  quickTab: StorageQuickTab;
  selectedType: StorageFileType | 'all';
  selectedFolder: string;
  totalCount: number;
  starredCount: number;
  largeFilesCount: number;
  recentCount?: number;
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

// All Files icon
function AllFilesIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.2" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="9" y="2" width="5" height="5" rx="1.2" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="2" y="9" width="5" height="5" rx="1.2" fill={active ? '#7c6ff7' : '#a0a0b8'} />
      <rect x="9" y="9" width="5" height="5" rx="1.2" fill={active ? '#7c6ff7' : '#a0a0b8'} />
    </svg>
  );
}

// Star icon
function StarIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2l1.545 3.13 3.455.5-2.5 2.435.59 3.435L8 9.75l-3.09 1.75.59-3.435L3 5.63l3.455-.5L8 2z"
        fill={active ? '#f59e0b' : 'none'}
        stroke={active ? '#f59e0b' : '#a0a0b8'}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Zap / large files icon
function ZapIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M9 2L3 9h5l-1 5 7-7H9l1-5z"
        fill={active ? '#a855f7' : 'none'}
        stroke={active ? '#a855f7' : '#a0a0b8'}
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Recent icon
function RecentIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke={active ? '#7c6ff7' : '#a0a0b8'} strokeWidth="1.3" fill="none" />
      <path d="M8 5v3.5l2 1.5" stroke={active ? '#7c6ff7' : '#a0a0b8'} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// Images sidebar icon
function SidebarImagesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="#6366f1" strokeWidth="1.3" fill="none" />
      <path d="M2 10l3-3 2.5 2.5 2-2 4.5 4.5" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="7" r="1" fill="#6366f1" />
    </svg>
  );
}

// Videos sidebar icon
function SidebarVideosIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="9" height="8" rx="1.5" stroke="#a855f7" strokeWidth="1.3" fill="none" />
      <path d="M11 7l3-1.5v5L11 9V7z" stroke="#a855f7" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// Documents sidebar icon
function SidebarDocsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="#f59e0b" strokeWidth="1.3" fill="none" />
      <line x1="5.5" y1="6" x2="10.5" y2="6" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="8.5" x2="10.5" y2="8.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="11" x2="8.5" y2="11" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// Audio sidebar icon
function SidebarAudioIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="8" width="2" height="5" rx="1" fill="#10b981" />
      <rect x="7" y="5" width="2" height="8" rx="1" fill="#10b981" />
      <rect x="11" y="7" width="2" height="4" rx="1" fill="#10b981" />
    </svg>
  );
}

// Other files sidebar icon
function SidebarOtherIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="8" height="10" rx="1.5" stroke="#94a3b8" strokeWidth="1.3" fill="none" />
      <path d="M8 2l3 3H8V2z" fill="#94a3b8" opacity="0.5" />
      <circle cx="11" cy="11" r="3" fill="#94a3b8" opacity="0.3" stroke="#94a3b8" strokeWidth="1.2" />
      <path d="M10 11h2M11 10v2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// Storage HDD icon
function StorageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="4" width="12" height="7" rx="2" stroke="#7c6ff7" strokeWidth="1.3" fill="none" />
      <circle cx="10.5" cy="7.5" r="1" fill="#7c6ff7" />
      <path d="M1 6.5h12" stroke="#7c6ff7" strokeWidth="1" />
    </svg>
  );
}

// Sparkles icon
function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l.9 2.6L9.5 5l-2.6.9L6 8.5l-.9-2.6L2.5 5l2.6-.9L6 1z" fill="white" />
      <path d="M10 1v2M11 2H9" stroke="white" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

const SIDEBAR_TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <SidebarImagesIcon />,
  video: <SidebarVideosIcon />,
  audio: <SidebarAudioIcon />,
  document: <SidebarDocsIcon />,
  other: <SidebarOtherIcon />,
};

const SIDEBAR_TYPE_BG: Record<string, string> = {
  image: 'bg-[#eef2ff]',
  video: 'bg-[#f5f0ff]',
  audio: 'bg-[#ecfdf5]',
  document: 'bg-[#fff7ed]',
  other: 'bg-[#f1f5f9]',
};

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
  const isFreePlan = effectivePlan.planName.toLowerCase().includes('free');

  const allFilesActive = quickTab === 'all' && selectedFolder === 'all' && selectedType === 'all';
  const starredActive = quickTab === 'starred';
  const largeActive = quickTab === 'large';

  // Approximate "recent" as all files (since we don't have a dedicated tab for it in the original)
  const recentActive = false;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Quick Access ── */}
      <div className="rounded-2xl border border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] p-3">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#8e8ea0] dark:text-[#5a5a70] mb-2">
          Quick Access
        </p>
        <div className="flex flex-col gap-0.5">
          {/* All Files */}
          <button
            onClick={() => onQuickTabChange('all')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              allFilesActive
                ? 'bg-[#f0eeff] dark:bg-[#2a2550] text-[#7c6ff7] font-bold'
                : 'text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] dark:hover:bg-[#1e1e26]'
            }`}
          >
            <AllFilesIcon active={allFilesActive} />
            <span className="flex-1 text-left">All Files</span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
              allFilesActive
                ? 'bg-[#7c6ff7] text-white'
                : 'bg-[#f0f0f8] dark:bg-[#222230] text-[#8e8ea0]'
            }`}>
              {totalCount}
            </span>
          </button>

          {/* Starred */}
          <button
            onClick={() => onQuickTabChange('starred')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              starredActive
                ? 'bg-[#fffbeb] dark:bg-[#2a2518] text-[#f59e0b] font-bold'
                : 'text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] dark:hover:bg-[#1e1e26]'
            }`}
          >
            <StarIcon active={starredActive} />
            <span className="flex-1 text-left">Starred</span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
              starredActive
                ? 'bg-[#f59e0b] text-white'
                : 'bg-[#f0f0f8] dark:bg-[#222230] text-[#8e8ea0]'
            }`}>
              {starredCount}
            </span>
          </button>

          {/* Large Files */}
          <button
            onClick={() => onQuickTabChange('large')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              largeActive
                ? 'bg-[#f5f0ff] dark:bg-[#22183a] text-[#a855f7] font-bold'
                : 'text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] dark:hover:bg-[#1e1e26]'
            }`}
          >
            <ZapIcon active={largeActive} />
            <span className="flex-1 text-left">Large Files (&gt;1MB)</span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
              largeActive
                ? 'bg-[#a855f7] text-white'
                : 'bg-[#f0f0f8] dark:bg-[#222230] text-[#8e8ea0]'
            }`}>
              {largeFilesCount}
            </span>
          </button>

          {/* Recent */}
          <button
            onClick={() => onQuickTabChange('all')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              recentActive
                ? 'bg-[#f0eeff] dark:bg-[#2a2550] text-[#7c6ff7] font-bold'
                : 'text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] dark:hover:bg-[#1e1e26]'
            }`}
          >
            <RecentIcon active={recentActive} />
            <span className="flex-1 text-left">Recent</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums bg-[#f0f0f8] dark:bg-[#222230] text-[#8e8ea0]">
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="rounded-2xl border border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] p-3">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#8e8ea0] dark:text-[#5a5a70] mb-2">
          Categories
        </p>
        <div className="flex flex-col gap-0.5">
          {TYPE_ORDER.map((typeKey) => {
            const config = TYPE_CONFIG[typeKey];
            const isSelected =
              selectedType === typeKey && selectedFolder === 'all' && quickTab !== 'starred' && quickTab !== 'large';
            const ts = summary?.byType[typeKey] ?? { count: 0, bytes: 0 };
            return (
              <button
                key={typeKey}
                onClick={() => onTypeSelect(typeKey)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#f0eeff] dark:bg-[#2a2550] text-[#7c6ff7] font-bold'
                    : 'text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] dark:hover:bg-[#1e1e26]'
                }`}
              >
                <span className={`w-[22px] h-[22px] rounded-lg flex items-center justify-center shrink-0 ${SIDEBAR_TYPE_BG[typeKey]}`}>
                  {SIDEBAR_TYPE_ICONS[typeKey]}
                </span>
                <span className="flex-1 text-left truncate">{config.label}</span>
                <div className="flex items-center gap-1.5 text-[#b0b0c0] dark:text-[#555568] text-[11px]">
                  <span className="tabular-nums font-semibold">{formatBytes(ts.bytes)}</span>
                  <span className="font-bold px-1.5 py-0.5 rounded-full bg-[#f0f0f8] dark:bg-[#222230] text-[#8e8ea0] min-w-[18px] text-center">
                    {ts.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Folders (if any) ── */}
      {distinctFolders.length > 0 && (
        <div className="rounded-2xl border border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] p-3">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#8e8ea0] dark:text-[#5a5a70] mb-2">
            Folders
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
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#f0eeff] dark:bg-[#2a2550] text-[#7c6ff7] font-bold'
                      : 'text-[#444460] dark:text-[#8888a0] hover:bg-[#f8f8fc] dark:hover:bg-[#1e1e26]'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color }} className="shrink-0">
                    <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5l1.5 1.5H11.5C12.33 3.5 13 4.17 13 5v5.5C13 11.33 12.33 12 11.5 12h-9C1.67 12 1 11.33 1 10.5V3.5z" fill={color} opacity="0.2" />
                    <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5l1.5 1.5H11.5C12.33 3.5 13 4.17 13 5v5.5C13 11.33 12.33 12 11.5 12h-9C1.67 12 1 11.33 1 10.5V3.5z" stroke={color} strokeWidth="1.2" fill="none" />
                  </svg>
                  <span className="flex-1 text-left truncate">{label}</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#f0f0f8] dark:bg-[#222230] text-[#8e8ea0] tabular-nums">
                    {fs.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Storage Quota ── */}
      <div className="rounded-2xl border border-[#EBEBF0] dark:border-[#28282e] bg-white dark:bg-[#18181b] p-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <StorageIcon />
            <span className="text-[13px] font-bold text-[#1a1a2e] dark:text-white">Storage Quota</span>
          </div>
          {isFreePlan && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0eeff] dark:bg-[#2a2550] text-[#7c6ff7] border border-[#d4ccff] dark:border-[#3d3580]">
              Free Plan
            </span>
          )}
        </div>

        {/* Used amount */}
        <div className="flex items-center justify-between text-[12px] mb-1.5">
          <span className="font-bold text-[#1a1a2e] dark:text-white tabular-nums">{formatBytes(totalUsedBytes)} used</span>
          <span className="text-[#8e8ea0] font-medium">
            {isUnlimited ? '∞ Unlimited' : formatBytes(storageLimitBytes || 0)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-[#f0f0f8] dark:bg-[#28282e] overflow-hidden">
          {isUnlimited ? (
            <div className="h-full w-full rounded-full" style={{ background: 'linear-gradient(90deg, #7c6ff7, #5b4ef5)' }} />
          ) : (
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((totalUsedBytes / (storageLimitBytes || 1)) * 100))}%`,
                background: 'linear-gradient(90deg, #7c6ff7, #5b4ef5)',
              }}
            />
          )}
        </div>

        {!isUnlimited && (
          <button
            onClick={onUpgradeClick}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] border border-[#d4ccff] dark:border-[#3d3580]"
            style={{ background: 'linear-gradient(135deg, #7c6ff7 0%, #5b4ef5 100%)' }}
          >
            <SparklesIcon />
            Upgrade Storage
          </button>
        )}
      </div>
    </div>
  );
}
