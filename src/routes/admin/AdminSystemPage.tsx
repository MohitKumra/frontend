// frontend/src/routes/admin/AdminSystemPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Activity,
  Database,
  CreditCard,
  Mail,
  Clock,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

export function AdminSystemPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);

  async function fetchHealth() {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/system');
      setHealth(res.data.data);
    } catch (err) {
      console.error('Failed to fetch system health', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  async function handleReconciliation() {
    setReconciling(true);
    setReconciliationResult(null);
    try {
      const res = await adminApiClient.post('/system/reconciliation');
      setReconciliationResult(res.data.data);
      fetchHealth();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Operational Health & Subsystems</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Real-time subsystem diagnostics, latency, webhooks, and billing reconciliation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchHealth}
            loading={loading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Health
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleReconciliation}
            loading={reconciling}
            leftIcon={<Zap className="w-4 h-4" />}
          >
            Run Reconciliation
          </Button>
        </div>
      </div>

      {reconciliationResult && (
        <Card variant="elevated" className="p-5 border-accent-border bg-accent-subtle/40">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-accent" />
            <h3 className="text-sm font-bold text-accent">
              Reconciliation Completed: Found {reconciliationResult.discrepanciesFound} Discrepancies
            </h3>
          </div>
          {reconciliationResult.items?.length > 0 ? (
            <div className="divide-y divide-border text-xs">
              {reconciliationResult.items.map((item: any, idx: number) => (
                <div key={idx} className="py-1.5 text-text-secondary">
                  [{item.type}] Local: <span className="font-semibold">{item.localStatus}</span> → Provider:{' '}
                  <span className="font-semibold">{item.providerStatus}</span> ({item.resolution})
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              All local database subscriptions and payment orders match Razorpay state perfectly.
            </p>
          )}
        </Card>
      )}

      {loading && !health ? (
        <div className="py-24 flex flex-col items-center justify-center text-text-muted">
          <Spinner size="lg" />
          <p className="text-sm mt-3 font-medium">Inspecting system subsystems...</p>
        </div>
      ) : (
        <>
          {/* Subsystems grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              icon={<Database className="w-6 h-6" />}
              label="Database Engine"
              value="PostgreSQL"
              color="success"
              sub={`Latency: ${health.subsystems.database.latencyMs} ms`}
            />

            <StatCard
              icon={<CreditCard className="w-6 h-6" />}
              label="Payment Gateway"
              value={health.subsystems.paymentProvider.provider}
              color="accent"
              sub={`Mode: ${health.subsystems.paymentProvider.mode}`}
            />

            <StatCard
              icon={<Mail className="w-6 h-6" />}
              label="Email & SMTP"
              value="SMTP Mailer"
              color="info"
              sub={health.subsystems.smtp.host}
            />

            <StatCard
              icon={<Clock className="w-6 h-6" />}
              label="System Uptime"
              value={`${(health.metrics.systemUptimeSeconds / 3600).toFixed(1)} hrs`}
              color="warning"
              sub="PID Status: Active"
            />
          </div>

          {/* Webhook & Processing Metrics */}
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                <CardTitle>Webhook & Ingestion Pipeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-surface-raised rounded-xl border border-border">
                  <p className="text-xs font-semibold text-text-muted uppercase">Unprocessed Events</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {health.metrics.unprocessedWebhooks}
                  </p>
                </div>
                <div className="p-4 bg-surface-raised rounded-xl border border-border">
                  <p className="text-xs font-semibold text-text-muted uppercase">Failed Webhooks</p>
                  <p className="text-2xl font-bold text-danger mt-1">{health.metrics.failedWebhooks}</p>
                </div>
                <div className="p-4 bg-surface-raised rounded-xl border border-border">
                  <p className="text-xs font-semibold text-text-muted uppercase">Failed Payments</p>
                  <p className="text-2xl font-bold text-warning mt-1">{health.metrics.failedPayments}</p>
                </div>
              </div>

              {health.recentFailedWebhooks?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-danger uppercase tracking-wider mb-3">
                    Recent Webhook Ingestion Failures
                  </p>
                  <div className="divide-y divide-border/60 text-xs font-mono">
                    {health.recentFailedWebhooks.map((w: any) => (
                      <div key={w.id} className="py-2.5 flex items-center justify-between text-text-muted">
                        <span className="font-semibold text-text-primary">{w.eventType}</span>
                        <span className="text-danger">{w.lastError || 'Unknown Error'}</span>
                        <span>{new Date(w.receivedAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}