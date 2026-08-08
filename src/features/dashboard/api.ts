// frontend/src/features/dashboard/api.ts
import apiClient from '../../lib/apiClient';
import type {
  AnalyticsSummaryDTO,
  EnhancedDashboardDTO,
  ActivityFeedResponse,
  GamificationProfileDTO,
  AchievementWithStatusDTO,
} from '../../types';

export const dashboardApi = {
  getSummary: () => apiClient.get<AnalyticsSummaryDTO>('/dashboard/summary').then((r) => r.data),

  getToday: () =>
    apiClient.get<{ pendingTasks: number; habitsToComplete: number }>('/dashboard/today').then((r) => r.data),

  getEnhanced: () => apiClient.get<EnhancedDashboardDTO>('/dashboard/enhanced').then((r) => r.data),

  getGamificationProfile: () => apiClient.get<GamificationProfileDTO>('/gamification/profile').then((r) => r.data),

  getActivityFeed: (page = 1, pageSize = 20) =>
    apiClient
      .get<ActivityFeedResponse>(`/notifications/activity-feed?page=${page}&pageSize=${pageSize}`)
      .then((r) => r.data),

  getAchievements: () => apiClient.get<AchievementWithStatusDTO[]>('/gamification/achievements').then((r) => r.data),
};
