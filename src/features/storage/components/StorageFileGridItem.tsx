import React from 'react';
import {
  Star,
  Eye,
  Download,
  Copy,
  Check,
  Trash2,
  Video as VideoIcon,
  Music2,
  MoreVertical,
} from 'lucide-react';
import { formatBytes, FOLDER_LABELS } from '../storageUtils';
import type { StorageFileDTO } from '../api';

interface StorageFileGridItemProps {
  file: StorageFileDTO;
  isSelected: boolean;
  isStarred: boolean;
  isCopied: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onStar: (e: React.MouseEvent) => void;
  onPreview: () => void;
  onCopyLink: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

// Document file SVG illustration (orange stacked papers)
function DocumentIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      {/* Back page */}
      <rect x="18" y="16" width="34" height="44" rx="4" fill="#fed7aa" />
      {/* Front page */}
      <rect x="14" y="12" width="34" height="44" rx="4" fill="#fdba74" />
      {/* Lines */}
      <rect x="20" y="24" width="22" height="2.5" rx="1.25" fill="#fb923c" opacity="0.7" />
      <rect x="20" y="30" width="22" height="2.5" rx="1.25" fill="#fb923c" opacity="0.7" />
      <rect x="20" y="36" width="15" height="2.5" rx="1.25" fill="#fb923c" opacity="0.7" />
    </svg>
  );
}

// Image badge label
function TypeBadge({ fileType }: { fileType: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    image: { label: 'IMAGE', bg: 'bg-[#eef2ff]', text: 'text-[#6366f1]' },
    video: { label: 'VIDEO', bg: 'bg-[#f5f0ff]', text: 'text-[#a855f7]' },
    audio: { label: 'AUDIO', bg: 'bg-[#ecfdf5]', text: 'text-[#10b981]' },
    document: { label: 'DOCUMENT', bg: 'bg-[#fff7ed]', text: 'text-[#f97316]' },
    other: { label: 'FILE', bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]' },
  };
  const c = config[fileType] ?? config.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// Attachments SVG icon
function AttachmentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M11 6.5L6 11.5C4.5 13 2 13 1 11.5S1 8 2.5 6.5L8 1C9 0 10.5 0 11 1s0 2.5-1 3.5L4.5 10C4 10.5 3 10.5 3 9.5s1-1.5 1-1.5"
        stroke="#8e8ea0"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function StorageFileGridItem({
  file,
  isSelected,
  isStarred,
  isCopied,
  onSelect,
  onStar,
  onPreview,
  onCopyLink,
  onDelete,
}: StorageFileGridItemProps) {
  const folderName = FOLDER_LABELS[file.folder] ?? file.folder;
  const isImage = file.fileType === 'image';
  const isVideo = file.fileType === 'video';
  const isAudio = file.fileType === 'audio';
  const isDocument = file.fileType === 'document';

  const date = new Date(file.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer bg-white dark:bg-[#18181b] ${
        isSelected
          ? 'border-[#7c6ff7] ring-2 ring-[#7c6ff7]/20 shadow-md'
          : 'border-[#EBEBF0] dark:border-[#28282e] hover:border-[#c4bcff] hover:shadow-md'
      }`}
      onClick={onPreview}
    >
      {/* ── Thumbnail ── */}
      <div className="relative h-44 w-full overflow-hidden bg-[#f8f8fc] dark:bg-[#111118] flex items-center justify-center">
        {isImage ? (
          <img
            src={file.url}
            alt={file.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : isVideo ? (
          <div className="flex flex-col items-center gap-2 text-[#a855f7]">
            <div className="w-14 h-14 rounded-2xl bg-[#f5f0ff] dark:bg-[#a855f7]/10 flex items-center justify-center">
              <VideoIcon size={28} className="text-[#a855f7]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#a855f7]">Video</span>
          </div>
        ) : isAudio ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-[#ecfdf5] dark:bg-[#10b981]/10 flex items-center justify-center">
              <Music2 size={28} className="text-[#10b981]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981]">Audio</span>
          </div>
        ) : isDocument ? (
          <DocumentIllustration />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="4" width="14" height="18" rx="2" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
                <path d="M14 4l5 5h-5V4z" fill="#94a3b8" opacity="0.4" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">File</span>
          </div>
        )}

        {/* Type badge overlay (top-left) */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <TypeBadge fileType={file.fileType} />
        </div>

        {/* Star button (top-right) */}
        <button
          onClick={onStar}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            isStarred
              ? 'bg-[#fef3c7] text-[#f59e0b] opacity-100 shadow-sm'
              : 'bg-black/25 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/40'
          }`}
          title={isStarred ? 'Remove from starred' : 'Add to starred'}
        >
          <Star size={13} className={isStarred ? 'fill-[#f59e0b]' : ''} />
        </button>

        {/* Hover overlay actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-5">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="p-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 transition-transform hover:scale-110 shadow"
            title="Preview"
          >
            <Eye size={14} />
          </button>
          <a
            href={file.url}
            download={file.name}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 transition-transform hover:scale-110 shadow"
            title="Download"
          >
            <Download size={14} />
          </a>
          <button
            onClick={onCopyLink}
            className="p-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 transition-transform hover:scale-110 shadow"
            title="Copy link"
          >
            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-xl bg-white text-red-600 hover:bg-red-50 transition-transform hover:scale-110 shadow"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── File Info ── */}
      <div className="px-3.5 py-3 flex flex-col gap-1.5">
        {/* File name */}
        <h3
          className="text-[12.5px] font-bold text-[#1a1a2e] dark:text-white leading-snug truncate"
          title={file.name}
          style={{ maxWidth: '100%' }}
        >
          {file.name}
        </h3>

        {/* Size + Date */}
        <div className="flex items-center justify-between text-[11.5px] text-[#8e8ea0] dark:text-[#6060780] font-medium">
          <span className="tabular-nums">{formatBytes(file.sizeBytes)}</span>
          <span>{formattedDate}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#F0F0F8] dark:border-[#222230] pt-2 flex items-center justify-between">
          {/* Attachments label */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8e8ea0] hover:text-[#7c6ff7] transition-colors"
          >
            <AttachmentIcon />
            <span>Attachments</span>
          </button>

          {/* More options */}
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-1 rounded-lg text-[#b0b0c0] hover:text-[#7c6ff7] hover:bg-[#f0eeff] dark:hover:bg-[#2a2550] transition-colors"
            title="More options"
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
