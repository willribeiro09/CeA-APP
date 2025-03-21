import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { watchVisibilityChanges } from './lib/sync';
import { syncService } from './lib/sync';

// Inicializar o serviço de sincronização em tempo real
syncService.init();

// Inicializa o monitoramento de visibilidade para sincronização de dados
const unwatchVisibility = watchVisibilityChanges();

// Limpar recursos ao fechar a aplicação
window.addEventListener('beforeunload', () => {
  // Limpar monitoramento de visibilidade
  unwatchVisibility();
  
  // Limpar serviço de sincronização em tempo real
  syncService.cleanup();
});

// Forçar atualização do cache quando houver nova versão
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registrar o evento de atualização do service worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Nova versão disponível! Atualizando...');
      window.location.reload();
    });

    // Função para verificar atualizações a cada 5 minutos
    function checkForUpdates() {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
    }

    // Verificar imediatamente por novas versões
    checkForUpdates();

    // Verificar periodicamente por novas versões
    setInterval(checkForUpdates, 5 * 60 * 1000);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
