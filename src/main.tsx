import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Prevenir zoom em dispositivos móveis
const preventZoom = () => {
  // Prevenir zoom com gestos de pinch
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });

  // Prevenir zoom com double-tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevenir zoom com wheel + ctrl/cmd
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevenir zoom com teclado (Ctrl/Cmd + Plus/Minus/0)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
      e.preventDefault();
    }
  });
};

// Aplicar prevenção de zoom quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preventZoom);
} else {
  preventZoom();
}

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
