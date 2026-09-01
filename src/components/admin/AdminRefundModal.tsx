// frontend/src/components/admin/AdminRefundModal.tsx
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatINR } from '../../utils/formatCurrency';
import { adminApiClient } from '../../lib/adminApiClient';

export interface RefundableTransaction {
  id: string;
  grossAmountCents: number;
  discountCents: number;
  taxCents: number;
  netAmountCents: number;
  currency: string;
  status: string;
  providerPaymentId: string;
  refunds?: Array<{
    id: string;
    amountCents: number;
    reason: string | null;
    status: string;
    createdAt: string;
  }>;
}

interface AdminRefundModalProps {
  transaction: RefundableTransaction | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function remainingRefundable(tx: RefundableTransaction): number {
  const refunded = (tx.refunds || [])
    .filter((r) => r.status === 'PROCESSED')
    .reduce((acc, r) => acc + r.amountCents, 0);
  return Math.max(0, tx.netAmountCents - refunded);
}

export function AdminRefundModal({ transaction, onClose, onSuccess }: AdminRefundModalProps) {
  const [refundAmountPaise, setRefundAmountPaise] = useState<string>(() =>
    transaction ? String(remainingRefundable(transaction)) : ''
  );
  const [refundReason, setRefundReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const maxRefundable = remainingRefundable(transaction);

  async function handleProcessRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;
    setLoading(true);
    setError(null);
    try {
      await adminApiClient.post(`/transactions/${transaction.id}/refund`, {
        amountCents: Number(refundAmountPaise),
        reason: refundReason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Refund failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <Card variant="elevated" className="max-w-md w-full p-6 space-y-4 shadow-2xl">
        <h2 className="text-lg font-bold text-text-primary">Process Refund</h2>
        <p className="text-xs text-text-muted">
          Refund returns captured funds via Razorpay and updates the billing ledger.
        </p>

        {/* Refund history */}
        {(transaction.refunds || []).length > 0 && (
          <div className="p-3 rounded-xl bg-surface-raised border border-border space-y-1.5 text-xs">
            <p className="font-bold text-text-primary">Refund history</p>
            {transaction.refunds!.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="text-text-secondary">
                  {new Date(r.createdAt).toLocaleDateString()} — {r.reason || 'Refund'}
                </span>
                <span className="font-bold text-text-primary">{formatINR(r.amountCents)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <span className="text-text-muted">Remaining refundable</span>
              <span className="font-bold text-accent">{formatINR(maxRefundable)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleProcessRefund} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Refund Amount (Paise)
            </label>
            <input
              type="number"
              min={1}
              max={maxRefundable}
              value={refundAmountPaise}
              onChange={(e) => setRefundAmountPaise(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Max {formatINR(maxRefundable)} ({refundAmountPaise ? formatINR(Number(refundAmountPaise)) : '₹0'})
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Audit Reason (Required)
            </label>
            <input
              type="text"
              placeholder="e.g. Customer requested cancellation / satisfaction guarantee"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={loading}>
              Confirm Refund
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
