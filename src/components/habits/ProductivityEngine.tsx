import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Target, Clock, Plus, Timer, Calendar, ListTodo, FolderKanban, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { HabitDTO, TaskDTO, FocusSessionDTO } from '../../types';

type EngineContext = 'habits' | 'tasks' | 'focus' | 'projects' | 'dashboard';

interface ProductivityEngineProps {
  context: EngineContext;
  completedToday?: number;
  totalHabits?: number;
  habits?: HabitDTO[];
  tasks?: TaskDTO[];
  focusSessions?: FocusSessionDTO[];
  onOpenCreateTask?: (prefillTitle?: string, prefillDuration?: number) => void;
  onOpenCreateHabit?: (prefillTitle?: string, prefillTime?: string) => void;
  onOpenCreateProject?: () => void;
  onNavigateFocus?: () => void;
  onFocusHabit?: (habitId: string) => void;
  onHighlightTask?: (taskId: string) => void;
}

interface GapSuggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  type: 'task' | 'habit' | 'focus' | 'project' | 'info';
}

/**
 * ProductivityEngine — a rule-based gap analyzer that detects what's
 * MISSING from the user's workflow and suggests filling those gaps.
 *
 * Context-aware: on the Habits page it only shows habit gaps,
 * on Tasks page only task gaps, on Dashboard it shows everything.
 *
 * No AI. No fake data. Just honest detection of what's absent.
 */
export function ProductivityEngine({
  context,
  completedToday = 0,
  totalHabits = 0,
  habits = [],
  tasks = [],
  focusSessions = [],
  onOpenCreateTask,
  onOpenCreateHabit,
  onOpenCreateProject,
  onNavigateFocus,
  onFocusHabit,
  onHighlightTask,
}: ProductivityEngineProps) {
  const percentage = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  // ── Compute focus stats ─────────────────────────────────────────────
  const focusStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = focusSessions.filter(
      (s) => !s.isBreak && s.status === 'COMPLETED' && s.startedAt.split('T')[0] === todayStr
    );
    const totalMinutes = todaySessions.reduce((sum, s) => sum + s.durationMin, 0);
    const hasAnyCompleted = focusSessions.some((s) => !s.isBreak && s.status === 'COMPLETED');
    return { totalMinutes, hasAnyCompleted, sessionCount: todaySessions.length };
  }, [focusSessions]);

  // ── Task gap analysis ───────────────────────────────────────────────
  const taskGaps = useMemo((): GapSuggestion[] => {
    const gaps: GapSuggestion[] = [];

    if (tasks.length === 0) {
      gaps.push({
        id: 'no-tasks',
        icon: <Plus size={14} />,
        title: 'No tasks yet',
        description: 'Create your first task to start tracking your work.',
        actionLabel: 'Create Task',
        onAction: () => onOpenCreateTask?.('', 30),
        type: 'task',
      });
      return gaps; // No point checking further
    }

    const tasksWithoutDuration = tasks.filter((t) => !t.estimatedDuration && t.status !== 'DONE' && t.status !== 'CANCELLED');
    if (tasksWithoutDuration.length > 0) {
      gaps.push({
        id: 'no-duration',
        icon: <Clock size={14} />,
        title: `${tasksWithoutDuration.length} task${tasksWithoutDuration.length > 1 ? 's' : ''} missing time estimates`,
        description: 'Add estimated durations so the engine can plan your day better.',
        actionLabel: 'Highlight',
        onAction: () => onHighlightTask?.(tasksWithoutDuration[0].id),
        type: 'task',
      });
    }

    const tasksWithoutDueDate = tasks.filter((t) => !t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELLED');
    if (tasksWithoutDueDate.length > 0) {
      gaps.push({
        id: 'no-duedate',
        icon: <Calendar size={14} />,
        title: `${tasksWithoutDueDate.length} task${tasksWithoutDueDate.length > 1 ? 's' : ''} without due dates`,
        description: 'Set deadlines to stay on track and prioritize effectively.',
        actionLabel: 'Highlight',
        onAction: () => onHighlightTask?.(tasksWithoutDueDate[0].id),
        type: 'task',
      });
    }

    const hasProjects = tasks.some((t) => t.project);
    if (!hasProjects) {
      gaps.push({
        id: 'no-projects',
        icon: <FolderKanban size={14} />,
        title: 'No project organization',
        description: 'Group related tasks into projects for better structure.',
        actionLabel: 'Create Project',
        onAction: () => onOpenCreateProject?.(),
        type: 'project',
      });
    }

    return gaps;
  }, [tasks, onOpenCreateTask, onOpenCreateProject]);

  // ── Common habit suggestions (title keywords to detect) ─────────────
  const COMMON_HABITS = [
    { keywords: ['sleep', 'bedtime', 'wake', 'asleep'], title: 'Sleep by 10:00 PM', time: '22:00', desc: 'Consistent sleep improves focus and health.' },
    { keywords: ['gym', 'workout', 'exercise', 'run', 'running', 'jog', 'walk', 'yoga', 'fitness'], title: 'Morning Gym Session', time: '07:00', desc: 'Morning exercise boosts energy for the day.' },
    { keywords: ['meditat', 'mindful', 'breathe', 'calm'], title: '10 min Meditation', time: '08:00', desc: 'Start the day with clarity and calm.' },
    { keywords: ['read', 'book', 'reading', 'study', 'learn', 'course'], title: '30 min Reading', time: '21:00', desc: 'Wind down with a good book before bed.' },
    { keywords: ['water', 'hydrat', 'drink'], title: 'Drink 8 Glasses of Water', time: '09:00', desc: 'Stay hydrated throughout the day.' },
    { keywords: ['journal', 'write', 'diary', 'grateful'], title: 'Evening Journaling', time: '21:30', desc: 'Reflect on your day and plan tomorrow.' },
    { keywords: ['stretch', 'stretching', 'mobility', 'flexib'], title: '10 min Stretching', time: '18:00', desc: 'Loosen up after a long day of sitting.' },
    { keywords: ['walk', 'nature', 'outdoor', 'fresh'], title: 'Evening Walk', time: '19:00', desc: 'Get fresh air and clear your mind.' },
  ];

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ── Habit gap analysis ──────────────────────────────────────────────
  const habitGaps = useMemo((): GapSuggestion[] => {
    const gaps: GapSuggestion[] = [];
    const habitTitlesLower = habits.map((h) => h.title.toLowerCase());

    // Helper: check if a common habit already exists
    const hasHabit = (keywords: string[]) =>
      keywords.some((kw) => habitTitlesLower.some((title) => title.includes(kw)));

  // ── 1. No habits at all ───────────────────────────────────────────
    if (habits.length === 0) {
      gaps.push({
        id: 'no-habits',
        icon: <Target size={14} />,
        title: 'No habits created',
        description: 'Build daily routines by creating your first habit.',
        actionLabel: 'Create Habit',
        onAction: () => onOpenCreateHabit?.('', ''),
        type: 'habit',
      });
      return gaps;
    }

    // ── 2. Pending habits today ───────────────────────────────────────
    if (completedToday < totalHabits) {
      const pending = totalHabits - completedToday;
      const firstPending = habits.find((h) => !h.completedToday);
      gaps.push({
        id: 'pending-habits',
        icon: <Target size={14} />,
        title: `${pending} habit${pending > 1 ? 's' : ''} remaining today`,
        description: pending === totalHabits ? 'Start with your easiest habit to build momentum.' : 'Keep going — consistency is what builds streaks.',
        actionLabel: 'Complete Now',
        onAction: () => {
          if (firstPending && onFocusHabit) {
            onFocusHabit(firstPending.id);
          } else {
            onOpenCreateHabit?.();
          }
        },
        type: 'habit',
      });
    }

    // ── 3. Zero-streak habits ─────────────────────────────────────────
    const noStreakHabits = habits.filter((h) => h.currentStreak === 0 && h.isActive);
    if (noStreakHabits.length > 0 && completedToday < totalHabits) {
      gaps.push({
        id: 'start-streak',
        icon: <Zap size={14} />,
        title: `${noStreakHabits.length} habit${noStreakHabits.length > 1 ? 's' : ''} waiting for a streak`,
        description: 'Complete them today to start building your streak.',
        actionLabel: 'View Habits',
        onAction: () => {
          if (onFocusHabit) {
            onFocusHabit(noStreakHabits[0].id);
          } else {
            onOpenCreateHabit?.();
          }
        },
        type: 'habit',
      });
    }

    // ── 4. Skip day analysis ──────────────────────────────────────────
    const habitsWithSkips = habits.filter((h) => h.skipDays.length > 0);
    habitsWithSkips.forEach((h) => {
      const skipDayNames = h.skipDays.map((d) => DAY_NAMES[d]).join(', ');
      const fillerSuggestions = [
        { title: 'Light Stretching', time: '08:00' },
        { title: 'Quick Walk', time: '12:00' },
        { title: '5 min Meditation', time: '20:00' },
      ];
      const filler = fillerSuggestions[Math.floor(Math.random() * fillerSuggestions.length)];
      if (!hasHabit(['stretch', 'walk', 'meditat'])) {
        gaps.push({
          id: `skip-day-${h.id}`,
          icon: <Calendar size={14} />,
          title: `You skip "${h.title}" on ${skipDayNames}`,
          description: `Add "${filler.title}" on those days to maintain momentum.`,
          actionLabel: 'Add Habit',
          onAction: () => onOpenCreateHabit?.(filler.title, filler.time),
          type: 'habit',
        });
      }
    });

    // ── 5. Missing common habits ──────────────────────────────────────
    COMMON_HABITS.forEach((common) => {
      if (!hasHabit(common.keywords)) {
        gaps.push({
          id: `suggest-${common.keywords[0]}`,
          icon: <Plus size={14} />,
          title: `Add "${common.title}"`,
          description: common.desc,
          actionLabel: 'Add Habit',
          onAction: () => onOpenCreateHabit?.(common.title, common.time),
          type: 'habit',
        });
      }
    });

    // ── 6. Time slot gaps ─────────────────────────────────────────────
    const usedTimes = habits
      .map((h) => h.reminderTime)
      .filter((t): t is string => t !== null)
      .map((t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      })
      .sort((a, b) => a - b);

    if (usedTimes.length >= 2) {
      // Find gaps > 3 hours between consecutive reminders
      for (let i = 0; i < usedTimes.length - 1; i++) {
        const gap = usedTimes[i + 1] - usedTimes[i];
        if (gap >= 180) {
          const startHour = Math.floor(usedTimes[i] / 60);
          const endHour = Math.floor(usedTimes[i + 1] / 60);
          const ampm = (h: number) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
          const suggestedTime = `${startHour + Math.floor(gap / 120)}:00`;
          gaps.push({
            id: `time-gap-${i}`,
            icon: <Clock size={14} />,
            title: `Free time between ${ampm(startHour)} and ${ampm(endHour)}`,
            description: 'Add a habit in this gap to make use of the time.',
            actionLabel: 'Add Habit',
            onAction: () => onOpenCreateHabit?.('New Habit', suggestedTime),
            type: 'habit',
          });
        }
      }
    }

    // ── 7. Streak recovery ────────────────────────────────────────────
    const brokenHabits = habits.filter(
      (h) => h.currentStreak === 0 && h.completionDates.length > 0 && h.isActive
    );
    brokenHabits.forEach((h) => {
      const lastDate = new Date(h.completionDates[h.completionDates.length - 1]);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 3) {
        gaps.push({
          id: `recover-${h.id}`,
          icon: <Zap size={14} />,
          title: `You haven't "${h.title}" in ${daysSince} days`,
          description: 'Start small — try a lighter version today to rebuild momentum.',
          actionLabel: 'Restart Habit',
          onAction: () => {
            if (onFocusHabit) {
              onFocusHabit(h.id);
            } else {
              onOpenCreateHabit?.(h.title, h.reminderTime || '');
            }
          },
          type: 'habit',
        });
      }
    });

    // ── 8. Weekend balance ────────────────────────────────────────────
    const weekdayHabits = habits.filter((h) => {
      // Check if habit is mostly done on weekdays via weekPattern
      const weekdays = h.weekPattern.slice(1, 6); // Mon-Fri
      const weekend = [h.weekPattern[0], h.weekPattern[6]]; // Sun, Sat
      const weekdayCompletions = weekdays.filter(Boolean).length;
      const weekendCompletions = weekend.filter(Boolean).length;
      return weekdayCompletions > 0 && weekendCompletions === 0;
    });
    if (weekdayHabits.length >= 3 && !hasHabit(['weekend', 'saturday', 'sunday', 'hike', 'fun'])) {
      gaps.push({
        id: 'weekend-balance',
        icon: <Calendar size={14} />,
        title: 'Weekends look empty',
        description: 'Add a relaxing weekend habit like "Morning Hike" or "Weekend Reading".',
        actionLabel: 'Add Habit',
        onAction: () => onOpenCreateHabit?.('Weekend Hike', '09:00'),
        type: 'habit',
      });
    }

    // Limit to max 5 suggestions to avoid overwhelming
    return gaps.slice(0, 5);
  }, [habits, completedToday, totalHabits, onOpenCreateHabit, onFocusHabit]);

  // ── Focus gap analysis ──────────────────────────────────────────────
  const focusGaps = useMemo((): GapSuggestion[] => {
    const gaps: GapSuggestion[] = [];

    if (!focusStats.hasAnyCompleted && focusSessions.length === 0) {
      gaps.push({
        id: 'no-focus',
        icon: <Timer size={14} />,
        title: 'Focus timer unused',
        description: 'Use the Focus Timer to track deep work and discover your peak productivity hours.',
        actionLabel: 'Try Focus',
        onAction: () => onNavigateFocus?.(),
        type: 'focus',
      });
    } else if (focusStats.sessionCount === 0 && focusStats.hasAnyCompleted) {
      gaps.push({
        id: 'no-focus-today',
        icon: <Timer size={14} />,
        title: 'No focus session today',
        description: 'A 25-minute focus block can boost your productivity significantly.',
        actionLabel: 'Start Focus',
        onAction: () => onNavigateFocus?.(),
        type: 'focus',
      });
    }

    return gaps;
  }, [focusStats, focusSessions, onNavigateFocus]);

  // ── Dismissed suggestions tracking ──────────────────────────────────
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const dismissSuggestion = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // ── Compile suggestions based on context ────────────────────────────
  const allSuggestions = useMemo(() => {
    switch (context) {
      case 'habits':
        return [...habitGaps];
      case 'tasks':
        return [...taskGaps];
      case 'focus':
        return [...focusGaps];
      case 'projects':
        return [...taskGaps.filter((g) => g.type === 'project')];
      case 'dashboard':
        return [...taskGaps, ...habitGaps, ...focusGaps];
      default:
        return [];
    }
  }, [context, taskGaps, habitGaps, focusGaps]);

  // Filter out dismissed, then show max 3
  const suggestions = useMemo(() => {
    return allSuggestions.filter((s) => !dismissedIds.has(s.id)).slice(0, 3);
  }, [allSuggestions, dismissedIds]);

  // ── Time gap detection (works across all contexts) ──────────────────
  const timeGaps = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const endOfDay = 23;
    const remainingHours = Math.round((endOfDay - currentHour) * 10) / 10;
    return remainingHours >= 0.5 ? [{ start: currentHour, end: endOfDay, hours: remainingHours }] : [];
  }, []);

  // ── Peak productivity detection ─────────────────────────────────────
  const peakProductivity = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const buckets = new Array(24).fill(0);
    focusSessions
      .filter((s) => !s.isBreak && s.status === 'COMPLETED' && s.startedAt.split('T')[0] === todayStr)
      .forEach((s) => {
        const startHour = new Date(s.startedAt).getHours();
        buckets[startHour] += s.durationMin;
      });

    const maxMinutes = Math.max(...buckets);
    if (maxMinutes === 0) return null;

    const peakHour = buckets.indexOf(maxMinutes);
    const fmt = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:00 ${ampm}`;
    };
    return { label: `${fmt(peakHour)} – ${fmt(Math.min(peakHour + Math.ceil(maxMinutes / 30), 23))}`, minutes: maxMinutes };
  }, [focusSessions]);

  // ── Time-based greeting ─────────────────────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { title: 'Morning momentum', emoji: '🌅', color: '#F59E0B' };
    if (hour < 17) return { title: 'Afternoon push', emoji: '⚡', color: '#6C63FF' };
    if (hour < 21) return { title: 'Evening wind-down', emoji: '🌙', color: '#8B5CF6' };
    return { title: 'Night mode', emoji: '🌟', color: '#6366F1' };
  };

  const greeting = getGreeting();
  const primaryColor = greeting.color;

  // ── Status message ──────────────────────────────────────────────────
  const remainingCount = allSuggestions.length - dismissedIds.size;
  const statusMessage = useMemo(() => {
    if (remainingCount === 0) {
      const allHabitsDone = totalHabits > 0 && completedToday === totalHabits;
      if (allHabitsDone) return "All habits done — you're on fire!";
      return "Everything looks good. Keep it up!";
    }
    return `${remainingCount > 3 ? '3' : remainingCount } improvement opportunit${remainingCount > 1 ? 'ies' : 'y'} detected`;
  }, [remainingCount, totalHabits, completedToday]);

  return (
    <Card
      variant="default"
      className="p-3 sm:p-5 relative overflow-hidden"
      style={{
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Animated gradient blob */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: primaryColor, opacity: 0.15 }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' }} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
          <motion.div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${primaryColor}20`, color: primaryColor }}
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Zap size={14} />
          </motion.div>
          <div className="flex-1">
            <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              Productivity Engine
              <motion.span
                className="px-2 py-0.5 rounded-full text-[9px] font-extrabold"
                style={{ background: `${primaryColor}20`, color: primaryColor }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Live
              </motion.span>
            </p>
          </div>
        </div>

        {/* Greeting + Status */}
        <div className="mb-3 sm:mb-4">
          <p className="text-[13px] sm:text-[15px] font-extrabold text-text-primary mb-1 sm:mb-1.5 flex items-center gap-1.5">
            {greeting.title} <span>{greeting.emoji}</span>
          </p>
          {suggestions.length > 0 ? (
            <p className="text-xs text-text-secondary font-medium leading-relaxed">{statusMessage}</p>
          ) : (
            <p className="text-xs text-green-500 font-bold">{statusMessage}</p>
          )}
        </div>

        {/* Peak Productivity */}
        {peakProductivity && (
          <motion.div
            className="flex items-center gap-1.5 mb-3 sm:mb-4 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
            style={{ background: `${primaryColor}10` }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TrendingUp size={12} style={{ color: primaryColor }} />
            <span className="text-[10px] sm:text-[11px] font-bold" style={{ color: primaryColor }}>
              Peak focus: {peakProductivity.label}
            </span>
          </motion.div>
        )}

        {/* Suggestion Cards */}
        {suggestions.length > 0 && (
          <motion.div
            className="p-2.5 sm:p-3.5 rounded-xl mb-3 sm:mb-4"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => suggestion.onAction()}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] group"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                    style={{
                      background:
                        suggestion.type === 'habit' ? '#22C55E20' :
                        suggestion.type === 'task' ? '#6C63FF20' :
                        suggestion.type === 'focus' ? '#FFB80020' :
                        suggestion.type === 'project' ? '#3B82F620' :
                        '#6366F120',
                      color:
                        suggestion.type === 'habit' ? '#22C55E' :
                        suggestion.type === 'task' ? '#6C63FF' :
                        suggestion.type === 'focus' ? '#FFB800' :
                        suggestion.type === 'project' ? '#3B82F6' :
                        '#6366F1',
                    }}
                  >
                    {suggestion.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-text-primary">{suggestion.title}</p>
                    <p className="text-[9px] text-text-secondary mt-0.5">{suggestion.description}</p>
                  </div>
                  <span className="text-[9px] font-bold text-accent shrink-0 px-2 py-1 rounded-md bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {suggestion.actionLabel}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissSuggestion(suggestion.id);
                    }}
                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all text-text-muted hover:text-text-primary"
                    title="Dismiss suggestion"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M1 1l6 6M7 1l-6 6" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-4">
          <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
            <Target size={12} className="text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-text-muted uppercase">Habits</p>
              <p className="text-xs font-extrabold text-text-primary">{completedToday}/{totalHabits}</p>
            </div>
          </div>
          <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
            <ListTodo size={12} className="text-warning shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-text-muted uppercase">Tasks</p>
              <p className="text-xs font-extrabold text-text-primary">
                {tasks.filter((t) => t.status === 'DONE').length}/{tasks.filter((t) => t.status !== 'CANCELLED').length}
              </p>
            </div>
          </div>
        </div>

        {/* Fill Gap Button */}
        {timeGaps.length > 0 && suggestions.length > 0 && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              className="text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                border: 'none',
                color: 'white',
              }}
              onClick={() => suggestions[0].onAction()}
            >
              Address This Gap
            </Button>
          </motion.div>
        )}
      </div>

      {/* Particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{ background: primaryColor, opacity: 0.4, top: `${20 + i * 20}%`, right: `${10 + i * 5}%` }}
          animate={{ y: [-10, 10], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, repeatType: 'reverse', delay: i * 0.3 }}
        />
      ))}
    </Card>
  );
}