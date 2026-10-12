// Dapur Pintar Service Worker

const CACHE_NAME = 'dapur-pintar-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.ico',
  './manifest.json',
  './js/app.js',
  './js/config.js',
  './js/core/router.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/services/camera.js',
  './js/services/image.js',
  './js/services/gemini.js',
  './js/services/firebase.js',
  './js/components/header.js',
  './js/components/bottom-nav.js',
  './js/components/toast.js',
  './js/components/modal.js',
  './js/pages/beranda.js',
  './js/pages/pindai.js',
  './js/pages/konfirmasi.js',
  './js/pages/ide-masak.js',
  './js/pages/catatan.js',
  './js/utils/format.js',
  './js/utils/prompts.js',
  './js/utils/brightness.js',
  './js/utils/uuid.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes (bypass chrome-extension, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  // Let external APIs and /api/ serverless routes bypass cache
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return caches.match('./index.html');
      });
    })
  );
});
