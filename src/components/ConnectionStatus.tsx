import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const channel = supabase.channel('system');
    
    channel
      .subscribe((status) => {
        setIsOnline(status === 'SUBSCRIBED');
      });

    const checkConnection = async () => {
      try {
        const { data } = await supabase.from('sync_data').select('lastSync').single();
        if (data?.lastSync) {
          setLastSync(new Date(data.lastSync));
        }
      } catch (error) {
        console.error('Erro ao verificar conexão:', error);
        setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Verifica a cada 30 segundos

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed top-0 right-0 m-4 flex items-center space-x-2 z-50">
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm text-gray-600">
        {isOnline ? 'Online' : 'Offline'}
        {lastSync && (
          <span className="ml-2 text-xs">
            Última sincronização: {lastSync.toLocaleTimeString()}
          </span>
        )}
      </span>
    </div>
  );
} 