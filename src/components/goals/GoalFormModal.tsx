import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useState } from 'react';
import { Ban, CheckCircle2, ChevronDown, ChevronUp, Edit2, FolderKanban, Plus, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { GOAL_ICON_CHOICES, NO_ICON } from './goalIcons';
import type { GoalPriority, GoalStatus, HabitDTO, ProjectDTO, TaskDTO } from '../../types';

export type GoalFormState = {
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  targetDate: string;
  status: GoalStatus;
  priority: GoalPriority;
  aiSummary: string;
  linkedHabitIds: Set<string>;
  linkedTaskIds: Set<string>;
  linkedProjectIds: Set<string>;
};

export type GoalFormTouched = Partial<Record<keyof GoalFormState, boolean>>;

type GoalFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  editingGoal: boolean;
  form: GoalFormState;
  setForm: Dispatch<SetStateAction<GoalFormState>>;
  touched: GoalFormTouched;
  setTouched: Dispatch<SetStateAction<GoalFormTouched>>;
  fieldError: (key: keyof GoalFormState) => string | undefined;
  isSubmitting: boolean;
  habits: HabitDTO[];
  tasks: TaskDTO[];
  projects: ProjectDTO[];
  toggleSelected: (kind: 'habits' | 'tasks' | 'projects', id: string) => void;
};

const iconChoices: { value: string; label: string; icon: LucideIcon }[] = [
  { value: NO_ICON, label: 'None', icon: Ban },
  ...GOAL_ICON_CHOICES,
];

const ICONS_INITIAL = 6;

const colorChoices = ['#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#0EA5E9', '#8B5CF6'];

const statusMeta: Record<GoalStatus, { label: string }> = {
  ACTIVE: { label: 'Active' },
  PAUSED: { label: 'Paused' },
  COMPLETED: { label: 'Completed' },
  ARCHIVED: { label: 'Archived' },
};

const priorityMeta: Record<GoalPriority, { label: string }> = {
  LOW: { label: 'Low' },
  MEDIUM: { label: 'Medium' },
  HIGH: { label: 'High' },
  CRITICAL: { label: 'Critical' },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatDateLong(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getIconForKey(key: string): ReactNode {
  const match = iconChoices.find((choice) => choice.value === key);
  const Icon: LucideIcon = match?.icon ?? Target;
  return <Icon size={26} />;
}

export function GoalFormModal({
  open,
  onClose,
  onSubmit,
  editingGoal,
  form,
  setForm,
  setTouched,
  fieldError,
  isSubmitting,
  habits,
  tasks,
  projects,
  toggleSelected,
}: GoalFormModalProps) {
  const [showAllIcons, setShowAllIcons] = useState(false);
  const visibleIcons = showAllIcons ? iconChoices : iconChoices.slice(0, ICONS_INITIAL);
  
  return (
    <Modal open={open} onClose={onClose} title={editingGoal ? 'Edit Goal' : 'Create Goal'} maxWidth="max-w-6xl">
      <div className="space-y-6">
        <div
          className="rounded-[28px] border p-5"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 6%, var(--color-surface)) 0%, var(--color-surface) 100%)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p
                className="text-[11px] font-black uppercase tracking-[0.25em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {editingGoal ? 'Refine your existing goal' : 'Create a high-conviction goal'}
              </p>
              <h3 className="mt-2 text-2xl font-black sm:text-3xl" style={{ color: 'var(--color-text-primary)' }}>
                Build a goal with the right strategy, timing, and linked work
              </h3>
              <p
                className="mt-2 max-w-2xl text-sm leading-7 sm:text-base"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Use the left side to define the goal. Use the right side to confirm how it will look, what it is
                connected to, and whether the plan feels ready to ship.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <MiniPill icon={<Target size={12} />} label="Outcome" />
              <MiniPill icon={<FolderKanban size={12} />} label="Linked work" />
              <MiniPill icon={<Sparkles size={12} />} label="AI ready" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <FormSection title="Goal Basics" description="Give the goal a clear title and a believable outcome.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    onBlur={() => setTouched((current) => ({ ...current, title: true }))}
                    error={fieldError('title')}
                    placeholder="Launch AI-powered PMS platform"
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Description"
                    rows={4}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="What does success look like, and why does it matter?"
                  />
                </div>
                <Input
                  label="Category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder="Launch, Growth, Finance"
                />
                <Input
                  label="Target date"
                  type="date"
                  value={form.targetDate}
                  onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
                  onBlur={() => setTouched((current) => ({ ...current, targetDate: true }))}
                  error={fieldError('targetDate')}
                />
              </div>
            </FormSection>

            <FormSection title="Strategy" description="Set the current state and confidence of the goal.">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) => setForm({ ...form, status: value as GoalStatus })}
                  options={Object.keys(statusMeta).map((status) => ({
                    value: status,
                    label: statusMeta[status as GoalStatus].label,
                  }))}
                />
                <SelectField
                  label="Priority"
                  value={form.priority}
                  onChange={(value) => setForm({ ...form, priority: value as GoalPriority })}
                  options={Object.keys(priorityMeta).map((priority) => ({
                    value: priority,
                    label: priorityMeta[priority as GoalPriority].label,
                  }))}
                />
              </div>
            </FormSection>

            <FormSection
              title="Visual Identity"
              description="Pick an icon and accent color that make this goal instantly recognizable."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Icon
                  </label>
                  <div className="mt-2 grid grid-cols-6 gap-2">
                    {visibleIcons.map((choice) => {
                      const active = form.icon === choice.value;
                      const Icon = choice.icon;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => setForm({ ...form, icon: choice.value })}
                          className="flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-[11px] font-bold transition-all"
                          style={{
                            background: active
                              ? 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface-raised))'
                              : 'var(--color-surface-raised)',
                            borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                            color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          }}
                        >
                          <Icon size={18} />
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllIcons((v) => !v)}
                    className="mt-2 flex items-center gap-1 text-xs font-bold transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {showAllIcons ? (
                      <>
                        <ChevronUp size={13} /> Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} /> Show {iconChoices.length - ICONS_INITIAL} more
                      </>
                    )}
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Accent color
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colorChoices.map((color) => {
                      const active = form.color.toLowerCase() === color.toLowerCase();
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setForm({ ...form, color })}
                          className="flex h-11 w-11 items-center justify-center rounded-full border"
                          style={{
                            background: color,
                            borderColor: active ? 'var(--color-text-primary)' : 'transparent',
                            boxShadow: active
                              ? '0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent)'
                              : undefined,
                          }}
                          aria-label={`Use color ${color}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <Input
                      label="Custom color"
                      value={form.color}
                      onChange={(event) => setForm({ ...form, color: event.target.value })}
                      onBlur={() => setTouched((current) => ({ ...current, color: true }))}
                      error={fieldError('color')}
                      placeholder="#4F46E5"
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="AI Coach Notes"
              description="Give the planner extra context so future suggestions are better."
            >
              <Textarea
                label="AI summary"
                rows={4}
                value={form.aiSummary}
                onChange={(event) => setForm({ ...form, aiSummary: event.target.value })}
                placeholder="Optional coaching summary for this goal"
              />
              
            </FormSection>
          </div>

          <div className="space-y-5">
            <div className="sticky top-0 space-y-5">
              <FormSection title="Live Preview" description="This updates as you edit the form.">
                <div
                  className="rounded-xl border p-5"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 90%, white) 0%, var(--color-surface-raised) 100%)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{
                          background: `linear-gradient(135deg, color-mix(in srgb, ${form.color} 90%, white) 0%, color-mix(in srgb, ${form.color} 55%, #ffffff) 100%)`,
                          color: 'white',
                        }}
                      >
                        {getIconForKey(form.icon)}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-[11px] font-black uppercase tracking-[0.2em]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Goal Preview
                        </p>
                        <h4
                          className="mt-1 text-lg font-black leading-tight"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {form.title || 'Your goal title appears here'}
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{
                              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                              color: 'var(--color-accent)',
                            }}
                          >
                            {statusMeta[form.status].label}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{
                              background: 'color-mix(in srgb, var(--color-info) 12%, transparent)',
                              color: 'var(--color-info)',
                            }}
                          >
                            {priorityMeta[form.priority].label} priority
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <ProgressRing progress={0} color={form.color || 'var(--color-accent)'} size={76} />
                      <span
                        className="mt-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        Auto
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                    {form.description || 'Add a clear outcome description to make the plan easier to execute.'}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <PreviewStat label="Habits" value={form.linkedHabitIds.size} />
                    <PreviewStat label="Tasks" value={form.linkedTaskIds.size} />
                    <PreviewStat label="Projects" value={form.linkedProjectIds.size} />
                    <PreviewStat label="Progress" value="Auto" />
                  </div>

                  <div
                    className="mt-4 rounded-2xl border p-3"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div
                      className="flex items-center justify-between text-xs font-bold"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <span>Strategy</span>
                      <span>{form.targetDate ? formatDateLong(form.targetDate) : 'No target date'}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full" style={{ background: 'var(--color-border-subtle)' }}>
                      <div className="h-2 rounded-full" style={{ width: '0%', background: form.color }} />
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Link Work"
                description="Connect the goal to the work that will actually move it forward."
              >
                <div className="space-y-4">
                  <LinkPicker
                    title="Habits"
                    items={habits.map((habit) => ({
                      id: habit.id,
                      label: habit.title,
                      meta: habit.completedToday ? 'completed today' : `${habit.currentStreak} day streak`,
                    }))}
                    selectedIds={form.linkedHabitIds}
                    onToggle={(id) => toggleSelected('habits', id)}
                  />
                  <LinkPicker
                    title="Tasks"
                    items={tasks.map((task) => ({ id: task.id, label: task.title, meta: task.status }))}
                    selectedIds={form.linkedTaskIds}
                    onToggle={(id) => toggleSelected('tasks', id)}
                  />
                  <LinkPicker
                    title="Projects"
                    items={projects.map((project) => ({
                      id: project.id,
                      label: project.name,
                      meta: `${project.progress}%`,
                    }))}
                    selectedIds={form.linkedProjectIds}
                    onToggle={(id) => toggleSelected('projects', id)}
                  />
                </div>
              </FormSection>

              <FormSection title="Ready Check" description="A quick summary before you save.">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryStat
                    label="Title"
                    value={form.title ? 'Set' : 'Missing'}
                    tone={form.title ? 'success' : 'danger'}
                  />
                  <SummaryStat label="Category" value={form.category || 'Unset'} />
                  <SummaryStat
                    label="Target date"
                    value={form.targetDate ? formatDateLong(form.targetDate) : 'Unset'}
                  />
                  <SummaryStat
                    label="Linked items"
                    value={form.linkedHabitIds.size + form.linkedTaskIds.size + form.linkedProjectIds.size}
                  />
                </div>
              </FormSection>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Fields marked with * are required. Use the preview to sanity-check the goal before saving.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              loading={isSubmitting}
              leftIcon={editingGoal ? <Edit2 size={15} /> : <Plus size={15} />}
            >
              {isSubmitting ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border px-3 py-3 text-sm outline-none"
        style={{
          background: 'var(--color-surface-raised)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section
      className="rounded-[28px] border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4">
        <h4 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function MiniPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)',
      }}
    >
      <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
      {label}
    </span>
  );
}

function PreviewStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="rounded-2xl border px-3 py-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const toneColor =
    tone === 'success'
      ? 'var(--color-success)'
      : tone === 'danger'
        ? 'var(--color-danger)'
        : 'var(--color-text-secondary)';

  return (
    <div
      className="rounded-2xl border px-3 py-3"
      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-bold" style={{ color: toneColor }}>
        {value}
      </p>
    </div>
  );
}

function ProgressRing({ progress, color, size = 72 }: { progress: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamp(progress, 0, 100) / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
      {/* progress arc — starts from top via rotate(-90) */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* label — plain SVG text, no CSS transform needed */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 13,
          fontWeight: 900,
          fill: 'var(--color-text-primary)',
          fontFamily: 'inherit',
        }}
      >
        {clamp(progress, 0, 100)}%
      </text>
    </svg>
  );
}

function LinkPicker({
  title,
  items,
  selectedIds,
  onToggle,
}: {
  title: string;
  items: Array<{ id: string; label: string; meta?: string }>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {selectedIds.size} selected
        </span>
      </div>
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Nothing to link yet.
          </p>
        ) : (
          items.map((item) => {
            const checked = selectedIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left"
                style={{
                  background: checked
                    ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                    : 'var(--color-surface)',
                  borderColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {item.label}
                  </p>
                  {item.meta && (
                    <p className="truncate text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {item.meta}
                    </p>
                  )}
                </div>
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full border"
                  style={{
                    borderColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
                    color: checked ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {checked && <CheckCircle2 size={10} />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
