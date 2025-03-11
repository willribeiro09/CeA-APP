import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'online' | 'offline'>('offline');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    // Verificar status inicial
    checkStatus();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      if (!supabase) {
        setStatus('offline');
        return;
      }
      
      // Tentar buscar o lastSync para verificar a conexão
      const { data, error } = await supabase
        .from('sync_data')
        .select('updated_at')
        .limit(1);
      
      if (error) {
        console.error('Erro ao verificar status de conexão:', error);
        setStatus('offline');
        return;
      }
      
      setStatus('online');
      
      // Atualizar o timestamp da última sincronização se disponível
      if (data && data.length > 0 && data[0].updated_at) {
        const lastUpdateTime = new Date(data[0].updated_at);
        setLastSync(
          lastUpdateTime.toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        );
      }
    } catch (error) {
      console.error('Erro ao verificar status de conexão:', error);
      setStatus('offline');
    }
  };

  return (
    <div className="fixed top-0 right-0 m-2 p-2 bg-white rounded-md shadow-sm text-xs flex flex-col items-end">
      <div className="flex items-center">
        <div 
          className={`w-2 h-2 rounded-full mr-2 ${
            status === 'online' ? 'bg-green-500' : 'bg-red-500'
          }`} 
        />
        <div>
          {status === 'online' ? 'Online' : 'Offline'}
        </div>
      </div>
      {lastSync && status === 'online' && (
        <div className="text-gray-500 text-[10px] mt-1">
          Última sincronização: {lastSync}
        </div>
      )}
    </div>
  );
} 