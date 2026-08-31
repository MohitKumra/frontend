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
import { NUMERIC_FEATURES, BOOLEAN_FEATURES } from '../../features/plan/planCatalog';

interface PlanCardProps {
  plan: PlanDTO;
  isCurrent?: boolean;
  isPopular?: boolean;
  onSelect?: (plan: PlanDTO) => void;
}

const TIER_STYLES: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    soft: string;
    softDark: string;
    border: string;
  }
> = {
  free: { icon: Gift, accent: '#F59E0B', soft: '#FFFBEB', softDark: 'rgba(245, 158, 11, 0.16)', border: 'border-amber-200 dark:border-amber-500/40' },
  basic: { icon: Star, accent: '#7C6CF6', soft: '#F5F3FF', softDark: 'rgba(124, 108, 246, 0.16)', border: 'border-violet-200 dark:border-violet-500/40' },
  premium: { icon: Gem, accent: '#3B82F6', soft: '#EFF6FF', softDark: 'rgba(59, 130, 246, 0.16)', border: 'border-blue-200 dark:border-blue-500/40' },
  ultimate: { icon: Crown, accent: '#10B981', soft: '#ECFDF5', softDark: 'rgba(16, 185, 129, 0.16)', border: 'border-emerald-200 dark:border-emerald-500/40' },
};

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

function baseTierOf(slug: string): string {
  return (slug.endsWith('_yearly') ? slug.slice(0, -'_yearly'.length) : slug).toLowerCase();
}

function formatFeatureRow(key: string, value: number | boolean, defaultLabel: string): { on: boolean; label: string } {
  if (typeof value === 'boolean') {
    return { on: value, label: defaultLabel };
  }

  const isUnlimited = value === -1;
  const numStr = isUnlimited ? 'Unlimited' : `${value}`;

  switch (key) {
    case 'aiRequestsPerMonth':
      return { on: value !== 0, label: `${numStr} AI requests / mo` };
    case 'projects':
      return { on: value !== 0, label: `${numStr} active projects` };
    case 'habits':
      return { on: value !== 0, label: `${numStr} habit trackers` };
    case 'tasks':
      return { on: value !== 0, label: `${numStr} tasks` };
    case 'storageMb':
      return { on: value !== 0, label: `${numStr} MB storage` };
    case 'notes':
      return { on: value !== 0, label: `${numStr} notes` };
    case 'journals':
      return { on: value !== 0, label: `${numStr} journals` };
    default:
      return { on: value !== 0, label: `${numStr} ${defaultLabel}` };
  }
}

export function PlanCard({ plan: p, isCurrent = false, isPopular = false, onSelect }: PlanCardProps) {
  const isDark = useIsDarkMode();
  const tier = TIER_STYLES[baseTierOf(p.slug)] || TIER_STYLES.basic;
  const Icon = tier.icon;
  const priceDisplay = p.priceCents === 0 ? 'Free' : formatINR(p.priceCents);
  const intervalLabel = p.billingInterval === 'YEAR' ? '/ year' : '/ month';

  const rows: { on: boolean; label: string }[] = [
    ...NUMERIC_FEATURES.map((meta) => {
      const val = p.features[meta.key] ?? meta.default ?? 0;
      return formatFeatureRow(meta.key, typeof val === 'number' ? val : 0, meta.label);
    }),
    ...BOOLEAN_FEATURES.map((meta) => {
      const val = Boolean(p.features[meta.key]);
      return formatFeatureRow(meta.key, val, meta.label);
    }),
  ];

  return (
    <div
      className={`w-full flex flex-col rounded-2xl bg-white dark:bg-[#242d3f] overflow-hidden border transition-shadow ${
        isCurrent
          ? `${tier.border} shadow-sm`
          : isPopular
            ? 'border-slate-200 dark:border-slate-600 shadow-sm'
            : 'border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top identity strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: isPopular ? '#0F172A' : tier.accent }} />

      <div className="flex flex-col flex-1 p-6">
        {/* Icon badge + status */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: isDark ? tier.softDark : tier.soft, color: tier.accent }}
          >
            <Icon className="w-4.5 h-4.5" />
          </span>
          {isCurrent && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-white dark:bg-slate-700 dark:text-slate-100 whitespace-nowrap">
              Current Plan
            </span>
          )}
        </div>

        {/* Name + description */}
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-4 tracking-tight">{p.name}</h3>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug min-h-[36px]">
          {p.description || 'Elevate your daily habits and tasks.'}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-4">
          <span className="text-[32px] leading-none font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
            {priceDisplay}
          </span>
          {p.priceCents > 0 && <span className="text-[13px] text-slate-400 dark:text-slate-500">{intervalLabel}</span>}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 dark:bg-slate-700/60 mt-5 mb-4" />

        {/* Feature checklist */}
        <ul className="space-y-3 flex-1">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2.5 text-[13.5px]">
              {r.on ? (
                <Check className="w-4 h-4 shrink-0" style={{ color: tier.accent }} strokeWidth={2.5} />
              ) : (
                <Lock className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
              )}
              <span className={r.on ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                {r.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Action */}
        <button
          onClick={() => onSelect?.(p)}
          disabled={isCurrent}
          className={`mt-6 w-full h-12 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all ${
            isCurrent ? 'bg-slate-100 dark:bg-slate-800 dark:text-slate-500 text-slate-400 cursor-default' : 'text-white hover:brightness-105'
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