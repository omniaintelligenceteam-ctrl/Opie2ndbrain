// Minimal service worker - no caching, just pass through
// This prevents cache issues while keeping PWA installability

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear all old caches
  event.waitUntil(
    caches.keys().then((names) => 
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests - no caching
  event.respondWith(fetch(event.request));
});
