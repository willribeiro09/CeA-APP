import { supabase } from './supabase';
import { StorageItems } from '../types';
import { storage } from './storage';
import { RealtimeChannel } from '@supabase/supabase-js';

// ID único do dispositivo
const DEVICE_ID = (() => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
})();

// Sistema de sincronização BÁSICO e SIMPLES
export const basicSyncService = {
  channel: null as RealtimeChannel | null,
  isInitialized: false,

  async init() {
    if (!supabase || this.isInitialized) return;
    
    console.log('🔄 Inicializando Sync Básico:', DEVICE_ID);
    this.isInitialized = true;

    // Configurar realtime simples
    this.setupRealtime();
    
    // Carregar dados iniciais
    await this.loadInitialData();
  },

  setupRealtime() {
    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.channel = supabase!
      .channel('basic_sync_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'sync_data' 
        }, 
        (payload: any) => {
          console.log('📡 Atualização recebida:', payload);
          if (payload.new && payload.new.device_last_seen !== DEVICE_ID) {
            // Só atualizar se não foi este dispositivo que fez a mudança
            this.handleRealtimeUpdate(payload.new);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('🔗 Realtime:', status);
      });
  },

  async handleRealtimeUpdate(newData: any) {
    try {
      console.log('📥 Processando atualização de outro dispositivo');
      
      const serverData: StorageItems = {
        expenses: newData.expenses || {},
        projects: newData.projects || [],
        stock: newData.stock || [],
        employees: newData.employees || {},
        deletedIds: newData.deleted_ids || [],
        willBaseRate: newData.willbaserate || 200,
        willBonus: newData.willbonus || 0,
        lastSync: newData.last_sync_timestamp || Date.now()
      };
      
      // Salvar e atualizar UI
      storage.save(serverData);
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: serverData 
      }));
      
      console.log('✅ Dados atualizados de outro dispositivo');
    } catch (error) {
      console.error('❌ Erro ao processar realtime:', error);
    }
  },

  async loadInitialData(): Promise<StorageItems | null> {
    if (!supabase) return null;
    
    try {
      console.log('📥 Carregando dados do servidor...');
      
      const { data, error } = await supabase.rpc('get_sync_data');
      
      if (error) {
        console.error('Erro ao carregar dados:', error);
        return null;
      }
      
      if (data) {
        const serverData: StorageItems = {
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          deletedIds: data.deleted_ids || [],
          willBaseRate: data.willbaserate || 200,
          willBonus: data.willbonus || 0,
          lastSync: data.last_sync_timestamp || Date.now()
        };
        
        console.log('✅ Dados carregados do servidor');
        storage.save(serverData);
        return serverData;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }
  },

  async sync(data: StorageItems): Promise<boolean> {
    if (!supabase) {
      console.log('Supabase não configurado, salvando apenas localmente');
      storage.save(data);
      return true;
    }

    try {
      console.log('🔄 Enviando dados para servidor...');
      
      const { data: result, error } = await supabase.rpc('sync_data_simple', {
        p_expenses: data.expenses || {},
        p_projects: data.projects || [],
        p_stock: data.stock || [],
        p_employees: data.employees || {},
        p_deleted_ids: data.deletedIds || [],
        p_willbaserate: data.willBaseRate || 200,
        p_willbonus: data.willBonus || 0,
        p_device_id: DEVICE_ID
      });
      
      if (error) {
        console.error('Erro na sincronização:', error);
        storage.save(data);
        return false;
      }
      
      if (result && result.success) {
        console.log('✅ Dados enviados ao servidor');
        data.lastSync = result.last_sync_timestamp || Date.now();
        storage.save(data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      storage.save(data);
      return false;
    }
  },

  setupRealtimeUpdates(callback: (data: StorageItems) => void) {
    if (!supabase) return () => {};

    const handleDataUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('🔄 Dados atualizados:', event.detail);
      callback(event.detail);
    };

    window.addEventListener('dataUpdated', handleDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate as EventListener);
      if (this.channel) {
        this.channel.unsubscribe();
        this.isInitialized = false;
      }
    };
  }
};

// Funções de conveniência
export const loadData = async (): Promise<StorageItems> => {
  // SEMPRE carregar do servidor primeiro se disponível
  if (supabase) {
    const serverData = await basicSyncService.loadInitialData();
    if (serverData) {
      return serverData;
    }
  }
  
  // Fallback para dados locais
  const localData = storage.load();
  if (localData) {
    return localData;
  }
  
  // Dados vazios
  return {
    expenses: {},
    projects: [],
    stock: [],
    employees: {},
    deletedIds: [],
    willBaseRate: 200,
    willBonus: 0,
    lastSync: Date.now()
  };
};

export const saveData = (data: StorageItems): Promise<boolean> => {
  return basicSyncService.sync(data);
};

// Debug simples
if (typeof window !== 'undefined') {
  (window as any).basicSyncDebug = {
    deviceId: DEVICE_ID,
    getStatus: () => ({
      initialized: basicSyncService.isInitialized,
      hasChannel: !!basicSyncService.channel,
      channelState: basicSyncService.channel?.state
    }),
    loadFromServer: () => basicSyncService.loadInitialData(),
    forceSync: async () => {
      const data = storage.load();
      if (data) {
        return await basicSyncService.sync(data);
      }
      return false;
    },
    getLocalData: () => storage.load(),
    clearLocal: () => {
      storage.clear();
      console.log('🗑️ Dados locais limpos');
    }
  };
  
  console.log('🔄 Basic Sync Debug: window.basicSyncDebug');
  console.log('📱 Device ID:', DEVICE_ID);
}
