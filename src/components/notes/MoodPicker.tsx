import React, { useState } from 'react';
import type { NoteMood } from '../../types';

interface MoodPickerProps {
  value: NoteMood;
  onChange: (mood: NoteMood) => void;
}

// Custom SVG icons for each mood
const MoodIcons = {
  great: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
    </svg>
  ),
  good: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" />
    </svg>
  ),
  neutral: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" />
    </svg>
  ),
  bad: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 16C8 16 9.5 14 12 14C14.5 14 16 16 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <circle cx="15" cy="9" r="1.5" fill="currentColor" />
    </svg>
  ),
  awful: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M7 17C7 17 9 15 12 15C15 15 17 17 17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 8L10 10M10 8L8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 8L16 10M16 8L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 13C9 13 10 14 12 14C14 14 15 13 15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const MOODS: { value: Exclude<NoteMood, null>; Icon: () => React.ReactElement; label: string; color: string }[] = [
  { value: 'great', Icon: MoodIcons.great, label: 'Fire', color: '#10b981' },
  { value: 'good', Icon: MoodIcons.good, label: 'Vibing', color: '#60a5fa' },
  { value: 'neutral', Icon: MoodIcons.neutral, label: 'Whatever', color: '#a78bfa' },
  { value: 'bad', Icon: MoodIcons.bad, label: 'Dead', color: '#f59e0b' },
  { value: 'awful', Icon: MoodIcons.awful, label: 'Crying', color: '#ef4444' },
];

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const [hoveredMood, setHoveredMood] = useState<Exclude<NoteMood, null> | null>(null);

  return (
    <div className="flex items-center gap-1">
      {MOODS.map((mood) => {
        const isActive = value === mood.value;
        const isHovered = hoveredMood === mood.value;
        const showLabel = isActive || isHovered;

        return (
          <div key={mood.value} className="relative">
            <button
              type="button"
              onClick={() => onChange(isActive ? null : mood.value)}
              onMouseEnter={() => setHoveredMood(mood.value)}
              onMouseLeave={() => setHoveredMood(null)}
              className="group relative flex items-center justify-center rounded-lg transition-all duration-200"
              aria-label={mood.label}
              style={{
                width: '32px',
                height: '32px',
                color: isActive ? mood.color : 'var(--color-text-muted)',
                backgroundColor: isActive 
                  ? `${mood.color}18` 
                  : isHovered 
                    ? 'var(--color-surface-raised)' 
                    : 'transparent',
                border: isActive ? `1.5px solid ${mood.color}30` : '1.5px solid transparent',
                opacity: !value || isActive ? 1 : 0.5,
              }}
            >
              <mood.Icon />
            </button>
            
            {/* Label tooltip */}
            {showLabel && (
              <div
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold pointer-events-none"
                style={{
                  top: '-24px',
                  backgroundColor: mood.color,
                  color: 'white',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {mood.label}
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: '100%',
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `4px solid ${mood.color}`,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
      
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 flex items-center justify-center rounded-md transition-all hover:bg-red-50 dark:hover:bg-red-900/10"
          style={{ 
            width: '20px', 
            height: '20px',
            color: 'var(--color-text-muted)',
          }}
          title="Clear mood"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
