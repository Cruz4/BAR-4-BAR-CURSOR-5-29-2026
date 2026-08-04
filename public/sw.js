/* Bar 4 Bar Studio — PWA shell + visited routes for offline studio */
const CACHE_NAME = 'b4b-static-v8';
const SHELL_CACHE = 'b4b-shell-v8';
const STATIC_ASSETS = ['/Logo.png', '/B4B_Font.otf', '/YUSRB_font.ttf'];

// Firebase Cloud Messaging (Activity push) — no-ops if messaging isn't used yet.
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');
try {
  firebase.initializeApp({
    apiKey: 'AIzaSyAJX5uEhA_8SFvXGEnboud6i3VETJcfWVg',
    authDomain: 'bar4bar.ink',
    projectId: 'lyricai-studio-otgxn',
    storageBucket: 'lyricai-studio-otgxn.firebasestorage.app',
    messagingSenderId: '603155091344',
    appId: '1:603155091344:web:3662234090b291129aad15',
  });
  firebase.messaging();
} catch (e) {
  console.warn('[sw] firebase messaging init', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href =
    (event.notification.data && event.notification.data.href) ||
    (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.href) ||
    '/activity';
  const path = typeof href === 'string' && href.startsWith('http') ? new URL(href).pathname + new URL(href).hash : href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(path);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(path);
    })
  );
});

self.addEventListener('push', (event) => {
  // FCM background handler usually paints the notification; this is a fallback
  // when a raw push payload arrives without the messaging SDK handling it.
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Bar 4 Bar', body: event.data.text() } };
  }
  const title = payload.notification?.title || payload.data?.title || 'Bar 4 Bar';
  const body = payload.notification?.body || payload.data?.body || 'You have new activity';
  const href = payload.data?.href || '/activity';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/Logo.png',
      badge: '/Logo.png',
      data: { href },
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME && k !== SHELL_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function isStaticAsset(pathname) {
  return STATIC_ASSETS.includes(pathname);
}

function isStudioRoute(pathname) {
  return (
    pathname === '/' ||
    pathname.startsWith('/albums/') ||
    pathname.startsWith('/usage') ||
    pathname.startsWith('/activity')
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API, auth, or manifest — avoids breaking invite gate + RSC
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/sw.js'
  ) {
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  if (event.request.mode === 'navigate' && isStudioRoute(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const forRequest = response.clone();
            const forPath = response.clone();
            caches.open(SHELL_CACHE).then((cache) =>
              Promise.all([
                cache.put(event.request, forRequest),
                cache.put(url.pathname, forPath),
              ])
            );
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match(url.pathname)) ||
            (await caches.match('/'));
          if (cached) return cached;
          return Response.error();
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/');
          return Response.error();
        })
      )
  );
});
