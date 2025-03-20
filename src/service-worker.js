// This is the service worker with the Advanced caching

const CACHE = "cea-app-v1.7.0";
const cacheFiles = [
  "/",
  "index.html",
  "manifest.json"
];

// Instalação: armazena caches iniciais
self.addEventListener("install", event => {
  console.log('[ServiceWorker] Instalado');
  self.skipWaiting(); // Força ativação imediata
  
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      console.log("[ServiceWorker] Caching app shell");
      return cache.addAll(cacheFiles);
    })
  );
});

// Ativação: limpa caches antigos
self.addEventListener("activate", event => {
  console.log('[ServiceWorker] Ativado');
  
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE) {
            console.log('[ServiceWorker] Removendo cache antigo', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Toma controle de clientes sem esperar por reload
});

// Estratégia de Cache: Verificar rede primeiro, depois cache para fallback
self.addEventListener("fetch", event => {
  if (event.request.url.includes('/api/')) {
    // Para chamadas de API, sempre tentar rede primeiro
    event.respondWith(networkFirst(event.request));
  } else {
    // Para outros recursos, tentar rede, se falhar tenta cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se for resposta válida, armazena no cache
          let responseClone = response.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Se falhar, busca do cache
          return caches.match(event.request);
        })
    );
  }
});

// Estratégia Network First para APIs
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      // Se for resposta válida, clone e armazena no cache
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      let responseClone = response.clone();
      caches.open(CACHE).then(cache => {
        cache.put(request, responseClone);
      });

      return response;
    })
    .catch(() => {
      // Se falhar, tenta buscar do cache
      return caches.match(request);
    });
}

// Mensagens - permite atualizações forçadas da aplicação
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    console.log('[ServiceWorker] Verificando por atualizações');
    // Força recarregamento do service worker
    self.registration.update();
  }
}); 