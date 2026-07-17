// frontend/src/features/notifications/api.ts
import apiClient from '../../lib/apiClient';
import type { 
  ListResponse, 
  NotificationLogDTO, 
  PushSubscriptionRequest,
  ActivityFeedResponse 
} from '../../types';

export const notificationsApi = {
  getVapidKey: () =>
    apiClient.get<{ publicKey: string | null }>('/notifications/vapid-key').then((r) => r.data),

  subscribe: (subscription: PushSubscriptionRequest) =>
    apiClient.post<{ success: boolean }>('/notifications/subscribe', subscription).then((r) => r.data),

  unsubscribe: () =>
    apiClient.post<{ success: boolean }>('/notifications/unsubscribe').then((r) => r.data),

  getLogs: () =>
    apiClient.get<ListResponse<NotificationLogDTO>>('/notifications/logs').then((r) => r.data),

  markAsRead: () =>
    apiClient.post<{ success: boolean }>('/notifications/read').then((r) => r.data),

  sendTestNotification: (channels?: ('BROWSER_PUSH' | 'EMAIL' | 'NATIVE_LOCAL')[]) =>
    apiClient.post<{ success: boolean }>('/notifications/test', { channels }).then((r) => r.data),

  getActivityFeed: (page: number = 1, pageSize: number = 20) =>
    apiClient
      .get<ActivityFeedResponse>(`/notifications/activity-feed?page=${page}&pageSize=${pageSize}`)
      .then((r) => r.data),
};
