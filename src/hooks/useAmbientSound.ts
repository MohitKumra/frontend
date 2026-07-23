import { useEffect, useRef } from 'react';

export type AmbientSound = 'Forest' | 'Rain' | 'Cafe' | 'Silence';

const SOUND_MAP: Record<AmbientSound, string> = {
  Forest: '/sounds/ambience/forest-ambience.mp3',
  Rain: '/sounds/ambience/rain-ambience.mp3',
  Cafe: '/sounds/ambience/cafe-ambience.mp3',
  Silence: '',
};

/**
 * Manages an HTML5 Audio element for ambient sound playback.
 *
 * - Audio element is created once on mount, destroyed on unmount
 * - Sound source is set immediately on mount (not just on change)
 * - Uses `canplaythrough` event to start playback after loading new src,
 *   preventing the "plays 2 sec then stops" issue
 * - Play/pause state is tracked via ref, so sound switches preserve it
 *
 * @param sound - The ambient sound key ('Forest', 'Rain', 'Cafe', 'Silence')
 * @param playing - Whether the sound should be playing
 * @param volume - Volume level 0-1 (default 0.3)
 */
export function useAmbientSound(
  sound: AmbientSound,
  playing: boolean,
  volume: number = 0.3,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(playing);
  const resumeHandlerRef = useRef<(() => void) | null>(null);

  // Keep playingRef in sync
  playingRef.current = playing;

  // Create audio element once on mount, destroy on unmount.
  // Also sets the initial src so playback works without needing a "sound change" to trigger.
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = volume;

    const src = SOUND_MAP[sound];
    if (src) {
      audio.src = src;
    }

    audioRef.current = audio;

    // If already playing on mount (e.g. state restored), start playback
    if (playing && src) {
      audio.play().catch(() => {});
    }

    return () => {
      // Clean up any pending canplaythrough handler
      if (resumeHandlerRef.current) {
        audio.removeEventListener('canplaythrough', resumeHandlerRef.current);
        resumeHandlerRef.current = null;
      }
      audio.pause();
      audio.src = '';
      audio.load();
      audioRef.current = null;
    };
    // Intentionally run only on mount/unmount. Sound/play changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap source when sound changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const src = SOUND_MAP[sound];

    // Clean up any previous canplaythrough handler
    if (resumeHandlerRef.current) {
      audio.removeEventListener('canplaythrough', resumeHandlerRef.current);
      resumeHandlerRef.current = null;
    }

    if (!src) {
      // Silence — stop playback and clear src
      audio.pause();
      audio.src = '';
      audio.load();
      return;
    }

    // Always set src and load when sound changes (even re-selecting same sound reloads it)
    audio.pause();

    // Set up a handler to resume playback once the new audio is loaded
    const resume = () => {
      if (playingRef.current && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      resumeHandlerRef.current = null;
    };

    resumeHandlerRef.current = resume;
    audio.addEventListener('canplaythrough', resume, { once: true });

    audio.src = src;
    audio.load();
  }, [sound]);

  // Handle play/pause — does NOT recreate the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (playing) {
      // If the audio has buffered enough, play immediately.
      // Otherwise the canplaythrough handler from the [sound] effect will start it.
      if (audio.readyState >= 3) {
        // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
    }
  }, [playing]);

  // Update volume without touching playback state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
}