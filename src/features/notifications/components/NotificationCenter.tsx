// frontend/src/features/notifications/components/NotificationCenter.tsx
// Notification Center modal component showing activity feed and actionable notifications.

import { useState, useRef, useEffect, useCallback } from 'react';
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

function getNotificationIcon(type: InAppNotificationType, size = 16) {
  switch (type) {
    case 'TASK_CREATED':      return <Target size={size} />;
    case 'TASK_COMPLETED':    return <CheckCircle2 size={size} />;
    case 'TASK_STATUS_CHANGED': return <TrendingUp size={size} />;
    case 'HABIT_COMPLETED':   return <Zap size={size} />;
    case 'HABIT_STREAK':      return <TrendingUp size={size} />;
    case 'FOCUS_SESSION_COMPLETED': return <Clock size={size} />;
    case 'PROJECT_CREATED':   return <FolderKanban size={size} />;
    case 'PROJECT_COMPLETED': return <CheckCircle2 size={size} />;
    case 'PROJECT_STATUS_CHANGED': return <FolderKanban size={size} />;
    case 'TASK_OVERDUE':      return <AlertCircle size={size} />;
    case 'TASK_DUE_SOON':     return <Clock size={size} />;
    case 'HABIT_PENDING':     return <Zap size={size} />;
    default:                  return <Bell size={size} />;
  }
}

function getNotificationColor(type: InAppNotificationType): BadgeVariant {
  if (type === 'TASK_OVERDUE') return 'danger';
  if (type === 'TASK_DUE_SOON') return 'warning';
  if (type === 'HABIT_PENDING') return 'info';
  if (type === 'TASK_COMPLETED' || type === 'PROJECT_COMPLETED' || type === 'HABIT_COMPLETED') return 'success';
  return 'accent';
}

function getEntityRoute(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'task':    return `/tasks?taskId=${entityId}`;
    case 'project': return `/projects?projectId=${entityId}`;
    case 'habit':   return `/habits`;
    case 'focus':   return `/focus`;
    default:        return '/dashboard';
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
      className="w-full text-left p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
      style={{
        borderColor: notification.isActionable ? 'var(--color-border)' : 'transparent',
        background: notification.isActionable
          ? 'var(--color-surface-raised)'
          : 'var(--color-surface)',
        animation: 'fadeInSlide 0.3s ease-out',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
          style={{
            background: `var(--icon-bg-${color})`,
            color: `var(--icon-text-${color})`,
          }}
        >
          {icon}
        </div>
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

/** Walk DOM upward to find the nearest scrollable ancestor (overflow-y auto/scroll). */
function findClosestScrollRoot(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 2) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Sentinel element that lives at the bottom of the activity list
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Keep the current IntersectionObserver in a ref so it persists across renders
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Prevent duplicate loads within a short window even if observer fires twice
  const loadingLockRef = useRef(false);

  const {
    groupedNotifications,
    hasUnread,
    markAllAsSeen,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    totalCount,
    totalActionable,
    totalActivity,
  } = useActivityFeed();

  const loadMoreSafe = useCallback(() => {
    if (loadingLockRef.current) return;
    if (!hasNextPage || isFetchingNextPage) return;
    loadingLockRef.current = true;
    Promise.resolve(loadMore()).finally(() => {
      window.setTimeout(() => {
        loadingLockRef.current = false;
      }, 150);
    });
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  // Reset the loading lock whenever hasNextPage / fetching state settles
  useEffect(() => {
    if (!isFetchingNextPage) {
      loadingLockRef.current = false;
    }
  }, [isFetchingNextPage, hasNextPage]);

  // Attach IntersectionObserver once the modal is open and a sentinel exists.
  // Dynamically picks the closest scrollable ancestor (Modal's contentRef div)
  // so pagination works no matter which ancestor scrolls.
  useEffect(() => {
    if (!isOpen) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const scrollRoot = findClosestScrollRoot(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          loadMoreSafe();
        }
      },
      {
        root: scrollRoot, // use the actual scroll container if found
        rootMargin: '140px 0px', // pre-emptively trigger before reaching the end
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [
    isOpen,
    hasNextPage,
    loadMoreSafe,
    // Re-attach when we get more activity items — the scroll root might
    // gain/lose scrollability between page 1 and page 2.
    groupedNotifications.activity.length,
    groupedNotifications.actionable.length,
  ]);

  const handleNotificationClick = (notification: InAppNotificationDTO) => {
    navigate(getEntityRoute(notification.entityType, notification.entityId));
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (hasUnread) {
      markAllAsSeen();
    }
  };

  // Use server-known totals when available (page 1 meta), otherwise fall back to the length of what we've fetched so far.
  // This makes the Badge counts read correctly from the very first render.
  const displayActionableCount =
    totalActionable > 0 ? totalActionable : groupedNotifications.actionable.length;
  const displayActivityCount =
    totalActivity > 0 ? totalActivity : groupedNotifications.activity.length;
  const displayTotalCount = totalCount > 0 ? totalCount : groupedNotifications.actionable.length + groupedNotifications.activity.length;

  return (
    <>
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

      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Activity Feed">
        <style>{`
          @keyframes fadeInSlide {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.6; }
          }
          .animate-pulse-subtle { animation: pulse-slow 3s cubic-bezier(0.4,0,0.6,1) infinite; }
        `}</style>
        <div className="flex flex-col gap-4 pt-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Loader2 size={32} className="animate-spin mb-3 text-accent" />
              <p className="text-sm font-semibold">Loading activities...</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-danger">
              <AlertTriangle size={32} className="mb-3" />
              <p className="text-sm font-bold mb-2">Failed to load activities</p>
              <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {totalCount === 0 && (
                <div className="text-center py-12 text-text-muted border border-dashed border-border rounded-2xl bg-neutral-50/20 dark:bg-neutral-950/10">
                  <Sparkles size={28} className="mx-auto mb-3 opacity-30 text-accent" />
                  <p className="text-sm font-bold">No activities yet</p>
                  <p className="text-xs text-text-muted mt-1.5 leading-snug px-4">
                    Your tasks, habits, and focus sessions will appear here
                  </p>
                </div>
              )}

              {groupedNotifications.actionable.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <AlertCircle size={14} className="text-warning animate-pulse-subtle" />
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Action Required
                    </h3>
                    <Badge variant="warning" size="sm">
                      {displayActionableCount}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupedNotifications.actionable.map((notification, index) => (
                      <div
                        key={notification.id}
                        style={{ animation: `fadeInSlide 0.3s ease-out ${index * 0.05}s both` }}
                      >
                        <NotificationItem notification={notification} onClick={handleNotificationClick} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupedNotifications.activity.length > 0 && (
                <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <TrendingUp size={14} className="text-accent" />
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Recent Activity
                    </h3>
                    <Badge variant="info" size="sm">
                      {displayActivityCount}
                    </Badge>
                  </div>

                  {/* No inner scroll wrapper — single unified scroll with Modal body */}
                  <div className="flex flex-col gap-2">
                    {groupedNotifications.activity.map((notification, index) => (
                      <div
                        key={notification.id}
                        style={{
                          animation: `fadeInSlide 0.3s ease-out ${index * 0.03 + 0.15}s both`,
                        }}
                      >
                        <NotificationItem notification={notification} onClick={handleNotificationClick} />
                      </div>
                    ))}

                    {/* Sentinel + pagination state (always in DOM so observer has a target) */}
                    <div
                      ref={sentinelRef}
                      className="py-4 flex items-center justify-center shrink-0 select-none"
                      style={{ minHeight: '56px' }}
                    >
                      {isFetchingNextPage ? (
                        <Loader2 size={20} className="animate-spin text-accent" />
                      ) : hasNextPage ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted opacity-70">
                          Loading more as you scroll…
                        </span>
                      ) : totalCount > 0 ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted opacity-60">
                          All caught up! 🎉
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {totalCount > 0 && !groupedNotifications.activity.length && !hasNextPage && !isFetchingNextPage && (
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
