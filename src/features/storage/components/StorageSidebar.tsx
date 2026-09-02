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

/* ── SVG icons — DO NOT MODIFY ─────────────────────────────────────────────── */
function AllFilesIcon({ active }: { active?: boolean }) {
  const c = active ? '#4F46E5' : '#74788D';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill={c} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill={c} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill={c} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill={c} />
    </svg>
  );
}
function StarIcon({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2l1.6 3.3 3.6.52-2.6 2.53.61 3.57L8 10.1l-3.21 1.82.61-3.57L2.8 5.82l3.6-.52L8 2z"
        fill={active ? '#F59E0B' : 'none'} stroke={active ? '#F59E0B' : '#74788D'} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function ZapIcon({ active }: { active?: boolean }) {
  const c = active ? '#8B5CF6' : '#74788D';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M9 2L3 9h5l-1 5 7-7H9l1-5z" fill={active ? '#8B5CF6' : 'none'} stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon({ active }: { active?: boolean }) {
  const c = active ? '#4F46E5' : '#74788D';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={c} strokeWidth="1.3" fill="none" />
      <path d="M8 5v3.5l2.5 1.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function FolderColorIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 4.5C1.5 3.67 2.17 3 3 3h3l1.5 1.5H13c.83 0 1.5.67 1.5 1.5V11c0 .83-.67 1.5-1.5 1.5H3C2.17 12.5 1.5 11.83 1.5 11V4.5z"
        fill={color} opacity="0.2" />
      <path d="M1.5 4.5C1.5 3.67 2.17 3 3 3h3l1.5 1.5H13c.83 0 1.5.67 1.5 1.5V11c0 .83-.67 1.5-1.5 1.5H3C2.17 12.5 1.5 11.83 1.5 11V4.5z"
        stroke={color} strokeWidth="1.3" fill="none" />
    </svg>
  );
}
function HardDriveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="4" width="12" height="7" rx="2" stroke="#4F46E5" strokeWidth="1.3" fill="none" />
      <circle cx="10.5" cy="7.5" r="1" fill="#4F46E5" />
      <path d="M1 6.5h12" stroke="#4F46E5" strokeWidth="1" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="#4F46E5" />
    </svg>
  );
}

const TYPE_ICON_BG: Record<string, string> = {
  image: '#EFF6FF', video: '#F5F0FF', audio: '#ECFDF5', document: '#FEF3C7', other: '#F1F5F9',
};
function TypeIcon({ t }: { t: string }) {
  const icons: Record<string, React.ReactNode> = {
    image: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="3" width="12" height="9" rx="2" stroke="#3B82F6" strokeWidth="1.2" fill="none" />
        <path d="M1 9l3-3 3 3 2-2 4 4" stroke="#3B82F6" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="5" cy="6.5" r="1" fill="#3B82F6" />
      </svg>
    ),
    video: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="3" width="8" height="8" rx="2" stroke="#8B5CF6" strokeWidth="1.2" fill="none" />
        <path d="M9 6l4-1.5V9.5L9 8V6z" stroke="#8B5CF6" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
      </svg>
    ),
    audio: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="9" width="2" height="4" rx="1" fill="#10B981" />
        <rect x="6" y="6" width="2" height="7" rx="1" fill="#10B981" />
        <rect x="10" y="7.5" width="2" height="5.5" rx="1" fill="#10B981" />
      </svg>
    ),
    document: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="3" y="1" width="8" height="12" rx="2" stroke="#F59E0B" strokeWidth="1.2" fill="none" />
        <line x1="5" y1="5" x2="9" y2="5" stroke="#F59E0B" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="5" y1="7.5" x2="9" y2="7.5" stroke="#F59E0B" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="5" y1="10" x2="7.5" y2="10" stroke="#F59E0B" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
    other: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="1" width="8" height="12" rx="2" stroke="#64748B" strokeWidth="1.2" fill="none" />
        <path d="M8 1l4 4h-4V1z" fill="#64748B" opacity="0.3" />
      </svg>
    ),
  };
  return <>{icons[t] ?? icons.other}</>;
}
/* ── END SVG ────────────────────────────────────────────────────────────────── */

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
  const isFreePlan = !effectivePlan.planName.toLowerCase().includes('pro') &&
    !effectivePlan.planName.toLowerCase().includes('premium');

  const allActive = quickTab === 'all' && selectedFolder === 'all' && selectedType === 'all';
  const starActive = quickTab === 'starred';
  const largeActive = quickTab === 'large';

  const limitBytes = storageLimitBytes ?? 1048576;
  const barPct = !isUnlimited && limitBytes > 0 ? Math.min(100, (totalUsedBytes / limitBytes) * 100) : 100;

  // ── Reusable nav item ──
  const NavItem = ({
    label, count, active, icon, onClick,
  }: { label: string; count: number; active: boolean; icon: React.ReactNode; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors"
      style={{
        backgroundColor: active ? '#EEF2FF' : 'transparent',
        color: active ? '#4F46E5' : '#495057',
        fontWeight: active ? 600 : 500,
      }}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span
        className="text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
        style={{
          backgroundColor: active ? '#4F46E5' : '#F1F5F9',
          color: active ? '#fff' : '#74788D',
        }}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-3">

      {/* ── Quick Access card ── */}
      <div className="rounded-2xl border p-3" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
        <p className="px-2 text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#74788D' }}>
          Quick Access
        </p>
        <div className="flex flex-col gap-0.5">
          <NavItem label="All Files"          count={totalCount}     active={allActive}  icon={<AllFilesIcon active={allActive} />}  onClick={() => onQuickTabChange('all')} />
          <NavItem label="Starred"            count={starredCount}   active={starActive}  icon={<StarIcon active={starActive} />}       onClick={() => onQuickTabChange('starred')} />
          <NavItem label="Large Files (>1MB)" count={largeFilesCount} active={largeActive} icon={<ZapIcon active={largeActive} />}      onClick={() => onQuickTabChange('large')} />
          <NavItem label="Recent"             count={totalCount}     active={false}       icon={<ClockIcon />}                          onClick={() => onQuickTabChange('all')} />
        </div>
      </div>

      {/* ── Categories card ── */}
      <div className="rounded-2xl border p-3" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
        <p className="px-2 text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#74788D' }}>
          Categories
        </p>
        <div className="flex flex-col gap-0.5">
          {TYPE_ORDER.map((key) => {
            const cfg = TYPE_CONFIG[key];
            const ts = summary?.byType[key] ?? { count: 0, bytes: 0 };
            const isActive = selectedType === key && selectedFolder === 'all' && quickTab !== 'starred' && quickTab !== 'large';
            return (
              <button
                key={key}
                onClick={() => onTypeSelect(key)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors"
                style={{
                  backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                  color: isActive ? '#4F46E5' : '#495057',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <span
                  className="w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: TYPE_ICON_BG[key] }}
                >
                  <TypeIcon t={key} />
                </span>
                <span className="flex-1 text-left truncate">{cfg.label}</span>
                <span className="text-[11px] tabular-nums mr-1 shrink-0" style={{ color: '#74788D' }}>
                  {formatBytes(ts.bytes)}
                </span>
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                  style={{
                    backgroundColor: isActive ? '#4F46E5' : '#F1F5F9',
                    color: isActive ? '#fff' : '#74788D',
                  }}
                >
                  {ts.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Folders card (if any) ── */}
      {distinctFolders.length > 0 && (
        <div className="rounded-2xl border p-3" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#74788D' }}>
            Folders
          </p>
          <div className="flex flex-col gap-0.5">
            {distinctFolders.map((folder) => {
              const isActive = selectedFolder === folder && quickTab !== 'starred' && quickTab !== 'large';
              const fs = summary?.byFolder[folder] ?? { count: 0, bytes: 0 };
              const label = FOLDER_LABELS[folder] ?? folder;
              const color = FOLDER_COLORS[folder] ?? '#4F46E5';
              return (
                <button
                  key={folder}
                  onClick={() => onFolderSelect(folder)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors"
                  style={{
                    backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                    color: isActive ? '#4F46E5' : '#495057',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <FolderColorIcon color={color} />
                  <span className="flex-1 text-left truncate">{label}</span>
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                    style={{ backgroundColor: '#F1F5F9', color: '#74788D' }}
                  >
                    {fs.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Storage Quota card ── */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <HardDriveIcon />
            <span className="text-[13px] font-bold" style={{ color: '#1E1B4B' }}>Storage Quota</span>
          </div>
          {isFreePlan && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}
            >
              Free Plan
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[12px] mb-1.5">
          <span className="font-semibold tabular-nums" style={{ color: '#1E1B4B' }}>
            {formatBytes(totalUsedBytes)} used
          </span>
          <span style={{ color: '#74788D' }}>
            {isUnlimited ? '∞ Unlimited' : formatBytes(storageLimitBytes ?? 0)}
          </span>
        </div>

        <div className="h-[6px] w-full rounded-full overflow-hidden" style={{ backgroundColor: '#EEF2FF' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${barPct}%`,
              background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)',
            }}
          />
        </div>

        {!isUnlimited && (
          <button
            onClick={onUpgradeClick}
            className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold border transition-all hover:bg-[#EEF2FF] active:scale-[0.98]"
            style={{ borderColor: '#4F46E5', color: '#4F46E5', backgroundColor: '#fff' }}
          >
            <SparkleIcon />
            Upgrade Storage
          </button>
        )}
      </div>
    </div>
  );
}
