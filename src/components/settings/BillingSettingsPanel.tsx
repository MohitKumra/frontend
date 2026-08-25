// frontend/src/components/settings/BillingSettingsPanel.tsx
import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock,
  ArrowUpRight,
  Shield,
  Layers,
  Repeat,
  CheckSquare,
  Bot,
  AlertCircle,
  Clock,
  ChevronRight,
  RefreshCw,

} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { useUserPlan, type PlanDTO } from '../../features/billing/useUserPlan';
import { formatINR } from '../../utils/formatCurrency';
import { UpgradeModal } from '../billing/UpgradeModal';
import { CheckoutModal } from '../billing/CheckoutModal';
import toast from 'react-hot-toast';

export function BillingSettingsPanel() {
  const {
    effectivePlan,
    subscription,
    usage,
    transactions,
    plans,
    isLoading,
    cancelSubscription,
    refetch,
    isError,

  } = useUserPlan();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanDTO | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancelSub() {
    if (!confirm('Are you sure you want to cancel your recurring subscription? You will still retain access until the end of your current billing period.')) {
      return;
    }
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

  // Calculate usage percentages
  const maxProjects = effectivePlan.features.projects || 3;
  const maxHabits = effectivePlan.features.habits || 5;
  const maxTasks = effectivePlan.features.tasks || 100;
  const maxAI = effectivePlan.features.aiRequestsPerMonth || 50;

  const projectPct = Math.min(100, Math.round((usage.projects / maxProjects) * 100));
  const habitPct = Math.min(100, Math.round((usage.habits / maxHabits) * 100));
  const taskPct = Math.min(100, Math.round((usage.tasks / maxTasks) * 100));
  const aiPct = Math.min(100, Math.round((usage.aiRequests / maxAI) * 100));

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
                    {effectivePlan.planName} Plan
                  </h3>
                  <Badge
                    variant={
                      effectivePlan.status === 'ACTIVE'
                        ? 'success'
                        : effectivePlan.status === 'FREE'
                        ? 'accent'
                        : 'warning'
                    }
                    size="sm"
                    dot
                  >
                    {effectivePlan.status}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {effectivePlan.source === 'ADMIN_OVERRIDE'
                    ? 'Active VIP administrative access override'
                    : isPaid
                    ? 'Active monthly subscription with auto-renewal'
                    : 'Default free workspace quota'}
                </p>
              </div>
            </div>

            {effectivePlan.expiresAt && (
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span>
                  Current period active until{' '}
                  <strong>{new Date(effectivePlan.expiresAt).toLocaleDateString()}</strong>
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
            >
              {isPaid ? 'Change Plan' : 'Upgrade Plan'}
            </Button>

            {isPaid && subscription && (
              <Button
                variant="danger"
                size="md"
                onClick={handleCancelSub}
                loading={cancelling}
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </Card>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {plans.map((p) => {
              const isCurrent = p.slug.toLowerCase() === effectivePlan.planSlug.toLowerCase();
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-colors ${
                    isCurrent
                      ? 'border-accent bg-accent-subtle/20'
                      : 'border-border bg-surface hover:border-border-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-text-primary">{p.name}</h4>
                      {isCurrent && <Badge variant="accent" size="sm">Active</Badge>}
                    </div>
                    <p className="text-base font-extrabold text-accent mt-1">
                      {p.priceCents === 0 ? 'Free' : `${formatINR(p.priceCents)}/mo`}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1 line-clamp-2">
                      {p.description || 'Access powerful productivity features.'}
                    </p>
                  </div>

                  <Button
                    variant={isCurrent ? 'secondary' : 'outline'}
                    size="sm"
                    className="w-full"
                    disabled={isCurrent}
                    onClick={() => setUpgradeModalOpen(true)}
                  >
                    {isCurrent ? 'Current Plan' : 'Select Plan'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Billing History & Invoices ───────────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-accent" />
            <CardTitle>Billing History & Receipts</CardTitle>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60 text-text-secondary uppercase font-bold text-[11px] tracking-wider">
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
      </Card>

      {/* ─── Upgrade Modal ────────────────────────────────────────── */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onSelectPlan={(plan) => {
          setUpgradeModalOpen(false);
          setCheckoutPlan(plan);
        }}
      />

      {/* ─── Checkout Modal (full review + Razorpay) ────────────── */}
      <CheckoutModal
        isOpen={!!checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        plan={checkoutPlan}
        onBack={() => {
          setCheckoutPlan(null);
          setUpgradeModalOpen(true);
        }}
      />
    </div>
  );
}
