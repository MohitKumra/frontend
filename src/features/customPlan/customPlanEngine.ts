// frontend/src/features/customPlan/customPlanEngine.ts
// Lightweight, data-driven question engine for the Custom Plan flow.
//
// One question is shown at a time. The NEXT question depends on previous
// answers, so irrelevant questions are skipped. When a user goes back and
// changes an answer, the engine recomputes the sequence and invalidates any
// answers that are no longer part of the flow (see `reconcileAnswers`).

import { availableBooleanFeatures, numericMeta } from './customPlanFeature';

export type Direction = 'limits' | 'features' | 'both' | 'unsure';

export type LimitLevelMode = 'keep' | 'x2' | 'x5' | 'x10' | 'custom';

export interface LimitChoice {
  mode: LimitLevelMode;
  /** Absolute requested value when mode === 'custom'. */
  value?: number;
}

export interface Answers {
  direction?: Direction;
  /** Numeric feature keys the user wants to raise. */
  limitAreas?: string[];
  /** Per-key chosen level for each selected limit area. */
  limitLevels?: Record<string, LimitChoice>;
  /** Boolean feature keys the user wants enabled. */
  featureSelections?: string[];
  goal?: string;
  hurdles?: string;
  otherNotes?: string;
}

export type QuestionId =
  | 'direction'
  | 'limitAreas'
  | `limitLevel:${string}`
  | 'featureSelection'
  | 'goal'
  | 'hurdles'
  | 'otherNotes';

export interface Question {
  id: QuestionId;
  title: string;
  description?: string;
  subtitle?: string;
  /** Marks it as skippable in the UI. */
  optional?: boolean;
  /** Defines which answer key this question contributes. */
  answers: keyof Answers | null;
}

// Fixed, non-branching tail question (always optional).
const COMMON_TAIL: Question[] = [
  {
    id: 'otherNotes',
    title: 'Anything else you\u2019d like us to know?',
    description: 'Optional — anything that doesn\u2019t fit the options above.',
    optional: true,
    answers: 'otherNotes',
  },
];

const FIRST_QUESTION: Question = {
  id: 'direction',
  title: 'What are you looking for in a custom plan?',
  description: 'We\u2019ll ask a few focused questions and build a request for you.',
  answers: 'direction',
};

/**
 * Computes the ordered sequence of questions for a given set of answers.
 * Pure, deterministic, and unit-testable.
 */
export function computeSequence(
  answers: Answers,
  currentFeatures: Record<string, unknown> = {}
): Question[] {
  const seq: Question[] = [FIRST_QUESTION];
  const dir = answers.direction;

  const needLimits = dir === 'limits' || dir === 'both';
  const needFeatures = dir === 'features' || dir === 'both';
  const needGuided = dir === 'unsure';

  if (needLimits) {
    seq.push({
      id: 'limitAreas',
      title: 'Which areas do you want more of?',
      description: 'Select everything you\u2019d like increased. We\u2019ll only ask about the ones you choose.',
      answers: 'limitAreas',
    });
    const areas = answers.limitAreas ?? [];
    for (const key of areas) {
      const meta = numericMeta(key);
      seq.push({
        id: `limitLevel:${key}` as QuestionId,
        title: `How much ${meta?.label.toLowerCase() ?? key} do you need?`,
        subtitle:
          currentFeatures[key] !== undefined && currentFeatures[key] !== -1
            ? `You currently have ${currentFeatures[key]}${meta?.suffix ?? ''}.`
            : undefined,
        answers: 'limitLevels',
      });
    }
  }

  if (needFeatures) {
    // Only offer boolean features not already unlocked by the current plan.
    const eligible = availableBooleanFeatures(currentFeatures);
    if (eligible.length > 0) {
      seq.push({
        id: 'featureSelection',
        title: eligible.length === 1 ? 'Is this feature useful to you?' : 'Which features would you like included?',
        description: eligible.length === 1 ? eligible[0].label : 'Select all that apply.',
        answers: 'featureSelections',
      });
    }
  }

  if (needGuided) {
    seq.push({
      id: 'goal',
      title: 'What are you trying to accomplish?',
      description: 'In your own words — this helps us understand what matters to you.',
      answers: 'goal',
    });
    seq.push({
      id: 'hurdles',
      title: 'Anything you\u2019re currently running into?',
      description: 'Optional — e.g. limits, missing workflows, or things that feel slow.',
      optional: true,
      answers: 'hurdles',
    });
  }

  seq.push(...COMMON_TAIL);
  return seq;
}
/**
 * Reconciles answers after a change: drops any answers whose questions no longer
 * appear in the recomputed sequence (use after going back and editing).
 */
export function reconcileAnswers(
  answers: Answers,
  currentFeatures: Record<string, unknown> = {}
): Answers {
  const ids = new Set<QuestionId>(computeSequence(answers, currentFeatures).map((q) => q.id));
  const next: Answers = { ...answers };

  const valueQuestions: Map<QuestionId, keyof Answers> = new Map([
    ['direction', 'direction'],
    ['limitAreas', 'limitAreas'],
    ['featureSelection', 'featureSelections'],
    ['goal', 'goal'],
    ['hurdles', 'hurdles'],
    ['otherNotes', 'otherNotes'],
  ]);

  for (const [qid, answerKey] of valueQuestions) {
    if (!ids.has(qid)) {
      delete next[answerKey];
    }
  }

  // Drop limit levels for areas no longer selected.
  if (next.limitLevels) {
    const kept: Record<string, LimitChoice> = {};
    for (const key of next.limitAreas ?? []) {
      if (next.limitLevels[key]) kept[key] = next.limitLevels[key];
    }
    next.limitLevels = kept;
    if (Object.keys(kept).length === 0) delete next.limitLevels;
  }

  return next;
}

/**
 * Builds the payload to submit to POST /api/custom-plans.
 * Limits are stored as absolute requested values (multipler applied here);
 * feature selections as canonical boolean keys. The server revalidates all of it.
 */
export function buildPayload(
  answers: Answers,
  currentFeatures: Record<string, unknown> = {}
): {
  requestedFeatures: Record<string, boolean>;
  requestedLimits: Record<string, number>;
  requirements: { goal?: string; hurdles?: string; otherNotes?: string };
} {
  const requestedFeatures: Record<string, boolean> = {};
  for (const key of answers.featureSelections ?? []) {
    requestedFeatures[key] = true;
  }

  const requestedLimits: Record<string, number> = {};
  const levels = answers.limitLevels ?? {};
  for (const key of answers.limitAreas ?? []) {
    const choice = levels[key];
    if (!choice) continue;
    const current = typeof currentFeatures[key] === 'number' ? (currentFeatures[key] as number) : 50;
    if (choice.mode === 'custom') {
      if (typeof choice.value === 'number' && choice.value > 0) {
        requestedLimits[key] = Math.round(choice.value);
      }
    } else if (choice.mode === 'keep') {
      // A "keep as is" selection means no change — skip it so the request stays clean.
      continue;
    } else if (current > 0 && current !== -1) {
      const mult = { x2: 2, x5: 5, x10: 10 }[choice.mode];
      if (mult) requestedLimits[key] = current * mult;
    } else {
      // Sentinel/unlimited baseline — request an explicit common value.
      const base: Record<string, number> = {
        aiRequestsPerMonth: 1000,
        projects: 10,
        habits: 20,
        tasks: 500,
        storageMb: 1000,
        notes: -1,
        journals: -1,
      };
      const mult = { x2: 2, x5: 5, x10: 10 }[choice.mode];
      const b = base[key] ?? 1000;
      requestedLimits[key] = b === -1 ? -1 : b * mult;
    }
  }

  const requirements: { goal?: string; hurdles?: string; otherNotes?: string } = {};
  if (answers.goal?.trim()) requirements.goal = answers.goal.trim();
  if (answers.hurdles?.trim()) requirements.hurdles = answers.hurdles.trim();
  if (answers.otherNotes?.trim()) requirements.otherNotes = answers.otherNotes.trim();

  return { requestedFeatures, requestedLimits, requirements };
}

/** Returns the feature key for a `limitLevel:<key>` question id, else null. */
export function limitKeyOf(qid: QuestionId): string | null {
  if (qid.startsWith('limitLevel:')) return qid.slice('limitLevel:'.length);
  return null;
}

/** Returns the key of the last answered question in the sequence, if any. */
export function lastAnsweredStep(sequence: Question[], answers: Answers): number {
  for (let i = sequence.length - 1; i >= 0; i--) {
    const q = sequence[i];
    if (q.answers && answers[q.answers] !== undefined) return i;
  }
  return -1;
}