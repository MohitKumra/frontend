import { useEffect, useRef, useState, useCallback } from 'react';

export type AmbientSound = 'Forest' | 'Rain' | 'Ocean' | 'Silence';

const SOUND_MAP: Record<AmbientSound, string> = {
  Forest: '/sounds/ambience/forest-ambience.mp3',
  Rain: '/sounds/ambience/rain-ambience.mp3',
  Ocean: '/sounds/ambience/ocean-ambience.mp3',
  Silence: '/sounds/ambience/night-ambience.mp3',
};

const CROSSFADE_DURATION_MS = 300;
const FADE_STEPS = 10;
const FADE_INTERVAL_MS = CROSSFADE_DURATION_MS / FADE_STEPS;

/**
 * Manages an HTML5 Audio element for ambient sound playback.
 *
 * Key improvements over previous version:
 * - Uses `canplay` (readyState >= 2) instead of `canplaythrough` for near-instant start
 * - Exposes `loading` state for visual feedback while audio buffers
 * - Pre-warms audio on mount by calling `load()` immediately
 * - Smooth crossfade when switching between sound modes
 * - Tracks `error` state for graceful degradation
 *
 * @param sound - The ambient sound key ('Forest', 'Rain', 'ocean', 'Silence')
 * @param playing - Whether the sound should be playing
 * @param volume - Volume level 0-1 (default 0.3)
 * @returns {{ loading: boolean; error: boolean }}
 */
export function useAmbientSound(
  sound: AmbientSound,
  playing: boolean,
  volume: number = 0.3,
): { loading: boolean; error: boolean } {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(playing);
  const targetVolumeRef = useRef(volume);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canPlayHandlerRef = useRef<(() => void) | null>(null);
  const errorHandlerRef = useRef<((e: Event) => void) | null>(null);
  const stalledHandlerRef = useRef<((e: Event) => void) | null>(null);
  const waitingHandlerRef = useRef<((e: Event) => void) | null>(null);

  // Keep refs in sync
  playingRef.current = playing;
  targetVolumeRef.current = volume;

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const cleanupHandlers = useCallback((audio: HTMLAudioElement) => {
    if (canPlayHandlerRef.current) {
      audio.removeEventListener('canplay', canPlayHandlerRef.current);
      canPlayHandlerRef.current = null;
    }
    if (errorHandlerRef.current) {
      audio.removeEventListener('error', errorHandlerRef.current);
      errorHandlerRef.current = null;
    }
    if (stalledHandlerRef.current) {
      audio.removeEventListener('stalled', stalledHandlerRef.current);
      stalledHandlerRef.current = null;
    }
    if (waitingHandlerRef.current) {
      audio.removeEventListener('waiting', waitingHandlerRef.current);
      waitingHandlerRef.current = null;
    }
  }, []);

  const fadeVolume = useCallback((from: number, to: number, callback?: () => void) => {
    clearFadeTimer();
    const audio = audioRef.current;
    if (!audio) {
      callback?.();
      return;
    }

    const step = (to - from) / FADE_STEPS;
    let currentStep = 0;

    audio.volume = from;

    fadeTimerRef.current = setInterval(() => {
      currentStep++;
      if (!audioRef.current) {
        clearFadeTimer();
        return;
      }
      if (currentStep >= FADE_STEPS) {
        audioRef.current.volume = to;
        clearFadeTimer();
        callback?.();
      } else {
        audioRef.current.volume = from + step * currentStep;
      }
    }, FADE_INTERVAL_MS);
  }, [clearFadeTimer]);

  const startPlayback = useCallback((audio: HTMLAudioElement) => {
    audio.play().catch((err) => {
      // Autoplay may be blocked — this is expected on first interaction
      if (err.name !== 'AbortError') {
        setError(true);
      }
    });
  }, []);

  // Create audio element once on mount, destroy on unmount
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = volume;

    const src = SOUND_MAP[sound];
    if (src) {
      audio.src = src;
      // Pre-warm: start loading immediately
      audio.load();
      setLoading(true);
    }

    audioRef.current = audio;

    // Set up canplay handler for initial load
    const onCanPlay = () => {
      setLoading(false);
      setError(false);
      if (playingRef.current && audioRef.current) {
        startPlayback(audioRef.current);
      }
    };
    const onError = () => {
      setLoading(false);
      setError(true);
    };
    const onStalled = () => {
      // Keep loading state true if we're still waiting
      if (playingRef.current) setLoading(true);
    };
    const onWaiting = () => {
      if (playingRef.current) setLoading(true);
    };

    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('waiting', onWaiting);

    canPlayHandlerRef.current = onCanPlay;
    errorHandlerRef.current = onError;
    stalledHandlerRef.current = onStalled;
    waitingHandlerRef.current = onWaiting;

    return () => {
      clearFadeTimer();
      cleanupHandlers(audio);
      audio.pause();
      audio.src = '';
      audio.load();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap source when sound changes — with crossfade
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const src = SOUND_MAP[sound];

    // Clean up previous handlers
    cleanupHandlers(audio);

    if (!src) {
      // Silence — fade out and stop
      fadeVolume(audio.volume, 0, () => {
        audio.pause();
        audio.src = '';
        audio.load();
        setLoading(false);
      });
      return;
    }

    // Fade out current audio, then switch source and fade in
    setLoading(true);
    setError(false);

    const onCanPlay = () => {
      setLoading(false);
      setError(false);
      // Fade in to target volume
      fadeVolume(0, targetVolumeRef.current, () => {
        if (playingRef.current && audioRef.current) {
          // Ensure it's still playing after fade-in
          if (audioRef.current.paused) {
            startPlayback(audioRef.current);
          }
        }
      });
    };
    const onError = () => {
      setLoading(false);
      setError(true);
    };
    const onStalled = () => {
      if (playingRef.current) setLoading(true);
    };
    const onWaiting = () => {
      if (playingRef.current) setLoading(true);
    };

    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('waiting', onWaiting);

    canPlayHandlerRef.current = onCanPlay;
    errorHandlerRef.current = onError;
    stalledHandlerRef.current = onStalled;
    waitingHandlerRef.current = onWaiting;

    // Fade out, then switch src
    fadeVolume(audio.volume, 0, () => {
      if (!audioRef.current) return;
      audio.pause();
      audio.src = src;
      audio.load();
      // If we should be playing, start immediately (canplay will handle volume fade-in)
      if (playingRef.current) {
        // Try playing right away — browser may have enough data cached
        startPlayback(audio);
      }
    });

    return () => {
      cleanupHandlers(audio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound]);

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (playing) {
      setError(false);
      // If audio is ready enough, play immediately
      if (audio.readyState >= 2) {
        // HAVE_CURRENT_DATA or better
        startPlayback(audio);
        // Fade to target volume if we're faded out (e.g. after crossfade)
        if (audio.volume < targetVolumeRef.current * 0.9) {
          fadeVolume(audio.volume, targetVolumeRef.current);
        }
      } else {
        // Not ready yet — loading state is already set by waiting/stalled handlers
        setLoading(true);
      }
    } else {
      // Pause: fade out quickly then pause
      fadeVolume(audio.volume, 0, () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.volume = targetVolumeRef.current;
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Update volume without touching playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    targetVolumeRef.current = volume;
    // Only set volume directly if not in a fade transition
    if (!fadeTimerRef.current) {
      audio.volume = volume;
    }
  }, [volume]);

  return { loading, error };
}