import { supabase } from './supabase';
import { StorageItems } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Identificador único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// Chave para armazenar o UUID no localStorage
const UUID_STORAGE_KEY = 'expenses-app-uuid';

// Função para obter um UUID válido
const getUUID = (): string => {
  // Verificar se já temos um UUID armazenado
  const storedUUID = localStorage.getItem(UUID_STORAGE_KEY);
  if (storedUUID) {
    return storedUUID;
  }
  
  // Gerar um novo UUID
  const uuid = crypto.randomUUID();
  localStorage.setItem(UUID_STORAGE_KEY, uuid);
  return uuid;
};

// ID fixo para o registro único
const FIXED_UUID = getUUID();
console.log('UUID do registro:', FIXED_UUID);

export const syncService = {
  channel: null as RealtimeChannel | null,
  isInitialized: false,

  init() {
    if (this.isInitialized) return;
    if (!supabase) {
      console.log('Supabase não disponível, não é possível inicializar');
      return;
    }

    if (!this.channel) {
      this.channel = supabase
        .channel('changes')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_data',
          filter: `id=eq.${FIXED_UUID}`,
        }, async (payload) => {
          try {
            console.log('Alteração detectada no Supabase:', payload);
            
            // Receber os novos dados
            const { data, error } = await supabase
              .from('sync_data')
              .select('*')
              .eq('id', FIXED_UUID)
              .single();
            
            if (error) {
              console.error('Erro ao carregar dados após alteração:', error);
              return;
            }
            
            if (!data) {
              console.log('Nenhum dado recebido após alteração');
              return;
            }
            
            // Processar os dados recebidos
            const processedData: StorageItems = {
              expenses: data.expenses || {},
              projects: data.projects || [],
              stock: data.stock || [],
              employees: data.employees || {},
              willBaseRate: data.willBaseRate || 200,
              willBonus: data.willBonus || 0,
              lastSync: new Date().getTime()
            };
            
            // Disparar evento com os dados recebidos
            window.dispatchEvent(new CustomEvent('dataUpdated', { detail: processedData }));
          } catch (e) {
            console.error('Erro ao processar alteração:', e);
          }
        })
        .subscribe((status) => {
          console.log('Status da inscrição:', status);
        });
    }

    this.isInitialized = true;
  },

  setupRealtimeUpdates(callback: (data: StorageItems) => void) {
    if (!supabase) return () => {};

    const handleDataUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('Evento de atualização recebido:', event.detail);
      
      // Garantir que os dados do Will sejam processados corretamente
      const processedData = {
        ...event.detail,
        willBaseRate: event.detail.willBaseRate !== undefined ? event.detail.willBaseRate : 200,
        willBonus: event.detail.willBonus !== undefined ? event.detail.willBonus : 0
      };
      
      callback(processedData);
    };

    window.addEventListener('dataUpdated', handleDataUpdate as EventListener);
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate as EventListener);
      if (this.channel) {
        this.channel.unsubscribe();
        this.isInitialized = false;
      }
    };
  },

  async loadLatestData(): Promise<StorageItems | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', FIXED_UUID)
        .single();

      if (error) {
        console.error('Erro ao carregar dados mais recentes:', error);
        return null;
      }

      if (data) {
        console.log('Dados recebidos do Supabase:', data);
        return {
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          willBaseRate: data.willBaseRate || 200,
          willBonus: data.willBonus || 0,
          lastSync: new Date().getTime()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar dados mais recentes:', error);
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
      console.log('Sincronizando dados com Supabase usando UUID:', FIXED_UUID);
      
      // Garantir que os dados do Will sejam enviados
      console.log('Dados a serem salvos (incluindo Will):', {
        willBaseRate: data.willBaseRate,
        willBonus: data.willBonus
      });
      
      // Salvar no Supabase
      const { error } = await supabase
        .from('sync_data')
        .upsert({
          id: FIXED_UUID,
          expenses: data.expenses,
          projects: data.projects,
          stock: data.stock,
          employees: data.employees,
          willBaseRate: data.willBaseRate,
          willBonus: data.willBonus,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro na sincronização:', error);
        return false;
      }

      // Salvar localmente
      storage.save(data);
      return true;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  },
};

export const loadInitialData = async (): Promise<StorageItems | null> => {
  if (!supabase) {
    console.log('Supabase não configurado, carregando dados locais');
    return storage.load();
  }

  try {
    // Carregar dados do Supabase
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .eq('id', FIXED_UUID)
      .single();

    if (error) {
      console.warn('Erro ao carregar dados iniciais do Supabase:', error);
      
      // Se o erro for "não encontrado", criar registro inicial
      if (error.code === 'PGRST116') {
        console.log('Registro não encontrado no Supabase, criando inicial');
        const localData = storage.load() || {
          expenses: {},
          projects: [],
          stock: [],
          employees: {},
          willBaseRate: 200,
          willBonus: 0,
          lastSync: new Date().getTime()
        };
        
        await syncService.sync(localData);
        return localData;
      }
      
      return storage.load();
    }

    if (data) {
      console.log('Dados carregados do Supabase:', data);
      const storageData: StorageItems = {
        expenses: data.expenses || {},
        projects: data.projects || [],
        stock: data.stock || [],
        employees: data.employees || {},
        willBaseRate: data.willBaseRate || 200,
        willBonus: data.willBonus || 0,
        lastSync: new Date().getTime()
      };
      
      // Salvar no armazenamento local
      storage.save(storageData);
      return storageData;
    }

    return storage.load();
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    return storage.load();
  }
};

export const saveData = (data: StorageItems) => {
  // Salvar localmente primeiro para resposta imediata
  storage.save(data);
  
  // Sincronizar com Supabase
  if (supabase) {
    syncService.sync(data).catch(error => {
      console.error('Erro ao sincronizar dados:', error);
    });
  }
}; 