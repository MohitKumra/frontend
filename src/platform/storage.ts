// frontend/src/platform/storage.ts
// Abstraction over browser storage vs Capacitor Preferences.
// Components and stores always import from here — never call localStorage directly.
// When Capacitor is added, swap the implementation here; business logic is unchanged.

/** Whether we're running inside a Capacitor native shell. */
function isNative(): boolean {
  // Safe to call in browser — Capacitor injects this global when native
  return typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    ?.isNativePlatform === 'function'
    ? (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform()
    : false;
}

export async function storageGet(key: string): Promise<string | null> {
  if (isNative()) {
    // TODO(capacitor): const { value } = await Preferences.get({ key }); return value;
  }
  return localStorage.getItem(key);
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (isNative()) {
    // TODO(capacitor): await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

export async function storageRemove(key: string): Promise<void> {
  if (isNative()) {
    // TODO(capacitor): await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}
