// frontend/src/components/billing/UpgradeModal.tsx
// Plan selection modal. When a user picks a plan, this component routes them to
// the dedicated Billing page with the chosen plan prefilled (coupon, bill summary,
// and Razorpay payment all happen on that page).

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, ShieldCheck, Wand2 } from 'lucide-react';
import { useUserPlan, type PlanDTO } from '../../features/billing/useUserPlan';
import { useUpgradeModalStore } from '../../store/upgradeModalStore';
import { useCustomPlanModalStore } from '../../store/customPlanModalStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { PlanCard } from './PlanCard';
import { APP_NAME, DEFAULT_CURRENCY, GST_PERCENT } from '../../config/brand';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightFeature?: string;
  defaultPlanSlug?: string;
  /** Optional plain-text reason (e.g. "You've reached your limit..."). Shown above the plan grid. */
  message?: string;
  /**
   * Called when the user picks a plan to upgrade to. The parent should close
   * this modal and route the user to the Billing page (handles coupon + bill
   * summary + Razorpay) with the chosen plan prefilled.
   */
  onSelectPlan?: (plan: PlanDTO) => void;
}

function useIsDarkMode() {
  const [isDark, setIsDark] = React.useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function UpgradeModal({
  isOpen,
  onClose,
  highlightFeature,
  defaultPlanSlug,
  message,
  onSelectPlan,
}: UpgradeModalProps) {
  const { plans, effectivePlan, subscription } = useUserPlan();

  // Monthly / Annual billing toggle. Plans are DB-backed rows; each paid tier
  // has a MONTH and a YEAR row. The toggle only filters which rows are shown,
  // and the chosen row (its priceCents + billingInterval) is the source of
  // truth sent to checkout — no front-end price math.
  const [billingCycle, setBillingCycle] = useState<'MONTH' | 'YEAR' | 'CUSTOM'>('MONTH');
  const isDark = useIsDarkMode();
  // Selecting a plan closes this modal and routes the user to the dedicated
  // Billing page (which owns coupon + bill summary + Razorpay checkout), with the
  // chosen plan prefilled via useUpgradeModalStore.pendingPlan.
  const navigate = useNavigate();
  const choosePlanForCheckout = useUpgradeModalStore((s) => s.choosePlanForCheckout);
  const openCustomPlan = useCustomPlanModalStore((s) => s.openCustomPlan);
  const isMobile = useMediaQuery('(max-width: 640px)');

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
        <div className="relative w-full max-w-sm bg-white dark:bg-[#1a2335] border border-slate-200 dark:border-[#2d3548] rounded-3xl p-6 shadow-2xl space-y-4 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {highlightFeature ? `${highlightFeature} is a Pro Feature` : 'Pro Feature'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This capability is included with upgraded {APP_NAME} plans.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 text-left border border-slate-100 dark:border-slate-700/60 space-y-2">
            <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Pro includes
            </p>
            <ul className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-indigo-500 font-bold">✓</span> Unlimited tasks & projects
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-500 font-bold">✓</span> Advanced AI Coach & insights
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-500 font-bold">✓</span> Habit streaks & analytics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-500 font-bold">✓</span> 5GB+ cloud storage
              </li>
            </ul>
          </div>

          <div className="pt-1 flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                navigate('/plans');
              }}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              View Plan Details
            </button>
            <button
              onClick={onClose}
              className="w-full h-9 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectPlan = (plan: PlanDTO) => {
    choosePlanForCheckout(plan);

    // Always route to the dedicated billing page so the old floating checkout
    // modal cannot remain active. If a page-level callback also handles routing,
    // we let it take over; otherwise we navigate here with the selected plan in
    // route state for a predictable prefill on the billing screen.
    if (onSelectPlan) {
      onSelectPlan(plan);
      return;
    }

    navigate('/billing', {
      state: { preselectedPlanId: plan.id, source: 'upgrade_modal' },
    });
  };

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
          currency: DEFAULT_CURRENCY,
          gstPercent: GST_PERCENT,
          billingInterval: 'MONTH',
          sortOrder: 0,
          isActive: true,
          features: {
            aiRequestsPerMonth: 50,
            projects: 3,
            habits: 5,
            tasks: 100,
            storageMb: 100,
            notes: 10,
            journals: 5,
            aiCoach: false,
            goals: false,
            focusAdvanced: false,
            notionSync: false,
            voiceNotes: false,
            calendarSync: false,
          },
        },
        {
          id: 'basic_fallback',
          slug: 'basic',
          name: 'Basic',
          description: 'For individuals seeking enhanced focus & analytics',
          priceCents: 49900,
          currency: DEFAULT_CURRENCY,
          gstPercent: GST_PERCENT,
          billingInterval: 'MONTH',
          sortOrder: 1,
          isActive: true,
          features: {
            aiRequestsPerMonth: 1000,
            projects: 10,
            habits: 20,
            tasks: 500,
            storageMb: 1000,
            notes: -1,
            journals: -1,
            aiCoach: true,
            goals: true,
            focusAdvanced: true,
            notionSync: true,
            voiceNotes: false,
            calendarSync: false,
          },
        },
        {
          id: 'premium_fallback',
          slug: 'premium',
          name: 'Premium',
          description: 'Complete power user productivity system',
          priceCents: 99900,
          currency: DEFAULT_CURRENCY,
          gstPercent: GST_PERCENT,
          billingInterval: 'MONTH',
          sortOrder: 2,
          isActive: true,
          features: {
            aiRequestsPerMonth: 5000,
            projects: 50,
            habits: 100,
            tasks: 2500,
            storageMb: 5000,
            notes: -1,
            journals: -1,
            aiCoach: true,
            goals: true,
            focusAdvanced: true,
            notionSync: true,
            voiceNotes: true,
            calendarSync: true,
          },
        },
        {
          id: 'ultimate_fallback',
          slug: 'ultimate',
          name: 'Ultimate',
          description: 'Unlimited AI capabilities and maximum limits',
          priceCents: 199900,
          currency: DEFAULT_CURRENCY,
          gstPercent: GST_PERCENT,
          billingInterval: 'MONTH',
          sortOrder: 3,
          isActive: true,
          features: {
            aiRequestsPerMonth: 25000,
            projects: 500,
            habits: 500,
            tasks: 10000,
            storageMb: 25000,
            notes: -1,
            journals: -1,
            aiCoach: true,
            goals: true,
            focusAdvanced: true,
            notionSync: true,
            voiceNotes: true,
            calendarSync: true,
          },
        },
      ];

  // Base tier from a plan slug: strips the "_yearly" suffix so monthly and
  // annual rows of the same tier group together (e.g. "premium" & "premium_yearly").
  const baseTierOf = (slug: string) => (slug.endsWith('_yearly') ? slug.slice(0, -'_yearly'.length) : slug);

  // Show only paid plans matching the selected billing cycle. The Free plan is
  // the default tier shown when no plan has been purchased — it is surfaced as a
  // status banner, never as a "choose a plan" card in this upgrade flow.
  const visiblePlans = sortedPlans.filter(
    (p) => billingCycle !== 'CUSTOM' && p.priceCents > 0 && p.billingInterval === billingCycle
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-[1060px] bg-white dark:bg-[#1a2335] border border-slate-200 dark:border-[#2d3548] rounded-3xl sm:rounded-[32px] p-5 sm:p-7 md:p-10 shadow-2xl space-y-5 sm:space-y-7 my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close upgrade modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2 sm:space-y-2.5 pt-2 sm:pt-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 text-[11px] sm:text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Your Productivity Superpowers</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-[26px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Choose the Perfect Plan for You
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {highlightFeature ? (
              <span className="text-indigo-600 dark:text-indigo-300 font-medium">
                {highlightFeature} requires an upgraded plan. Pick a plan to continue
                to checkout.
              </span>
            ) : (
              'Compare plans and scale your personal management workflow seamlessly. Cancel anytime.'
            )}
          </p>
          {message && (
            <div
              className="mx-auto max-w-md rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200"
              style={{
                background: isDark ? 'rgba(99, 102, 241, 0.14)' : 'color-mix(in srgb, #6366F1 8%, white)',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid #C7D2FE',
              }}
            >
              ⚠️ {message}
            </div>
          )}
        </div>

        {/* Current plan status: Free is the default tier, not a selectable plan */}
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border text-[11px] sm:text-xs font-semibold text-center ${
              effectivePlan.planSlug === 'free'
                ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                : 'bg-white dark:bg-[#242d3f] border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {effectivePlan.planSlug === 'free'
                ? 'You are on the Free plan — your default plan. Upgrade anytime to unlock more.'
                : `Current plan: ${effectivePlan.planName}`}
            </span>
          </div>
        </div>

        {/* Monthly / Annual / Custom toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1">
            {(['MONTH', 'YEAR', 'CUSTOM'] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-colors ${
                  billingCycle === cycle
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {cycle === 'MONTH' ? 'Monthly' : cycle === 'YEAR' ? 'Annual' : 'Custom'}
                {cycle === 'YEAR' && (
                  <span
                    className={`ml-1.5 text-[10px] font-extrabold uppercase ${
                      billingCycle === cycle ? 'text-white/80' : 'text-emerald-500'
                    }`}
                  >
                    Save
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {billingCycle === 'CUSTOM' ? (
          /* Custom panel — full card, centered, when the Custom tab is selected */
          <div className="w-full max-w-md mx-auto flex flex-col rounded-2xl bg-white dark:bg-[#242d3f] overflow-hidden border border-dashed border-indigo-300 dark:border-indigo-500/40 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-1.5 w-full bg-transparent" />
            <div className="flex flex-col items-center text-center p-8">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 bg-indigo-50 dark:bg-indigo-500/16 text-indigo-500">
                <Wand2 className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-4 tracking-tight">Custom</h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                Build a plan around exactly what you need.
              </p>
              <div className="h-px bg-slate-100 dark:bg-slate-700/60 my-5 w-full" />
              <ul className="space-y-3 flex-1 w-full">
                {['Higher limits', 'Additional features', 'Guidance from our team'].map((label) => (
                  <li key={label} className="flex items-center justify-center gap-2.5 text-[13.5px] text-slate-700 dark:text-slate-200 font-medium">
                    <Sparkles className="w-4 h-4 shrink-0 text-indigo-500" strokeWidth={2.5} />
                    {label}
                  </li>
                ))}
              </ul>
              <button
                onClick={openCustomPlan}
                className="mt-6 w-full h-12 rounded-2xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-all hover:brightness-105"
                style={{ backgroundColor: '#6366F1' }}
              >
                Build your custom plan
              </button>
            </div>
          </div>
        ) : (
          /* Plans Grid — responsive stacked on mobile, 3 columns on desktop */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
            {visiblePlans.map((p) => {
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
                  disabled={subscription?.status === 'PAUSED'}
                  disabledLabel="Billing Paused"
                  onSelect={handleSelectPlan}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}