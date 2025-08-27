import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'online' | 'offline'>('offline');

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
      
      // Tentar buscar o last_sync_timestamp para verificar a conexão
      const { data, error } = await supabase
        .from('sync_data')
        .select('last_sync_timestamp')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      if (error) {
        console.error('Error checking connection status:', error);
        setStatus('offline');
        return;
      }
      
      setStatus('online');
    } catch (error) {
      console.error('Error checking connection status:', error);
      setStatus('offline');
    }
  };

  return (
    <div className="fixed top-0 right-0 m-2 p-2 bg-white rounded-md shadow-sm text-xs flex items-center">
      <div 
        className={`w-2 h-2 rounded-full mr-2 ${
          status === 'online' ? 'bg-green-500' : 'bg-red-500'
        }`} 
      />
      <div>
        {status === 'online' ? 'Online' : 'Offline'}
      </div>
    </div>
  );
} 