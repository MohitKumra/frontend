import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Settings2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { goalPlannerApi } from '../../features/goals/api';
import { useAIFeatureEnabled } from '../../features/ai/hooks/useAI';
import type {
  GoalPlannerPlanDTO,
  GoalPlannerMilestoneItem,
  GoalPlannerTaskItem,
  GoalPlannerHabitItem,
  GoalPlannerProjectItem,
} from '../../types';

type GoalPlannerModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (goalId: string) => void;
};

export function GoalPlannerModal({ open, onClose, onCreated }: GoalPlannerModalProps) {
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<GoalPlannerPlanDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const plannerEnabled = useAIFeatureEnabled('goalPlannerEnabled');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setPlan(null);
      setError(null);
      setIsGenerating(false);
      setIsCreating(false);
    }
  }, [open]);

  const summaryCounts = useMemo(
    () => ({
      milestones: plan?.milestones.length ?? 0,
      tasks: plan?.tasks.length ?? 0,
      habits: plan?.habits.length ?? 0,
      projects: plan?.projects.length ?? 0,
    }),
    [plan]
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Describe the goal you want to build.');
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const generated = await goalPlannerApi.generatePlan(prompt.trim());
      setPlan(generated);
    } catch {
      setError('We could not generate a plan. Try again with a little more detail.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!plan) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await goalPlannerApi.createWorkspace(plan);
      onCreated(created.goal.id);
      onClose();
    } catch {
      setError('We could not create the workspace. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="AI Goal Planner" maxWidth="max-w-5xl">
      {!plannerEnabled ? (
        /* ── AI disabled state ──────────────────────────────── */
        <div className="relative overflow-hidden rounded-2xl">
          {/* ambient blobs */}
          <div
            className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full blur-[80px] opacity-20"
            style={{ background: 'var(--color-accent)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-[70px] opacity-15"
            style={{ background: 'var(--color-warning)' }}
          />

          <div className="relative flex flex-col items-center text-center px-8 py-14 gap-0">
            {/* icon stack */}
            <div className="relative mb-7">
              {/* outer glow ring */}
              <div
                className="absolute inset-0 rounded-[28px] blur-xl opacity-40"
                style={{ background: 'var(--gradient-accent)', transform: 'scale(1.3)' }}
              />
              {/* main badge */}
              <div
                className="relative w-20 h-20 rounded-[28px] flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 18%, var(--color-surface)), var(--color-surface-raised))',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, var(--color-border))',
                  boxShadow: '0 16px 40px color-mix(in srgb, var(--color-accent) 20%, transparent)',
                }}
              >
                <BrainCircuit size={34} style={{ color: 'var(--color-accent)' }} strokeWidth={1.5} />
              </div>
              {/* lock pip */}
              <div
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl flex items-center justify-center border-2"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-warning)',
                }}
              >
                <Settings2 size={13} />
              </div>
            </div>

            {/* label pill */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] mb-4"
              style={{
                background: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-raised))',
                border: '1px solid color-mix(in srgb, var(--color-warning) 22%, var(--color-border))',
                color: 'var(--color-warning)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-warning)' }} />
              Feature disabled
            </div>

            <h3
              className="text-2xl font-black mb-3"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
            >
              Goal Planner is off
            </h3>

            <p className="text-sm leading-7 max-w-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              The AI Goal Planner is turned off in your settings. Enable it to generate a full goal workspace —
              milestones, tasks, habits, and projects — from a single prompt.
            </p>

            {/* feature preview chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5 mb-8">
              {['Milestones', 'Tasks', 'Habits', 'Projects'].map((item, i) => {
                const colors = [
                  'var(--color-accent)',
                  'var(--color-info)',
                  'var(--color-success)',
                  'var(--color-warning)',
                ];
                return (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                    style={{
                      background: `color-mix(in srgb, ${colors[i]} 10%, var(--color-surface-raised))`,
                      border: `1px solid color-mix(in srgb, ${colors[i]} 20%, var(--color-border))`,
                      color: colors[i],
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[i] }} />
                    {item}
                  </span>
                );
              })}
            </div>

            {/* divider */}
            <div className="w-full max-w-xs h-px mb-7" style={{ background: 'var(--color-border)' }} />

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-70"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/settings?tab=ai');
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'var(--gradient-accent)',
                  boxShadow: '0 8px 24px color-mix(in srgb, var(--color-accent) 35%, transparent)',
                }}
              >
                <Settings2 size={15} />
                Enable in Settings
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-5">
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
            >
              <p className="text-sm font-bold text-text-primary">Describe the workspace you want</p>
              <p className="text-xs text-text-muted mt-1">
                One prompt is enough. We’ll generate a goal, milestones, habits, tasks, and starter projects.
              </p>
            </div>

            <Textarea
              label="Prompt"
              rows={10}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Launch my freelance design studio by the end of September. I need a plan with client outreach, portfolio refresh, a weekly habit for outreach, and a project structure."
            />

            <div className="flex flex-wrap gap-2">
              {['Launch a product', 'Get fit for summer', 'Study for certification', 'Build a client pipeline'].map(
                (example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="px-3 py-2 rounded-full text-xs font-bold border transition-colors"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-surface)',
                    }}
                  >
                    {example}
                  </button>
                )
              )}
            </div>

            {error && <p className="text-sm font-semibold text-danger">{error}</p>}

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              {!plan ? (
                <Button onClick={handleGenerate} loading={isGenerating}>
                  Generate plan
                </Button>
              ) : (
                <Button onClick={handleCreate} loading={isCreating}>
                  Create workspace
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {plan ? (
              <>
                <Card className="p-4 border" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Generated goal</p>
                      <h3 className="text-lg font-black text-text-primary mt-1">{plan.goal.title}</h3>
                      <p className="text-sm text-text-secondary mt-2">{plan.goal.description || plan.summary}</p>
                    </div>
                    <Badge variant={plan.source === 'ai' ? 'accent' : 'default'} size="sm">
                      {plan.source.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <MiniStat label="Milestones" value={summaryCounts.milestones} />
                    <MiniStat label="Tasks" value={summaryCounts.tasks} />
                    <MiniStat label="Habits" value={summaryCounts.habits} />
                    <MiniStat label="Projects" value={summaryCounts.projects} />
                  </div>
                </Card>

                <PlanSection
                  title="Milestones"
                  items={plan.milestones.map((item: GoalPlannerMilestoneItem) => item.title)}
                />
                <PlanSection title="Tasks" items={plan.tasks.map((item: GoalPlannerTaskItem) => item.title)} />
                <PlanSection title="Habits" items={plan.habits.map((item: GoalPlannerHabitItem) => item.title)} />
                <PlanSection title="Projects" items={plan.projects.map((item: GoalPlannerProjectItem) => item.name)} />
              </>
            ) : (
              <Card className="p-5 border text-sm text-text-muted" style={{ borderColor: 'var(--color-border)' }}>
                Generate a plan to see the workspace preview here.
              </Card>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl p-3 text-center border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-base font-black text-text-primary mt-1">{value}</p>
    </div>
  );
}

function PlanSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-4 border" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-sm font-bold text-text-primary">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item}
              className="rounded-xl border px-3 py-2 text-sm text-text-primary"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm text-text-muted">No items generated.</p>
        )}
      </div>
    </Card>
  );
}
