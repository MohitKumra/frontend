import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Trash2 } from 'lucide-react';

interface VoiceNotePlayerProps {
  src: string;
  onDelete?: () => void;
  compact?: boolean;
}

export function VoiceNotePlayer({ src, onDelete, compact = false }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [key, setKey] = useState(0); // Force re-mount of audio element when src changes
  const [loadError, setLoadError] = useState(false);

  console.log('[VoiceNotePlayer] Initializing with src:', src);

  // Calculate bars based on container size
  const numBars = compact ? 30 : 50;

  // Helper to format time (mm:ss)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle play/pause
  const togglePlay = () => {
    console.log('[VoiceNotePlayer] togglePlay called. isPlaying:', isPlaying);
    if (audioRef.current) {
      console.log('[VoiceNotePlayer] audio element current:', audioRef.current);
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      console.error('[VoiceNotePlayer] No audioRef.current');
    }
  };

  // Handle audio time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currTime = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      console.log('[VoiceNotePlayer] handleTimeUpdate:', { currentTime: currTime, duration: dur });
      setCurrentTime(currTime);
      // Also check duration here in case metadata wasn't loaded yet
      if (dur > 0 && duration === 0) {
        console.log('[VoiceNotePlayer] Setting duration from handleTimeUpdate:', dur);
        setDuration(dur);
      }
    }
  };

  // Handle audio ended
  const handleEnded = () => {
    console.log('[VoiceNotePlayer] Audio ended');
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Load metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      console.log('[VoiceNotePlayer] handleLoadedMetadata:', { duration: dur });
      if (dur > 0) {
        console.log('[VoiceNotePlayer] Setting duration from handleLoadedMetadata:', dur);
        setDuration(dur);
      }
    }
  };

  // Canplay event as fallback
  const handleCanPlay = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      console.log('[VoiceNotePlayer] handleCanPlay:', { duration: dur });
      if (dur > 0) {
        console.log('[VoiceNotePlayer] Setting duration from handleCanPlay:', dur);
        setDuration(dur);
      }
    }
  };

  // Handle audio loadstart
  const handleLoadStart = () => {
    console.log('[VoiceNotePlayer] handleLoadStart');
  };

  // Handle audio loadeddata
  const handleLoadedData = () => {
    console.log('[VoiceNotePlayer] handleLoadedData');
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (dur > 0 && duration === 0) {
        console.log('[VoiceNotePlayer] Setting duration from handleLoadedData:', dur);
        setDuration(dur);
      }
    }
  };

  // Handle audio error
  const handleError = (e: any) => {
    console.error('[VoiceNotePlayer] handleError:', e);
    console.error('[VoiceNotePlayer] Audio element error:', audioRef.current?.error);
    setLoadError(true);
  };

  // Reset when src changes
  useEffect(() => {
    console.log('[VoiceNotePlayer] src changed. Resetting state and incrementing key. src:', src);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoadError(false);
    setKey(prev => prev + 1); // Force re-mount to reload src
  }, [src]);

  // Polling fallback: check duration every 100ms until we get it
  useEffect(() => {
    if (duration > 0) return;
    console.log('[VoiceNotePlayer] Starting duration polling fallback');
    const interval = setInterval(() => {
      if (audioRef.current) {
        const dur = audioRef.current.duration;
        console.log('[VoiceNotePlayer] Polling duration:', dur);
        if (dur > 0 && isFinite(dur)) {
          console.log('[VoiceNotePlayer] Setting duration from polling:', dur);
          setDuration(dur);
          clearInterval(interval);
        }
      }
    }, 100);

    // Clear interval after 5 seconds (give up after that)
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.log('[VoiceNotePlayer] Duration polling timeout');
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [key, duration]);

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Show error state if file failed to load
  if (loadError) {
    return (
      <div className="w-full">
        <div 
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ 
            borderColor: 'var(--color-border)', 
            background: 'var(--color-surface)'
          }}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ background: 'var(--color-danger-bg, #fce4ec)', color: '#e53935' }}>
            <Mic size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Voice note unavailable</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>The audio file could not be loaded. It may have been lost during deployment.</p>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110 hover:bg-red-50"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <audio
        key={key}
        ref={audioRef}
        src={src}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onError={handleError}
      />
      
      <div 
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
        style={{ 
          borderColor: 'var(--color-border)', 
          background: 'var(--color-surface)'
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-12 h-12 rounded-full transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.15)'
          }}
        >
          {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
        </button>

        {/* Audio Wave Visualizer */}
        <div className="flex-1 flex items-center gap-1 overflow-hidden">
          {Array.from({ length: numBars }).map((_, i) => {
            // Calculate if bar is in progress
            const isActive = (i / numBars) * 100 <= progress;
            
            // Create random heights for wave effect when playing, or static heights
            let height:number;
            if (isPlaying) {
              // Dynamic heights when playing
              const baseHeight = 8 + (Math.sin(i * 0.5 + Date.now() * 0.005) * 8);
              height = Math.max(6, baseHeight);
            } else {
              // Static heights based on index when not playing
              height = 8 + (Math.sin(i * 0.8) * 6);
            }

            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-75"
                style={{
                  height: `${height}px`,
                  minWidth: '2px',
                  background: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                  animation: isPlaying ? 'pulse 0.6s ease-in-out infinite alternate' : 'none',
                  animationDelay: `${i * 0.02}s`
                }}
              />
            );
          })}
        </div>

        {/* Time Display */}
        <div className="text-sm font-semibold min-w-[80px] text-right" style={{ color: 'var(--color-text-secondary)' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Delete Button (only if onDelete provided) */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110 hover:bg-red-50"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Add CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          from {
            transform: scaleY(0.7);
          }
          to {
            transform: scaleY(1.3);
          }
        }
      `}</style>
    </div>
  );
}
