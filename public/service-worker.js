const CACHE_NAME = 'nura-cache-v1';
const DYNAMIC_CACHE = 'nura-dynamic-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/offline-image.png',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline page and assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// IndexedDB setup
const DB_NAME = 'nura-db';
const STORE_NAME = 'dynamic_api_responses';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToDB(key, data) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(data, key);
  return tx.complete;
}

async function getFromDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fetch event - Network First, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isApiRequest = url.pathname.startsWith('/api/');

  event.respondWith(
    fetch(event.request)
      .then(async (networkResponse) => {
        // Cache the successful network response dynamically
        if (isApiRequest) {
          const clonedResponse = networkResponse.clone();
          const data = await clonedResponse.json().catch(() => null);
          if (data) saveToDB(event.request.url, data);
        } else {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(event.request.url, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(async () => {
        if (isApiRequest) {
          const cachedData = await getFromDB(event.request.url);
          if (cachedData) {
            return new Response(JSON.stringify(cachedData), { headers: { 'Content-Type': 'application/json' } });
          }
        }
        
        // Network failed, try returning from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If neither network nor cache has it, show offline fallbacks
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/offline.html');
        }
        if (event.request.headers.get('accept').includes('image')) {
          return caches.match('/offline-image.png');
        }
      })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Notification', body: 'New update from the app!' };
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Perform sync operations like retrying failed POST requests
      // Integration with IndexedDB would be done here to fetch deferred actions
      new Promise((resolve) => {
        console.log('[Service Worker] Background sync completed');
        resolve();
      })
    );
  }
});
