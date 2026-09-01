// frontend/src/routes/admin/AdminSubscriptionsPage.tsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AdminRefundModal, type RefundableTransaction, remainingRefundable } from '../../components/admin/AdminRefundModal';
import { formatINR } from '../../utils/formatCurrency';

interface SubscriptionItem {
  id: string;
  user: { id: string; email: string; name: string | null };
  plan: { id: string; name: string; priceCents: number };
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
  billingInterval: 'MONTH' | 'YEAR';
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
  autoRenew?: boolean;
  provider: string;
  providerSubscriptionId: string;
  createdAt: string;
  transactions?: RefundableTransaction[];
}

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'cancel' | 'pause' | 'resume' } | null>(null);
  const [refundTx, setRefundTx] = useState<RefundableTransaction | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchSubscriptions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      });
      const res = await adminApiClient.get(`/subscriptions?${params}`);
      setSubscriptions(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch subscriptions', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  async function handleAction(id: string, action: 'cancel' | 'pause' | 'resume') {
    setConfirmAction({ id, action });
  }

  async function confirmSubscriptionAction() {
    if (!confirmAction) return;
    const { id, action } = confirmAction;
    setActionLoading(true);
    setConfirmAction(null);
    setMessage(null);
    try {
      await adminApiClient.patch(`/subscriptions/${id}/${action}`, {
        cancelAtPeriodEnd: false, // Immediate cancellation when triggered by admin
      });
      setMessage({
        type: 'success',
        text: `Subscription ${action === 'cancel' ? 'cancelled' : action === 'pause' ? 'paused' : 'resumed'} successfully.`,
      });
      await fetchSubscriptions();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || `Failed to ${action} subscription.`,
      });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Active Subscriptions</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Inspect recurring billing state, period boundaries, and manual lifecycle actions
          </p>
        </div>
      </div>

      {/* ─── Feedback Message Alert ─────────────────────────────── */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in ${
            message.type === 'success'
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-danger/10 border-danger/20 text-danger'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* ─── Search & Filters ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSubscriptions()}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="PAST_DUE">Past Due</option>
        </select>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction ? `Confirm ${confirmAction.action}` : 'Confirm action'}
        message={
          <>
            Are you sure you want to <strong>{confirmAction?.action || 'perform this action'}</strong> this subscription?
          </>
        }
        confirmText={confirmAction ? `Yes, ${confirmAction.action}` : 'Confirm'}
        destructive={confirmAction?.action === 'cancel'}
        isLoading={actionLoading}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmSubscriptionAction}
      />

      {/* ─── Shared Refund Modal ─────────────────────────────────── */}
      <AdminRefundModal
        transaction={refundTx}
        onClose={() => setRefundTx(null)}
        onSuccess={fetchSubscriptions}
      />

      {/* ─── Subscriptions Table Card ─────────────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Period Ends</th>
                <th className="px-5 py-3.5">Provider ID</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-text-muted">
                    No subscriptions found matching query
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => {
                  const tx = s.transactions?.[0];
                  const canRefund = tx && remainingRefundable(tx) > 0;

                  return (
                    <tr key={s.id} className="hover:bg-surface-raised/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-text-primary">{s.user?.email}</p>
                        {s.user?.name && <p className="text-xs text-text-muted">{s.user.name}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-accent">{s.plan?.name}</span>
                        <span className="text-xs text-text-muted block">
                          {formatINR(s.plan?.priceCents)} / {s.billingInterval.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {s.status === 'ACTIVE' && s.cancelAtPeriodEnd ? (
                          <Badge variant="warning" size="sm" dot>
                            Cancelling at period end
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'danger'
                            }
                            size="sm"
                            dot
                          >
                            {s.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-text-secondary text-xs">
                        {new Date(s.currentPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-text-muted truncate max-w-[140px]">
                        {s.providerSubscriptionId}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                        {canRefund && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => setRefundTx(tx)}
                          >
                            Refund
                          </Button>
                        )}
                        {s.status === 'ACTIVE' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleAction(s.id, 'pause')}
                            >
                              Pause
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleAction(s.id, 'cancel')}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {s.status === 'PAUSED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleAction(s.id, 'resume')}
                          >
                            Resume
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}