// frontend/src/features/tasks/hooks/useTasks.ts
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import type { CreateTaskRequest, UpdateTaskRequest } from '../../../types';

const TASKS_KEY = ['tasks'] as const;
const PAGE_SIZE = 10;

// ─── Cursor / infinite-scroll hook (used by board view per-column) ────────────
export function useTasksCursor(filters?: Record<string, string>, options?: { enabled?: boolean }) {
  const stableFilters = filters
    ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined))
    : undefined;

  return useInfiniteQuery({
    queryKey: [...TASKS_KEY, 'cursor', stableFilters],
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, string> = { ...(stableFilters ?? {}), take: String(PAGE_SIZE) };
      if (pageParam) params.cursor = pageParam as string;
      return tasksApi.list(params, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    enabled: options?.enabled !== false,
    retry: (failureCount, error: unknown) => {
      if ((error as { name?: string })?.name === 'CanceledError') return false;
      if ((error as { name?: string })?.name === 'AbortError') return false;
      return failureCount < 2;
    },
  });
}

// ─── Offset / page-based hook (used by card/list view) ────────────────────────
export function useTasksOffset(filters: Record<string, string>, page: number, options?: { enabled?: boolean }) {
  const stableFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)
  );

  return useQuery({
    queryKey: [...TASKS_KEY, 'offset', stableFilters, page],
    queryFn: ({ signal }) => {
      const params: Record<string, string> = {
        ...stableFilters,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      };
      return tasksApi.list(params, signal);
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    enabled: options?.enabled !== false,
    retry: (failureCount, error: unknown) => {
      if ((error as { name?: string })?.name === 'CanceledError') return false;
      if ((error as { name?: string })?.name === 'AbortError') return false;
      return failureCount < 2;
    },
  });
}

// ─── Legacy infinite hook — kept for any callers outside TasksPage ────────────
export function useTasks(filters?: Record<string, string>, options?: { enabled?: boolean }) {
  return useTasksCursor(filters, options);
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ['goals'] });
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
      qc.invalidateQueries({ queryKey: ['goals'] });
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
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'gamification'] });
    },
  });
}
