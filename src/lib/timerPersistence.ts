/**
 * Timer persistence – saves and restores the focus timer state to localStorage
 * so it survives page refreshes, tab switches, and navigation within the app.
 */

const STORAGE_KEY = 'focus-timer-state';

export interface PersistedTimerState {
  mode: string;
  secondsLeft: number;
  running: boolean;
  startedAt: string | null;
  elapsedSeconds: number;
  selectedTaskId: string | null;
  /** ISO timestamp when this state was last persisted */
  savedAt: string;
}

export function saveTimerState(state: Omit<PersistedTimerState, 'savedAt'>): void {
  try {
    const payload: PersistedTimerState = { ...state, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or unavailable – silently ignore
  }
}

export function restoreTimerState(): PersistedTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimerState;
    // Validate required fields
    if (!parsed.mode || parsed.secondsLeft === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTimerState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}