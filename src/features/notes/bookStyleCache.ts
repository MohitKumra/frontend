// frontend/src/features/notes/bookStyleCache.ts
// Per-note reader-side book style cache (theme, font, fontSize) in localStorage
// so the book's inside pages open with the right appearance instantly on the
// same device, without a server round-trip. Changes are written here AND pushed
// to the backend so the cache stays in sync with what the user last customized.

import type { BookStyle } from '../../types';

/** localStorage key for a single note's cached book style. */
export function bookStyleCacheKey(noteId: string): string {
  return `note-book-style:${noteId}`;
}

/** Read a note's cached book style from localStorage (null if none/corrupt). */
export function getCachedBookStyle(noteId: string | null | undefined): BookStyle | null {
  if (!noteId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(bookStyleCacheKey(noteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookStyle | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist a note's book style to localStorage (best-effort, safe in private mode). */
export function setCachedBookStyle(
  noteId: string | null | undefined,
  bookStyle: BookStyle | null,
): void {
  if (!noteId || typeof localStorage === 'undefined') return;
  try {
    if (bookStyle) {
      localStorage.setItem(bookStyleCacheKey(noteId), JSON.stringify(bookStyle));
    } else {
      localStorage.removeItem(bookStyleCacheKey(noteId));
    }
  } catch {
    // Quota / private mode — cache is best-effort.
  }
}

/**
 * Resolve the effective book style for a note: localStorage cache first for
 * fast same-device reads, falling back to the value from the backend.
 */
export function resolveBookStyle(
  noteId: string | null | undefined,
  fromDb: BookStyle | null | undefined,
): BookStyle | null {
  return getCachedBookStyle(noteId) ?? (fromDb ?? null);
}
