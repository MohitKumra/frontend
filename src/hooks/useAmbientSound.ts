import { useEffect, useRef, useCallback } from 'react';

export type AmbientSound = 'Forest' | 'Rain' | 'Cafe' | 'Silence';

const SOUND_MAP: Record<AmbientSound, string> = {
  Forest: '/sounds/ambience/forest-ambience.mp3',
  Rain: '/sounds/ambience/rain-ambience.mp3',
  Cafe: '/sounds/ambience/cafe-ambience.mp3',
  Silence: '/sounds/ambience/night-ambience.mp3',
};

/**
 * Manages an HTML5 Audio element for ambient sound playback.
 * - Plays/loops the selected sound when `playing` is true
 * - Switches tracks when `sound` changes
 * - Cleans up on unmount
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
  const soundRef = useRef(sound);

  // Keep refs in sync for the cleanup effect
  playingRef.current = playing;
  soundRef.current = sound;

  // Effect for audio lifecycle
  useEffect(() => {
    const src = SOUND_MAP[sound];

    // Silence or no sound — do nothing
    if (!src) {
      // Stop any existing playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
      return;
    }

    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.preload = 'auto';
    }

    const audio = audioRef.current;

    // If the source changed, reload
    if (audio.src && !audio.src.endsWith(src)) {
      audio.pause();
      audio.src = src;
      audio.load();
    } else if (!audio.src) {
      audio.src = src;
      audio.load();
    }

    audio.volume = volume;

    if (playing) {
      audio.play().catch(() => {
        // Autoplay blocked — user needs to interact first
        // That's fine, the button click gives user gesture
      });
    } else {
      audio.pause();
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, [sound, playing, volume]);

  // Update volume without recreating the element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
}