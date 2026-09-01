import React, { useCallback, useEffect, useState } from "react";
import {
  IndianRupee,
  TrendingUp,
  Repeat,
  Users,
  RefreshCw,
  Layers,
  ShieldCheck,
  BarChart3,
  Star,
  Gem,
  Crown,
  Gift,
  Link2,
  Mail,
  UserCheck,
  UserCheck2,
  CreditCard,
  Percent,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { adminApiClient } from "../../lib/adminApiClient";
import { Spinner } from "../../components/ui/Spinner";
import { formatINR, formatNumberIN } from "../../utils/formatCurrency";

const PLAN_ICON_BY_SLUG: Record<string, React.ComponentType<{ className?: string }>> = {
  basic: Star,
  premium: Gem,
  ultimate: Crown,
  free: Gift,
};
const PLAN_COLOR_BY_SLUG: Record<string, string> = {
  basic: "#7C6CF6",
  premium: "#3B82F6",
  ultimate: "#10B981",
  free: "#F59E0B",
};
const DEFAULT_PLAN_ICON = Star;
const DEFAULT_PLAN_COLOR = "#94a3b8";

function planIconFor(name: string, slug?: string) {
  if (slug && PLAN_ICON_BY_SLUG[slug]) return PLAN_ICON_BY_SLUG[slug];
  const n = (name || "").toLowerCase();
  for (const key of ["basic", "premium", "ultimate", "free"]) {
    if (n.includes(key)) return PLAN_ICON_BY_SLUG[key];
  }
  return DEFAULT_PLAN_ICON;
}
function planColorFor(name: string, slug?: string) {
  if (slug && PLAN_COLOR_BY_SLUG[slug]) return PLAN_COLOR_BY_SLUG[slug];
  const n = (name || "").toLowerCase();
  for (const key of ["basic", "premium", "ultimate", "free"]) {
    if (n.includes(key)) return PLAN_COLOR_BY_SLUG[key];
  }
  return DEFAULT_PLAN_COLOR;
}

const AUTH_METHOD_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tint: string; ring: string }
> = {
  "Google OAuth": {
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
    ),
    tint: "bg-blue-50",
    ring: "text-blue-600",
  },
  "Email / Password": { icon: Mail, tint: "bg-indigo-50", ring: "text-indigo-600" },
  "Email/Password": { icon: Mail, tint: "bg-indigo-50", ring: "text-indigo-600" },
  "Both Linked": { icon: Link2, tint: "bg-emerald-50", ring: "text-emerald-600" },
};
function authMethodMeta(method: string) {
  return AUTH_METHOD_META[method] ?? AUTH_METHOD_META["Email / Password"];
}

// ─── Small building blocks ───────────────────────────────────────────────
interface SparklineProps {
  data: { v: number }[];
  color: string;
}

function Sparkline({ data, color }: SparklineProps) {
  return (
    <div className="w-20 h-10 opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  iconTint: string;
  label: string;
  value: React.ReactNode;
  sub: string;
  sparkColor: string;
  sparkData: { v: number }[];
}

function StatCard({ icon, iconTint, label, value, sub, sparkColor, sparkData }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center ${iconTint}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex items-end justify-between mt-1">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {value}
          </p>
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 -mt-2">
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ backgroundColor: sparkColor }}
        />
        {sub}
      </div>
    </div>
  );
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function SectionCard({ icon, title, subtitle, children, footer }: SectionCardProps) {
  return (
    <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3">{children}</div>
      {footer && (
        <div className="px-5 pb-5">
          <button className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2">
            {footer}
          </button>
        </div>
      )}
    </div>
  );
}

interface DistributionRowProps {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  name: string;
  count: number;
  unit: string;
}

function DistributionRow({ icon: Icon, color, name, count, unit }: DistributionRowProps) {
  const pct = count === 0 ? 4 : Math.min(100, count);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color + "1A", color }}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {count} {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface AuthRowProps {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  ring: string;
  method: string;
  count: number;
}

function AuthRow({ icon: Icon, tint, ring, method, count }: AuthRowProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${tint} ${ring}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{method}</span>
      </div>
      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 px-2.5 py-1 rounded-full">
        {count} registered
      </span>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────
interface OverviewPayload {
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
    churnRate: number;
  };
  charts: {
    timeSeries: { date: string; revenueCents: number; users: number }[];
    planDistribution: { name: string; slug: string; count: number }[];
    authMethodDistribution: { method: string; count: number }[];
  };
}

const EMPTY_OVERVIEW: OverviewPayload = {
  kpis: {
    totalUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0,
    bannedUsers: 0,
    newUsersInRange: 0,
    activeSubscriptions: 0,
    mrrCents: 0,
    arrCents: 0,
    grossRevenueCents: 0,
    totalTaxCents: 0,
    totalDiscountsCents: 0,
    totalRefundsCents: 0,
    netRevenueCents: 0,
    churnRate: 0,
  },
  charts: {
    timeSeries: [],
    planDistribution: [],
    authMethodDistribution: [],
  },
};

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewPayload>(EMPTY_OVERVIEW);
  const [lastUpdated, setLastUpdated] = useState(() => fmt(new Date()));

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get("/overview");
      setOverview(res.data?.data ?? EMPTY_OVERVIEW);
      setLastUpdated(fmt(new Date()));
    } catch (err) {
      console.error("Failed to fetch overview metrics", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const k = overview.kpis;
  const planDist = overview.charts.planDistribution;
  const authDist = overview.charts.authMethodDistribution;
  const spark = (base: number) =>
    Array.from({ length: 12 }, (_, i) => ({
      v: Math.max(0, base + Math.sin(i / 2) * base * 0.3 + i * (base * 0.05)),
    }));

  const planDistRows = planDist.map((p) => ({
    icon: planIconFor(p.name, p.slug),
    color: planColorFor(p.name, p.slug),
    name: p.name,
    slug: p.slug,
    count: p.count,
  }));
  const authDistRows = authDist.map((a) => ({
    icon: authMethodMeta(a.method).icon,
    tint: authMethodMeta(a.method).tint,
    ring: authMethodMeta(a.method).ring,
    method: a.method,
    count: a.count,
  }));

  const chartData = planDistRows.map((p) => ({
    name: p.name,
    value: p.count,
    color: p.color,
  }));
  const botTotal = authDistRows.reduce((acc, a) => acc + a.count, 0);
  const paidRate = k.totalUsers > 0 ? (k.activeSubscriptions / k.totalUsers) * 100 : 0;

  const quickInsights = [
    {
      label: "Total Users",
      sub: "All time",
      value: formatNumberIN(k.totalUsers),
      icon: UserCheck,
      tint: "bg-violet-50",
      color: "text-violet-600",
    },
    {
      label: "New Signups (30D)",
      sub: "last 30 days",
      value: formatNumberIN(k.newUsersInRange),
      icon: UserCheck2,
      tint: "bg-emerald-50",
      color: "text-emerald-600",
    },
    {
      label: "Paid Subscribers",
      sub: "currently active",
      value: formatNumberIN(k.activeSubscriptions),
      icon: CreditCard,
      tint: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      label: "Paid Conversion Rate",
      sub: `${k.churnRate}% churn`,
      value: `${paidRate.toFixed(1)}%`,
      icon: Percent,
      tint: "bg-orange-50",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0e1525] p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Operational metrics, recurring revenue (MRR/ARR), and subscription distribution (30 Days)
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <button
              onClick={fetchOverview}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#242d3f] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Live Data
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500">Last updated: {lastUpdated}</span>
          </div>
        </div>

        {(loading && overview === EMPTY_OVERVIEW) ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Spinner size="lg" />
            <p className="text-sm mt-3 font-medium">Loading dashboard metrics...</p>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                icon={<IndianRupee className="w-5 h-5 text-violet-600" />}
                iconTint="bg-violet-50"
                label="Monthly Recurring Revenue (MRR)"
                value={formatINR(k.mrrCents)}
                sub={`ARR: ${formatINR(k.arrCents)}`}
                sparkColor="#7C6CF6"
                sparkData={spark(k.mrrCents / 100 || 10)}
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                iconTint="bg-emerald-50"
                label="Net Realized Revenue (30D)"
                value={formatINR(k.netRevenueCents)}
                sub={`Tax: ${formatINR(k.totalTaxCents)} · Refunds: ${formatINR(k.totalRefundsCents)}`}
                sparkColor="#10B981"
                sparkData={spark(k.netRevenueCents / 100 || 8)}
              />
              <StatCard
                icon={<Repeat className="w-5 h-5 text-blue-600" />}
                iconTint="bg-blue-50"
                label="Active Subscriptions"
                value={k.activeSubscriptions}
                sub={`Churn Rate: ${k.churnRate}%`}
                sparkColor="#3B82F6"
                sparkData={spark(k.activeSubscriptions || 6)}
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-amber-600" />}
                iconTint="bg-amber-50"
                label="Total Users"
                value={k.totalUsers}
                sub={`Active: ${k.activeUsers} | Banned: ${k.bannedUsers}`}
                sparkColor="#F59E0B"
                sparkData={spark(k.totalUsers || 4)}
              />
            </div>

        {/* Distribution + Auth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                icon={<Layers className="w-4.5 h-4.5" />}
                title="Plan Distribution"
                subtitle="Active subscribers by plan"
                footer={
                  <>
                    <BarChart3 className="w-4 h-4" /> View Plan Analytics
                  </>
                }
              >
                {planDistRows.length > 0 ? (
                  planDistRows.map((p) => (
                    <DistributionRow
                      key={p.name}
                      icon={p.icon}
                      color={p.color}
                      name={p.name}
                      count={p.count}
                      unit="active subscribers"
                    />
                  ))
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-2">
                    No subscription data yet.
                  </p>
                )}
              </SectionCard>

              <SectionCard
                icon={<ShieldCheck className="w-4.5 h-4.5" />}
                title="Authentication Methods"
                subtitle="User registration methods"
                footer={
                  <>
                    <ShieldCheck className="w-4 h-4" /> View Auth Insights
                  </>
                }
              >
                {authDistRows.length > 0 ? (
                  authDistRows.map((a) => (
                    <AuthRow
                      key={a.method}
                      icon={a.icon}
                      tint={a.tint}
                      ring={a.ring}
                      method={a.method}
                      count={a.count}
                    />
                  ))
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-2">
                    No auth method data yet.
                  </p>
                )}
              </SectionCard>
            </div>

        {/* Plan Share + Auth Breakdown pies */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-600" /> Plan Share
                </h3>
                {chartData.every((d) => d.value === 0) ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
                    No active subscriptions to chart.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {chartData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {chartData
                    .filter((d) => d.value > 0)
                    .map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name} · {d.value}
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Auth Breakdown
                </h3>
                {botTotal === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
                    No registered users yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={authDistRows} dataKey="count" nameKey="method" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {authDistRows.map((a) => (
                          <Cell
                            key={a.method}
                            fill={a.method === "Google OAuth" ? "#4285F4" : a.method === "Both Linked" ? "#10B981" : "#6366F1"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {authDistRows
                    .filter((a) => a.count > 0)
                    .map((a) => (
                      <div key={a.method} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              a.method === "Google OAuth" ? "#4285F4" : a.method === "Both Linked" ? "#10B981" : "#6366F1",
                          }}
                        />
                        {a.method} · {a.count}
                      </div>
                    ))}
                </div>
              </div>
            </div>

        {/* Quick Insights */}
        <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Quick Insights</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {quickInsights.map((q) => {
              const Icon = q.icon;
              return (
                <div key={q.label} className="flex items-center gap-3">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${q.tint} ${q.color}`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                      {q.value}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{q.label}</p>
                    <p className="text-[11px] text-slate-350 text-slate-400 dark:text-slate-500">{q.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}