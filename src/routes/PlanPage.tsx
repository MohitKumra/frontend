// frontend/src/routes/PlanPage.tsx
// User-facing Plans & Pricing page. Shows the same rich plan cards used in the
// Upgrade modal, with a Monthly/Annual toggle. Free is surfaced as a default-tier
// status banner (not a selectable card). Selecting a paid card opens the checkout
// flow (coupon → payment mode → Razorpay).

import React, { useState } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useUserPlan, type PlanDTO } from '../features/billing/useUserPlan';
import { PlanCard } from '../components/billing/PlanCard';
import { CheckoutModal } from '../components/billing/CheckoutModal';

function baseTierOf(slug: string): string {
  return slug.endsWith('_yearly') ? slug.slice(0, -'_yearly'.length) : slug;
}

export function PlanPage() {
  const { plans, effectivePlan } = useUserPlan();
  const [billingCycle, setBillingCycle] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [checkoutPlan, setCheckoutPlan] = useState<PlanDTO | null>(null);

  const paidPlans = plans.filter((p) => p.priceCents > 0 && p.billingInterval === billingCycle);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle border border-accent-border text-accent text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Unlock Your Productivity Superpowers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          Plans &amp; Pricing
        </h1>
        <p className="text-sm text-text-muted">
          Compare plans and scale your personal management workflow seamlessly. Cancel anytime.
        </p>
      </div>

      {/* Current plan status: Free is the default tier, not a selectable plan */}
      <div className="flex justify-center">
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-semibold ${
            effectivePlan.planSlug === 'free'
              ? 'bg-surface-raised border-border text-text-secondary'
              : 'bg-accent-subtle/40 border-accent-border text-accent'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {effectivePlan.planSlug === 'free'
            ? 'You are on the Free plan — your default plan. Upgrade anytime to unlock more.'
            : (
              <>
                Current plan: <span className="font-bold">{effectivePlan.planName}</span>
                {effectivePlan.expiresAt && (
                  <span className="text-text-muted font-normal">
                    · expires {new Date(effectivePlan.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </>
            )}
        </div>
      </div>

      {/* Monthly / Annual toggle */}
      <div className="flex justify-center">
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

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paidPlans.map((p) => {
          const tier = baseTierOf(p.slug);
          const activeTier = baseTierOf(effectivePlan.planSlug);
          const isCurrent = effectivePlan.planSlug !== 'free' && tier === activeTier;
          const isPopular = tier === 'premium';
          return (
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={isCurrent}
              isPopular={isPopular}
              onSelect={(plan) => setCheckoutPlan(plan)}
            />
          );
        })}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={!!checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        plan={checkoutPlan}
      />

      <p className="text-center text-xs text-text-muted">
        Prices are in INR and shown for the selected {billingCycle === 'YEAR' ? 'annual' : 'monthly'}{' '}
        billing cycle. Cancel or switch anytime.
      </p>
    </div>
  );
}