import {
  BookOpen,
  Brain,
  Briefcase,
  CheckCircle2,
  Code2,
  DollarSign,
  Flame,
  FolderKanban,
  Globe,
  GraduationCap,
  Heart,
  Lightbulb,
  Rocket,
  Settings,
  Sparkles,
  Star,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shared registry of selectable goal icons, keyed by the same `icon` value
 * that is persisted on a goal. `GoalFormModal` uses the choices to render the
 * picker, and `GoalCardView` uses the map to resolve a goal's explicit icon.
 *
 * A "None" sentinel is intentionally NOT part of this map — when a goal has no
 * explicit icon (or icon === 'none'), consumers fall back to deriving the icon
 * from the goal's category/title keywords.
 */
export const GOAL_ICONS: Record<string, LucideIcon> = {
  target: Target,
  rocket: Rocket,
  brain: Brain,
  'book-open': BookOpen,
  flame: Flame,
  'folder-kanban': FolderKanban,
  'check-square': CheckCircle2,
  trophy: Trophy,
  'dollar-sign': DollarSign,
  lightbulb: Lightbulb,
  graduation: GraduationCap,
  briefcase: Briefcase,
  code2: Code2,
  heart: Heart,
  globe: Globe,
  star: Star,
  settings: Settings,
  sparkles: Sparkles,
};

export type GoalIconChoice = { value: string; label: string; icon: LucideIcon };

export const GOAL_ICON_CHOICES: GoalIconChoice[] = [
  { value: 'target', label: 'Target', icon: Target },
  { value: 'rocket', label: 'Rocket', icon: Rocket },
  { value: 'brain', label: 'Brain', icon: Brain },
  { value: 'book-open', label: 'Book', icon: BookOpen },
  { value: 'flame', label: 'Focus', icon: Flame },
  { value: 'folder-kanban', label: 'Plan', icon: FolderKanban },
  { value: 'check-square', label: 'Done', icon: CheckCircle2 },
  { value: 'trophy', label: 'Trophy', icon: Trophy },
  { value: 'dollar-sign', label: 'Finance', icon: DollarSign },
  { value: 'lightbulb', label: 'Idea', icon: Lightbulb },
  { value: 'graduation', label: 'Learn', icon: GraduationCap },
  { value: 'briefcase', label: 'Work', icon: Briefcase },
  { value: 'code2', label: 'Code', icon: Code2 },
  { value: 'heart', label: 'Health', icon: Heart },
  { value: 'globe', label: 'Global', icon: Globe },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'settings', label: 'Systems', icon: Settings },
  { value: 'sparkles', label: 'AI', icon: Sparkles },
];

/** Sentinel value meaning "no explicit icon — derive from category/title". */
export const NO_ICON = 'none';
