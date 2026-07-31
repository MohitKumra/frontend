// frontend/src/features/ai/api.ts
// API client for AI-powered features.

import apiClient from '../../lib/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIStatus {
  available: boolean;
  provider: string;
  model: string;
}

export interface AIInsight {
  id: string;
  type: 'positive' | 'neutral' | 'warning';
  icon: 'trend' | 'clock' | 'calendar' | 'alert';
  text: string;
}

export interface AIInsightResult {
  insights: AIInsight[];
  source: 'ai' | 'fallback';
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface AICoachResult {
  title: string;
  message: string;
  suggestion: { text: string; actionLabel: string };
  mood: 'encouraging' | 'challenging' | 'celebratory';
  source: 'ai' | 'fallback';
}

export interface AIDailyBriefResult {
  greeting: string;
  summary: string;
  priorities: string[];
  focusTip: string;
  motivation: string;
  source: 'ai' | 'fallback';
}

export interface AIJournalAnalysisResult {
  mood: 'positive' | 'neutral' | 'negative' | 'mixed';
  moodLabel: string;
  themes: string[];
  insight: string;
  reflectionPrompt: string;
  source: 'ai' | 'fallback';
}

export interface AIJournalWeeklyResult {
  overallMood: 'positive' | 'neutral' | 'negative' | 'mixed';
  moodTrend: string;
  keyThemes: string[];
  summary: string;
  insight: string;
  suggestion: string;
  source: 'ai' | 'fallback';
}

export interface AITaskParseResult {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (24-hour)
  reminderTime?: string; // HH:mm (24-hour)
  reminderMessage?: string;
  estimatedDuration?: number; // minutes
  status?: 'TODO' | 'IN_PROGRESS';
  recurrence?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  subTasks?: { title: string }[];
  source: 'ai' | 'fallback';
}

// ─── API Calls ───────────────────────────────────────────────────────────────
// Note: apiClient baseURL already includes /api (from VITE_BACKEND_URL)
// so we use relative paths WITHOUT the /api prefix.

export async function getAIStatus(): Promise<AIStatus> {
  const { data } = await apiClient.get('/ai/status');
  return data;
}

export async function getAIInsights(): Promise<AIInsightResult> {
  const { data } = await apiClient.get('/ai/insights');
  return data;
}

export async function getAICoach(): Promise<AICoachResult> {
  const { data } = await apiClient.get('/ai/coach');
  return data;
}

export async function getDailyBrief(): Promise<AIDailyBriefResult> {
  const { data } = await apiClient.get('/ai/daily-brief');
  return data;
}

export async function analyzeJournalEntry(content: string): Promise<AIJournalAnalysisResult> {
  const { data } = await apiClient.post('/ai/analyze-journal', { content });
  return data;
}

export async function getJournalWeeklyAnalysis(): Promise<AIJournalWeeklyResult> {
  const { data } = await apiClient.get('/ai/journal-weekly');
  return data;
}

export async function parseTaskText(text: string): Promise<AITaskParseResult> {
  const { data } = await apiClient.post('/ai/parse-task', { text });
  return data;
}