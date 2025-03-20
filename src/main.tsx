import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

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
