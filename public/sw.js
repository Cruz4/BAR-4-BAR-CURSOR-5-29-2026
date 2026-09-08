/* AKAsheet — PWA shell + FCM. Do NOT cache Next.js build chunks. */
const CACHE_NAME = 'akasheet-static-v1';
const SHELL_CACHE = 'akasheet-shell-v1';
const STATIC_ASSETS = ['/Logo.png', '/B4B_Font.otf', '/YUSRB_font.ttf'];
const BADGE_COUNT_CACHE_KEY = 'https://akasheet.internal/app-badge-count';

async function applyAppBadge(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  try {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(
      BADGE_COUNT_CACHE_KEY,
      new Response(JSON.stringify({ count: n, at: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch {
    /* cache unavailable */
  }
  if (typeof self.navigator?.setAppBadge !== 'function') return;
  if (n <= 0) {
    await self.navigator.clearAppBadge?.().catch(() => undefined);
  } else {
    await self.navigator.setAppBadge(n).catch(() => undefined);
  }
}

async function restorePersistedAppBadge() {
  try {
    const cache = await caches.open(SHELL_CACHE);
    const res = await cache.match(BADGE_COUNT_CACHE_KEY);
    if (!res) return;
    const payload = await res.json();
    await applyAppBadge(payload.count);
  } catch {
    /* ignore */
  }
}

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
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'AKAsheet';
    const body = payload.notification?.body || payload.data?.body || 'You have new activity';
    const href = payload.data?.href || '/activity';
    const unread = Math.max(1, Number(payload.data?.unread) || 1);
    return Promise.all([
      self.registration.showNotification(title, {
        body,
        icon: '/Logo.png',
        badge: '/Logo.png',
        data: { href },
        tag: payload.data?.type || 'akasheet-activity',
        renotify: true,
      }),
      applyAppBadge(unread),
    ]);
  });
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
  // FCM background pushes are handled in messaging.onBackgroundMessage above.
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'AKAsheet', body: event.data.text() } };
  }
  if (payload.messageId || payload.from) return;
  const title = payload.notification?.title || payload.data?.title || 'AKAsheet';
  const body = payload.notification?.body || payload.data?.body || 'You have new activity';
  const href = payload.data?.href || '/activity';
  const unread = Math.max(1, Number(payload.data?.unread) || 1);
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        icon: '/Logo.png',
        badge: '/Logo.png',
        data: { href },
      }),
      applyAppBadge(unread),
    ])
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
          // Drop every previous shell/static cache — old HTML points at deleted /_next chunks.
          keys.filter((k) => k !== CACHE_NAME && k !== SHELL_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      .then(() => restorePersistedAppBadge())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'SET_APP_BADGE') {
    const count = Math.max(0, Math.floor(Number(event.data.count) || 0));
    event.waitUntil(applyAppBadge(count));
  }
});

function isStaticAsset(pathname) {
  return STATIC_ASSETS.includes(pathname);
}

function isStudioRoute(pathname) {
  return (
    pathname === '/' ||
    pathname === '/library' ||
    pathname.startsWith('/albums/') ||
    pathname.startsWith('/usage') ||
    pathname.startsWith('/activity')
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept Next build output, APIs, auth, or the SW itself.
  // Intercepting /_next after a deploy causes mass chunk ERR_FAILED (stale HTML → gone hashes).
  if (
    url.pathname.startsWith('/_next/') ||
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

  // Navigations: network-only while online. Cache only as offline last resort —
  // never prefer cached HTML over a live Next document (chunk hashes change every deploy).
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

  // Everything else: network only (no SW Response.error() mask on failures).
  event.respondWith(fetch(event.request));
});
