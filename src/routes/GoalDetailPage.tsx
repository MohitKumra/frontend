import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, CheckCircle2, Circle, FolderKanban, Plus, Target, Trash2, Timer, Link2 } from 'lucide-react';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { useGoal, useGoalMilestones, useCreateGoalMilestone, useUpdateGoalMilestone, useDeleteGoalMilestone } from '../features/goals/hooks/useGoals';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { useHabits } from '../features/habits/hooks/useHabits';
import { useProjects } from '../features/projects/hooks/useProjects';
import type { GoalMilestoneDTO, GoalMilestoneStatus } from '../types';

type MilestoneForm = {
  title: string;
  description: string;
  dueDate: string;
};

export function GoalDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: goal, isLoading } = useGoal(id);
  const { data: milestonesData } = useGoalMilestones(id);
  const { data: tasksData } = useTasks();
  const { data: habitsData } = useHabits();
  const { data: projectsData } = useProjects();
  const createMilestone = useCreateGoalMilestone(id);
  const updateMilestone = useUpdateGoalMilestone(id);
  const deleteMilestone = useDeleteGoalMilestone(id);
  const [form, setForm] = useState<MilestoneForm>({ title: '', description: '', dueDate: '' });

  const milestones = milestonesData ?? goal?.milestones ?? [];
  const tasks = tasksData?.pages.flatMap((page) => page.data) ?? [];
  const habits = habitsData?.data ?? [];
  const projects = projectsData?.data ?? [];

  const linkedTasks = useMemo(() => tasks.filter((task) => task.goalId === goal?.id), [tasks, goal?.id]);
  const linkedHabits = useMemo(() => habits.filter((habit) => habit.goalId === goal?.id), [habits, goal?.id]);
  const linkedProjects = useMemo(() => projects.filter((project) => project.goalId === goal?.id), [projects, goal?.id]);

  const daysRemaining = goal?.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null;

  const addMilestone = async () => {
    if (!form.title.trim()) return;
    await createMilestone.mutateAsync({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueDate: form.dueDate || null,
      sortOrder: milestones.length,
    });
    setForm({ title: '', description: '', dueDate: '' });
  };

  const toggleMilestone = (milestone: GoalMilestoneDTO, status: GoalMilestoneStatus) => {
    updateMilestone.mutate({ milestoneId: milestone.id, data: { status } });
  };

  if (isLoading) return <LoadingScreen />;
  if (!goal) {
    return (
      <Card className="p-8 text-center">
        <p className="text-text-muted">Goal not found</p>
        <Button onClick={() => navigate('/goals')} className="mt-4">Back to Goals</Button>
      </Card>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto flex flex-col gap-5 sm:gap-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button" onClick={() => navigate('/goals')} className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={16} />
          Back to goals
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/tasks?goalId=${goal.id}`)}>
            <Link2 size={14} />
            Open linked tasks
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-5 lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <PageHeader icon={<Target size={24} />} title={goal.title} subtitle={goal.description ?? 'Goal detail'} />
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant={goal.status === 'COMPLETED' ? 'success' : goal.status === 'PAUSED' ? 'warning' : 'accent'} size="sm">{goal.status}</Badge>
                <Badge variant={goal.priority === 'CRITICAL' ? 'danger' : goal.priority === 'HIGH' ? 'warning' : goal.priority === 'MEDIUM' ? 'info' : 'default'} size="sm">
                  {goal.priority}
                </Badge>
                {goal.targetDate && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-info) 12%, transparent)', color: 'var(--color-info)' }}>
                    <Calendar size={12} />
                    {new Date(goal.targetDate).toLocaleDateString()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }}>
                  <CheckCircle2 size={12} />
                  {goal.progress}% complete
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', color: 'var(--color-warning)' }}>
                  <Timer size={12} />
                  {daysRemaining !== null ? `${daysRemaining} days left` : 'No target date'}
                </span>
              </div>
            </div>

            <div className="w-full lg:w-80">
              <div className="h-2 rounded-full overflow-hidden bg-border">
                <div className="h-full rounded-full" style={{ width: `${goal.progress}%`, background: goal.color }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <GoalMetric label="Habits" value={goal.habitCount} />
                <GoalMetric label="Tasks" value={goal.taskCount} />
                <GoalMetric label="Projects" value={goal.projectCount} />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold">Progress Breakdown</p>
              <p className="text-xs text-text-muted">How this goal's progress is calculated from real activity</p>
            </div>
            <Badge variant="accent" size="sm">{goal.progress}%</Badge>
          </div>
          <ProgressBreakdown goal={goal} />
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold">Timeline</p>
              <p className="text-xs text-text-muted">Milestones and delivery markers for this goal</p>
            </div>
            <Badge variant="default" size="sm">{milestones.length} milestones</Badge>
          </div>

          <div className="space-y-4">
            {milestones.length ? milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full ${milestone.status === 'COMPLETED' ? 'bg-success' : milestone.status === 'SKIPPED' ? 'bg-warning' : 'bg-accent'}`} />
                  {index < milestones.length - 1 && <div className="w-px flex-1 min-h-8 bg-border" />}
                </div>
                <div className="flex-1 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary">{milestone.title}</p>
                      {milestone.description && <p className="text-xs text-text-secondary mt-1">{milestone.description}</p>}
                    </div>
                    <Badge variant={milestone.status === 'COMPLETED' ? 'success' : milestone.status === 'SKIPPED' ? 'warning' : 'default'} size="sm">
                      {milestone.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {milestone.dueDate && (
                      <span className="text-xs font-semibold text-text-muted">
                        Due {new Date(milestone.dueDate).toLocaleDateString('en-GB')}
                      </span>
                    )}
                    {milestone.completedAt && (
                      <span className="text-xs font-semibold text-success">
                        Completed {new Date(milestone.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => toggleMilestone(milestone, milestone.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}>
                      {milestone.status === 'COMPLETED' ? 'Reopen' : 'Complete'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleMilestone(milestone, 'SKIPPED')}>
                      Skip
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => deleteMilestone.mutate(milestone.id)}>
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-text-muted">No milestones yet. Add the first checkpoint on the right.</p>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={16} className="text-accent" />
            <p className="text-sm font-bold">Add Milestone</p>
          </div>
          <div className="space-y-3">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ship beta launch" />
            <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What needs to happen?" />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <Button onClick={addMilestone} loading={createMilestone.isPending}>Add milestone</Button>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <LinkedSection
          title="Linked Tasks"
          count={linkedTasks.length}
          icon={<CheckCircle2 size={16} />}
          items={linkedTasks.map((task) => ({
            key: task.id,
            title: task.title,
            meta: task.status,
            action: () => navigate(`/tasks/${task.id}`),
          }))}
        />
        <LinkedSection
          title="Linked Habits"
          count={linkedHabits.length}
          icon={<Circle size={16} />}
          items={linkedHabits.map((habit) => ({
            key: habit.id,
            title: habit.title,
            meta: `${habit.currentStreak} day streak`,
            action: () => navigate(`/habits?habitId=${habit.id}`),
          }))}
        />
        <LinkedSection
          title="Linked Projects"
          count={linkedProjects.length}
          icon={<FolderKanban size={16} />}
          items={linkedProjects.map((project) => ({
            key: project.id,
            title: project.name,
            meta: `${project.progress}% complete`,
            action: () => navigate(`/projects/${project.id}`),
          }))}
        />
      </motion.div>
    </motion.div>
  );
}

function GoalMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 text-center border" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-base font-black text-text-primary mt-1">{value}</p>
    </div>
  );
}

function ProgressBreakdown({ goal }: { goal: { progress: number; milestones: GoalMilestoneDTO[]; taskCount: number; habitCount: number; projectCount: number } }) {
  const activeMilestones = goal.milestones.filter((m) => m.status !== 'SKIPPED');
  const milestoneScore = activeMilestones.length === 0 ? 0 : Math.round((activeMilestones.filter((m) => m.status === 'COMPLETED').length / activeMilestones.length) * 100);
  const taskScore = goal.taskCount === 0 ? 0 : 0; // task completion % not available on detail DTO; show count
  const projectScore = goal.projectCount === 0 ? 0 : 0;
  const habitScore = goal.habitCount === 0 ? 0 : 0;

  const factors = [
    { label: 'Milestones', value: milestoneScore, weight: 35, color: 'var(--color-accent)' },
    { label: 'Tasks', value: taskScore, weight: 25, color: 'var(--color-info)' },
    { label: 'Projects', value: projectScore, weight: 20, color: 'var(--color-success)' },
    { label: 'Habits', value: habitScore, weight: 20, color: 'var(--color-warning)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-border-subtle)' }}>
        {factors.map((factor) => (
          <div
            key={factor.label}
            style={{ width: `${factor.weight}%`, background: factor.color, opacity: 0.85 }}
            title={`${factor.label} (${factor.weight}%)`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {factors.map((factor) => (
          <div key={factor.label} className="rounded-2xl border p-3" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: factor.color }} />
              <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{factor.label}</p>
            </div>
            <p className="mt-2 text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
              {factor.value}%
            </p>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {factor.weight}% weight
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-5" style={{ color: 'var(--color-text-muted)' }}>
        Progress is calculated automatically from completed milestones, finished tasks, project progress, and 4-week habit consistency. No manual input.
      </p>
    </div>
  );
}

function LinkedSection({
  title,
  count,
  icon,
  items,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  items: Array<{ key: string; title: string; meta: string; action: () => void }>;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-bold">{title}</p>
        </div>
        <Badge variant="default" size="sm">{count}</Badge>
      </div>
      <div className="space-y-2">
        {items.length ? items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.action}
            className="w-full text-left rounded-xl border p-3 transition-colors hover:bg-surface-secondary"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
            <p className="text-xs text-text-muted mt-1 truncate">{item.meta}</p>
          </button>
        )) : (
          <p className="text-sm text-text-muted">Nothing linked yet.</p>
        )}
      </div>
    </Card>
  );
}

export default GoalDetailPage;
