import { useQuery } from '@tanstack/react-query';
import { search } from '../api';

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => search(query),
    enabled: query.trim().length > 0,
    staleTime: 60000, // 1 minute
  });
}
