import React from 'react';
import { RefreshCw, Upload } from 'lucide-react';
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

// Donut chart SVG for storage used
function StorageDonut({ percent }: { percent: number }) {
  const r = 30;
  const cx = 38;
  const cy = 38;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e9e9f0"
          strokeWidth="7"
        />
        {/* Progress ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#donutGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <defs>
          <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c6ff7" />
            <stop offset="100%" stopColor="#5b4ef5" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-sm font-black text-gray-800 dark:text-white leading-none">{percent}%</span>
        <span className="text-[9px] font-semibold text-gray-400 leading-none mt-0.5">Used</span>
      </div>
    </div>
  );
}

// 3D box icon SVG for the hero
function StorageBoxIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="52" rx="14" fill="url(#boxBg)" />
      {/* Box body */}
      <path d="M26 14L38 20V32L26 38L14 32V20L26 14Z" fill="url(#boxFront)" />
      <path d="M26 14L38 20L26 26L14 20L26 14Z" fill="url(#boxTop)" />
      <path d="M26 26V38L14 32V20L26 26Z" fill="url(#boxSide)" />
      {/* Highlight line on box */}
      <path d="M26 26L38 20" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
      <path d="M26 14L26 26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      <defs>
        <linearGradient id="boxBg" x1="0" y1="0" x2="52" y2="52">
          <stop offset="0%" stopColor="#e8e4ff" />
          <stop offset="100%" stopColor="#d4ccff" />
        </linearGradient>
        <linearGradient id="boxFront" x1="14" y1="20" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b7ef8" />
          <stop offset="100%" stopColor="#6c5ef7" />
        </linearGradient>
        <linearGradient id="boxTop" x1="14" y1="14" x2="38" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b0a5ff" />
          <stop offset="100%" stopColor="#9080ff" />
        </linearGradient>
        <linearGradient id="boxSide" x1="14" y1="20" x2="26" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5c4ef0" />
          <stop offset="100%" stopColor="#4a3dd8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Images & Media SVG icon
function ImagesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#EEF2FF" />
      <rect x="6" y="8" width="16" height="12" rx="2" stroke="#6366f1" strokeWidth="1.5" fill="none" />
      <path d="M6 16l4-4 3 3 2-2 5 5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="10.5" cy="12.5" r="1.5" fill="#6366f1" />
    </svg>
  );
}

// Documents SVG icon
function DocumentsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#FFF7ED" />
      <rect x="8" y="6" width="12" height="16" rx="2" fill="#FB923C" opacity="0.2" />
      <rect x="8" y="6" width="12" height="16" rx="2" stroke="#FB923C" strokeWidth="1.5" fill="none" />
      <line x1="11" y1="11" x2="17" y2="11" stroke="#FB923C" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="14" x2="17" y2="14" stroke="#FB923C" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="17" x2="15" y2="17" stroke="#FB923C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Audio & Voice SVG icon
function AudioIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#ECFDF5" />
      <rect x="7" y="13" width="2" height="4" rx="1" fill="#10B981" />
      <rect x="11" y="10" width="2" height="10" rx="1" fill="#10B981" />
      <rect x="15" y="12" width="2" height="6" rx="1" fill="#10B981" />
      <rect x="19" y="14" width="2" height="2" rx="1" fill="#10B981" />
    </svg>
  );
}

// Keep your files icon (3D box with lock/sparkle)
function KeepFilesIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Main box */}
      <path d="M28 16L42 23V37L28 44L14 37V23L28 16Z" fill="url(#kf1)" />
      <path d="M28 16L42 23L28 30L14 23L28 16Z" fill="url(#kf2)" />
      <path d="M28 30V44L14 37V23L28 30Z" fill="url(#kf3)" />
      {/* Small box on top-right */}
      <path d="M40 10L48 14V22L40 26L32 22V14L40 10Z" fill="url(#kf4)" />
      <path d="M40 10L48 14L40 18L32 14L40 10Z" fill="url(#kf5)" />
      <defs>
        <linearGradient id="kf1" x1="14" y1="23" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9488f8" />
          <stop offset="1" stopColor="#7b6ef6" />
        </linearGradient>
        <linearGradient id="kf2" x1="14" y1="16" x2="42" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4bcff" />
          <stop offset="1" stopColor="#a99eff" />
        </linearGradient>
        <linearGradient id="kf3" x1="14" y1="23" x2="28" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5d50e8" />
          <stop offset="1" stopColor="#4a3dd0" />
        </linearGradient>
        <linearGradient id="kf4" x1="32" y1="14" x2="48" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4bcff" />
          <stop offset="1" stopColor="#a99eff" />
        </linearGradient>
        <linearGradient id="kf5" x1="32" y1="10" x2="48" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ddd8ff" />
          <stop offset="1" stopColor="#c4bcff" />
        </linearGradient>
      </defs>
    </svg>
  );
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
}: StorageHeroProps) {
  const imageCount = summary?.byType.image?.count ?? 0;
  const videoCount = summary?.byType.video?.count ?? 0;
  const mediaCount = imageCount + videoCount;
  const mediaBytes = (summary?.byType.image?.bytes ?? 0) + (summary?.byType.video?.bytes ?? 0);

  const docCount = summary?.byType.document?.count ?? 0;
  const docBytes = summary?.byType.document?.bytes ?? 0;

  const audioCount = summary?.byType.audio?.count ?? 0;
  const audioBytes = summary?.byType.audio?.bytes ?? 0;

  const storageLimitBytes = summary?.storageLimitBytes ?? 1024 * 1024; // default 1MB
  const usedPercent =
    storageLimitBytes > 0 ? Math.min(100, Math.round((totalUsedBytes / storageLimitBytes) * 100)) : 0;

  return (
    <div className="w-full bg-white dark:bg-[#18181b] rounded-none sm:rounded-2xl border-0 sm:border border-[#EBEBF0] dark:border-[#28282e]">
      {/* ── Top Header Row ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F5] dark:border-[#28282e]">
        <div className="flex items-center gap-3">
          <StorageBoxIcon />
          <div>
            <h1 className="text-[22px] font-black text-[#1a1a2e] dark:text-white tracking-tight leading-tight">
              Storage &amp; Assets
            </h1>
            <p className="text-[13px] text-[#8e8ea0] dark:text-[#6b6b80] font-medium mt-0.5">
              Manage, organize and access all your files in one place.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c6ff7 0%, #5b4ef5 100%)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload File
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E2E2EE] dark:border-[#2e2e38] bg-white dark:bg-[#1e1e26] hover:bg-[#f8f8fc] text-[13px] font-semibold text-[#666680] dark:text-[#8e8ea8] shadow-xs transition-colors"
          >
            <RefreshCw size={14} className={isLoading || isRefetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#F0F0F5] dark:divide-[#28282e]">
        {/* Total Storage Used — donut */}
        <div className="flex items-center gap-4 px-5 py-4 lg:col-span-1">
          <StorageDonut percent={usedPercent} />
          <div>
            <p className="text-[11px] font-semibold text-[#8e8ea0] dark:text-[#6b6b80] uppercase tracking-wide mb-1">
              Total Storage Used
            </p>
            <p className="text-[20px] font-black text-[#1a1a2e] dark:text-white leading-tight tabular-nums">
              {formatBytes(totalUsedBytes)}
            </p>
            <p className="text-[11px] text-[#b0b0c0] dark:text-[#555568] font-medium mt-0.5">
              of {formatBytes(storageLimitBytes)}
            </p>
            {/* Thin progress bar */}
            <div className="mt-2 h-1.5 w-28 rounded-full bg-[#ebebf5] dark:bg-[#28282e] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usedPercent}%`,
                  background: 'linear-gradient(90deg, #7c6ff7, #5b4ef5)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Images & Media */}
        <div className="flex items-start gap-3 px-5 py-4 lg:col-span-1">
          <div className="mt-0.5 shrink-0">
            <ImagesIcon />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1a1a2e] dark:text-white">Images &amp; Media</p>
            <p className="text-[24px] font-black text-[#1a1a2e] dark:text-white leading-tight tabular-nums mt-0.5">
              {mediaCount} <span className="text-[13px] font-semibold text-[#8e8ea0]">files</span>
            </p>
            <p className="text-[12px] text-[#b0b0c0] dark:text-[#555568] font-medium mt-1">
              {formatBytes(mediaBytes)}
            </p>
          </div>
        </div>

        {/* Documents */}
        <div className="flex items-start gap-3 px-5 py-4 lg:col-span-1">
          <div className="mt-0.5 shrink-0">
            <DocumentsIcon />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1a1a2e] dark:text-white">Documents</p>
            <p className="text-[24px] font-black text-[#1a1a2e] dark:text-white leading-tight tabular-nums mt-0.5">
              {docCount} <span className="text-[13px] font-semibold text-[#8e8ea0]">docs</span>
            </p>
            <p className="text-[12px] text-[#b0b0c0] dark:text-[#555568] font-medium mt-1">
              {formatBytes(docBytes)}
            </p>
          </div>
        </div>

        {/* Audio & Voice */}
        <div className="flex items-start gap-3 px-5 py-4 lg:col-span-1">
          <div className="mt-0.5 shrink-0">
            <AudioIcon />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1a1a2e] dark:text-white">Audio &amp; Voice</p>
            <p className="text-[24px] font-black text-[#1a1a2e] dark:text-white leading-tight tabular-nums mt-0.5">
              {audioCount} <span className="text-[13px] font-semibold text-[#8e8ea0]">tracks</span>
            </p>
            <p className="text-[12px] text-[#b0b0c0] dark:text-[#555568] font-medium mt-1">
              {formatBytes(audioBytes)}
            </p>
          </div>
        </div>

        {/* Keep your files promo card */}
        <div className="flex items-center gap-3 px-5 py-4 bg-[#f7f5ff] dark:bg-[#1e1c30] lg:col-span-1 lg:rounded-none sm:rounded-br-2xl rounded-br-2xl">
          <div className="shrink-0">
            <KeepFilesIcon />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#1a1a2e] dark:text-white leading-snug">
              Keep your files<br />organized &amp; safe
            </p>
            <p className="text-[11px] text-[#8e8ea0] dark:text-[#6b6b80] font-medium mt-1">
              All your assets in one secure place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
