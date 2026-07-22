/**
 * Timer persistence – saves and restores the focus timer state to localStorage
 * so it survives page refreshes, tab switches, and navigation within the app.
 *
 * Each timer mode (focus, short_break, long_break) is stored under its own key
 * so switching modes preserves each mode's independent progress.
 */

const STORAGE_PREFIX = 'focus-timer-state-';

export type TimerMode = 'focus' | 'short_break' | 'long_break';

export interface PersistedTimerState {
  mode: string;
  secondsLeft: number;
  running: boolean;
  startedAt: string | null;
  elapsedSeconds: number;
  selectedTaskId: string | null;
  selectedProjectId?: string | null;
  /** ISO timestamp when this state was last persisted */
  savedAt: string;
}

function getStorageKey(mode: TimerMode): string {
  return `${STORAGE_PREFIX}${mode}`;
}

export function saveTimerState(state: Omit<PersistedTimerState, 'savedAt'>): void {
  try {
    const payload: PersistedTimerState = { ...state, savedAt: new Date().toISOString() };
    localStorage.setItem(getStorageKey(state.mode as TimerMode), JSON.stringify(payload));
  } catch {
    // localStorage may be full or unavailable – silently ignore
  }
}

export function restoreTimerState(mode: TimerMode): PersistedTimerState | null {
  try {
    const raw = localStorage.getItem(getStorageKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimerState;
    // Validate required fields
    if (!parsed.mode || parsed.secondsLeft === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTimerState(mode: TimerMode): void {
  try {
    localStorage.removeItem(getStorageKey(mode));
  } catch {
    // ignore
  }
}
