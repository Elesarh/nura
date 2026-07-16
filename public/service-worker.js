const CACHE_NAME = 'nura-cache-v3';
const DYNAMIC_CACHE = 'nura-dynamic-v3';

const STATIC_ASSETS = [
  '/nura/',
  '/nura/index.html',
  '/nura/manifest.json',
  '/nura/offline.html',
  '/nura/icons/icon-72.png',
  '/nura/icons/icon-96.png',
  '/nura/icons/icon-128.png',
  '/nura/icons/icon-144.png',
  '/nura/icons/icon-152.png',
  '/nura/icons/icon-192.png',
  '/nura/icons/icon-384.png',
  '/nura/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // For navigation requests - always try network first, fallback to index.html (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/nura/index.html').then(cached => {
          return cached || caches.match('/nura/offline.html');
        });
      })
    );
    return;
  }

  // For assets - cache first
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, cloned));
        }
        return response;
      });
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'NURA', body: 'به‌روزرسانی جدید!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/nura/icons/icon-192.png',
      badge: '/nura/icons/icon-72.png',
      vibrate: [100, 50, 100],
    })
  );
});