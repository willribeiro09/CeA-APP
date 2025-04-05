import { useEffect, useState } from 'react';
import { isSupabaseConfigured, initSyncTable } from '../lib/supabase';
import { syncService, loadInitialData } from '../lib/sync';
import { StorageItems } from '../types';
import { storage } from '../lib/storage';

// Hook para inicializar e gerenciar a sincronização
export const useSync = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Função para inicializar a sincronização
  const initializeSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      
      // Verificar se o Supabase está configurado
      if (!isSupabaseConfigured()) {
        console.warn('Supabase não está configurado. Carregando dados locais apenas.');
        const localData = storage.load();
        setIsInitialized(true);
        setIsSyncing(false);
        
        if (localData?.lastSync && typeof localData.lastSync === 'number') {
          setLastSyncTime(localData.lastSync);
        }
        
        return;
      }
      
      console.log('Inicializando sincronização com Supabase...');
      
      // Inicializar tabela de sincronização
      const tableInitialized = await initSyncTable();
      
      if (!tableInitialized) {
        setError('Não foi possível inicializar a tabela de sincronização.');
        setIsSyncing(false);
        return;
      }
      
      // Inicializar serviço de sincronização
      syncService.init();
      
      // Carregar dados iniciais
      const initialData = await loadInitialData();
      
      if (initialData?.lastSync && typeof initialData.lastSync === 'number') {
        setLastSyncTime(initialData.lastSync);
      }
      
      setIsInitialized(true);
      console.log('Sincronização inicializada com sucesso!');
      
    } catch (err) {
      console.error('Erro ao inicializar sincronização:', err);
      setError(`Erro ao inicializar sincronização: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Função para forçar sincronização
  const forceSyncNow = async () => {
    if (!isInitialized) {
      setError('Não é possível sincronizar: serviço não inicializado');
      return false;
    }
    
    try {
      setIsSyncing(true);
      
      // Forçar sincronização imediata
      await syncService.forceSyncNow();
      
      // Atualizar timestamp da última sincronização
      const currentData = storage.load();
      if (currentData?.lastSync && typeof currentData.lastSync === 'number') {
        setLastSyncTime(currentData.lastSync);
      }
      
      setError(null);
      console.log('Sincronização forçada concluída');
      return true;
    } catch (err) {
      console.error('Erro na sincronização forçada:', err);
      setError(`Erro na sincronização: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Hook para configurar atualizações em tempo real
  const setupDataSubscription = (callback: (data: StorageItems) => void) => {
    return syncService.setupRealtimeUpdates((data) => {
      // Atualizar timestamp da última sincronização
      if (data?.lastSync && typeof data.lastSync === 'number') {
        setLastSyncTime(data.lastSync);
      }
      
      // Chamar callback com os dados atualizados
      callback(data);
    });
  };

  // Inicializar a sincronização quando o componente for montado
  useEffect(() => {
    if (!isInitialized && !isSyncing) {
      initializeSync();
    }
    
    // Configurar listener para eventos de app pronto
    const handleAppReady = () => {
      console.log('App está pronto para interação (evento capturado em useSync)');
    };
    
    window.addEventListener('appReady', handleAppReady);
    
    return () => {
      window.removeEventListener('appReady', handleAppReady);
    };
  }, [isInitialized, isSyncing]);

  return {
    isInitialized,
    isSyncing,
    error,
    lastSyncTime,
    forceSyncNow,
    setupDataSubscription
  };
}; 