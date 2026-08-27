// frontend/src/components/billing/PlanCard.tsx
// Reusable, rich plan card used across the Upgrade modal, Settings → Billing,
// and the user-facing Plans/Pricing page. Single source of truth so every
// surface renders identical plan cards.
//
// Sizing/spacing below is matched directly to the approved reference mock:
// card ~314px wide, ~545px tall, 24px internal padding, 6px top color strip,
// 40px circular tier icon, 32px price, plain check/lock icons (no tinted
// circle backgrounds) at 16px with 12px row gaps, 48px full-width button.

import React from 'react';
import { Check, Lock, ArrowRight, Star, Gem, Crown, Gift } from 'lucide-react';
import type { PlanDTO } from '../../features/billing/useUserPlan';
import { formatINR } from '../../utils/formatCurrency';

interface PlanCardProps {
  plan: PlanDTO;
  isCurrent?: boolean;
  isPopular?: boolean;
  onSelect?: (plan: PlanDTO) => void;
}

const TIER_STYLES: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; accent: string; soft: string; border: string }
> = {
  free: { icon: Gift, accent: '#F59E0B', soft: '#FFFBEB', border: 'border-amber-200' },
  basic: { icon: Star, accent: '#7C6CF6', soft: '#F5F3FF', border: 'border-violet-200' },
  premium: { icon: Gem, accent: '#3B82F6', soft: '#EFF6FF', border: 'border-blue-200' },
  ultimate: { icon: Crown, accent: '#10B981', soft: '#ECFDF5', border: 'border-emerald-200' },
};

function baseTierOf(slug: string): string {
  return (slug.endsWith('_yearly') ? slug.slice(0, -'_yearly'.length) : slug).toLowerCase();
}

export function PlanCard({ plan: p, isCurrent = false, isPopular = false, onSelect }: PlanCardProps) {
  const tier = TIER_STYLES[baseTierOf(p.slug)] || TIER_STYLES.basic;
  const Icon = tier.icon;
  const priceDisplay = p.priceCents === 0 ? 'Free' : formatINR(p.priceCents);
  const intervalLabel = p.billingInterval === 'YEAR' ? '/ year' : '/ month';

  const rows: { on: boolean; label: string }[] = [
    { on: true, label: `${p.features.aiRequestsPerMonth ?? 50} AI requests / mo` },
    { on: true, label: `${p.features.projects ?? 3} active projects` },
    { on: true, label: `${p.features.habits ?? 5} habit trackers` },
    { on: true, label: `${p.features.tasks ?? 100} tasks` },
    { on: !!p.features.notionSync, label: 'Notion workspace sync' },
    { on: !!p.features.focusAdvanced, label: 'Advanced focus (custom timer + task linking)' },
  ];

  return (
    <div
      className={`w-full flex flex-col rounded-2xl bg-white overflow-hidden border transition-shadow ${
        isCurrent ? `${tier.border} shadow-sm` : isPopular ? 'border-slate-200 shadow-sm' : 'border-slate-200 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top identity strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: isPopular ? '#0F172A' : tier.accent }} />

      <div className="flex flex-col flex-1 p-6">
        {/* Icon badge + status */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: tier.soft, color: tier.accent }}
          >
            <Icon className="w-4.5 h-4.5" />
          </span>
          {isCurrent && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-white whitespace-nowrap">
              Current Plan
            </span>
          )}
        </div>

        {/* Name + description */}
        <h3 className="text-lg font-extrabold text-slate-900 mt-4 tracking-tight">{p.name}</h3>
        <p className="text-[13px] text-slate-500 mt-1.5 leading-snug min-h-[36px]">
          {p.description || 'Elevate your daily habits and tasks.'}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-4">
          <span className="text-[32px] leading-none font-extrabold text-slate-900 tabular-nums">
            {priceDisplay}
          </span>
          {p.priceCents > 0 && <span className="text-[13px] text-slate-400">{intervalLabel}</span>}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 mt-5 mb-4" />

        {/* Feature checklist */}
        <ul className="space-y-3 flex-1">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2.5 text-[13.5px]">
              {r.on ? (
                <Check className="w-4 h-4 shrink-0" style={{ color: tier.accent }} strokeWidth={2.5} />
              ) : (
                <Lock className="w-4 h-4 shrink-0 text-slate-300" />
              )}
              <span className={r.on ? 'text-slate-700 font-medium' : 'text-slate-400'}>{r.label}</span>
            </li>
          ))}
        </ul>

        {/* Action */}
        <button
          onClick={() => onSelect?.(p)}
          disabled={isCurrent}
          className={`mt-6 w-full h-12 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all ${
            isCurrent ? 'bg-slate-100 text-slate-400 cursor-default' : 'text-white hover:brightness-105'
          }`}
          style={!isCurrent ? { backgroundColor: tier.accent } : undefined}
        >
          {isCurrent ? 'Active plan' : p.priceCents === 0 ? `Continue with ${p.name}` : `Choose ${p.name}`}
          {!isCurrent && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}