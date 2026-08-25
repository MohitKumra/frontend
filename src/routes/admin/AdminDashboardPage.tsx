// frontend/src/routes/admin/AdminDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import {
  IndianRupee,
  Users,
  Repeat,
  TrendingUp,
  RefreshCw,
  Layers,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR, formatNumberIN } from '../../utils/formatCurrency';

interface MetricsData {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    deactivatedUsers: number;
    bannedUsers: number;
    newUsersInRange: number;
    activeSubscriptions: number;
    mrrCents: number;
    arrCents: number;
    grossRevenueCents: number;
    totalDiscountsCents: number;
    totalRefundsCents: number;
    netRevenueCents: number;
    churnRate: number;
  };
  charts: {
    timeSeries: Array<{ date: string; revenueCents: number; users: number }>;
    planDistribution: Array<{ name: string; slug: string; count: number }>;
    authMethodDistribution: Array<{ method: string; count: number }>;
  };
}

export function AdminDashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchOverview() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiClient.get('/overview?days=30');
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch executive metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Operational metrics, recurring revenue (MRR/ARR), and subscription distribution (30 Days)
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchOverview}
          loading={loading}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Live Data
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="py-24 flex flex-col items-center justify-center text-text-muted">
          <Spinner size="lg" />
          <p className="text-sm mt-3 font-medium">Aggregating platform metrics...</p>
        </div>
      )}

      {data && (
        <>
          {/* ─── Top KPI StatCards ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              icon={<IndianRupee className="w-6 h-6" />}
              label="Monthly Recurring (MRR)"
              value={formatINR(data.kpis.mrrCents)}
              color="accent"
              sub={`ARR: ${formatINR(data.kpis.arrCents)}`}
            />

            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Net Realized Revenue (30d)"
              value={formatINR(data.kpis.netRevenueCents)}
              color="success"
              sub={`Refunds: ${formatINR(data.kpis.totalRefundsCents)}`}
            />

            <StatCard
              icon={<Repeat className="w-6 h-6" />}
              label="Active Subscriptions"
              value={formatNumberIN(data.kpis.activeSubscriptions)}
              color="info"
              sub={`Churn Rate: ${data.kpis.churnRate}%`}
            />

            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Total Users"
              value={formatNumberIN(data.kpis.totalUsers)}
              color="warning"
              sub={`Active: ${data.kpis.activeUsers} | Banned: ${data.kpis.bannedUsers}`}
            />
          </div>

          {/* ─── Breakdown Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Distribution */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-accent" />
                  <CardTitle>Plan Distribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.charts.planDistribution.map((p) => (
                  <div
                    key={p.slug}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border"
                  >
                    <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                    <Badge variant="accent" size="sm">
                      {formatNumberIN(p.count)} active subscribers
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Auth Method Breakdown */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  <CardTitle>Authentication Methods</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.charts.authMethodDistribution.map((a) => (
                  <div
                    key={a.method}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border"
                  >
                    <span className="text-sm font-semibold text-text-primary">{a.method}</span>
                    <Badge variant="info" size="sm">
                      {formatNumberIN(a.count)} registered
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}