import { Trophy, CheckSquare, Timer, Target, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';

interface ScoreBreakdown {
  taskCompletion: number;
  focus: number;
  habits: number;
  planner: number;
  consistency: number;
}

interface DashboardScoreProps {
  overallScore: number;
  breakdown: ScoreBreakdown;
}

function CircularProgress({ value, size = 120 }: { value: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth="8" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#scoreGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
      <defs>
        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-info)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DashboardScore({ overallScore, breakdown }: DashboardScoreProps) {
  const categories = [
    { label: 'Task Completion', value: breakdown.taskCompletion, icon: CheckSquare, color: 'accent' },
    { label: 'Focus', value: breakdown.focus, icon: Timer, color: 'info' },
    { label: 'Habits', value: breakdown.habits, icon: Target, color: 'warning' },
    { label: 'Planner', value: breakdown.planner, icon: Calendar, color: 'success' },
    { label: 'Consistency', value: breakdown.consistency, icon: TrendingUp, color: 'danger' },
  ];

  const colorMap = {
    accent: 'var(--color-accent)',
    info: 'var(--color-info)',
    warning: 'var(--color-warning)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
  };

  return (
    <Card variant="default" className="h-full">
      <div className="p-6 sm:p-7 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Trophy size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-text-primary">Productivity Score</h3>
            <p className="text-xs text-text-secondary">Overall performance</p>
          </div>
        </div>

        {/* Circular Score */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative">
            <CircularProgress value={overallScore} size={120} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-text-primary">{overallScore}</span>
              <span className="text-[10px] font-bold text-text-muted">/ 100</span>
            </div>
          </div>
          <p className="text-xs font-bold text-text-secondary mt-4 text-center px-4">
            {overallScore >= 80 && '🎯 Excellent productivity!'}
            {overallScore >= 60 && overallScore < 80 && '📈 Good progress'}
            {overallScore >= 40 && overallScore < 60 && '💪 Room for improvement'}
            {overallScore < 40 && "🚀 Let's build momentum"}
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-4 mb-6">
          {categories.map(({ label, value, icon: Icon, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon size={14} style={{ color: colorMap[color as keyof typeof colorMap] }} />
                  <span className="text-xs font-bold text-text-secondary">{label}</span>
                </div>
                <span className="text-xs font-black text-text-primary">{value}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${value}%`,
                    background: colorMap[color as keyof typeof colorMap],
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div
          className="rounded-xl p-4 mt-5"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-raised))',
            border: '1px solid var(--color-accent-border)',
          }}
        >
          <p className="text-xs text-text-secondary text-center leading-relaxed">
            💡 Complete more tasks to boost your score
          </p>
        </div>
      </div>
    </Card>
  );
}
