// This is the service worker with the Advanced caching

// Importar Firebase Messaging para notificações push
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-kvKLT9VaowZetAjePs_D4OyOWmHEkvY",
  authDomain: "cea-gutters-app-b8a3d.firebaseapp.com",
  projectId: "cea-gutters-app-b8a3d",
  storageBucket: "cea-gutters-app-b8a3d.firebasestorage.app",
  messagingSenderId: "1023177835021",
  appId: "1:1023177835021:web:e68a57b9606b917ffc4b44"
};

// Inicializar Firebase no Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const CACHE = "cea-app-v1.8.1-safe";
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
  // Ignorar requests de navigation preload para evitar warnings
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Aguardar preloadResponse se disponível
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }
        } catch (error) {
          console.log('[ServiceWorker] Preload response error (ignorado):', error);
        }
        
        // Fallback para fetch normal
        return fetch(event.request);
      })()
    );
    return;
  }

  // Garantir que solicitações para dados locais sempre são atualizadas
  if (event.request.url.includes('localStorage') || 
      event.request.url.includes('indexedDB') ||
      event.request.method === 'POST') {
    // Não interferir com operações de dados locais
    console.log('[ServiceWorker] Passando operação de dados local', event.request.url);
    return;
  }
  
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
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
  }
});

// ========== NOTIFICAÇÕES PUSH (FIREBASE) ==========

// Handler para notificações em background (quando o app não está aberto)
messaging.onBackgroundMessage((payload) => {
  console.log('[ServiceWorker] Notificação recebida em background:', payload);
  
  const notificationTitle = payload.notification?.title || 'CeA APP';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação',
    icon: payload.notification?.icon || '/cealogo.png',
    badge: '/cealogo.png',
    tag: payload.data?.tag || 'cea-notification',
    data: payload.data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notificação clicada:', event.notification.tag);
  
  event.notification.close();

  // Abre ou foca na janela do app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já existe uma janela aberta, foca nela
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se não existe janela aberta, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
}); 