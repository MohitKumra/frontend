import React, { useState } from "react";
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
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

// ─── Mock data (swap for your live /overview API response) ──────────────
const spark = (base: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    v: Math.max(0, base + Math.sin(i / 2) * base * 0.3 + i * (base * 0.05)),
  }));

const kpis = {
  mrr: 0,
  arr: 0,
  netRevenue: 0,
  refunds: 0,
  activeSubs: 0,
  churnRate: 0,
  totalUsers: 1,
  activeUsers: 1,
  bannedUsers: 0,
};

const planDistribution = [
  { name: "Basic", count: 0, icon: Star, color: "#7C6CF6" },
  { name: "Premium", count: 0, icon: Gem, color: "#3B82F6" },
  { name: "Ultimate", count: 0, icon: Crown, color: "#10B981" },
  { name: "Free", count: 0, icon: Gift, color: "#F59E0B" },
];

const authMethods = [
  { method: "Google OAuth", count: 0, icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
    ), tint: "bg-blue-50", ring: "text-blue-600" },
  { method: "Email / Password", count: 0, icon: Mail, tint: "bg-indigo-50", ring: "text-indigo-600" },
  { method: "Both Linked", count: 1, icon: Link2, tint: "bg-emerald-50", ring: "text-emerald-600" },
];

const quickInsights = [
  { label: "Total Users", sub: "All time", value: "1", icon: UserCheck, tint: "bg-violet-50", color: "text-violet-600" },
  { label: "New Signups (30D)", sub: "—", value: "0", icon: UserCheck2, tint: "bg-emerald-50", color: "text-emerald-600" },
  { label: "Paid Conversions (30D)", sub: "—", value: "0", icon: CreditCard, tint: "bg-blue-50", color: "text-blue-600" },
  { label: "Conversion Rate (30D)", sub: "—", value: "0%", icon: Percent, tint: "bg-orange-50", color: "text-orange-600" },
];

const formatINR = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN").format(n);

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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center ${iconTint}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="flex items-end justify-between mt-1">
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </p>
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 -mt-2">
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3">{children}</div>
      {footer && (
        <div className="px-5 pb-5">
          <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
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
    <div className="rounded-xl border border-slate-200 p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color + "1A", color }}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold text-slate-800">{name}</span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {count} {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
    <div className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${tint} ${ring}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-sm font-semibold text-slate-800">{method}</span>
      </div>
      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
        {count} registered
      </span>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────
export function AdminDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(
    new Date().toLocaleString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    })
  );

  function refresh() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLastUpdated(
        new Date().toLocaleString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
        })
      );
    }, 900);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Operational metrics, recurring revenue (MRR/ARR), and subscription distribution (30 Days)
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Live Data
            </button>
            <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            icon={<IndianRupee className="w-5 h-5 text-violet-600" />}
            iconTint="bg-violet-50"
            label="Monthly Recurring Revenue (MRR)"
            value={formatINR(kpis.mrr)}
            sub={`ARR: ${formatINR(kpis.arr)}`}
            sparkColor="#7C6CF6"
            sparkData={spark(10)}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            iconTint="bg-emerald-50"
            label="Net Realized Revenue (30D)"
            value={formatINR(kpis.netRevenue)}
            sub={`Refunds: ${formatINR(kpis.refunds)}`}
            sparkColor="#10B981"
            sparkData={spark(8)}
          />
          <StatCard
            icon={<Repeat className="w-5 h-5 text-blue-600" />}
            iconTint="bg-blue-50"
            label="Active Subscriptions"
            value={kpis.activeSubs}
            sub={`Churn Rate: ${kpis.churnRate}%`}
            sparkColor="#3B82F6"
            sparkData={spark(6)}
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-amber-600" />}
            iconTint="bg-amber-50"
            label="Total Users"
            value={kpis.totalUsers}
            sub={`Active: ${kpis.activeUsers} | Banned: ${kpis.bannedUsers}`}
            sparkColor="#F59E0B"
            sparkData={spark(4)}
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
            {planDistribution.map((p) => (
              <DistributionRow
                key={p.name}
                icon={p.icon}
                color={p.color}
                name={p.name}
                count={p.count}
                unit="active subscribers"
              />
            ))}
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
            {authMethods.map((a) => (
              <AuthRow
                key={a.method}
                icon={a.icon}
                tint={a.tint}
                ring={a.ring}
                method={a.method}
                count={a.count}
              />
            ))}
          </SectionCard>
        </div>

        {/* Quick Insights */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Insights</h3>
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
                    <p className="text-lg font-extrabold text-slate-900 leading-tight">
                      {q.value}
                    </p>
                    <p className="text-xs font-medium text-slate-500">{q.label}</p>
                    <p className="text-[11px] text-slate-350 text-slate-400">{q.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}