// frontend/src/routes/admin/AdminAnalyticsPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Repeat,
  Users,
  RefreshCw,
  Download,
  Search,
  CreditCard,
  Layers,
  ShieldCheck,
  BarChart3,
  Star,
  Gem,
  Crown,
  Gift,
  Mail,
  Link2,
  Receipt,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR, formatNumberIN } from '../../utils/formatCurrency';

// ─── Plan Configuration & Helpers ─────────────────────────────────────────
const PLAN_ICON_BY_SLUG: Record<string, React.ComponentType<{ className?: string }>> = {
  basic: Star,
  premium: Gem,
  ultimate: Crown,
  free: Gift,
};

const PLAN_COLOR_BY_SLUG: Record<string, string> = {
  basic: '#7C6CF6',
  premium: '#3B82F6',
  ultimate: '#10B981',
  free: '#F59E0B',
};

function planIconFor(name: string, slug?: string) {
  if (slug && PLAN_ICON_BY_SLUG[slug]) return PLAN_ICON_BY_SLUG[slug];
  const n = (name || '').toLowerCase();
  for (const key of ['basic', 'premium', 'ultimate', 'free']) {
    if (n.includes(key)) return PLAN_ICON_BY_SLUG[key];
  }
  return Star;
}

function planColorFor(name: string, slug?: string) {
  if (slug && PLAN_COLOR_BY_SLUG[slug]) return PLAN_COLOR_BY_SLUG[slug];
  const n = (name || '').toLowerCase();
  for (const key of ['basic', 'premium', 'ultimate', 'free']) {
    if (n.includes(key)) return PLAN_COLOR_BY_SLUG[key];
  }
  return '#94a3b8';
}

const AUTH_METHOD_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tint: string; ring: string; color: string }
> = {
  'Google OAuth': {
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
    ),
    tint: 'bg-blue-50 dark:bg-blue-500/10',
    ring: 'text-blue-600 dark:text-blue-400',
    color: '#4285F4',
  },
  'Email/Password': {
    icon: Mail,
    tint: 'bg-indigo-50 dark:bg-indigo-500/10',
    ring: 'text-indigo-600 dark:text-indigo-400',
    color: '#6366F1',
  },
  'Both Linked': {
    icon: Link2,
    tint: 'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'text-emerald-600 dark:text-emerald-400',
    color: '#10B981',
  },
};

// ─── Interfaces ────────────────────────────────────────────────────────────
interface TimeSeriesPoint {
  date: string;
  revenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  users: number;
  transactionsCount: number;
}

interface AnalyticsOverview {
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
    totalTaxCents: number;
    totalDiscountsCents: number;
    totalRefundsCents: number;
    netRevenueCents: number;
    totalTransactions: number;
    avgOrderValueCents: number;
    paidConversionRate: number;
    churnRate: number;
  };
  charts: {
    timeSeries: TimeSeriesPoint[];
    planDistribution: { name: string; slug: string; count: number }[];
    authMethodDistribution: { method: string; count: number }[];
  };
  recentTransactions?: Array<{
    id: string;
    grossAmountCents: number;
    discountCents: number;
    netAmountCents: number;
    status: string;
    providerPaymentId: string;
    createdAt: string;
    user?: { id: string; email: string; name: string | null };
    plan?: { id: string; name: string; slug: string };
  }>;
}

// ─── Micro Sparkline Component ─────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-16 h-8 opacity-75">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Enhanced KPI Stat Card ────────────────────────────────────────────────
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  sparkColor: string;
  sparkData: number[];
  tintBg: string;
  badge?: string;
  badgeTone?: 'success' | 'accent' | 'danger' | 'warning';
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  sparkColor,
  sparkData,
  tintBg,
  badge,
  badgeTone = 'accent',
}: MetricCardProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tintBg}`}>
          {icon}
        </div>
        {badge && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              badgeTone === 'success'
                ? 'bg-success/15 text-success'
                : badgeTone === 'danger'
                ? 'bg-danger/15 text-danger'
                : badgeTone === 'warning'
                ? 'bg-warning/15 text-warning'
                : 'bg-accent/15 text-accent'
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline justify-between mt-1">
          <p className="text-2xl font-extrabold text-text-primary tracking-tight">{value}</p>
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/60 text-xs text-text-secondary flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sparkColor }} />
        <span className="truncate">{sub}</span>
      </div>
    </div>
  );
}

// ─── Custom Recharts Tooltip ───────────────────────────────────────────────
function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as TimeSeriesPoint;
  return (
    <div className="bg-surface-raised border border-border shadow-xl rounded-xl p-3.5 text-xs text-text-primary min-w-[200px]">
      <div className="font-bold text-text-primary border-b border-border/80 pb-1.5 mb-2 flex items-center justify-between">
        <span>{new Date(label).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-accent">
          <span className="font-medium">Gross Revenue:</span>
          <span className="font-bold">{formatINR(data.revenueCents)}</span>
        </div>
        {data.refundsCents > 0 && (
          <div className="flex justify-between items-center text-danger">
            <span className="font-medium">Refunds:</span>
            <span className="font-bold">-{formatINR(data.refundsCents)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-success font-bold pt-1 border-t border-border/50">
          <span>Net Realized:</span>
          <span>{formatINR(data.netRevenueCents)}</span>
        </div>
        <div className="flex justify-between items-center text-text-secondary pt-1">
          <span>New Signups:</span>
          <span className="font-semibold">+{formatNumberIN(data.users)} users</span>
        </div>
        <div className="flex justify-between items-center text-text-muted">
          <span>Transactions:</span>
          <span className="font-semibold">{data.transactionsCount} txns</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Analytics Component ────────────────────────────────────────
export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChartMetric, setActiveChartMetric] = useState<'net' | 'gross' | 'users' | 'refunds'>('net');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Ledger view & filter states
  const [activeTab, setActiveTab] = useState<'ledger' | 'recent_tx'>('ledger');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSort, setLedgerSort] = useState<'date_desc' | 'date_asc' | 'rev_desc' | 'users_desc'>('date_desc');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [onlyActiveDays, setOnlyActiveDays] = useState(false);
  const pageSize = 12;

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get(`/overview?days=${days}`);
      setOverview(res.data?.data ?? null);
      setLastUpdated(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err) {
      console.error('Failed to fetch admin analytics data', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Export CSV Helper
  function handleExportCSV() {
    if (!overview?.charts?.timeSeries) return;
    const headers = ['Date,Gross Revenue (INR),Refunds (INR),Net Revenue (INR),New Signups,Transactions Count'];
    const rows = overview.charts.timeSeries.map((ts) => [
      ts.date,
      (ts.revenueCents / 100).toFixed(2),
      (ts.refundsCents / 100).toFixed(2),
      (ts.netRevenueCents / 100).toFixed(2),
      ts.users,
      ts.transactionsCount,
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finamite_analytics_${days}days_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered and sorted ledger items
  const filteredLedger = useMemo(() => {
    if (!overview?.charts?.timeSeries) return [];
    let list = [...overview.charts.timeSeries];

    if (onlyActiveDays) {
      list = list.filter((ts) => ts.revenueCents > 0 || ts.users > 0 || ts.refundsCents > 0);
    }

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      list = list.filter((ts) => ts.date.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (ledgerSort === 'date_desc') return b.date.localeCompare(a.date);
      if (ledgerSort === 'date_asc') return a.date.localeCompare(b.date);
      if (ledgerSort === 'rev_desc') return b.netRevenueCents - a.netRevenueCents;
      if (ledgerSort === 'users_desc') return b.users - a.users;
      return 0;
    });

    return list;
  }, [overview?.charts?.timeSeries, onlyActiveDays, ledgerSearch, ledgerSort]);

  const totalLedgerPages = Math.max(1, Math.ceil(filteredLedger.length / pageSize));
  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * pageSize;
    return filteredLedger.slice(start, start + pageSize);
  }, [filteredLedger, ledgerPage, pageSize]);

  // Derived metrics & sparklines
  const kpis = overview?.kpis;
  const timeSeries = overview?.charts?.timeSeries || [];
  const planDist = overview?.charts?.planDistribution || [];
  const authDist = overview?.charts?.authMethodDistribution || [];
  const recentTx = overview?.recentTransactions || [];

  const sparkData = useMemo(() => {
    if (!timeSeries.length) return { rev: [0], net: [0], users: [0], ref: [0] };
    return {
      rev: timeSeries.map((t) => t.revenueCents / 100),
      net: timeSeries.map((t) => t.netRevenueCents / 100),
      users: timeSeries.map((t) => t.users),
      ref: timeSeries.map((t) => t.refundsCents / 100),
    };
  }, [timeSeries]);

  const chartColor = {
    net: '#10B981',
    gross: '#6C63FF',
    users: '#3B82F6',
    refunds: '#EF4444',
  }[activeChartMetric];

  const chartDataKey = {
    net: 'netRevenueCents',
    gross: 'revenueCents',
    users: 'users',
    refunds: 'refundsCents',
  }[activeChartMetric];

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* ─── Header & Action Controls ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Revenue & Growth Analytics</h1>
            <Badge variant="accent" size="sm">TELEMETRY LIVE</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Real-time financial aggregation, recurring revenue (MRR/ARR), subscriber retention, and time-series telemetry (INR ₹)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Days Preset Selector */}
          <div className="flex bg-surface border border-border rounded-xl p-1 text-xs gap-1 shadow-xs">
            {[7, 14, 30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDays(d);
                  setLedgerPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  days === d
                    ? 'bg-accent text-text-onaccent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-surface-raised border border-border rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary shadow-xs transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={!overview}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-surface-raised border border-border rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary shadow-xs transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="flex items-center justify-between text-xs text-text-muted px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Active monitoring window: <strong>Last {days} Days</strong></span>
          </div>
          <span>Last synchronized at: <strong>{lastUpdated}</strong></span>
        </div>
      )}

      {loading && !overview ? (
        <div className="py-32 flex flex-col items-center justify-center text-text-muted space-y-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium">Aggregating enterprise telemetry and financial ledger...</p>
        </div>
      ) : overview && kpis ? (
        <>
          {/* ─── Top 6 KPI Executive Cards ────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Gross Revenue */}
            <MetricCard
              icon={<IndianRupee className="w-5 h-5 text-accent" />}
              tintBg="bg-accent-subtle text-accent"
              label="Gross Revenue (Charged)"
              value={formatINR(kpis.grossRevenueCents)}
              badge={`${days}D Window`}
              badgeTone="accent"
              sub={`Tax: ${formatINR(kpis.totalTaxCents)} · Discounts: ${formatINR(kpis.totalDiscountsCents)}`}
              sparkColor="#6C63FF"
              sparkData={sparkData.rev}
            />

            {/* 2. Net Realized Revenue */}
            <MetricCard
              icon={<TrendingUp className="w-5 h-5 text-success" />}
              tintBg="bg-success/10 text-success"
              label="Net Realized Revenue"
              value={formatINR(kpis.netRevenueCents)}
              badge={
                kpis.grossRevenueCents > 0
                  ? `${((kpis.netRevenueCents / kpis.grossRevenueCents) * 100).toFixed(0)}% Retained`
                  : '100% Retained'
              }
              badgeTone="success"
              sub={`After ${formatINR(kpis.totalRefundsCents)} refunds processed`}
              sparkColor="#10B981"
              sparkData={sparkData.net}
            />

            {/* 3. MRR & ARR */}
            <MetricCard
              icon={<Repeat className="w-5 h-5 text-indigo-500" />}
              tintBg="bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600"
              label="Monthly Recurring (MRR)"
              value={formatINR(kpis.mrrCents)}
              badge={`ARR: ${formatINR(kpis.arrCents)}`}
              badgeTone="accent"
              sub={`Run-rate across ${kpis.activeSubscriptions} active subscriptions`}
              sparkColor="#7C6CF6"
              sparkData={sparkData.rev}
            />

            {/* 4. Refunds & Disputes */}
            <MetricCard
              icon={<TrendingDown className="w-5 h-5 text-danger" />}
              tintBg="bg-danger/10 text-danger"
              label="Refunds Processed"
              value={formatINR(kpis.totalRefundsCents)}
              badge={`Rate: ${
                kpis.grossRevenueCents > 0
                  ? ((kpis.totalRefundsCents / kpis.grossRevenueCents) * 100).toFixed(1)
                  : 0
              }%`}
              badgeTone={kpis.totalRefundsCents > 0 ? 'danger' : 'success'}
              sub={`Processed via Razorpay gateway ledger`}
              sparkColor="#EF4444"
              sparkData={sparkData.ref}
            />

            {/* 5. Active Subscriptions & Churn */}
            <MetricCard
              icon={<CreditCard className="w-5 h-5 text-blue-500" />}
              tintBg="bg-blue-50 dark:bg-blue-500/15 text-blue-600"
              label="Paid Subscribers"
              value={formatNumberIN(kpis.activeSubscriptions)}
              badge={`Churn: ${kpis.churnRate}%`}
              badgeTone="warning"
              sub={`Conversion Rate: ${kpis.paidConversionRate || 0}% of all users`}
              sparkColor="#3B82F6"
              sparkData={sparkData.users}
            />

            {/* 6. Average Order Value (AOV) & Growth */}
            <MetricCard
              icon={<Users className="w-5 h-5 text-amber-500" />}
              tintBg="bg-amber-50 dark:bg-amber-500/15 text-amber-600"
              label="New Signups & AOV"
              value={`+${formatNumberIN(kpis.newUsersInRange)}`}
              badge={`AOV: ${formatINR(kpis.avgOrderValueCents || 0)}`}
              badgeTone="accent"
              sub={`Total base: ${formatNumberIN(kpis.totalUsers)} registered users`}
              sparkColor="#F59E0B"
              sparkData={sparkData.users}
            />
          </div>

          {/* ─── Interactive Main Visualizer ───────────────────────── */}
          <Card variant="default" className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  <h3 className="text-base font-bold text-text-primary">Financial & User Trajectory</h3>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Visual dynamic time-series performance across the selected {days}-day timeframe
                </p>
              </div>

              {/* Metric Selector Tabs */}
              <div className="flex bg-surface-raised border border-border rounded-xl p-1 text-xs gap-1">
                {[
                  { key: 'net', label: 'Net Realized', icon: TrendingUp },
                  { key: 'gross', label: 'Gross Charged', icon: IndianRupee },
                  { key: 'users', label: 'New Signups', icon: Users },
                  { key: 'refunds', label: 'Refunds', icon: TrendingDown },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeChartMetric === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveChartMetric(item.key as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        isActive
                          ? 'bg-accent text-text-onaccent shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="pt-6 h-72 sm:h-80 w-full">
              {timeSeries.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">
                  No time-series telemetry recorded for this timeframe.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const dt = new Date(d);
                        return `${dt.getDate()} ${dt.toLocaleString('en-US', { month: 'short' })}`;
                      }}
                      stroke="var(--color-text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="var(--color-text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        activeChartMetric === 'users' ? `${val}` : `₹${Math.round(val / 100)}`
                      }
                      dx={-8}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey={chartDataKey}
                      stroke={chartColor}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#metricGradient)"
                      activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: chartColor }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* ─── Breakdown Visualizations Grid (2-Columns) ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Distribution */}
            <Card variant="default" className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-accent">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Plan & Tier Distribution</h3>
                      <p className="text-xs text-text-muted">Active subscriber allocation by plan</p>
                    </div>
                  </div>
                  <Badge variant="accent" size="sm">{kpis.activeSubscriptions} Active</Badge>
                </div>

                <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Donut Chart */}
                  <div className="h-44 flex items-center justify-center">
                    {planDist.length === 0 || planDist.every((p) => p.count === 0) ? (
                      <p className="text-xs text-text-muted">No active subscriptions</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={planDist}
                            dataKey="count"
                            nameKey="name"
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={3}
                          >
                            {planDist.map((entry) => (
                              <Cell key={entry.name} fill={planColorFor(entry.name, entry.slug)} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Progress List */}
                  <div className="space-y-3">
                    {planDist.map((p) => {
                      const Icon = planIconFor(p.name, p.slug);
                      const color = planColorFor(p.name, p.slug);
                      const pct = kpis.activeSubscriptions > 0 ? (p.count / kpis.activeSubscriptions) * 100 : 0;
                      return (
                        <div key={p.name} className="p-2.5 rounded-xl border border-border/80 bg-surface-raised/40">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-md flex items-center justify-center"
                                style={{ backgroundColor: color + '20', color }}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                              <span className="font-semibold text-text-primary">{p.name}</span>
                            </div>
                            <span className="font-bold text-text-primary">
                              {p.count} <span className="text-text-muted font-normal">({pct.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-border overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, pct)}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Authentication & User Health */}
            <Card variant="default" className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center text-success">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">User Authentication & Status</h3>
                      <p className="text-xs text-text-muted">Sign-in providers & account statuses</p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">{kpis.totalUsers} Total</Badge>
                </div>

                <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Donut Chart */}
                  <div className="h-44 flex items-center justify-center">
                    {authDist.length === 0 || authDist.every((a) => a.count === 0) ? (
                      <p className="text-xs text-text-muted">No auth data recorded</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={authDist}
                            dataKey="count"
                            nameKey="method"
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={3}
                          >
                            {authDist.map((a) => {
                              const meta = AUTH_METHOD_META[a.method] || AUTH_METHOD_META['Email/Password'];
                              return <Cell key={a.method} fill={meta.color} />;
                            })}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Auth & User Status Breakdown */}
                  <div className="space-y-2.5">
                    {authDist.map((a) => {
                      const meta = AUTH_METHOD_META[a.method] || AUTH_METHOD_META['Email/Password'];
                      const Icon = meta.icon;
                      return (
                        <div key={a.method} className="flex items-center justify-between p-2 rounded-xl border border-border/80 bg-surface-raised/40 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.tint} ${meta.ring}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-semibold text-text-primary">{a.method}</span>
                          </div>
                          <span className="font-bold text-accent">{a.count} users</span>
                        </div>
                      );
                    })}

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                      <span>Active: <strong className="text-success">{kpis.activeUsers}</strong></span>
                      <span>Deactivated: <strong className="text-warning">{kpis.deactivatedUsers}</strong></span>
                      <span>Banned: <strong className="text-danger">{kpis.bannedUsers}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ─── Interactive Daily Ledger & Telemetry Activity Explorer ─── */}
          <Card variant="default">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Tab switcher */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('ledger')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'ledger'
                        ? 'bg-accent text-text-onaccent shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Daily Performance Ledger</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('recent_tx')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'recent_tx'
                        ? 'bg-accent text-text-onaccent shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Recent Live Transactions</span>
                  </button>
                </div>

                {activeTab === 'ledger' && (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Date */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search date (YYYY-MM-DD)..."
                        value={ledgerSearch}
                        onChange={(e) => {
                          setLedgerSearch(e.target.value);
                          setLedgerPage(1);
                        }}
                        className="pl-8 pr-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    {/* Filter Active Only */}
                    <button
                      onClick={() => {
                        setOnlyActiveDays(!onlyActiveDays);
                        setLedgerPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        onlyActiveDays
                          ? 'bg-accent/15 border-accent text-accent font-bold'
                          : 'bg-surface border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Active Days Only
                    </button>

                    {/* Sort Selector */}
                    <select
                      value={ledgerSort}
                      onChange={(e) => setLedgerSort(e.target.value as any)}
                      className="px-2.5 py-1.5 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none"
                    >
                      <option value="date_desc">Newest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="rev_desc">Highest Revenue</option>
                      <option value="users_desc">Most Signups</option>
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {activeTab === 'ledger' ? (
                /* Daily Ledger Table */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                        <th className="px-5 py-3.5">Date & Day</th>
                        <th className="px-5 py-3.5">Gross Charged</th>
                        <th className="px-5 py-3.5">Refunds</th>
                        <th className="px-5 py-3.5">Net Realized</th>
                        <th className="px-5 py-3.5">New Signups</th>
                        <th className="px-5 py-3.5">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paginatedLedger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                            No ledger records found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedLedger.map((ts) => {
                          const dateObj = new Date(ts.date);
                          const isToday = ts.date === new Date().toISOString().split('T')[0];
                          return (
                            <tr key={ts.date} className="hover:bg-surface-raised/50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-text-primary">{ts.date}</span>
                                  <span className="text-[11px] text-text-muted">
                                    ({dateObj.toLocaleDateString('en-US', { weekday: 'short' })})
                                  </span>
                                  {isToday && <Badge variant="accent" size="sm">Today</Badge>}
                                </div>
                              </td>
                              <td className="px-5 py-3 font-semibold text-text-primary">
                                {formatINR(ts.revenueCents)}
                              </td>
                              <td className="px-5 py-3 font-semibold text-danger">
                                {ts.refundsCents > 0 ? `-${formatINR(ts.refundsCents)}` : '₹0'}
                              </td>
                              <td className="px-5 py-3 font-bold text-success">
                                {formatINR(ts.netRevenueCents)}
                              </td>
                              <td className="px-5 py-3">
                                {ts.users > 0 ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded-full text-[11px]">
                                    +{ts.users} users
                                  </span>
                                ) : (
                                  <span className="text-text-muted">0 users</span>
                                )}
                              </td>
                              <td className="px-5 py-3 font-medium text-text-secondary">
                                {ts.transactionsCount > 0 ? (
                                  <span className="font-semibold text-text-primary">{ts.transactionsCount} txns</span>
                                ) : (
                                  <span className="text-text-muted">0 txns</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Recent Transactions Stream Table */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                        <th className="px-5 py-3.5">Customer</th>
                        <th className="px-5 py-3.5">Plan / Product</th>
                        <th className="px-5 py-3.5">Amount Realized</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Payment ID</th>
                        <th className="px-5 py-3.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recentTx.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                            No recent billing transactions recorded in the ledger yet.
                          </td>
                        </tr>
                      ) : (
                        recentTx.map((tx) => (
                          <tr key={tx.id} className="hover:bg-surface-raised/50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-semibold text-text-primary">{tx.user?.email || 'Guest / Direct'}</p>
                              {tx.user?.name && <p className="text-[11px] text-text-muted">{tx.user.name}</p>}
                            </td>
                            <td className="px-5 py-3 text-text-secondary font-medium">
                              {tx.plan?.name || 'Custom Purchase'}
                            </td>
                            <td className="px-5 py-3 font-bold text-accent">
                              {formatINR(tx.netAmountCents)}
                              {tx.discountCents > 0 && (
                                <span className="text-[10px] text-success ml-1 font-normal">
                                  (-{formatINR(tx.discountCents)})
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <Badge
                                variant={
                                  tx.status === 'CAPTURED'
                                    ? 'success'
                                    : tx.status === 'REFUNDED'
                                    ? 'danger'
                                    : 'warning'
                                }
                                size="sm"
                                dot
                              >
                                {tx.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 font-mono text-[11px] text-text-muted truncate max-w-[130px]">
                              {tx.providerPaymentId}
                            </td>
                            <td className="px-5 py-3 text-text-muted">
                              {new Date(tx.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls for Daily Ledger */}
              {activeTab === 'ledger' && (
                <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-text-muted bg-surface-raised/30">
                  <span>
                    Showing {paginatedLedger.length} of {filteredLedger.length} day records (Page {ledgerPage} of {totalLedgerPages})
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={ledgerPage <= 1}
                      onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={ledgerPage >= totalLedgerPages}
                      onClick={() => setLedgerPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}