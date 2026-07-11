// frontend/src/features/notes/hooks/useNotes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../api';
import type { CreateNoteRequest, UpdateNoteRequest } from '../../../types';

const NOTES_KEY = ['notes'] as const;

export function useNotes(isJournal?: boolean) {
  return useQuery({
    queryKey: [...NOTES_KEY, { isJournal }],
    queryFn: () => notesApi.list(isJournal),
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
