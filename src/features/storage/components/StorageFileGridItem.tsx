import React from 'react';
import {
  CheckSquare,
  Square,
  Star,
  Eye,
  Download,
  Copy,
  Check,
  Trash2,
  Video as VideoIcon,
  Music2,
  Layers,
} from 'lucide-react';
import { formatBytes, TYPE_CONFIG, FOLDER_LABELS } from '../storageUtils';
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
  const config = TYPE_CONFIG[file.fileType];
  const Icon = config.icon;
  const folderName = FOLDER_LABELS[file.folder] ?? file.folder;

  return (
    <div
      onClick={onPreview}
      className={`group relative rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden cursor-pointer shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-accent ring-2 ring-accent/30 shadow-md'
          : 'border-border/80 hover:border-border'
      }`}
      style={{ background: 'var(--color-surface-raised)' }}
    >
      {/* Selection Checkbox (Top Left) */}
      <button
        onClick={onSelect}
        className={`absolute top-2.5 left-2.5 z-20 p-1 rounded-lg backdrop-blur-md transition-all ${
          isSelected
            ? 'bg-accent text-white shadow-sm'
            : 'bg-black/30 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/50'
        }`}
        title="Select file"
      >
        {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
      </button>

      {/* Star Button (Top Right) */}
      <button
        onClick={onStar}
        className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg backdrop-blur-md transition-all ${
          isStarred
            ? 'bg-amber-500/20 text-amber-400 opacity-100 shadow-sm'
            : 'bg-black/30 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/50'
        }`}
        title={isStarred ? 'Remove from starred' : 'Add to starred'}
      >
        <Star size={14} className={isStarred ? 'fill-amber-400' : ''} />
      </button>

      {/* Thumbnail Header */}
      <div className="h-40 w-full bg-surface border-b border-border/40 relative overflow-hidden flex items-center justify-center">
        {file.fileType === 'image' ? (
          <img
            src={file.url}
            alt={file.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : file.fileType === 'video' ? (
          <div className="flex flex-col items-center gap-2 text-purple-500">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shadow-inner">
              <VideoIcon size={26} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Video
            </span>
          </div>
        ) : file.fileType === 'audio' ? (
          <div className="flex flex-col items-center gap-2 text-emerald-500">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shadow-inner">
              <Music2 size={26} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Audio Track
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center shadow-inner`}>
              <Icon size={26} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {file.fileType}
            </span>
          </div>
        )}

        {/* Hover Quick Action Buttons Bar */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="p-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 transition-transform hover:scale-110 shadow"
            title="Preview file"
          >
            <Eye size={15} />
          </button>
          <a
            href={file.url}
            download={file.name}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 transition-transform hover:scale-110 shadow"
            title="Download file"
          >
            <Download size={15} />
          </a>
          <button
            onClick={onCopyLink}
            className="p-2 rounded-xl bg-white text-slate-800 hover:bg-slate-100 transition-transform hover:scale-110 shadow"
            title="Copy link"
          >
            {isCopied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-xl bg-white text-red-600 hover:bg-red-50 transition-transform hover:scale-110 shadow"
            title="Delete file"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* File Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <h3 className="text-xs font-bold text-text-primary truncate" title={file.name}>
            {file.name}
          </h3>
          <div className="flex items-center justify-between text-[11px] text-text-muted mt-1 font-medium">
            <span>{formatBytes(file.sizeBytes)}</span>
            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Badges & Module Tag */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px]">
          <span className="inline-flex items-center gap-1 font-semibold text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-border/50">
            <Layers size={10} className="text-text-muted shrink-0" />
            {folderName}
          </span>
          <span className={`font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}
