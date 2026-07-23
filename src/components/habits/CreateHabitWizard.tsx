import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SkipDaysPicker } from './SkipDaysPicker';
import { getCategory } from '../../features/habits/Habitpresentation';
import { useCreateHabit } from '../../features/habits/hooks/useHabits';

const STEPS = ['Name', 'Reminder', 'Duration', 'Skip Days'];
const STEP_ICONS = ['📝', '⏰', '🎯', '📅'];

interface CreateHabitWizardProps {
  open: boolean;
  onClose: () => void;
}

export function CreateHabitWizard({ open, onClose }: CreateHabitWizardProps) {
  const createHabit = useCreateHabit();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [durationMode, setDurationMode] = useState<'days' | 'forever'>('forever');
  const [skipDays, setSkipDays] = useState<number[]>([]);

  const previewCategory = title.trim() ? getCategory(title) : null;

  const canNext = () => {
    switch (step) {
      case 0: return title.trim().length > 0;
      case 1: return true; // Reminder is optional
      case 2: return true; // Duration is optional
      case 3: return true; // Skip days is optional
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = () => {
    createHabit.mutate(
      {
        title: title.trim(),
        reminderTime: reminderTime || undefined,
        reminderMessage: reminderMessage || undefined,
        durationDays: durationMode === 'days' ? durationDays : null,
        skipDays: skipDays.length > 0 ? skipDays : undefined,
      },
      {
        onSuccess: () => {
          setStep(0);
          setTitle('');
          setReminderTime('');
          setReminderMessage('');
          setDurationDays(null);
          setDurationMode('forever');
          setSkipDays([]);
          onClose();
        },
      }
    );
  };

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-accent)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-[11px] font-bold text-text-muted whitespace-nowrap">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-between px-0.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                i <= step ? 'text-white' : 'text-text-muted'
              }`}
              style={{
                background: i <= step ? 'var(--gradient-accent)' : 'var(--color-surface)',
                border: i > step ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {STEP_ICONS[i]}
            </div>
            <span
              className="text-[9px] font-semibold"
              style={{ color: i <= step ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[200px]"
        >
          {step === 0 && (
            <div>
              <Input
                id="wizard-title"
                label="Habit name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Read 30 minutes"
                autoFocus
              />
              {previewCategory && (
                <motion.div
                  className="flex items-center gap-1.5 mt-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: previewCategory.bg, color: previewCategory.color }}
                  >
                    <previewCategory.icon size={11} />
                  </div>
                  <p className="text-[11px] font-bold text-text-muted">
                    Detected: <span style={{ color: previewCategory.color }}>{previewCategory.name}</span>
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Input
                id="wizard-reminder"
                label="Reminder time (optional)"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
              <Input
                id="wizard-reminder-msg"
                label="Reminder message (optional)"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="This will be the email subject / notification title"
              />
              <p className="text-[11px] text-text-muted leading-relaxed">
                If you set a reminder time, you'll receive a notification or email at that time.
                The message will be used as the title.
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
                How long will this habit run?
              </label>
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setDurationMode('forever')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    durationMode === 'forever' ? 'text-white shadow-lg' : 'text-text-secondary border'
                  }`}
                  style={
                    durationMode === 'forever'
                      ? { background: 'var(--gradient-accent)' }
                      : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
                  }
                >
                  Forever
                </button>
                <button
                  type="button"
                  onClick={() => setDurationMode('days')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    durationMode === 'days' ? 'text-white shadow-lg' : 'text-text-secondary border'
                  }`}
                  style={
                    durationMode === 'days'
                      ? { background: 'var(--gradient-accent)' }
                      : { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
                  }
                >
                  Set duration
                </button>
              </div>

              {durationMode === 'days' && (
                <div>
                  <label className="text-[11px] font-semibold text-text-muted mb-1.5 block">
                    Number of days
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={durationDays ?? ''}
                      onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      placeholder="e.g. 30"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-2">
                    The habit will auto-deactivate once you've completed it for this many days.
                  </p>
                </div>
              )}

              {durationMode === 'forever' && (
                <p className="text-[11px] text-text-muted">
                  No time limit — keep going as long as you like!
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <SkipDaysPicker value={skipDays} onChange={setSkipDays} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-2">
        {step > 0 ? (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canNext()} className="flex-1">
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={createHabit.isPending}
            disabled={!canNext()}
            className="flex-1"
          >
            Create Habit
          </Button>
        )}
      </div>
    </div>
  );
}