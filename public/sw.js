const CACHE_NAME = 'parkscan-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/parkscan_icon.jpeg',
  '/assets/parkscan_logo.jpeg',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification handler (Background)
self.addEventListener('push', (event) => {
  let data = { title: '🅿️ ParkScan Alert', body: 'Zone payante détectée à proximité' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.body = event.data.text(); }
  }

  const options = {
    body: data.body || 'Alert parking',
    icon: '/assets/parkscan_icon.jpeg',
    badge: '/assets/parkscan_icon.jpeg',
    vibrate: [200, 100, 200, 100, 300],
    data: data.data || { url: '/' },
    tag: data.tag || 'parkscan-alert',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🅿️ ParkScan Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
