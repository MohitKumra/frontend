import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import { AISettingsPanel } from '../components/settings/AISettingsPanel';
import { useSettings, useUpdateAIPreferences } from '../features/settings';

export function AIControlsPage() {
  const { data, isLoading } = useSettings();
  const aiMutation = useUpdateAIPreferences();

  const aiPrefs = useMemo(() => data?.ai, [data]);

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto flex items-center justify-center py-16">
        <div className="text-sm font-semibold text-text-muted">Loading AI settings...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 sm:gap-5 px-4 sm:px-0">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 sm:space-y-5">
        <motion.div variants={itemVariants}>
          <div
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-6"
            style={{
              borderColor: 'var(--color-border)',
              background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)) 100%)',
            }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 text-white"
                style={{ background: 'var(--gradient-accent)', boxShadow: '0 8px 18px color-mix(in srgb, var(--color-accent) 35%, transparent)' }}
              >
                <BrainCircuit size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted">
                  Token control
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">AI & Tokens</h1>
                <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-lg leading-relaxed">
                  Enable or disable AI features individually and control how frequently AI summaries refresh.
                  Turning a feature off leaves your data untouched — it simply stops spending tokens.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AISettingsPanel
            preferences={aiPrefs}
            onChange={(next) => aiMutation.mutate(next)}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}