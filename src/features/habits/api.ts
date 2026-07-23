// frontend/src/features/habits/api.ts
import apiClient from '../../lib/apiClient';
import type { HabitDTO, CreateHabitRequest, UpdateHabitRequest, HabitsListResponse, FocusSessionDTO, WeekOverviewDTO } from '../../types';

export const habitsApi = {
  list: () => apiClient.get<HabitsListResponse>('/habits').then((r) => r.data),
  create: (data: CreateHabitRequest) => apiClient.post<HabitDTO>('/habits', data).then((r) => r.data),
  update: (id: string, data: UpdateHabitRequest) => apiClient.patch<HabitDTO>(`/habits/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/habits/${id}`),
  toggle: (id: string) => apiClient.post<HabitDTO>(`/habits/${id}/toggle`).then((r) => r.data),
  weekOverview: () => apiClient.get<WeekOverviewDTO>('/habits/week-overview').then((r) => r.data),
};

export const focusApi = {
  list: () => apiClient.get<{ data: FocusSessionDTO[]; meta: { total: number } }>('/focus').then((r) => r.data),
  create: (data: { durationMin: number; taskId?: string | null; projectId?: string | null; isBreak?: boolean }) =>
    apiClient.post<FocusSessionDTO>('/focus', data).then((r) => r.data),
  update: (id: string, data: { elapsedMin: number; status?: string }) =>
    apiClient.patch<FocusSessionDTO>(`/focus/${id}`, data).then((r) => r.data),
  complete: (id: string) =>
    apiClient.post<FocusSessionDTO>(`/focus/${id}/complete`).then((r) => r.data),
  cancel: (id: string) =>
    apiClient.post<FocusSessionDTO>(`/focus/${id}/cancel`).then((r) => r.data),
  getActive: () =>
    apiClient.get<FocusSessionDTO | null>('/focus/active').then((r) => r.data),
  logTime: (durationMin: number) => apiClient.post('/focus/time-log', { durationMin }).then((r) => r.data),
  listTimeLogs: () => apiClient.get<{ id: string; userId: string; durationMin: number; date: string }[]>('/focus/time-logs').then((r) => r.data),
};
