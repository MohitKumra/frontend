// frontend/src/features/ai/hooks/useAI.ts
// React hooks for AI-powered features. Settings-aware to control token usage.

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
    retry: false,
  });
}

export function useAIInsights() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const enabled = settings?.ai?.insightsEnabled !== false;
  return useQuery({
    queryKey: ['ai-insights'],
    queryFn: aiApi.getAIInsights,
    staleTime: refreshMinutes * 60 * 1000,
    refetchInterval: enabled ? refreshMinutes * 60 * 1000 : false,
    enabled,
    retry: 1,
  });
}

export function useAICoach() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 5;
  const enabled = settings?.ai?.coachEnabled !== false;
  return useQuery({
    queryKey: ['ai-coach'],
    queryFn: aiApi.getAICoach,
    staleTime: refreshMinutes * 60 * 1000,
    refetchInterval: enabled ? refreshMinutes * 60 * 1000 : false,
    enabled,
    retry: 1,
  });
}

export function useDailyBrief() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const enabled = settings?.ai?.dailyBriefEnabled !== false;
  return useQuery({
    queryKey: ['ai-daily-brief'],
    queryFn: aiApi.getDailyBrief,
    staleTime: refreshMinutes * 60 * 1000,
    refetchInterval: enabled ? refreshMinutes * 60 * 1000 : false,
    enabled,
    retry: 1,
  });
}

export function useJournalEntryAnalysis() {
  const { data: settings } = useSettings();
  const enabled = settings?.ai?.journalAnalysisEnabled !== false;
  return useMutation({
    mutationFn: aiApi.analyzeJournalEntry,
  });
}

export function useJournalWeeklyAnalysis() {
  const { data: settings } = useSettings();
  const refreshMinutes = settings?.ai?.summaryRefreshMinutes ?? 60;
  const enabled = settings?.ai?.journalWeeklyEnabled !== false;
  return useQuery({
    queryKey: ['ai-journal-weekly'],
    queryFn: aiApi.getJournalWeeklyAnalysis,
    staleTime: refreshMinutes * 60 * 1000,
    refetchInterval: enabled ? refreshMinutes * 60 * 1000 : false,
    enabled,
    retry: 1,
  });
}

export function useTaskParser() {
  const { data: settings } = useSettings();
  const enabled = settings?.ai?.taskParserEnabled !== false;
  return useMutation({
    mutationFn: aiApi.parseTaskText,
  });
}