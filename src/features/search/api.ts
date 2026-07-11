import apiClient from '../../lib/apiClient';
import type { SearchResult } from '../../types';

export async function search(query: string): Promise<SearchResult[]> {
  const res = await apiClient.get<{ data: SearchResult[] }>('/search', {
    params: { q: query },
  });
  return res.data.data;
}
