import apiClient from '../../lib/apiClient';

export type StorageFileType = 'image' | 'video' | 'audio' | 'document' | 'other';

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
}

export interface StorageResponseDTO {
  files: StorageFileDTO[];
  summary: StorageSummaryDTO;
}

export const storageApi = {
  list: () =>
    apiClient.get<{ data: StorageResponseDTO }>('/storage').then((r) => r.data.data),
};
