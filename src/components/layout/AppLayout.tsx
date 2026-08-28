import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { endOfMonth, format, startOfMonth } from 'date-fns';
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
import { Badge } from '../ui/Badge';
import { PageTransition } from './PageTransition';
import { AppSidebar } from './AppSidebar';
import { useDashboardToday, useAchievements } from '../../features/dashboard/hooks/useDashboard';
import { useStreakStatus } from '../../features/habits/hooks/useHabits';
import { applyLayoutPreference } from '../../platform/layout';
import { queryClient } from '../../lib/queryClient';
import { dashboardApi } from '../../features/dashboard/api';
import { tasksApi } from '../../features/tasks/api';
import { notesApi } from '../../features/notes/api';
import { habitsApi } from '../../features/habits/api';
import { calendarApi } from '../../features/calendar/api';
import { settingsApi } from '../../features/settings/api';
import { storageApi } from '../../features/storage/api';
import apiClient from '../../lib/apiClient';
import { AchievementCelebrationModal } from '../achievements/AchievementCelebrationModal';
import { StreakBreakModal } from '../habits/StreakBreakModal';
import type { AchievementWithStatusDTO } from '../../types';
import { createPortal } from 'react-dom';
type TaskListPage = Awaited<ReturnType<typeof tasksApi.list>>;

function fetchTasksPage(pageParam?: string): Promise<TaskListPage> {
  const params: Record<string, string> = { take: '20' };
  if (pageParam) params.cursor = pageParam;
  return tasksApi.list(params);
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', onboarding: 'dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks', badgeKey: 'tasks', onboarding: 'tasks' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar', onboarding: 'calendar' },
  { to: '/habits', icon: Target, label: 'Habits', badgeKey: 'habits', onboarding: 'habits' },
  { to: '/notes', icon: FileText, label: 'Notes & Journals', onboarding: 'notes' },
  { to: '/focus', icon: Timer, label: 'Focus', onboarding: 'focus' },
  { to: '/projects', icon: FolderKanban, label: 'Projects', onboarding: 'projects' },
  { to: '/goals', icon: Flag, label: 'Goals', onboarding: 'goals' },
  { to: '/coach', icon: Sparkles, label: 'AI Coach', onboarding: 'coach' },
  { to: '/plans', icon: CreditCard, label: 'Plans & Pricing', onboarding: '' },
  { to: '/storage', icon: Database, label: 'Storage', onboarding: 'storage' },
  { to: '/settings', icon: Settings2, label: 'Settings', onboarding: 'settings' },
];

function warmRouteData(route: string): void {
  switch (route) {
    case '/':
      void queryClient.prefetchQuery({ queryKey: ['dashboard', 'enhanced'], queryFn: dashboardApi.getEnhanced });
      void queryClient.prefetchQuery({ queryKey: ['dashboard', 'today'], queryFn: dashboardApi.getToday });
      break;
    case '/tasks':
      void queryClient.prefetchInfiniteQuery({
        queryKey: ['tasks', undefined],
        queryFn: ({ pageParam }: { pageParam?: string }) => fetchTasksPage(pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: TaskListPage) => lastPage.meta.nextCursor ?? undefined,
      });
      break;
    case '/projects':
      void queryClient.prefetchQuery({
        queryKey: ['projects'],
        queryFn: () => apiClient.get('/projects').then((r) => r.data),
      });
      break;
    case '/goals':
      void queryClient.prefetchQuery({
        queryKey: ['goals'],
        queryFn: () => apiClient.get('/goals').then((r) => r.data),
      });
      break;
    case '/calendar': {
      const now = new Date();
      const from = format(startOfMonth(now), 'yyyy-MM-dd');
      const to = format(endOfMonth(now), 'yyyy-MM-dd');
      void queryClient.prefetchQuery({
        queryKey: ['calendar', { from, to }],
        queryFn: () => calendarApi.getOverview({ from, to }),
      });
      void queryClient.prefetchInfiniteQuery({
        queryKey: ['tasks', undefined],
        queryFn: ({ pageParam }: { pageParam?: string }) => fetchTasksPage(pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: TaskListPage) => lastPage.meta.nextCursor ?? undefined,
      });
      break;
    }
    case '/habits':
      void queryClient.prefetchQuery({ queryKey: ['habits'], queryFn: () => habitsApi.list() });
      break;
    case '/notes':
      void queryClient.prefetchQuery({ queryKey: ['notes', undefined], queryFn: () => notesApi.list() });
      break;
    case '/focus':
      void queryClient.prefetchQuery({
        queryKey: ['focus'],
        queryFn: () => apiClient.get('/focus').then((r) => r.data),
      });
      void queryClient.prefetchQuery({
        queryKey: ['tasks', 'focus-active'],
        queryFn: () => tasksApi.list(),
      });
      break;
    case '/analytics':
      void queryClient.prefetchQuery({
        queryKey: ['analytics', 'summary'],
        queryFn: () => apiClient.get('/analytics/summary').then((r) => r.data),
      });
      void queryClient.prefetchQuery({
        queryKey: ['analytics', 'daily'],
        queryFn: () => apiClient.get('/analytics/daily').then((r) => r.data),
      });
      void queryClient.prefetchQuery({
        queryKey: ['analytics', 'projects'],
        queryFn: () => apiClient.get('/analytics/projects').then((r) => r.data),
      });
      void queryClient.prefetchQuery({
        queryKey: ['analytics', 'weekly'],
        queryFn: () => apiClient.get('/analytics/weekly').then((r) => r.data),
      });
      break;
    case '/storage':
      void queryClient.prefetchQuery({ queryKey: ['storage', 'files'], queryFn: storageApi.list });
      break;
    case '/settings':
      void queryClient.prefetchQuery({ queryKey: ['settings'], queryFn: settingsApi.getSettings });
      break;
    case '/coach':
    case '/ai':
      void queryClient.prefetchQuery({ queryKey: ['settings'], queryFn: settingsApi.getSettings });
      break;
    case '/profile':
      void queryClient.prefetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: () => apiClient.get('/auth/me').then((r) => r.data),
      });
      break;
    default:
      break;
  }
}

/**
 * Memoized outlet. The shell (AppLayout) re-subscribes to background data
 * (dashboard today, achievements, streak status, plan) and UI state. Without
 * memoization, every one of those updates re-renders the ACTIVE page too. This
 * wrapper renders the current route independently — navigation still updates it
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
  // hover / focus / pointer-down — so the right data is cached right before the
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

    void setTheme(
      settings.appearance.themePreference === 'SYSTEM'
        ? 'system'
        : settings.appearance.themePreference === 'DARK'
          ? 'dark'
          : 'light',
      { animate: false }
    );
    setLayoutPreference(settings.appearance.layoutPreference);
    const mappedView = settings.appearance.calendarView === 'agenda' ? 'week' : settings.appearance.calendarView;
    setCalendarViewPreference(mappedView);
    if (settings.appearance.taskView) {
      setTaskViewPreference(settings.appearance.taskView);
    }
    if (settings.appearance.notesView) {
      setNotesViewPreference(settings.appearance.notesView);
    }
    if (typeof settings.appearance.pageTransitionsEnabled === 'boolean') {
      setPageTransitionsEnabled(settings.appearance.pageTransitionsEnabled);
    }
    if (typeof settings.appearance.floatingAnimationsEnabled === 'boolean') {
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

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  //
  // The AppLayout is always mounted, so we register shortcuts here that should
  // work *across* every page.  Task-level shortcuts (Q, E, Space, /, F) are
  // registered inside TasksPage so they have access to task-list state.
  //
  // Global keys:
  //   ?               → Toggle shortcuts help modal
  //   Escape           → Close modals (shortcuts, search, mobile-more)
  //   G then D         → Navigate to Dashboard
  //   G then T         → Navigate to Tasks
  //   G then C         → Navigate to Calendar
  //   G then H         → Navigate to Habits
  //   G then N         → Navigate to Notes
  //   G then F         → Navigate to Focus
  //   G then P         → Navigate to Projects
  //   G then O         → Navigate to Goals
  //   G then A         → Navigate to AI Coach  
  //   G then S         → Navigate to Settings
  //
  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;

      // ? → toggle shortcuts modal
      if (e.key === '?' && !e.shiftKey === false) {
        // Shift+/ produces '?' key
        setShowShortcuts((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Escape → close open modals
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

  const contentPaddingClass = 'pt-3 sm:pt-4 px-3 sm:px-4';

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

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <AppSidebar
        headerPaddingClass={headerPaddingClass}
        navPaddingClass={navPaddingClass}
        taskBadge={taskBadge}
        habitBadge={habitBadge}
        onRequestLogout={() => setLogoutConfirmOpen(true)}
        warmRoute={warmRouteData}
      />

      {/* ── Main content area (unchanged) ──────────────────────────────── */}
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
              <span className="font-extrabold text-base text-text-primary tracking-tight truncate">FlowSpace</span>
            </div>

            <div className="hidden md:block">
              <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Finamite</span>
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
                  ⌘
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

        <div className="flex-1 overflow-y-auto pb-28 md:pb-0 relative min-w-0">
          {/* Deliberately no AnimatePresence: exit animations can get
              interrupted on mobile (rAF throttling during a fast tab switch),
              leaving the content area blank until a refresh. A plain keyed
              PageTransition unmounts the old page and mounts the new one
              instantly — content can never get stuck or flicker. */}
          <PageTransition key={location.pathname} className={contentPaddingClass}>
            <PageOutlet />
          </PageTransition>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation - Enhanced Design ─────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t z-40 safe-area-pb overflow-visible"
        style={{
          background: 'var(--bottomnav-bg)',
          borderColor: 'var(--bottomnav-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="px-2 pb-safe pt-1.5 flex items-end justify-around relative overflow-visible">
          {/* Animated indicator line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300"
            style={{ background: 'var(--color-accent)' }}
          />

          {/* Left 2 nav items */}
          {mobileLeftItems.map(({ to, icon: Icon, label, onboarding }) => {
            const mobileOnboardingAttr = onboarding ? { 'data-onboarding-mobile': onboarding } : {};
            const lockFeature = getLockFeature(to);
            const isLocked = lockFeature ? isFeatureLocked(lockFeature) : false;
            const handleNavClick = (e: React.MouseEvent) => {
              if (isLocked && lockFeature) {
                e.preventDefault();
                e.stopPropagation();
                openUpgrade(lockFeature, `${lockFeature === 'aiCoach' ? 'AI Coach' : 'Goals'} is not available on your current plan.`);
              }
            };
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onPointerEnter={() => warmRouteData(to)}
                onFocus={() => warmRouteData(to)}
                onPointerDown={() => warmRouteData(to)}
                onClick={handleNavClick}
                {...mobileOnboardingAttr}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] font-bold transition-all duration-200 select-none relative',
                    isActive ? 'text-accent' : 'text-text-muted',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={[
                        'p-2 rounded-2xl flex items-center justify-center transition-all duration-300 relative',
                        isActive ? 'scale-110' : 'scale-100',
                      ].join(' ')}
                      style={{ background: isActive ? 'var(--bottomnav-indicator)' : 'transparent' }}
                    >
                      <Icon size={20} className="transition-all duration-200" />
                      {isActive && (
                        <div
                          className="absolute inset-0 rounded-2xl opacity-30 blur-md"
                          style={{ background: 'var(--color-accent)' }}
                        />
                      )}
                      {isLocked && (
                        <div
                          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shadow-sm"
                          style={{ background: 'var(--color-accent)' }}
                        >
                          <Lock size={8} />
                        </div>
                      )}
                    </div>
                    <span className={isActive ? 'font-extrabold' : ''}>{label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Center Plus / More button — floats above the bar */}
          <div className="relative flex flex-col items-center flex-1 z-10" style={{ marginBottom: '-2px' }}>
            <button
              onClick={() => setMobileMoreOpen(true)}
              aria-label="More options"
              className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg active:scale-90 transition-transform duration-150 text-white"
              style={{
                background: 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)',
                boxShadow: '0 4px 20px rgba(108,99,255,0.5), 0 2px 8px rgba(0,0,0,0.25)',
                marginTop: '-22px',
              }}
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
            <span className="text-[10px] font-bold text-text-muted mt-1 pb-2 leading-none">More</span>
          </div>

          {/* Right 2 nav items */}
          {mobileRightItems.map(({ to, icon: Icon, label, onboarding }) => {
            const mobileOnboardingAttr = onboarding ? { 'data-onboarding-mobile': onboarding } : {};
            const lockFeature = getLockFeature(to);
            const isLocked = lockFeature ? isFeatureLocked(lockFeature) : false;
            const handleNavClick = (e: React.MouseEvent) => {
              if (isLocked && lockFeature) {
                e.preventDefault();
                e.stopPropagation();
                openUpgrade(lockFeature, `${lockFeature === 'aiCoach' ? 'AI Coach' : 'Goals'} is not available on your current plan.`);
              }
            };
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onPointerEnter={() => warmRouteData(to)}
                onFocus={() => warmRouteData(to)}
                onPointerDown={() => warmRouteData(to)}
                onClick={handleNavClick}
                {...mobileOnboardingAttr}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] font-bold transition-all duration-200 select-none relative',
                    isActive ? 'text-accent' : 'text-text-muted',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={[
                        'p-2 rounded-2xl flex items-center justify-center transition-all duration-300 relative',
                        isActive ? 'scale-110' : 'scale-100',
                      ].join(' ')}
                      style={{ background: isActive ? 'var(--bottomnav-indicator)' : 'transparent' }}
                    >
                      <Icon size={20} className="transition-all duration-200" />
                      {isActive && (
                        <div
                          className="absolute inset-0 rounded-2xl opacity-30 blur-md"
                          style={{ background: 'var(--color-accent)' }}
                        />
                      )}
                      {isLocked && (
                        <div
                          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shadow-sm"
                          style={{ background: 'var(--color-accent)' }}
                        >
                          <Lock size={8} />
                        </div>
                      )}
                    </div>
                    <span className={isActive ? 'font-extrabold' : ''}>{label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile Bottom Sheet More Menu - Enhanced Design ────────────────────── */}
      <DraggableModal isOpen={mobileMoreOpen} onClose={() => setMobileMoreOpen(false)} title="Quick Access">
        <div className="flex flex-col gap-5">
          {/* User Profile Card - Hero Style */}
          {user && (
            <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'var(--gradient-accent)' }}>
              {/* Ambient glow effect */}
              <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
              />

              <div className="relative flex items-center gap-4">
                <NavLink to="/profile" onClick={() => setMobileMoreOpen(false)}>
                  <Avatar
                    src={user.avatarUrl}
                    name={user.name}
                    email={user.email}
                    size="lg"
                    className="shadow-lg border-2 border-white/20"
                  />
                </NavLink>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-extrabold text-white truncate">
                    {user.name ?? user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-white/80 truncate mt-0.5">{user.email}</p>
                </div>
                <button
                  onClick={() => setLogoutConfirmOpen(true)}
                  aria-label="Sign out"
                  className="p-2.5 rounded-xl bg-white/15 active:bg-white/25 transition-colors"
                >
                  <LogOut size={18} className="text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Grid Layout for Navigation Items — includes Settings */}
          <div className="grid grid-cols-3 gap-4">
            {mobileOverflowItems.map(({ to, icon: Icon, label, badgeKey }) => {
              const badgeValue = badgeKey === 'tasks' ? taskBadge : badgeKey === 'habits' ? habitBadge : undefined;
              const lockFeature = getLockFeature(to);
              const isLocked = lockFeature ? isFeatureLocked(lockFeature) : false;

              const gradientMap: Record<string, string> = {
                '/notes': 'var(--gradient-info)',
                '/focus': 'var(--gradient-success)',
                '/analytics': 'var(--gradient-danger)',
                '/goals': 'var(--gradient-accent)',
                '/projects': 'var(--gradient-accent)',
                '/coach': 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                '/plans': 'linear-gradient(135deg, #059669, #10b981)',
                '/storage': 'linear-gradient(135deg, #4f46e5, #6366f1)',
                '/settings': 'linear-gradient(135deg, #6b7280, #4b5563)',
              };
              const gradient = gradientMap[to] ?? 'var(--gradient-accent)';

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
                <NavLink
                  key={to}
                  to={to}
                  onPointerEnter={() => warmRouteData(to)}
                  onFocus={() => warmRouteData(to)}
                  onPointerDown={() => warmRouteData(to)}
                  onClick={handleItemClick}
                  className="relative flex flex-col items-center gap-3 p-4 rounded-2xl transition-transform active:scale-95"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ background: gradient }}
                    >
                      <Icon size={20} className="text-white" />
                    </div>
                    {isLocked ? (
                      <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-md"
                        style={{ background: 'var(--color-accent)' }}
                        title="Locked"
                      >
                        <Lock size={10} />
                      </div>
                    ) : badgeValue && badgeValue > 0 ? (
                      <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-md"
                        style={{ background: 'var(--color-danger)' }}
                      >
                        {badgeValue > 9 ? '9+' : badgeValue}
                      </div>
                    ) : null}
                  </div>
                  <span className="text-[11px] font-bold text-text-primary text-center leading-tight">{label}</span>
                </NavLink>
              );
            })}
          </div>
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
