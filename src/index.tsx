// Função para registrar o service worker com tratamento de atualização
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration.scope);
          
          // Verificar se há atualizações disponíveis
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            
            console.log('Nova versão do Service Worker encontrada');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nova versão disponível! Pronto para atualizar.');
                
                // Mostrar notificação de atualização disponível
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Atualização disponível', {
                    body: 'Uma nova versão do aplicativo está disponível. Recarregue para atualizar.'
                  });
                }
                
                // Opcionalmente, poderia mostrar um toast ou banner na interface
                // alertando sobre a atualização disponível
              }
            });
          });
        })
        .catch(error => {
          console.error('Erro ao registrar o Service Worker:', error);
        });
    });
  }
}

// Chamar a função no início
registerServiceWorker(); 