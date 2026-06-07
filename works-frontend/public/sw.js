/* bSmart Works service worker (iteration 18, Cap S — mobile-optimized PWA + offline).
 *
 * Strategy:
 *  - Precache the offline fallback + core static assets on install.
 *  - Navigations: network-first, falling back to the cached app shell / offline page when offline,
 *    so the installed PWA still opens without connectivity.
 *  - Same-origin static assets (scripts, styles, images, fonts): stale-while-revalidate.
 *  - API calls (/api/...): never cached here — data freshness and the offline-draft queue are
 *    handled in the app (lib/offline.js). The SW just lets those requests pass through.
 */
const VERSION = 'works-v18-1';
const STATIC_CACHE = `static-${VERSION}`;
const PRECACHE = ['/', '/offline.html', '/manifest.json', '/icon.svg', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // let API calls hit the network untouched

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(STATIC_CACHE).then((c) => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html'))),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

/* Web Push: show the notification the server sent (payload is JSON: { title, body, url }). */
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'bSmart Works', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'bSmart Works', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
