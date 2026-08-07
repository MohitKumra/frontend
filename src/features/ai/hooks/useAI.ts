// frontend/src/features/ai/hooks/useAI.ts
// React hooks for AI-powered features. Settings-aware to control token usage.
//
// Refresh strategy — all periodic AI queries share the same timer derived
// from the user's `summaryRefreshMinutes` setting:
//
//   staleTime   = refreshMs  — cached data stays fresh for the full interval;
//                              no refetch will fire while the data is fresh.
//   gcTime      = refreshMs  — keep the cached entry in memory for the same
//                              window so navigating away and back doesn't GC
//                              it and trigger an immediate re-fetch.
//   refetchInterval = refreshMs (when enabled) — background timer that fires
//                              exactly once per interval.
//   refetchOnWindowFocus = false — switching back to the tab never bypasses
//                              the interval.
//   refetchOnMount      = false — remounting a component (e.g. navigating
//                              back to a page) uses the cached value until
//                              staleTime expires; it does NOT fire a new call.
//
// The refresh interval is included in the queryKey so that when the user
// changes their cadence setting, React Query treats it as a brand-new query
// and starts a fresh timer at the new cadence immediately.

import { useQuery, useMutation } from '@tanstack/react-query';
import * as aiApi from '../api';
import { useSettings } from '../../settings';

export type AIFeatureKey =
  | 'dailyBriefEnabled'
  | 'journalWeeklyEnabled'
  | 'insightsEnabled'
  | 'coachEnabled'
  | 'journalAnalysisEnabled'
  | 'goalSummaryEnabled'
  | 'taskParserEnabled'
  | 'goalPlannerEnabled';

/** Returns whether a specific AI feature is enabled for the current user. */
export function useAIFeatureEnabled(featureKey: AIFeatureKey): boolean {
  const { data: settings } = useSettings();
  return settings?.ai?.[featureKey] !== false;
}

export function useAIStatus() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: aiApi.getAIStatus,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });
}

export function useAIInsights() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const refreshMs = refreshMinutes * 60 * 1000;
  const enabled = settings?.ai?.insightsEnabled !== false;
  return useQuery({
    queryKey: ['ai-insights', refreshMinutes],
    queryFn: aiApi.getAIInsights,
    staleTime: refreshMs,
    gcTime: refreshMs,
    refetchInterval: enabled ? refreshMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
    retry: 1,
  });
}

export function useAICoach() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const refreshMs = refreshMinutes * 60 * 1000;
  const enabled = settings?.ai?.coachEnabled !== false;
  return useQuery({
    queryKey: ['ai-coach', refreshMinutes],
    queryFn: aiApi.getAICoach,
    staleTime: refreshMs,
    gcTime: refreshMs,
    refetchInterval: enabled ? refreshMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
    retry: 1,
  });
}

export function useDailyBrief() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const refreshMs = refreshMinutes * 60 * 1000;
  const enabled = settings?.ai?.dailyBriefEnabled !== false;
  return useQuery({
    queryKey: ['ai-daily-brief', refreshMinutes],
    queryFn: aiApi.getDailyBrief,
    staleTime: refreshMs,
    gcTime: refreshMs,
    refetchInterval: enabled ? refreshMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
    retry: 1,
  });
}

export function useJournalEntryAnalysis() {
  // Journal entry analysis is mutation-based (user-triggered), not periodic.
  return useMutation({
    mutationFn: aiApi.analyzeJournalEntry,
  });
}

export function useJournalWeeklyAnalysis() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const refreshMs = refreshMinutes * 60 * 1000;
  const enabled = settings?.ai?.journalWeeklyEnabled !== false;
  return useQuery({
    queryKey: ['ai-journal-weekly', refreshMinutes],
    queryFn: aiApi.getJournalWeeklyAnalysis,
    staleTime: refreshMs,
    gcTime: refreshMs,
    refetchInterval: enabled ? refreshMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
    retry: 1,
  });
}

export function useTaskParser() {
  // Task parser is mutation-based (user-triggered on demand), not periodic.
  return useMutation({
    mutationFn: aiApi.parseTaskText,
  });
}