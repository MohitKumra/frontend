import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { goalPlannerApi } from '../../features/goals/api';
import type { GoalPlannerPlanDTO } from '../../types';

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

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setPlan(null);
      setError(null);
      setIsGenerating(false);
      setIsCreating(false);
    }
  }, [open]);

  const summaryCounts = useMemo(() => ({
    milestones: plan?.milestones.length ?? 0,
    tasks: plan?.tasks.length ?? 0,
    habits: plan?.habits.length ?? 0,
    projects: plan?.projects.length ?? 0,
  }), [plan]);

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
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-5">
        <div className="space-y-4">
          <div className="rounded-2xl p-4 border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
            <p className="text-sm font-bold text-text-primary">Describe the workspace you want</p>
            <p className="text-xs text-text-muted mt-1">One prompt is enough. We’ll generate a goal, milestones, habits, tasks, and starter projects.</p>
          </div>

          <Textarea
            label="Prompt"
            rows={10}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Launch my freelance design studio by the end of September. I need a plan with client outreach, portfolio refresh, a weekly habit for outreach, and a project structure."
          />

          <div className="flex flex-wrap gap-2">
            {[
              'Launch a product',
              'Get fit for summer',
              'Study for certification',
              'Build a client pipeline',
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="px-3 py-2 rounded-full text-xs font-bold border transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}
              >
                {example}
              </button>
            ))}
          </div>

          {error && <p className="text-sm font-semibold text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
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
                  <Badge variant={plan.source === 'ai' ? 'accent' : 'default'} size="sm">{plan.source.toUpperCase()}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <MiniStat label="Milestones" value={summaryCounts.milestones} />
                  <MiniStat label="Tasks" value={summaryCounts.tasks} />
                  <MiniStat label="Habits" value={summaryCounts.habits} />
                  <MiniStat label="Projects" value={summaryCounts.projects} />
                </div>
              </Card>

              <PlanSection title="Milestones" items={plan.milestones.map((item) => item.title)} />
              <PlanSection title="Tasks" items={plan.tasks.map((item) => item.title)} />
              <PlanSection title="Habits" items={plan.habits.map((item) => item.title)} />
              <PlanSection title="Projects" items={plan.projects.map((item) => item.name)} />
            </>
          ) : (
            <Card className="p-5 border text-sm text-text-muted" style={{ borderColor: 'var(--color-border)' }}>
              Generate a plan to see the workspace preview here.
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 text-center border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
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
        {items.length > 0 ? items.map((item) => (
          <div key={item} className="rounded-xl border px-3 py-2 text-sm text-text-primary" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            {item}
          </div>
        )) : (
          <p className="text-sm text-text-muted">No items generated.</p>
        )}
      </div>
    </Card>
  );
}
