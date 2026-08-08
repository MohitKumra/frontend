import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Paperclip, X } from 'lucide-react';
import { ModalPortal } from '../ui/ModalRoot';
import { VoiceNotePlayer } from './VoiceNotePlayer';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif', '.svg'];

function normalizeUrl(url: string): string {
  return url.trim();
}

function getUrlPath(url: string): string {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(url, base).pathname.toLowerCase();
  } catch {
    return url.split('?')[0].toLowerCase();
  }
}

export function isImageMedia(url?: string | null): boolean {
  if (!url) return false;
  const normalized = normalizeUrl(url);
  if (normalized.startsWith('data:image/')) return true;
  const path = getUrlPath(normalized);
  return IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function getFileName(url: string): string {
  try {
    const pathname = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || 'Attachment';
    return decodeURIComponent(last);
  } catch {
    const fallback = url.split('/').filter(Boolean).pop() || 'Attachment';
    return fallback.split('?')[0] || 'Attachment';
  }
}

interface AttachmentPreviewProps {
  url: string;
  label?: string;
  compact?: boolean;
}

function AttachmentPreview({ url, label = 'Attachment', compact = false }: AttachmentPreviewProps) {
  const [zoomed, setZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const image = useMemo(() => isImageMedia(url), [url]);
  const fileName = useMemo(() => getFileName(url), [url]);

  useEffect(() => {
    if (!zoomed) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [zoomed]);

  if (image && !imageError) {
    return (
      <>
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="group relative block overflow-hidden rounded-xl border text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          style={{
            borderColor: 'var(--color-border)',
            background: '#fff',
            width: '100%',
            maxWidth: '280px',
          }}
          aria-label={`Preview ${label.toLowerCase()}`}
        >
          <div className="relative w-full" style={{ height: '160px' }}>
            <img
              src={url}
              alt={`${label} preview`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
              style={{ display: 'block' }}
            />
            {/* Hover overlay with Zoom indicator */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-gray-900">
                <ImageIcon size={16} />
                <span>Zoom</span>
              </div>
            </div>
          </div>
        </button>

        {zoomed && (
          <ModalPortal>
            <div
              className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md"
              onClick={() => setZoomed(false)}
              role="presentation"
            >
              <div className="relative max-h-[92vh] max-w-[96vw]" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setZoomed(false)}
                  className="absolute -top-3 -right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border text-white shadow-xl"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(17, 24, 39, 0.92)' }}
                  aria-label="Close image preview"
                >
                  <X size={18} />
                </button>
                <img
                  src={url}
                  alt={`${label} zoomed preview`}
                  className="max-h-[92vh] max-w-[96vw] rounded-2xl object-contain shadow-2xl"
                />
              </div>
            </div>
          </ModalPortal>
        )}
      </>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-black/5"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
      >
        <ExternalLink size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </span>
        <span className="block truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {fileName}
        </span>
      </span>
      <Paperclip size={16} className="shrink-0 text-accent" />
    </a>
  );
}

interface MediaPreviewProps {
  attachmentUrl?: string | null;
  voiceNoteUrl?: string | null;
  compact?: boolean;
  attachmentLabel?: string;
  voiceLabel?: string;
}

export function MediaPreview({
  attachmentUrl,
  voiceNoteUrl,
  compact = false,
  attachmentLabel = 'Attachment',
  voiceLabel = 'Voice note',
}: MediaPreviewProps) {
  if (!attachmentUrl && !voiceNoteUrl) return null;

  return (
    <div className="space-y-4">
      {attachmentUrl && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
            {attachmentLabel}
          </p>
          <AttachmentPreview url={attachmentUrl} label={attachmentLabel} compact={compact} />
        </div>
      )}

      {voiceNoteUrl && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
            {voiceLabel}
          </p>
          <VoiceNotePlayer src={voiceNoteUrl} />
        </div>
      )}
    </div>
  );
}
