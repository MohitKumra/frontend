// frontend/src/features/notion/api.ts
// Notion integration API calls.
// Supports both legacy Database API and new Data Source API.

import apiClient from '../../lib/apiClient';
import type {
  NotionIntegrationDTO,
  NotionDatabaseDTO,
  NotionDatabaseProperty,
  NotionImportResult,
  NotionPagePreview,
} from '../../types';

export interface AutoPreviewResult {
  pages: NotionPagePreview[];
  propertyMapping: Record<string, string>;
}

export const notionApi = {
  /** Start OAuth flow — returns the Notion authorization URL */
  startOAuth: (returnTo: string) =>
    apiClient.get<{ url: string }>('/notion/start', { params: { returnTo } }).then((r) => r.data),

  /** Get current Notion connection status */
  getStatus: () => apiClient.get<NotionIntegrationDTO>('/notion/status').then((r) => r.data),

  /** Disconnect Notion */
  disconnect: () => apiClient.post<{ success: boolean }>('/notion/disconnect').then((r) => r.data),

  /** List accessible Notion databases/data sources */
  listDatabases: () => apiClient.get<{ data: NotionDatabaseDTO[] }>('/notion/databases').then((r) => r.data.data),

  /** Preview pages with auto-mapped properties for tasks */
  autoPreview: (collectionId: string, object: string) =>
    apiClient
      .get<{ data: AutoPreviewResult }>(`/notion/databases/${collectionId}/auto-preview`, { params: { object } })
      .then((r) => r.data.data),

  /** Preview pages with auto-mapped properties for notes/journal */
  autoPreviewNotes: (collectionId: string, object: string) =>
    apiClient
      .get<{ data: AutoPreviewResult }>(`/notion/databases/${collectionId}/auto-preview-notes`, { params: { object } })
      .then((r) => r.data.data),

  /** Get properties of a specific Notion collection */
  getDatabaseProperties: (collectionId: string, object: string) =>
    apiClient
      .get<{ data: Record<string, NotionDatabaseProperty> }>(`/notion/databases/${collectionId}/properties`, {
        params: { object },
      })
      .then((r) => r.data.data),

  /** Preview pages from a Notion collection (with explicit property mapping) */
  previewPages: (collectionId: string, object: string, propertyMapping: Record<string, string>) =>
    apiClient
      .post<{ data: NotionPagePreview[] }>(`/notion/databases/${collectionId}/pages`, { object, propertyMapping })
      .then((r) => r.data.data),

  /** Get already-imported Notion page IDs */
  getImportedPageIds: () => apiClient.get<{ data: string[] }>('/notion/imported-pages').then((r) => r.data.data),

  /** Import tasks from a Notion collection */
  importTasks: (collectionId: string, object: string, propertyMapping: Record<string, string>, pageIds?: string[]) =>
    apiClient
      .post<NotionImportResult>('/notion/import/tasks', { databaseId: collectionId, object, propertyMapping, pageIds })
      .then((r) => r.data),

  /** Import notes from a Notion collection */
  importNotes: (
    collectionId: string,
    object: string,
    propertyMapping: Record<string, string>,
    isJournal?: boolean,
    pageIds?: string[]
  ) =>
    apiClient
      .post<NotionImportResult>('/notion/import/notes', {
        databaseId: collectionId,
        object,
        propertyMapping,
        isJournal,
        pageIds,
      })
      .then((r) => r.data),
};
