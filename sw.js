// IronLog Service Worker
// Cache-first strategy for app shell, network-first for API calls.

// mpbph7qk is replaced at build time by the sw-build-id Vite plugin so
// every deploy gets a fresh cache and the activate handler purges the old one.
const CACHE = 'ironlog-mpbph7qk';
const BASE_URL = new URL('./', self.location.href);
const urlFor = (path) => new URL(path, BASE_URL).toString();
const APP_SHELL = ['./', './index.html', './manifest.json'].map(urlFor);
const APP_SHELL_PATHS = new Set(APP_SHELL.map((entry) => new URL(entry).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  // Claim all clients
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  if (url.origin !== self.location.origin) return;

  // For app shell files: network-first so deploys are picked up immediately,
  // fall back to cache only when offline.
  if (APP_SHELL_PATHS.has(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // For JS/CSS/assets: stale-while-revalidate
  if (/\.(js|css|svg|png|jpg|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetched = fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 })))
  );
});

// Push notifications — only register if in standalone mode (PWA installed)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'Time to train!',
    icon: urlFor('./icon-192.png'),
    badge: urlFor('./icon-192.png'),
    tag: 'ironlog-workout',
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'IronLog', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow(BASE_URL.href);
      }
    })
  );
});
