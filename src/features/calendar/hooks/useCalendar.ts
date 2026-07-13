import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../api';

const CALENDAR_KEY = ['calendar'] as const;

export function useCalendarOverview(range: { from: string; to: string }) {
  return useQuery({
    queryKey: [...CALENDAR_KEY, range],
    queryFn: () => calendarApi.getOverview(range),
  });
}
