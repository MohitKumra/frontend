// frontend/src/components/settings/BillingSettingsPanel.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock,
  ArrowUpRight,
  Download,
  Shield,
  Layers,
  Repeat,
  CheckSquare,
  Bot,
  AlertCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  FileText,
  BookOpen,
  HardDrive,
  Receipt,

} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import apiClient from '../../lib/apiClient';
import { useUserPlan, type PlanDTO } from '../../features/billing/useUserPlan';
import { formatINR } from '../../utils/formatCurrency';
import { UpgradeModal } from '../billing/UpgradeModal';
import { DowngradeConfirmModal } from '../billing/DowngradeConfirmModal';
import { useUpgradeModalStore } from '../../store/upgradeModalStore';
import { PlanCard } from '../billing/PlanCard';
import { PaymentMethodSettingsCard } from '../billing/PaymentMethodSettingsCard';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function BillingSettingsPanel() {
  const {
    effectivePlan,
    subscription,
    usage,
    transactions,
    invoices,
    plans,
    isLoading,
    cancelSubscription,
    downgradeSubscription,
    cancelScheduledDowngrade,
    refetch,
    isError,

  } = useUserPlan();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellingDowngrade, setCancellingDowngrade] = useState(false);
  const [downgradeTargetPlan, setDowngradeTargetPlan] = useState<PlanDTO | null>(null);
  const navigate = useNavigate();
  const choosePlanForCheckout = useUpgradeModalStore((s) => s.choosePlanForCheckout);

  async function handleCancelSub() {
    setCancelConfirmOpen(false);
    setCancelling(true);
    try {
      await cancelSubscription({ reason: 'User requested cancellation in settings' });
      toast.success('Subscription cancelled. You will maintain access until current period ends.');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  }

  async function handleConfirmDowngrade() {
    if (!downgradeTargetPlan) return;
    try {
      await downgradeSubscription({ targetPlanId: downgradeTargetPlan.id });
      toast.success(`Downgrade to ${downgradeTargetPlan.name} scheduled for end of billing cycle.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to schedule downgrade');
    }
  }

  async function handleCancelDowngrade() {
    setCancellingDowngrade(true);
    try {
      await cancelScheduledDowngrade();
      toast.success('Scheduled downgrade cancelled. Auto-renewal for your current plan restored.');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to cancel scheduled downgrade');
    } finally {
      setCancellingDowngrade(false);
    }
  }

  async function openInvoicePdf(invoiceId: string) {
    const token = useAuthStore.getState().accessToken;
    const backendBase = import.meta.env.VITE_BACKEND_URL || '';
    const directUrl = `${backendBase}/billing/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token || '')}`;
    window.open(directUrl, '_blank');
  }

  async function downloadInvoicePdf(invoiceId: string, invoiceNumber: string) {
    const response = await apiClient.get(`/billing/invoices/${invoiceId}/pdf?download=1`, { responseType: 'blob' });
    if (response.data.type && response.data.type.includes('json')) {
      const text = await response.data.text();
      let msg = 'Failed to download invoice PDF';
      try {
        const parsed = JSON.parse(text);
        msg = parsed.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-text-muted">
        <Spinner size="lg" />
        <p className="text-sm mt-3 font-medium">Loading subscription details...</p>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center px-6">
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 mb-4">
          <AlertCircle className="w-7 h-7 text-danger mx-auto" />
        </div>
        <h3 className="text-base font-bold text-text-primary">Couldn't load billing details</h3>
        <p className="text-sm text-text-muted mt-1.5 max-w-sm">
          We couldn't fetch your plan and subscription right now. Please try again in a moment.
        </p>
        <Button
          variant="secondary"
          size="md"
          className="mt-5"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }



  const isPaid = effectivePlan.planSlug !== 'free';
  
  // Base tier from a plan slug: strips the "_yearly" suffix so monthly and
  // annual rows of the same tier group together (e.g. "premium" & "premium_yearly").
  const baseTierOf = (slug: string) => (slug.endsWith('_yearly') ? slug.slice(0, -'_yearly'.length) : slug);
  
  // Compare section: show paid plans matching the selected billing cycle. Free
  // is the default tier and is surfaced as a status banner, not a selectable card.
  const comparePlans = plans.filter(
    (p) => p.priceCents > 0 && p.billingInterval === billingCycle
  );

  // Calculate usage percentages
  // Use ?? (not ||) so a limit deliberately set to 0 is respected instead of
  // falling back to the default (0 || 50 would wrongly show 50 AI requests).
  const maxProjects = effectivePlan.features.projects ?? 3;
  const maxHabits = effectivePlan.features.habits ?? 5;
  const maxTasks = effectivePlan.features.tasks ?? 100;
  const maxAI = effectivePlan.features.aiRequestsPerMonth ?? 50;
  const notesLimit = effectivePlan.features.notes ?? 0;
  const journalsLimit = effectivePlan.features.journals ?? 0;

  const projectPct = Math.min(100, Math.round((usage.projects / maxProjects) * 100));
  const habitPct = Math.min(100, Math.round((usage.habits / maxHabits) * 100));
  const taskPct = Math.min(100, Math.round((usage.tasks / maxTasks) * 100));
  const aiPct = Math.min(100, Math.round((usage.aiRequests / maxAI) * 100));

  const isCancelled =
    subscription?.status === 'CANCELLED' ||
    subscription?.cancelAtPeriodEnd === true;
  const isPaused = subscription?.status === 'PAUSED';
  const isDowngradeScheduled = Boolean(subscription?.scheduledDowngradePlan);
  const isOneTime = Boolean(
    isPaid &&
    subscription?.status === 'ACTIVE' &&
    subscription?.autoRenew === false &&
    !isCancelled &&
    !isDowngradeScheduled
  );

  return (
    <div className="space-y-6">
      {/* ─── Active Plan Banner ───────────────────────────────────── */}
      <Card variant="elevated" className="overflow-hidden border-accent-border/60">
        <div className="p-6 bg-gradient-to-r from-accent/15 via-accent-subtle/20 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-accent text-text-onaccent shadow-sm">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-text-primary tracking-tight">
                    {effectivePlan.planName == "Custom Plan" ? "Custom" : effectivePlan.planName} Plan
                  </h3>
                  <Badge
                    variant={
                      isPaused
                        ? 'warning'
                        : isDowngradeScheduled
                        ? 'warning'
                        : isCancelled
                        ? 'danger'
                        : effectivePlan.status === 'ACTIVE'
                        ? 'success'
                        : effectivePlan.status === 'FREE'
                        ? 'accent'
                        : 'warning'
                    }
                    size="sm"
                    dot
                  >
                    {isPaused
                      ? 'PAUSED'
                      : isDowngradeScheduled
                      ? 'DOWNGRADE SCHEDULED'
                      : isCancelled
                      ? subscription?.cancelAtPeriodEnd
                        ? 'CANCELLING'
                        : 'CANCELLED'
                      : isOneTime
                      ? 'ACTIVE'
                      : effectivePlan.status}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {effectivePlan.source === 'ADMIN_OVERRIDE'
                    ? 'Active VIP administrative access override'
                    : isPaused
                    ? 'Subscription billing has been paused by the administrator. Contact support to reactivate.'
                    : isDowngradeScheduled
                    ? `Downgrade to ${subscription?.scheduledDowngradePlan?.name} is scheduled for ${effectivePlan.expiresAt ? new Date(effectivePlan.expiresAt).toLocaleDateString('en-GB') : 'period end'}. You maintain all ${effectivePlan.planName} features until then.`
                    : isCancelled
                    ? subscription?.cancelAtPeriodEnd
                      ? 'Subscription cancellation is scheduled. Auto-renewal is stopped, and you maintain access until the end of your billing cycle.'
                      : 'Subscription was cancelled. Access ends when the current period expires.'
                    : isOneTime
                    ? `Active ${subscription?.billingInterval ? subscription.billingInterval.toLowerCase() + 'ly' : 'monthly'} pass (One-time payment).`
                    : isPaid
                    ? `Active ${subscription?.billingInterval ? subscription.billingInterval.toLowerCase() + 'ly' : 'monthly'} subscription with auto-renewal`
                    : 'The productivity engine (tasks, habits, projects) is free. The Free plan is your default starting point — upgrade anytime for AI, goals, and more.'}
                </p>
              </div>
            </div>

            {effectivePlan.expiresAt && (
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span>
                  {isCancelled ? 'Access remains active until ' : 'Current period active until '}
                  <strong>{new Date(effectivePlan.expiresAt).toLocaleDateString('en-GB')}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setUpgradeModalOpen(true)}
              leftIcon={<Zap className="w-4 h-4" />}
              disabled={isPaused}
            >
              {isPaused
                ? 'Billing Paused'
                : isCancelled
                ? 'Upgrade'
                : isPaid
                ? 'Change Plan'
                : 'Upgrade Plan'}
            </Button>

            {isDowngradeScheduled && (
              <Button
                variant="outline"
                size="md"
                onClick={handleCancelDowngrade}
                loading={cancellingDowngrade}
              >
                Cancel Scheduled Downgrade
              </Button>
            )}

            {isPaid && subscription && !isCancelled && !isPaused && subscription.status === 'ACTIVE' && (
              <Button
                variant="danger"
                size="md"
                onClick={() => setCancelConfirmOpen(true)}
                loading={cancelling}
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Payment Method & Auto-Pay ────────────────────────────── */}
      <PaymentMethodSettingsCard />

      {/* ─── Usage Quotas & Limits ────────────────────────────────── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <CardTitle>Usage & Resource Allocations</CardTitle>
            </div>
            <span className="text-xs text-text-muted">Resets on 1st of each month</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AI Requests */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-accent" /> AI Requests
                </span>
                <span className="font-mono text-text-secondary">
                  {usage.aiRequests} / {maxAI}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/40">
                <div
                  className={`h-full transition-all duration-300 ${
                    aiPct >= 90 ? 'bg-danger' : aiPct >= 70 ? 'bg-warning' : 'bg-accent'
                  }`}
                  style={{ width: `${aiPct}%` }}
                />
              </div>
            </div>

            {/* Projects */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-info" /> Active Projects
                </span>
                <span className="font-mono text-text-secondary">
                  {usage.projects} / {maxProjects}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/40">
                <div
                  className={`h-full transition-all duration-300 ${
                    projectPct >= 90 ? 'bg-danger' : projectPct >= 70 ? 'bg-warning' : 'bg-info'
                  }`}
                  style={{ width: `${projectPct}%` }}
                />
              </div>
            </div>

            {/* Habits */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-success" /> Habits Tracked
                </span>
                <span className="font-mono text-text-secondary">
                  {usage.habits} / {maxHabits}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/40">
                <div
                  className={`h-full transition-all duration-300 ${
                    habitPct >= 90 ? 'bg-danger' : habitPct >= 70 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${habitPct}%` }}
                />
              </div>
            </div>

            {/* Tasks */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-warning" /> Active Tasks
                </span>
                <span className="font-mono text-text-secondary">
                  {usage.tasks} / {maxTasks}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/40">
                <div
                  className={`h-full transition-all duration-300 ${
                    taskPct >= 90 ? 'bg-danger' : taskPct >= 70 ? 'bg-warning' : 'bg-warning'
                  }`}
                  style={{ width: `${taskPct}%` }}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-info" /> Notes
                </span>
                <span className="font-mono text-text-secondary">
                  {usage.notes} / {notesLimit === -1 ? '∞' : notesLimit}
                </span>
              </div>
              {notesLimit !== -1 && (
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/40">
                  <div
                    className={`h-full transition-all duration-300 ${
                      usage.notes >= notesLimit ? 'bg-danger' : 'bg-info'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((usage.notes / notesLimit) * 100))}%` }}
                  />
                </div>
              )}
            </div>

            {/* Journals */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-success" /> Journals
                </span>
                <span className="font-mono text-text-secondary">
                  {usage.journals} / {journalsLimit === -1 ? '∞' : journalsLimit}
                </span>
              </div>
              {journalsLimit !== -1 && (
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/40">
                  <div
                    className={`h-full transition-all duration-300 ${
                      usage.journals >= journalsLimit ? 'bg-danger' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((usage.journals / journalsLimit) * 100))}%` }}
                  />
                </div>
              )}
            </div>

            {/* Storage */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-warning" /> Storage
                </span>
                <span className="font-mono text-text-secondary">
                  {(usage.storageUsedBytes / (1024 * 1024)).toFixed(1)} MB /{' '}
                  {usage.storageLimitBytes === Infinity || usage.storageLimitBytes <= 0
                    ? '∞'
                    : `${(usage.storageLimitBytes / (1024 * 1024)).toFixed(0)} MB`}
                </span>
              </div>
              {usage.storageLimitBytes > 0 && usage.storageLimitBytes !== Infinity && (
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/40">
                  <div
                    className={`h-full transition-all duration-300 ${
                      usage.storageUsedBytes >= usage.storageLimitBytes ? 'bg-danger' : 'bg-warning'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((usage.storageUsedBytes / usage.storageLimitBytes) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Plan Comparison Action Matrix ────────────────────────── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-accent" />
              <CardTitle>Compare Available Plans</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUpgradeModalOpen(true)}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              Full Comparison & Checkout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Current plan status: Free is the default tier, not a selectable plan */}
          <div className="mb-4">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-semibold ${
                effectivePlan.planSlug === 'free'
                  ? 'bg-surface-raised border-border text-text-secondary'
                  : 'bg-accent-subtle/40 border-accent-border text-accent'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {effectivePlan.planSlug === 'free'
                ? 'You are on the Free plan — your default plan. Upgrade anytime to unlock more.'
                : `Current plan: ${effectivePlan.planName}`}
            </div>
          </div>

          {/* Monthly / Annual toggle */}
          <div className="flex justify-start mb-4">
            <div className="inline-flex items-center rounded-2xl bg-surface-raised border border-border p-1">
              {(['MONTH', 'YEAR'] as const).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    billingCycle === cycle
                      ? 'bg-accent text-text-onaccent shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {cycle === 'MONTH' ? 'Monthly' : 'Annual'}
                  {cycle === 'YEAR' && (
                    <span
                      className={`ml-1.5 text-[10px] font-extrabold uppercase ${
                        billingCycle === cycle ? 'text-text-onaccent/80' : 'text-success'
                      }`}
                    >
                      Save
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {comparePlans.map((p) => {
              const tier = baseTierOf(p.slug);
              const activeTier = baseTierOf(effectivePlan.planSlug);
              const isCurrent = effectivePlan.planSlug !== 'free' && tier === activeTier;

              const activePrice = subscription?.plan?.priceCents || 0;
              const startMs = subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).getTime() : 0;
              const endMs = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : 0;
              const totalDurationMs = Math.max(1, endMs - startMs);
              const remainingMs = Math.max(0, endMs - Date.now());
              const unusedRatio = Math.min(1, Math.max(0, remainingMs / totalDurationMs));
              const rawCredit = Math.round(activePrice * unusedRatio);
              const isUpgrade = Boolean(subscription?.status === 'ACTIVE' && activePrice > 0 && p.priceCents > activePrice);
              const isDowngrade = Boolean(subscription?.status === 'ACTIVE' && activePrice > 0 && p.priceCents < activePrice && !isCurrent);
              const creditApplied = isUpgrade ? Math.min(p.priceCents, rawCredit) : 0;
              const taxable = Math.max(0, p.priceCents - creditApplied);
              const totalWithGst = taxable + Math.round((taxable * (p.gstPercent ?? 18)) / 100);

              return (
                <PlanCard
                  key={p.id}
                  plan={p}
                  isCurrent={isCurrent}
                  isDowngrade={isDowngrade}
                  disabled={subscription?.status === 'PAUSED'}
                  disabledLabel="Billing Paused"
                  upgradeProration={
                    isUpgrade && creditApplied > 0
                      ? {
                          isUpgrade: true,
                          proratedCreditCents: creditApplied,
                          taxableCents: taxable,
                          totalCents: totalWithGst,
                          currentPlanName: subscription?.plan?.name,
                        }
                      : null
                  }
                  onSelect={() => setUpgradeModalOpen(true)}
                  onDowngrade={(plan) => setDowngradeTargetPlan(plan)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Invoices ─────────────────────────────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            <CardTitle>Invoices & PDF Receipts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`space-y-3 ${
              invoices.length > 5 ? 'max-h-[520px] overflow-y-auto pr-1 scroll-smooth' : ''
            }`}
          >
          {invoices.length === 0 ? (
            <div className="text-sm text-text-muted py-6 text-center">
              No invoices found yet. Paid receipts will appear here after checkout or renewal.
            </div>
          ) : (
            invoices.map((invoice) => {
              const planName = invoice.subscription?.plan?.name || 'Plan purchase';
              const viewUrl = invoice.pdfUrl;
              return (
                <div
                  key={invoice.id}
                  className="p-4 rounded-2xl border border-border bg-surface-raised flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-text-primary">{invoice.invoiceNumber}</p>
                      <Badge variant={invoice.status === 'PAID' ? 'success' : 'warning'} size="sm" dot>
                        {invoice.status}
                      </Badge>
                      {invoice.subscription?.autoRenew && (
                        <Badge variant="accent" size="sm">
                          Auto-pay
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {planName} · Issued {new Date(invoice.issuedAt).toLocaleDateString()} · Total{' '}
                      {formatINR(invoice.totalCents)}
                    </p>
                    <p className="text-xs text-text-muted">
                      Discount {formatINR(invoice.discountCents)} · Tax {formatINR(invoice.taxCents)}
                      {invoice.subscription?.currentPeriodEnd
                        ? ` · Period ends ${new Date(invoice.subscription.currentPeriodEnd).toLocaleDateString()}`
                        : ' · One-time receipt'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={async () => {
                        try {
                          await openInvoicePdf(invoice.id);
                        } catch (err: any) {
                          toast.error(err?.response?.data?.error?.message || 'Failed to open invoice PDF');
                        }
                      }}
                    >
                      View PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={async () => {
                        try {
                          await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
                        } catch (err: any) {
                          toast.error(err?.response?.data?.error?.message || 'Failed to download invoice PDF');
                        }
                      }}
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Billing History & Transactions ───────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-accent" />
            <CardTitle>Billing Transactions</CardTitle>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <div
            className={transactions.length > 5 ? 'max-h-[300px] overflow-y-auto pr-1 scroll-smooth' : ''}
          >
          <table className="w-full text-left text-xs border-collapse">
            <thead className={transactions.length > 5 ? 'sticky top-0 z-10' : ''}>
              <tr className="border-b border-border bg-surface-raised text-text-secondary uppercase font-bold text-[11px] tracking-wider">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Plan / Description</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                    No billing transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="px-5 py-3.5 text-text-muted font-mono">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-text-primary">
                      {tx.plan?.name || 'Subscription Upgrade'}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-accent">
                      {formatINR(tx.netAmountCents)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={tx.status === 'CAPTURED' ? 'success' : 'danger'}
                        size="sm"
                        dot
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-text-muted truncate max-w-[140px]">
                      {tx.providerPaymentId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </Card>

      {/* ─── Upgrade Modal ────────────────────────────────────────── */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onSelectPlan={(plan) => {
          setUpgradeModalOpen(false);
          choosePlanForCheckout(plan);
          navigate('/billing', {
            state: { preselectedPlanId: plan.id, source: 'upgrade_modal' },
          });
        }}
      />

      <ConfirmModal
        open={cancelConfirmOpen}
        title="Cancel subscription?"
        message={
          <>
            This will cancel your recurring subscription. You will keep access until the end of your current billing period.
          </>
        }
        confirmText="Yes, cancel"
        destructive
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancelSub}
        isLoading={cancelling}
      />

      {downgradeTargetPlan && (
        <DowngradeConfirmModal
          isOpen={Boolean(downgradeTargetPlan)}
          onClose={() => setDowngradeTargetPlan(null)}
          currentPlanName={effectivePlan.planName}
          targetPlan={downgradeTargetPlan}
          periodEndDate={effectivePlan.expiresAt}
          onConfirm={handleConfirmDowngrade}
        />
      )}
    </div>
  );
}
