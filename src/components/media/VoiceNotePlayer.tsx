import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Mic, Trash2 } from 'lucide-react';

interface VoiceNotePlayerProps {
  src: string;
  onDelete?: () => void;
  compact?: boolean;
}

const SPEEDS = [1, 1.5, 2, 0.75] as const;
const BAR_UNIT = 6;
const GAP_UNIT = 4;
const SVG_HEIGHT = 36;

/**
 * Deterministic waveform pattern derived from the file URL. Renders
 * instantly (no network fetch / async decode), so there's nothing that
 * loads in later and swaps — which is what previously made the waveform
 * appear to "shrink" during playback as a taller placeholder was replaced
 * by real (flatter) decoded data.
 */
function generatePeaks(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const r = (h % 1000) / 1000;
    peaks.push(0.38 + r * 0.45 + Math.sin(i * 0.4) * 0.1);
  }
  return peaks;
}

export function VoiceNotePlayer({ src, onDelete, compact = false }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [key, setKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [showRemaining, setShowRemaining] = useState(false);
  const [mounted, setMounted] = useState(false);

  const numBars = compact ? 28 : 44;
  const peaks = useMemo(() => generatePeaks(src, numBars), [src, numBars]);
  const svgWidth = numBars * BAR_UNIT + (numBars - 1) * GAP_UNIT;

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const formatTime = (time: number) => {
    if (!isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setLoadError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const seekToRatio = useCallback(
    (ratio: number) => {
      const clamped = Math.min(1, Math.max(0, ratio));
      if (audioRef.current && duration > 0) {
        audioRef.current.currentTime = clamped * duration;
        setCurrentTime(clamped * duration);
      }
    },
    [duration]
  );

  const ratioFromPointer = (clientX: number): number => {
    const el = waveformRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsScrubbing(true);
    seekToRatio(ratioFromPointer(e.clientX));
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const ratio = ratioFromPointer(e.clientX);
    setHoverRatio(ratio);
    if (isScrubbing) seekToRatio(ratio);
  };
  const handlePointerUp = () => setIsScrubbing(false);
  const handlePointerLeave = () => {
    if (!isScrubbing) setHoverRatio(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!audioRef.current || duration === 0) return;
    if (e.key === 'ArrowRight') {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
      setCurrentTime(audioRef.current.currentTime);
    } else if (e.key === 'ArrowLeft') {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      setCurrentTime(audioRef.current.currentTime);
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isScrubbing) {
      setCurrentTime(audioRef.current.currentTime);
      const dur = audioRef.current.duration;
      if (dur > 0 && isFinite(dur) && duration === 0) setDuration(dur);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const fixInfiniteDuration = (audio: HTMLAudioElement) => {
    const onTimeUpdate = () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      if (isFinite(audio.duration)) setDuration(audio.duration);
      audio.currentTime = 0;
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.currentTime = 1e101;
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur > 0 && isFinite(dur)) setDuration(dur);
    else if (dur === Infinity) fixInfiniteDuration(audioRef.current);
  };
  const handleCanPlay = () => {
    if (!audioRef.current || duration > 0) return;
    const dur = audioRef.current.duration;
    if (dur > 0 && isFinite(dur)) setDuration(dur);
    else if (dur === Infinity) fixInfiniteDuration(audioRef.current);
  };
  const handleLoadedData = () => {
    if (!audioRef.current || duration > 0) return;
    const dur = audioRef.current.duration;
    if (dur > 0 && isFinite(dur)) setDuration(dur);
    else if (dur === Infinity) fixInfiniteDuration(audioRef.current);
  };
  const handleError = () => setLoadError(true);

  // Reset when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoadError(false);
    setSpeed(1);
    setKey((prev) => prev + 1);
  }, [src]);

  // Duration polling fallback (handles the Chrome/MediaRecorder WebM
  // "Infinity duration" quirk if metadata events don't resolve it)
  useEffect(() => {
    if (duration > 0) return;
    const interval = setInterval(() => {
      if (!audioRef.current) return;
      const dur = audioRef.current.duration;
      if (dur > 0 && isFinite(dur)) {
        setDuration(dur);
        clearInterval(interval);
      } else if (dur === Infinity) {
        fixInfiniteDuration(audioRef.current);
        clearInterval(interval);
      }
    }, 100);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [key, duration]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const scrubRatio = hoverRatio !== null ? Math.min(1, Math.max(0, hoverRatio)) : null;

  if (loadError) {
    return (
      <div className="w-full" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
            style={{ background: 'color-mix(in srgb, #e53935 14%, transparent)', color: '#e53935' }}
          >
            <Mic size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Voice note unavailable
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              This recording couldn't be loaded.
            </p>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110 shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Delete voice note"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <audio
        key={key}
        ref={audioRef}
        src={src}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onLoadedData={handleLoadedData}
        onError={handleError}
      />

      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border relative overflow-hidden"
        style={{
          borderColor: 'var(--color-border)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 100%, transparent), color-mix(in srgb, var(--color-surface) 96%, var(--color-primary) 4%))',
        }}
      >
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={!duration}
          className="relative flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-transform active:scale-90 disabled:opacity-50"
          style={{
            background:
              'linear-gradient(150deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, black 15%))',
            color: 'white',
            boxShadow: '0 3px 10px -2px color-mix(in srgb, var(--color-primary) 55%, transparent)',
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying && (
            <span
              className="absolute inset-0 rounded-full pointer-events-none play-pulse"
              style={{ boxShadow: '0 0 0 0 color-mix(in srgb, var(--color-primary) 55%, transparent)' }}
            />
          )}
          {isPlaying ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" style={{ marginLeft: 2 }} />
          )}
        </button>

        {/* Waveform */}
        <div
          ref={waveformRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek voice note"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="flex-1 relative h-9 cursor-pointer select-none outline-none"
        >
          {/* preserveAspectRatio="none" always stretches to exactly 100% of
              the container width by spec — the waveform can't collapse or
              bunch up the way flex-distributed divs could. */}
          <svg
            viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            style={{ display: 'block', overflow: 'visible' }}
          >
            {peaks.map((amp, i) => {
              const barRatio = i / peaks.length;
              const isPast = barRatio <= progress;
              const isHoverPast = scrubRatio !== null && barRatio <= scrubRatio;
              const barHeight = Math.max(6, amp * (SVG_HEIGHT - 8));
              const x = i * (BAR_UNIT + GAP_UNIT);
              const y = (SVG_HEIGHT - barHeight) / 2;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={BAR_UNIT}
                  height={barHeight}
                  rx={BAR_UNIT / 2}
                  style={{
                    // Solid colors only — no white-mixed gradient here. That
                    // gradient was the actual bug: it made the "played"
                    // portion fade toward white, so the waveform visibly
                    // faded out over the course of playback on light themes.
                    fill: isPast
                      ? 'var(--color-primary)'
                      : isHoverPast
                        ? 'color-mix(in srgb, var(--color-primary) 55%, var(--color-text-muted) 45%)'
                        : 'var(--color-text-muted)',
                    transition: 'fill 0.15s ease',
                  }}
                />
              );
            })}
          </svg>

          {/* Playhead */}
          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${progress * 100}%`,
                width: '2px',
                background: 'var(--color-primary)',
                boxShadow: '0 0 6px 0 color-mix(in srgb, var(--color-primary) 60%, transparent)',
                transform: 'translateX(-1px)',
              }}
            >
              <div
                className="absolute -top-0.5 rounded-full"
                style={{ width: '6px', height: '6px', left: '-2px', background: 'var(--color-primary)' }}
              />
            </div>
          )}

          {/* Hover time tooltip */}
          {scrubRatio !== null && duration > 0 && (
            <div
              className="absolute -top-7 px-1.5 py-0.5 rounded-md text-[10px] font-semibold pointer-events-none whitespace-nowrap"
              style={{
                left: `${scrubRatio * 100}%`,
                transform: 'translateX(-50%)',
                background: 'var(--color-text-secondary)',
                color: 'var(--color-surface)',
              }}
            >
              {formatTime(scrubRatio * duration)}
            </div>
          )}
        </div>

        {/* Speed */}
        {duration > 0 && !compact && (
          <button
            onClick={cycleSpeed}
            className="shrink-0 px-1.5 py-1 rounded-md text-[11px] font-bold tabular-nums transition-colors"
            style={{
              color: speed !== 1 ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: speed !== 1 ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent',
            }}
            aria-label={`Playback speed ${speed}x`}
          >
            {speed}×
          </button>
        )}

        {/* Time */}
        <button
          onClick={() => setShowRemaining((v) => !v)}
          className="text-xs font-semibold tabular-nums shrink-0 min-w-[38px] text-right"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Toggle elapsed / remaining time"
        >
          {showRemaining ? `-${formatTime(duration - currentTime)}` : formatTime(currentTime)}
        </button>

        {/* Delete */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-110 shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Delete voice note"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <style>{`
        .play-pulse {
          animation: play-pulse-anim 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes play-pulse-anim {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary) 45%, transparent); }
          70% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--color-primary) 0%, transparent); }
          100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary) 0%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          .play-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
