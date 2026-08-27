import React,{ useState } from "react";
import {
  Database,
  CreditCard,
  Mail,
  Clock,
  RefreshCw,
  Zap,
  Activity,
  Calendar,
  ChevronDown,
  Info,
  CheckCircle2,
  Webhook,
  ShieldCheck,
  Monitor,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────
interface SubsystemDatabase {
  engine: string;
  latencyMs: number;
  status: "Healthy" | "Degraded" | "Down";
}

interface SubsystemPaymentProvider {
  provider: string;
  mode: string;
  status: "Healthy" | "Degraded" | "Down";
}

interface SubsystemSmtp {
  host: string;
  status: "Healthy" | "Degraded" | "Down";
}

interface SystemMetrics {
  systemUptimeSeconds: number;
  unprocessedWebhooks: number;
  failedWebhooks: number;
  failedPayments: number;
}

interface SystemHealth {
  subsystems: {
    database: SubsystemDatabase;
    paymentProvider: SubsystemPaymentProvider;
    smtp: SubsystemSmtp;
  };
  metrics: SystemMetrics;
}

interface SparkPoint {
  v: number;
}

type DateRange = "Last 24 Hours" | "Last 7 Days" | "Last 30 Days";

// ─── Mock data (swap for your live /system response) ─────────────────────
const health: SystemHealth = {
  subsystems: {
    database: { engine: "PostgreSQL", latencyMs: 1, status: "Healthy" },
    paymentProvider: { provider: "Razorpay", mode: "Test", status: "Healthy" },
    smtp: { host: "smtp.gmail.com", status: "Healthy" },
  },
  metrics: {
    systemUptimeSeconds: 1440,
    unprocessedWebhooks: 0,
    failedWebhooks: 0,
    failedPayments: 0,
  },
};

function spark(variance: number, trendUp: boolean): SparkPoint[] {
  return Array.from({ length: 14 }, (_, i) => ({
    v: Math.max(0.4, 1 + Math.sin(i / 1.7) * variance + (trendUp ? i * 0.02 : -i * 0.01)),
  }));
}

// ─── Small building blocks ────────────────────────────────────────────────
function HealthyPill(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Healthy
    </span>
  );
}

interface SubsystemCardProps {
  icon: React.ReactNode;
  tint: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  subTint: string;
  subColor: string;
}

function SubsystemCard({ icon, tint, iconColor, label, value, sub, subTint, subColor }: SubsystemCardProps): React.JSX.Element {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex items-start justify-between mb-6">
        <span
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: tint, color: iconColor }}
        >
          {icon}
        </span>
        <HealthyPill />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 mt-1">{value}</p>
      <span
        className="inline-block mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
        style={{ backgroundColor: subTint, color: subColor }}
      >
        {sub}
      </span>
    </div>
  );
}

interface MetricSparkCardProps {
  label: string;
  value: number;
  note: string;
  lineColor: string;
  data: SparkPoint[];
}

function MetricSparkCard({ label, value, note, lineColor, data }: MetricSparkCardProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 relative overflow-hidden">
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <Info className="w-3 h-3 text-slate-300" />
      </div>
      <p className="text-3xl font-extrabold text-slate-900">{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-xs font-medium text-slate-500">{note}</span>
      </div>
      <div className="absolute bottom-0 right-0 w-32 h-14 opacity-90">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="v" stroke={lineColor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface PipelineStepProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  isFirst?: boolean;
}

function PipelineStep({ icon, label, sub, isFirst = false }: PipelineStepProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 flex-1">
      {!isFirst && (
        <div className="hidden sm:block flex-1 border-t-2 border-dashed border-slate-200 relative mx-1">
          <span className="absolute -top-2 right-0 text-slate-300">{"\u203A"}</span>
        </div>
      )}
      <div className="flex items-center gap-3 shrink-0">
        <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
          {icon}
        </span>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">{label}</p>
          <p className="text-xs text-slate-400 leading-tight">{sub}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export function AdminSystemPage(): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [range, setRange] = useState<DateRange>("Last 24 Hours");
  const [showRangeMenu, setShowRangeMenu] = useState<boolean>(false);

  function refresh(): void {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 800);
  }

  function runReconciliation(): void {
    setReconciling(true);
    window.setTimeout(() => setReconciling(false), 1200);
  }

  const uptimeHrs: string = (health.metrics.systemUptimeSeconds / 3600).toFixed(1);
  const dateRanges: DateRange[] = ["Last 24 Hours", "Last 7 Days", "Last 30 Days"];

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight">
              Operational Health &amp; Subsystems
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time system diagnostics, latency, webhooks, and billing reconciliation.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Health
            </button>
            <button
              onClick={runReconciliation}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Zap className={`w-4 h-4 ${reconciling ? "animate-pulse" : ""}`} />
              Run Reconciliation
            </button>
          </div>
        </div>

        {/* Subsystem cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SubsystemCard
            icon={<Database className="w-6 h-6" />}
            tint="#ECFDF5"
            iconColor="#10B981"
            label="Database Engine"
            value={health.subsystems.database.engine}
            sub={`Latency: ${health.subsystems.database.latencyMs} ms`}
            subTint="#ECFDF5"
            subColor="#059669"
          />
          <SubsystemCard
            icon={<CreditCard className="w-6 h-6" />}
            tint="#EEF2FF"
            iconColor="#6366F1"
            label="Payment Gateway"
            value={health.subsystems.paymentProvider.provider}
            sub={`Mode: ${health.subsystems.paymentProvider.mode}`}
            subTint="#EEF2FF"
            subColor="#4F46E5"
          />
          <SubsystemCard
            icon={<Mail className="w-6 h-6" />}
            tint="#EFF6FF"
            iconColor="#3B82F6"
            label="Email & SMTP"
            value="SMTP Mailer"
            sub={health.subsystems.smtp.host}
            subTint="#EFF6FF"
            subColor="#2563EB"
          />
          <SubsystemCard
            icon={<Clock className="w-6 h-6" />}
            tint="#FFF7ED"
            iconColor="#F97316"
            label="System Uptime"
            value={`${uptimeHrs} hrs`}
            sub="PID Status: Active"
            subTint="#FFF7ED"
            subColor="#EA580C"
          />
        </div>

        {/* Webhook & Ingestion Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Activity className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Webhook &amp; Ingestion Pipeline</h3>
                <p className="text-xs text-slate-400">Live overview of webhook events and payment ingestion health</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowRangeMenu((v) => !v)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Calendar className="w-3.5 h-3.5" />
                {range}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {showRangeMenu && (
                <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
                  {dateRanges.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRange(r);
                        setShowRangeMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metric spark cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <MetricSparkCard
              label="Unprocessed Events"
              value={health.metrics.unprocessedWebhooks}
              note="No pending events"
              lineColor="#10B981"
              data={spark(0.15, false)}
            />
            <MetricSparkCard
              label="Failed Webhooks"
              value={health.metrics.failedWebhooks}
              note="No failures"
              lineColor="#EF4444"
              data={spark(0.25, false)}
            />
            <MetricSparkCard
              label="Failed Payments"
              value={health.metrics.failedPayments}
              note="No failed payments"
              lineColor="#F59E0B"
              data={spark(0.3, true)}
            />
          </div>

          {/* Pipeline health flow */}
          <div className="rounded-2xl bg-indigo-50/40 border border-indigo-100 p-5 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-3 pr-5 sm:border-r border-slate-200 shrink-0">
              <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Webhook className="w-4.5 h-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Pipeline Health</p>
                <p className="text-xs text-slate-400">All systems operating normally</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-0 flex-1">
              <PipelineStep icon={<CheckCircle2 className="w-4.5 h-4.5" />} label="Webhook Received" sub="Events captured" isFirst />
              <PipelineStep icon={<CheckCircle2 className="w-4.5 h-4.5" />} label="Processed" sub="Events processed" />
              <PipelineStep icon={<CheckCircle2 className="w-4.5 h-4.5" />} label="Completed" sub="Data reconciled" />
            </div>
          </div>
        </div>

        {/* Everything looks good banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Everything looks good!</h3>
              <p className="text-sm text-slate-500 mt-0.5">All critical systems are operational and healthy.</p>
            </div>
          </div>
          <div className="relative w-24 h-16 hidden sm:flex items-center justify-center shrink-0">
            <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-200 top-1 left-2" />
            <span className="absolute w-1 h-1 rounded-full bg-indigo-300 top-6 left-0" />
            <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-200 bottom-1 right-3" />
            <span className="absolute w-1 h-1 rounded-full bg-indigo-300 top-2 right-0" />
            <div className="w-14 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-indigo-300" />
            </div>
            <span className="absolute -bottom-1 right-6 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}