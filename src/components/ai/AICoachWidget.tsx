/**
 * AICoachWidget — the single canonical compact AI-coach card.
 *
 * Replaces:
 *   - components/habits/AICoachPanel.tsx  (deleted)
 *   - The local `CoachPanel` function inside GoalsPage.tsx  (removed)
 *
 * Usage:
 *   <AICoachWidget />                      — no context hint, generic message
 *   <AICoachWidget context="habits" completedToday={3} totalHabits={5} />
 *   <AICoachWidget context="goals" insights={insights} upcomingDeadlines={deadlines} />
 */

import { motion } from 'framer-motion';
import { Lightbulb, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EnhancedDashboardDTO } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAICoach, useAIFeatureEnabled } from '../../features/ai/hooks/useAI';
import { useUserPlan } from '../../features/billing/useUserPlan';
import { LockedFeatureWrapper } from '../billing/LockedFeatureWrapper';

// ─── Props ────────────────────────────────────────────────────────────────────

type BaseProps = {
  /** Optional CSS class applied to the root Card. */
  className?: string;
};

type HabitsContext = BaseProps & {
  context: 'habits';
  completedToday: number;
  totalHabits: number;
};

type GoalsContext = BaseProps & {
  context: 'goals';
  insights: EnhancedDashboardDTO['insights'];
  upcomingDeadlines: EnhancedDashboardDTO['upcomingDeadlines'];
  updatedAt?: string | null;
};

type GenericContext = BaseProps & {
  context?: never;
};

export type AICoachWidgetProps = HabitsContext | GoalsContext | GenericContext;

// ─── Colour helpers ───────────────────────────────────────────────────────────

function moodColor(mood: string | undefined, fallbackPct: number): string {
  switch (mood) {
    case 'celebratory':
      return '#22C55E';
    case 'challenging':
      return '#FFB800';
    default:
      break;
  }
  if (fallbackPct === 100) return '#22C55E';
  if (fallbackPct >= 80) return '#6C63FF';
  if (fallbackPct >= 50) return '#FFB800';
  return '#8B5CF6';
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'recently';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CoachHeader({ color, isRuleBased, isLoading }: { color: string; isRuleBased: boolean; isLoading: boolean }) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
      <motion.div
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, color }}
        animate={{ rotate: [0, 5, 0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles size={14} />
      </motion.div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
          {isRuleBased ? 'Coach' : 'AI Coach'}
          {!isRuleBased ? (
            <motion.span
              className="px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0"
              style={{ background: `${color}20`, color }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              AI
            </motion.span>
          ) : (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0"
              style={{ background: `${color}20`, color }}
            >
              {isLoading ? '…' : 'Live'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function FloatingParticles({ color }: { color: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{ background: color, opacity: 0.4, top: `${20 + i * 20}%`, right: `${10 + i * 5}%` }}
          animate={{ y: [-10, 10], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, repeatType: 'reverse', delay: i * 0.3 }}
        />
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AICoachWidget(props: AICoachWidgetProps) {
  const { data: coachData, isLoading } = useAICoach();
  const coachEnabled = useAIFeatureEnabled('coachEnabled');
  const navigate = useNavigate();
  const { isFeatureLocked } = useUserPlan();
  const coachLocked = isFeatureLocked('aiCoach');

  // Derive context-specific values
  const pct =
    props.context === 'habits' && props.totalHabits > 0
      ? Math.round((props.completedToday / props.totalHabits) * 100)
      : 0;

  const isRuleBased = !coachEnabled || coachData?.source !== 'ai';
  const color = moodColor(coachData?.mood, pct);

  const openCoach = (autoSend = false) => {
    const prompt = coachData?.planPrompt ?? coachData?.suggestion?.text ?? coachData?.message ?? '';
    navigate('/coach', { state: { coachPrompt: prompt, autoSend } });
  };

  const handleActionClick = () => {
    const actionType = coachData?.suggestion?.actionType ?? 'open_coach';
    const prompt = coachData?.planPrompt ?? coachData?.suggestion?.text ?? coachData?.message ?? '';
    switch (actionType) {
      case 'open_habits':   navigate('/habits'); break;
      case 'open_tasks':    navigate('/tasks'); break;
      case 'open_goals':    navigate('/goals'); break;
      case 'open_focus':    navigate('/focus'); break;
      case 'open_dashboard': navigate('/'); break;
      case 'create_plan':   navigate('/coach', { state: { coachPrompt: prompt, autoSend: true } }); break;
      default:              navigate('/coach', { state: { coachPrompt: prompt, autoSend: false } }); break;
    }
  };

  return (
    <LockedFeatureWrapper isLocked={coachLocked} featureName="AI Coach" minPlanName="Basic">
    <Card
      variant="default"
      className={`p-3 sm:p-5 relative overflow-hidden${props.className ? ` ${props.className}` : ''}`}
      style={{
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Ambient blob */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: color, opacity: 0.15 }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Glass sheen */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
      />

      <div className="relative">
        <CoachHeader color={color} isRuleBased={isRuleBased} isLoading={isLoading} />

        {/* ── Goals context: show insights + deadlines below the AI message ── */}
        {props.context === 'goals' && !isLoading && (
          <GoalsExtras
            insights={props.insights}
            upcomingDeadlines={props.upcomingDeadlines}
            updatedAt={props.updatedAt}
            coachMessage={coachData?.message}
            coachTitle={coachData?.title}
            color={color}
            onOpenCoach={() => openCoach(false)}
          />
        )}

        {/* ── Habits / generic context: regular AI card body ── */}
        {props.context !== 'goals' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin" style={{ color }} />
              </div>
            ) : coachData?.source === 'ai' && coachData.message ? (
              <AiBody
                color={color}
                coachData={coachData}
                onAction={handleActionClick}
                onOpenCoach={openCoach}
              />
            ) : (
              <FallbackBody pct={pct} color={color} onOpenCoach={openCoach} />
            )}
          </>
        )}
      </div>

      <FloatingParticles color={color} />
    </Card>
    </LockedFeatureWrapper>
  );
}

// ─── AI body (real coach response) ───────────────────────────────────────────

type AiBodyProps = {
  color: string;
  coachData: NonNullable<ReturnType<typeof useAICoach>['data']>;
  onAction: () => void;
  onOpenCoach: (autoSend?: boolean) => void;
};

function AiBody({ color, coachData, onAction, onOpenCoach }: AiBodyProps) {
  return (
    <>
      <div className="mb-3 sm:mb-4">
        <p className="text-[13px] sm:text-[15px] font-extrabold text-text-primary mb-1 sm:mb-1.5">
          {coachData.title}
        </p>
        <p className="text-xs text-text-secondary font-medium leading-relaxed">{coachData.message}</p>
      </div>

      {coachData.suggestion?.text && (
        <motion.div
          className="p-2.5 sm:p-3.5 rounded-xl mb-3 sm:mb-4 relative overflow-hidden"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative flex items-start gap-2 sm:gap-2.5">
            <div
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#FFB80015', color: '#FFB800' }}
            >
              <Lightbulb size={12} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1.5">💡 Suggestion</p>
              <p className="text-xs font-medium text-text-secondary leading-relaxed">{coachData.suggestion.text}</p>
            </div>
          </div>
        </motion.div>
      )}

      {coachData.suggestion?.actionLabel && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mb-2">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="text-xs font-bold"
            onClick={onAction}
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
              border: 'none',
              color: 'white',
            }}
          >
            {coachData.suggestion.actionLabel}
          </Button>
        </motion.div>
      )}

      <button
        type="button"
        onClick={() => onOpenCoach(coachData.suggestion?.actionType === 'create_plan')}
        className="w-full text-center text-[11px] font-bold text-accent hover:opacity-80 transition-opacity"
      >
        Chat &amp; plan
      </button>
    </>
  );
}

// ─── Fallback body (rule-based / AI off) ─────────────────────────────────────

function FallbackBody({
  pct,
  color,
  onOpenCoach,
}: {
  pct: number;
  color: string;
  onOpenCoach: () => void;
}) {
  const title =
    pct === 100 ? 'Perfect day! 🎉' :
    pct >= 80   ? 'Great consistency! 🎯' :
    pct >= 50   ? 'Keep it up! 💪' :
                  "Let's get started! 🚀";

  const message =
    pct === 100 ? "You've completed all your habits. Amazing work!" :
    pct >= 80   ? "You've been 18% more consistent than last week." :
    pct >= 50   ? "You're making progress. Try to complete more habits today." :
                  'Start with your easiest habit to build momentum.';

  return (
    <>
      <div className="mb-3 sm:mb-4">
        <p className="text-[13px] sm:text-[15px] font-extrabold text-text-primary mb-1 sm:mb-1.5">{title}</p>
        <p className="text-xs text-text-secondary font-medium leading-relaxed">{message}</p>
      </div>

      {pct >= 80 && (
        <motion.div
          className="flex items-center gap-1.5 mb-3 sm:mb-4 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
          style={{ background: `${color}10` }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TrendingUp size={12} style={{ color }} />
          <span className="text-[10px] sm:text-[11px] font-bold" style={{ color }}>
            +18% vs last week
          </span>
        </motion.div>
      )}

      <button
        type="button"
        onClick={onOpenCoach}
        className="w-full text-center text-[11px] font-bold text-accent hover:opacity-80 transition-opacity"
      >
        Chat &amp; plan
      </button>
    </>
  );
}

// ─── Goals extras (insights + deadlines, injected after AI header) ────────────

type GoalsExtrasProps = {
  insights: EnhancedDashboardDTO['insights'];
  upcomingDeadlines: EnhancedDashboardDTO['upcomingDeadlines'];
  updatedAt?: string | null;
  coachMessage?: string;
  coachTitle?: string;
  color: string;
  onOpenCoach: () => void;
};

function GoalsExtras({
  insights,
  upcomingDeadlines,
  updatedAt,
  coachMessage,
  coachTitle,
  color,
  onOpenCoach,
}: GoalsExtrasProps) {
  const displayMessage = coachMessage ?? 'You are progressing faster than expected. Keep it up.';
  const displayTitle = coachTitle ?? 'On track';

  return (
    <>
      {/* Updated timestamp */}
      <p className="text-[10px] font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Updated {formatRelativeTime(updatedAt)}
      </p>

      {/* AI message bubble */}
      <div
        className="rounded-2xl border p-3.5 mb-4"
        style={{
          background: `color-mix(in srgb, ${color} 8%, var(--color-surface-raised))`,
          borderColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        }}
      >
        <p className="text-xs font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>{displayTitle}</p>
        <p className="text-sm font-semibold leading-6" style={{ color: 'var(--color-text-secondary)' }}>
          {displayMessage}
        </p>
      </div>

      {/* Suggestions */}
      {insights.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Suggestions
          </p>
          <div className="space-y-2">
            {insights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-xl border p-3"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                    color: 'var(--color-info)',
                  }}
                >
                  <Lightbulb size={13} />
                </span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Upcoming deadlines
          </p>
          <div className="space-y-2">
            {upcomingDeadlines.slice(0, 3).map((d) => (
              <div
                key={`${d.type}-${d.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {d.title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {d.type.toUpperCase()} · {d.daysUntilDue} day{d.daysUntilDue === 1 ? '' : 's'} left
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                  style={{
                    background: d.daysUntilDue <= 1
                      ? 'color-mix(in srgb, var(--color-danger, #ef4444) 12%, transparent)'
                      : 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                    color: d.daysUntilDue <= 1 ? 'var(--color-danger, #ef4444)' : 'var(--color-warning)',
                  }}
                >
                  {new Date(d.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenCoach}
        className="w-full text-center text-[11px] font-bold text-accent hover:opacity-80 transition-opacity"
      >
        Chat &amp; plan
      </button>
    </>
  );
}
