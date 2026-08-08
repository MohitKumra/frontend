// frontend/src/platform/notifications.ts
// Unified notification abstraction.
// Components call notify() — never the Web Notifications API or Capacitor plugins directly.
// This is the single branch point for web vs native behavior.

import { LocalNotifications } from '@capacitor/local-notifications';

export interface NotifyPayload {
  title: string;
  body: string;
  icon?: string;
}

function isNative(): boolean {
  return typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    ?.isNativePlatform === 'function'
    ? (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform()
    : false;
}

/** Request notification permission. Returns true if granted. */
export async function requestPermission(): Promise<boolean> {
  if (isNative()) {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  }
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Send a notification via the appropriate platform channel. */
export async function notify(payload: NotifyPayload): Promise<void> {
  if (isNative()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: payload.title,
          body: payload.body,
          id: Math.floor(Math.random() * 1000000) + 1,
        },
      ],
    });
    return;
  }
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(payload.title, { body: payload.body, icon: payload.icon });
}
