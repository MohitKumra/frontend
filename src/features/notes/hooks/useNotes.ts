// frontend/src/features/notes/hooks/useNotes.ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../api';
import type { CreateNoteRequest, UpdateNoteRequest, NoteListParams } from '../../../types';

const NOTES_KEY = ['notes'] as const;
const DEFAULT_LIMIT = 20;

export function useNotes(filters?: Omit<NoteListParams, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: [...NOTES_KEY, filters],
    queryFn: ({ pageParam = 1 }) =>
      notesApi.list({ ...filters, page: pageParam as number, limit: DEFAULT_LIMIT }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteRequest) => notesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteRequest }) => notesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) => notesApi.togglePin(id, isPinned),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useArchiveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useUnarchiveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.unarchive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}
