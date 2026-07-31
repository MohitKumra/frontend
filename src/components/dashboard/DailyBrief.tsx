import { motion } from 'framer-motion';
import { Sparkles, Loader2, Sun, ListChecks, Target, Brain } from 'lucide-react';
import { Card } from '../ui/Card';
import { useDailyBrief } from '../../features/ai/hooks/useAI';

export function DailyBrief() {
  const { data: brief, isLoading, isError } = useDailyBrief();

  if (isLoading) {
    return (
      <Card variant="default" className="p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      </Card>
    );
  }

  if (isError || !brief || brief.source === 'fallback') {
    return (
      <Card
        variant="default"
        className="p-5 relative overflow-hidden"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'var(--color-accent)', opacity: 0.08 }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Sun size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Good day!</p>
              <p className="text-xs text-text-secondary">Your daily briefing</p>
            </div>
          </div>
          <p className="text-sm font-medium text-text-secondary mb-4 leading-relaxed">
            Start your day by reviewing your tasks and habits. Complete your highest priority items first to build momentum.
          </p>
          <div className="mt-4 text-center">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              <Sparkles size={8} />
              AI Briefing
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      className="p-5 relative overflow-hidden"
      style={{
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Decorative gradient blob */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'var(--color-accent)', opacity: 0.08 }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Sun size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Your daily briefing</p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm font-medium text-text-primary mb-4 leading-relaxed">
          {brief.summary}
        </p>

        {/* Priorities */}
        {brief.priorities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks size={12} className="text-accent" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Today's Priorities
              </span>
            </div>
            <div className="space-y-1.5">
              {brief.priorities.map((priority, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-surface-raised)' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--color-accent)' }}
                  />
                  <span className="text-xs font-medium text-text-primary">{priority}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Focus Tip */}
        {brief.focusTip && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl mb-3"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-raised))',
              border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
            }}
          >
            <Brain size={14} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-text-secondary leading-relaxed">
              {brief.focusTip}
            </p>
          </div>
        )}

        {/* Motivation */}
        {brief.motivation && (
          <div className="flex items-center gap-2">
            <Target size={12} className="text-accent" />
            <p className="text-xs font-bold text-accent">{brief.motivation}</p>
          </div>
        )}

        {/* AI Badge */}
        <div className="mt-4 text-center">
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <Sparkles size={8} />
            AI Generated
          </span>
        </div>
      </div>
    </Card>
  );
}