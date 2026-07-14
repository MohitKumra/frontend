import { CheckSquare, Timer, Target, FolderKanban, Calendar, Clock } from 'lucide-react';
import { Card } from '../ui/Card';

interface Activity {
  id: string;
  type: 'task_completed' | 'focus_session' | 'habit_completed' | 'project_created' | 'calendar_sync';
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: {
    duration?: number;
    projectName?: string;
  };
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

function getActivityIcon(type: Activity['type']) {
  const icons = {
    task_completed: CheckSquare,
    focus_session: Timer,
    habit_completed: Target,
    project_created: FolderKanban,
    calendar_sync: Calendar,
  };
  return icons[type];
}

function getActivityColor(type: Activity['type']) {
  const colors = {
    task_completed: { bg: 'var(--icon-bg-success)', text: 'var(--icon-text-success)' },
    focus_session: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' },
    habit_completed: { bg: 'var(--icon-bg-warning)', text: 'var(--icon-text-warning)' },
    project_created: { bg: 'var(--icon-bg-accent)', text: 'var(--icon-text-accent)' },
    calendar_sync: { bg: 'var(--icon-bg-info)', text: 'var(--icon-text-info)' },
  };
  return colors[type];
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
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

        {/* Activity Timeline */}
        {displayActivities.length > 0 ? (
          <div className="space-y-3">
            {displayActivities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              const colors = getActivityColor(activity.type);
              const isLast = index === displayActivities.length - 1;

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
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative z-10"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-bold text-text-primary mb-0.5">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-text-secondary mb-1">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-muted">
                          {getRelativeTime(activity.timestamp)}
                        </span>
                        {activity.metadata?.duration && (
                          <>
                            <span className="text-text-muted">•</span>
                            <span className="text-xs text-text-muted">
                              {activity.metadata.duration} minutes
                            </span>
                          </>
                        )}
                        {activity.metadata?.projectName && (
                          <>
                            <span className="text-text-muted">•</span>
                            <span className="text-xs text-text-muted">
                              {activity.metadata.projectName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
        )}
      </div>
    </Card>
  );
}
