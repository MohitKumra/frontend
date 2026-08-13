import { CheckSquare, Timer, Target, FolderKanban, Calendar, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import type { InAppNotificationDTO } from '../../types';

interface ActivityFeedProps {
  activities: InAppNotificationDTO[];
  maxItems?: number;
  isLoading?: boolean;
}

type FeedType = InAppNotificationDTO['type'];

function getActivityIcon(type: FeedType) {
  const icons: Record<FeedType, typeof CheckSquare> = {
    TASK_CREATED: CheckSquare,
    TASK_COMPLETED: CheckSquare,
    TASK_STATUS_CHANGED: CheckSquare,
    HABIT_COMPLETED: Target,
    HABIT_STREAK: TrendingUp,
    HABIT_STREAK_BROKEN: AlertTriangle,
    FOCUS_SESSION_COMPLETED: Timer,
    PROJECT_CREATED: FolderKanban,
    PROJECT_COMPLETED: FolderKanban,
    PROJECT_STATUS_CHANGED: FolderKanban,
    TASK_OVERDUE: AlertTriangle,
    TASK_DUE_SOON: AlertTriangle,
    HABIT_PENDING: Target,
  };
  return icons[type] ?? Clock;
}

function getActivityColor(type: FeedType) {
  const colors: Record<FeedType, { bg: string; text: string }> = {
    TASK_CREATED: { bg: 'var(--icon-bg-accent)', text: 'var(--icon-text-accent)' },
    TASK_COMPLETED: { bg: 'var(--icon-bg-success)', text: 'var(--icon-text-success)' },
    TASK_STATUS_CHANGED: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' },
    HABIT_COMPLETED: { bg: 'var(--icon-bg-warning)', text: 'var(--icon-text-warning)' },
    HABIT_STREAK: { bg: 'var(--icon-bg-success)', text: 'var(--icon-text-success)' },
    HABIT_STREAK_BROKEN: { bg: '#fef2f2', text: '#ef4444' },
    FOCUS_SESSION_COMPLETED: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' },
    PROJECT_CREATED: { bg: 'var(--icon-bg-accent)', text: 'var(--icon-text-accent)' },
    PROJECT_COMPLETED: { bg: 'var(--icon-bg-success)', text: 'var(--icon-text-success)' },
    PROJECT_STATUS_CHANGED: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' },
    TASK_OVERDUE: { bg: '#fef2f2', text: '#ef4444' },
    TASK_DUE_SOON: { bg: '#fffbeb', text: '#f59e0b' },
    HABIT_PENDING: { bg: '#f3f4f6', text: '#6b7280' },
  };
  return colors[type] ?? { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' };
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  // For items 24+ hours old, show date + time in Indian locale/timezone
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ActivityFeed({ activities, maxItems = 10, isLoading }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card variant="default" className="overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
          >
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Recent Activity</h3>
            <p className="text-xs text-text-secondary">Your latest accomplishments</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Activity Timeline */}
        {!isLoading && displayActivities.length > 0 ? (
          <div className="space-y-3">
            {displayActivities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              const colors = getActivityColor(activity.type);
              const isLast = index === displayActivities.length - 1;
              const isActionable = activity.isActionable;

              return (
                <div key={activity.id} className="relative">
                  {/* Timeline Line */}
                  {!isLast && (
                    <div
                      className="absolute left-4 top-10 w-0.5 h-full -ml-px"
                      style={{ background: 'var(--color-border)' }}
                    />
                  )}

                  {/* Activity Item */}
                  <div className={`flex items-start gap-3 ${isActionable ? 'opacity-90' : ''}`}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative z-10"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-text-primary mb-0.5">{activity.title}</p>
                        {isActionable && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: '#fef3c7', color: '#d97706' }}
                          >
                            Action needed
                          </span>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-xs text-text-secondary mb-1">{activity.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-muted">{getRelativeTime(activity.timestamp)}</span>
                        {activity.metadata?.durationMin && (
                          <>
                            <span className="text-text-muted">•</span>
                            <span className="text-xs text-text-muted">{activity.metadata.durationMin} minutes</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isLoading ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
            >
              <Clock size={20} />
            </div>
            <p className="text-sm font-bold text-text-primary mb-1">No activity yet</p>
            <p className="text-xs text-text-secondary">Complete tasks to see your activity here</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
