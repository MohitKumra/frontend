import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Reusable premium Empty State component for lists and grids.
 * Uses animation and token-based coloring.
 */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in ${className}`}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-text-muted mb-5"
        style={{
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--card-border)',
        }}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && (
        <div className="animate-scale-in" style={{ animationDelay: '100ms' }}>
          {action}
        </div>
      )}
    </div>
  );
}
