// frontend/src/features/dashboard/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';

const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboardSummary() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'summary'],
    queryFn: dashboardApi.getSummary,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useDashboardToday() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'today'],
    queryFn: dashboardApi.getToday,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useEnhancedDashboard() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'enhanced'],
    queryFn: dashboardApi.getEnhanced,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useActivityFeed(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'activity-feed', page, pageSize],
    queryFn: () => dashboardApi.getActivityFeed(page, pageSize),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useGamificationProfile() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'gamification'],
    queryFn: dashboardApi.getGamificationProfile,
    staleTime: 60 * 1000,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'achievements'],
    queryFn: dashboardApi.getAchievements,
    staleTime: 60 * 1000,
  });
}
