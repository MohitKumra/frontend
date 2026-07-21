import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import {
  LayoutDashboard, CheckSquare, CalendarDays, Target, FileText,
  Timer, BarChart2, LogOut, X ,Sparkles, Moon, Sun,
  Search, MoreHorizontal, Settings2, FolderKanban
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useLogout } from '../../features/auth/hooks/useAuth';
import { useSettings } from '../../features/settings/hooks/useSettings';
import { NotificationCenter } from '../../features/notifications/components/NotificationCenter';
import { SearchModal } from '../../features/search/components/SearchModal';
import { Tooltip } from '../ui/Tooltip';
import { DraggableModal } from '../ui/DraggableModal';
import { Badge } from '../ui/Badge';
import { PageTransition } from './PageTransition';
import { useDashboardToday } from '../../features/dashboard/hooks/useDashboard';
import { applyLayoutPreference } from '../../platform/layout';
import { queryClient } from '../../lib/queryClient';
import { dashboardApi } from '../../features/dashboard/api';
import { tasksApi } from '../../features/tasks/api';
import { notesApi } from '../../features/notes/api';
import { habitsApi } from '../../features/habits/api';
import { calendarApi } from '../../features/calendar/api';
import { settingsApi } from '../../features/settings/api';
import apiClient from '../../lib/apiClient';

type TaskListPage = Awaited<ReturnType<typeof tasksApi.list>>;

function fetchTasksPage(pageParam?: string): Promise<TaskListPage> {
  const params: Record<string, string> = { take: '20' };
  if (pageParam) params.cursor = pageParam;
  return tasksApi.list(params);
}

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', onboarding: 'dashboard' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks',     badgeKey: 'tasks', onboarding: 'tasks' },
  { to: '/calendar',  icon: CalendarDays,    label: 'Calendar',  onboarding: 'calendar' },
  { to: '/habits',    icon: Target,          label: 'Habits',    badgeKey: 'habits', onboarding: 'habits' },
  { to: '/notes',     icon: FileText,        label: 'Notes',     onboarding: 'notes' },
  { to: '/focus',     icon: Timer,           label: 'Focus',     onboarding: 'focus' },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics', onboarding: 'analytics' },
  { to: '/projects',  icon: FolderKanban,    label: 'Projects',  onboarding: 'projects' },
  { to: '/settings',  icon: Settings2,       label: 'Settings',  onboarding: 'settings' },
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
      void queryClient.prefetchQuery({ queryKey: ['habits'], queryFn: habitsApi.list });
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
      void queryClient.prefetchQuery({ queryKey: ['analytics', 'summary'], queryFn: () => apiClient.get('/analytics/summary').then((r) => r.data) });
      void queryClient.prefetchQuery({ queryKey: ['analytics', 'daily'], queryFn: () => apiClient.get('/analytics/daily').then((r) => r.data) });
      void queryClient.prefetchQuery({ queryKey: ['analytics', 'projects'], queryFn: () => apiClient.get('/analytics/projects').then((r) => r.data) });
      void queryClient.prefetchQuery({ queryKey: ['analytics', 'weekly'], queryFn: () => apiClient.get('/analytics/weekly').then((r) => r.data) });
      break;
    case '/settings':
      void queryClient.prefetchQuery({ queryKey: ['settings'], queryFn: settingsApi.getSettings });
      break;
    default:
      break;
  }
}

/** Active link styles for desktop sidebar — plain CSS, no JS measurement */
const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'sidebar-nav-link flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold select-none relative',
    isActive
      ? 'sidebar-nav-link-active text-accent'
      : 'text-text-secondary hover:text-text-primary hover:bg-[var(--sidebar-item-hover)]',
  ].join(' ');

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, toggleSidebar, theme, toggleTheme, layoutPreference, setTheme, setLayoutPreference, setCalendarViewPreference } = useUIStore();
  const logout = useLogout();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: todayData } = useDashboardToday();
  const { data: settings } = useSettings();

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    applyLayoutPreference(layoutPreference);
  }, [layoutPreference]);

  useEffect(() => {
    const routesToWarm = ['/', '/tasks', '/projects', '/calendar', '/habits', '/notes', '/focus', '/analytics', '/settings'];
    const timer = window.setTimeout(() => {
      routesToWarm.forEach((route) => warmRouteData(route));
    }, 500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settings) return;

    void setTheme(settings.appearance.themePreference === 'SYSTEM'
      ? 'system'
      : settings.appearance.themePreference === 'DARK'
        ? 'dark'
        : 'light', { animate: false });
    setLayoutPreference(settings.appearance.layoutPreference);
    const mappedView = settings.appearance.calendarView === 'agenda' ? 'week' : settings.appearance.calendarView;
    setCalendarViewPreference(mappedView);

    if (user && user.recoveryEmail !== settings.security.recoveryEmail) {
      setUser({ ...user, recoveryEmail: settings.security.recoveryEmail });
    }
  }, [
    settings,
    setCalendarViewPreference,
    setLayoutPreference,
    setTheme,
    setUser,
    user,
  ]);

  const contentPaddingClass =
    layoutPreference === 'COMPACT'
      ? 'p-3 sm:p-4 md:p-5'
      : layoutPreference === 'EXPANDED'
        ? 'p-5 sm:p-7 md:p-10'
        : 'p-4 sm:p-6 md:p-8';

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

  const taskBadge = todayData?.pendingTasks ?? 0;
  const habitBadge = todayData?.habitsToComplete ?? 0;

  const mobilePrimaryItems = navItems.slice(0, 4);
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
      <aside
        className={[
          'sidebar-rail hidden md:flex flex-col shrink-0 border-r',
          sidebarOpen ? 'w-64' : 'w-20',
        ].join(' ')}
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
          width: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-width-collapsed)',
        }}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        {/* Logo section */}
        <div
          className={`flex items-center gap-3 border-b shrink-0 justify-between ${headerPaddingClass}`}
          style={{ height: 'var(--topbar-height)', borderColor: 'var(--sidebar-border)' }}
        >
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-extrabold text-lg text-text-primary tracking-tight truncate">PMS</span>
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm mx-auto"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Sparkles size={18} className="text-white" />
            </div>
          )}

          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-text-muted hover:bg-[var(--sidebar-item-hover)] transition-colors"
              aria-label="Collapse sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation links */}
        <nav className={`flex-1 flex flex-col overflow-y-auto no-scrollbar ${navPaddingClass}`}>
          {sidebarOpen && (
            <span className="px-3.5 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 select-none">
              Navigation
            </span>
          )}

          {navItems.map(({ to, icon: Icon, label, badgeKey, onboarding }) => {
            const badgeValue = badgeKey === 'tasks' ? taskBadge : badgeKey === 'habits' ? habitBadge : undefined;

            const content = (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                data-onboarding={onboarding || undefined}
                onPointerEnter={() => warmRouteData(to)}
                onFocus={() => warmRouteData(to)}
                onPointerDown={() => warmRouteData(to)}
                className={({ isActive }) =>
                  [sidebarLinkClass({ isActive }), !sidebarOpen && 'justify-center'].filter(Boolean).join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={19} className="shrink-0" />
                    {sidebarOpen && <span className="truncate flex-1">{label}</span>}
                    {sidebarOpen && badgeValue && badgeValue > 0 && (
                      <Badge variant={isActive ? 'accent' : 'default'} size="sm" className="ml-auto">
                        {badgeValue}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            );

            return sidebarOpen ? (
              content
            ) : (
              <Tooltip key={to} content={label} side="right">
                {content}
              </Tooltip>
            );
          })}
        </nav>

        {/* User profile & logout */}
        <div className="p-3 border-t shrink-0 flex flex-col gap-2" style={{ borderColor: 'var(--sidebar-border)' }}>
          {sidebarOpen && user && (
            <div
              className="px-3 py-2.5 rounded-lg border flex items-center gap-3 min-w-0"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-text-onaccent"
                style={{ background: 'var(--gradient-accent)' }}
              >
                {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-primary truncate">
                  {user.name ?? user.email.split('@')[0]}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => logout.mutate()}
            className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 select-none text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label="Log out"
          >
            <LogOut size={19} className="shrink-0" />
            {sidebarOpen && <span className="flex-1 text-left">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content area (unchanged) ──────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <header
          className={`flex items-center justify-between border-b shrink-0 gap-4 ${headerPaddingClass}`}
          style={{ height: 'var(--topbar-height)', background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)' }}
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
              <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Workspace</span>
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
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex relative items-center max-w-md w-64 md:w-80 transition-all duration-300"
          >
            <Search size={16} className="absolute left-3.5 text-text-muted" />
            <div className="w-full pl-10 pr-4 py-2 text-xs font-bold border rounded-xl text-left"
                 style={{ background: 'var(--topbar-search-bg)', borderColor: 'var(--topbar-search-border)', color: 'var(--color-text-muted)' }}>
              Search tasks, habits...
            </div>
            <div className="absolute right-3 flex items-center gap-1 text-[10px] text-text-muted font-bold">
              <span className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)' }}>⌘</span>
              <span className="px-1 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)' }}>K</span>
            </div>
          </button>
            <div className="p-1">
              <NotificationCenter />
            </div>

            {user && (
              <div className="flex items-center gap-3 pl-1 sm:pl-2 border-l" style={{ borderColor: 'var(--color-border)' }}>
                <div
                  className="w-9 h-9 rounded-xl text-white font-extrabold text-sm flex items-center justify-center shadow-sm shrink-0"
                  style={{ background: 'var(--gradient-accent)' }}
                >
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col min-w-0">
                  <span className="text-xs font-bold text-text-primary leading-tight truncate">
                    {user.name ?? user.email.split('@')[0]}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-28 md:pb-0 relative min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition
              key={location.pathname}
              className={contentPaddingClass}
            >
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation - Enhanced Design ─────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t z-40 safe-area-pb"
        style={{ 
          background: 'var(--bottomnav-bg)', 
          borderColor: 'var(--bottomnav-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="px-2 pb-safe pt-1.5 flex items-center justify-around relative">
          {/* Animated indicator line */}
          <div 
            className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300"
            style={{ background: 'var(--color-accent)' }}
          />
          
          {mobilePrimaryItems.map(({ to, icon: Icon, label, onboarding }) => {
            const mobileOnboardingAttr = onboarding ? { 'data-onboarding-mobile': onboarding } : {};
            return (
            <NavLink 
              key={to} 
              to={to} 
              end={to === '/'} 
              onPointerEnter={() => warmRouteData(to)}
              onFocus={() => warmRouteData(to)}
              onPointerDown={() => warmRouteData(to)}
              {...mobileOnboardingAttr}
              className={({ isActive }) => [
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] font-bold transition-all duration-200 select-none relative',
                isActive ? 'text-accent' : 'text-text-muted'
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <div
                    className={[
                      'p-2 rounded-2xl flex items-center justify-center transition-all duration-300 relative',
                      isActive ? 'scale-110' : 'scale-100'
                    ].join(' ')}
                    style={{ 
                      background: isActive ? 'var(--bottomnav-indicator)' : 'transparent'
                    }}
                  >
                    {/* Icon size kept constant — the wrapping div's scale-110/
                        scale-100 (a GPU transform) already produces the grow
                        effect. Previously the size prop ALSO changed 20->22,
                        which mutates the SVG's width/height attributes and
                        forces a layout reflow of this whole flex row on every
                        tab switch — redundant with the transform above. */}
                    <Icon size={20} className="transition-all duration-200" />
                    
                    {/* Glow effect for active item */}
                    {isActive && (
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-30 blur-md"
                        style={{ background: 'var(--color-accent)' }}
                      />
                    )}
                  </div>
                  <span className={isActive ? 'font-extrabold' : ''}>{label}</span>
                </>
              )}
            </NavLink>
          );
          })}

          <button
            onClick={() => setMobileMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] font-bold text-text-muted hover:text-text-secondary transition-all duration-200 active:scale-95"
          >
            <div className="p-2 rounded-2xl flex items-center justify-center bg-gradient-to-br from-accent/10 to-info/10 border border-accent/20">
              <MoreHorizontal size={20} />
            </div>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Sheet More Menu - Enhanced Design ────────────────────── */}
      <DraggableModal isOpen={mobileMoreOpen} onClose={() => setMobileMoreOpen(false)} title="Quick Access">
        <div className="flex flex-col gap-5">
          {/* User Profile Card - Hero Style */}
          {user && (
            <div 
              className="relative overflow-hidden rounded-2xl p-5"
              style={{ background: 'var(--gradient-accent)' }}
            >
              {/* Ambient glow effect */}
              <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
              />
              
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white shadow-lg border-2 border-white/20" 
                     style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name ?? 'User'} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-extrabold text-white truncate">
                    {user.name ?? user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-white/80 truncate mt-0.5">{user.email}</p>
                </div>
                <NavLink
                  to="/settings"
                  onClick={() => setMobileMoreOpen(false)}
                  className="p-2.5 rounded-xl bg-white/15 active:bg-white/25 transition-colors"
                >
                  <Settings2 size={18} className="text-white" />
                </NavLink>
              </div>
            </div>
          )}

          {/* Grid Layout for Navigation Items */}
          <div className="grid grid-cols-3 gap-4">
            {mobileOverflowItems.filter(item => item.to !== '/settings').map(({ to, icon: Icon, label, badgeKey }) => {
              const badgeValue = badgeKey === 'tasks' ? taskBadge : badgeKey === 'habits' ? habitBadge : undefined;
              
              // Assign gradient based on route
              const gradientMap: Record<string, string> = {
                '/notes': 'var(--gradient-info)',
                '/focus': 'var(--gradient-success)',
                '/analytics': 'var(--gradient-danger)',
              };
              const gradient = gradientMap[to] || 'var(--gradient-accent)';
              
              return (
                <NavLink
                  key={to}
                  to={to}
                  onPointerEnter={() => warmRouteData(to)}
                  onFocus={() => warmRouteData(to)}
                  onPointerDown={() => warmRouteData(to)}
                  onClick={() => setMobileMoreOpen(false)}
                  className="relative flex flex-col items-center gap-3 p-4 rounded-2xl transition-transform active:scale-95"
                  style={{ 
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {/* Icon with gradient background */}
                  <div className="relative">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ background: gradient }}
                    >
                      <Icon size={20} className="text-white" />
                    </div>
                    {badgeValue && badgeValue > 0 && (
                      <div 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-md"
                        style={{ background: 'var(--color-danger)' }}
                      >
                        {badgeValue > 9 ? '9+' : badgeValue}
                      </div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className="text-[11px] font-bold text-text-primary text-center leading-tight">
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* Divider with style */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider" 
                    style={{ background: 'var(--color-bg)' }}>
                Account
              </span>
            </div>
          </div>

          {/* Sign Out Button - Prominent */}
          <button
            onClick={() => { setMobileMoreOpen(false); logout.mutate(); }}
            className="relative flex items-center justify-center gap-3 p-4 rounded-2xl font-bold text-sm transition-transform active:scale-98 overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500">
                <LogOut size={20} />
              </div>
              <span className="text-red-600 dark:text-red-400">Sign out</span>
            </div>
          </button>
        </div>
      </DraggableModal>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
