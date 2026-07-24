// frontend/src/features/tasks/hooks/useTasks.ts
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import type { CreateTaskRequest, UpdateTaskRequest } from '../../../types';

const TASKS_KEY = ['tasks'] as const;

export function useTasks(filters?: Record<string, string>) {
  return useInfiniteQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: ({ pageParam }) => {
      const params: Record<string, string> = { ...filters, take: '20' };
      if (pageParam) {
        params.cursor = pageParam as string;
      }
      return tasksApi.list(params);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) => tasksApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'gamification'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'gamification'] });
    },
  });
}
