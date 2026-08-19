// frontend/src/features/notes/api.ts
import apiClient from '../../lib/apiClient';
import type { NoteDTO, CreateNoteRequest, UpdateNoteRequest, NoteListParams, PaginatedResponse, Bookmark } from '../../types';

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
  archive: (id: string) => apiClient.patch<NoteDTO>(`/notes/${id}`, { archived: true }).then((r) => r.data),

  /** Unarchive a note */
  unarchive: (id: string) => apiClient.patch<NoteDTO>(`/notes/${id}`, { archived: false }).then((r) => r.data),

  /**
   * Persist the full bookmarks array for a note.
   * Pass the complete desired array — backend replaces it entirely.
   * Max 5 bookmarks enforced server-side.
   */
  updateBookmarks: (id: string, bookmarks: Bookmark[]) =>
    apiClient.patch<NoteDTO>(`/notes/${id}`, { bookmarks }).then((r) => r.data),

  /**
   * Upload a pre-processed book cover image.
   *
   * The caller must run the image through `processCoverImage()` from
   * `lib/coverImageProcessor.ts` first — this endpoint expects an already-
   * optimized WebP or JPEG base64 payload.
   *
   * Returns the updated NoteDTO with the new coverUrl set.
   */
  uploadCover: (
    noteId: string,
    payload: {
      fileName: string;
      mimeType: 'image/webp' | 'image/jpeg';
      base64Data: string;
    },
  ) =>
    apiClient
      .post<NoteDTO>('/media/upload-cover', { noteId, ...payload })
      .then((r) => r.data),

  /** Remove the cover photo from a note (sets coverUrl to null). */
  removeCover: (id: string) =>
    apiClient.patch<NoteDTO>(`/notes/${id}`, { coverUrl: null }).then((r) => r.data),

  /**
   * Persist cover typography / style customization.
   * Sends only the coverStyle field to avoid overwriting other note data.
   */
  saveCoverStyle: (id: string, coverStyle: import('../../types').CoverStyle | null) =>
    apiClient.patch<NoteDTO>(`/notes/${id}`, { coverStyle }).then((r) => r.data),

  /**
   * Persist reader-side book styling (theme, font, fontSize).
   * Sends only the bookStyle field to avoid overwriting other note data.
   */
  saveBookStyle: (id: string, bookStyle: import('../../types').BookStyle | null) =>
    apiClient.patch<NoteDTO>(`/notes/${id}`, { bookStyle }).then((r) => r.data),
};
