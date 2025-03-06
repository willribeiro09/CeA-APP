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
    if (!supabase || this.isInitialized) return;
    
    console.log('Inicializando serviço de sincronização com ID:', SESSION_ID);
    this.isInitialized = true;

    // Limpar inscrição anterior se existir
    if (this.channel) {
      this.channel.unsubscribe();
    }

    // Criar nova inscrição
    this.channel = supabase
      .channel('sync_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'sync_data' 
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Mudança recebida:', payload);
          if (payload.new) {
            const data = payload.new as any;
            const storageData: StorageItems = {
              expenses: data.expenses || {},
              projects: data.projects || [],
              stock: data.stock || [],
              employees: data.employees || {},
              lastSync: new Date().getTime()
            };
            storage.save(storageData);
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: storageData 
            }));
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Status da inscrição do canal:', status);
      });
  },

  setupRealtimeUpdates(callback: (data: StorageItems) => void) {
    if (!supabase) return () => {};

    const handleDataUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('Evento de atualização recebido:', event.detail);
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
  },

  async sync(data: StorageItems): Promise<boolean> {
    if (!supabase) {
      console.log('Supabase não configurado, salvando apenas localmente');
      storage.save(data);
      return true;
    }

    try {
      console.log('Sincronizando dados com Supabase usando UUID:', FIXED_UUID);
      
      // Salvar no Supabase
      const { error } = await supabase
        .from('sync_data')
        .upsert({ 
          id: FIXED_UUID,
          expenses: data.expenses,
          projects: data.projects,
          stock: data.stock,
          employees: data.employees,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao sincronizar com Supabase:', error);
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