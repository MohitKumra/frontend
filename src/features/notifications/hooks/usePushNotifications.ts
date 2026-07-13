// frontend/src/features/notifications/hooks/usePushNotifications.ts
// Handles registering the service worker, requesting browser notification permissions,
// checking status, and subscribing/unsubscribing to Web Push.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api';
import toast from 'react-hot-toast';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  // Query logs
  const logsQuery = useQuery({
    queryKey: ['notification-logs'],
    queryFn: notificationsApi.getLogs,
  });

  // Mark all read mutation
  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-logs'] }),
  });

  // Test notification mutation
  const testNotifMutation = useMutation({
    mutationFn: (channels?: ('BROWSER_PUSH' | 'EMAIL' | 'NATIVE_LOCAL')[]) =>
      notificationsApi.sendTestNotification(channels),
    onSuccess: () => toast.success('Test notification dispatched! Check your channels.'),
    onError: () => toast.error('Failed to send test notification'),
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    void checkSubscription();
  }, []);

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      setIsSubscribed(true);

      // Refresh the backend's copy of the subscription whenever we detect one.
      // This helps repair stale backend state after a browser reload or key rotation.
      const rawSub = subscription.toJSON();
      if (rawSub.endpoint && rawSub.keys?.p256dh && rawSub.keys?.auth) {
        await notificationsApi.subscribe({
          endpoint: rawSub.endpoint,
          keys: {
            p256dh: rawSub.keys.p256dh,
            auth: rawSub.keys.auth,
          },
        });
      }

      // If the permission is already granted, re-subscribe once so the endpoint
      // is guaranteed to match the current VAPID key pair.
      if (Notification.permission === 'granted') {
        await subscription.unsubscribe();
        const keyData = await notificationsApi.getVapidKey();
        if (keyData.publicKey) {
          const freshRegistration = await navigator.serviceWorker.register('/sw.js');
          const freshSubscription = await freshRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
          });
          const freshRaw = freshSubscription.toJSON();
          if (freshRaw.endpoint && freshRaw.keys?.p256dh && freshRaw.keys?.auth) {
            await notificationsApi.subscribe({
              endpoint: freshRaw.endpoint,
              keys: {
                p256dh: freshRaw.keys.p256dh,
                auth: freshRaw.keys.auth,
              },
            });
            setIsSubscribed(true);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to check push subscription status:', err);
    }
  }

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    setLoading(true);
    try {
      // 1. Request Permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied');
        setLoading(false);
        return;
      }

      // 2. Fetch VAPID key
      const keyData = await notificationsApi.getVapidKey();
      if (!keyData.publicKey) {
        throw new Error('VAPID public key is not configured on the backend');
      }

      // 3. Register SW and Subscribe
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      // Ensure sw.js is registered
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      // 4. Send subscription payload to backend
      const rawSub = subscription.toJSON();
      if (!rawSub.endpoint || !rawSub.keys?.p256dh || !rawSub.keys?.auth) {
        throw new Error('Invalid subscription keys generated by browser');
      }

      await notificationsApi.subscribe({
        endpoint: rawSub.endpoint,
        keys: {
          p256dh: rawSub.keys.p256dh,
          auth: rawSub.keys.auth,
        },
      });

      setIsSubscribed(true);
      toast.success('Successfully subscribed to push notifications! 🔔');
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      toast.error(err.message || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      await notificationsApi.unsubscribe();
      setIsSubscribed(false);
      toast.success('Unsubscribed from push notifications.');
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      toast.error('Unsubscription failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    logs: logsQuery.data?.data ?? [],
    logsLoading: logsQuery.isLoading,
    markAllAsRead: markReadMutation.mutate,
    sendTest: testNotifMutation.mutate,
  };
}
