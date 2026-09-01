import React from 'react';
import {
  X,
  Star,
  Copy,
  Check,
  Download,
  ExternalLink,
  Trash2,
  Music2,
  FileText,
  Folder,
} from 'lucide-react';
import { formatBytes, FOLDER_LABELS } from '../storageUtils';
import type { StorageFileDTO } from '../api';

interface StoragePreviewModalProps {
  file: StorageFileDTO | null;
  isStarred: boolean;
  isCopied: boolean;
  onClose: () => void;
  onToggleStar: () => void;
  onCopyLink: () => void;
  onDeleteTarget: (file: StorageFileDTO) => void;
}

export function StoragePreviewModal({
  file,
  isStarred,
  isCopied,
  onClose,
  onToggleStar,
  onCopyLink,
  onDeleteTarget,
}: StoragePreviewModalProps) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl rounded-3xl border border-border bg-surface-raised shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-text-primary truncate" title={file.name}>
                {file.name}
              </h3>
              <button
                onClick={onToggleStar}
                className="p-1 rounded-lg text-text-muted hover:text-amber-400"
              >
                <Star
                  size={14}
                  className={isStarred ? 'text-amber-400 fill-amber-400' : ''}
                />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-0.5 font-medium">
              {formatBytes(file.sizeBytes)} • {FOLDER_LABELS[file.folder] ?? file.folder} •{' '}
              {new Date(file.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary transition-colors"
            >
              {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>Copy Link</span>
            </button>
            <a
              href={file.url}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary transition-colors"
            >
              <Download size={13} />
              <span>Download</span>
            </a>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-text-secondary transition-colors"
            >
              <ExternalLink size={13} />
              <span>Open Tab</span>
            </a>
            <button
              onClick={() => {
                onDeleteTarget(file);
              }}
              className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
              title="Delete File"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body & Media Preview */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col md:flex-row items-center gap-6 bg-black/5 dark:bg-black/25 min-h-[360px]">
          {/* Media viewer container */}
          <div className="flex-1 w-full flex items-center justify-center">
            {file.fileType === 'image' ? (
              <img
                src={file.url}
                alt={file.name}
                className="max-h-[62vh] max-w-full rounded-2xl object-contain shadow-md"
              />
            ) : file.fileType === 'video' ? (
              <video
                src={file.url}
                controls
                autoPlay
                className="max-h-[62vh] max-w-full rounded-2xl shadow-md"
              />
            ) : file.fileType === 'audio' ? (
              <div className="w-full max-w-md p-6 bg-surface rounded-2xl border border-border text-center space-y-4 shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                  <Music2 size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary truncate">{file.name}</p>
                  <p className="text-xs text-text-muted mt-1">{formatBytes(file.sizeBytes)}</p>
                </div>
                <audio src={file.url} controls className="w-full mt-2" autoPlay />
              </div>
            ) : (
              <div className="text-center p-8 space-y-4 max-w-md bg-surface rounded-2xl border border-border shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                  <FileText size={36} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary truncate">{file.name}</p>
                  <p className="text-xs text-text-muted mt-1">
                    Document preview is available via direct download or browser new tab.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <a
                    href={file.url}
                    download={file.name}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    Download Document
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Details Side Box */}
          <div className="w-full md:w-72 bg-surface rounded-2xl border border-border p-4 space-y-3.5 text-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              File Properties
            </p>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-text-muted block">File Name</span>
                <span className="font-semibold text-text-primary break-all">{file.name}</span>
              </div>

              <div>
                <span className="text-[11px] text-text-muted block">File Size</span>
                <span className="font-semibold text-text-primary tabular-nums">
                  {formatBytes(file.sizeBytes)} ({file.sizeBytes.toLocaleString()} bytes)
                </span>
              </div>

              <div>
                <span className="text-[11px] text-text-muted block">Module / Folder</span>
                <span className="inline-flex items-center gap-1 font-semibold text-text-secondary bg-surface-raised px-2 py-0.5 rounded border border-border/50 mt-0.5">
                  <Folder size={11} className="text-accent" />
                  {FOLDER_LABELS[file.folder] ?? file.folder}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-text-muted block">Category</span>
                <span className="font-semibold text-text-primary capitalize">{file.fileType}</span>
              </div>

              <div>
                <span className="text-[11px] text-text-muted block">Created Date</span>
                <span className="font-semibold text-text-primary">
                  {new Date(file.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
