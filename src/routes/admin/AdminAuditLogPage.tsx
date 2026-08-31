// frontend/src/routes/admin/AdminAuditLogPage.tsx
// Human-readable administrative audit trail. Each row shows the real action,
// actor, target, and context. Expanding a row renders a plain-English "what
// changed" diff (only fields that actually changed) — raw JSON stays available
// behind a toggle for power admins, but is never the default view.

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, ChevronDown, ChevronUp, Code2, ListChecks } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR } from '../../utils/formatCurrency';

interface AuditLogItem {
  id: string;
  adminAccount: { id: string; email: string; role: string };
  action: string;
  entityType: string;
  entityId: string | null;
  before: any;
  after: any;
  reason: string | null;
  createdAt: string;
}

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rawView, setRawView] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '25',
        ...(search && { search }),
      });
      const res = await adminApiClient.get(`/audit-log?${params}`);
      setLogs(res.data.items || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Administrative Audit Trail</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Immutable record of administrative mutations, bans, overrides, and refunds
          </p>
        </div>
      </div>

      {/* ─── Search Bar ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by action, reason, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent"
          />
        </div>
        <Button variant="secondary" size="md" onClick={fetchLogs}>
          Filter
        </Button>
      </div>

      {/* ─── Audit Log Table Card ───────────────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Admin</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Reason / Context</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-text-muted">
                    No audit records found
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <React.Fragment key={l.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                      className="hover:bg-surface-raised/50 cursor-pointer transition-colors text-xs"
                    >
                      <td className="px-5 py-3.5 text-text-muted font-mono">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-text-primary">{l.adminAccount?.email}</span>
                        <span className="text-[10px] text-text-muted ml-1.5">({l.adminAccount?.role})</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="accent" size="sm" className="font-mono">
                          {ACTION_LABELS[l.action] || l.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        <span className="font-semibold">{entityDisplayName(l)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-text-muted">{l.reason || '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-accent font-semibold">
                          {expandedId === l.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </td>
                    </tr>

                    {expandedId === l.id && (
                      <tr className="bg-surface-raised/40">
                        <td colSpan={6} className="px-5 py-4">
                          {/* View toggle: human diff (default) vs raw JSON */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="text-xs text-text-muted">What changed:</span>
                            <div className="flex items-center gap-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => setRawView(false)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                                  !rawView ? 'border-accent bg-accent-subtle text-accent' : 'border-border text-text-secondary hover:border-border-strong'
                                }`}
                              >
                                <ListChecks className="w-3.5 h-3.5" />
                                Summary
                              </button>
                              <button
                                type="button"
                                onClick={() => setRawView(true)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                                  rawView ? 'border-accent bg-accent-subtle text-accent' : 'border-border text-text-secondary hover:border-border-strong'
                                }`}
                              >
                                <Code2 className="w-3.5 h-3.5" />
                                Raw JSON
                              </button>
                            </div>
                          </div>

                          {rawView ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-bold text-text-secondary uppercase tracking-wider mb-1.5">State Before</p>
                                <pre className="p-3 bg-surface rounded-xl border border-border text-text-muted font-mono overflow-x-auto max-h-48 text-[11px]">
                                  {l.before ? JSON.stringify(l.before, null, 2) : 'None / New Record'}
                                </pre>
                              </div>
                              <div>
                                <p className="font-bold text-text-secondary uppercase tracking-wider mb-1.5">State After</p>
                                <pre className="p-3 bg-surface rounded-xl border border-border text-accent font-mono overflow-x-auto max-h-48 text-[11px]">
                                  {l.after ? JSON.stringify(l.after, null, 2) : 'None / Deleted'}
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <DiffView l={l} />
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

/* ─────────────────────────── Friendly labels ─────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  slug: 'Slug',
  currency: 'Currency',
  priceCents: 'Price',
  gstPercent: 'GST (%)',
  billingInterval: 'Billing interval',
  isActive: 'Active',
  status: 'Status',
  reason: 'Reason',
  sortOrder: 'Sort order',
  version: 'Version',
  features: 'Features',
  code: 'Code',
  discountType: 'Discount type',
  discountValue: 'Discount value',
  discountCents: 'Discount amount',
  minimumAmountCents: 'Minimum order',
  perUserLimit: 'Per-user limit',
  startsAt: 'Valid from',
  expiresAt: 'Expires',
  quantity: 'Quantity',
  autoRenew: 'Auto-renew',
  amountCents: 'Amount',
  provider: 'Provider',
};

import { FEATURE_LABELS } from '../../features/plan/planCatalog';

const ENTITY_LABELS: Record<string, string> = {
  Plan: 'Plan',
  User: 'User',
  Coupon: 'Coupon',
  Refund: 'Refund',
  EntitlementOverride: 'Entitlement override',
  Settings: 'System settings',
  System: 'System',
  Subscription: 'Subscription',
  AdminAccount: 'Admin account',
};

const ACTION_LABELS: Record<string, string> = {
  PLAN_CREATED: 'Created plan',
  PLAN_UPDATED: 'Updated plan',
  USER_DEACTIVATE: 'Deactivated user',
  USER_REACTIVATE: 'Reactivated user',
  USER_BAN: 'Banned user',
  ENTITLEMENT_OVERRIDE_GRANTED: 'Granted entitlement override',
  ENTITLEMENT_OVERRIDE_REVOKED: 'Revoked entitlement override',
  COUPON_CREATED: 'Created coupon',
  COUPON_UPDATED: 'Updated coupon',
  REFUND_PROCESSED: 'Processed refund',
  SYSTEM_SETTINGS_UPDATED: 'Updated system settings',
  RECONCILIATION_PERFORMED: 'Ran reconciliation',
  ADMIN_LOGIN_SUCCESS: 'Admin signed in',
};

function humanizeKey(key: string): string {
  const label = FEATURE_LABELS[key] || FIELD_LABELS[key];
  if (label) return label;
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/Id\b/g, 'ID')
    .trim();
}

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  if (key === 'billingInterval') {
    if (value === 'YEAR') return 'Yearly';
    if (value === 'MONTH') return 'Monthly';
    if (value === 'ONE_TIME') return 'One-time';
  }
  if (/(priceCents|amountCents|discountCents|minimumAmountCents|grossAmountCents|netAmountCents|totalCents|subtotalCents|taxCents)$/.test(key)) {
    return formatINR(Number(value));
  }
  if (key === 'storageMb') return `${value} MB${value === -1 ? ' (unlimited)' : ''}`;
  if (key === 'aiRequestsPerMonth' || key === 'projects' || key === 'habits' || key === 'tasks') {
    return value === -1 ? 'Unlimited' : String(value);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function labelKey(label: string): string {
  const last = label.split('→').map((s) => s.trim()).pop() || '';
  for (const [raw, friendly] of Object.entries({ ...FIELD_LABELS, ...FEATURE_LABELS })) {
    if (friendly === last) return raw;
  }
  return last.toLowerCase().replace(/\s+/g, '');
}

function entityDisplayName(l: AuditLogItem): string {
  const snap = l.after ?? l.before;
  if (snap && typeof snap === 'object') {
    if (snap.name) return String(snap.name);
    if (snap.email) return String(snap.email);
    if (snap.slug) return String(snap.slug);
    if (snap.code) return String(snap.code);
  }
  return `${ENTITY_LABELS[l.entityType] || humanizeKey(l.entityType)}${l.entityId ? ` (${l.entityId.slice(0, 8)}…)` : ''}`;
}

function diffValues(before: any, after: any, path = ''): { label: string; before: any; after: any }[] {
  const diffs: { label: string; before: any; after: any }[] = [];
  const b = before ?? {};
  const a = after ?? {};
  if (b === null || typeof b !== 'object' || a === null || typeof a !== 'object') {
    return [{ label: path || 'Value', before, after }];
  }
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  for (const key of keys) {
    if (/^(id|createdAt|updatedAt|createdByAdminId|updatedByAdminId|version)$/.test(key)) continue;
    const bv = b[key];
    const av = a[key];
    const label = path ? `${path} → ${humanizeKey(key)}` : humanizeKey(key);
    const bothObj = typeof bv === 'object' && bv !== null && typeof av === 'object' && av !== null;
    if (bothObj) {
      diffs.push(...diffValues(bv, av, label));
    } else if (JSON.stringify(bv) !== JSON.stringify(av)) {
      diffs.push({ label, before: bv, after: av });
    }
  }
  return diffs;
}

function DiffView({ l }: { l: AuditLogItem }) {
  const diffs = diffValues(l.before, l.after);
  const created = !l.before;
  const deleted = !l.after;
  const headline = ACTION_LABELS[l.action] || humanizeKey(l.action);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-subtle border border-accent-border text-accent text-[11px] font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          {headline}
        </span>
        <span className="text-text-muted">
          {created ? 'New record created' : deleted ? 'Record removed' : `${diffs.length} change${diffs.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {created || deleted ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <p className="px-3 py-2 bg-surface-raised text-text-secondary font-bold uppercase tracking-wider border-b border-border">
            {created ? 'Created snapshot' : 'Removed snapshot'}
          </p>
          <div className="px-3 py-2.5 bg-surface space-y-1.5">
            {Object.entries(flattenForDisplay(created ? l.after || {} : l.before || {})).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4">
                <span className="text-text-muted shrink-0">{k}</span>
                <span className="font-semibold text-text-primary text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : diffs.length === 0 ? (
        <p className="text-text-muted italic">No field-level changes were recorded for this action.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-2 bg-surface-raised text-text-secondary font-bold uppercase tracking-wider border-b border-border grid grid-cols-[1fr_1fr_1fr] gap-3">
            <span>Field</span>
            <span>Before</span>
            <span>After</span>
          </div>
          <div className="divide-y divide-border/60 bg-surface">
            {diffs.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr] gap-3 px-3 py-2">
                <span className="font-semibold text-text-primary">{d.label}</span>
                <span className="text-text-muted line-through decoration-text-muted/50">
                  {formatValue(labelKey(d.label), d.before)}
                </span>
                <span className="font-semibold text-accent">{formatValue(labelKey(d.label), d.after)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function flattenForDisplay(obj: any, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(obj || {})) {
    if (/^(id|createdAt|updatedAt|createdByAdminId|updatedByAdminId|version)$/.test(key)) continue;
    const v = obj[key];
    const label = prefix ? `${prefix} → ${humanizeKey(key)}` : humanizeKey(key);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenForDisplay(v, label));
    } else {
      out[label] = formatValue(labelKey(label), v);
    }
  }
  return out;
}