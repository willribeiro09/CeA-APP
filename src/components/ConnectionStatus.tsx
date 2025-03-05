import React, { useState, useEffect } from 'react';
import { checkSupabaseConnection, CONNECTION_STATUS_EVENT, ConnectionStatus as ConnectionStatusType } from '../lib/sync';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showStatus, setShowStatus] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    // Verifica a conexão inicial
    checkSupabaseConnection().then(connected => {
      setIsConnected(connected);
      setStatusMessage(connected ? 'Conectado ao servidor' : 'Desconectado do servidor');
    });

    // Configura os listeners para eventos online/offline
    const handleOnline = () => {
      setIsOnline(true);
      setStatusMessage('Verificando conexão...');
      checkSupabaseConnection().then(connected => {
        setIsConnected(connected);
        setStatusMessage(connected ? 'Conectado ao servidor' : 'Desconectado do servidor');
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsConnected(false);
      setStatusMessage('Sem conexão com a internet');
      setShowStatus(true); // Sempre mostra quando está offline
    };

    // Configura o listener para eventos de status de conexão do Supabase
    const handleConnectionStatus = (event: Event) => {
      const customEvent = event as CustomEvent<ConnectionStatusType>;
      const status = customEvent.detail;
      
      setIsConnected(status === 'connected');
      setShowStatus(true);
      
      switch (status) {
        case 'connected':
          setStatusMessage('Conectado ao servidor');
          break;
        case 'connecting':
          setStatusMessage('Conectando ao servidor...');
          break;
        case 'disconnected':
          setStatusMessage('Desconectado do servidor');
          break;
      }
      
      // Esconde o status após 5 segundos apenas se estiver conectado
      if (status === 'connected') {
        setTimeout(() => setShowStatus(false), 5000);
      }
    };

    // Adiciona os listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(CONNECTION_STATUS_EVENT, handleConnectionStatus);

    // Configura um intervalo para verificar a conexão periodicamente
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkSupabaseConnection().then(connected => {
          setIsConnected(connected);
          // Atualiza a mensagem apenas se o status mudar
          if (connected !== isConnected) {
            setStatusMessage(connected ? 'Conectado ao servidor' : 'Desconectado do servidor');
            setShowStatus(true);
            if (connected) {
              setTimeout(() => setShowStatus(false), 5000);
            }
          }
        });
      }
    }, 30000); // Verifica a cada 30 segundos

    // Remove os listeners ao desmontar o componente
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(CONNECTION_STATUS_EVENT, handleConnectionStatus);
      clearInterval(interval);
    };
  }, [isConnected]);

  return (
    <div 
      className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg transition-opacity duration-500 flex items-center gap-2 ${
        showStatus ? 'opacity-90' : 'opacity-0'
      } ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}
    >
      {isConnected ? (
        <Wifi className="text-white" size={20} />
      ) : (
        <WifiOff className="text-white" size={20} />
      )}
      <span className="text-white text-sm font-medium">{statusMessage}</span>
    </div>
  );
}; 