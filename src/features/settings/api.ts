import apiClient from '../../lib/apiClient';
import type {
  AppearanceSettingsDTO,
  GoogleCalendarSyncResponse,
  NotificationPreferenceDTO,
  SettingsDTO,
  UpdateAppearanceRequest,
  UpdateNotificationPreferencesRequest,
  UpdateRecoveryEmailRequest,
} from '../../types';

export const settingsApi = {
  getSettings: () =>
    apiClient.get<SettingsDTO>('/settings').then((r) => r.data),

  updateAppearance: (data: UpdateAppearanceRequest) =>
    apiClient.patch<AppearanceSettingsDTO>('/settings/appearance', data).then((r) => r.data),

  updateNotifications: (data: UpdateNotificationPreferencesRequest) =>
    apiClient.patch<NotificationPreferenceDTO>('/settings/notifications', data).then((r) => r.data),

  updateRecoveryEmail: (data: UpdateRecoveryEmailRequest) =>
    apiClient.patch<{ recoveryEmail: string | null }>('/settings/security/recovery-email', data).then((r) => r.data),

  googleCalendarStart: (returnTo: string) =>
    apiClient.get<{ url: string }>('/settings/google-calendar/start', { params: { returnTo } }).then((r) => r.data),

  syncGoogleCalendar: () =>
    apiClient.post<GoogleCalendarSyncResponse>('/settings/google-calendar/sync').then((r) => r.data),

  disconnectGoogleCalendar: () =>
    apiClient.post<{ success: boolean }>('/settings/google-calendar/disconnect').then((r) => r.data),
};
