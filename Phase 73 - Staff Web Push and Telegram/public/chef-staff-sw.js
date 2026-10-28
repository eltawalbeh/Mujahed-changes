/* Chef Mujahed staff push service worker. Does not intercept navigation/fetch. */
self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const url = typeof data.url === 'string' && data.url.startsWith('https://chefmujahed.com/dashboard/requests/')
    ? data.url : 'https://chefmujahed.com/dashboard/notifications';
  event.waitUntil(self.registration.showNotification(data.title || 'Chef Mujahed', {
    body: data.body || 'تحديث جديد في الطلبات',
    icon: '/chef-staff-icon.svg',
    badge: '/chef-staff-icon.svg',
    tag: data.tag || 'chef-staff-notification',
    data: { url },
    renotify: false,
  }));
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url : 'https://chefmujahed.com/dashboard/notifications';
  event.waitUntil(clients.matchAll({type: 'window',includeUncontrolled: true}).then(function(windows) {
    for (const client of windows) {
      if (client.url.startsWith('https://chefmujahed.com/') && 'focus' in client) {
        return client.focus().then(function(){ return client.navigate(url); });
      }
    }
    return clients.openWindow(url);
  }));
});