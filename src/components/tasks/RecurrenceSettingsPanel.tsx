/**
 * RecurrenceSettingsPanel
 *
 * A self-contained, fully-controlled panel that renders the Repeat Settings
 * section for both CreateTaskModal and EditTaskModal.
 *
 * Props
 * ──────
 * value        – current TaskRecurrenceConfig or null (null = disabled / "None")
 * onChange     – called whenever any field changes; passes the new config or null
 * startsAtHint – ISO date string from the parent's Due Date field; used to
 *                populate the Starts date when the user first enables recurrence
 */

import React, { useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  TaskRecurrenceConfig,
  TaskRecurrenceFrequency,
  TaskRecurrenceEndsType,
  TaskRecurrenceRepeatBasedOn,
  TaskRecurrenceMissedBehavior,
  TaskRecurrenceGenerateNext,
  TaskRecurrenceMonthlyMode,
} from '../../types';

// ─── constants ───────────────────────────────────────────────────────────────

export type RecurrenceFrequencyOption = 'none' | TaskRecurrenceFrequency;

const FREQ_OPTIONS: { value: RecurrenceFrequencyOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

const WEEKDAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_OF_MONTH_OPTIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' },
];

const WEEKDAY_LONG: { key: string; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns the default config when a frequency is first selected */
function defaultConfig(freq: TaskRecurrenceFrequency, startsAt: string | null): TaskRecurrenceConfig {
  const today = new Date().toISOString().split('T')[0];
  const base: TaskRecurrenceConfig = {
    enabled: true,
    frequency: freq,
    interval: 1,
    startsAt: startsAt || today,
    endsType: 'never',
    endsAt: null,
    occurrenceCount: null,
    repeatBasedOn: 'dueDate',
    missedBehavior: 'skip',
    generateNext: 'onCompletion',
  };
  if (freq === 'week') {
    // Default weekday to the day of the starts date
    const d = new Date((startsAt || today) + 'T00:00:00');
    base.weekdays = [WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1].key];
  }
  if (freq === 'month') {
    const d = new Date((startsAt || today) + 'T00:00:00');
    base.monthlyMode = 'dayOfMonth';
    base.dayOfMonth = d.getDate();
  }
  if (freq === 'year') {
    const d = new Date((startsAt || today) + 'T00:00:00');
    base.startsAt = startsAt || today;
    // yearMonth / yearDay stored via startsAt derivation at submit time
    (base as any)._yearMonth = d.getMonth() + 1;
    (base as any)._yearDay = d.getDate();
  }
  return base;
}

/** Ordinal suffix: 1 → "1st", 2 → "2nd" etc. */
function ordinal(n: number): string {
  const abs = Math.abs(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = abs % 100;
  return abs + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── sub-components ───────────────────────────────────────────────────────────

const iStyle: React.CSSProperties = {
  background: 'var(--color-surface-raised)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
};
const iCls =
  'w-full rounded-xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all';

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </p>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <RowLabel>{label}</RowLabel>
      {children}
    </div>
  );
}

function FreqChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95"
      style={
        active
          ? { background: 'var(--color-accent)', color: 'white' }
          : {
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }
      }
    >
      {children}
    </button>
  );
}

function WeekdayToggle({ days, onChange }: { days: string[]; onChange: (days: string[]) => void }) {
  const toggle = (key: string) => {
    onChange(days.includes(key) ? days.filter((d) => d !== key) : [...days, key]);
  };
  return (
    <div className="flex gap-1.5 flex-wrap">
      {WEEKDAYS.map(({ key, label }) => {
        const active = days.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all"
            style={
              active
                ? { background: 'var(--color-accent)', color: 'white' }
                : {
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                  }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── validation helper ───────────────────────────────────────────────────────

export function validateRecurrenceConfig(cfg: TaskRecurrenceConfig | null): string | null {
  if (!cfg || !cfg.enabled) return null;
  if (!cfg.startsAt) return 'Start date is required for recurring tasks.';
  if (cfg.interval < 1 || !Number.isInteger(cfg.interval)) return 'Interval must be a whole number of 1 or more.';
  if (cfg.frequency === 'week' && (!cfg.weekdays || cfg.weekdays.length === 0))
    return 'Select at least one day of the week.';
  if (cfg.frequency === 'month' && cfg.monthlyMode === 'dayOfMonth') {
    const d = cfg.dayOfMonth;
    if (d !== -1 && (d == null || d < 1 || d > 31)) return 'Day of month must be between 1 and 31 (or Last Day).';
  }
  if (cfg.endsType === 'occurrences') {
    if (!cfg.occurrenceCount || cfg.occurrenceCount < 1) return 'Occurrence count must be at least 1.';
  }
  if (cfg.endsType === 'date' && cfg.endsAt && cfg.startsAt) {
    if (cfg.endsAt <= cfg.startsAt) return 'End date must be after start date.';
  }
  return null;
}

// ─── main export ─────────────────────────────────────────────────────────────

export interface RecurrenceSettingsPanelProps {
  value: TaskRecurrenceConfig | null;
  onChange: (config: TaskRecurrenceConfig | null) => void;
  /** ISO date string from the parent's Due Date field */
  startsAtHint?: string;
}

export function RecurrenceSettingsPanel({ value, onChange, startsAtHint }: RecurrenceSettingsPanelProps) {
  const activeFreq: RecurrenceFrequencyOption = value?.enabled ? value.frequency : 'none';

  const patch = useCallback(
    (partial: Partial<TaskRecurrenceConfig>) => {
      if (!value) return;
      onChange({ ...value, ...partial });
    },
    [value, onChange]
  );

  const handleFrequencySelect = (freq: RecurrenceFrequencyOption) => {
    if (freq === 'none') {
      onChange(null);
      return;
    }
    if (value?.frequency === freq) return; // already selected
    onChange(defaultConfig(freq as TaskRecurrenceFrequency, startsAtHint ?? null));
  };

  const validationError = validateRecurrenceConfig(value);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Frequency chips ─────────────────────────────────────── */}
      <FieldGroup label="Repeat">
        <div className="grid grid-cols-5 gap-2">
          {FREQ_OPTIONS.map(({ value: v, label }) => (
            <FreqChip key={v} active={activeFreq === v} onClick={() => handleFrequencySelect(v)}>
              {label}
            </FreqChip>
          ))}
        </div>
      </FieldGroup>

      {/* ── Settings panel — only shown when a frequency is active ── */}
      {value?.enabled && (
        <div
          className="rounded-2xl border flex flex-col gap-4 p-4"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface-raised))',
            borderColor: 'color-mix(in srgb, var(--color-accent) 20%, var(--color-border))',
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
            Repeat Settings
          </p>

          {/* Every X <unit> */}
          <FieldGroup label={`Every`}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={999}
                value={value.interval}
                onChange={(e) => {
                  const v = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  patch({ interval: v });
                }}
                className="w-20 rounded-xl border px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                style={iStyle}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {value.frequency === 'day' && (value.interval === 1 ? 'Day' : 'Days')}
                {value.frequency === 'week' && (value.interval === 1 ? 'Week' : 'Weeks')}
                {value.frequency === 'month' && (value.interval === 1 ? 'Month' : 'Months')}
                {value.frequency === 'year' && (value.interval === 1 ? 'Year' : 'Years')}
              </span>
            </div>
          </FieldGroup>

          {/* ── Weekly: day-of-week picker ─────────────────────── */}
          {value.frequency === 'week' && (
            <FieldGroup label="Days of week">
              <WeekdayToggle days={value.weekdays ?? []} onChange={(days) => patch({ weekdays: days })} />
              {(!value.weekdays || value.weekdays.length === 0) && (
                <p className="mt-1.5 text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
                  Select at least one day.
                </p>
              )}
            </FieldGroup>
          )}

          {/* ── Monthly: day-of-month vs weekday pattern ────────── */}
          {value.frequency === 'month' && (
            <FieldGroup label="Repeat on">
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['dayOfMonth', 'weekdayPattern'] as TaskRecurrenceMonthlyMode[]).map((m) => (
                  <FreqChip key={m} active={value.monthlyMode === m} onClick={() => patch({ monthlyMode: m })}>
                    {m === 'dayOfMonth' ? 'Day of month' : 'Weekday pattern'}
                  </FreqChip>
                ))}
              </div>

              {value.monthlyMode === 'dayOfMonth' && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={value.dayOfMonth ?? 1}
                      onChange={(e) => patch({ dayOfMonth: Number(e.target.value) })}
                      className={`${iCls} appearance-none pr-8`}
                      style={iStyle}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {ordinal(d)}
                        </option>
                      ))}
                      <option value={-1}>Last day</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                  </div>
                  <span className="text-sm font-medium shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    of each month
                  </span>
                </div>
              )}

              {value.monthlyMode === 'weekdayPattern' && (
                <div className="grid grid-cols-2 gap-2">
                  {/* Week of month */}
                  <div className="relative">
                    <select
                      value={value.weekOfMonth ?? 1}
                      onChange={(e) => patch({ weekOfMonth: Number(e.target.value) })}
                      className={`${iCls} appearance-none pr-8`}
                      style={iStyle}
                    >
                      {WEEK_OF_MONTH_OPTIONS.map(({ value: v, label }) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                  </div>
                  {/* Weekday */}
                  <div className="relative">
                    <select
                      value={value.weekday ?? 'monday'}
                      onChange={(e) => patch({ weekday: e.target.value })}
                      className={`${iCls} appearance-none pr-8`}
                      style={iStyle}
                    >
                      {WEEKDAY_LONG.map(({ key, label }) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                  </div>
                </div>
              )}
            </FieldGroup>
          )}

          {/* ── Yearly: month + day ─────────────────────────────── */}
          {value.frequency === 'year' && (
            <FieldGroup label="On">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={value.startsAt ? new Date(value.startsAt + 'T00:00:00').getMonth() + 1 : 1}
                    onChange={(e) => {
                      const d = value.startsAt ? new Date(value.startsAt + 'T00:00:00') : new Date();
                      d.setMonth(Number(e.target.value) - 1);
                      patch({ startsAt: d.toISOString().split('T')[0] });
                    }}
                    className={`${iCls} appearance-none pr-8`}
                    style={iStyle}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={value.startsAt ? new Date(value.startsAt + 'T00:00:00').getDate() : 1}
                  onChange={(e) => {
                    const d = value.startsAt ? new Date(value.startsAt + 'T00:00:00') : new Date();
                    d.setDate(Math.max(1, Math.min(31, Number(e.target.value) || 1)));
                    patch({ startsAt: d.toISOString().split('T')[0] });
                  }}
                  placeholder="Day"
                  className={iCls}
                  style={iStyle}
                />
              </div>
              {value.startsAt &&
                new Date(value.startsAt + 'T00:00:00').getMonth() === 1 &&
                new Date(value.startsAt + 'T00:00:00').getDate() === 29 && (
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--color-warning)' }}>
                    Feb 29 only occurs in leap years — non-leap years will be skipped.
                  </p>
                )}
            </FieldGroup>
          )}

          {/* ── Starts ──────────────────────────────────────────── */}
          <FieldGroup label="Starts">
            <input
              type="date"
              value={value.startsAt ?? ''}
              onChange={(e) => patch({ startsAt: e.target.value || null })}
              className={iCls}
              style={iStyle}
              required
            />
            {!value.startsAt && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                Start date is required.
              </p>
            )}
          </FieldGroup>

          {/* ── Ends ────────────────────────────────────────────── */}
          <FieldGroup label="Ends">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(['never', 'date', 'occurrences'] as TaskRecurrenceEndsType[]).map((t) => (
                <FreqChip
                  key={t}
                  active={value.endsType === t}
                  onClick={() => patch({ endsType: t, endsAt: null, occurrenceCount: null })}
                >
                  {t === 'never' ? 'Never' : t === 'date' ? 'On date' : 'After X times'}
                </FreqChip>
              ))}
            </div>
            {value.endsType === 'date' && (
              <>
                <input
                  type="date"
                  value={value.endsAt ?? ''}
                  min={value.startsAt ?? undefined}
                  onChange={(e) => patch({ endsAt: e.target.value || null })}
                  className={iCls}
                  style={iStyle}
                />
                {value.endsAt && value.startsAt && value.endsAt <= value.startsAt && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                    End date must be after start date.
                  </p>
                )}
              </>
            )}
            {value.endsType === 'occurrences' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={value.occurrenceCount ?? ''}
                  onChange={(e) => patch({ occurrenceCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  placeholder="e.g. 20"
                  className="w-28 rounded-xl border px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                  style={iStyle}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  occurrences
                </span>
              </div>
            )}
          </FieldGroup>

          {/* ── Monthly day-31 hint ──────────────────────────────── */}
          {value.frequency === 'month' && value.monthlyMode === 'dayOfMonth' && value.dayOfMonth === 31 && (
            <p className="text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
              Months shorter than 31 days (e.g. Feb, Apr) will be skipped.
            </p>
          )}

          {/* ── Advanced section ─────────────────────────────────── */}
          <details className="group">
            <summary
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold uppercase tracking-wider list-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <ChevronDown
                size={13}
                className="transition-transform group-open:rotate-180"
                style={{ color: 'var(--color-text-muted)' }}
              />
              Advanced options
            </summary>

            <div className="mt-3 flex flex-col gap-4">
              {/* Repeat based on */}
              <FieldGroup label="Repeat based on">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { v: 'dueDate', label: 'Due date' },
                      { v: 'completionDate', label: 'Completion date' },
                    ] as { v: TaskRecurrenceRepeatBasedOn; label: string }[]
                  ).map(({ v, label }) => (
                    <FreqChip key={v} active={value.repeatBasedOn === v} onClick={() => patch({ repeatBasedOn: v })}>
                      {label}
                    </FreqChip>
                  ))}
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {value.repeatBasedOn === 'completionDate'
                    ? 'Next occurrence counts from when you complete this one.'
                    : 'Next occurrence always counts from the original due date.'}
                </p>
              </FieldGroup>

              {/* Missed occurrence behavior */}
              <FieldGroup label="If a task is missed">
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      { v: 'skip', label: 'Skip it', sub: 'Missed dates are ignored; only future tasks appear.' },
                      { v: 'overdue', label: 'Keep as overdue', sub: 'Missed tasks stay visible until resolved.' },
                      {
                        v: 'createNext',
                        label: 'Create both missed & next',
                        sub: 'Missed + upcoming task both appear in your list.',
                      },
                    ] as { v: TaskRecurrenceMissedBehavior; label: string; sub: string }[]
                  ).map(({ v, label, sub }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => patch({ missedBehavior: v })}
                      className="flex items-start gap-3 rounded-xl border p-3 text-left transition-all"
                      style={
                        value.missedBehavior === v
                          ? {
                              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                              borderColor: 'var(--color-accent)',
                            }
                          : { background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }
                      }
                    >
                      <div
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center"
                        style={
                          value.missedBehavior === v
                            ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent)' }
                            : { borderColor: 'var(--color-border)' }
                        }
                      >
                        {value.missedBehavior === v && (
                          <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'white' }} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {label}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {sub}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {/* Generate next occurrence */}
              <FieldGroup label="Generate next occurrence">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { v: 'onCompletion', label: 'On completion' },
                      { v: 'onDueDate', label: 'When due' },
                    ] as { v: TaskRecurrenceGenerateNext; label: string }[]
                  ).map(({ v, label }) => (
                    <FreqChip key={v} active={value.generateNext === v} onClick={() => patch({ generateNext: v })}>
                      {label}
                    </FreqChip>
                  ))}
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {value.generateNext === 'onDueDate'
                    ? 'Next task is created only when the current one becomes due.'
                    : 'Next task is created immediately when you complete this one.'}
                </p>
              </FieldGroup>
            </div>
          </details>

          {/* ── Validation error ─────────────────────────────────── */}
          {validationError && (
            <div
              className="rounded-xl px-3 py-2 text-xs font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                color: 'var(--color-danger)',
                border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)',
              }}
            >
              {validationError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
