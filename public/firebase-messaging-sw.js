// Service Worker dedicado para Firebase Cloud Messaging
// Este arquivo é carregado automaticamente pelo Firebase para gerenciar notificações push

// Importar Firebase scripts (versão compatível)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração do Firebase (mesma do app)
const firebaseConfig = {
  apiKey: "AIzaSyD-kvKLT9VaowZetAjePs_D4OyOWmHEkvY",
  authDomain: "cea-gutters-app-b8a3d.firebaseapp.com",
  projectId: "cea-gutters-app-b8a3d",
  storageBucket: "cea-gutters-app-b8a3d.firebasestorage.app",
  messagingSenderId: "1023177835021",
  appId: "1:1023177835021:web:e68a57b9606b917ffc4b44"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obter instância do Firebase Messaging
const messaging = firebase.messaging();

// Handler para notificações recebidas em background (app fechado/minimizado)
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase SW] Notificação recebida em background:', payload);
  
  // Extrair dados da notificação
  const notificationTitle = payload.notification?.title || 'CeA APP';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação',
    icon: payload.notification?.icon || '/cealogo.png',
    badge: '/cealogo.png',
    tag: payload.data?.tag || 'cea-notification',
    data: payload.data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: []
  };

  // Adicionar ações customizadas se houver
  if (payload.data?.action) {
    notificationOptions.actions.push({
      action: 'open',
      title: 'Abrir'
    });
  }

  // Mostrar a notificação
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notificação clicada:', event.notification.tag);
  
  // Fechar a notificação
  event.notification.close();

  // Abrir ou focar na janela do app
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Tentar encontrar uma janela já aberta do app
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não encontrou janela aberta, abrir uma nova
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Log de confirmação
console.log('[Firebase SW] Service Worker do Firebase Cloud Messaging carregado com sucesso!');

