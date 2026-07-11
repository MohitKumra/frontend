
import { Flame, TrendingUp, Target, Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../store/authStore';
import type { AnalyticsSummaryDTO } from '../../types';

interface ProfileWidgetProps {
  summary: AnalyticsSummaryDTO;
}

export function ProfileWidget({ summary }: ProfileWidgetProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const userName = user.name ?? user.email.split('@')[0];
  const userInitials = user.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Card variant="default" className="overflow-hidden">
      {/* Header with gradient */}
      <div 
        className="h-24 relative"
        style={{ background: 'var(--gradient-accent)' }}
      >
        <div className="absolute -bottom-10 left-5">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white shadow-lg border-4"
            style={{ 
              background: 'var(--gradient-accent)',
              borderColor: 'var(--color-surface)',
            }}
          >
            {userInitials}
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="pt-12 px-5 pb-4">
        <h3 className="text-base font-extrabold text-text-primary mb-0.5">
          {userName}
        </h3>
        <p className="text-xs text-text-muted font-bold mb-4">
          {user.email}
        </p>
        
        {/* Productivity Score Highlight */}
        <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-warning" />
              <span className="text-xs font-bold text-text-muted">Productivity Score</span>
            </div>
            <span className="text-xl font-extrabold text-text-primary">{(summary.productivityScore ?? 0)}/100</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${summary.productivityScore ?? 0}%`,
                background: 'var(--gradient-accent)'
              }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tasks Completed */}
          <div 
            className="p-3 rounded-xl"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{
                background: 'var(--icon-bg-success)',
                color: 'var(--icon-text-success)',
              }}
            >
              <TrendingUp size={14} />
            </div>
            <p className="text-lg font-extrabold text-text-primary leading-none mb-1">
              {summary.tasksCompleted}
            </p>
            <p className="text-[10px] font-bold text-text-muted">
              Tasks Done
            </p>
          </div>

          {/* Current Streak */}
          <div 
            className="p-3 rounded-xl"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{
                background: 'var(--icon-bg-warning)',
                color: 'var(--icon-text-warning)',
              }}
            >
              <Flame size={14} />
            </div>
            <p className="text-lg font-extrabold text-text-primary leading-none mb-1">
              {summary.currentHabitStreak}d
            </p>
            <p className="text-[10px] font-bold text-text-muted">
              Current Streak
            </p>
          </div>

          {/* Best Streak */}
          <div 
            className="p-3 rounded-xl"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{
                background: 'var(--icon-bg-accent)',
                color: 'var(--icon-text-accent)',
              }}
            >
              <Flame size={14} />
            </div>
            <p className="text-lg font-extrabold text-text-primary leading-none mb-1">
              {summary.longestHabitStreak}d
            </p>
            <p className="text-[10px] font-bold text-text-muted">
              Best Streak
            </p>
          </div>

          {/* Focus Time */}
          <div 
            className="p-3 rounded-xl"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-extrabold text-text-primary leading-none mb-1">
                  {summary.focusMinutesTotal} min
                </p>
                <p className="text-[10px] font-bold text-text-muted">
                  Total Focus Time
                </p>
              </div>
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: 'var(--icon-bg-info)',
                  color: 'var(--icon-text-info)',
                }}
              >
                <Target size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}