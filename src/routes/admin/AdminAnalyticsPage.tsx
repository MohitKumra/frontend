// frontend/src/routes/admin/AdminAnalyticsPage.tsx
import React, { useEffect, useState } from 'react';
import { IndianRupee, TrendingUp, Users, RefreshCw, BarChart3 } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR, formatNumberIN } from '../../utils/formatCurrency';

export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await adminApiClient.get(`/overview?days=${days}`);
      setOverview(res.data.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Revenue & Growth Analytics</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Detailed financial aggregation, subscriber retention, and time-series trends (INR)
          </p>
        </div>

        {/* Days Filter */}
        <div className="flex bg-surface border border-border rounded-xl p-1 text-xs gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                days === d
                  ? 'bg-accent text-text-onaccent shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {loading && !overview ? (
        <div className="py-24 flex flex-col items-center justify-center text-text-muted">
          <Spinner size="lg" />
          <p className="text-sm mt-3 font-medium">Aggregating analytics data...</p>
        </div>
      ) : (
        <>
          {/* ─── Top KPI Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard
              icon={<IndianRupee className="w-6 h-6" />}
              label="Gross Invoiced Volume"
              value={formatINR(overview.kpis.grossRevenueCents)}
              color="accent"
              sub={`Discounts: ${formatINR(overview.kpis.totalDiscountsCents)}`}
            />

            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Refunds Processed"
              value={formatINR(overview.kpis.totalRefundsCents)}
              color="danger"
              sub={`Refund Rate: ${
                overview.kpis.grossRevenueCents > 0
                  ? ((overview.kpis.totalRefundsCents / overview.kpis.grossRevenueCents) * 100).toFixed(1)
                  : 0
              }%`}
            />

            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Net Realized Revenue"
              value={formatINR(overview.kpis.netRevenueCents)}
              color="success"
              sub={`New Signups: +${formatNumberIN(overview.kpis.newUsersInRange)}`}
            />
          </div>

          {/* ─── Daily Performance Ledger Card ─────────────────────── */}
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                <CardTitle>Daily Performance Ledger</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Revenue Realized</th>
                      <th className="px-4 py-3">New Signups</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {overview.charts.timeSeries
                      .slice()
                      .reverse()
                      .map((ts: any) => (
                        <tr key={ts.date} className="hover:bg-surface-raised/50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-text-primary">{ts.date}</td>
                          <td className="px-4 py-2.5 font-bold text-success">
                            {formatINR(ts.revenueCents)}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-text-secondary">
                            +{formatNumberIN(ts.users)} users
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}