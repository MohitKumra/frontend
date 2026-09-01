import React, { useState } from 'react';
import { X, UploadCloud, Upload } from 'lucide-react';

interface StorageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, folder: string) => void;
}

export function StorageUploadModal({
  isOpen,
  onClose,
  onUpload,
}: StorageUploadModalProps) {
  const [selectedFolder, setSelectedFolder] = useState('attachments');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-surface-raised shadow-2xl p-6 flex flex-col gap-4"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <UploadCloud size={18} />
            </div>
            <h3 className="text-sm font-extrabold text-text-primary">Upload File</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Folder Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
              Target Destination
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="attachments">General Attachments</option>
              <option value="task-attachment">Tasks</option>
              <option value="project-attachment">Projects</option>
              <option value="note-attachment">Notes</option>
              <option value="voice-notes">Voice Notes</option>
            </select>
          </div>

          {/* Drag and Drop Box */}
          <label
            htmlFor="file-upload-modal-input"
            className="border-2 border-dashed border-border/80 hover:border-accent hover:bg-accent/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-inner">
              <Upload size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">Click to browse or drag & drop files here</p>
              <p className="text-[11px] text-text-muted mt-1">Supports images, videos, audio, and documents up to 10 MB</p>
            </div>
            <input
              id="file-upload-modal-input"
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onUpload(e.target.files[0], selectedFolder);
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
