// frontend/src/routes/admin/AdminCustomPlansPage.tsx
// Admin review UI for Custom Plan requests: list, detail, status transitions,
// quoting, and admin notes. Uses existing plans data to resolve plan names.

import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Wand2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR } from '../../utils/formatCurrency';
import {
  FEATURE_LABEL,
  NUMERIC_FEATURES,
  BOOLEAN_FEATURES,
  formatLimit,
} from '../../features/customPlan/customPlanFeature';

type Status = 'PENDING' | 'REVIEWING' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

interface CustomPlanRequestAdmin {
  id: string;
  userId: string;
  currentPlanId: string | null;
  status: Status;
  requestedFeatures: Record<string, boolean>;
  requestedLimits: Record<string, number>;
  requirements: Record<string, string> | null;
  adminNotes: string | null;
  quotedPriceCents: number | null;
  currency: string;
  billingInterval: string | null;
  finalConfig: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  user: { id: string; email: string; name: string | null };
}

interface AdminPlanLite {
  id: string;
  name: string;
  slug: string;
}

const STATUS_META: Record<Status, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'; label: string }> = {
  PENDING: { variant: 'default', label: 'Pending' },
  REVIEWING: { variant: 'accent', label: 'Under review' },
  QUOTED: { variant: 'info', label: 'Quote ready' },
  ACCEPTED: { variant: 'success', label: 'Accepted' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  CANCELLED: { variant: 'default', label: 'Cancelled' },
};

const ALL_STATUSES: Status[] = ['PENDING', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'];

export function AdminCustomPlansPage() {
  const [requests, setRequests] = useState<CustomPlanRequestAdmin[]>([]);
  const [plans, setPlans] = useState<AdminPlanLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomPlanRequestAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteInterval, setQuoteInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  // Finalized configuration for the quote — the immutable entitlement snapshot
  // an admin authors before ACCEPTING (numeric limits + boolean features).
  const [finalLimits, setFinalLimits] = useState<Record<string, number>>({});
  const [finalFeatures, setFinalFeatures] = useState<Record<string, boolean>>({});

  const planNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of plans) map[p.id] = p.name;
    return map;
  }, [plans]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      });
      const res = await adminApiClient.get(`/custom-plans?${params}`);
      setRequests(res.data.items || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to load custom plan requests');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlans() {
    try {
      const res = await adminApiClient.get('/plans?includeInactive=true');
      setPlans(res.data.data || []);
    } catch {
      // Non-fatal — plan name resolution is a nice-to-have.
    }
  }

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function openDetail(id: string) {
    try {
      const res = await adminApiClient.get(`/custom-plans/${id}`);
      setSelected(res.data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to load request');
    }
  }

  async function patchRequest(payload: Record<string, unknown>, successMsg: string) {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await adminApiClient.patch(`/custom-plans/${selected.id}`, payload);
      toast.success(successMsg);
      setSelected(res.data.data);
      fetchRequests();
      if (quoteOpen) setQuoteOpen(false);
      if (rejectOpen) setRejectOpen(false);
      if (acceptOpen) setAcceptOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Update failed');
    } finally {
      setActionLoading(false);
    }
  }
return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Custom Plan Requests</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Review, price, and manage custom plan requests from users
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchRequests} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRequests()}
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted border-b border-border">
                <th className="px-5 py-3 font-bold">User</th>
                <th className="px-5 py-3 font-bold">Current plan</th>
                <th className="px-5 py-3 font-bold">Requested changes</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Created</th>
                <th className="px-5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-text-muted">
                    No custom plan requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const limitCount = Object.keys(r.requestedLimits || {}).length;
                  const featureCount = Object.keys(r.requestedFeatures || {}).length;
                  const changeLabel = [
                    limitCount ? `${limitCount} limit${limitCount > 1 ? 's' : ''}` : '',
                    featureCount ? `${featureCount} feature${featureCount > 1 ? 's' : ''}` : '',
                  ]
                    .filter(Boolean)
                    .join(' + ');
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 hover:bg-surface-raised/50 transition-colors cursor-pointer"
                      onClick={() => openDetail(r.id)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-text-primary">{r.user?.email}</p>
                        {r.user?.name && <p className="text-xs text-text-muted">{r.user.name}</p>}
                      </td>
                      <td className="px-5 py-4 text-text-secondary">
                        {r.currentPlanId ? planNameMap[r.currentPlanId] || 'Custom' : 'Free'}
                      </td>
                      <td className="px-5 py-4">
                        {changeLabel ? (
                          <span className="inline-flex items-center gap-1 text-text-secondary">
                            <Wand2 className="w-3.5 h-3.5 text-accent" />
                            {changeLabel}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_META[r.status].variant} size="sm" dot>
                          {STATUS_META[r.status].label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-xs text-text-muted">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(r.id);
                          }}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
{/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Request Details" maxWidth="max-w-2xl">
        {selected && (
          <DetailContent
            request={selected}
            planName={selected.currentPlanId ? planNameMap[selected.currentPlanId] || 'Custom' : 'Free'}
            actionLoading={actionLoading}
            onReview={() => patchRequest({ status: 'REVIEWING' }, 'Marked as under review')}
            onReject={() => setRejectOpen(true)}
            onQuote={() => {
              setQuotePrice(selected.quotedPriceCents != null ? String(selected.quotedPriceCents / 100) : '');
              setQuoteInterval((selected.billingInterval as 'MONTH' | 'YEAR') || 'MONTH');
              setAdminNotes(selected.adminNotes || '');
              // Preload the finalized configuration so the admin can adjust it
              // before/after quoting. Prefer an existing finalConfig (re-edit),
              // falling back to the user's original requested changes.
              const prior = (selected.finalConfig || {}) as {
                requestedLimits?: Record<string, number>;
                requestedFeatures?: Record<string, boolean>;
              };
              setFinalLimits(prior.requestedLimits ?? selected.requestedLimits ?? {});
              setFinalFeatures(prior.requestedFeatures ?? selected.requestedFeatures ?? {});
              setQuoteOpen(true);
            }}
            onAccept={() => setAcceptOpen(true)}
          />
        )}
      </Modal>

      {/* Accept confirmation modal */}
      <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="Accept custom plan" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="rounded-2xl border border-accent-border bg-accent-subtle/30 p-4 text-sm text-text-secondary leading-relaxed">
            Accepting this request <strong className="text-text-primary">finalizes the plan</strong> and sends the user an
            email with their <strong className="text-text-primary">personal payment link</strong>. Once they pay, their
            exact limits &amp; features are unlocked.
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            The finalized configuration (price, limits, features) is locked in as an immutable snapshot and
            <strong className="text-text-primary"> cannot be edited or reversed afterward</strong>. Only accept when the
            quote is final.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAcceptOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              loading={actionLoading}
              onClick={() => patchRequest({ status: 'ACCEPTED' }, 'Request accepted — payment link emailed to user')}
            >
              Accept &amp; email pay link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Request" maxWidth="max-w-md">
        <div className="space-y-4">
          <Textarea
            id="reject-notes"
            label="Reason"
            rows={3}
            placeholder="Optional note explaining why…"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={actionLoading}
              onClick={() => patchRequest({ status: 'REJECTED', adminNotes: adminNotes.trim() || null }, 'Request rejected')}
            >
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quote modal */}
      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title="Create Quote" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <Input
            id="quote-price"
            label="Price (₹, pre-GST)"
            type="number"
            min={0}
            value={quotePrice}
            onChange={(e) => setQuotePrice(e.target.value)}
            placeholder="e.g. 2999"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Billing interval</label>
            <div className="inline-flex w-fit rounded-xl bg-surface-raised border border-border p-1">
              {(['MONTH', 'YEAR'] as const).map((bi) => (
                <button
                  key={bi}
                  type="button"
                  onClick={() => setQuoteInterval(bi)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    quoteInterval === bi ? 'bg-accent text-text-onaccent' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {bi === 'MONTH' ? 'Monthly' : 'Annual'}
                </button>
              ))}
            </div>
          </div>

          {/* Finalized configuration — the immutable entitlement snapshot for ACCEPTED */}
          <div className="rounded-2xl border border-border bg-surface-raised p-4 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-1">
                Finalized configuration
              </p>
              <p className="text-xs text-text-muted">
                These exact limits &amp; features are locked into the accepted plan and cannot change after payment.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-text-primary">Limits</p>
              {NUMERIC_FEATURES.map((meta) => {
                const val = finalLimits[meta.key];
                const unlimited = val === -1;
                return (
                  <div
                    key={meta.key}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 border border-border/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{meta.label}</p>
                      <p className="text-[11px] text-text-muted">{meta.hint}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={unlimited}
                          onChange={(e) => {
                            const next = { ...finalLimits };
                            if (e.target.checked) next[meta.key] = -1;
                            else delete next[meta.key];
                            setFinalLimits(next);
                          }}
                          className="accent-[#0f766e]"
                        />
                        Unlimited
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={unlimited ? '' : val ?? ''}
                        disabled={unlimited}
                        placeholder="0"
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          const next = { ...finalLimits };
                          if (Number.isFinite(n) && n > 0) next[meta.key] = Math.round(n);
                          else delete next[meta.key];
                          setFinalLimits(next);
                        }}
                        className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary text-right focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-text-primary">Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BOOLEAN_FEATURES.map((meta) => {
                  const enabled = finalFeatures[meta.key] === true;
                  return (
                    <label
                      key={meta.key}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                        enabled ? 'border-accent bg-accent-subtle/40' : 'border-border/60 bg-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          const next = { ...finalFeatures };
                          if (e.target.checked) next[meta.key] = true;
                          else delete next[meta.key];
                          setFinalFeatures(next);
                        }}
                        className="accent-[#0f766e]"
                      />
                      <span className="text-sm font-semibold text-text-primary">{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <Textarea
            id="quote-notes"
            label="Notes"
            rows={2}
            placeholder="Admin notes…"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setQuoteOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={actionLoading}
              disabled={!quotePrice || Number(quotePrice) <= 0}
              onClick={() =>
                patchRequest(
                  {
                    status: 'QUOTED',
                    quotedPriceCents: Math.round(Number(quotePrice) * 100),
                    billingInterval: quoteInterval,
                    adminNotes: adminNotes.trim() || null,
                    finalConfig: { requestedLimits: finalLimits, requestedFeatures: finalFeatures },
                  },
                  'Quote created — ready for review'
                )
              }
            >
              Save Quote
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
function DetailContent({
  request,
  planName,
  actionLoading,
  onReview,
  onReject,
  onQuote,
  onAccept,
}: {
  request: CustomPlanRequestAdmin;
  planName: string;
  actionLoading: boolean;
  onReview: () => void;
  onReject: () => void;
  onQuote: () => void;
  onAccept: () => void;
}) {
  const limits = request.requestedLimits || {};
  const features = request.requestedFeatures || {};
  const reqs = request.requirements || {};

  const canReview = request.status === 'PENDING';
  const canQuote = request.status === 'PENDING' || request.status === 'REVIEWING';
  const canReject = request.status !== 'ACCEPTED' && request.status !== 'REJECTED' && request.status !== 'CANCELLED';
  const canAccept = request.status === 'QUOTED';

  return (
    <div className="space-y-5">
      {/* Header meta */}
      <div className="flex items-center justify-between">
        <Badge variant={STATUS_META[request.status].variant} size="sm" dot>
          {STATUS_META[request.status].label}
        </Badge>
        {request.reviewedAt && (
          <span className="text-xs text-text-muted">Reviewed {new Date(request.reviewedAt).toLocaleString()}</span>
        )}
      </div>

      {/* User info */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Customer</p>
        <p className="font-semibold text-text-primary">{request.user?.name || '—'}</p>
        <p className="text-sm text-text-muted">{request.user?.email}</p>
      </div>

      {/* Current plan */}
      <div className="rounded-2xl border border-border bg-surface-raised p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-1">Current plan</p>
        <p className="text-sm font-bold text-text-primary">{planName}</p>
      </div>

      {/* Requested limits */}
      {Object.keys(limits).length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">Requested limits</p>
          <ul className="space-y-1.5">
            {Object.entries(limits).map(([key, val]) => (
              <li key={key} className="flex items-center justify-between text-sm">
                <span className="text-text-primary font-medium">{FEATURE_LABEL[key] || key}</span>
                <span className="text-text-secondary">{formatLimit(key, val)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requested features */}
      {Object.keys(features).length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">Requested features</p>
          <ul className="space-y-1.5">
            {Object.keys(features).map((key) => (
              <li key={key} className="flex items-center gap-2 text-sm text-text-primary font-medium">
                <Check className="w-4 h-4 text-accent shrink-0" />
                {FEATURE_LABEL[key] || key}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requirements */}
      {(reqs.goal || reqs.hurdles || reqs.otherNotes) && (
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">Additional requirements</p>
          <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
            {reqs.goal && <p>{reqs.goal}</p>}
            {reqs.hurdles && <p>{reqs.hurdles}</p>}
            {reqs.otherNotes && <p>{reqs.otherNotes}</p>}
          </div>
        </div>
      )}

      {/* Quote */}
      {request.quotedPriceCents != null && (
        <div className="rounded-2xl border border-accent-border bg-accent-subtle/40 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-1">Quote</p>
          <p className="text-2xl font-extrabold text-text-primary">
            {formatINR(request.quotedPriceCents)}
            <span className="text-sm font-semibold text-text-muted"> / {String(request.billingInterval || 'MONTH').toLowerCase()}</span>
          </p>
        </div>
      )}

      {/* Admin notes */}
      {request.adminNotes && (
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-1">Admin notes</p>
          <p className="text-sm text-text-secondary leading-relaxed">{request.adminNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
        {canReview && (
          <Button variant="secondary" size="sm" loading={actionLoading} onClick={onReview}>
            Mark Reviewing
          </Button>
        )}
        {canQuote && (
          <Button size="sm" onClick={onQuote} leftIcon={<Wand2 className="w-4 h-4" />}>
            Create Quote
          </Button>
        )}
        {canAccept && (
          <Button variant="secondary" size="sm" loading={actionLoading} onClick={onAccept}>
            Accept
          </Button>
        )}
        {canReject && (
          <Button variant="danger" size="sm" onClick={onReject}>
            Reject
          </Button>
        )}
        {!canReview && !canQuote && !canAccept && !canReject && (
          <span className="text-xs text-text-muted">
            <X className="w-3.5 h-3.5 inline mr-1" />
            No further actions available
          </span>
        )}
      </div>
    </div>
  );
}