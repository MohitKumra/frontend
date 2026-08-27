// frontend/src/components/layout/AppSidebar.tsx
// Extracted desktop sidebar used by AppLayout. Keeps the sidebar markup in its
// own component so it can be restyled independently.
//
// Restyled to match the reference mock: a standalone Dashboard link, three
// labeled groups (Productivity / Planning / Settings), a soft rounded "pill"
// active state, redesigned storage + profile cards, and a decorative
// illustration that anchors the bottom of the rail.

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, CalendarDays, Target, FileText, Timer,
  FolderKanban, Flag, Sparkles, CreditCard, Settings2, ChevronsLeft, ChevronRight,
  Lock, LogOut, Database,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useUserPlan } from '../../features/billing/useUserPlan';
import { UpgradeModal } from '../billing/UpgradeModal';
import { Tooltip } from '../ui/Tooltip';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';

export interface AppSidebarProps {
  headerPaddingClass: string;
  navPaddingClass: string;
  taskBadge: number | '';
  habitBadge: number | '';
  onRequestLogout: () => void;
  warmRoute?: (to: string) => void;
  /** Shown as the small caption under the product name in the logo block. */
  workspaceName?: string;
}

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  badgeKey?: 'tasks' | 'habits';
  onboarding?: string;
  tag?: string;
  trailing?: boolean;
};

const topNavItem: NavItem = { to: '/', icon: LayoutDashboard, label: 'Dashboard', onboarding: 'dashboard' };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Productivity',
    items: [
      { to: '/tasks', icon: CheckSquare, label: 'Tasks', badgeKey: 'tasks', onboarding: 'tasks' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar', onboarding: 'calendar' },
      { to: '/habits', icon: Target, label: 'Habits', badgeKey: 'habits', onboarding: 'habits' },
      { to: '/notes', icon: FileText, label: 'Notes & Journals', onboarding: 'notes' },
      { to: '/focus', icon: Timer, label: 'Focus', onboarding: 'focus' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/projects', icon: FolderKanban, label: 'Projects', onboarding: 'projects' },
      { to: '/goals', icon: Flag, label: 'Goals', onboarding: 'goals' },
      { to: '/coach', icon: Sparkles, label: 'AI Coach', onboarding: 'coach', tag: 'AI' },
      { to: '/plans', icon: CreditCard, label: 'Plans & Pricing', onboarding: '' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings', icon: Settings2, label: 'Settings', onboarding: 'settings', trailing: true },
    ],
  },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? Math.round(value) : value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/** Small duotone hill / telescope scene that anchors the bottom of the rail. */
function SidebarIllustration() {
  return (
    <div className="relative shrink-0 h-28 overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 300 160"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
      >
        <circle cx="248" cy="26" r="1.6" fill="var(--color-accent)" opacity="0.5" />
        <circle cx="220" cy="46" r="1.2" fill="var(--color-accent)" opacity="0.35" />
        <circle cx="268" cy="58" r="1.4" fill="var(--color-accent)" opacity="0.4" />
        <path d="M0 150 C 60 90, 110 90, 150 118 C 190 90, 240 90, 300 150 L300 160 L0 160 Z" fill="var(--color-accent)" opacity="0.16" />
        <path d="M0 160 C 70 105, 140 100, 210 140 C 250 120, 280 128, 300 150 L300 160 L0 160 Z" fill="var(--color-accent)" opacity="0.3" />
        <path d="M60 140 L74 112 L88 140 Z" fill="var(--color-accent)" opacity="0.4" />
        <path d="M42 145 L54 122 L66 145 Z" fill="var(--color-accent)" opacity="0.4" />
        <g transform="translate(150 96)">
          <circle cx="0" cy="0" r="7" fill="var(--color-accent)" opacity="0.55" />
          <path d="M-5 8 L5 8 L7 34 L-7 34 Z" fill="var(--color-accent)" opacity="0.55" />
          <rect x="-1.5" y="-3" width="22" height="5" rx="2.5" transform="rotate(-28)" fill="var(--color-accent)" opacity="0.55" />
        </g>
      </svg>
    </div>
  );
}

const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'sidebar-nav-link flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold select-none relative transition-colors',
    isActive
      ? 'sidebar-nav-link-active text-accent font-bold'
      : 'text-text-secondary hover:text-text-primary hover:bg-[var(--sidebar-item-hover)]',
  ].join(' ');

export function AppSidebar({
  headerPaddingClass,
  navPaddingClass,
  taskBadge,
  habitBadge,
  onRequestLogout,
  warmRoute,
  workspaceName = 'Workspace',
}: AppSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const { isFeatureLocked, usage } = useUserPlan();
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);

  const storageUsedBytes = usage?.storageUsedBytes ?? 0;
  const storageLimitBytes = usage?.storageLimitBytes ?? 0;
  const storagePct =
    storageLimitBytes > 0 && storageLimitBytes !== Infinity
      ? Math.min(100, Math.round((storageUsedBytes / storageLimitBytes) * 100))
      : 0;
  const unlimitedStorage = storageLimitBytes <= 0 || storageLimitBytes === Infinity;

  const renderNavItem = (item: NavItem) => {
    const { to, icon: Icon, label, badgeKey, onboarding, tag, trailing } = item;
    const badgeValue = badgeKey === 'tasks' ? taskBadge : badgeKey === 'habits' ? habitBadge : undefined;
    const lockFeature = to === '/coach' ? 'aiCoach' : to === '/goals' ? 'goals' : null;
    const isLocked = lockFeature ? isFeatureLocked(lockFeature) : false;
    const handleLockedClick = (e: React.MouseEvent) => {
      if (!isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      setLockedFeature(lockFeature);
    };
    const content = (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        data-onboarding={onboarding || undefined}
        onPointerEnter={() => warmRoute?.(to)}
        onFocus={() => warmRoute?.(to)}
        onPointerDown={() => warmRoute?.(to)}
        onClick={handleLockedClick}
        className={({ isActive }) =>
          [sidebarLinkClass({ isActive }), !sidebarOpen && 'justify-center'].filter(Boolean).join(' ')
        }
        style={({ isActive }: { isActive: boolean }) =>
          isActive ? { background: 'var(--sidebar-active-bg, rgba(109,94,245,0.12))' } : undefined
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={19} className="shrink-0" />
            {sidebarOpen && <span className="truncate flex-1">{label}</span>}
            {sidebarOpen && tag && (
              <span
                className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--sidebar-active-bg, rgba(109,94,245,0.14))', color: 'var(--color-accent)' }}
              >
                {tag}
              </span>
            )}
            {sidebarOpen && badgeValue && badgeValue > 0 && (
              <Badge variant={isActive ? 'accent' : 'default'} size="sm" className="ml-auto">
                {badgeValue}
              </Badge>
            )}
            {sidebarOpen && isLocked && (
              <Lock size={14} className="ml-auto text-accent shrink-0" aria-label="Locked" />
            )}
            {sidebarOpen && trailing && isActive && !isLocked && (
              <ChevronRight size={16} className="ml-auto text-accent shrink-0" />
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
  };

  return (
    <aside
      className={['sidebar-rail hidden md:flex flex-col shrink-0 border-r', sidebarOpen ? 'w-64' : 'w-20'].join(' ')}
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
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="font-extrabold text-lg text-text-primary tracking-tight truncate">PMS</p>
              <p className="text-[11px] font-semibold text-text-muted truncate -mt-0.5">{workspaceName}</p>
            </div>
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm mx-auto"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
        )}
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl border text-text-muted hover:bg-[var(--sidebar-item-hover)] transition-colors shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation links */}
      <nav className={`flex-1 flex flex-col overflow-y-auto no-scrollbar gap-4 ${navPaddingClass}`}>
        <div>{renderNavItem(topNavItem)}</div>

        {navGroups.map((group) => (
          <div key={group.label}>
            {sidebarOpen && (
              <span className="px-3.5 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 select-none block">
                {group.label}
              </span>
            )}
            <div className="flex flex-col gap-1">{group.items.map(renderNavItem)}</div>
          </div>
        ))}
      </nav>

      {/* Storage capacity indicator (blue → red) */}
      {sidebarOpen ? (
        <div className={`shrink-0 ${navPaddingClass}`}>
          <NavLink
            to="/storage"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-colors hover:bg-[var(--sidebar-item-hover)] ${
                isActive ? 'ring-2 ring-accent/30 border-accent/40' : ''
              }`
            }
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--sidebar-active-bg, rgba(109,94,245,0.12))' }}
            >
              <Database size={15} style={{ color: 'var(--color-accent)' }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-text-muted">
                <span>Storage</span>
                <span>{unlimitedStorage ? '∞' : `${storagePct}% used`}</span>
              </div>
              {!unlimitedStorage && (
                <div className="mt-1.5 h-1.5 rounded-full bg-surface overflow-hidden border border-border/40">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${storagePct}%`,
                      background:
                        storagePct >= 90 ? 'var(--color-danger)'
                          : storagePct >= 70 ? 'var(--color-warning)'
                            : 'var(--color-accent)',
                    }}
                  />
                </div>
              )}
              <p className="mt-1 text-[10px] text-text-muted truncate">
                {unlimitedStorage ? 'Unlimited storage' : `${formatBytes(storageUsedBytes)} of ${formatBytes(storageLimitBytes)} used`}
              </p>
            </div>
          </NavLink>
        </div>
      ) : (
        <div className="shrink-0 flex justify-center py-1">
          <Tooltip content={`Storage: ${unlimitedStorage ? 'Unlimited' : `${storagePct}% used`}`} side="right">
            <NavLink
              to="/storage"
              className={({ isActive }) =>
                `w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors hover:bg-[var(--sidebar-item-hover)] ${
                  isActive ? 'border-accent text-accent ring-2 ring-accent/20' : 'text-text-muted border-border/60'
                }`
              }
              style={{ background: 'var(--color-surface-raised)' }}
            >
              <Database size={16} style={{ color: 'var(--color-accent)' }} />
            </NavLink>
          </Tooltip>
        </div>
      )}

      {/* User profile & logout */}
      <div className={`shrink-0 flex flex-col gap-2 pt-3 pb-3 ${navPaddingClass}`}>
        {sidebarOpen && user && (
          <NavLink
            to="/profile"
            className="px-3 py-2.5 rounded-2xl border flex items-center gap-3 min-w-0 transition-colors hover:bg-[var(--sidebar-item-hover)]"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <Avatar src={user.avatarUrl} name={user.name} email={user.email} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text-primary truncate">{user.name ?? user.email.split('@')[0]}</p>
              <p className="text-[11px] text-text-muted truncate">{user.email}</p>
            </div>
            <ChevronRight size={14} className="text-text-muted shrink-0 rotate-90" />
          </NavLink>
        )}
        {!sidebarOpen && user && (
          <Tooltip content="Profile" side="right">
            <NavLink to="/profile" className="flex justify-center py-2">
              <Avatar src={user.avatarUrl} name={user.name} email={user.email} size="sm" />
            </NavLink>
          </Tooltip>
        )}
        <button
          onClick={onRequestLogout}
          className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-colors duration-150 select-none text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          aria-label="Log out"
        >
          <LogOut size={19} className="shrink-0" />
          {sidebarOpen && <span className="flex-1 text-left">Sign out</span>}
        </button>
      </div>

      {/* Decorative bottom illustration — fixed height so it never competes with nav for space */}
      {sidebarOpen && <SidebarIllustration />}

      <UpgradeModal
        isOpen={lockedFeature !== null}
        onClose={() => setLockedFeature(null)}
        highlightFeature={lockedFeature ?? undefined}
      />
    </aside>
  );
}