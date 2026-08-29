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
    // NOTE: no `refetchInterval`. A background timer here re-rendered the whole
    // DashboardPage every 60s even while idle (every child, chart, gradient).
    // The dashboard refetches on mount, when the window regains focus, and when
    // mutations invalidate ['dashboard'] — so data stays fresh on every real
    // interaction without constant idle re-renders.
  });
}

export function useActivityFeed(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'activity-feed', page, pageSize],
    queryFn: () => dashboardApi.getActivityFeed(page, pageSize),
    staleTime: 15 * 1000,
    // NOTE: no `refetchInterval`. Same rationale as above — no idle timer that
    // re-renders the entire DashboardPage every 30s. Fresh on mount/focus and
    // after mutations.
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

export function useAchievements() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'achievements'],
    queryFn: dashboardApi.getAchievements,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
