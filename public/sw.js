// frontend/public/sw.js
// Service Worker to receive and show background push notifications.

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body,
        icon: payload.icon || '/favicon.svg',
        badge: '/favicon.svg',
        data: payload.data || {},
        vibrate: [100, 50, 100],
      };

      event.waitUntil(self.registration.showNotification(payload.title, options));
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Notification received', {
          body: text,
          icon: '/favicon.svg',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // Open the application on click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
