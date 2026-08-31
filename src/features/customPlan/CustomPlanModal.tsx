// frontend/src/features/customPlan/CustomPlanModal.tsx
// The guided, one-question-at-a-time Custom Plan flow.
//
// Flow: Intro → (adaptive questions) → Review → Success. One question is shown at
// a time, next questions depend on prior answers, back navigation preserves
// answers, and changing an earlier answer recalculates downstream questions.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { useUserPlan } from '../billing/useUserPlan';
import { useCustomPlanModalStore } from '../../store/customPlanModalStore';
import {
  computeSequence,
  reconcileAnswers,
  buildPayload,
  limitKeyOf,
} from './customPlanEngine';
import type { Answers, LimitChoice, Question } from './customPlanEngine';
import {
  availableBooleanFeatures,
  availableNumericFeatures,
  formatLimit,
  booleanMeta,
  numericMeta,
} from './customPlanFeature';
import { submitCustomPlanRequest } from './customPlanApi';
import type { CustomPlanRequestDTO } from './customPlanApi';

type Stage = 'intro' | 'question' | 'review' | 'success' | 'failed';

const LIMIT_OPTIONS: { mode: LimitChoice['mode']; label: string; hint: string }[] = [
  { mode: 'keep', label: 'Keep as is', hint: 'The current limit is fine' },
  { mode: 'x2', label: '2× more', hint: 'Double your current limit' },
  { mode: 'x5', label: '5× more', hint: 'Five times your current limit' },
  { mode: 'x10', label: '10× more', hint: 'Ten times your current limit' },
  { mode: 'custom', label: 'Something specific', hint: 'Enter an exact number' },
];

/** True when a question has been answered (optional questions count as answered). */
function isQuestionAnswered(q: Question, answers: Answers): boolean {
  switch (q.id) {
    case 'direction':
      return !!answers.direction;
    case 'limitAreas':
      return (answers.limitAreas?.length ?? 0) > 0;
    case 'featureSelection':
      return (answers.featureSelections?.length ?? 0) > 0;
    case 'goal':
      return !!answers.goal?.trim();
    case 'hurdles':
      return q.optional ? true : !!answers.hurdles?.trim();
    case 'otherNotes':
      return q.optional ? true : !!answers.otherNotes?.trim();
    default:
      if (limitKeyOf(q.id)) {
        const key = limitKeyOf(q.id)!;
        return !!answers.limitLevels?.[key];
      }
      return false;
  }
}

/** Index of the first question a user still needs to answer (-1 if all done). */
function firstUnansweredIndex(seq: Question[], answers: Answers): number {
  return seq.findIndex((q) => !isQuestionAnswered(q, answers));
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}
export function CustomPlanModal() {
  const isOpen = useCustomPlanModalStore((s) => s.isOpen);
  const closeCustomPlan = useCustomPlanModalStore((s) => s.closeCustomPlan);
  const reduced = useReducedMotion();

  const { effectivePlan } = useUserPlan();
  const features = (effectivePlan?.features ?? {}) as Record<string, unknown>;

  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CustomPlanRequestDTO | null>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // Reset the whole flow whenever the modal (re)opens.
  useEffect(() => {
    if (isOpen) {
      setStage('intro');
      setAnswers({});
      setStepIndex(0);
      setSubmitError(null);
      setCreated(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  // Recompute the question sequence whenever answers change (data-driven).
  const sequence = useMemo(() => computeSequence(answers, features), [answers, features]);

  const featureSelections = useMemo(
    () => [...new Set(answers.featureSelections ?? [])],
    [answers.featureSelections]
  );

  /** Update answers, reconcile downstream dependencies, then position the pointer. */
  const setAnswer = (patch: Partial<Answers>) => {
    const next = reconcileAnswers({ ...answers, ...patch }, features);
    setAnswers(next);

    // Multi-select questions (limit areas, feature selection) and free-text
    // questions (goal, hurdles, other notes) let the user keep answering without
    // being bounced. Stay on the question; pressing Continue advances. Only
    // single-select choice questions auto-advance on the first selection.
    const currentQ = sequence[stepIndex];
    if (
      currentQ &&
      (currentQ.id === 'limitAreas' ||
        currentQ.id === 'featureSelection' ||
        currentQ.id === 'goal' ||
        currentQ.id === 'hurdles' ||
        currentQ.id === 'otherNotes')
    ) {
      return;
    }

    const nextSeq = computeSequence(next, features);
    const nextIndex = firstUnansweredIndex(nextSeq, next);
    if (nextIndex >= 0) {
      // Move forward to the next unanswered question (never backwards).
      setStepIndex(Math.max(nextIndex, Math.min(stepIndex + 1, nextSeq.length - 1)));
    } else {
      setStepIndex(nextSeq.length - 1);
    }
  };

  const handleContinue = () => {
    const q = sequence[stepIndex];
    if (!q) {
      setStage('review');
      return;
    }
    if (!q.optional && !isQuestionAnswered(q, answers)) {
      setSubmitError('Please choose an option to continue.');
      return;
    }
    setSubmitError(null);
    const nextIndex = firstUnansweredIndex(sequence, answers);
    if (nextIndex < 0 || nextIndex >= sequence.length) {
      setStage('review');
      setStepIndex(sequence.length - 1);
    } else {
      setStepIndex(nextIndex);
      announceRef.current?.focus();
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    if (stage === 'review') {
      setStage('question');
      setStepIndex(sequence.length - 1);
      return;
    }
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      setStage('intro');
    }
    announceRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildPayload(reconcileAnswers(answers, features), features);
      const request = await submitCustomPlanRequest(payload);
      setCreated(request);
      setStage('success');
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.error?.message || 'We couldn\u2019t submit your request. Please try again.'
      );
      setStage('failed');
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => closeCustomPlan();

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={close} title="Custom Plan" maxWidth="max-w-2xl">
      <div className="min-h-[440px] flex flex-col">
        {stage === 'question' && (
          <ProgressBar sequence={sequence} answers={answers} stepIndex={stepIndex} reduced={reduced} />
        )}

        <div
          ref={announceRef}
          tabIndex={-1}
          className="sr-only focus:outline-none"
          aria-live="assertive"
          role="status"
        >
          {stage === 'question' && sequence[stepIndex]
            ? `Step ${Math.min(stepIndex + 1, sequence.length)} of ${sequence.length}: ${sequence[stepIndex].title}`
            : ''}
        </div>

        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <IntroScreen
              key="intro"
              planName={effectivePlan?.planName ?? 'Free'}
              onStart={() => {
                setStage('question');
                setStepIndex(0);
                announceRef.current?.focus();
              }}
              reduced={reduced}
            />
          )}

          {stage === 'question' && sequence[stepIndex] && (
            <QuestionScreen
              key={sequence[stepIndex].id}
              question={sequence[stepIndex]}
              stepIndex={stepIndex}
              totalSteps={sequence.length}
              answers={answers}
              features={features}
              featureSelections={featureSelections}
              onAnswer={setAnswer}
              onBack={handleBack}
              onContinue={handleContinue}
              reduced={reduced}
              error={submitError}
            />
          )}

          {stage === 'review' && (
            <ReviewScreen
              key="review"
              answers={reconcileAnswers(answers, features)}
              features={features}
              planName={effectivePlan?.planName ?? 'Free'}
              submitting={submitting}
              onBack={handleBack}
              onSubmit={handleSubmit}
              reduced={reduced}
            />
          )}

          {stage === 'success' && (
            <SuccessScreen key="success" request={created} onDone={close} reduced={reduced} />
          )}

          {stage === 'failed' && (
            <FailedScreen
              key="failed"
              message={submitError}
              onBack={() => setStage('question')}
              onRetry={handleSubmit}
              reduced={reduced}
            />
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
function ProgressBar({
  sequence,
  answers,
  stepIndex,
  reduced,
}: {
  sequence: Question[];
  answers: Answers;
  stepIndex: number;
  reduced: boolean;
}) {
  const answered = sequence.filter((q) => isQuestionAnswered(q, answers)).length;
  const pct = sequence.length === 0 ? 0 : (answered / sequence.length) * 100;
  return (
    <div className="px-1 pb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
          {answered < sequence.length ? `Step ${Math.min(stepIndex + 1, sequence.length)} of ${sequence.length}` : 'Almost there'}
        </span>
        <span className="text-[11px] text-text-muted">{Math.round(pct)}%</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-surface-raised border border-border overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--gradient-accent)' }}
          initial={false}
          animate={{ width: `${reduced ? pct : Math.max(6, pct)}%` }}
          transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function IntroScreen({
  planName,
  onStart,
  reduced,
}: {
  planName: string;
  onStart: () => void;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col items-center text-center px-2 pt-2"
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -12 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
    >
      <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent mb-4">
        <Wand2 className="w-6 h-6" />
      </div>
      <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">
        Let’s build a plan around what you need
      </h3>
      <p className="text-sm text-text-muted mt-2 max-w-md leading-relaxed">
        You’re currently on <span className="font-bold text-text-primary">{planName}</span>. Answer a
        few short questions and we’ll prepare a custom plan request for you. It takes about a minute.
      </p>
      <div className="mt-8 w-full max-w-xs">
        <Button size="lg" fullWidth onClick={onStart} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Start
        </Button>
      </div>
    </motion.div>
  );
}
function OptionButton({
  selected,
  onSelect,
  label,
  hint,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        selected
          ? 'border-accent bg-accent-subtle shadow-sm'
          : 'border-border bg-surface-raised hover:border-border-strong'
      }`}
    >
      <span className="flex items-center gap-3">
        {icon && <span className="text-accent shrink-0">{icon}</span>}
        <span className="flex-1">
          <span className="block text-sm font-bold text-text-primary">{label}</span>
          {hint && <span className="block text-xs text-text-muted mt-0.5">{hint}</span>}
        </span>
        {selected && <Check className="w-4 h-4 text-accent shrink-0" />}
      </span>
    </button>
  );
}

function DirectionOptions({
  value,
  onSelect,
}: {
  value?: Answers['direction'];
  onSelect: (d: Answers['direction']) => void;
}) {
  const options: { id: Answers['direction']; label: string; hint: string }[] = [
    { id: 'limits', label: 'I need higher limits', hint: 'More projects, habits, tasks, AI requests or storage' },
    { id: 'features', label: 'I need features I don\u2019t have', hint: 'Unlock capabilities not in my current plan' },
    { id: 'both', label: 'A combination of both', hint: 'Higher limits and additional features' },
  ];
  return (
    <div className="space-y-3">
      {options.map((o) => (
        <OptionButton
          key={o.id}
          selected={value === o.id}
          onSelect={() => onSelect(o.id)}
          label={o.label}
          hint={o.hint}
        />
      ))}
      <OptionButton
        selected={value === 'unsure'}
        onSelect={() => onSelect('unsure')}
        label="I’m not sure — help me figure it out"
        hint="We’ll ask a couple of simpler questions about what you want to accomplish"
      />
    </div>
  );
}

function NumericMultiSelect({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  const items = availableNumericFeatures();
  return (
    <div className="space-y-3">
      {items.map((meta) => (
        <OptionButton
          key={meta.key}
          selected={selected.includes(meta.key)}
          onSelect={() => onToggle(meta.key)}
          label={meta.label}
          hint={meta.hint}
        />
      ))}
    </div>
  );
}

function BooleanMultiSelect({
  selected,
  features,
  onToggle,
}: {
  selected: string[];
  features: Record<string, unknown>;
  onToggle: (key: string) => void;
}) {
  const items = availableBooleanFeatures(features);
  if (items.length === 0) {
    return (
      <div className="text-sm text-text-muted">
        Your current plan already includes every available feature. You can still request higher limits or add a
        note below.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((meta) => (
        <OptionButton
          key={meta.key}
          selected={selected.includes(meta.key)}
          onSelect={() => onToggle(meta.key)}
          label={meta.label}
          hint={meta.hint}
        />
      ))}
    </div>
  );
}

function LimitLevelEditor({
  featureKey,
  current,
  value,
  onChange,
}: {
  featureKey: string;
  current?: number;
  value?: LimitChoice;
  onChange: (choice: LimitChoice) => void;
}) {
  const meta = numericMeta(featureKey);
  const label = meta?.label ?? featureKey;
  const suffix = meta?.suffix ?? '';

  return (
    <div className="space-y-3">
      {LIMIT_OPTIONS.map((opt) => (
        <OptionButton
          key={opt.mode}
          selected={value?.mode === opt.mode}
          onSelect={() => onChange({ mode: opt.mode, value: opt.mode === 'custom' ? value?.value : undefined })}
          label={opt.label}
          hint={
            opt.mode !== 'custom' && typeof current === 'number' && current !== -1
              ? opt.mode === 'keep'
                ? `Your current limit is ${current}${suffix}`
                : `${opt.label} → ${current * { x2: 2, x5: 5, x10: 10 }[opt.mode]}${suffix}`
              : opt.hint
          }
        />
      ))}
      {value?.mode === 'custom' && (
        <div className="pt-1">
          <Input
            id={`custom-limit-${featureKey}`}
            type="number"
            min={1}
            label={`Set your ${label.toLowerCase()} limit${suffix}`}
            placeholder={`e.g. ${typeof current === 'number' && current > 1 ? current * 3 : 1000}`}
            value={value.value ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({ mode: 'custom', value: Number.isFinite(n) && n > 0 ? n : undefined });
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
function QuestionScreen({
  question,
  stepIndex,
  totalSteps,
  answers,
  features,
  featureSelections,
  onAnswer,
  onBack,
  onContinue,
  reduced,
  error,
}: {
  question: Question;
  stepIndex: number;
  totalSteps: number;
  answers: Answers;
  features: Record<string, unknown>;
  featureSelections: string[];
  onAnswer: (patch: Partial<Answers>) => void;
  onBack: () => void;
  onContinue: () => void;
  reduced: boolean;
  error: string | null;
}) {
  const limitKey = limitKeyOf(question.id);

  return (
    <motion.div
      className="flex flex-col flex-1"
      initial={{ opacity: 0, x: reduced ? 0 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduced ? 0 : -16 }}
      transition={{ duration: reduced ? 0 : 0.22 }}
    >
      {/* Question heading */}
      <div className="mb-5">
        <h3 className="text-xl font-extrabold text-text-primary tracking-tight">{question.title}</h3>
        {question.subtitle && (
          <p className="text-xs font-semibold text-accent mt-1.5">{question.subtitle}</p>
        )}
        {question.description && (
          <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{question.description}</p>
        )}
      </div>

      {/* Answer controls */}
      <div className="flex-1 pb-5">
        {question.id === 'direction' && (
          <DirectionOptions
            value={answers.direction}
            onSelect={(d) => onAnswer({ direction: d })}
          />
        )}

        {question.id === 'limitAreas' && (
          <NumericMultiSelect
            selected={answers.limitAreas ?? []}
            onToggle={(key) => {
              const list = answers.limitAreas ?? [];
              onAnswer({ limitAreas: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] });
            }}
          />
        )}

        {limitKey && (
          <LimitLevelEditor
            featureKey={limitKey}
            current={typeof features[limitKey] === 'number' ? (features[limitKey] as number) : undefined}
            value={answers.limitLevels?.[limitKey]}
            onChange={(choice) =>
              onAnswer({ limitLevels: { ...(answers.limitLevels ?? {}), [limitKey]: choice } })
            }
          />
        )}

        {question.id === 'featureSelection' && (
          <BooleanMultiSelect
            selected={featureSelections}
            features={features}
            onToggle={(key) => {
              onAnswer({
                featureSelections: featureSelections.includes(key)
                  ? featureSelections.filter((k) => k !== key)
                  : [...featureSelections, key],
              });
            }}
          />
        )}

        {question.id === 'goal' && (
          <Textarea
            id="goal"
            aria-label="What are you trying to accomplish?"
            rows={3}
            placeholder="e.g. I want to manage a larger coaching roster and schedule recurring plans…"
            value={answers.goal ?? ''}
            onChange={(e) => onAnswer({ goal: e.target.value })}
            autoFocus
          />
        )}

        {question.id === 'hurdles' && (
          <Textarea
            id="hurdles"
            aria-label="Anything currently running into?"
            rows={3}
            placeholder="e.g. I keep hitting my AI request limit each month…"
            value={answers.hurdles ?? ''}
            onChange={(e) => onAnswer({ hurdles: e.target.value })}
          />
        )}

        {question.id === 'otherNotes' && (
          <Textarea
            id="otherNotes"
            aria-label="Other notes"
            rows={3}
            placeholder="Optional — anything else we should know about your ideal setup."
            value={answers.otherNotes ?? ''}
            onChange={(e) => onAnswer({ otherNotes: e.target.value })}
          />
        )}

        {error && (
          <p className="mt-3 text-xs text-danger flex items-center gap-1.5" role="alert">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* Actions — always reachable (Back / Continue) */}
      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <span className="text-[11px] text-text-muted">
          {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}
        </span>
        <Button onClick={onContinue} rightIcon={<ArrowRight className="w-4 h-4" />}>
          {question.optional ? 'Skip' : 'Continue'}
        </Button>
      </div>
    </motion.div>
  );
}
function ReviewScreen({
  answers,
  features,
  planName,
  submitting,
  onBack,
  onSubmit,
  reduced,
}: {
  answers: Answers;
  features: Record<string, unknown>;
  planName: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  reduced: boolean;
}) {
  const limits = buildPayload(answers, features).requestedLimits;
  const featuresList = answers.featureSelections ?? [];
  const req = buildPayload(answers, features).requirements;

  return (
    <motion.div
      className="flex flex-col flex-1"
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
    >
      <h3 className="text-xl font-extrabold text-text-primary tracking-tight">Here’s what you’ve requested</h3>
      <p className="text-sm text-text-muted mt-1">A quick summary before we send it over for review.</p>

      <div className="mt-5 space-y-4">
        <SummaryRow label="Current plan" value={planName} />

        {Object.keys(limits).length > 0 && (
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">Requested changes — limits</p>
            <ul className="space-y-1.5">
              {Object.entries(limits).map(([key, val]) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary font-medium">{numericMeta(key)?.label ?? key}</span>
                  <span className="text-text-secondary">{formatLimit(key, val)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {featuresList.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">Requested changes — features</p>
            <ul className="space-y-1.5">
              {featuresList.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm text-text-primary font-medium">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {booleanMeta(key)?.label ?? key}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(req.goal || req.hurdles || req.otherNotes) && (
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-2">Additional requirements</p>
            <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
              {req.goal && <p>{req.goal}</p>}
              {req.hurdles && <p>{req.hurdles}</p>}
              {req.otherNotes && <p>{req.otherNotes}</p>}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-accent-border bg-accent-subtle/40 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-1">Custom pricing</p>
          <p className="text-sm text-text-secondary leading-relaxed">
            We’ll review your requirements and prepare a custom price for your plan.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button onClick={onSubmit} loading={submitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Submit Request
        </Button>
      </div>
    </motion.div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-bold text-text-primary">{value}</span>
    </div>
  );
}

function SuccessScreen({
  request,
  onDone,
  reduced,
}: {
  request: CustomPlanRequestDTO | null;
  onDone: () => void;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col items-center text-center px-2 pt-2"
      initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
    >
      <div className="w-16 h-16 rounded-full bg-success/10 text-success border border-success/20 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">Request received</h3>
      <p className="text-sm text-text-muted mt-2 max-w-sm leading-relaxed">
        We’ve received your custom plan requirements. Our team will review them and prepare your custom plan.
      </p>
      {request?.id && (
        <div className="mt-4 px-4 py-2 rounded-full bg-surface-raised border border-border text-xs font-bold text-text-primary">
          Request #{request.id.slice(-6).toUpperCase()}
        </div>
      )}
      <div className="mt-8 w-full max-w-xs">
        <Button size="lg" fullWidth onClick={onDone}>
          Done
        </Button>
      </div>
    </motion.div>
  );
}

function FailedScreen({
  message,
  onBack,
  onRetry,
  reduced,
}: {
  message: string | null;
  onBack: () => void;
  onRetry: () => void;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col items-center text-center px-2 pt-2"
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
    >
      <div className="w-12 h-12 rounded-full bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-extrabold text-text-primary">We couldn’t submit your request</h3>
      <p className="text-sm text-text-muted mt-2 max-w-sm leading-relaxed">{message ?? 'Please try again.'}</p>
      <p className="text-xs text-text-muted mt-1">Your answers are saved — nothing was lost.</p>
      <div className="mt-7 flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onRetry}>Try Again</Button>
      </div>
    </motion.div>
  );
}