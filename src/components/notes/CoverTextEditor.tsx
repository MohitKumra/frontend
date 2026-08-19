/**
 * CoverTextEditor.tsx
 *
 * Full typography / style control panel for the book cover.
 * Rendered as the "Text Style" tab inside BookCoverPickerModal.
 *
 * Controls:
 *  Title:   font family, size (slider + input), color (swatch picker),
 *           weight (thin→black), alignment (L/C/R), text shadow, letter spacing
 *  Subtitle: color, size
 *  Author:  color
 *  Border:  show/hide, color
 *  Overlay: opacity slider (for custom photo covers)
 *  Reset:   one-click back to defaults
 */

import React, { useCallback } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Type,
  Minus,
  Plus,
} from 'lucide-react';
import type { CoverStyle } from '../../types';

// ─── Default values (used when a field is absent) ─────────────────────────

export const COVER_STYLE_DEFAULTS: Required<CoverStyle> = {
  templateId:         '',
  titleFont:          "Georgia, 'Times New Roman', serif",
  titleSize:          28,
  titleColor:         '#d4af37',
  titleWeight:        800,
  titleAlign:         'center',
  titleShadow:        true,
  titleItalic:        false,
  titlePosition:      'center',
  titleTransform:     'none',
  subtitleColor:      'rgba(244,232,216,0.75)',
  subtitleSize:       11,
  subtitleFont:       "Georgia, 'Times New Roman', serif",
  subtitleWeight:     400,
  subtitleAlign:      'center',
  authorColor:        'rgba(244,232,216,0.55)',
  authorFont:         "Georgia, 'Times New Roman', serif",
  authorSize:         10,
  authorWeight:       400,
  authorAlign:        'center',
  authorText:         '',
  showBorder:         true,
  borderColor:        'rgba(212,175,55,0.45)',
  borderWidth:        1,
  borderStyle:        'solid',
  dividerColor:       '#d4af37',
  showEmblem:         true,
  coverBackground:    '',
  overlayOpacity:     0.35,
  titleLetterSpacing: 0,
};

/** Available title fonts */
const TITLE_FONTS: { label: string; value: string }[] = [
  { label: 'Classic Serif',     value: "Georgia, 'Times New Roman', serif" },
  { label: 'Baskerville',       value: "Baskerville, Garamond, 'Palatino Linotype', serif" },
  { label: 'Modern Sans',       value: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: 'Handwritten',       value: "'Caveat', 'Comic Sans MS', cursive" },
  { label: 'Playfair Display',  value: "'Playfair Display', 'IM Fell English', 'Times New Roman', serif" },
  { label: 'Cinzel',            value: "Cinzel, 'Trajan Pro', 'Times New Roman', serif" },
  { label: 'Courier',           value: "'Courier New', Courier, monospace" },
];

/** Title font-weight presets */
const FONT_WEIGHTS: { label: string; value: number }[] = [
  { label: 'Thin',     value: 300 },
  { label: 'Regular',  value: 400 },
  { label: 'Medium',   value: 500 },
  { label: 'SemiBold', value: 600 },
  { label: 'Bold',     value: 700 },
  { label: 'ExtraBold',value: 800 },
  { label: 'Black',    value: 900 },
];

/** Quick-pick palette for title / subtitle / author / border colors */
const COLOR_SWATCHES = [
  '#d4af37', // gold
  '#ffffff',
  '#f4e8d8', // parchment
  '#ffcc66', // warm yellow
  '#f5c6c6', // pink blush
  '#a8d8ea', // sky blue
  '#b5ead7', // mint
  '#c9b1ff', // lavender
  '#ff8c69', // salmon
  '#ff6b6b', // red
  '#000000',
  '#3a281c', // dark brown
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="cte-section-label">{children}</div>
  );
}

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (c: string) => void;
  label: string;
}) {
  return (
    <div className="cte-color-row">
      <span className="cte-color-label">{label}</span>
      <div className="cte-swatches">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className={`cte-swatch ${value === c ? 'is-selected' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            title={c}
            aria-label={`Color ${c}`}
          />
        ))}
        {/* Native color input as "custom" option */}
        <label className="cte-swatch cte-swatch--custom" title="Custom color">
          <input
            type="color"
            value={value.startsWith('#') ? value : '#d4af37'}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <span style={{ fontSize: 10, lineHeight: 1 }}>+</span>
        </label>
      </div>
    </div>
  );
}

function NumberStepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = 'px',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="cte-stepper-row">
      <span className="cte-stepper-label">{label}</span>
      <div className="cte-stepper">
        <button
          type="button"
          className="cte-stepper-btn"
          onClick={() => onChange(clamp(value - step, min, max))}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={12} />
        </button>
        <input
          type="number"
          className="cte-stepper-input"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(clamp(n, min, max));
          }}
        />
        <span className="cte-stepper-unit">{unit}</span>
        <button
          type="button"
          className="cte-stepper-btn"
          onClick={() => onChange(clamp(value + step, min, max))}
          aria-label={`Increase ${label}`}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  return (
    <div className="cte-slider-row">
      <div className="cte-slider-header">
        <span className="cte-slider-label">{label}</span>
        <span className="cte-slider-value">{formatValue ? formatValue(value) : value}</span>
      </div>
      <input
        type="range"
        className="cte-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

// ─── Reusable controls ───────────────────────────────────────────────────────

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="cte-field">
      <label className="cte-field-label">{label}</label>
      <select
        className="cte-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {TITLE_FONTS.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="cte-field">
      <label className="cte-field-label">{label}</label>
      <div className="cte-segmented">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`cte-segmented-btn ${value === o.value ? 'is-active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="cte-toggle-row">
      <span className="cte-toggle-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`cte-toggle ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="cte-toggle-knob" />
      </button>
    </div>
  );
}

function AlignControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 'left' | 'center' | 'right';
  onChange: (v: 'left' | 'center' | 'right') => void;
}) {
  const options = [
    { val: 'left' as const, icon: <AlignLeft size={14} /> },
    { val: 'center' as const, icon: <AlignCenter size={14} /> },
    { val: 'right' as const, icon: <AlignRight size={14} /> },
  ];
  return (
    <div className="cte-field">
      <label className="cte-field-label">{label}</label>
      <div className="cte-align-btns">
        {options.map(({ val, icon }) => (
          <button
            key={val}
            type="button"
            className={`cte-align-btn ${value === val ? 'is-active' : ''}`}
            onClick={() => onChange(val)}
            aria-label={`Align ${val}`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function WeightSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="cte-field">
      <label className="cte-field-label">{label}</label>
      <div className="cte-weight-grid">
        {FONT_WEIGHTS.map((w) => (
          <button
            key={w.value}
            type="button"
            className={`cte-weight-btn ${value === w.value ? 'is-active' : ''}`}
            style={{ fontWeight: w.value }}
            onClick={() => onChange(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface CoverTextEditorProps {
  /** Current style — may be partial or null */
  value: CoverStyle;
  onChange: (updated: CoverStyle) => void;
}

export function CoverTextEditor({ value, onChange }: CoverTextEditorProps) {
  // Merge with defaults so every field is always defined for the UI
  const s: Required<CoverStyle> = { ...COVER_STYLE_DEFAULTS, ...value };

  const set = useCallback(
    <K extends keyof CoverStyle>(key: K, val: CoverStyle[K]) => {
      onChange({ ...value, [key]: val });
    },
    [value, onChange],
  );

  const reset = () => onChange({ ...COVER_STYLE_DEFAULTS });

  return (
    <div className="cte-root">
      {/* ── Title typography ─────────────────────────────────────── */}
      <div className="cte-group">
        <SectionLabel>
          <Type size={12} /> Title
        </SectionLabel>

        {/* Font family */}
        <div className="cte-field">
          <label className="cte-field-label">Font</label>
          <select
            className="cte-select"
            value={s.titleFont}
            onChange={(e) => set('titleFont', e.target.value)}
          >
            {TITLE_FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font size */}
        <Slider
          label="Size"
          value={s.titleSize}
          min={14}
          max={72}
          step={1}
          onChange={(v) => set('titleSize', v)}
          formatValue={(v) => `${v}px`}
        />

        {/* Color */}
        <ColorPicker
          label="Color"
          value={s.titleColor}
          onChange={(c) => set('titleColor', c)}
        />

        {/* Font weight */}
        <WeightSelect label="Weight" value={s.titleWeight} onChange={(v) => set('titleWeight', v)} />

        {/* Alignment */}
        <AlignControl label="Align" value={s.titleAlign} onChange={(v) => set('titleAlign', v)} />

        {/* Italic */}
        <Toggle label="Italic" checked={s.titleItalic} onChange={(v) => set('titleItalic', v)} />

        {/* Vertical position */}
        <Segmented
          label="Position"
          value={s.titlePosition}
          options={[
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Center' },
            { value: 'bottom', label: 'Bottom' },
          ]}
          onChange={(v) => set('titlePosition', v)}
        />

        {/* Text case */}
        <Segmented
          label="Case"
          value={s.titleTransform}
          options={[
            { value: 'none', label: 'As typed' },
            { value: 'uppercase', label: 'UPPER' },
            { value: 'capitalize', label: 'Title' },
          ]}
          onChange={(v) => set('titleTransform', v)}
        />

        {/* Letter spacing */}
        <Slider
          label="Letter spacing"
          value={s.titleLetterSpacing}
          min={-0.05}
          max={0.3}
          step={0.01}
          onChange={(v) => set('titleLetterSpacing', parseFloat(v.toFixed(2)))}
          formatValue={(v) => `${v.toFixed(2)}em`}
        />

        {/* Text shadow toggle */}
        <div className="cte-toggle-row">
          <span className="cte-toggle-label">Text shadow</span>
          <button
            type="button"
            role="switch"
            aria-checked={s.titleShadow}
            className={`cte-toggle ${s.titleShadow ? 'is-on' : ''}`}
            onClick={() => set('titleShadow', !s.titleShadow)}
          >
            <span className="cte-toggle-knob" />
          </button>
        </div>
      </div>

      {/* ── Subtitle ─────────────────────────────────────────────── */}
      <div className="cte-group">
        <SectionLabel>Subtitle (Date)</SectionLabel>
        <ColorPicker
          label="Color"
          value={s.subtitleColor}
          onChange={(c) => set('subtitleColor', c)}
        />
        <Slider
          label="Size"
          value={s.subtitleSize}
          min={9}
          max={24}
          step={1}
          onChange={(v) => set('subtitleSize', v)}
          formatValue={(v) => `${v}px`}
        />
        <FontSelect
          label="Font"
          value={s.subtitleFont}
          onChange={(v) => set('subtitleFont', v)}
        />
        <WeightSelect
          label="Weight"
          value={s.subtitleWeight}
          onChange={(v) => set('subtitleWeight', v)}
        />
        <AlignControl
          label="Align"
          value={s.subtitleAlign}
          onChange={(v) => set('subtitleAlign', v)}
        />
      </div>

      {/* ── Author line ───────────────────────────────────────────── */}
      <div className="cte-group">
        <SectionLabel>Author / Edition line</SectionLabel>
        <div className="cte-field">
          <label className="cte-field-label">Custom text</label>
          <input
            className="cte-text-input"
            type="text"
            value={s.authorText}
            placeholder="Personal Journal Edition (default)"
            onChange={(e) => set('authorText', e.target.value)}
          />
        </div>
        <ColorPicker
          label="Color"
          value={s.authorColor}
          onChange={(c) => set('authorColor', c)}
        />
        <FontSelect
          label="Font"
          value={s.authorFont}
          onChange={(v) => set('authorFont', v)}
        />
        <Slider
          label="Size"
          value={s.authorSize}
          min={8}
          max={32}
          step={1}
          onChange={(v) => set('authorSize', v)}
          formatValue={(v) => `${v}px`}
        />
        <WeightSelect
          label="Weight"
          value={s.authorWeight}
          onChange={(v) => set('authorWeight', v)}
        />
        <AlignControl
          label="Align"
          value={s.authorAlign}
          onChange={(v) => set('authorAlign', v)}
        />
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="cte-group">
        <SectionLabel>Divider line</SectionLabel>
        <ColorPicker
          label="Color"
          value={s.dividerColor}
          onChange={(c) => set('dividerColor', c)}
        />
      </div>

      {/* ── Border ───────────────────────────────────────────────── */}
      <div className="cte-group">
        <SectionLabel>Decorative border</SectionLabel>
        <Toggle label="Show border" checked={s.showBorder} onChange={(v) => set('showBorder', v)} />
        {s.showBorder && (
          <>
            <ColorPicker
              label="Border color"
              value={s.borderColor}
              onChange={(c) => set('borderColor', c)}
            />
            <Slider
              label="Thickness"
              value={s.borderWidth}
              min={1}
              max={6}
              step={1}
              onChange={(v) => set('borderWidth', v)}
              formatValue={(v) => `${v}px`}
            />
            <Segmented
              label="Style"
              value={s.borderStyle}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'double', label: 'Double' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ]}
              onChange={(v) => set('borderStyle', v)}
            />
          </>
        )}
      </div>

      {/* ── Background (no photo) ────────────────────────────────── */}
      <div className="cte-group">
        <SectionLabel>Cover background</SectionLabel>
        <div className="cte-field">
          <label className="cte-field-label">CSS background (empty = default leather)</label>
          <input
            className="cte-text-input cte-text-input--mono"
            type="text"
            value={s.coverBackground}
            placeholder="linear-gradient(160deg,#5a3a22,#2b1c12)"
            onChange={(e) => set('coverBackground', e.target.value)}
          />
        </div>
        <p className="cte-hint">Works when no photo or template is selected. Use any CSS <code>background</code> value (color, gradient, image URL).</p>
      </div>

      {/* ── Emblem ───────────────────────────────────────────────── */}
      <div className="cte-group">
        <SectionLabel>Ornament</SectionLabel>
        <Toggle label="Show sparkle emblem" checked={s.showEmblem} onChange={(v) => set('showEmblem', v)} />
      </div>

      {/* ── Overlay opacity (for photo covers) ───────────────────── */}
      <div className="cte-group">
        <SectionLabel>Photo overlay darkness</SectionLabel>
        <Slider
          label="Opacity"
          value={s.overlayOpacity}
          min={0}
          max={0.85}
          step={0.05}
          onChange={(v) => set('overlayOpacity', parseFloat(v.toFixed(2)))}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <p className="cte-hint">Controls how dark the tint over a custom photo appears. 0% = photo only, 85% = very dark.</p>
      </div>

      {/* ── Reset ─────────────────────────────────────────────────── */}
      <button type="button" className="cte-reset-btn" onClick={reset}>
        <RotateCcw size={13} />
        <span>Reset to defaults</span>
      </button>
    </div>
  );
}
