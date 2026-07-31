// frontend/src/features/notion/hooks/useNotion.ts
// Notion integration hooks.
// Supports both legacy Database API and new Data Source API.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { notionApi } from '../api';
import { useAuthStore } from '../../../store/authStore';

const NOTION_KEY = ['notion'] as const;

export function useNotionStatus() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: [...NOTION_KEY, 'status'],
    queryFn: notionApi.getStatus,
    enabled: Boolean(accessToken),
  });
}

export function useNotionStartOAuth() {
  return useMutation({
    mutationFn: (returnTo: string) => notionApi.startOAuth(returnTo),
  });
}

export function useNotionDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notionApi.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTION_KEY });
      toast.success('Notion disconnected');
    },
    onError: () => toast.error('Failed to disconnect Notion'),
  });
}

export function useNotionDatabases() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: [...NOTION_KEY, 'databases'],
    queryFn: notionApi.listDatabases,
    enabled: Boolean(accessToken),
  });
}

export function useNotionDatabaseProperties(collectionId: string | null, object: string | null) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: [...NOTION_KEY, 'properties', collectionId, object],
    queryFn: () => notionApi.getDatabaseProperties(collectionId!, object!),
    enabled: Boolean(accessToken) && Boolean(collectionId) && Boolean(object),
  });
}

export function useNotionImportTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, object, propertyMapping, pageIds }: { collectionId: string; object: string; propertyMapping: Record<string, string>; pageIds?: string[] }) =>
      notionApi.importTasks(collectionId, object, propertyMapping, pageIds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: NOTION_KEY });
      toast.success(`Imported ${data.imported} tasks${data.errors.length > 0 ? ` (${data.errors.length} errors)` : ''}`);
    },
    onError: (err) => toast.error('Failed to import tasks from Notion'),
  });
}

export function useNotionImportNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, object, propertyMapping, isJournal, pageIds }: { collectionId: string; object: string; propertyMapping: Record<string, string>; isJournal?: boolean; pageIds?: string[] }) =>
      notionApi.importNotes(collectionId, object, propertyMapping, isJournal, pageIds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: NOTION_KEY });
      toast.success(`Imported ${data.imported} notes${data.errors.length > 0 ? ` (${data.errors.length} errors)` : ''}`);
    },
    onError: (err) => toast.error('Failed to import notes from Notion'),
  });
}

export function useNotionPreviewPages() {
  return useMutation({
    mutationFn: ({ collectionId, object, propertyMapping }: { collectionId: string; object: string; propertyMapping: Record<string, string> }) =>
      notionApi.previewPages(collectionId, object, propertyMapping),
  });
}

export function useNotionAutoPreview() {
  return useMutation({
    mutationFn: ({ collectionId, object }: { collectionId: string; object: string }) =>
      notionApi.autoPreview(collectionId, object),
  });
}

export function useNotionAutoPreviewNotes() {
  return useMutation({
    mutationFn: ({ collectionId, object }: { collectionId: string; object: string }) =>
      notionApi.autoPreviewNotes(collectionId, object),
  });
}

export function useNotionImportedPageIds() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: [...NOTION_KEY, 'imported-pages'],
    queryFn: notionApi.getImportedPageIds,
    enabled: Boolean(accessToken),
  });
}