const CACHE_NAME = 'gestao-escolar-pwa-v1';

self.addEventListener('install', (event) => {
  const scopeUrl = self.registration.scope;
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([scopeUrl, `${scopeUrl}manifest.webmanifest`, `${scopeUrl}pwa-icon.svg`]))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação HTML: Network-first com fallback para cache offline
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(self.registration.scope)))
    );
    return;
  }

  // Assets estáticos (JS/CSS/SVG/JSON): Cache-first com atualização em segundo plano
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
