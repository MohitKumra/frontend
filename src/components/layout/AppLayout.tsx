import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_NAME } from '../../config/brand';
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Target,
  FileText,
  Timer,
  LogOut,
  X,
  Sparkles,
  Search,
  Plus,
  Settings2,
  FolderKanban,
  Keyboard,
  Flag,
  CreditCard,
  Database,
  Lock,
  Flame,
  LayoutGrid,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useUpgradeModalStore } from '../../store/upgradeModalStore';
import { useUserPlan } from '../../features/billing/useUserPlan';
import { useLogout } from '../../features/auth/hooks/useAuth';
import { useSettings } from '../../features/settings/hooks/useSettings';
import { NotificationCenter } from '../../features/notifications/components/NotificationCenter';
import { SearchModal } from '../../features/search/components/SearchModal';
import { Avatar } from '../ui/Avatar';
import { DraggableModal } from '../ui/DraggableModal';
import { MobileIslandNav } from './MobileIslandNav';
import { Badge } from '../ui/Badge';
import { PageTransition } from './PageTransition';
import { AppSidebar } from './AppSidebar';
import { useDashboardToday, useAchievements } from '../../features/dashboard/hooks/useDashboard';
import { useStreakStatus } from '../../features/habits/hooks/useHabits';
import { applyLayoutPreference } from '../../platform/layout';
import { AchievementCelebrationModal } from '../achievements/AchievementCelebrationModal';
import { StreakBreakModal } from '../habits/StreakBreakModal';
import type { AchievementWithStatusDTO } from '../../types';
import { createPortal } from 'react-dom';

const navItems = [
  { to: '/', icon: LayoutGrid, label: 'Dashboard', onboarding: 'dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks', badgeKey: 'tasks', onboarding: 'tasks' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar', onboarding: 'calendar' },
  { to: '/habits', icon: Flame, label: 'Habits', badgeKey: 'habits', onboarding: 'habits' },
  { to: '/notes', icon: FileText, label: 'Notes & Journals', onboarding: 'notes' },
  { to: '/focus', icon: Timer, label: 'Focus', onboarding: 'focus' },
  { to: '/projects', icon: FolderKanban, label: 'Projects', onboarding: 'projects' },
  { to: '/goals', icon: Flag, label: 'Goals', onboarding: 'goals' },
  { to: '/coach', icon: Sparkles, label: 'AI Coach', onboarding: 'coach' },
  { to: '/plans', icon: CreditCard, label: 'Plans & Pricing', onboarding: '' },
  { to: '/storage', icon: Database, label: 'Storage', onboarding: 'storage' },
  { to: '/settings', icon: Settings2, label: 'Settings', onboarding: 'settings' },
];

/**
 * Memoized outlet. The shell (AppLayout) re-subscribes to background data
 * (dashboard today, achievements, streak status, plan) and UI state. Without
 * memoization, every one of those updates re-renders the ACTIVE page too. This
 * wrapper renders the current route independently â€” navigation still updates it
 * (via route context), but shell-only re-renders no longer cascade into pages.
 */
const PageOutlet = memo(function PageOutlet() {
  return <Outlet />;
});

export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();
  // Subscribe to each UI-store slice individually instead of the whole store.
  // With a single `useUIStore()` destructure, ANY ui-state change (focus mode,
  // theme, modal toggles) re-renders this shell AND the active page. Individual
  // selectors let React bail out of re-rendering unless THAT slice changed.
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const layoutPreference = useUIStore((s) => s.layoutPreference);
  const setTheme = useUIStore((s) => s.setTheme);
  const setLayoutPreference = useUIStore((s) => s.setLayoutPreference);
  const setCalendarViewPreference = useUIStore((s) => s.setCalendarViewPreference);
  const setTaskViewPreference = useUIStore((s) => s.setTaskViewPreference);
  const setNotesViewPreference = useUIStore((s) => s.setNotesViewPreference);
  const pageTransitionsEnabled = useUIStore((s) => s.pageTransitionsEnabled);
  const floatingAnimationsEnabled = useUIStore((s) => s.floatingAnimationsEnabled);
  const setPageTransitionsEnabled = useUIStore((s) => s.setPageTransitionsEnabled);
  const setFloatingAnimationsEnabled = useUIStore((s) => s.setFloatingAnimationsEnabled);
  const logout = useLogout();
  const { isFeatureLocked } = useUserPlan();
  const openUpgrade = useUpgradeModalStore((s) => s.openUpgrade);

  const getLockFeature = (to: string): string | null => {
    if (to === '/coach' || to === '/ai') return 'aiCoach';
    if (to === '/goals') return 'goals';
    return null;
  };

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState<AchievementWithStatusDTO[]>([]);
  const { data: todayData } = useDashboardToday();
  const { data: achievements } = useAchievements();
  const { data: brokenStreaks } = useStreakStatus();
  const { data: settings } = useSettings();
  const seenAchievementKeysRef = useRef<Set<string> | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(true);
  const streakPopupDismissedAt = useUIStore((s) => s.streakPopupDismissedAt);
  const dismissStreakPopup = useUIStore((s) => s.dismissStreakPopup);
  const latestBrokenAt = brokenStreaks?.[0]?.brokenAt ?? null;
  const showStreakPopup = !!(
    latestBrokenAt &&
    streakModalOpen &&
    (!streakPopupDismissedAt || latestBrokenAt > streakPopupDismissedAt)
  );

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    applyLayoutPreference(layoutPreference);
  }, [layoutPreference]);

  // NOTE: No blanket "warm every route" preloader here. Firing ~13 prefetches a
  // moment after mount spiked the API + caused a big render wave on low-end
  // devices before the UI had settled. Data for the visited route is fetched by
  // the page itself, and the nav links already warm the *next* destination on
  // hover / focus / pointer-down â€” so the right data is cached right before the
  // user clicks, without loading everything upfront.

  useEffect(() => {
    if (!achievements) return;

    const unlocked = achievements
      .filter((achievement) => achievement.isUnlocked)
      .sort((a, b) => {
        const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return timeA - timeB;
      });

    if (!seenAchievementKeysRef.current) {
      seenAchievementKeysRef.current = new Set(unlocked.map((achievement) => achievement.key));
      return;
    }

    const newlyUnlocked = unlocked.filter((achievement) => !seenAchievementKeysRef.current?.has(achievement.key));

    if (newlyUnlocked.length > 0) {
      setAchievementQueue((current) => [...current, ...newlyUnlocked]);
      newlyUnlocked.forEach((achievement) => seenAchievementKeysRef.current?.add(achievement.key));
    }
  }, [achievements]);

  const activeAchievement = useMemo(() => achievementQueue[0] ?? null, [achievementQueue]);

  const closeAchievementCelebration = () => {
    setAchievementQueue((current) => current.slice(1));
  };

  useEffect(() => {
    if (!settings) return;

    const currentThemePref = useUIStore.getState().themePreference;
    const targetThemePref =
      settings.appearance.themePreference === 'SYSTEM'
        ? 'system'
        : settings.appearance.themePreference === 'DARK'
          ? 'dark'
          : 'light';
    if (currentThemePref !== targetThemePref) {
      void setTheme(targetThemePref, { animate: false });
    }

    if (layoutPreference !== settings.appearance.layoutPreference) {
      setLayoutPreference(settings.appearance.layoutPreference);
    }

    const mappedView = settings.appearance.calendarView === 'agenda' ? 'week' : settings.appearance.calendarView;
    if (useUIStore.getState().calendarViewPreference !== mappedView) {
      setCalendarViewPreference(mappedView);
    }

    if (settings.appearance.taskView && useUIStore.getState().taskViewPreference !== settings.appearance.taskView) {
      setTaskViewPreference(settings.appearance.taskView);
    }

    if (settings.appearance.notesView && useUIStore.getState().notesViewPreference !== settings.appearance.notesView) {
      setNotesViewPreference(settings.appearance.notesView);
    }

    if (
      typeof settings.appearance.pageTransitionsEnabled === 'boolean' &&
      pageTransitionsEnabled !== settings.appearance.pageTransitionsEnabled
    ) {
      setPageTransitionsEnabled(settings.appearance.pageTransitionsEnabled);
    }

    if (
      typeof settings.appearance.floatingAnimationsEnabled === 'boolean' &&
      floatingAnimationsEnabled !== settings.appearance.floatingAnimationsEnabled
    ) {
      setFloatingAnimationsEnabled(settings.appearance.floatingAnimationsEnabled);
    }

    if (user && user.recoveryEmail !== settings.security.recoveryEmail) {
      setUser({ ...user, recoveryEmail: settings.security.recoveryEmail });
    }
  }, [
    settings,
    setCalendarViewPreference,
    setLayoutPreference,
    setTaskViewPreference,
    setNotesViewPreference,
    setPageTransitionsEnabled,
    setFloatingAnimationsEnabled,
    setTheme,
    setUser,
    user,
    layoutPreference,
    pageTransitionsEnabled,
    floatingAnimationsEnabled,
  ]);

  // When the user disables floating/ambient animations, flag it on <html>
  // so the global CSS rule can kill decorative animations app-wide (leaving
  // hover/tap transitions intact).
  useEffect(() => {
    const root = document.documentElement;
    if (floatingAnimationsEnabled === false) {
      root.setAttribute('data-disable-floating', 'true');
    } else {
      root.removeAttribute('data-disable-floating');
    }
  }, [floatingAnimationsEnabled]);

  useEffect(() => {
    if (!latestBrokenAt) return;
    if (!streakPopupDismissedAt || latestBrokenAt > streakPopupDismissedAt) {
      setStreakModalOpen(true);
    }
  }, [latestBrokenAt, streakPopupDismissedAt]);

  // â”€â”€ Global keyboard shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // The AppLayout is always mounted, so we register shortcuts here that should
  // work *across* every page.  Task-level shortcuts (Q, E, Space, /, F) are
  // registered inside TasksPage so they have access to task-list state.
  //
  // Global keys:
  //   ?               â†’ Toggle shortcuts help modal
  //   Escape           â†’ Close modals (shortcuts, search, mobile-more)
  //   G then D         â†’ Navigate to Dashboard
  //   G then T         â†’ Navigate to Tasks
  //   G then C         â†’ Navigate to Calendar
  //   G then H         â†’ Navigate to Habits
  //   G then N         â†’ Navigate to Notes
  //   G then F         â†’ Navigate to Focus
  //   G then P         â†’ Navigate to Projects
  //   G then O         â†’ Navigate to Goals
  //   G then A         â†’ Navigate to AI Coach  
  //   G then S         â†’ Navigate to Settings
  //
  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;

      // ? â†’ toggle shortcuts modal
      if (e.key === '?' && !e.shiftKey === false) {
        // Shift+/ produces '?' key
        setShowShortcuts((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Escape â†’ close open modals
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (searchOpen) {
          setSearchOpen(false);
          return;
        }
        if (mobileMoreOpen) {
          setMobileMoreOpen(false);
          return;
        }
        return;
      }

      // G-prefix navigation (G then another key within 500 ms)
      if (e.key === 'g' || e.key === 'G') {
        gPressed = true;
        if (gTimeout) clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          gPressed = false;
        }, 500);
        e.preventDefault();
        return;
      }

      if (gPressed) {
        if (gTimeout) clearTimeout(gTimeout);
        gPressed = false;

        const navMap: Record<string, string> = {
          d: '/', // Dashboard
          t: '/tasks', // Tasks
          c: '/calendar', // Calendar
          h: '/habits', // Habits
          n: '/notes', // Notes
          f: '/focus', // Focus
          p: '/projects', // Projects
          o: '/goals', // Goals
          a: '/coach',
          s: '/settings', // Settings
        };

        const route = navMap[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [navigate, showShortcuts, searchOpen, mobileMoreOpen]);

  const contentPaddingClass = 'p-0 sm:pt-4 sm:px-4 md:px-6';

  const headerPaddingClass =
    layoutPreference === 'COMPACT'
      ? 'px-3 sm:px-4 md:px-5'
      : layoutPreference === 'EXPANDED'
        ? 'px-5 sm:px-8 md:px-10'
        : 'px-4 sm:px-6 md:px-8';

  const navPaddingClass =
    layoutPreference === 'COMPACT'
      ? 'px-2 py-3 gap-0.5'
      : layoutPreference === 'EXPANDED'
        ? 'px-4 py-5 gap-1.5'
        : 'px-3 py-4 gap-1';

  const taskBadge = (todayData?.pendingTasks ?? 0) > 0 ? todayData!.pendingTasks : '';
  const habitBadge = (todayData?.habitsToComplete ?? 0) > 0 ? todayData!.habitsToComplete : '';

  const mobilePrimaryItems = navItems.slice(0, 4);
  const mobileLeftItems = mobilePrimaryItems.slice(0, 2);
  const mobileRightItems = mobilePrimaryItems.slice(2, 4);
  const mobileOverflowItems = navItems.slice(4);

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .sidebar-rail {
          transition: width 220ms ease;
        }
        .sidebar-nav-link {
          transition: background-color 150ms ease, color 150ms ease;
        }
        [data-layout='compact'] .sidebar-nav-link {
          gap: 0.5rem;
          padding-top: 0.55rem;
          padding-bottom: 0.55rem;
        }
        .sidebar-nav-link-active {
          background: color-mix(in srgb, var(--color-accent) 8%, transparent);
        }
        .sidebar-nav-link-active::before {
          content: '';
          position: absolute;
          left: -12px;
          top: 6px;
          bottom: 6px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--color-accent);
        }
        .sidebar-nav-link.justify-center.sidebar-nav-link-active::before {
          left: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar-rail, .sidebar-nav-link { transition: none !important; }
        }
      `}</style>

      {/* â”€â”€ Desktop Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AppSidebar
        headerPaddingClass={headerPaddingClass}
        navPaddingClass={navPaddingClass}
        taskBadge={taskBadge}
        habitBadge={habitBadge}
        onRequestLogout={() => setLogoutConfirmOpen(true)}
      />

      {/* â”€â”€ Main content area (unchanged) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <header
          className={`flex items-center justify-between border-b shrink-0 gap-4 ${headerPaddingClass}`}
          style={{
            height: 'var(--topbar-height)',
            background: 'var(--topbar-bg)',
            borderColor: 'var(--topbar-border)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
            <div className="md:hidden flex items-center gap-2.5 min-w-0">
              <div
                className="w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-extrabold text-base text-text-primary tracking-tight truncate">{APP_NAME}</span>
            </div>

            <div className="hidden md:block">
              <span className="text-sm font-bold text-text-muted uppercase tracking-wider">{APP_NAME}</span>
            </div>
          </div>

          {/* Mobile search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2.5 rounded-xl text-text-muted hover:bg-[var(--sidebar-item-hover)] transition-colors"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="hidden items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-black sm:flex"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Keyboard size={14} />
              Shortcuts
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex relative items-center max-w-md w-64 md:w-80 transition-all duration-300"
            >
              <Search size={16} className="absolute left-3.5 text-text-muted" />
              <div
                className="w-full pl-10 pr-4 py-2 text-xs font-bold border rounded-xl text-left"
                style={{
                  background: 'var(--topbar-search-bg)',
                  borderColor: 'var(--topbar-search-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Search tasks, habits...
              </div>
              <div className="absolute right-3 flex items-center gap-1 text-[10px] text-text-muted font-bold">
                <span className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)' }}>
                  âŒ˜
                </span>
                <span className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)' }}>
                  K
                </span>
              </div>
            </button>
            <div className="p-1">
              <NotificationCenter />
            </div>

            {user && (
              <NavLink
                to="/profile"
                className="flex items-center gap-3 pl-1 sm:pl-2 border-l transition-opacity hover:opacity-80"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Avatar src={user.avatarUrl} name={user.name} email={user.email} size="md" showBorder />
                <div className="hidden lg:flex flex-col min-w-0">
                  <span className="text-xs font-bold text-text-primary leading-tight truncate">
                    {user.name ?? user.email.split('@')[0]}
                  </span>
                </div>
              </NavLink>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-24 md:pb-0 relative min-w-0">
          <PageTransition key={location.pathname} className={contentPaddingClass}>
            <PageOutlet />
          </PageTransition>
        </div>
      </main>

      {/* ── Mobile Dynamic Island Nav & Bottom Sheet Modal ── */}
      <MobileIslandNav onOpenMore={() => setMobileMoreOpen(true)} />

      <DraggableModal
        isOpen={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        title="Quick Actions & Apps"
      >
        <div className="flex flex-col gap-6 pt-1">
          {/* ─── QUICK ACTIONS GRID ─── */}
          <div>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                Quick Actions
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  label: 'New Task',
                  sub: 'Add to your list',
                  icon: CheckSquare,
                  to: '/tasks',
                  gradient: 'from-violet-600 to-indigo-600',
                  bgTint: 'bg-violet-500/5 dark:bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40',
                },
                {
                  label: 'Focus Session',
                  sub: 'Start a timer',
                  icon: Timer,
                  to: '/focus',
                  gradient: 'from-blue-600 to-cyan-600',
                  bgTint: 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
                },
                {
                  label: 'Quick Note',
                  sub: 'Capture an idea',
                  icon: FileText,
                  to: '/notes',
                  gradient: 'from-emerald-600 to-teal-600',
                  bgTint: 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
                },
                {
                  label: 'New Habit',
                  sub: 'Build a streak',
                  icon: Flame,
                  to: '/habits',
                  gradient: 'from-amber-500 to-orange-600',
                  bgTint: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
                },
              ].map(({ label, sub, icon: Icon, to, gradient, bgTint }) => (
                <motion.button
                  key={to}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  onClick={() => {
                    setMobileMoreOpen(false);
                    navigate(to);
                  }}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl text-left border transition-all shadow-xs ${bgTint}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <Icon size={19} strokeWidth={2.4} className="text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-text-primary leading-tight">
                      {label}
                    </span>
                    <span className="text-[10.5px] text-text-muted leading-tight mt-0.5 font-medium">
                      {sub}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ─── INSET GROUPED NAVIGATION ─── */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                Explore Apps
              </span>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-raised/50 divide-y divide-border/40 overflow-hidden shadow-xs">
              {[
                { to: '/projects', icon: FolderKanban, label: 'Projects', sub: 'Kanban boards & tasks', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
                { to: '/goals', icon: Flag, label: 'Goals', sub: 'OKRs & target tracking', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
                { to: '/coach', icon: Sparkles, label: 'AI Coach', sub: 'Smart productivity insights', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
                { to: '/plans', icon: CreditCard, label: 'Plans & Billing', sub: 'Upgrade & invoices', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
                { to: '/storage', icon: Database, label: 'Storage', sub: 'Media & attachments', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
                { to: '/settings', icon: Settings2, label: 'Settings', sub: 'Preferences & themes', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
              ].map(({ to, icon: Icon, label, sub, color, bg }) => {
                const lockFeature = getLockFeature(to);
                const isLocked = lockFeature ? isFeatureLocked(lockFeature) : false;
                const handleItemClick = (e: React.MouseEvent) => {
                  if (isLocked && lockFeature) {
                    e.preventDefault();
                    e.stopPropagation();
                    setMobileMoreOpen(false);
                    openUpgrade(lockFeature, `${lockFeature === 'aiCoach' ? 'AI Coach' : 'Goals'} is not available on your current plan.`);
                    return;
                  }
                  setMobileMoreOpen(false);
                };

                return (
                  <NavLink key={to} to={to} onClick={handleItemClick}>
                    <motion.div
                      whileTap={{ backgroundColor: 'var(--color-surface-hover, rgba(0,0,0,0.03))' }}
                      className="flex items-center gap-3 px-3.5 py-3 hover:bg-surface-hover transition-colors"
                    >
                      <div
                        className="w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: bg, color }}
                      >
                        <Icon size={18} strokeWidth={2.2} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[13.5px] font-semibold text-text-primary leading-tight">
                          {label}
                        </span>
                        <span className="text-[11px] text-text-muted leading-tight mt-0.5">
                          {sub}
                        </span>
                      </div>
                      {isLocked ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-accent/10 text-accent shrink-0">
                          <Lock size={10} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <ChevronRight size={16} className="text-text-muted/60 shrink-0" />
                      )}
                    </motion.div>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* ─── ACCOUNT FOOTER TILE ─── */}
          {user && (
            <div className="rounded-2xl p-3 bg-surface-raised/70 border border-border/70 flex items-center justify-between shadow-xs">
              <NavLink
                to="/profile"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={user.avatarUrl}
                    name={user.name}
                    email={user.email}
                    size="md"
                    className="border-2 border-surface shadow-xs"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13.5px] font-bold text-text-primary truncate leading-tight">
                      {user.name ?? user.email.split('@')[0]}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-accent/10 text-accent text-[9px] font-extrabold uppercase tracking-wide">
                      Pro
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted truncate leading-tight mt-0.5">
                    {user.email}
                  </span>
                </div>
              </NavLink>
              <button
                onClick={() => {
                  setMobileMoreOpen(false);
                  setLogoutConfirmOpen(true);
                }}
                aria-label="Sign out"
                className="ml-2 p-2 rounded-xl text-text-muted hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all shrink-0"
                title="Sign out"
              >
                <LogOut size={16} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>
      </DraggableModal>

      {/* ── Logout Confirmation Modal — portalled to body, above everything ── */}
      {createPortal(
        <AnimatePresence>
          {logoutConfirmOpen && (
            <motion.div
              key="logout-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ backdropFilter: 'blur(6px)', zIndex: 9999, background: 'rgba(0,0,0,0.55)' }}
              onClick={() => setLogoutConfirmOpen(false)}
            >
              <motion.div
                key="logout-card"
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.8 }}
                className="w-full max-w-sm rounded-2xl border p-6 flex flex-col gap-5"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <motion.div
                    initial={{ scale: 0.5, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.06 }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/10"
                  >
                    <LogOut size={26} className="text-red-500" />
                  </motion.div>
                  <div>
                    <h3 className="text-base font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                      Sign out?
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      You'll need to sign back in to access your account.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      setLogoutConfirmOpen(false);
                      logout.mutate();
                    }}
                    className="w-full py-3 rounded-xl text-sm font-extrabold text-white transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  >
                    Yes, sign me out
                  </button>
                  <button
                    onClick={() => setLogoutConfirmOpen(false)}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-transform active:scale-95"
                    style={{
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AchievementCelebrationModal
        open={!!activeAchievement}
        achievement={activeAchievement}
        onClose={closeAchievementCelebration}
      />

      <StreakBreakModal
        open={showStreakPopup}
        brokenStreaks={brokenStreaks ?? []}
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

      {showShortcuts &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowShortcuts(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border p-5"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                  Keyboard shortcuts
                </h3>
                <button onClick={() => setShowShortcuts(false)} style={{ color: 'var(--color-text-muted)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  ['Q', 'New task'],
                  ['E', 'Edit selected task'],
                  ['Space', 'Toggle complete'],
                  ['/', 'Focus search'],
                  ['F', 'Start focus mode'],
                  ['?', 'Show this help'],
                  ['Esc', 'Close modals'],
                  ['G + D', 'Go to Dashboard'],
                  ['G + T', 'Go to Tasks'],
                  ['G + C', 'Go to Calendar'],
                  ['G + H', 'Go to Habits'],
                  ['G + N', 'Go to Notes'],
                  ['G + F', 'Go to Focus'],
                  ['G + P', 'Go to Projects'],
                  ['G + O', 'Go to Goals'],
                  ['G + A' , 'Go to AI Coach'],
                  ['G + S', 'Go to Settings'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    <kbd
                      className="px-2 py-1 rounded-md text-[10px] font-bold border"
                      style={{
                        background: 'var(--color-bg)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

    </div>
  );
}
