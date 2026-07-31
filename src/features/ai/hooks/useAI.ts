// frontend/src/features/ai/hooks/useAI.ts
// React hooks for AI-powered features.

import { useQuery, useMutation } from '@tanstack/react-query';
import * as aiApi from '../api';

// ─── AI Status ───────────────────────────────────────────────────────────────

export function useAIStatus() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: aiApi.getAIStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

export function useAIInsights() {
  return useQuery({
    queryKey: ['ai-insights'],
    queryFn: aiApi.getAIInsights,
    staleTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1,
  });
}

// ─── AI Coach ────────────────────────────────────────────────────────────────

export function useAICoach() {
  return useQuery({
    queryKey: ['ai-coach'],
    queryFn: aiApi.getAICoach,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// ─── Daily Brief ─────────────────────────────────────────────────────────────

export function useDailyBrief() {
  return useQuery({
    queryKey: ['ai-daily-brief'],
    queryFn: aiApi.getDailyBrief,
    staleTime: 60 * 60 * 1000, // 1 hour (generated once per day)
    retry: 1,
  });
}

// ─── Journal Analysis ────────────────────────────────────────────────────────

export function useJournalEntryAnalysis() {
  return useMutation({
    mutationFn: aiApi.analyzeJournalEntry,
  });
}

export function useJournalWeeklyAnalysis() {
  return useQuery({
    queryKey: ['ai-journal-weekly'],
    queryFn: aiApi.getJournalWeeklyAnalysis,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
}

// ─── Task Parser ─────────────────────────────────────────────────────────────

export function useTaskParser() {
  return useMutation({
    mutationFn: aiApi.parseTaskText,
  });
}