// This is the service worker with the Advanced caching

const CACHE = "cea-app-v1.8.0";
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
  // Garantir que solicitações para dados locais sempre são atualizadas
  if (event.request.url.includes('localStorage') || 
      event.request.url.includes('indexedDB') ||
      event.request.method === 'POST') {
    // Não interferir com operações de dados locais
    console.log('[ServiceWorker] Passando operação de dados local', event.request.url);
    return;
  }
  
  if (event.request.url.includes('/api/')) {
    // Para chamadas de API, sempre tentar rede primeiro
    event.respondWith(networkFirst(event.request));
  } else {
    // Para outros recursos, tentar rede, se falhar tenta cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se for resposta válida, armazena no cache
          if (!response || response.status !== 200) {
            return response;
          }
          
          let responseClone = response.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Se falhar, busca do cache
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || new Response('Recurso não disponível offline', {
              status: 404,
              statusText: 'Não encontrado'
            });
          });
        })
    );
  }
});

// Estratégia Network First para APIs
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      // Se for resposta válida, clone e armazena no cache
      if (!response || response.status !== 200) {
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
      return caches.match(request).then(cachedResponse => {
        return cachedResponse || new Response('API não disponível offline', {
          status: 503,
          statusText: 'Serviço indisponível'
        });
      });
    });
}

// Mensagens - permite atualizações forçadas da aplicação
self.addEventListener('message', event => {
  if (event.data) {
    console.log('[ServiceWorker] Mensagem recebida:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    
    if (event.data.type === 'CHECK_UPDATE') {
      console.log('[ServiceWorker] Verificando por atualizações');
      // Força recarregamento do service worker
      self.registration.update();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
      console.log('[ServiceWorker] Limpando cache por solicitação');
      caches.delete(CACHE).then(() => {
        console.log('[ServiceWorker] Cache limpo com sucesso');
      });
    }
    
    if (event.data.type === 'SYNC_DATA') {
      console.log('[ServiceWorker] Solicitação de sincronização de dados recebida');
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          // Notifica todos os clientes para sincronizar dados
          client.postMessage({
            type: 'PERFORM_SYNC',
            timestamp: new Date().getTime()
          });
        });
      });
    }
  }
}); 

// Evento de sincronização em segundo plano (quando suportado)
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Evento de sincronização em segundo plano:', event.tag);
  
  if (event.tag === 'sync-data') {
    console.log('[ServiceWorker] Executando sincronização em segundo plano');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        return clients.map(client => {
          // Notifica clientes para realizar sincronização
          return client.postMessage({
            type: 'PERFORM_SYNC',
            timestamp: new Date().getTime()
          });
        });
      })
    );
  }
}); 