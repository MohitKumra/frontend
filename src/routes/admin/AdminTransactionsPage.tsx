// frontend/src/routes/admin/AdminTransactionsPage.tsx
import React, { useEffect, useState } from 'react';
import { Receipt, Search, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR } from '../../utils/formatCurrency';

interface Transaction {
  id: string;
  user: { id: string; email: string; name: string | null };
  plan: { id: string; name: string } | null;
  grossAmountCents: number;
  discountCents: number;
  netAmountCents: number;
  currency: string;
  status: 'CAPTURED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
  providerPaymentId: string;
  providerOrderId: string | null;
  createdAt: string;
  paidAt: string | null;
}

export function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Refund Modal State
  const [refundTx, setRefundTx] = useState<Transaction | null>(null);
  const [refundAmountPaise, setRefundAmountPaise] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '15',
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      });
      const res = await adminApiClient.get(`/transactions?${params}`);
      setTransactions(res.data.items || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter]);

  async function handleProcessRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!refundTx || !refundReason.trim()) return;

    setRefundLoading(true);
    setRefundError(null);
    try {
      const amountCents = refundAmountPaise ? parseInt(refundAmountPaise, 10) : undefined;
      await adminApiClient.post(`/transactions/${refundTx.id}/refund`, {
        amountCents,
        reason: refundReason,
      });
      setMessage({ type: 'success', text: 'Refund processed successfully' });
      setRefundTx(null);
      fetchTransactions();
    } catch (err: any) {
      setRefundError(err.response?.data?.error?.message || 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Financial Ledger & Transactions</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Captured payments, immutable ledger records, and refund operations (INR)
          </p>
        </div>
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

      {/* ─── Search & Filters ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer email, payment ID, order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
        >
          <option value="">All Statuses</option>
          <option value="CAPTURED">Captured</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* ─── Transactions Table Card ──────────────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Plan / Item</th>
                <th className="px-5 py-3.5">Net Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Payment ID</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    Loading ledger records...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    No transactions recorded
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-raised/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-text-primary">{t.user?.email}</p>
                      {t.user?.name && <p className="text-xs text-text-muted">{t.user.name}</p>}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{t.plan?.name || 'One-Time / Custom'}</td>
                    <td className="px-5 py-4 font-bold text-accent">
                      {formatINR(t.netAmountCents)}
                      {t.discountCents > 0 && (
                        <span className="text-[11px] text-success ml-1 font-normal">
                          (-{formatINR(t.discountCents)})
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          t.status === 'CAPTURED'
                            ? 'success'
                            : t.status === 'REFUNDED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                        dot
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-text-muted max-w-[130px] truncate">
                      {t.providerPaymentId}
                    </td>
                    <td className="px-5 py-4 text-text-muted text-xs">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {t.status === 'CAPTURED' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setRefundTx(t);
                            setRefundAmountPaise(t.netAmountCents.toString());
                            setRefundReason('');
                            setRefundError(null);
                          }}
                        >
                          Refund
                        </Button>
                      )}
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

      {/* ─── Refund Modal Card ────────────────────────────────────── */}
      {refundTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card variant="elevated" className="max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Process Refund</h2>
            <p className="text-xs text-text-muted">
              Triggering a refund will return funds via Razorpay and update the billing ledger.
            </p>

            {refundError && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{refundError}</span>
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Refund Amount (Paise: {refundTx.netAmountCents} = {formatINR(refundTx.netAmountCents)})
                </label>
                <input
                  type="number"
                  max={refundTx.netAmountCents}
                  value={refundAmountPaise}
                  onChange={(e) => setRefundAmountPaise(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Audit Reason (Required)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested cancellation within guarantee"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setRefundTx(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" loading={refundLoading}>
                  Confirm Refund
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}