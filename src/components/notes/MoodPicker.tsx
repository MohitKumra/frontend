import React from 'react';
import type { NoteMood } from '../../types';

interface MoodPickerProps {
  value: NoteMood;
  onChange: (mood: NoteMood) => void;
}

const MOODS: { value: Exclude<NoteMood, null>; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '🌟', label: 'Great', color: '#10b981' },
  { value: 'good', emoji: '🙂', label: 'Good', color: '#60a5fa' },
  { value: 'neutral', emoji: '😐', label: 'Neutral', color: '#a78bfa' },
  { value: 'bad', emoji: '😔', label: 'Sad', color: '#f59e0b' },
  { value: 'awful', emoji: '😢', label: 'Awful', color: '#ef4444' },
];

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="flex items-center gap-1.5">
      {MOODS.map((mood) => {
        const isActive = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(isActive ? null : mood.value)}
            className="mood-option"
            title={mood.label}
            aria-label={mood.label}
            style={{
              opacity: isActive ? 1 : 0.4,
              transform: isActive ? 'scale(1.2)' : 'scale(1)',
              border: isActive ? `2px solid ${mood.color}` : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: '16px' }}>{mood.emoji}</span>
          </button>
        );
      })}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs ml-1 px-1.5 py-0.5 rounded"
          style={{ color: 'var(--color-text-muted)' }}
          title="Clear mood"
        >
          ✕
        </button>
      )}
    </div>
  );
}