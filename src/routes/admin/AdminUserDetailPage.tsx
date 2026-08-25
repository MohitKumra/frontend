// frontend/src/routes/admin/AdminUserDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertCircle, CheckCircle, Clock, ShieldAlert, Award } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR } from '../../utils/formatCurrency';

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [overrideDays, setOverrideDays] = useState('30');
  const [overrideReason, setOverrideReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchUserDetail() {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        adminApiClient.get(`/users/${id}`),
        adminApiClient.get('/plans'),
      ]);
      setUser(uRes.data.data);
      setPlans(pRes.data.data || []);
      if (pRes.data.data?.length > 0) {
        setSelectedPlanId(pRes.data.data[0].id);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to fetch user' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUserDetail();
  }, [id]);

  async function handleStatusChange(action: 'deactivate' | 'reactivate' | 'ban') {
    if (action === 'ban' && !actionReason.trim()) {
      alert('A reason is required when banning an account.');
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      await adminApiClient.patch(`/users/${id}/${action}`, { reason: actionReason });
      setMessage({ type: 'success', text: `User ${action}d successfully` });
      setActionReason('');
      fetchUserDetail();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || `Failed to ${action} user` });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGrantOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId || !overrideReason.trim()) return;

    setActionLoading(true);
    try {
      await adminApiClient.post(`/users/${id}/override-entitlement`, {
        planId: selectedPlanId,
        durationDays: parseInt(overrideDays, 10),
        reason: overrideReason,
      });
      setMessage({ type: 'success', text: 'Entitlement override granted successfully' });
      setOverrideReason('');
      fetchUserDetail();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to grant override' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevokeOverride(overrideId: string) {
    if (!confirm('Revoke this entitlement override?')) return;
    try {
      await adminApiClient.patch(`/users/${id}/revoke-entitlement/${overrideId}`, {
        reason: 'Revoked by admin from dashboard',
      });
      setMessage({ type: 'success', text: 'Override revoked' });
      fetchUserDetail();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to revoke override' });
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-text-muted">
        <Spinner size="lg" />
        <p className="text-sm mt-3 font-medium">Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-danger text-sm">User record not found</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-semibold mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Users</span>
          </button>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">{user?.identity?.email}</h1>
          <p className="text-xs text-text-muted font-mono mt-0.5">ID: {user?.identity?.id}</p>
        </div>

        <Badge
          variant={user?.identity?.status === 'ACTIVE' ? 'success' : user?.identity?.status === 'DEACTIVATED' ? 'warning' : 'danger'}
          size="md"
          dot
        >
          {user?.identity?.status}
        </Badge>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-success/10 border border-success/20 text-success'
              : 'bg-danger/10 border border-danger/20 text-danger'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Account Details Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="default">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <p className="flex justify-between"><span className="text-text-muted">Name:</span> <span className="font-semibold text-text-primary">{user?.identity?.name || 'Not set'}</span></p>
            <p className="flex justify-between"><span className="text-text-muted">Timezone:</span> <span className="font-semibold text-text-primary">{user?.identity?.timezone || 'UTC'}</span></p>
            <p className="flex justify-between"><span className="text-text-muted">Token Version:</span> <span className="font-mono font-semibold text-text-primary">{user?.identity?.tokenVersion ?? 0}</span></p>
            <p className="flex justify-between"><span className="text-text-muted">Joined:</span> <span className="text-text-secondary">{user?.identity?.createdAt ? new Date(user.identity.createdAt).toLocaleDateString() : '—'}</span></p>
            <p className="flex justify-between"><span className="text-text-muted">Last Login:</span> <span className="text-text-secondary">{user?.identity?.lastLoginAt ? new Date(user.identity.lastLoginAt).toLocaleString() : 'Never'}</span></p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <CardTitle>Authentication Providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised border border-border">
              <span className="font-medium text-text-secondary">Google OAuth</span>
              {user?.identity?.googleId ? <Badge variant="success" size="sm">Connected</Badge> : <Badge variant="default" size="sm">Not Linked</Badge>}
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised border border-border">
              <span className="font-medium text-text-secondary">Email Password</span>
              {user?.identity?.hasPassword ? <Badge variant="success" size="sm">Configured</Badge> : <Badge variant="default" size="sm">No Password</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Status Actions */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>Account Status Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <input
              type="text"
              placeholder="Audit reason for status change..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {user?.identity?.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={actionLoading}
                  onClick={() => handleStatusChange('deactivate')}
                >
                  Deactivate
                </Button>
              )}
              {user?.identity?.status === 'DEACTIVATED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={actionLoading}
                  onClick={() => handleStatusChange('reactivate')}
                >
                  Reactivate
                </Button>
              )}
              {user?.identity?.status !== 'BANNED' && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={actionLoading}
                  onClick={() => handleStatusChange('ban')}
                >
                  Permanently Ban
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Entitlement Overrides ─────────────────────────────────── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" />
            <div>
              <CardTitle>VIP & Entitlement Overrides</CardTitle>
              <p className="text-xs text-text-muted mt-0.5">
                Admin overrides take precedence over standard subscriptions, comping specific plan tiers
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.entitlementOverrides?.length > 0 ? (
            <div className="space-y-2">
              {user.entitlementOverrides.map((ov: any) => {
                  const isActive = !ov.revokedAt && new Date(ov.startsAt) <= new Date() && (!ov.endsAt || new Date(ov.endsAt) > new Date());
                  return (
                    <div
                      key={ov.id}
                      className="flex items-center justify-between p-3.5 bg-surface-raised rounded-xl border border-border text-xs"
                    >
                      <div>
                        <span className="font-bold text-accent">{ov.plan?.name}</span>
                        <span className="text-text-secondary ml-3">Reason: {ov.reason}</span>
                        <span className="text-text-muted ml-3">
                          Expires: {ov.endsAt ? new Date(ov.endsAt).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                      {isActive && (
                        <Button variant="danger" size="sm" onClick={() => handleRevokeOverride(ov.id)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-xs text-text-muted">No active entitlement overrides for this user.</p>
          )}

          {/* Grant Form */}
          <form onSubmit={handleGrantOverride} className="pt-4 border-t border-border flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Target Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.priceCents)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Duration (Days)</label>
              <input
                type="number"
                value={overrideDays}
                onChange={(e) => setOverrideDays(e.target.value)}
                min={1}
                className="w-24 px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text-primary"
              />
            </div>

            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold text-text-secondary mb-1">Audit Reason</label>
              <input
                type="text"
                placeholder="e.g. VIP comped for beta testing"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted"
              />
            </div>

            <Button type="submit" variant="primary" size="md" loading={actionLoading}>
              Grant Override
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Recent Login Events ─────────────────────────────────── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <CardTitle>Recent Login Events</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {user?.recentLogins?.length > 0 ? (
            <div className="divide-y divide-border/60 text-xs">
              {user.recentLogins.map((evt: any) => (
                <div key={evt.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-text-primary">
                    {evt.provider} ({evt.success ? '✅ Success' : '❌ Failed'})
                  </span>
                  <span className="font-mono text-text-muted">{evt.ipAddress || 'Unknown IP'}</span>
                  <span className="text-text-muted">{new Date(evt.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">No login events recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}