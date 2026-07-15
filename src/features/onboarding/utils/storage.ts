/**
 * frontend/src/features/onboarding/utils/storage.ts
 * LocalStorage wrapper for onboarding completion flag.
 */

const STORAGE_KEY = 'hasCompletedOnboarding';

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Storage unavailable — silently ignore
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — silently ignore
  }
}