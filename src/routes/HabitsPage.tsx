import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Grid3x3,
  List,
  LayoutList,
  Zap,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useHabits, useCreateHabit, useStreakStatus } from '../features/habits/hooks/useHabits';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { useFocusSessions } from '../features/habits/hooks/useFocusSessions';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Modal } from '../components/ui/Modal';
import { LoadingScreen } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import { HabitList } from '../components/habits/HabitList';
import { HabitHero } from '../components/habits/HabitHero';
import { WeekOverview } from '../components/habits/WeekOverview';
import { LongestStreakCard } from '../components/habits/LongestStreakCard';
import { ProductivityEngine } from '../components/habits/ProductivityEngine';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { QuoteCard } from '../components/habits/QuoteCard';
import { getDailyQuotes } from '../data/quotes';
import { WeatherWidget } from '../components/habits/WeatherWidget';
import { HabitEmptyState } from '../components/habits/HabitEmptyState';
import { HabitHeatmapCombined } from '../components/habits/HabitHeatmapCombined';
import { AchievementsPanel } from '../components/habits/AchievementsPanel';
import { CreateHabitWizard } from '../components/habits/CreateHabitWizard';
import { StreakBreakModal } from '../components/habits/StreakBreakModal';
import { useGamificationProfile } from '../features/dashboard/hooks/useDashboard';
import type { HabitDTO } from '../types';

type HabitFilter = 'all' | 'active' | 'pending' | 'completed';
type HabitSort = 'custom' | 'streak' | 'name' | 'progress';
type ViewMode = 'grid' | 'list';

export function HabitsPage() {
  const { data, isLoading } = useHabits();
  const { data: gamification } = useGamificationProfile();
  const { data: tasksData } = useTasks();
  const { data: focusSessionsData } = useFocusSessions();
  const createHabit = useCreateHabit();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskPrefill, setTaskPrefill] = useState<{ title: string; duration: number }>({ title: '', duration: 30 });
  const [habitPrefill, setHabitPrefill] = useState<{ title: string; time: string }>({ title: '', time: '' });
  const [focusedHabitId, setFocusedHabitId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HabitFilter>('all');
  const [sort, setSort] = useState<HabitSort>('custom');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Streak break popup
  const { data: brokenStreaks } = useStreakStatus();
  const streakPopupDismissedAt = useUIStore((s) => s.streakPopupDismissedAt);
  const dismissStreakPopup = useUIStore((s) => s.dismissStreakPopup);
  const [streakModalOpen, setStreakModalOpen] = useState(true);
  const latestBrokenAt = brokenStreaks?.[0]?.brokenAt ?? null;
  const showStreakPopup = !!(
    latestBrokenAt &&
    streakModalOpen &&
    (!streakPopupDismissedAt || latestBrokenAt > streakPopupDismissedAt)
  );

  const habits = data?.data ?? [];
  const tasks = tasksData?.pages.flatMap((p) => p.data) ?? [];
  const focusSessions = focusSessionsData?.data ?? [];
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

  // ─── All hooks and callbacks must be defined BEFORE the early return ───

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name?.split(' ')[0] || 'there';

  const handleFocusHabit = useCallback((habitId: string) => {
    setFocusedHabitId(habitId);
    // Scroll the card into view after a small delay for the DOM to be ready
    setTimeout(() => {
      const el = document.getElementById(`habit-card-${habitId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    // Clear focus after 3 seconds
    setTimeout(() => setFocusedHabitId(null), 3000);
  }, []);

  const handleOpenCreateTask = (title?: string, duration?: number) => {
    setTaskPrefill({ title: title || '', duration: duration || 30 });
    setShowCreateTask(true);
  };

  const handleOpenCreateHabit = (title?: string, time?: string) => {
    setHabitPrefill({ title: title || '', time: time || '' });
    setShowCreate(true);
  };

  const heroProps = {
    userName,
    greeting: getGreeting(),
    dailyProgress,
    completedToday,
    totalHabits,
    streakDays,
    xpEarned,
    activeStreaks,
    successRate,
    onCreateHabit: () => setShowCreate(true),
  };

  const engineProps = {
    context: 'habits' as const,
    completedToday,
    totalHabits,
    habits,
    tasks,
    focusSessions,
    onOpenCreateTask: handleOpenCreateTask,
    onOpenCreateHabit: handleOpenCreateHabit,
    onNavigateFocus: () => window.location.href = '/focus',
    onFocusHabit: handleFocusHabit,
  };

  // Early return AFTER all hooks/callbacks — this ensures hook count never changes between renders
  if (isLoading) return <LoadingScreen />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex w-full min-w-0 flex-col pb-6 sm:pb-8"
    >
      {/* ================================================================
          MOBILE LAYOUT (< sm)
          ================================================================ */}
      <div className="sm:hidden flex flex-col gap-4">
        <HabitHero {...heroProps} />
        {habits.length === 0 ? (
          <HabitEmptyState onCreateHabit={() => setShowCreate(true)} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 items-stretch">
              <WeatherWidget compact />
              {longestStreakHabit && (
                <LongestStreakCard habit={longestStreakHabit.habit} streak={longestStreakHabit.streak} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 items-stretch">
              <QuoteCard quotes={getDailyQuotes()} />
              <HabitHeatmapCombined habits={habits} compact />
            </div>
            <HabitList habits={filteredHabits} viewMode="list" focusedHabitId={focusedHabitId} />
            <ProductivityEngine {...engineProps} />
            <AchievementsPanel />
          </>
        )}
      </div>

      {/* ================================================================
          TABLET (sm–lg)
          ================================================================ */}
      <div className="hidden sm:flex lg:hidden flex-col gap-4 sm:gap-6">
        <HabitHero {...heroProps} />
        {habits.length === 0 ? (
          <HabitEmptyState onCreateHabit={() => setShowCreate(true)} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_320px] items-stretch gap-4 sm:gap-6">
                  <WeekOverview habits={habits} />
              {longestStreakHabit && (
                <LongestStreakCard habit={longestStreakHabit.habit} streak={longestStreakHabit.streak} />
              )}
            </div>
            {renderFiltersAndList()}
            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] items-start gap-4 sm:gap-6">
              <AchievementsPanel />
              <HabitHeatmapCombined habits={habits} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <ProductivityEngine {...engineProps} />
              <QuoteCard quotes={getDailyQuotes()} />
              <WeatherWidget />
            </div>
          </>
        )}
      </div>

      {/* ================================================================
          DESKTOP (lg+)
          ================================================================ */}
      <div className="hidden lg:block">
        {habits.length === 0 ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
            <div className="flex flex-col gap-6">
              <HabitHero {...heroProps} />
              <HabitEmptyState onCreateHabit={() => setShowCreate(true)} />
            </div>
            <div className="flex flex-col gap-4 sticky top-6 self-start">
              <ProductivityEngine {...engineProps} />
              <QuoteCard quotes={getDailyQuotes()} />
              <WeatherWidget />
            </div>
          </div>
        ) : (
          <>
            <HabitHero {...heroProps} />
            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px] items-start gap-4 sm:gap-6">
              <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
                >
                  <WeekOverview habits={habits} />
                  {longestStreakHabit && (
                    <LongestStreakCard habit={longestStreakHabit.habit} streak={longestStreakHabit.streak} />
                  )}
                </motion.div>

                {renderFiltersAndList()}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] items-start gap-4 sm:gap-6"
                >
                  <AchievementsPanel />
                  <HabitHeatmapCombined habits={habits} />
                </motion.div>
              </div>

              <motion.div
                className="flex flex-col gap-4 sm:gap-6 sticky top-6 self-start min-w-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <ProductivityEngine {...engineProps} />
                <QuoteCard quotes={getDailyQuotes()} />
                <WeatherWidget />
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* Create Habit Wizard Modal */}
      <AnimatePresence>
        {showCreate && (
          <Modal open={showCreate} onClose={() => { setShowCreate(false); setHabitPrefill({ title: '', time: '' }); }} title="New Habit" maxWidth="max-w-md">
            <CreateHabitWizard open={showCreate} onClose={() => { setShowCreate(false); setHabitPrefill({ title: '', time: '' }); }} initialTitle={habitPrefill.title} initialReminderTime={habitPrefill.time} />
          </Modal>
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => {
          setShowCreateTask(false);
          setTaskPrefill({ title: '', duration: 30 });
        }}
        initialTitle={taskPrefill.title}
        initialDuration={taskPrefill.duration}
      />

      {/* Streak Break Popup */}
      <StreakBreakModal
        open={showStreakPopup}
        brokenStreaks={brokenStreaks || []}
        onClose={() => {
          setStreakModalOpen(false);
          if (latestBrokenAt) {
            dismissStreakPopup(latestBrokenAt);
          }
        }}
        onDismiss={() => {
          setStreakModalOpen(false);
          if (latestBrokenAt) {
            dismissStreakPopup(latestBrokenAt);
          }
        }}
      />
    </motion.div>
  );

  function renderFiltersAndList() {
    return (
      <>
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
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              >
                <Grid3x3 size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                onClick={() => setViewMode('list')}
                className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted'}`}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              >
                <List size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <Search size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text" placeholder="Search habits..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <select
              value={sort} onChange={(e) => setSort(e.target.value as HabitSort)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <option value="custom">Sort: Custom</option>
              <option value="streak">Sort: Streak</option>
              <option value="name">Sort: Name</option>
              <option value="progress">Sort: Progress</option>
            </select>
          </div>

          <div className="flex overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="np-pill-segmented">
              {(['all', 'active', 'pending', 'completed'] as HabitFilter[]).map((f) => {
                const isActive = filter === f;
                const iconMap: Record<HabitFilter, React.ReactNode> = {
                  all: <LayoutList size={12} />,
                  active: <Zap size={12} />,
                  pending: <Clock size={12} />,
                  completed: <CheckCircle2 size={12} />,
                };
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`np-pill ${isActive ? 'is-active' : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="habit-pill-indicator"
                        className="np-pill-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 1 }}
                      />
                    )}
                    <span className="relative z-[1] flex items-center gap-[5px]">
                      {iconMap[f]}
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      <span className="np-pill-count">{filterCounts[f]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {filteredHabits.length === 0 ? (
          <Card variant="default" className="p-6 sm:p-10 text-center" style={{ borderRadius: '24px' }}>
            <p className="text-sm font-bold text-text-primary">No habits match this view</p>
            <p className="text-xs text-text-muted mt-1">Try a different filter.</p>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}>
            <HabitList habits={filteredHabits} viewMode={viewMode} focusedHabitId={focusedHabitId} />
          </motion.div>
        )}
      </>
    );
  }
}

export default HabitsPage;
