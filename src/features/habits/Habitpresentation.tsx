import type { LucideIcon } from 'lucide-react';
import { Droplet, Dumbbell, BookOpen, Brain, Moon, Target } from 'lucide-react';
import type { HabitDTO } from '../../types';

/**
 * Presentation layer for habits.
 *
 * Category is derived from the title (no backend field for it, but it's a
 * pure function of real user input, not fabricated). Everything about
 * streaks, week pattern, and heatmap now comes straight from the API —
 * see HabitDTO.bestStreak / weekPattern / heatmap, computed server-side
 * from actual HabitCompletion rows.
 */

export interface CategoryMeta {
  key: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  description: string;
}

const CATEGORIES: Record<string, CategoryMeta> = {
  health: {
    key: 'health',
    name: 'Health',
    icon: Droplet,
    color: 'var(--color-info)',
    bg: 'var(--icon-bg-info)',
    description: 'Stay hydrated and healthy',
  },
  fitness: {
    key: 'fitness',
    name: 'Fitness',
    icon: Dumbbell,
    color: 'var(--color-danger)',
    bg: 'var(--icon-bg-danger)',
    description: 'Build strength and consistency',
  },
  learning: {
    key: 'learning',
    name: 'Learning',
    icon: BookOpen,
    color: 'var(--color-accent)',
    bg: 'var(--icon-bg-accent)',
    description: 'Expand your mind',
  },
  mindfulness: {
    key: 'mindfulness',
    name: 'Mindfulness',
    icon: Brain,
    color: 'var(--color-success)',
    bg: 'var(--icon-bg-success, var(--icon-bg-info))',
    description: 'Find your center',
  },
  rest: {
    key: 'rest',
    name: 'Rest',
    icon: Moon,
    color: 'var(--color-info)',
    bg: 'var(--icon-bg-info)',
    description: 'Recharge and recover',
  },
  productivity: {
    key: 'productivity',
    name: 'Productivity',
    icon: Target,
    color: 'var(--color-warning)',
    bg: 'var(--icon-bg-warning, var(--icon-bg-danger))',
    description: 'Build strength and consistency',
  },
};

const KEYWORD_MAP: [RegExp, string][] = [
  [/water|drink|hydrat|vitamin|skincare|floss/i, 'health'],
  [/run|gym|workout|exercise|walk|lift|yoga|stretch|swim/i, 'fitness'],
  [/read|book|study|learn|course|language|write|journal.*idea/i, 'learning'],
  [/meditat|mindful|journal|gratitude|breath/i, 'mindfulness'],
  [/sleep|bed|wake/i, 'rest'],
];

export function getCategory(title: string): CategoryMeta {
  for (const [regex, key] of KEYWORD_MAP) {
    if (regex.test(title)) return CATEGORIES[key];
  }
  return CATEGORIES.productivity;
}

export const CATEGORY_LIST: CategoryMeta[] = Object.values(CATEGORIES);

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface WeekPatternDay {
  label: string;
  done: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** Turns the API's real boolean[7] (Mon..Sun) into display-ready days. */
export function buildWeekPattern(days: boolean[]): WeekPatternDay[] {
  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0
  return DAY_LABELS.map((label, i) => ({
    label,
    done: days[i] ?? false,
    isToday: i === todayIdx,
    isFuture: i > todayIdx,
  }));
}

export interface Achievement {
  label: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  color: string;
}

/** Purely a threshold lookup on a real streak number — not fabricated. */
export function getAchievement(streak: number): Achievement | null {
  if (streak >= 100) return { label: '100 Day Legend', tier: 'platinum', color: 'var(--color-accent)' };
  if (streak >= 30) return { label: '30 Day Streak', tier: 'gold', color: 'var(--color-warning)' };
  if (streak >= 7) return { label: '7 Day Streak', tier: 'silver', color: 'var(--color-info)' };
  if (streak >= 3) return { label: 'Getting Started', tier: 'bronze', color: 'var(--color-success)' };
  return null;
}
