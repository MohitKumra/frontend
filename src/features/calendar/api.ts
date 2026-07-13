import apiClient from '../../lib/apiClient';
import type { CalendarOverviewDTO } from '../../types';

export const calendarApi = {
  getOverview: (params: { from: string; to: string }) =>
    apiClient.get<CalendarOverviewDTO>('/calendar/overview', { params }).then((r) => r.data),
};
