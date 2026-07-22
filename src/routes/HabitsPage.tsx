import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Plus,
  Search,
  Grid3x3,
  List,
  X,
} from 'lucide-react';
import { useHabits, useCreateHabit } from '../features/habits/hooks/useHabits';
import { useAuthStore } from '../store/authStore';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingScreen } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { HabitList } from '../components/habits/HabitList';
import { HabitHero } from '../components/habits/HabitHero';
import { WeekOverview } from '../components/habits/WeekOverview';
import { LongestStreakCard } from '../components/habits/LongestStreakCard';
import { AICoachPanel } from '../components/habits/AICoachPanel';
import { QuoteCard } from '../components/habits/QuoteCard';
import { getDailyQuotes } from '../data/quotes';
import { WeatherWidget } from '../components/habits/WeatherWidget';
import { FocusTimeWidget } from '../components/habits/FocusTimeWidget';
import { HabitEmptyState } from '../components/habits/HabitEmptyState';
import { HabitHeatmapCombined } from '../components/habits/HabitHeatmapCombined';
import { AchievementsPanel } from '../components/habits/AchievementsPanel';
import { getCategory } from '../features/habits/Habitpresentation';
import { useGamificationProfile } from '../features/dashboard/hooks/useDashboard';
import type { HabitDTO } from '../types';

type HabitFilter = 'all' | 'active' | 'pending' | 'completed';
type HabitSort = 'custom' | 'streak' | 'name' | 'progress';
type ViewMode = 'grid' | 'list';

export function HabitsPage() {
  const { data, isLoading } = useHabits();
  const { data: gamification } = useGamificationProfile();
  const createHabit = useCreateHabit();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  const [reminderTime, setReminderTime] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HabitFilter>('all');
  const [sort, setSort] = useState<HabitSort>('custom');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const habits = data?.data ?? [];
  const completedToday = habits.filter((h) => h.completedToday).length;
  const totalHabits = habits.length;

  const dailyProgress = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const streakDays = habits.length > 0 ? Math.max(...habits.map((h) => h.currentStreak)) : 0;
  const activeStreaks = habits.filter((h) => h.currentStreak > 0).length;
  const xpEarned = gamification?.totalPoints ?? 0;
  const successRate = habits.length > 0
    ? Math.round(
        (habits.reduce((sum, h) => sum + h.completionsThisWeek / Math.max(h.targetPerWeek, 1), 0) /
          habits.length) *
          100
      )
    : 0;

  const longestStreakHabit = useMemo(() => {
    if (habits.length === 0) return null;
    return habits.reduce<{ habit: HabitDTO; streak: number } | null>((best, h) => {
      if (!best || h.bestStreak > best.streak) return { habit: h, streak: h.bestStreak };
      return best;
    }, null);
  }, [habits]);

  const filteredHabits = useMemo(() => {
    let list = habits.filter((h) => h.title.toLowerCase().includes(searchQuery.toLowerCase()));
    switch (filter) {
      case 'active': list = list.filter((h) => h.currentStreak > 0); break;
      case 'pending': list = list.filter((h) => !h.completedToday); break;
      case 'completed': list = list.filter((h) => h.completedToday); break;
    }
    const sorted = [...list];
    switch (sort) {
      case 'name': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'progress': sorted.sort((a, b) => b.completionsThisWeek / Math.max(b.targetPerWeek, 1) - a.completionsThisWeek / Math.max(a.targetPerWeek, 1)); break;
      case 'streak': sorted.sort((a, b) => b.currentStreak - a.currentStreak); break;
    }
    return sorted;
  }, [habits, searchQuery, filter, sort]);

  const filterCounts = {
    all: habits.length,
    active: habits.filter((h) => h.currentStreak > 0).length,
    pending: habits.filter((h) => !h.completedToday).length,
    completed: habits.filter((h) => h.completedToday).length,
  };

  const previewCategory = title.trim() ? getCategory(title) : null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createHabit.mutate(
      { title, targetPerWeek, reminderTime: reminderTime || undefined },
      { onSuccess: () => { setShowCreate(false); setTitle(''); setTargetPerWeek(7); setReminderTime(''); } }
    );
  };

  if (isLoading) return <LoadingScreen />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name?.split(' ')[0] || 'there';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mx-auto flex w-full min-w-0 flex-col pb-6 sm:pb-8"
      style={{ maxWidth: '1600px' }}
    >
      {/* Hero Section — shown at every breakpoint, mobile included */}
      <HabitHero
        userName={userName}
        greeting={getGreeting()}
        dailyProgress={dailyProgress}
        completedToday={completedToday}
        totalHabits={totalHabits}
        streakDays={streakDays}
        xpEarned={xpEarned}
        activeStreaks={activeStreaks}
        successRate={successRate}
        onCreateHabit={() => setShowCreate(true)}
      />

      {/*
        ====================================================================
        MOBILE LAYOUT (< sm breakpoint only) — unchanged
        ====================================================================
      */}
      <div className="flex flex-col gap-4 mt-4 sm:hidden">
        {habits.length === 0 ? (
          <HabitEmptyState onCreateHabit={() => setShowCreate(true)} />
        ) : (
          <>
            {/* Weather + Longest Streak */}
            <div className="grid grid-cols-2 gap-2 items-stretch">
              <WeatherWidget compact />
              {longestStreakHabit && (
                <LongestStreakCard habit={longestStreakHabit.habit} streak={longestStreakHabit.streak} />
              )}
            </div>

            {/* Daily Quote + Habit Heatmap */}
            <div className="grid grid-cols-2 gap-2 items-stretch">
              <QuoteCard quotes={getDailyQuotes()} />
              <HabitHeatmapCombined habits={habits} compact />
            </div>

            {/* Habit list, full width */}
            <HabitList habits={filteredHabits} viewMode="list" />

            {/* AI Coach */}
            <AICoachPanel completedToday={completedToday} totalHabits={totalHabits} />

            {/* Achievements */}
            <AchievementsPanel />
          </>
        )}
      </div>

      {/*
        ====================================================================
        DESKTOP / TABLET LAYOUT (sm and up)

        One consistent structure from `lg` through `2xl`: main content in a
        left column, and a sticky right sidebar (AI Coach, Quote, Weather,
        Focus Time) that's always present at the same position — only the
        sidebar's width and the gutter scale down at smaller desktop widths,
        nothing gets rearranged or duplicated between breakpoints.

        Below `lg` (tablet: sm–lg) there's no room for a side rail, so those
        four widgets fall back to a simple 2-column grid inside the main
        column instead of disappearing.
        ====================================================================
      */}
      <div
        className="hidden sm:grid sm:grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px] items-start gap-4 sm:gap-6"
      >
        {/* Left / Main Column */}
        <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
          {/* Week at a Glance + Longest Streak */}
          {habits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
            >
              <WeekOverview />
              {longestStreakHabit && (
                <LongestStreakCard habit={longestStreakHabit.habit} streak={longestStreakHabit.streak} />
              )}
            </motion.div>
          )}

          {/* Filters */}
          {habits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-text-primary">Your Habits</h2>
                <div className="flex gap-1 p-1.5 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <motion.button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-muted'}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Grid3x3 size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted'}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <List size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text" placeholder="Search habits..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as HabitSort)}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="custom">Sort: Custom</option>
                  <option value="streak">Sort: Streak</option>
                  <option value="name">Sort: Name</option>
                  <option value="progress">Sort: Progress</option>
                </select>
              </div>

              <div className="flex overflow-x-auto gap-2 pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {(['all', 'active', 'pending', 'completed'] as HabitFilter[]).map((f) => (
                  <motion.button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      filter === f ? 'text-white shadow-lg' : 'text-text-muted'
                    }`}
                    style={filter === f
                      ? { background: 'var(--gradient-accent)' }
                      : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }
                    }
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Habits Grid/List */}
          {habits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <HabitEmptyState onCreateHabit={() => setShowCreate(true)} />
            </motion.div>
          ) : filteredHabits.length === 0 ? (
            <Card variant="default" className="p-6 sm:p-10 text-center" style={{ borderRadius: '24px' }}>
              <p className="text-sm font-bold text-text-primary">No habits match this view</p>
              <p className="text-xs text-text-muted mt-1">Try a different filter.</p>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <HabitList habits={filteredHabits} viewMode={viewMode} />
            </motion.div>
          )}

          {/* Achievements + Habit Heatmap — one row, same at every desktop width */}
          {habits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] items-start gap-4 sm:gap-6"
            >
              <AchievementsPanel />
              <HabitHeatmapCombined habits={habits} />
            </motion.div>
          )}

          {/* Tablet-only fallback (sm–lg): sidebar widgets shown inline since
              there isn't room for a side rail yet. Hidden once `lg` kicks in
              and the real sticky sidebar takes over. */}
          {habits.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:hidden">
              <AICoachPanel completedToday={completedToday} totalHabits={totalHabits} />
              <QuoteCard quotes={getDailyQuotes()} />
              <WeatherWidget />
            </div>
          )}
        </div>

        {/* Right Sidebar — sticky, present at every desktop width (lg and up).
            Only its column width scales down (280px → 300px → 340px); the
            widgets themselves and their order never change. */}
        <motion.div
          className="hidden lg:flex flex-col gap-4 sm:gap-6 lg:sticky lg:top-6 lg:self-start min-w-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <AICoachPanel completedToday={completedToday} totalHabits={totalHabits} />
          <QuoteCard quotes={getDailyQuotes()} />
          <WeatherWidget />
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showCreate && (
          <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Habit">
            <form onSubmit={handleCreate} className="flex flex-col gap-5 pt-2">
              <div>
                <Input
                  id="habit-title"
                  label="Habit name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Read 30 minutes"
                />
                {previewCategory && (
                  <motion.div
                    className="flex items-center gap-1.5 mt-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ background: previewCategory.bg, color: previewCategory.color }}
                    >
                      <previewCategory.icon size={11} />
                    </div>
                    <p className="text-[11px] font-bold text-text-muted">
                      Detected: <span style={{ color: previewCategory.color }}>{previewCategory.name}</span>
                    </p>
                  </motion.div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
                  Days per week
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <motion.button
                      key={n}
                      type="button"
                      onClick={() => setTargetPerWeek(n)}
                      className={`py-3 rounded-xl text-base font-black transition-all ${
                        targetPerWeek === n ? 'text-white shadow-lg' : 'text-text-secondary border'
                      }`}
                      style={
                        targetPerWeek === n
                          ? { background: 'var(--gradient-accent)' }
                          : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
                      }
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
              </div>

              <Input
                id="habit-reminder"
                label="Reminder (optional)"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />

              <Button type="submit" fullWidth loading={createHabit.isPending}>
                Create Habit
              </Button>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default HabitsPage;