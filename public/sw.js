/* Bar 4 Bar Studio — PWA shell + visited routes for offline studio */
const CACHE_NAME = 'b4b-static-v4';
const SHELL_CACHE = 'b4b-shell-v4';
const STATIC_ASSETS = ['/Logo.png', '/B4B_Font.otf', '/YUSRB_font.ttf'];

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
    pathname.startsWith('/usage')
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

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
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => {
              cache.put(event.request, clone);
              cache.put(url.pathname, clone);
            });
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
