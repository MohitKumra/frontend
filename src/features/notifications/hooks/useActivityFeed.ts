// frontend/src/features/notifications/hooks/useActivityFeed.ts
// React hook for fetching and managing the activity feed with pagination and unread tracking

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { notificationsApi } from '../api';
import type { InAppNotificationDTO } from '../../../types';

const LAST_SEEN_KEY = 'activity-feed-last-seen';
const PAGE_SIZE = 15;

/**
 * Get the last seen timestamp from localStorage
 */
function getLastSeenTimestamp(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch (e) {
    console.warn('Failed to read last seen timestamp:', e);
    return null;
  }
}

/**
 * Update the last seen timestamp in localStorage
 */
function setLastSeenTimestamp(timestamp: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, timestamp);
  } catch (e) {
    console.warn('Failed to save last seen timestamp:', e);
  }
}

export function useActivityFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, refetch } = useInfiniteQuery(
    {
      queryKey: ['activity-feed'],
      queryFn: ({ pageParam = 1 }) => notificationsApi.getActivityFeed(pageParam, PAGE_SIZE),
      getNextPageParam: (lastPage) => {
        return lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined;
      },
      initialPageParam: 1,
      staleTime: 30000, // 30 seconds - consider data fresh for half a minute
      refetchInterval: 60000, // Auto-refetch every minute to catch new activities
    }
  );

  // Flatten all pages into a single array of notifications
  const notifications = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  // Calculate if there are unread activities
  const hasUnread = useMemo(() => {
    const lastSeen = getLastSeenTimestamp();
    if (!lastSeen || notifications.length === 0) return false;

    const lastSeenDate = new Date(lastSeen);
    return notifications.some((notification) => {
      const notificationDate = new Date(notification.timestamp);
      return notificationDate > lastSeenDate;
    });
  }, [notifications]);

  // Count unread notifications
  const unreadCount = useMemo(() => {
    const lastSeen = getLastSeenTimestamp();
    if (!lastSeen || notifications.length === 0) return 0;

    const lastSeenDate = new Date(lastSeen);
    return notifications.filter((notification) => {
      const notificationDate = new Date(notification.timestamp);
      return notificationDate > lastSeenDate;
    }).length;
  }, [notifications]);

  // Get the most recent notification timestamp
  const latestTimestamp = useMemo(() => {
    if (notifications.length === 0) return null;
    return notifications[0].timestamp; // Already sorted by timestamp desc
  }, [notifications]);

  // Mark all as seen by updating the last seen timestamp
  const markAllAsSeen = useCallback(() => {
    if (latestTimestamp) {
      setLastSeenTimestamp(latestTimestamp);
      // Force a re-render by refetching (this will update the hasUnread computed value)
      refetch();
    }
  }, [latestTimestamp, refetch]);

  // Load more notifications
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Server-reported grand totals from page 0 meta (known immediately, never incremented page-by-page)
  const serverTotals = useMemo(() => {
    const firstPageMeta = data?.pages?.[0]?.meta;
    if (!firstPageMeta) return { total: 0, totalActionable: 0, totalActivity: 0 };
    return {
      total: firstPageMeta.total ?? 0,
      totalActionable: firstPageMeta.totalActionable ?? 0,
      totalActivity: firstPageMeta.totalActivity ?? 0,
    };
  }, [data]);

  // Group notifications by actionable vs activity
  const groupedNotifications = useMemo(() => {
    const actionable: InAppNotificationDTO[] = [];
    const activity: InAppNotificationDTO[] = [];

    notifications.forEach((notification) => {
      if (notification.isActionable) {
        actionable.push(notification);
      } else {
        activity.push(notification);
      }
    });

    return { actionable, activity };
  }, [notifications]);

  return {
    // Data
    notifications,
    groupedNotifications,

    // Server-known totals (available immediately from page 1 response)
    totalCount: serverTotals.total,
    totalActionable: serverTotals.totalActionable,
    totalActivity: serverTotals.totalActivity,

    // Pagination
    hasNextPage,
    isFetchingNextPage,
    loadMore,

    // Loading states
    isLoading,
    isError,
    error,

    // Unread tracking
    hasUnread,
    unreadCount,
    markAllAsSeen,

    // Utilities
    refetch,
  };
}
