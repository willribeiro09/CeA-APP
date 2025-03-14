import { useState, useCallback, useEffect } from 'react';
import { getData, saveData } from '../utils/storageUtils';

/**
 * Hook para gerenciar a sincronização de dados
 */
export function useSync() {
  // Estado para armazenar o status de conexão
  const [connected, setConnected] = useState<boolean>(false);
  
  // Estado para armazenar o timestamp da última sincronização
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  // Estado para controlar o status de sincronização
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Carrega o timestamp da última sincronização do armazenamento local
  useEffect(() => {
    const data = getData();
    if (data && data.lastSync) {
      // Garante que lastSync seja um número
      const lastSync = typeof data.lastSync === 'string' 
        ? parseInt(data.lastSync, 10) 
        : data.lastSync;
      
      setLastSyncTime(lastSync);
    }
  }, []);
  
  // Inicializa a sincronização
  const initializeSync = useCallback(async (): Promise<boolean> => {
    try {
      // Verifica se o Supabase está configurado
      const isSupabaseConfigured = false; // Implementar verificação real
      
      if (!isSupabaseConfigured) {
        console.log('Supabase não está configurado');
        setConnected(false);
        return false;
      }
      
      // Inicializa a tabela de sincronização
      console.log('Inicializando sincronização');
      
      // Carrega os dados iniciais
      const data = getData();
      
      // Define o status de conexão
      setConnected(true);
      
      // Define o timestamp da última sincronização
      const currentTime = Date.now();
      setLastSyncTime(currentTime);
      
      // Salva o timestamp no armazenamento local
      saveData({
        ...data,
        lastSync: currentTime
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao inicializar sincronização:', error);
      setConnected(false);
      return false;
    }
  }, []);
  
  // Força uma sincronização manual
  const syncNow = useCallback(async (): Promise<boolean> => {
    try {
      if (!connected) {
        console.error('Não conectado ao serviço de sincronização');
        return false;
      }
      
      // Define o status de sincronização
      setSyncing(true);
      
      // Simula uma sincronização
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualiza o timestamp da última sincronização
      const currentTime = Date.now();
      setLastSyncTime(currentTime);
      
      // Salva o timestamp no armazenamento local
      const data = getData();
      saveData({
        ...data,
        lastSync: currentTime
      });
      
      // Define o status de sincronização
      setSyncing(false);
      
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      setSyncing(false);
      return false;
    }
  }, [connected]);
  
  // Configura atualizações em tempo real quando conectado
  useEffect(() => {
    if (connected) {
      console.log('Configurando atualizações em tempo real');
      
      // Simula uma atualização a cada 5 minutos
      const interval = setInterval(() => {
        syncNow();
      }, 5 * 60 * 1000);
      
      // Limpa o intervalo quando o componente é desmontado
      return () => clearInterval(interval);
    }
  }, [connected, syncNow]);
  
  return {
    connected,
    lastSyncTime,
    syncing,
    initializeSync,
    syncNow
  };
} 