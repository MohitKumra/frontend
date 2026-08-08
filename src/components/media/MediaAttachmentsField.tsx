import React, { useRef, useState, useEffect } from 'react';
import { Paperclip, Mic, Square, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadMediaFile } from '../../lib/mediaUpload';
import { VoiceNotePlayer } from './VoiceNotePlayer';

interface MediaAttachmentsFieldProps {
  attachmentUrl: string;
  onAttachmentUrlChange: (value: string) => void;
  voiceNoteUrl: string;
  onVoiceNoteUrlChange: (value: string) => void;
  allowVoiceRecording?: boolean;
}

const MAX_BYTES = 4 * 1024 * 1024;

/** Check if URL points to an image file */
function isImageUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return /\.(png|jpg|jpeg|webp|gif|bmp|avif|svg)$/.test(path) || url.startsWith('data:image/');
}

/** Extract a short filename from URL */
function shortName(url: string, max = 18): string {
  try {
    const segs = new URL(url).pathname.split('/').filter(Boolean);
    const name = decodeURIComponent(segs[segs.length - 1] || 'file');
    return name.length > max ? name.slice(0, max - 3) + '…' : name;
  } catch {
    return 'file';
  }
}

/** Format seconds as mm:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MediaAttachmentsField({
  attachmentUrl,
  onAttachmentUrlChange,
  voiceNoteUrl,
  onVoiceNoteUrlChange,
  allowVoiceRecording = true,
}: MediaAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingStartRef = useRef<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Live elapsed timer during recording
  useEffect(() => {
    if (!isRecording) {
      setRecordingElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingElapsed(Math.floor((Date.now() - recordingStartRef.current) / 1000));
    }, 200);
    return () => clearInterval(interval);
  }, [isRecording]);

  const uploadFile = async (file: File, folder: 'attachments' | 'voice-notes' = 'attachments') => {
    if (file.size > MAX_BYTES) {
      setError('Files must be 4MB or smaller.');
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadMediaFile(file, folder);
      if (folder === 'voice-notes') {
        onVoiceNoteUrlChange(uploaded.url);
      } else {
        onAttachmentUrlChange(uploaded.url);
      }
    } catch {
      setError('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Mic not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recordingStartRef.current = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        // Determine correct extension based on mimeType
        let ext = '.webm';
        if (mimeType.includes('mp4') || mimeType.includes('mpeg')) {
          ext = '.m4a';
        } else if (mimeType.includes('ogg')) {
          ext = '.ogg';
        } else if (mimeType.includes('mp3')) {
          ext = '.mp3';
        } else if (mimeType.includes('wav')) {
          ext = '.wav';
        }
        const file = new File([blob], `voice-note-${Date.now()}${ext}`, { type: blob.type });
        await uploadFile(file, 'voice-notes');
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000); // timeslice every 1s to ensure audio data is captured
      setIsRecording(true);
    } catch (err: any) {
      // Distinguish between different types of errors
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone detected. Please connect a microphone.');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone permission.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Microphone is being used by another app.');
      } else {
        setError('Could not access microphone. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const hasAttach = Boolean(attachmentUrl);
  const hasVoice = Boolean(voiceNoteUrl);
  const attachIsImage = hasAttach && isImageUrl(attachmentUrl!);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = '';
          if (file) void uploadFile(file, 'attachments');
        }}
      />

      {/* Attachment button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading || isRecording}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-110 disabled:opacity-40"
        style={{ color: 'var(--color-text-muted)' }}
        title="Attach a file"
      >
        <Paperclip size={15} />
      </button>

      {/* Voice note button — switches to stop during recording */}
      {allowVoiceRecording && !isRecording && (
        <button
          type="button"
          onClick={startRecording}
          disabled={isUploading}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-110 disabled:opacity-40"
          style={{ color: 'var(--color-text-muted)' }}
          title="Record voice note"
        >
          <Mic size={15} />
        </button>
      )}

      {/* Recording status bar */}
      {isRecording && (
        <div
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold"
          style={{
            color: '#e53935',
            background: 'rgba(229, 57, 53, 0.08)',
            border: '1px solid rgba(229, 57, 53, 0.25)',
          }}
        >
          {/* Pulsing red dot */}
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: '#e53935',
              animation: 'recording-pulse 1.2s ease-in-out infinite',
            }}
          />
          <span>REC {formatDuration(recordingElapsed)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-100 transition-colors"
            title="Stop recording"
          >
            <Square size={10} fill="#e53935" />
          </button>
        </div>
      )}

      {/* Upload spinner */}
      {isUploading && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />}

      {/* Attachment preview chip */}
      {hasAttach && (
        <span
          className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {attachIsImage ? <ImageIcon size={12} /> : <Paperclip size={12} />}
          {shortName(attachmentUrl!)}
          <button
            type="button"
            onClick={() => onAttachmentUrlChange('')}
            className="hover:text-danger transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </span>
      )}

      {/* Voice note preview */}
      {hasVoice && (
        <div className="w-full">
          <VoiceNotePlayer src={voiceNoteUrl} onDelete={() => onVoiceNoteUrlChange('')} compact />
        </div>
      )}

      {/* Error message */}
      {error && <span className="text-xs font-bold text-danger">{error}</span>}

      {/* Recording pulse animation keyframes */}
      <style>{`
        @keyframes recording-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
