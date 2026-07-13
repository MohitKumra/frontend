// Layout switching helpers for the global app shell.
// Settings can drive compact/comfortable/expanded presentation across the UI.

export type LayoutPreference = 'COMPACT' | 'COMFORTABLE' | 'EXPANDED';

export function applyLayoutPreference(layout: LayoutPreference): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-layout', layout.toLowerCase());
}
