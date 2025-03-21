import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { syncService } from '../lib/sync';

interface OfflineBannerProps {
  isOffline: boolean;
  pendingChangesCount: number;
  onSync: () => Promise<void>;
}

export function OfflineBanner({ isOffline, pendingChangesCount, onSync }: OfflineBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  useEffect(() => {
    if (isOffline || pendingChangesCount > 0) {
      setIsVisible(true);
    } else {
      // Esperar um pouco antes de esconder para mostrar "Todas alterações sincronizadas"
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isOffline, pendingChangesCount]);
  
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center px-4 py-3 space-x-3 text-white rounded-lg shadow-lg transition-all duration-300 ${isOffline ? 'bg-red-500' : pendingChangesCount > 0 ? 'bg-yellow-500' : 'bg-green-500'}`}>
      {isOffline ? (
        <>
          <WifiOff size={20} />
          <div>
            <p className="font-medium">Você está offline</p>
            <p className="text-sm">Suas alterações serão sincronizadas quando a conexão for restaurada</p>
          </div>
        </>
      ) : pendingChangesCount > 0 ? (
        <>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <div>
              <p className="font-medium">{pendingChangesCount} {pendingChangesCount === 1 ? 'alteração pendente' : 'alterações pendentes'}</p>
              <p className="text-sm">Clique para sincronizar agora</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-3">
            <div>
              <p className="font-medium">Todas alterações sincronizadas</p>
            </div>
          </div>
        </>
      )}
      
      <button 
        onClick={() => setIsVisible(false)} 
        className="ml-auto p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
} 