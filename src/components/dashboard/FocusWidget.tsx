import { Timer, Flame, TrendingUp, Play, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';

interface FocusWidgetProps {
  todayMinutes: number;
  totalMinutes: number;
  currentStreak: number;
  bestStreak: number;
  longestSession: number;
  averageSession: number;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function FocusWidget({
  todayMinutes,
  totalMinutes,
  currentStreak,
  bestStreak,
  longestSession,
  averageSession,
}: FocusWidgetProps) {
  const navigate = useNavigate();

  const stats = [
    { label: 'Current Streak', value: `${currentStreak}d`, icon: Flame, color: 'warning' },
    { label: 'Best Streak', value: `${bestStreak}d`, icon: TrendingUp, color: 'success' },
    { label: 'Longest Session', value: formatMinutes(longestSession), icon: Clock, color: 'info' },
    { label: 'Average Session', value: formatMinutes(averageSession), icon: Timer, color: 'accent' },
  ];

  const colorMap = {
    warning: { bg: 'var(--icon-bg-warning)', text: 'var(--icon-text-warning)' },
    success: { bg: 'var(--icon-bg-success)', text: 'var(--icon-text-success)' },
    info: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' },
    accent: { bg: 'var(--icon-bg-accent)', text: 'var(--icon-text-accent)' },
  };

  return (
    <Card variant="default" className="overflow-hidden">
      <div className="p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-info)' }}
            >
              <Timer size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Focus Sessions</h3>
              <p className="text-xs text-text-secondary">Deep work tracking</p>
            </div>
          </div>
        </div>

        {/* Today's Focus Time - Large Display */}
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            background: 'var(--gradient-info)',
          }}
        >
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Today's Focus Time</p>
            <p className="text-4xl font-black text-white mb-1">{formatMinutes(todayMinutes)}</p>
            <p className="text-xs text-white/70 font-bold">
              {totalMinutes > 0 ? `${formatMinutes(totalMinutes)} total` : 'Start your first session'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {stats.map(({ label, value, icon: Icon, color }) => {
            const colors = colorMap[color as keyof typeof colorMap];
            return (
              <div
                key={label}
                className="rounded-xl p-3"
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    <Icon size={14} />
                  </div>
                </div>
                <p className="text-lg font-extrabold text-text-primary mb-0.5">{value}</p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
              </div>
            );
          })}
        </div>

        {/* Start Focus Button */}
        <button
          type="button"
          onClick={() => navigate('/focus')}
          className="w-full rounded-xl p-4 font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          style={{ background: 'var(--gradient-accent)' }}
        >
          <Play size={18} />
          Start Focus Session
        </button>

        {/* Tip */}
        <p className="text-xs text-center text-text-muted mt-4">25-minute Pomodoro sessions recommended</p>
      </div>
    </Card>
  );
}
