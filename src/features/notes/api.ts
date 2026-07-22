// frontend/src/features/notes/api.ts
import apiClient from '../../lib/apiClient';
import type { NoteDTO, CreateNoteRequest, UpdateNoteRequest, NoteListParams, PaginatedResponse } from '../../types';

export const notesApi = {
  list: (params?: NoteListParams) =>
    apiClient.get<PaginatedResponse<NoteDTO>>('/notes', { params }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<NoteDTO>(`/notes/${id}`).then((r) => r.data),

  create: (data: CreateNoteRequest) => apiClient.post<NoteDTO>('/notes', data).then((r) => r.data),

  update: (id: string, data: UpdateNoteRequest) => apiClient.patch<NoteDTO>(`/notes/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/notes/${id}`),

  /** Toggle pin state locally and on server */
  togglePin: (id: string, isPinned: boolean) =>
    apiClient.patch<NoteDTO>(`/notes/${id}`, { isPinned }).then((r) => r.data),

  /** Archive a note */
  archive: (id: string) =>
    apiClient.patch<NoteDTO>(`/notes/${id}`, { archived: true }).then((r) => r.data),

  /** Unarchive a note */
  unarchive: (id: string) =>
    apiClient.patch<NoteDTO>(`/notes/${id}`, { archived: false }).then((r) => r.data),
};