/**
 * frontend/src/components/tasks/RepeatSettings.tsx
 * Dynamic repeat settings section shown when a recurrence frequency is selected.
 */

import React from 'react';
import type { RecurrenceData } from '../../types';

const WEEKDAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_OPTIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' },
];

export type FrequencyOption = 'none' | 'day' | 'week' | 'month' | 'year';

export interface RepeatSettingsState {
  frequency: FrequencyOption;
  interval: number;
  weekdays: string[];
  monthlyMode: 'dayOfMonth' | 'weekdayPattern';
  dayOfMonth: number;
  weekOfMonth: number;
  weekday: string;
  month: number;
  day: number;
  startsAt: string;
  endsType: 'never' | 'date' | 'occurrences';
  endsAt: string;
  occurrenceCount: number;
}

export function getDefaultRepeatState(dueDate?: string): RepeatSettingsState {
  const today = new Date();
  const defaultStarts = dueDate || today.toISOString().split('T')[0];
  return {
    frequency: 'none',
    interval: 1,
    weekdays: [],
    monthlyMode: 'dayOfMonth',
    dayOfMonth: today.getDate(),
    weekOfMonth: 1,
    weekday: 'monday',
    month: today.getMonth() + 1,
    day: today.getDate(),
    startsAt: defaultStarts,
    endsType: 'never',
    endsAt: '',
    occurrenceCount: 10,
  };
}

export function buildRecurrenceData(state: RepeatSettingsState): RecurrenceData | null {
  if (state.frequency === 'none') return null;

  return {
    enabled: true,
    frequency: state.frequency as 'day' | 'week' | 'month' | 'year',
    interval: state.interval,
    weekdays: state.frequency === 'week' ? state.weekdays : undefined,
    monthlyMode: state.frequency === 'month' ? state.monthlyMode : undefined,
    dayOfMonth: state.frequency === 'month' && state.monthlyMode === 'dayOfMonth' ? state.dayOfMonth : undefined,
    weekOfMonth: state.frequency === 'month' && state.monthlyMode === 'weekdayPattern' ? state.weekOfMonth : undefined,
    weekday: state.frequency === 'month' && state.monthlyMode === 'weekdayPattern' ? state.weekday : undefined,
    month: state.frequency === 'year' ? state.month : undefined,
    day: state.frequency === 'year' ? state.day : undefined,
    startsAt: state.startsAt,
    endsType: state.endsType,
    endsAt: state.endsType === 'date' ? state.endsAt : undefined,
    occurrenceCount: state.endsType === 'occurrences' ? state.occurrenceCount : undefined,
    repeatBasedOn: 'dueDate',
    missedBehavior: 'skip',
    generateNext: 'onCompletion',
  };
}

interface RepeatSettingsProps {
  state: RepeatSettingsState;
  onChange: (state: RepeatSettingsState) => void;
}

export function RepeatSettings({ state, onChange }: RepeatSettingsProps) {
  const update = (partial: Partial<RepeatSettingsState>) => {
    onChange({ ...state, ...partial });
  };

  const inputCls =
    'w-full px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-accent transition-all';
  const inputStyle = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };
  const labelCls = 'block text-[10px] font-semibold mb-1';
  const labelStyle = { color: 'var(--color-text-muted)' };
  const btnCls = 'px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all';
  const btnActiveStyle = { background: 'var(--color-accent)', color: 'white' };
  const btnInactiveStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-4"
      style={{
        background: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border)',
      }}
    >
      <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Repeat Settings
      </p>

      {/* ── Frequency-specific fields ── */}
      {state.frequency === 'day' && (
        <div>
          <label className={labelCls} style={labelStyle}>
            Every X Days
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={state.interval}
            onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
            className={inputCls}
            style={inputStyle}
          />
        </div>
      )}

      {state.frequency === 'week' && (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>
              Every X Weeks
            </label>
            <input
              type="number"
              min={1}
              max={52}
              value={state.interval}
              onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>
              Days of Week
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {WEEKDAYS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const weekdays = state.weekdays.includes(key)
                      ? state.weekdays.filter((d) => d !== key)
                      : [...state.weekdays, key];
                    update({ weekdays });
                  }}
                  className={btnCls}
                  style={state.weekdays.includes(key) ? btnActiveStyle : btnInactiveStyle}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {state.frequency === 'month' && (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>
              Every X Months
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={state.interval}
              onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>
              Repeat Method
            </label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => update({ monthlyMode: 'dayOfMonth' })}
                className={btnCls}
                style={state.monthlyMode === 'dayOfMonth' ? btnActiveStyle : btnInactiveStyle}
              >
                Day of Month
              </button>
              <button
                type="button"
                onClick={() => update({ monthlyMode: 'weekdayPattern' })}
                className={btnCls}
                style={state.monthlyMode === 'weekdayPattern' ? btnActiveStyle : btnInactiveStyle}
              >
                Weekday Pattern
              </button>
            </div>
          </div>
          {state.monthlyMode === 'dayOfMonth' ? (
            <div>
              <label className={labelCls} style={labelStyle}>
                Day of Month
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={state.dayOfMonth === -1 ? '' : state.dayOfMonth}
                  onChange={(e) => update({ dayOfMonth: parseInt(e.target.value) || 1 })}
                  placeholder="1-31"
                  className={inputCls}
                  style={inputStyle}
                  disabled={state.dayOfMonth === -1}
                />
                <button
                  type="button"
                  onClick={() => update({ dayOfMonth: state.dayOfMonth === -1 ? 1 : -1 })}
                  className={btnCls}
                  style={state.dayOfMonth === -1 ? btnActiveStyle : btnInactiveStyle}
                >
                  Last Day
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls} style={labelStyle}>
                  Week of Month
                </label>
                <select
                  value={state.weekOfMonth}
                  onChange={(e) => update({ weekOfMonth: parseInt(e.target.value) })}
                  className={inputCls}
                  style={inputStyle}
                >
                  {WEEK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>
                  Day of Week
                </label>
                <select
                  value={state.weekday}
                  onChange={(e) => update({ weekday: e.target.value })}
                  className={inputCls}
                  style={inputStyle}
                >
                  {WEEKDAYS.map(({ key, label }) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </>
      )}

      {state.frequency === 'year' && (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>
              Month
            </label>
            <select
              value={state.month}
              onChange={(e) => update({ month: parseInt(e.target.value) })}
              className={inputCls}
              style={inputStyle}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>
              Day
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={state.day}
              onChange={(e) => update({ day: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </>
      )}

      {/* ── Common fields ── */}
      <div>
        <label className={labelCls} style={labelStyle}>
          Starts <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <input
          type="date"
          value={state.startsAt}
          onChange={(e) => update({ startsAt: e.target.value })}
          required
          className={inputCls}
          style={inputStyle}
        />
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>
          Ends
        </label>
        <div className="flex flex-wrap gap-2 mt-1">
          {(['never', 'date', 'occurrences'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => update({ endsType: opt })}
              className={btnCls}
              style={state.endsType === opt ? btnActiveStyle : btnInactiveStyle}
            >
              {opt === 'never' ? 'Never' : opt === 'date' ? 'On Date' : 'After X'}
            </button>
          ))}
        </div>
        {state.endsType === 'date' && (
          <input
            type="date"
            value={state.endsAt}
            onChange={(e) => update({ endsAt: e.target.value })}
            className={`${inputCls} mt-2`}
            style={inputStyle}
          />
        )}
        {state.endsType === 'occurrences' && (
          <input
            type="number"
            min={1}
            max={999}
            value={state.occurrenceCount}
            onChange={(e) => update({ occurrenceCount: Math.max(1, parseInt(e.target.value) || 1) })}
            className={`${inputCls} mt-2`}
            style={inputStyle}
            placeholder="Number of occurrences"
          />
        )}
      </div>
    </div>
  );
}