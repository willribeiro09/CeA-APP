import React, { useState, useEffect } from 'react';
import { basicSyncService } from '../lib/basicSync';
import { Loader2 } from 'lucide-react';

interface SyncOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function SyncOverlay({ isVisible, message = 'Sincronizando dados...' }: SyncOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-sm w-[90%] text-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sincronizando
            </h3>
            <p className="text-sm text-gray-600">
              {message}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Aguarde enquanto atualizamos os dados...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useSyncStatus() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Verificar status inicial
    setIsBlocked(basicSyncService.isAppBlockedForInteractions());

    const handleSyncStart = (event: CustomEvent) => {
      console.log('🔒 Sync iniciado - bloqueando UI...');
      setIsBlocked(true);
      setMessage(event.detail?.message || 'Sincronizando dados...');
    };

    const handleSyncEnd = (event: CustomEvent) => {
      console.log('🔓 Sync concluído - desbloqueando UI...');
      setIsBlocked(false);
      setMessage('');
    };

    // Listener para quando sync de retorno inicia
    window.addEventListener('syncReturnStarted', handleSyncStart as EventListener);
    
    // Listener para quando sync de retorno termina
    window.addEventListener('syncReturnCompleted', handleSyncEnd as EventListener);

    return () => {
      window.removeEventListener('syncReturnStarted', handleSyncStart as EventListener);
      window.removeEventListener('syncReturnCompleted', handleSyncEnd as EventListener);
    };
  }, []);

  // Função para executar ação quando app for desbloqueado
  const executeWhenUnblocked = (action: () => void) => {
    if (isBlocked) {
      console.log('🔒 Ação bloqueada - adicionando à fila...');
      basicSyncService.queueInteraction(action);
    } else {
      action();
    }
  };

  return {
    isBlocked,
    message,
    executeWhenUnblocked
  };
}
