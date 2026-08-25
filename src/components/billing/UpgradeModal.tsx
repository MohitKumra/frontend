// frontend/src/components/billing/UpgradeModal.tsx
// Plan selection modal. When a user picks a plan, this component invokes
// `onSelectPlan(plan)` and the parent opens <CheckoutModal /> to handle
// coupon, bill summary, and Razorpay payment.

import React from 'react';
import { X, Check, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useUserPlan, type PlanDTO } from '../../features/billing/useUserPlan';
import { formatINR } from '../../utils/formatCurrency';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightFeature?: string;
  defaultPlanSlug?: string;
  /**
   * Called when the user picks a plan to upgrade to. The parent should close
   * this modal and open <CheckoutModal /> with the chosen plan to handle the
   * coupon + bill summary + Razorpay payment.
   */
  onSelectPlan?: (plan: PlanDTO) => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  highlightFeature,
  onSelectPlan,
}: UpgradeModalProps) {
  const { plans, effectivePlan } = useUserPlan();

  if (!isOpen) return null;

  // Find target plans, or fallback list if database is loading.
  const sortedPlans: PlanDTO[] = plans.length > 0
    ? plans
    : [
        {
          id: 'free_fallback',
          slug: 'free',
          name: 'Free',
          description: 'Essential task & habit tracking for individuals.',
          priceCents: 0,
          currency: 'INR',
          billingInterval: 'MONTH',
          sortOrder: 0,
          isActive: true,
          features: {
            aiRequestsPerMonth: 50,
            projects: 3,
            habits: 5,
            tasks: 100,
            storageMb: 100,
            voiceNotes: false,
            notionSync: false,
            advancedAnalytics: false,
            prioritySupport: false,
            teamMembers: 0,
          },
        },
        {
          id: 'basic_fallback',
          slug: 'basic',
          name: 'Basic',
          description: 'Enhanced productivity with Notion integration and higher limits.',
          priceCents: 49900,
          currency: 'INR',
          billingInterval: 'MONTH',
          sortOrder: 1,
          isActive: true,
          features: {
            aiRequestsPerMonth: 1000,
            projects: 10,
            habits: 20,
            tasks: 500,
            storageMb: 1000,
            voiceNotes: false,
            notionSync: true,
            advancedAnalytics: true,
            prioritySupport: false,
            teamMembers: 0,
          },
        },
        {
          id: 'premium_fallback',
          slug: 'premium',
          name: 'Premium',
          description: 'Power user workflows with AI coach, voice notes, and high limits.',
          priceCents: 99900,
          currency: 'INR',
          billingInterval: 'MONTH',
          sortOrder: 2,
          isActive: true,
          features: {
            aiRequestsPerMonth: 5000,
            projects: 50,
            habits: 100,
            tasks: 2500,
            storageMb: 5000,
            voiceNotes: true,
            notionSync: true,
            advancedAnalytics: true,
            prioritySupport: false,
            teamMembers: 0,
          },
        },
        {
          id: 'ultimate_fallback',
          slug: 'ultimate',
          name: 'Ultimate',
          description: 'Unlimited personal power with team collaboration & priority support.',
          priceCents: 199900,
          currency: 'INR',
          billingInterval: 'MONTH',
          sortOrder: 3,
          isActive: true,
          features: {
            aiRequestsPerMonth: 25000,
            projects: 500,
            habits: 500,
            tasks: 10000,
            storageMb: 25000,
            voiceNotes: true,
            notionSync: true,
            advancedAnalytics: true,
            prioritySupport: true,
            teamMembers: 5,
          },
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-raised transition-colors"
          aria-label="Close upgrade modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle border border-accent-border text-accent text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Your Productivity Superpowers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Choose the Perfect Plan for You
          </h2>
          <p className="text-sm text-text-muted">
            {highlightFeature ? (
              <span className="text-accent font-medium">
                {highlightFeature} requires an upgraded plan. Pick a plan to continue
                to checkout.
              </span>
            ) : (
              'Compare plans and scale your personal management workflow seamlessly. Cancel anytime.'
            )}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedPlans.map((p) => {
            const isCurrent = p.slug.toLowerCase() === effectivePlan.planSlug.toLowerCase();
            const isPopular = p.slug.toLowerCase() === 'premium';
            const priceDisplay = p.priceCents === 0 ? 'Free' : formatINR(p.priceCents);
            const intervalLabel = p.billingInterval === 'YEAR' ? '/year' : '/month';

            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 ${
                  isCurrent
                    ? 'border-accent bg-accent-subtle/30 ring-1 ring-accent'
                    : isPopular
                    ? 'border-accent-border bg-surface-raised shadow-lg ring-1 ring-accent-border/50'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-text-onaccent text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-text-primary">{p.name}</h3>
                      {isCurrent && (
                        <Badge variant="accent" size="sm">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2 min-h-[32px]">
                      {p.description || 'Elevate your daily habits and tasks.'}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="pt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                        {priceDisplay}
                      </span>
                      {p.priceCents > 0 && (
                        <span className="text-xs text-text-muted">{intervalLabel}</span>
                      )}
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2 text-xs border-t border-border/60 pt-4">
                    <li className="flex items-center gap-2 text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>
                        <strong>{p.features.aiRequestsPerMonth || 50}</strong> AI Requests/mo
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>
                        <strong>{p.features.projects || 3}</strong> Active Projects
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>
                        <strong>{p.features.habits || 5}</strong> Habit Trackers
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>
                        <strong>{p.features.tasks || 100}</strong> Tasks
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {p.features.notionSync ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="text-text-secondary font-medium">Notion Workspace Sync</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-text-muted">Notion Sync</span>
                        </>
                      )}
                    </li>
                    <li className="flex items-center gap-2">
                      {p.features.voiceNotes ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="text-text-secondary font-medium">Focus Voice & Audio</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-text-muted">Focus Voice Notes</span>
                        </>
                      )}
                    </li>
                    <li className="flex items-center gap-2">
                      {p.features.advancedAnalytics ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="text-text-secondary font-medium">Advanced Analytics</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-text-muted">Advanced Analytics</span>
                        </>
                      )}
                    </li>
                  </ul>
                </div>

                {/* Action Button */}
                <div className="pt-5 mt-4 border-t border-border/60">
                  {isCurrent ? (
                    <Button variant="secondary" size="md" className="w-full" disabled>
                      Active Plan
                    </Button>
                  ) : (
                    <Button
                      variant={isPopular ? 'primary' : 'outline'}
                      size="md"
                      className="w-full"
                      onClick={() => onSelectPlan?.(p)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {p.priceCents === 0
                        ? `Continue with ${p.name}`
                        : `Choose ${p.name}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
