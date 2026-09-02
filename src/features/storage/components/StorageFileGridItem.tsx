import React, { useState } from 'react';
import {
  Star, Eye, Download, Copy, Check, Trash2,
  Video as VideoIcon, Music2, MoreVertical,
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

/* ── Type badge colours ──────────────────────────────────────────────────── */
const BADGE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  image:    { bg: '#EFF6FF', text: '#3B82F6', label: 'IMAGE' },
  video:    { bg: '#F5F0FF', text: '#8B5CF6', label: 'VIDEO' },
  audio:    { bg: '#ECFDF5', text: '#10B981', label: 'AUDIO' },
  document: { bg: '#FEF3C7', text: '#F59E0B', label: 'DOCUMENT' },
  other:    { bg: '#F1F5F9', text: '#64748B', label: 'FILE' },
};

/* ── Document Illustration (single warm peach sheet with folded corner) ───── */
function DocumentIllustration() {
  return (
    <svg width="68" height="78" viewBox="0 0 68 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Soft shadow */}
      <path
        d="M10 14C10 8.47715 14.4772 4 20 4H44L58 18V64C58 69.5228 53.5228 74 48 74H20C14.4772 74 10 69.5228 10 64V14Z"
        fill="#FFE8D2"
        opacity="0.8"
      />
      {/* Main sheet */}
      <path
        d="M8 12C8 6.47715 12.4772 2 18 2H42L56 16V62C56 67.5228 51.5228 72 46 72H18C12.4772 72 8 67.5228 8 62V12Z"
        fill="#FFF3E8"
      />
      {/* Folded corner */}
      <path
        d="M42 2V13C42 14.6569 43.3431 16 45 16H56L42 2Z"
        fill="#FFD9BA"
      />
      {/* Orange content lines */}
      <rect x="18" y="28" width="16" height="3" rx="1.5" fill="#F59E0B" opacity="0.85" />
      <rect x="18" y="36" width="28" height="3" rx="1.5" fill="#F59E0B" opacity="0.85" />
      <rect x="18" y="44" width="22" height="3" rx="1.5" fill="#F59E0B" opacity="0.65" />
    </svg>
  );
}

/* ── Attachment clip icon ────────────────────────────────────────────────── */
function AttachIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M11.3 6.3L6 11.6C4.6 13 2.3 13 1 11.6S1 8.3 2.4 6.9L7 2.2C8 1.1 9.6 1.1 10 2.2c.5 1.1 0 2.5-1 3.5L4.5 10.2C4 10.7 3.2 10.5 3.2 9.7s.8-1.5 1-1.5"
        stroke="#A0AEC0" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */
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
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = BADGE_STYLE[file.fileType] ?? BADGE_STYLE.other;
  const folderName = FOLDER_LABELS[file.folder] ?? file.folder;

  const date = new Date(file.createdAt);
  const fmtDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isImage = file.fileType === 'image';
  const isVideo = file.fileType === 'video';
  const isAudio = file.fileType === 'audio';

  return (
    <>
      {/* ── MOBILE CARD LAYOUT (< lg) ── */}
      <div
        onClick={onPreview}
        className={`flex lg:hidden items-center gap-3 p-3 rounded-2xl border transition-all duration-150 cursor-pointer bg-surface relative ${
          isSelected
            ? 'border-accent ring-2 ring-accent/20 shadow-sm'
            : 'border-border hover:border-accent/40 hover:shadow-xs'
        }`}
      >
        {/* Thumbnail */}
        <div
          className="w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative bg-surface-raised/80"
        >
          {isImage ? (
            <img
              src={file.url}
              alt={file.name}
              loading="lazy"
              className="w-full h-full object-contain p-1"
            />
          ) : isVideo ? (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
              <VideoIcon size={20} />
            </div>
          ) : isAudio ? (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
              <Music2 size={20} />
            </div>
          ) : (
            <div className="scale-75">
              <DocumentIllustration />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center">
            <span
              className="inline-block px-2 py-0.5 rounded text-[9.5px] font-black tracking-wider"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
          </div>
          <p
            className="text-[13px] font-bold text-text-primary truncate mt-0.5"
            title={file.name}
          >
            {file.name}
          </p>
          <p className="text-[11.5px] text-text-muted mt-0.5">
            {formatBytes(file.sizeBytes)} &bull; {fmtDate}
          </p>
        </div>

        {/* Right actions: Star + Kebab */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onStar}
            className="p-1.5 rounded-lg text-text-muted hover:text-amber-500 transition-colors"
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <Star size={16} fill={isStarred ? '#F59E0B' : 'none'} className={isStarred ? 'text-amber-500' : ''} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
              title="More options"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 bottom-full mb-1 w-36 rounded-lg border border-border bg-surface shadow-lg z-20 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setMenuOpen(false); onPreview(); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-surface-raised flex items-center gap-2 text-text-secondary"
                >
                  <Eye size={12} /> Preview
                </button>
                <a
                  href={file.url}
                  download={file.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-surface-raised flex items-center gap-2 text-text-secondary"
                  onClick={() => setMenuOpen(false)}
                >
                  <Download size={12} /> Download
                </a>
                <button
                  onClick={(e) => { setMenuOpen(false); onCopyLink(e); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-surface-raised flex items-center gap-2 text-text-secondary"
                >
                  <Copy size={12} /> Copy link
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={(e) => { setMenuOpen(false); onDelete(e); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-red-500/10 flex items-center gap-2 text-red-500"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP CARD LAYOUT (lg+) ── */}
      <div
        onClick={onPreview}
        className={`group hidden lg:flex flex-col rounded-xl border transition-all duration-150 overflow-hidden cursor-pointer bg-surface ${
          isSelected
            ? 'border-accent ring-2 ring-accent/20 shadow-sm'
            : 'border-border hover:border-accent/40 hover:shadow-sm'
        }`}
      >
        {/* ── Thumbnail ── */}
        <div
          className="relative flex items-center justify-center overflow-hidden bg-surface-raised/80"
          style={{ height: 172 }}
        >
          {isImage ? (
            <img
              src={file.url}
              alt={file.name}
              loading="lazy"
              className="w-full h-full object-contain p-1 transition-transform duration-300"
            />
          ) : isVideo ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-500/10 text-purple-500">
                <VideoIcon size={28} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">Video</span>
            </div>
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                <Music2 size={28} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Audio</span>
            </div>
          ) : (
            <DocumentIllustration />
          )}

          {/* Type badge — top left */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className="inline-block px-2 py-0.5 rounded text-[9.5px] font-black tracking-wider"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
          </div>

          {/* Star — top right (circular badge) */}
          <button
            onClick={onStar}
            className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isStarred
                ? 'opacity-100 shadow-xs'
                : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{
              backgroundColor: isStarred ? 'var(--icon-bg-warning)' : 'rgba(0,0,0,0.3)',
            }}
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <Star size={13} fill={isStarred ? '#F59E0B' : 'none'} stroke={isStarred ? '#F59E0B' : '#fff'} />
          </button>

          {/* Hover overlay actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-[5] flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(); }}
              className="p-2 rounded-lg bg-surface text-text-primary hover:bg-surface-raised shadow transition-transform hover:scale-110"
              title="Preview"
            >
              <Eye size={13} />
            </button>
            <a
              href={file.url}
              download={file.name}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-surface text-text-primary hover:bg-surface-raised shadow transition-transform hover:scale-110"
              title="Download"
            >
              <Download size={13} />
            </a>
            <button
              onClick={onCopyLink}
              className="p-2 rounded-lg bg-surface text-text-primary hover:bg-surface-raised shadow transition-transform hover:scale-110"
              title="Copy link"
            >
              {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-surface text-red-500 hover:bg-red-500/10 shadow transition-transform hover:scale-110"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* ── File Info ── */}
        <div className="px-3.5 py-3 flex flex-col gap-1">
          {/* File name */}
          <p
            className="text-[12px] font-semibold leading-snug text-text-primary"
            title={file.name}
          >
            {file.name}
          </p>

          {/* Size · Date */}
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span className="tabular-nums font-medium">{formatBytes(file.sizeBytes)}</span>
            <span>{fmtDate}</span>
          </div>

          {/* Divider row */}
          <div className="flex items-center justify-between pt-2 mt-0.5 border-t border-border">
            {/* Attachments */}
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] font-medium transition-colors text-text-muted hover:text-accent"
            >
              <AttachIcon />
              <span>Attachments</span>
            </button>

            {/* More options */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                className="p-1 rounded transition-colors hover:bg-surface-raised text-text-muted hover:text-text-primary"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 bottom-full mb-1 w-36 rounded-lg border border-border bg-surface shadow-lg z-20 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setMenuOpen(false); onPreview(); }}
                    className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-surface-raised flex items-center gap-2 text-text-secondary"
                  >
                    <Eye size={12} /> Preview
                  </button>
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-surface-raised flex items-center gap-2 text-text-secondary"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Download size={12} /> Download
                  </a>
                  <button
                    onClick={(e) => { setMenuOpen(false); onCopyLink(e); }}
                    className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-surface-raised flex items-center gap-2 text-text-secondary"
                  >
                    <Copy size={12} /> Copy link
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={(e) => { setMenuOpen(false); onDelete(e); }}
                    className="w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-red-500/10 flex items-center gap-2 text-red-500"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
