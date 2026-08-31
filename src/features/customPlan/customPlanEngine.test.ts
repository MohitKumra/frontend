// frontend/src/features/customPlan/customPlanEngine.test.ts
// Unit tests for the data-driven question engine: branching, dependent-answer
// invalidation, and payload building.

import { describe, it, expect } from 'vitest';
import {
  computeSequence,
  reconcileAnswers,
  buildPayload,
  limitKeyOf,
} from './customPlanEngine';
import type { Answers } from './customPlanEngine';

// Simulates a Free-plan feature map for a typical user.
const FREE_FEATURES: Record<string, unknown> = {
  aiRequestsPerMonth: 50,
  projects: 3,
  habits: 5,
  tasks: 100,
  storageMb: 100,
  notes: 10,
  journals: 5,
  aiCoach: false,
  goals: false,
  focusAdvanced: false,
  notionSync: false,
  voiceNotes: false,
  calendarSync: false,
};

describe('computeSequence: first question is always direction', () => {
  it('starts with the direction question', () => {
    const seq = computeSequence({}, FREE_FEATURES);
    expect(seq[0].id).toBe('direction');
  });
});

describe('computeSequence: limits branch', () => {
  it('asks limitAreas then one limitLevel question per selected area', () => {
    const answers: Answers = { direction: 'limits', limitAreas: ['projects', 'storageMb'] };
    const ids = computeSequence(answers, FREE_FEATURES).map((q) => q.id);
    expect(ids).toContain('limitAreas');
    expect(ids).toContain('limitLevel:projects');
    expect(ids).toContain('limitLevel:storageMb');
  });

  it('does NOT ask about features in the limits branch', () => {
    const answers: Answers = { direction: 'limits' };
    const ids = computeSequence(answers, FREE_FEATURES).map((q) => q.id);
    expect(ids).not.toContain('featureSelection');
  });

  it('skips limit-level questions whose area is not selected', () => {
    const answers: Answers = { direction: 'limits', limitAreas: ['tasks'] };
    const ids = computeSequence(answers, FREE_FEATURES).map((q) => q.id);
    expect(ids).toContain('limitLevel:tasks');
    expect(ids).not.toContain('limitLevel:projects');
  });

  it('always ends with the optional otherNotes tail', () => {
    const seq = computeSequence({ direction: 'limits', limitAreas: ['tasks'] }, FREE_FEATURES);
    expect(seq[seq.length - 1].id).toBe('otherNotes');
  });
});

describe('computeSequence: features branch', () => {
  it('offers featureSelection for features not already unlocked', () => {
    const seq = computeSequence({ direction: 'features' }, FREE_FEATURES);
    const ids = seq.map((q) => q.id);
    expect(ids).toContain('featureSelection');
    expect(ids).not.toContain('limitAreas');
  });

  it('skips featureSelection when every boolean feature is already unlocked', () => {
    const allUnlocked: Record<string, unknown> = {
      aiCoach: true,
      goals: true,
      focusAdvanced: true,
      notionSync: true,
      voiceNotes: true,
      calendarSync: true,
    };
    const ids = computeSequence({ direction: 'features' }, allUnlocked).map((q) => q.id);
    expect(ids).not.toContain('featureSelection');
  });

  it('does NOT ask about limits in the features branch', () => {
    const ids = computeSequence({ direction: 'features' }, FREE_FEATURES).map((q) => q.id);
    expect(ids).not.toContain('limitAreas');
  });
});

describe('computeSequence: both branch', () => {
  it('asks about both limits and features', () => {
    const answers: Answers = { direction: 'both', limitAreas: ['habits'] };
    const ids = computeSequence(answers, FREE_FEATURES).map((q) => q.id);
    expect(ids).toContain('limitAreas');
    expect(ids).toContain('featureSelection');
  });
});

describe('computeSequence: unsure branch', () => {
  it('asks simple goal/hurdles questions', () => {
    const ids = computeSequence({ direction: 'unsure' }, FREE_FEATURES).map((q) => q.id);
    expect(ids).toContain('goal');
    expect(ids).toContain('hurdles');
    expect(ids).not.toContain('limitAreas');
    expect(ids).not.toContain('featureSelection');
  });
});

describe('computeSequence: Ultimate user', () => {
  it('focuses on what they need beyond the top plan', () => {
    const ultimate: Record<string, unknown> = {
      aiRequestsPerMonth: 25000,
      projects: 500,
      habits: 500,
      storageMb: 25000,
      aiCoach: true,
      goals: true,
      focusAdvanced: true,
      voiceNotes: true,
      calendarSync: true,
      notionSync: true,
    };
    const ids = computeSequence({ direction: 'features' }, ultimate).map((q) => q.id);
    expect(ids).not.toContain('featureSelection');
    expect(ids).toContain('otherNotes');
  });
});
describe('reconcileAnswers: dependent invalidation', () => {
  it('clears limit levels when their area is deselected', () => {
    const before: Answers = {
      direction: 'limits',
      limitAreas: ['projects', 'tasks'],
      limitLevels: { projects: { mode: 'x2' }, tasks: { mode: 'x5' } },
    };
    const after = reconcileAnswers({ ...before, limitAreas: ['projects'] }, FREE_FEATURES);
    expect(after.limitAreas).toEqual(['projects']);
    expect(after.limitLevels).toEqual({ projects: { mode: 'x2' } });
  });

  it('clears all limits when the direction no longer needs them', () => {
    const before: Answers = {
      direction: 'limits',
      limitAreas: ['projects'],
      limitLevels: { projects: { mode: 'x2' } },
    };
    const after = reconcileAnswers({ ...before, direction: 'features' }, FREE_FEATURES);
    expect(after.direction).toBe('features');
    expect(after.limitAreas).toBeUndefined();
    expect(after.limitLevels).toBeUndefined();
  });

  it('clears feature selections when switching away from a features branch', () => {
    const before: Answers = { direction: 'both', featureSelections: ['aiCoach', 'goals'] };
    const after = reconcileAnswers({ ...before, direction: 'limits' }, FREE_FEATURES);
    expect(after.featureSelections).toBeUndefined();
  });

  it('preserves independent answers when navigating back', () => {
    const answers: Answers = {
      direction: 'limits',
      limitAreas: ['projects'],
      limitLevels: { projects: { mode: 'x5' } },
    };
    expect(reconcileAnswers(answers, FREE_FEATURES)).toEqual(answers);
  });
});

describe('buildPayload', () => {
  it('applies multipliers to current limits for x-modes', () => {
    const answers: Answers = {
      direction: 'limits',
      limitAreas: ['projects', 'storageMb'],
      limitLevels: { projects: { mode: 'x2' }, storageMb: { mode: 'x5' } },
    };
    const payload = buildPayload(answers, FREE_FEATURES);
    expect(payload.requestedLimits).toEqual({ projects: 6, storageMb: 500 });
  });

  it('uses exact values for custom mode', () => {
    const answers: Answers = {
      direction: 'limits',
      limitAreas: ['aiRequestsPerMonth'],
      limitLevels: { aiRequestsPerMonth: { mode: 'custom', value: 8000 } },
    };
    const payload = buildPayload(answers, FREE_FEATURES);
    expect(payload.requestedLimits.aiRequestsPerMonth).toBe(8000);
  });

  it('skips "keep as is" selections (no no-op limits)', () => {
    const answers: Answers = {
      direction: 'limits',
      limitAreas: ['projects'],
      limitLevels: { projects: { mode: 'keep' } },
    };
    const payload = buildPayload(answers, FREE_FEATURES);
    expect(Object.keys(payload.requestedLimits).length).toBe(0);
  });

  it('maps feature selections to canonical keys', () => {
    const answers: Answers = { direction: 'features', featureSelections: ['aiCoach', 'notionSync'] };
    const payload = buildPayload(answers, FREE_FEATURES);
    expect(payload.requestedFeatures).toEqual({ aiCoach: true, notionSync: true });
  });

  it('captures requirements text', () => {
    const answers: Answers = {
      direction: 'unsure',
      goal: '  manage a team roster  ',
      hurdles: '',
      otherNotes: 'need more storage',
    };
    const payload = buildPayload(answers, FREE_FEATURES);
    expect(payload.requirements).toEqual({ goal: 'manage a team roster', otherNotes: 'need more storage' });
  });
});

describe('limitKeyOf', () => {
  it('extracts the feature key from a limit-level question id', () => {
    expect(limitKeyOf('limitLevel:projects')).toBe('projects');
    expect(limitKeyOf('direction')).toBeNull();
  });
});