// frontend/src/features/ai/api.ts
// API client for AI-powered features.

import apiClient from '../../lib/apiClient';
import type {
  CoachChatDTO,
  CoachChatListDTO,
  GoalDTO,
  HabitDTO,
  ProjectDTO,
  TaskDTO,
  ListResponse,
} from '../../types';

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

// ─── Coach entity creation ────────────────────────────────────────────────────

/** A field the coach needs the user to confirm before creating an entity */
export interface CoachMissingField {
  field: string;
  label: string;
  options: string[];
  required: boolean;
}

/**
 * Returned by the coach when it detected a CRUD intent but needs the user to
 * confirm field values. The frontend renders these as selectable chips.
 */
export interface CoachOptionGroup {
  entity: 'task' | 'habit' | 'goal' | 'project';
  entityTitle: string;
  missingFields: CoachMissingField[];
}

/**
 * The draft the LLM embeds in its JSON response once it has enough info to
 * create an entity. Sent back verbatim to POST /ai/coach/actions/confirm.
 */
export interface CoachEntityDraft {
  entity: 'task' | 'habit' | 'goal' | 'project';
  title: string;
  fields: Record<string, string | null>;
}

// ─── Coach result (extended) ──────────────────────────────────────────────────

export interface AICoachResult {
  title: string;
  message: string;
  suggestion: { text: string; actionLabel: string; actionType: AICoachActionType };
  mood: 'encouraging' | 'challenging' | 'celebratory';
  planPrompt?: string;
  /** Present when the coach has gathered enough info to create an entity */
  entityDraft?: CoachEntityDraft | null;
  source: 'ai' | 'fallback';
}

export type AICoachActionType =
  | 'open_habits'
  | 'open_tasks'
  | 'open_goals'
  | 'open_focus'
  | 'open_dashboard'
  | 'open_coach'
  | 'create_plan';

export interface AICoachMessageDTO {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachChatSendResponse {
  chat: CoachChatDTO;
  result: AICoachResult;
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

export async function getAICoachChats(): Promise<ListResponse<CoachChatListDTO>> {
  const { data } = await apiClient.get('/ai/coach/chats');
  return data;
}

export async function createAICoachChat(title?: string): Promise<CoachChatDTO> {
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const payload = normalizedTitle ? { title: normalizedTitle } : {};
  const { data } = await apiClient.post('/ai/coach/chats', payload);
  return data;
}

export async function getAICoachChat(chatId: string): Promise<CoachChatDTO> {
  const { data } = await apiClient.get(`/ai/coach/chats/${chatId}`);
  return data;
}

export async function deleteAICoachChat(chatId: string): Promise<void> {
  await apiClient.delete(`/ai/coach/chats/${chatId}`);
}

export async function sendAICoachMessage(
  chatId: string,
  message: string,
  imageUrls?: string[],
): Promise<CoachChatSendResponse> {
  const payload: { message: string; imageUrls?: string[] } = { message };
  if (imageUrls && imageUrls.length > 0) {
    payload.imageUrls = imageUrls;
  }
  const { data } = await apiClient.post(`/ai/coach/chats/${chatId}/messages`, payload);
  return data;
}

export async function chatWithAICoach(messages: AICoachMessageDTO[]): Promise<AICoachResult> {
  const { data } = await apiClient.post('/ai/coach/chat', { messages });
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

// ─── Coach entity confirm ─────────────────────────────────────────────────────

export interface CoachConfirmEntityResponse {
  entity: 'task' | 'habit' | 'goal' | 'project';
  result: TaskDTO | HabitDTO | GoalDTO | ProjectDTO;
}

/**
 * Send the LLM-gathered entity draft to the backend for validation + creation.
 * The backend Zod-validates every field before writing to the DB.
 */
export async function confirmCoachEntity(
  entity: CoachEntityDraft['entity'],
  draft: CoachEntityDraft['fields'] & { title: string },
): Promise<CoachConfirmEntityResponse> {
  const { data } = await apiClient.post('/ai/coach/actions/confirm', {
    entity,
    draft,
  });
  return data;
}
