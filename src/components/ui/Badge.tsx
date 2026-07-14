import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 dark:bg-neutral-800 text-text-secondary border border-neutral-200 dark:border-neutral-700',
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  danger:  'bg-danger/10 text-danger border border-danger/20',
  info:    'bg-info/10 text-info border border-info/20',
  accent:  'bg-accent-subtle text-accent border border-accent-border',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-secondary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  accent:  'bg-accent',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

/**
 * Reusable Badge component supporting sizes, dot indicator, and semantic variable styling.
 */
export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  dot = false,
  className = '' 
}: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  
  return (
    <span 
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-bold transition-all',
        variantStyles[variant],
        sizeClass,
        className
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

/** Maps task priority to a badge variant. */
export function PriorityBadge({ priority }: { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) {
  const map: Record<string, BadgeVariant> = { LOW: 'info', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'accent' };
  const labels: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
  return <Badge variant={map[priority]} size="sm" dot>{labels[priority]}</Badge>;
}

/** Maps task status to a badge variant. */
export function StatusBadge({ status }: { status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' }) {
  const map: Record<string, BadgeVariant> = {
    TODO: 'default',
    IN_PROGRESS: 'accent',
    DONE: 'success',
    CANCELLED: 'default',
  };
  const labels: Record<string, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return <Badge variant={map[status]} size="sm">{labels[status]}</Badge>;
}
