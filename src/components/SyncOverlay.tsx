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

      {/* Cometa: um rastro verde contínuo e luminoso girando pela borda da tela */}
      <style>{`
        @keyframes syncCometSpin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
        style={{
          padding: '4px',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '150vmax',
            height: '150vmax',
            transform: 'translate(-50%, -50%)',
            background:
              'conic-gradient(from 0deg, transparent 0 55%, rgba(34,197,94,0.45) 74%, rgba(34,197,94,1) 91%, #ffffff 100%)',
            animation: 'syncCometSpin 1.1s linear infinite',
          }}
        />
      </div>

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
