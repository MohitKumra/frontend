// frontend/src/features/notifications/components/NotificationCenter.tsx
// Notification Center modal component showing activity feed and actionable notifications.

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Target,
  TrendingUp,
  Zap,
  FolderKanban,
  Sparkles,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import type { InAppNotificationDTO, InAppNotificationType } from '../../../types';
import type { BadgeVariant } from '../../../components/ui/Badge';

// Helper function to get icon for notification type
function getNotificationIcon(type: InAppNotificationType, size = 16) {
  switch (type) {
    case 'TASK_CREATED':
      return <Target size={size} />;
    case 'TASK_COMPLETED':
      return <CheckCircle2 size={size} />;
    case 'TASK_STATUS_CHANGED':
      return <TrendingUp size={size} />;
    case 'HABIT_COMPLETED':
      return <Zap size={size} />;
    case 'HABIT_STREAK':
      return <TrendingUp size={size} />;
    case 'FOCUS_SESSION_COMPLETED':
      return <Clock size={size} />;
    case 'PROJECT_CREATED':
      return <FolderKanban size={size} />;
    case 'PROJECT_COMPLETED':
      return <CheckCircle2 size={size} />;
    case 'PROJECT_STATUS_CHANGED':
      return <FolderKanban size={size} />;
    case 'TASK_OVERDUE':
      return <AlertCircle size={size} />;
    case 'TASK_DUE_SOON':
      return <Clock size={size} />;
    case 'HABIT_PENDING':
      return <Zap size={size} />;
    default:
      return <Bell size={size} />;
  }
}

// Helper function to get color scheme for notification type
function getNotificationColor(type: InAppNotificationType): BadgeVariant {
  if (type === 'TASK_OVERDUE') return 'danger';
  if (type === 'TASK_DUE_SOON') return 'warning';
  if (type === 'HABIT_PENDING') return 'info';
  if (type === 'TASK_COMPLETED' || type === 'PROJECT_COMPLETED' || type === 'HABIT_COMPLETED') return 'success';
  return 'accent';
}

// Helper function to get entity route
function getEntityRoute(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'task':
      return `/tasks?taskId=${entityId}`;
    case 'project':
      return `/projects?projectId=${entityId}`;
    case 'habit':
      return `/habits`;
    case 'focus':
      return `/focus`;
    default:
      return '/dashboard';
  }
}

interface NotificationItemProps {
  notification: InAppNotificationDTO;
  onClick: (notification: InAppNotificationDTO) => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const color = getNotificationColor(notification.type);
  const icon = getNotificationIcon(notification.type, 18);
  
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  return (
    <button
      onClick={() => onClick(notification)}
      className="w-full text-left p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] animate-fade-in"
      style={{
        borderColor: notification.isActionable ? 'var(--color-border)' : 'transparent',
        background: notification.isActionable 
          ? 'var(--color-surface-raised)' 
          : 'var(--color-surface)',
        animation: 'fadeInSlide 0.3s ease-out',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
          style={{
            background: `var(--icon-bg-${color})`,
            color: `var(--icon-text-${color})`,
          }}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-text-primary leading-snug">
              {notification.title}
            </p>
            {notification.isActionable && (
              <Badge variant={color} size="sm" className="shrink-0 animate-pulse-subtle">
                Action
              </Badge>
            )}
          </div>
          
          {notification.description && (
            <p className="text-xs text-text-muted leading-relaxed mb-2">
              {notification.description}
            </p>
          )}

          <p className="text-[10px] font-bold text-text-muted opacity-75">
            {timeAgo}
          </p>
        </div>
      </div>
    </button>
  );
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const {
    groupedNotifications,
    hasUnread,
    unreadCount,
    markAllAsSeen,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
  } = useActivityFeed();

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  const handleNotificationClick = (notification: InAppNotificationDTO) => {
    // Navigate to the entity
    const route = getEntityRoute(notification.entityType, notification.entityId);
    navigate(route);
    
    // Close the modal
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    // Mark all as seen when opening the modal
    if (hasUnread) {
      markAllAsSeen();
    }
  };

  const totalCount = groupedNotifications.actionable.length + groupedNotifications.activity.length;

  return (
    <>
      {/* Bell Icon Trigger */}
      <button
        onClick={handleOpen}
        className="tap-target relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-muted hover:text-text-primary transition-all duration-200"
        aria-label="Notification Center"
      >
        <Bell size={18} />
        {hasUnread && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
        )}
      </button>

      {/* Notification Center Modal */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Activity Feed">
        <style>{`
          @keyframes fadeInSlide {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes pulse-slow {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.6;
            }
          }
          
          .animate-fade-in {
            animation: fadeIn 0.4s ease-out;
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          .animate-pulse-subtle {
            animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          /* Smooth scrollbar */
          .no-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .no-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .no-scrollbar::-webkit-scrollbar-thumb {
            background: var(--color-border);
            border-radius: 3px;
          }
          
          .no-scrollbar::-webkit-scrollbar-thumb:hover {
            background: var(--color-text-muted);
          }
        `}</style>
        <div className="flex flex-col gap-4 pt-2">
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Loader2 size={32} className="animate-spin mb-3 text-accent" />
              <p className="text-sm font-semibold">Loading activities...</p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-danger">
              <AlertTriangle size={32} className="mb-3" />
              <p className="text-sm font-bold mb-2">Failed to load activities</p>
              <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}

          {/* Content */}
          {!isLoading && !isError && (
            <>
              {/* Empty State */}
              {totalCount === 0 && (
                <div className="text-center py-12 text-text-muted border border-dashed border-border rounded-2xl bg-neutral-50/20 dark:bg-neutral-950/10">
                  <Sparkles size={28} className="mx-auto mb-3 opacity-30 text-accent" />
                  <p className="text-sm font-bold">No activities yet</p>
                  <p className="text-xs text-text-muted mt-1.5 leading-snug px-4">
                    Your tasks, habits, and focus sessions will appear here
                  </p>
                </div>
              )}

              {/* Actionable Items Section */}
              {groupedNotifications.actionable.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <AlertCircle size={14} className="text-warning animate-pulse-slow" />
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Action Required
                    </h3>
                    <Badge variant="warning" size="sm">
                      {groupedNotifications.actionable.length}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupedNotifications.actionable.map((notification, index) => (
                      <div
                        key={notification.id}
                        style={{
                          animation: `fadeInSlide 0.3s ease-out ${index * 0.05}s both`,
                        }}
                      >
                        <NotificationItem
                          notification={notification}
                          onClick={handleNotificationClick}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity Section */}
              {groupedNotifications.activity.length > 0 && (
                <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <TrendingUp size={14} className="text-accent" />
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Recent Activity
                    </h3>
                    <Badge variant="info" size="sm">
                      {groupedNotifications.activity.length}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1 no-scrollbar">
                    {groupedNotifications.activity.map((notification, index) => (
                      <div
                        key={notification.id}
                        style={{
                          animation: `fadeInSlide 0.3s ease-out ${(index * 0.03) + 0.15}s both`,
                        }}
                      >
                        <NotificationItem
                          notification={notification}
                          onClick={handleNotificationClick}
                        />
                      </div>
                    ))}
                    
                    {/* Infinite Scroll Trigger */}
                    {hasNextPage && (
                      <div ref={loadMoreRef} className="py-4 flex items-center justify-center">
                        {isFetchingNextPage && (
                          <Loader2 size={20} className="animate-spin text-accent" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Info */}
              {totalCount > 0 && !hasNextPage && !isFetchingNextPage && (
                <div className="text-center pt-2 pb-1">
                  <p className="text-[10px] font-bold text-text-muted opacity-60">
                    All caught up! 🎉
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
