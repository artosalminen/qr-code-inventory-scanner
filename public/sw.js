const CACHE_NAME = 'qr-inventory-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // API routes: always network, never cache
  if (e.request.url.includes('/api/')) return;
  // Everything else: network-first, fall through to cache on failure
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request)),
  );
});
