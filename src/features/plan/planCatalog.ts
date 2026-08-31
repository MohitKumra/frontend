// frontend/src/features/plan/planCatalog.ts
// SINGLE SOURCE OF TRUTH for plan feature metadata on the frontend.
//
// Every feature key, label, hint, and unit suffix lives here. Consumers
// (PlanCard, AdminPlansPage, AdminAuditLogPage, Custom Plan wizard) import from
// this one file so adding or updating a feature is a single-file change.

export type FeatureKind = 'numeric' | 'boolean';

export const NUMERIC_FEATURE_KEYS = [
  'aiRequestsPerMonth',
  'projects',
  'habits',
  'tasks',
  'storageMb',
  'notes',
  'journals',
] as const;

export type NumericFeatureKey = (typeof NUMERIC_FEATURE_KEYS)[number];

export const BOOLEAN_FEATURE_KEYS = [
  'aiCoach',
  'goals',
  'focusAdvanced',
  'notionSync',
  'voiceNotes',
  'calendarSync',
] as const;

export type BooleanFeatureKey = (typeof BOOLEAN_FEATURE_KEYS)[number];

export interface FeatureMeta {
  key: string;
  label: string;
  hint: string;
  kind: FeatureKind;
  /** Optional unit suffix for numeric values, e.g. " MB" or " / month". */
  suffix?: string;
  default?: number | boolean;
}

/** Numeric, per-user quota features. */
export const NUMERIC_FEATURES: FeatureMeta[] = [
  { key: 'aiRequestsPerMonth', label: 'AI requests / month', hint: 'AI assistant calls per month', kind: 'numeric', suffix: ' / mo', default: 0 },
  { key: 'projects', label: 'Active projects', hint: 'Maximum active projects', kind: 'numeric', default: 3 },
  { key: 'habits', label: 'Habit trackers', hint: 'Maximum active habit trackers', kind: 'numeric', default: 5 },
  { key: 'tasks', label: 'Tasks', hint: 'Maximum active tasks', kind: 'numeric', default: 100 },
  { key: 'storageMb', label: 'Storage', hint: 'File storage allowance', kind: 'numeric', suffix: ' MB', default: 100 },
  { key: 'notes', label: 'Notes', hint: 'Max notes; -1 for unlimited', kind: 'numeric', default: 10 },
  { key: 'journals', label: 'Journal entries', hint: 'Max journal entries; -1 for unlimited', kind: 'numeric', default: 5 },
];

/** Boolean (on/off) entitlement features. */
export const BOOLEAN_FEATURES: FeatureMeta[] = [
  { key: 'aiCoach', label: 'AI Coach', hint: 'Personal AI productivity coach across the app', kind: 'boolean', default: false },
  { key: 'goals', label: 'Goals', hint: 'Create and manage goals plus the AI goal planner', kind: 'boolean', default: false },
  { key: 'focusAdvanced', label: 'Advanced Focus', hint: 'Custom timer durations + link tasks/goals/projects to the timer', kind: 'boolean', default: false },
  { key: 'notionSync', label: 'Notion sync', hint: 'Sync tasks & notes with Notion', kind: 'boolean', default: false },
  { key: 'voiceNotes', label: 'Voice notes', hint: 'Record and transcribe voice notes', kind: 'boolean', default: false },
  { key: 'calendarSync', label: 'Google Calendar sync', hint: 'Sync tasks with Google Calendar', kind: 'boolean', default: false },
];

/** Human label lookup keyed by feature key. */
export const FEATURE_LABELS: Record<string, string> = {
  ...Object.fromEntries(NUMERIC_FEATURES.map((f) => [f.key, f.label])),
  ...Object.fromEntries(BOOLEAN_FEATURES.map((f) => [f.key, f.label])),
};

export const FEATURE_LABEL = FEATURE_LABELS;

export function numericMeta(key: string): FeatureMeta | undefined {
  return NUMERIC_FEATURES.find((f) => f.key === key);
}

export function booleanMeta(key: string): FeatureMeta | undefined {
  return BOOLEAN_FEATURES.find((f) => f.key === key);
}

/** Human label for a feature key, falling back to the raw key. */
export function featureLabel(key: string): string {
  return FEATURE_LABELS[key] || key;
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
