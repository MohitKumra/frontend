import {
  Award,
  BadgeCheck,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Flame,
  ListChecks,
  Rocket,
  Sparkles,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../ui/Card';
import type { GamificationProfileDTO } from '../../types';

const iconMap: Record<string, LucideIcon> = {
  'badge-check': BadgeCheck,
  brain: Brain,
  'calendar-check': CalendarCheck,
  'check-circle': CheckCircle2,
  flame: Flame,
  'list-checks': ListChecks,
  rocket: Rocket,
  sparkles: Sparkles,
  timer: Timer,
  trophy: Trophy,
};

const tierStyles = {
  bronze: { color: '#b45309', bg: 'rgba(245, 158, 11, 0.12)' },
  silver: { color: '#64748b', bg: 'rgba(148, 163, 184, 0.16)' },
  gold: { color: '#ca8a04', bg: 'rgba(234, 179, 8, 0.14)' },
  platinum: { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
};

function formatReason(reason: string) {
  return reason
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function AchievementsWidget({ profile }: { profile: GamificationProfileDTO }) {
  const recentBadges = profile.recentAchievements.slice(0, 4);
  const recentPoints = profile.recentPoints.slice(0, 3);

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
              Rewards
            </p>
            <h3 className="mt-1 text-lg font-black text-text-primary">Level {profile.level}</h3>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <Award size={14} />
            {profile.totalPoints} XP
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Progress</span>
            <span>
              {profile.currentLevelPoints}/{profile.nextLevelPoints}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${profile.progressPercent}%`,
                background: 'var(--gradient-accent)',
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {recentBadges.map((badge) => {
            const Icon = iconMap[badge.icon] ?? Award;
            const tier = tierStyles[badge.tier];
            return (
              <div
                key={badge.id}
                className="rounded-xl border p-3"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ color: tier.color, background: tier.bg }}
                >
                  <Icon size={16} />
                </div>
                <p className="mt-2 text-xs font-black text-text-primary truncate">{badge.title}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tier.color }}>
                  {badge.tier}
                </p>
              </div>
            );
          })}
          {recentBadges.length === 0 && (
            <div className="col-span-2 rounded-xl border p-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-bold text-text-primary">No badges yet</p>
              <p className="mt-1 text-xs text-text-secondary">Complete a task, habit, or focus session to unlock the first one.</p>
            </div>
          )}
        </div>

        {recentPoints.length > 0 && (
          <div className="mt-5 space-y-2">
            {recentPoints.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{entry.description}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {formatReason(entry.reason)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-black text-accent">+{entry.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
