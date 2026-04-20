const CACHE_NAME = 'biblia-sagrada-v1';

const STATIC_ASSETS = [
  '/',
  '/biblia-sagrada.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Instala e pré-cacheia os assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: Network first, fallback para cache
// Para a API do Claude: network only (não cacheia respostas da IA)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API Anthropic: sempre network, nunca cacheia
  if (url.hostname === 'api.anthropic.com') {
    return; // deixa o browser lidar normalmente
  }

  // Google Fonts: stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Resto: Network first, fallback para cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Só cacheia respostas válidas GET
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
