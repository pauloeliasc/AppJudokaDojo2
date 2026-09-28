const CACHE_NAME = 'judoka-dojo-v4';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Install event: cache core assets and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Pre-caching asset skipped:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event: clean up older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removendo cache antigo do PWA:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event: Network-first for HTML navigations, Stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle SPA Navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to cached index.html if network is unreachable
          const cachedIndex = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedIndex) {
            return cachedIndex;
          }

          // Fallback friendly offline HTML if cache is empty
          return new Response(
            `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Judoka Dojô - Reconectando</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; box-sizing: border-box; }
                .card { background: #1e293b; border: 1px solid #334155; padding: 32px 24px; border-radius: 24px; max-width: 360px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                h1 { font-size: 20px; font-weight: 800; margin: 16px 0 8px; }
                p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px; }
                button { background: #4f46e5; color: white; border: none; padding: 14px 24px; border-radius: 14px; font-size: 14px; font-weight: 700; width: 100%; cursor: pointer; }
                button:active { transform: scale(0.98); }
              </style>
            </head>
            <body>
              <div class="card">
                <div style="font-size: 40px;">🥋</div>
                <h1>Judoka Dojô</h1>
                <p>Você está temporariamente sem sinal de internet no dispositivo. Verifique sua conexão para continuar.</p>
                <button onclick="window.location.reload()">Tentar Novamente</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, images, icons, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Fetch fresh version in background and cache it (Stale-While-Revalidate)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback gracefully
          return cachedResponse || Response.error();
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for explicit skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
