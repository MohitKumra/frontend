import { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { DraggableModal } from './DraggableModal';

interface AvatarUploadProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  /** Should perform the upload (e.g. call your API) and resolve once the new avatarUrl is persisted. */
  onUpload: (file: File) => Promise<void>;
  /** Optional — omit to hide the "Remove photo" action. */
  onRemove?: () => Promise<void>;
}

const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function AvatarUpload({ isOpen, onClose, currentAvatarUrl, onUpload, onRemove }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPreview(null);
    setError(null);
    setIsUploading(false);
    setIsRemoving(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Please choose a PNG, JPG, or WEBP image.');
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError('Image must be smaller than 4MB.');
        return;
      }

      setError(null);
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      setIsUploading(true);
      try {
        await onUpload(file);
        handleClose();
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, handleClose]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove();
      handleClose();
    } catch {
      setError('Could not remove photo. Please try again.');
      setIsRemoving(false);
    }
  };

  const displaySrc = preview ?? currentAvatarUrl ?? null;

  return (
    <DraggableModal isOpen={isOpen} onClose={handleClose} title="Update profile photo">
      <div className="flex flex-col items-center gap-5">
        <div
          className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-md"
          style={{ background: 'var(--gradient-accent)' }}
        >
          {displaySrc ? (
            <img src={displaySrc} alt="Avatar preview" className="w-full h-full object-cover" />
          ) : (
            <Camera size={20} className="text-white/70" />
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className="w-full rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors"
          style={{
            borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
            background: isDragging
              ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)'
              : 'var(--color-surface-raised)',
          }}
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin text-accent" />
          ) : (
            <Upload size={20} className="text-text-muted" />
          )}
          <p className="text-xs font-bold text-text-primary">
            {isUploading ? 'Uploading…' : 'Drop an image here, or click to browse'}
          </p>
          <p className="text-[11px] text-text-muted">PNG, JPG, or WEBP — up to 4MB</p>
        </div>

        {error && <p className="text-xs font-bold text-danger">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <div className="flex items-center gap-3 w-full">
          {currentAvatarUrl && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isRemoving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-danger border disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Remove photo
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-text-onaccent"
            style={{ background: 'var(--gradient-accent)' }}
          >
            Done
          </button>
        </div>
      </div>
    </DraggableModal>
  );
}
