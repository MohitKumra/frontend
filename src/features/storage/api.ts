import apiClient from '../../lib/apiClient';

export type StorageFileType = 'image' | 'video' | 'audio' | 'document' | 'other';
export type StorageQuickTab = 'all' | 'images' | 'documents' | 'media' | 'audio' | 'starred' | 'large';
export type StorageSortField = 'newest' | 'oldest' | 'size-desc' | 'size-asc' | 'name-asc' | 'name-desc' | 'type';
export type StorageViewMode = 'grid' | 'list' | 'compact';

export interface StorageFileDTO {
  id: string;
  url: string;
  name: string;
  sizeBytes: number;
  folder: string;
  fileType: StorageFileType;
  createdAt: string;
}

export interface StorageSummaryDTO {
  totalBytes: number;
  storageLimitBytes: number | null;
  byType: Record<StorageFileType, { count: number; bytes: number }>;
  byFolder: Record<string, { count: number; bytes: number }>;
  /** Number of files >= 1MB (server-computed for the "Large Files" tab). */
  largeFileCount: number;
  /** Lightweight list of all file ids (for client-side starred counting). */
  fileIds: string[];
}

export interface StoragePaginationDTO {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StorageListParams {
  tab?: StorageQuickTab;
  type?: StorageFileType | 'all';
  folder?: string;
  search?: string;
  sortBy?: StorageSortField;
  page?: number;
  pageSize?: number;
}

export interface StorageResponseDTO {
  files: StorageFileDTO[];
  summary: StorageSummaryDTO;
  pagination: StoragePaginationDTO;
}

export const storageApi = {
  list: (params: StorageListParams) =>
    apiClient.get<{ data: StorageResponseDTO }>('/storage', { params }).then((r) => r.data.data),
  deleteFile: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/storage/${id}`).then((r) => r.data),
  batchDelete: (ids: string[]) =>
    apiClient.post<{ success: boolean; count: number }>('/storage/batch-delete', { ids }).then((r) => r.data),
  uploadFile: async (payload: {
    fileName: string;
    mimeType: string;
    base64Data: string;
    folder?: string;
  }) => apiClient.post('/media/upload', payload).then((r) => r.data),
};


