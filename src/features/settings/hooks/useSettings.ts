import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '../api';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import type {
  UpdateAppearanceRequest,
  UpdateNotificationPreferencesRequest,
} from '../../../types';

const SETTINGS_KEY = ['settings'] as const;

export function useSettings() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: settingsApi.getSettings,
    enabled: Boolean(accessToken),
  });
}

export function useUpdateAppearance() {
  const qc = useQueryClient();
  const setTheme = useUIStore((s) => s.setTheme);
  const setLayoutPreference = useUIStore((s) => s.setLayoutPreference);
  const setCalendarViewPreference = useUIStore((s) => s.setCalendarViewPreference);

  return useMutation({
    mutationFn: (data: UpdateAppearanceRequest) => settingsApi.updateAppearance(data),
    onSuccess: async (data) => {
      await setTheme(data.themePreference === 'SYSTEM' ? 'system' : data.themePreference === 'DARK' ? 'dark' : 'light');
      if (data.layoutPreference) {
        setLayoutPreference(data.layoutPreference);
      }
      if (data.calendarView) {
        setCalendarViewPreference(data.calendarView);
      }
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success('Appearance updated');
    },
  });
}

export function useUpdateNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateNotificationPreferencesRequest) => settingsApi.updateNotifications(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success('Notification preferences saved');
    },
  });
}

export function useUpdateRecoveryEmail() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (recoveryEmail: string | null) => settingsApi.updateRecoveryEmail({ recoveryEmail }),
    onSuccess: (data) => {
      const auth = useAuthStore.getState();
      if (auth.user) {
        setUser({ ...auth.user, recoveryEmail: data.recoveryEmail });
      }
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success('Recovery email updated');
    },
  });
}

export function useGoogleCalendarStart() {
  return useMutation({
    mutationFn: (returnTo: string) => settingsApi.googleCalendarStart(returnTo),
  });
}

export function useSyncGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.syncGoogleCalendar(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success(`Synced ${data.synced} calendar items`);
    },
    onError: () => toast.error('Could not sync Google Calendar'),
  });
}

export function useDisconnectGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.disconnectGoogleCalendar(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success('Google Calendar disconnected');
    },
  });
}
