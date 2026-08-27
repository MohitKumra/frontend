import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Gauge, Sparkles, Zap, Lock } from 'lucide-react';
import { Card } from '../ui/Card';
import { UpgradeModal } from '../billing/UpgradeModal';
import { useUserPlan } from '../../features/billing/useUserPlan';
import type { AIPreferenceDTO } from '../../types';

type TokenLevel = 'low' | 'medium' | 'high' | 'very-high';

interface AIFeatureDef {
  key: keyof AIPreferenceDTO;
  title: string;
  description: string;
  tokenLevel: TokenLevel;
}

const REFRESH_OPTIONS = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 180, label: 'Every 3 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Once a day' },
];

const AI_FEATURES: AIFeatureDef[] = [
  {
    key: 'dailyBriefEnabled',
    title: 'Daily Brief',
    description: 'AI greeting, priorities and focus tip for your day.',
    tokenLevel: 'high',
  },
  {
    key: 'journalWeeklyEnabled',
    title: 'Weekly Journal Summary',
    description: 'Analyzes every journal entry from the past week into themes.',
    tokenLevel: 'very-high',
  },
  {
    key: 'insightsEnabled',
    title: 'Smart Insights',
    description: 'Data-driven insights about your productivity on the dashboard.',
    tokenLevel: 'medium',
  },
  {
    key: 'coachEnabled',
    title: 'AI Coach',
    description: 'Personal motivation and coaching messages.',
    tokenLevel: 'medium',
  },
  {
    key: 'journalAnalysisEnabled',
    title: 'Entry Analysis',
    description: 'Mood, themes and reflection prompts for each journal entry.',
    tokenLevel: 'medium',
  },
  {
    key: 'goalSummaryEnabled',
    title: 'Goal AI Summary',
    description: 'Generated summary when creating goal workspaces.',
    tokenLevel: 'medium',
  },
  {
    key: 'taskParserEnabled',
    title: 'Natural Language Task Parser',
    description: 'Turn plain text into structured tasks with AI.',
    tokenLevel: 'low',
  },
  {
    key: 'goalPlannerEnabled',
    title: 'Goal Planner',
    description: 'Full AI workspace generation from a single prompt.',
    tokenLevel: 'very-high',
  },
];

const TOKEN_BADGE: Record<TokenLevel, { label: string; color: string; dots: number }> = {
  low: { label: 'Low', color: '#22c55e', dots: 1 },
  medium: { label: 'Medium', color: '#eab308', dots: 2 },
  high: { label: 'High', color: '#f97316', dots: 3 },
  'very-high': { label: 'Max', color: '#ef4444', dots: 4 },
};

// ─── shared primitives copied from SettingsPage (kept local so the panel
//     is self-contained and can be moved without dragging SettingsPage with it)

function Badge3D({
  icon,
  size = 44,
  colorVar = '--color-accent',
  rotation = 8,
  className,
}: {
  icon: ReactNode;
  size?: number;
  colorVar?: string;
  rotation?: number;
  className?: string;
}) {
  const isAccent = colorVar === '--color-accent';
  return (
    <div
      className={['relative shrink-0', className].filter(Boolean).join(' ')}
      style={className ? undefined : { width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-[30%]"
        style={{
          background: `color-mix(in srgb, var(${colorVar}) 22%, var(--color-surface))`,
          transform: `rotate(-${rotation}deg)`,
        }}
      />
      <div
        className="absolute inset-0 rounded-[30%] flex items-center justify-center text-white"
        style={{
          background: isAccent
            ? 'var(--gradient-accent)'
            : `linear-gradient(135deg, var(${colorVar}), color-mix(in srgb, var(${colorVar}) 55%, white))`,
          transform: `rotate(${rotation / 2}deg)`,
          boxShadow: `0 8px 18px color-mix(in srgb, var(${colorVar}) 35%, transparent)`,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  code,
  colorVar = '--color-accent',
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  code?: string;
  colorVar?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <Badge3D icon={icon} size={44} colorVar={colorVar} rotation={8} />
      <div className="min-w-0 flex-1">
        {code && (
          <div
            className="text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5"
            style={{ color: `var(${colorVar})` }}
          >
            {code}
          </div>
        )}
        <h2 className="text-sm sm:text-base font-extrabold text-text-primary">{title}</h2>
        <p className="text-xs text-text-muted mt-1 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

function Toggle({ checked, onToggle, disabled = false }: { checked: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="relative inline-flex h-6 w-11 sm:h-7 sm:w-12 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: checked ? 'var(--gradient-accent)' : 'var(--color-border-subtle)',
        borderColor: checked ? 'transparent' : 'var(--color-border)',
      }}
      aria-pressed={checked}
    >
      <span
        className="inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

function TokenBadge({ level }: { level: TokenLevel }) {
  const badge = TOKEN_BADGE[level];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: `color-mix(in srgb, ${badge.color} 13%, transparent)`,
        color: badge.color,
        border: `1px solid color-mix(in srgb, ${badge.color} 22%, transparent)`,
      }}
    >
      <Zap size={9} />
      {badge.label}
      <span className="flex items-center gap-0.5 ml-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full"
            style={{
              background: i < badge.dots ? badge.color : 'color-mix(in srgb, var(--color-border) 60%, transparent)',
            }}
          />
        ))}
      </span>
    </span>
  );
}

export function AISettingsPanel({
  preferences,
  onChange,
}: {
  preferences: AIPreferenceDTO | undefined;
  onChange: (next: AIPreferenceDTO) => void;
}) {
  const [draft, setDraft] = useState<AIPreferenceDTO | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const ai = draft ?? preferences;
  const { isFeatureLocked, effectivePlan } = useUserPlan();
  const aiQuota = effectivePlan.features?.aiRequestsPerMonth;
  const aiLocked = isFeatureLocked('aiCoach') || aiQuota === 0;

  useEffect(() => {
    setDraft(null);
  }, [preferences]);

  if (!ai) return null;

  const enabledCount = AI_FEATURES.filter((f) => Boolean(ai[f.key as keyof AIPreferenceDTO])).length;
  const totalCount = AI_FEATURES.length;

  const update = (patch: Partial<AIPreferenceDTO>) => {
    // AI is a paid feature: if the plan doesn't grant AI (locked or 0 quota),
    // never change the value — just open the upgrade modal.
    if (aiLocked) {
      setUpgradeOpen(true);
      return;
    }
    const merged = { ...ai, ...patch };
    setDraft(merged);
    onChange(merged);
  };

  const currentRefreshLabel = REFRESH_OPTIONS.find((o) => o.value === ai.summaryRefreshMinutes)?.label ?? 'Custom';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Section header — same pattern as MOD.01 / MOD.02 / MOD.03 / MOD.04 ── */}
      <Card className="p-4 sm:p-5 lg:p-6" variant="default">
        <SectionHeader
          icon={<Sparkles size={20} />}
          title="AI &amp; Tokens"
          subtitle="Choose which AI features are active. Each toggle saves immediately and stops token use the moment it's off."
          code="MOD.05 — AI &amp; TOKENS"
          colorVar="--color-accent"
        />

        {/* Token summary strip — mirrors the StatChip row on the hero */}
        <div className="mt-4 sm:mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            {
              label: 'Features on',
              value: `${enabledCount}/${totalCount}`,
              colorVar: '--color-warning',
              icon: <Sparkles size={12} />,
            },
            {
              label: 'Max-cost on',
              value: `${AI_FEATURES.filter((f) => f.tokenLevel === 'very-high' && Boolean(ai[f.key])).length}`,
              colorVar: '--color-danger',
              icon: <Zap size={12} />,
            },
            {
              label: 'Low-cost on',
              value: `${AI_FEATURES.filter((f) => f.tokenLevel === 'low' && Boolean(ai[f.key])).length}`,
              colorVar: '--color-success',
              icon: <CheckCircle2 size={12} />,
            },
            {
              label: 'Refresh rate',
              value: currentRefreshLabel.replace('Every ', '').replace('Once a day', 'Daily'),
              colorVar: '--color-info',
              icon: <Gauge size={12} />,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 rounded-xl border px-3 py-2 min-w-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: `var(${s.colorVar})`,
                  boxShadow: `0 0 5px var(${s.colorVar})`,
                }}
              />
              <div className="min-w-0">
                <div
                  className="text-[9px] font-mono uppercase tracking-wider leading-none"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {s.label}
                </div>
                <div className="text-xs font-bold mt-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Token consumption ── */}
      <Card className="p-4 sm:p-5" variant="default">
        <div className="flex items-start gap-2.5 sm:gap-3 mb-4">
          <Badge3D icon={<Zap size={16} />} size={36} colorVar="--color-success" rotation={7} />
          <div className="min-w-0 flex-1">
            <div
              className="text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--color-success)' }}
            >
              MOD.05b — CONSUMPTION
            </div>
            <p className="text-sm font-extrabold text-text-primary">Token usage</p>
            <p className="text-xs text-text-muted mt-0.5 leading-snug">
              Tokens consumed by AI features across all time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Today', value: ai.tokensToday ?? 0, colorVar: '--color-info', sub: 'tokens' },
            { label: 'This week', value: ai.tokensThisWeek ?? 0, colorVar: '--color-warning', sub: 'tokens' },
            { label: 'This month', value: ai.tokensThisMonth ?? 0, colorVar: '--color-danger', sub: 'tokens' },
            { label: 'Total', value: ai.tokensTotal ?? 0, colorVar: '--color-success', sub: 'tokens' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 rounded-xl border px-3 py-2 min-w-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: `var(${s.colorVar})`,
                  boxShadow: `0 0 5px var(${s.colorVar})`,
                }}
              />
              <div className="min-w-0">
                <div
                  className="text-[9px] font-mono uppercase tracking-wider leading-none"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {s.label}
                </div>
                <div className="text-xs font-bold mt-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {Number(s.value ?? 0).toLocaleString()}{' '}
                  <span className="font-normal text-[10px] text-text-muted">{s.sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
          >
            <CheckCircle2 size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {Number(ai.aiCallsTotal ?? 0).toLocaleString()} AI calls
            </span>
          </div>
          {ai.tokenUsageUpdatedAt && (
            <span className="text-[10px] text-text-muted">
              Last used {new Date(ai.tokenUsageUpdatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </Card>

      {/* ── Refresh timer ── */}
      <Card className="p-4 sm:p-5" variant="default">
        <div className="flex items-start gap-2.5 sm:gap-3 mb-4">
          <Badge3D icon={<Gauge size={16} />} size={36} colorVar="--color-info" rotation={7} />
          <div className="min-w-0 flex-1">
            <div
              className="text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--color-info)' }}
            >
              REFRESH CADENCE
            </div>
            <p className="text-sm font-extrabold text-text-primary">AI Summary Refresh</p>
            <p className="text-xs text-text-muted mt-0.5 leading-snug">
              How often AI summaries and coach refreshes run automatically. Longer intervals save tokens.
            </p>
          </div>
        </div>

        <select
          className="w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-accent transition-all"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          value={ai.summaryRefreshMinutes}
          onChange={(e) => update({ summaryRefreshMinutes: Number(e.target.value) })}
        >
          {REFRESH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Card>

      {/* ── Feature toggles ── */}
      <Card className="p-4 sm:p-5" variant="default">
        <div className="flex items-start gap-2.5 sm:gap-3 mb-4">
          <Badge3D icon={<Zap size={16} />} size={36} colorVar="--color-warning" rotation={7} />
          <div className="min-w-0 flex-1">
            <div
              className="text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--color-warning)' }}
            >
              FEATURE CONTROLS
            </div>
            <p className="text-sm font-extrabold text-text-primary">Individual AI features</p>
            <p className="text-xs text-text-muted mt-0.5 leading-snug">
              Disable any feature to stop its token usage without losing any data.
            </p>
          </div>
        </div>

        {aiLocked && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border p-3"
            style={{ borderColor: 'var(--color-accent-soft, rgba(99,102,241,.3))', background: 'var(--color-surface-raised)' }}>
            <Lock className="w-4 h-4 mt-0.5 text-accent shrink-0" />
            <div className="text-xs text-text-secondary leading-snug">
              <span className="font-bold text-text-primary">AI features are locked on your current plan.</span>{' '}
              Upgrading unlocks AI Coach, insights, daily brief, journal analysis, task parser, and more.
            </div>
          </div>
        )}

        <div className="space-y-2.5 sm:space-y-3">
          {AI_FEATURES.map((feature) => {
            const isOn = Boolean(ai[feature.key]);
            return (
              <div
                key={feature.key}
                className={`flex items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border p-3 sm:p-4 transition-colors ${aiLocked ? 'opacity-70' : ''}`}
                style={{
                  borderColor: isOn
                    ? `color-mix(in srgb, var(--color-accent) 28%, var(--color-border))`
                    : 'var(--color-border)',
                  background: isOn
                    ? 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))'
                    : 'var(--color-surface)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text-primary">{feature.title}</span>
                    <TokenBadge level={feature.tokenLevel} />
                    {aiLocked && <Lock className="w-3.5 h-3.5 text-accent shrink-0" aria-label="Locked" />}
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-snug">{feature.description}</p>
                </div>
                <div className="shrink-0">
                  <Toggle
                    checked={isOn}
                    disabled={aiLocked}
                    onToggle={() => update({ [feature.key]: !ai[feature.key] } as Partial<AIPreferenceDTO>)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} highlightFeature="AI Features" />
    </div>
  );
}
