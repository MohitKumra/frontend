// frontend/src/features/habits/hooks/useHabits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { habitsApi } from '../api';
import type { CreateHabitRequest, UpdateHabitRequest } from '../../../types';

const HABITS_KEY = ['habits'] as const;

export function useHabits() {
  return useQuery({ queryKey: HABITS_KEY, queryFn: () => habitsApi.list() });
}

/**
 * Filtered habits list (status / search / sort) — filtering happens on the
 * backend. `placeholderData` keeps the previous result on screen while a new
 * filter combination loads, so switching tabs / sorting feels instant.
 */
export function useFilteredHabits(filters: Record<string, string>) {
  const stableFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined));
  return useQuery({
    queryKey: [...HABITS_KEY, 'list', stableFilters],
    queryFn: () => habitsApi.list(stableFilters),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHabitRequest) => habitsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useToggleHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitsApi.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: [...HABITS_KEY, 'streak-status'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'gamification'] });
    },
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHabitRequest }) => habitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'gamification'] });
    },
  });
}

export function useStreakStatus() {
  return useQuery({
    queryKey: [...HABITS_KEY, 'streak-status'],
    queryFn: habitsApi.streakStatus,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
