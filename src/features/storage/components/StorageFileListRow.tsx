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
  Layers,
} from 'lucide-react';
import { formatBytes, TYPE_CONFIG, FOLDER_LABELS } from '../storageUtils';
import type { StorageFileDTO } from '../api';

interface StorageFileListRowProps {
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

export function StorageFileListRow({
  file,
  isSelected,
  isStarred,
  isCopied,
  onSelect,
  onStar,
  onPreview,
  onCopyLink,
  onDelete,
}: StorageFileListRowProps) {
  const config = TYPE_CONFIG[file.fileType];
  const Icon = config.icon;
  const folderName = FOLDER_LABELS[file.folder] ?? file.folder;

  return (
    <div
      onClick={onPreview}
      className={`px-4 py-3 grid grid-cols-12 items-center hover:bg-surface-raised/80 transition-colors text-xs cursor-pointer ${
        isSelected ? 'bg-accent/5' : ''
      }`}
    >
      <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
        <button
          onClick={onSelect}
          className="hover:text-accent text-text-muted shrink-0"
        >
          {isSelected ? (
            <CheckSquare size={15} className="text-accent" />
          ) : (
            <Square size={15} />
          )}
        </button>
        <button
          onClick={onStar}
          className="text-text-muted hover:text-amber-400 shrink-0"
        >
          <Star
            size={14}
            className={isStarred ? 'text-amber-400 fill-amber-400' : 'opacity-40'}
          />
        </button>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
          <Icon size={14} />
        </span>
        <span
          className="font-bold text-text-primary truncate hover:text-accent transition-colors"
          title={file.name}
        >
          {file.name}
        </span>
      </div>

      <div className="hidden sm:block sm:col-span-2 truncate">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary bg-surface px-2.5 py-1 rounded-md border border-border/50">
          <Layers size={11} className="text-text-muted shrink-0" />
          {folderName}
        </span>
      </div>

      <div className="hidden md:block md:col-span-2">
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${config.badgeClass}`}>
          {config.label}
        </span>
      </div>

      <div className="hidden sm:block sm:col-span-1 font-semibold text-text-muted tabular-nums">
        {formatBytes(file.sizeBytes)}
      </div>

      <div className="hidden lg:block lg:col-span-1 text-[11px] text-text-muted truncate">
        {new Date(file.createdAt).toLocaleDateString()}
      </div>

      <div className="col-span-12 sm:col-span-1 flex items-center justify-end gap-1 pt-2 sm:pt-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface transition-colors"
          title="Preview"
        >
          <Eye size={14} />
        </button>
        <button
          onClick={onCopyLink}
          className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface transition-colors"
          title="Copy Link"
        >
          {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
        <a
          href={file.url}
          download={file.name}
          onClick={(e) => e.stopPropagation()}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface transition-colors"
          title="Download"
        >
          <Download size={14} />
        </a>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-surface transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
