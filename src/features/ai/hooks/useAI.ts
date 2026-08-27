import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as aiApi from '../api';
import { useSettings } from '../../settings';
import { useAuthStore } from '../../../store/authStore';
import { useUserPlan } from '../../billing/useUserPlan';

export type AIFeatureKey =
  | 'dailyBriefEnabled'
  | 'journalWeeklyEnabled'
  | 'insightsEnabled'
  | 'coachEnabled'
  | 'journalAnalysisEnabled'
  | 'goalSummaryEnabled'
  | 'taskParserEnabled'
  | 'goalPlannerEnabled';

type CoachCacheRecord = {
  fetchedAt: number;
  data: aiApi.AICoachResult;
};

const COACH_CACHE_PREFIX = 'ai-coach-cache';

function getCoachCacheKey(userId: string, refreshMinutes: number): string {
  return `${COACH_CACHE_PREFIX}:${userId}:${refreshMinutes}`;
}

function readCoachCache(userId: string, refreshMinutes: number): CoachCacheRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getCoachCacheKey(userId, refreshMinutes));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CoachCacheRecord>;
    if (typeof parsed.fetchedAt !== 'number' || !parsed.data) return null;

    return {
      fetchedAt: parsed.fetchedAt,
      data: parsed.data as aiApi.AICoachResult,
    };
  } catch {
    return null;
  }
}

function writeCoachCache(userId: string, refreshMinutes: number, data: aiApi.AICoachResult): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: CoachCacheRecord = {
      fetchedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(getCoachCacheKey(userId, refreshMinutes), JSON.stringify(payload));
  } catch {
    // Ignore storage failures. The network result is still usable.
  }
}

/** Returns whether a specific AI feature is enabled for the current user. */
export function useAIFeatureEnabled(featureKey: AIFeatureKey): boolean {
  const { data: settings } = useSettings();
  return settings?.ai?.[featureKey] !== false;
}

/**
 * Whether the user's plan actually grants AI access. Passive/automatic AI
 * queries must never fire (and never hit the backend) when this is false, so
 * free users don't get a wall of "AI not available" errors + upgrade modals.
 */
function useAIGranted(): boolean {
  const { isFeatureLocked, effectivePlan } = useUserPlan();
  const quota = effectivePlan.features?.aiRequestsPerMonth;
  const locked = isFeatureLocked('aiCoach');
  const hasQuota = typeof quota === 'number' ? quota !== 0 : true;
  return !locked && hasQuota;
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
  const settingsEnabled = settings?.ai?.insightsEnabled !== false;
  const aiGranted = useAIGranted();
  const enabled = settingsEnabled && aiGranted;
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
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const refreshMs = refreshMinutes * 60 * 1000;
  const settingsEnabled = settings?.ai?.coachEnabled !== false;
  const aiGranted = useAIGranted();
  const enabled = settingsEnabled && aiGranted;
  const canQuery = Boolean(settings) && Boolean(userId) && enabled;
  const cached = canQuery ? readCoachCache(userId, refreshMinutes) : null;
  const isFreshCache = cached ? Date.now() - cached.fetchedAt < refreshMs : false;

  const query = useQuery({
    queryKey: ['ai-coach', userId, refreshMinutes],
    queryFn: aiApi.getAICoach,
    staleTime: refreshMs,
    gcTime: refreshMs,
    refetchInterval: canQuery ? refreshMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: isFreshCache ? false : 'always',
    enabled: canQuery,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.fetchedAt,
    retry: 1,
  });

  useEffect(() => {
    if (!canQuery || !query.data) return;
    const cachedAt = cached?.fetchedAt ?? 0;
    if (query.dataUpdatedAt <= cachedAt) return;
    writeCoachCache(userId, refreshMinutes, query.data);
  }, [cached?.fetchedAt, canQuery, query.data, query.dataUpdatedAt, refreshMinutes, userId]);

  return query;
}

export function useDailyBrief() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const refreshMs = refreshMinutes * 60 * 1000;
  const settingsEnabled = settings?.ai?.dailyBriefEnabled !== false;
  const aiGranted = useAIGranted();
  const enabled = settingsEnabled && aiGranted;
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
  const settingsEnabled = settings?.ai?.journalWeeklyEnabled !== false;
  const aiGranted = useAIGranted();
  const enabled = settingsEnabled && aiGranted;
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
