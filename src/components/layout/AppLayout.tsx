import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, CalendarDays, Target, FileText,
  Timer, BarChart2, LogOut, X, Sparkles, Moon, Sun,
  Search, MoreHorizontal, ChevronRight, User, Settings2, Mail
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useLogout } from '../../features/auth/hooks/useAuth';
import { useSettings } from '../../features/settings/hooks/useSettings';
import { NotificationCenter } from '../../features/notifications/components/NotificationCenter';
import { SearchModal } from '../../features/search/components/SearchModal';
import { Tooltip } from '../ui/Tooltip';
import { BottomSheet } from '../ui/BottomSheet';
import { Badge } from '../ui/Badge';
import { useDashboardToday } from '../../features/dashboard/hooks/useDashboard';
import { applyLayoutPreference } from '../../platform/layout';

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks',      badgeKey: 'tasks' },
  { to: '/planner',   icon: Calendar,        label: 'Planner' },
  { to: '/calendar',  icon: CalendarDays,    label: 'Calendar' },
  { to: '/habits',    icon: Target,          label: 'Habits',     badgeKey: 'habits' },
  { to: '/notes',     icon: FileText,        label: 'Notes' },
  { to: '/messages',  icon: Mail,            label: 'Messages' },
  { to: '/focus',     icon: Timer,           label: 'Focus' },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',  icon: Settings2,       label: 'Settings' },
];

/** Active link styles for mobile bottom nav (unchanged) */
const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-bold transition-all duration-200 select-none',
    isActive
      ? 'text-accent'
      : 'text-text-muted hover:text-text-secondary',
  ].join(' ');

/** Active link styles for desktop sidebar — plain CSS, no JS measurement */
const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'sidebar-nav-link flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold select-none relative',
    isActive
      ? 'sidebar-nav-link-active text-accent'
      : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
  ].join(' ');

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
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
    if (!settings) return;

    void setTheme(settings.appearance.themePreference === 'SYSTEM'
      ? 'system'
      : settings.appearance.themePreference === 'DARK'
        ? 'dark'
        : 'light');
    setLayoutPreference(settings.appearance.layoutPreference);
    setCalendarViewPreference(settings.appearance.calendarView);

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
        [data-layout='compact'] .page-enter > * {
          max-width: 100%;
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
              className="p-1.5 rounded-lg text-text-muted hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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

          {navItems.map(({ to, icon: Icon, label, badgeKey }) => {
            const badgeValue = badgeKey === 'tasks' ? taskBadge : badgeKey === 'habits' ? habitBadge : undefined;

            const content = (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
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
          className={`flex items-center justify-between border-b bg-white dark:bg-slate-900 shrink-0 gap-4 ${headerPaddingClass}`}
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

          {/* Desktop search button/input */}
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

          {/* Mobile search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2.5 rounded-xl text-text-muted hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              onClick={() => toggleTheme()}
              className="p-2.5 rounded-xl text-text-muted hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
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

        <div className="flex-1 overflow-y-auto pb-24 md:pb-0 relative min-w-0">
          <div className={`page-enter ${contentPaddingClass}`}>
            <Outlet />
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation (unchanged) ─────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t z-40 px-3 pb-5 pt-2 flex items-center justify-around"
        style={{ background: 'var(--bottomnav-bg)', borderColor: 'var(--bottomnav-border)', height: 'var(--bottomnav-height)' }}
      >
        {mobilePrimaryItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={mobileNavClass}>
            {({ isActive }) => (
              <>
                <div
                  className="p-1 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{ background: isActive ? 'var(--bottomnav-indicator)' : 'transparent' }}
                >
                  <Icon size={20} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setMobileMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-bold text-text-muted hover:text-text-secondary"
        >
          <div className="p-1 rounded-xl flex items-center justify-center">
            <MoreHorizontal size={20} />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* ── Mobile Bottom Sheet More Menu (unchanged) ────────────────────── */}
      <BottomSheet isOpen={mobileMoreOpen} onClose={() => setMobileMoreOpen(false)} title="More Features">
        <div className="flex flex-col gap-2 stagger">
          {mobileOverflowItems.map(({ to, icon: Icon, label, badgeKey }) => {
            const badgeValue = badgeKey === 'tasks' ? taskBadge : badgeKey === 'habits' ? habitBadge : undefined;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-3.5 p-4 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all font-bold text-text-primary text-sm"
                style={{ border: '1px solid var(--color-border-subtle)' }}
              >
                <div className="w-10 h-10 icon-container" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
                  <Icon size={20} />
                </div>
                <span className="flex-1">{label}</span>
                {badgeValue && badgeValue > 0 && <Badge variant="accent" size="sm">{badgeValue}</Badge>}
                <ChevronRight size={16} className="text-text-muted" />
              </NavLink>
            );
          })}

          <div className="h-px bg-border my-2" />

          {user && (
            <div className="flex items-center gap-3.5 p-4 rounded-2xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-text-onaccent shadow-sm" style={{ background: 'var(--gradient-accent)' }}>
                <User size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">
                  {user.name ?? user.email.split('@')[0]}
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => { setMobileMoreOpen(false); logout.mutate(); }}
            className="flex items-center gap-3.5 p-4 rounded-2xl hover:bg-red-500/10 text-red-500 font-bold text-sm text-left"
            style={{ border: '1px solid var(--color-border-subtle)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-500/10 text-red-500">
              <LogOut size={20} />
            </div>
            <span className="flex-1">Sign out</span>
          </button>
        </div>
      </BottomSheet>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
