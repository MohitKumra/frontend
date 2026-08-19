// frontend/src/features/notes/coverStyleCache.ts
// Per-note cover style cache in localStorage so the book cover (font, color,
// size, template, etc.) opens instantly on the same device without a server
// round-trip. Changes are written here AND pushed to the backend, so the cache
// stays in sync with what the user last customized.

import type { CoverStyle } from '../../types';

/** localStorage key for a single note's cached cover style. */
export function coverStyleCacheKey(noteId: string): string {
  return `note-cover-style:${noteId}`;
}

/** Read a note's cached cover style from localStorage (null if none/corrupt). */
export function getCachedCoverStyle(noteId: string | null | undefined): CoverStyle | null {
  if (!noteId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(coverStyleCacheKey(noteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoverStyle | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist a note's cover style to localStorage (best-effort, safe in private mode). */
export function setCachedCoverStyle(
  noteId: string | null | undefined,
  coverStyle: CoverStyle | null,
): void {
  if (!noteId || typeof localStorage === 'undefined') return;
  try {
    if (coverStyle) {
      localStorage.setItem(coverStyleCacheKey(noteId), JSON.stringify(coverStyle));
    } else {
      localStorage.removeItem(coverStyleCacheKey(noteId));
    }
  } catch {
    // Quota / private mode — cache is best-effort.
  }
}

/**
 * Resolve the effective cover style for a note: localStorage cache first for
 * fast same-device reads, falling back to the value from the backend.
 */
export function resolveCoverStyle(
  noteId: string | null | undefined,
  fromDb: CoverStyle | null | undefined,
): CoverStyle | null {
  return getCachedCoverStyle(noteId) ?? (fromDb ?? null);
}
