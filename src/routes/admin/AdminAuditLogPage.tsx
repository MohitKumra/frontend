// frontend/src/routes/admin/AdminAuditLogPage.tsx
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

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
                        <span className="font-mono font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded-lg border border-accent-border">
                          {l.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {l.entityType}{' '}
                        {l.entityId && (
                          <span className="font-mono text-text-muted">({l.entityId.slice(0, 8)}...)</span>
                        )}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                State Before
                              </p>
                              <pre className="p-3 bg-surface rounded-xl border border-border text-text-muted font-mono overflow-x-auto max-h-48 text-[11px]">
                                {l.before ? JSON.stringify(l.before, null, 2) : 'None / New Record'}
                              </pre>
                            </div>
                            <div>
                              <p className="font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                State After
                              </p>
                              <pre className="p-3 bg-surface rounded-xl border border-border text-accent font-mono overflow-x-auto max-h-48 text-[11px]">
                                {l.after ? JSON.stringify(l.after, null, 2) : 'None / Deleted'}
                              </pre>
                            </div>
                          </div>
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