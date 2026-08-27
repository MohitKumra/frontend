// frontend/src/routes/admin/AdminUsersPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, ShieldCheck, ChevronRight } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  status: 'ACTIVE' | 'DEACTIVATED' | 'BANNED';
  authMethods: {
    hasGoogle: boolean;
    hasPassword: boolean;
    primaryMethod: string;
  };
  lastLoginAt: string | null;
  createdAt: string;
  plan: string;
  planSlug: string;
  planSource?: 'OVERRIDE' | 'SUBSCRIPTION' | 'FREE';
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '15',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await adminApiClient.get(`/users?${params}`);
      setUsers(res.data.items || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">User Administration</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Inspect user profiles, manage account states, and view authentication providers
          </p>
        </div>
      </div>

      {/* ─── Search & Filters ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent"
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="DEACTIVATED">Deactivated Only</option>
          <option value="BANNED">Banned Only</option>
        </select>
      </div>

      {/* ─── Users Table Card ─────────────────────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Auth Method</th>
                <th className="px-5 py-3.5">Current Plan</th>
                <th className="px-5 py-3.5">Last Login</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="hover:bg-surface-raised/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-text-primary">{u.email}</p>
                      {u.name && <p className="text-xs text-text-muted">{u.name}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          u.status === 'ACTIVE' ? 'success' : u.status === 'DEACTIVATED' ? 'warning' : 'danger'
                        }
                        size="sm"
                        dot
                      >
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        {u.authMethods?.hasGoogle && (
                          <Badge variant="accent" size="sm">
                            Google
                          </Badge>
                        )}
                        {u.authMethods?.hasPassword && (
                          <Badge variant="default" size="sm">
                            Password
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary font-medium">
                      {u.plan === 'Free' ? 'Free Tier' : u.plan}
                      {u.planSource === 'OVERRIDE' && (
                        <span className="ml-1 text-[10px] font-bold text-accent uppercase">(comped)</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-text-muted text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-4 text-text-muted text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-accent font-semibold text-xs hover:underline">
                        Manage <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-border flex items-center justify-between text-xs text-text-muted bg-surface-raised/30">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}