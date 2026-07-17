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
};