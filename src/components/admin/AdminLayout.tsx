// frontend/src/components/admin/AdminLayout.tsx
// Shell layout for the admin portal matching the website design theme.

import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Tag,
  RefreshCw,
  Receipt,
  BarChart3,
  ShieldCheck,
  Activity,
  Settings,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { adminApiClient } from '../../lib/adminApiClient';
import { Badge } from '../ui/Badge';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/plans', label: 'Plans & Pricing', icon: CreditCard },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { to: '/admin/transactions', label: 'Transactions', icon: Receipt },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/audit-log', label: 'Audit Trail', icon: ShieldCheck },
  { to: '/admin/system', label: 'System & Health', icon: Activity },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const { admin, clearSession } = useAdminStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await adminApiClient.post('/auth/logout');
    } catch {}
    clearSession();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-bg text-text-primary overflow-hidden">
      {/* ─── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Admin Console</p>
              <p className="text-sm font-semibold text-text-primary truncate">{admin?.email}</p>
              <div className="mt-1">
                <Badge variant="accent" size="sm">
                  {admin?.role?.replace('_', ' ') || 'SUPER ADMIN'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)]">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-accent text-text-onaccent shadow-md shadow-accent/15'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer / Sign Out */}
        <div className="p-4 border-t border-border bg-surface-raised/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-bg p-8">
        <Outlet />
      </main>
    </div>
  );
}