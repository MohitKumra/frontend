// frontend/src/features/customPlan/customPlanFeature.ts
// Display metadata for the Custom Plan flow, keyed against the SAME canonical
// feature keys stored on Plan.features (the authoritative source edited via
// Admin → Plans). This is only vocabulary for rendering questions — availability
// comes from the user's resolved plan and the server always revalidates.

export type FeatureKind = 'numeric' | 'boolean';

export interface FeatureMeta {
  key: string;
  label: string;
  hint: string;
  kind: FeatureKind;
  /** Optional unit suffix for numeric values, e.g. " MB". */
  suffix?: string;
}

/** Numeric, per-user quota features. */
export const NUMERIC_FEATURES: FeatureMeta[] = [
  { key: 'aiRequestsPerMonth', label: 'AI requests', hint: 'AI assistant calls each month', kind: 'numeric', suffix: ' / month' },
  { key: 'projects', label: 'Projects', hint: 'Active project workspaces', kind: 'numeric' },
  { key: 'habits', label: 'Habits', hint: 'Active habit trackers', kind: 'numeric' },
  { key: 'tasks', label: 'Tasks', hint: 'Active tasks', kind: 'numeric' },
  { key: 'storageMb', label: 'Storage', hint: 'File storage allowance', kind: 'numeric', suffix: ' MB' },
  { key: 'notes', label: 'Notes', hint: 'Notes you can keep', kind: 'numeric' },
  { key: 'journals', label: 'Journal entries', hint: 'Journal entries you can keep', kind: 'numeric' },
];

/** Boolean (on/off) entitlement features. */
export const BOOLEAN_FEATURES: FeatureMeta[] = [
  { key: 'aiCoach', label: 'AI Coach', hint: 'Personal AI productivity coach across the app', kind: 'boolean' },
  { key: 'goals', label: 'Goals', hint: 'Goals plus the AI goal planner', kind: 'boolean' },
  { key: 'focusAdvanced', label: 'Advanced Focus', hint: 'Custom timer durations + link tasks/goals/projects', kind: 'boolean' },
  { key: 'notionSync', label: 'Notion sync', hint: 'Sync tasks & notes with Notion', kind: 'boolean' },
  { key: 'voiceNotes', label: 'Voice notes', hint: 'Record and transcribe voice notes', kind: 'boolean' },
  { key: 'audioRecurrence', label: 'Audio recurrence', hint: 'Voice-scheduled recurring tasks', kind: 'boolean' },
];

/** Human label lookup keyed by feature key. */
export const FEATURE_LABEL: Record<string, string> = {
  ...Object.fromEntries(NUMERIC_FEATURES.map((f) => [f.key, f.label])),
  ...Object.fromEntries(BOOLEAN_FEATURES.map((f) => [f.key, f.label])),
};

export function numericMeta(key: string): FeatureMeta | undefined {
  return NUMERIC_FEATURES.find((f) => f.key === key);
}

export function booleanMeta(key: string): FeatureMeta | undefined {
  return BOOLEAN_FEATURES.find((f) => f.key === key);
}

/**
 * Boolean features the current plan does NOT already enable — i.e. candidates
 * the user could request. `features` is the effective plan's feature map.
 */
export function availableBooleanFeatures(features: Record<string, unknown> = {}): FeatureMeta[] {
  return BOOLEAN_FEATURES.filter((f) => features[f.key] !== true);
}

/**
 * Numeric features the user can ask to raise. All numeric keys are eligible.
 */
export function availableNumericFeatures(): FeatureMeta[] {
  return NUMERIC_FEATURES;
}

/** Formats a numeric limit for display: "Unlimited" for -1, otherwise the value (with suffix). */
export function formatLimit(key: string, value: number): string {
  const meta = numericMeta(key);
  const suffix = meta?.suffix ?? '';
  if (value === -1) return 'Unlimited';
  return `${value}${suffix}`;
}