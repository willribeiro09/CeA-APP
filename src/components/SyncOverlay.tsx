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
    <div className="fixed inset-0 z-50" aria-busy="true" aria-live="polite">
      {/* Camada invisível que bloqueia interações durante a sincronização,
          evitando conflitos de dados. NÃO escurece nem cobre a tela. */}
      <div className="absolute inset-0" />

      {/* Uma única faísca correndo rápido pela borda da tela (sem contorno fixo) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="1.5" y="1.5" width="97" height="97" rx="1.5"
          fill="none" stroke="#22C55E" strokeWidth={3.5}
          strokeLinecap="round" vectorEffect="non-scaling-stroke"
          pathLength={100} strokeDasharray="3 97"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="100" to="0" dur="0.9s" repeatCount="indefinite"
          />
        </rect>
      </svg>

      {/* Indicador discreto, com fundo próprio para ser legível sobre qualquer tela */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 rounded-full px-3 py-1 shadow-sm pointer-events-none">
        <Loader2 className="w-3.5 h-3.5 text-green-500 animate-spin" />
        <span className="text-xs font-medium text-gray-700">
          {message || 'Sincronizando...'}
        </span>
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
