const CACHE_NAME = 'harvest-finance-v1';
const STATIC_CACHE = 'harvest-static-v1';
const API_CACHE = 'harvest-api-v1';
const DYNAMIC_CACHE = 'harvest-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/vaults',
  '/portfolio',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon.svg',
];

const API_ROUTES = [
  '/api/v1/vaults',
  '/api/v1/transactions',
  '/api/v1/farm-vaults',
  '/api/v1/farm-intelligence/recommendations',
  '/api/v1/users/me',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    // Only queue specific POST routes for background sync
    const syncableRoutes = ['/api/v1/vaults/', '/api/v1/farm-vaults/'];
    const isSyncable = syncableRoutes.some(route => url.pathname.includes(route));

    if (isSyncable) {
      event.respondWith(
        fetch(request.clone()).catch(() => {
          return new Response(JSON.stringify({ 
            error: 'offline', 
            queued: true,
            message: 'You are offline. Your action has been queued and will sync automatically.'
          }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );
      return;
    }
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
});

async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('You are offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'harvest-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_TRIGGERED' });
  });
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const { urls } = event.data;
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(urls);
      })
    );
  }
});