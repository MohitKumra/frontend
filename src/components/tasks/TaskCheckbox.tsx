import React, { useState } from 'react';

interface TaskCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  'aria-label'?: string;
}

/**
 * A deliberate, enterprise-grade completion control.
 *
 * Rather than swapping between two Lucide icons (which reads as a default),
 * this renders a single square that fills with the success color and draws
 * its own checkmark stroke-by-stroke — the kind of small, considered motion
 * that signals a designed product rather than a stock component.
 */
export function TaskCheckbox({ checked, onToggle, size = 21, 'aria-label': ariaLabel }: TaskCheckboxProps) {
  const [hovered, setHovered] = useState(false);

  const boxColor = checked ? 'var(--color-success)' : hovered ? 'var(--color-accent)' : 'var(--color-border)';

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={checked}
      aria-label={ariaLabel ?? (checked ? 'Mark incomplete' : 'Mark complete')}
      className="task-checkbox shrink-0 relative flex items-center justify-center tap-target transition-transform duration-150 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-lg"
      style={{ width: size + 10, height: size + 10, ['--tw-ring-color' as string]: 'var(--color-accent)' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={checked ? 'task-checkbox-pop' : undefined}
      >
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="6"
          style={{
            fill: checked ? 'var(--color-success)' : 'transparent',
            stroke: boxColor,
            strokeWidth: 2,
            transition: 'fill 200ms cubic-bezier(0.16,1,0.3,1), stroke 180ms ease',
          }}
        />
        <path
          d="M6.5 12.6L10.2 16.2L17.5 7.8"
          style={{
            fill: 'none',
            stroke: 'white',
            strokeWidth: 2.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeDasharray: 21,
            strokeDashoffset: checked ? 0 : 21,
            transition: checked
              ? 'stroke-dashoffset 280ms cubic-bezier(0.65,0,0.35,1) 90ms'
              : 'stroke-dashoffset 120ms ease',
          }}
        />
      </svg>

      {/* Scoped keyframes for the subtle "settle" bounce on check — kept to a
          single, restrained motion rather than a flashy multi-step sequence. */}
      <style>{`
        @keyframes task-checkbox-pop-kf {
          0% { transform: scale(0.85); }
          55% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .task-checkbox-pop {
          animation: task-checkbox-pop-kf 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </button>
  );
}
