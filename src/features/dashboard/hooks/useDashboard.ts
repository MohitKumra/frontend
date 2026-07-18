// frontend/src/features/dashboard/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';

const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboardSummary() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'summary'],
    queryFn: dashboardApi.getSummary,
  });
}

export function useDashboardToday() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'today'],
    queryFn: dashboardApi.getToday,
  });
}

export function useEnhancedDashboard() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'enhanced'],
    queryFn: dashboardApi.getEnhanced,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useActivityFeed(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'activity-feed', page, pageSize],
    queryFn: () => dashboardApi.getActivityFeed(page, pageSize),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useGamificationProfile() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'gamification'],
    queryFn: dashboardApi.getGamificationProfile,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
