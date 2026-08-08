import React from 'react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: number;
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'info';
  isLive?: boolean;
  sub?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Premium StatCard component matching the SaaS Dashboard style.
 * Uses CSS variables for color primitives and shadows to support theme switching.
 */
export function StatCard({
  icon,
  label,
  value,
  change,
  color = 'accent',
  isLive = false,
  sub,
  className = '',
  onClick,
}: StatCardProps) {
  const isPositive = change !== undefined ? change >= 0 : true;

  const cardClasses = [
    'card-interactive p-5 rounded-2xl flex flex-col',
    onClick ? 'cursor-pointer' : '',
    className,
  ].join(' ');

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 icon-container"
          style={{
            background: `var(--icon-bg-${color})`,
            color: `var(--icon-text-${color})`,
          }}
        >
          {icon}
        </div>
        {isLive && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: 'var(--live-badge-bg)',
              color: 'var(--live-badge-text)',
            }}
          >
            <span className="live-dot" />
            <span>Live</span>
          </div>
        )}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">{label}</p>

      <div className="flex items-baseline gap-2 mt-auto">
        <p className="text-2xl font-extrabold text-text-primary leading-none">{value}</p>
        {change !== undefined && (
          <span
            className={[
              'text-xs font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md',
              isPositive ? 'text-success bg-success/10' : 'text-danger bg-danger/10',
            ].join(' ')}
          >
            <TrendingUp size={12} className={isPositive ? '' : 'rotate-180'} />
            {Math.abs(change)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-text-muted mt-2 font-medium">{sub}</p>}
    </div>
  );
}
