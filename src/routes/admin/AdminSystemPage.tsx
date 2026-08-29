import React, { useEffect, useState } from "react";
import {
  Database,
  CreditCard,
  Mail,
  Clock,
  RefreshCw,
  Zap,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Monitor,
  Users,
  Layers,
  Receipt,
  RotateCcw,
  ServerCog,
  Bell,
  HardDrive,
  CircleAlert,
} from "lucide-react";
import { adminApiClient } from "../../lib/adminApiClient";
import { Spinner } from "../../components/ui/Spinner";

// ─── Types (match GET /admin/system) ─────────────────────────────────────
type Status = "healthy" | "degraded" | "down";

interface SubsystemHealth {
  status?: Status;
  running?: boolean;
  configured?: boolean;
  latencyMs?: number;
  engine?: string;
  host?: string;
  mode?: string;
  provider?: string;
  model?: string;
  root?: string;
  label?: string;
}

interface FailedWebhook {
  id: string;
  eventType: string;
  processingStatus: string;
  receivedAt: string;
  lastError: string | null;
}

interface SystemHealth {
  generatedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  subsystems: Record<string, SubsystemHealth>;
  metrics: {
    systemUptimeSeconds: number;
    unprocessedWebhooks: number;
    failedWebhooks: number;
    failedPayments: number;
    totalUsers: number;
    activeSubscriptions: number;
    totalPlans: number;
    totalTransactions: number;
    pendingRefunds: number;
    totalLedgerEvents: number;
  };
  recentFailedWebhooks: FailedWebhook[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatUptime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${totalSeconds % 60}s`;
}

function StatusPill({ status, label }: { status: Status; label: string }): React.JSX.Element {
  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {label}
      </span>
    );
  }
  if (status === "degraded") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400 text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      {label}
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
  status: Status;
  statusLabel: string;
}

function SubsystemCard({ icon, tint, iconColor, label, value, sub, status, statusLabel }: SubsystemCardProps): React.JSX.Element {
  return (
    <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-start justify-between mb-6">
        <span
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: tint, color: iconColor }}
        >
          {icon}
        </span>
        <StatusPill status={status} label={statusLabel} />
      </div>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 break-all">{sub}</p>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string;
  note: string;
  accent: string;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, note, accent, icon }: MetricCardProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#242d3f] p-5 relative overflow-hidden">
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{note}</span>
      </div>
    </div>
  );
}
export function AdminSystemPage(): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  async function fetchHealth(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiClient.get<{ data: SystemHealth }>("/system");
      setHealth(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load system health. Is the backend reachable?");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchHealth();
  }, []);

  async function runReconciliation(): Promise<void> {
    setReconciling(true);
    try {
      const res = await adminApiClient.post("/system/reconciliation", {});
      const result = res.data?.data;
      window.alert(
        `Reconciliation complete.\n\nFound ${
          (result?.discrepanciesFound ?? result?.items?.length ?? 0)
        } discrepancy(ies).`
      );
    } catch {
      window.alert("Reconciliation check failed. Please try again.");
    } finally {
      setReconciling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0e1525] p-6 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="md" className="mx-auto mb-3" />
          <p className="text-sm text-text-muted">Checking system health...</p>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0e1525] p-6 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <h1 className="text-[26px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Operational Health &amp; Subsystems
          </h1>
          <div className="rounded-2xl border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 p-6 text-center">
            <CircleAlert className="w-10 h-10 mx-auto mb-2 text-red-500" />
            <p className="font-semibold text-slate-900 dark:text-slate-100">{error || "Health data unavailable"}</p>
            <button
              onClick={() => void fetchHealth()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#242d3f] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const subs = health.subsystems || {};
  const m = health.metrics || ({} as typeof health.metrics);
  const db = subs.database || {};
  const pay = subs.paymentProvider || {};
  const smtp = subs.smtp || {};
  const ai = subs.aiProvider || {};
  const sch = subs.scheduler || {};
  const subSch = subs.subscriptionScheduler || {};
  const push = subs.pushNotifications || {};
  const fsSub = subs.fileStorage || {};

  return (
<div className="min-h-screen w-full bg-slate-50 dark:bg-[#0e1525] p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Operational Health &amp; Subsystems
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live diagnostics from the backend — last checked{" "}
              {health.generatedAt ? new Date(health.generatedAt).toLocaleTimeString() : "just now"}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void fetchHealth()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#242d3f] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Health
            </button>
            <button
              onClick={() => void runReconciliation()}
              disabled={reconciling}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-60"
            >
              <Zap className={`w-4 h-4 ${reconciling ? "animate-pulse" : ""}`} />
              {reconciling ? "Running..." : "Run Reconciliation"}
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
            value={db.engine || "PostgreSQL"}
            sub={`Latency: ${db.latencyMs ?? 0} ms`}
            status={db.status || "healthy"}
            statusLabel={db.status === "healthy" ? "Healthy" : db.status === "degraded" ? "Degraded" : "Down"}
          />
          <SubsystemCard
            icon={<CreditCard className="w-6 h-6" />}
            tint="#EEF2FF"
            iconColor="#6366F1"
            label="Payment Gateway"
            value={pay.provider || "Razorpay"}
            sub={`Mode: ${pay.mode || "n/a"}`}
            status={pay.status || "degraded"}
            statusLabel={pay.status === "healthy" ? "Configured" : "Not configured"}
          />
          <SubsystemCard
            icon={<Mail className="w-6 h-6" />}
            tint="#EFF6FF"
            iconColor="#3B82F6"
            label="Email & SMTP"
            value="SMTP Mailer"
            sub={smtp.host || "Not configured"}
            status={smtp.status || "degraded"}
            statusLabel={smtp.configured ? "Configured" : "Not configured"}
          />
          <SubsystemCard
            icon={<Bell className="w-6 h-6" />}
            tint="#FAF5FF"
            iconColor="#A855F7"
            label="Web Push"
            value={push.configured ? "Configured" : "Not configured"}
            sub="Push notifications"
            status={push.status || "degraded"}
            statusLabel={push.configured ? "Active" : "Not configured"}
          />
        </div>

        {/* Runtime + storage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SubsystemCard
            icon={<Clock className="w-6 h-6" />}
            tint="#FFF7ED"
            iconColor="#F97316"
            label="System Uptime"
            value={formatUptime(health.uptimeSeconds || m.systemUptimeSeconds)}
            sub={`Node ${health.nodeVersion || "?"}`}
            status="healthy"
            statusLabel="Running"
          />
          <SubsystemCard
            icon={<ServerCog className="w-6 h-6" />}
            tint="#EFF6FF"
            iconColor="#3B82F6"
            label="Reminder Scheduler"
            value={sch.running ? "Running" : "Stopped"}
            sub={sch.label || "Scheduler"}
            status={sch.status || "degraded"}
            statusLabel={sch.running ? "Active" : "Stopped"}
          />
          <SubsystemCard
            icon={<RotateCcw className="w-6 h-6" />}
            tint="#EFF6FF"
            iconColor="#3B82F6"
            label="Renewal Scheduler"
            value={subSch.running ? "Running" : "Stopped"}
            sub={subSch.label || "Subscriptions"}
            status={subSch.status || "degraded"}
            statusLabel={subSch.running ? "Active" : "Stopped"}
          />
          <SubsystemCard
            icon={<HardDrive className="w-6 h-6" />}
            tint="#F0FDF4"
            iconColor="#22C55E"
            label="File Storage"
            value={fsSub.status === "healthy" ? "Writable" : "Degraded"}
            sub={fsSub.root || "Local disk"}
            status={fsSub.status || "degraded"}
            statusLabel={fsSub.status === "healthy" ? "Healthy" : "Degraded"}
          />
        </div>

        {/* AI provider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SubsystemCard
            icon={<Activity className="w-6 h-6" />}
            tint="#EEF2FF"
            iconColor="#6366F1"
            label="AI Provider"
            value={ai.provider || "Disabled"}
            sub={`Model: ${ai.model || "—"}`}
            status={ai.status || "degraded"}
            statusLabel={ai.configured ? "Configured" : "Not configured"}
          />
        </div>
{/* Live metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Users" value={m.totalUsers ?? 0} note="Registered accounts" accent="#6366F1" icon={<Users className="w-3 h-3 text-slate-300 dark:text-slate-600" />} />
          <MetricCard label="Active Plans" value={m.totalPlans ?? 0} note="Paid & free tiers" accent="#10B981" icon={<Layers className="w-3 h-3 text-slate-300 dark:text-slate-600" />} />
          <MetricCard label="Active Subs" value={m.activeSubscriptions ?? 0} note="Active subscriptions" accent="#3B82F6" icon={<Receipt className="w-3 h-3 text-slate-300 dark:text-slate-600" />} />
          <MetricCard label="Transactions" value={m.totalTransactions ?? 0} note="Total ledger tx" accent="#F59E0B" icon={<Receipt className="w-3 h-3 text-slate-300 dark:text-slate-600" />} />
          <MetricCard label="Unprocessed" value={m.unprocessedWebhooks ?? 0} note="Webhook events pending" accent="#8B5CF6" />
          <MetricCard label="Failed Webhooks" value={m.failedWebhooks ?? 0} note="Webhook processing failures" accent="#EF4444" />
          <MetricCard label="Failed Payments" value={m.failedPayments ?? 0} note="Failed billing tx" accent="#EF4444" />
          <MetricCard label="Pending Refunds" value={m.pendingRefunds ?? 0} note="Awaiting processing" accent="#F59E0B" />
        </div>

        {/* Recent failed webhooks */}
        {(health.recentFailedWebhooks?.length ?? 0) > 0 && (
          <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Failed Webhooks</h3>
            <div className="space-y-2">
              {health.recentFailedWebhooks!.map((w) => (
                <div key={w.id} className="p-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-xs">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">{w.eventType}</span>
                    <span className="text-text-muted">{new Date(w.receivedAt).toLocaleString()}</span>
                    <span className="text-red-500">{w.processingStatus}</span>
                  </div>
                  {w.lastError && <p className="mt-1 text-text-muted font-mono break-all">{w.lastError}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
{/* Everything looks good banner */}
        <div className="bg-white dark:bg-[#242d3f] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {m.failedPayments > 0 || m.failedWebhooks > 0 ? "Some systems need attention" : "Everything looks good!"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {m.failedPayments > 0 || m.failedWebhooks > 0
                  ? "Review failed payments and webhooks above for resolution."
                  : "All critical systems are operational and healthy."}
              </p>
            </div>
          </div>
          <div className="relative w-24 h-16 hidden sm:flex items-center justify-center shrink-0">
            <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-500/40 top-1 left-2" />
            <span className="absolute w-1 h-1 rounded-full bg-indigo-300 dark:bg-indigo-500/50 top-6 left-0" />
            <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-500/40 bottom-1 right-3" />
            <span className="absolute w-1 h-1 rounded-full bg-indigo-300 dark:bg-indigo-500/50 top-2 right-0" />
            <div className="w-14 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-indigo-300 dark:text-indigo-400" />
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