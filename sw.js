/* ===== Firebase Cloud Messaging (background notifications) ===== */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDXwmFVOCFAy7hC5auCSC7emdOF4KN4J6M",
  authDomain: "doomsday-tracker.firebaseapp.com",
  projectId: "doomsday-tracker",
  storageBucket: "doomsday-tracker.firebasestorage.app",
  messagingSenderId: "930591622843",
  appId: "1:930591622843:web:9bf760326dd0d0d139cb9e"
});

const messaging = firebase.messaging();

// The backend sends DATA-only messages; we build the notification here so it
// looks the same every time and there are no duplicate pop-ups.
messaging.onBackgroundMessage((payload)=>{
  const d = payload.data || {};
  self.registration.showNotification(d.title || 'Road to Doomsday', {
    body: d.body || 'Someone watched a movie!',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: d.url || 'https://misaelonti-sketch.github.io/doomsday/' }
  });
});

// Tapping the notification opens (or focuses) the app.
self.addEventListener('notificationclick', (event)=>{
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url)
    || 'https://misaelonti-sketch.github.io/doomsday/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list)=>{
      for(const c of list){ if(c.url.includes('/doomsday') && 'focus' in c) return c.focus(); }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
/* ===== end FCM ===== */

const CACHE_NAME = 'doomsday-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
];

// Cache assets on install
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll fails the whole batch if one request errors (e.g. opaque cross-origin
      // font response) — cache what we can instead of blocking install.
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    )
  );
});

// Clean up old caches on activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Intercept requests — stale-while-revalidate
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Let the browser handle Firebase database sync normally — never cache this
  if (e.request.url.includes('firebaseio.com')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        // Update the cache with the fresh network response for next time
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Network failed (offline). We just return the cached response.
      });

      // Return cached immediately if we have it, otherwise wait for the network
      return cachedResponse || fetchPromise;
    })
  );
});
