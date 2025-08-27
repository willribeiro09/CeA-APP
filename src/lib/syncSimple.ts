import { supabase } from './supabase';
import { StorageItems } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ID único da sessão
const SESSION_ID = Math.random().toString(36).substring(2, 15);

export const simpleSyncService = {
  channel: null as RealtimeChannel | null,
  isInitialized: false,

  async init() {
    if (!supabase || this.isInitialized) return;
    
    console.log('🔄 Inicializando sincronização simples:', SESSION_ID);
    this.isInitialized = true;

    // Configurar realtime
    this.setupRealtime();
    
    // Carregar dados iniciais
    await this.loadInitialData();
  },

  setupRealtime() {
    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.channel = supabase!
      .channel('sync_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'sync_data' 
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Atualização recebida via realtime:', payload);
          if (payload.new) {
            this.handleRealtimeUpdate(payload.new);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('🔗 Status realtime:', status);
      });
  },

  handleRealtimeUpdate(newData: any) {
    try {
      console.log('📥 Processando atualização realtime');
      
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
      
      // Salvar localmente
      storage.save(serverData);
      
      // Atualizar UI
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: serverData 
      }));
      
      console.log('✅ Dados atualizados via realtime');
    } catch (error) {
      console.error('❌ Erro ao processar realtime:', error);
    }
  },

  async loadInitialData(): Promise<StorageItems | null> {
    if (!supabase) return null;
    
    try {
      console.log('📥 Carregando dados iniciais...');
      
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
        
        console.log('✅ Dados carregados:', {
          expenses: Object.keys(serverData.expenses).length,
          projects: serverData.projects.length,
          stock: serverData.stock.length,
          employees: Object.keys(serverData.employees).length
        });
        
        storage.save(serverData);
        return serverData;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
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
      console.log('🔄 Sincronizando dados...');
      
      const { data: result, error } = await supabase.rpc('sync_data_simple', {
        p_expenses: data.expenses || {},
        p_projects: data.projects || [],
        p_stock: data.stock || [],
        p_employees: data.employees || {},
        p_deleted_ids: data.deletedIds || [],
        p_willbaserate: data.willBaseRate || 200,
        p_willbonus: data.willBonus || 0,
        p_device_id: SESSION_ID
      });
      
      if (error) {
        console.error('Erro na sincronização:', error);
        // Salvar localmente mesmo com erro
        storage.save(data);
        return false;
      }
      
      if (result && result.success) {
        console.log('✅ Sincronização bem-sucedida');
        // Atualizar timestamp local
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

// Função para carregar dados iniciais
export const loadData = async (): Promise<StorageItems> => {
  // Primeiro, tentar carregar do armazenamento local
  const localData = storage.load();
  
  // Se houver dados locais e o Supabase não estiver configurado, usar dados locais
  if (localData && !supabase) {
    console.log('Usando dados locais (Supabase não configurado)');
    return localData;
  }
  
  // Se o Supabase estiver configurado, tentar carregar dados mais recentes
  if (supabase) {
    try {
      const serverData = await simpleSyncService.loadInitialData();
      
      if (serverData) {
        console.log('Dados carregados do servidor');
        return serverData;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do servidor:', error);
    }
  }
  
  // Se não conseguir carregar dados do servidor, usar dados locais
  if (localData) {
    console.log('Usando dados locais como fallback');
    return localData;
  }
  
  // Se não houver dados, retornar estrutura vazia
  console.log('Nenhum dado encontrado, criando estrutura vazia');
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

// Função para salvar dados
export const saveData = (data: StorageItems): Promise<boolean> => {
  return simpleSyncService.sync(data);
};

// Debug global
if (typeof window !== 'undefined') {
  (window as any).simpleSyncDebug = {
    loadData: () => simpleSyncService.loadInitialData(),
    testSync: async (testData?: any) => {
      const data = testData || {
        expenses: {},
        projects: [{ id: 'test', name: 'Teste' }],
        stock: [],
        employees: {},
        deletedIds: [],
        willBaseRate: 200,
        willBonus: 0,
        lastSync: Date.now()
      };
      return await simpleSyncService.sync(data);
    },
    getStatus: () => ({
      initialized: simpleSyncService.isInitialized,
      hasChannel: !!simpleSyncService.channel,
      channelState: simpleSyncService.channel?.state
    })
  };
  
  console.log('🔧 Debug simples disponível via: window.simpleSyncDebug');
}
