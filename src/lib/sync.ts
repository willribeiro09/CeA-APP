import { supabase, isSupabaseConfigured } from './supabase';
import { StorageItems } from '../types';
import { getData, saveData as saveToStorage } from './storage';

// Função para carregar dados iniciais do Supabase
export const loadInitialData = async (): Promise<StorageItems | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase não configurado, usando apenas armazenamento local');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Erro ao carregar dados do Supabase:', error);
      return null;
    }

    if (!data) {
      console.log('Nenhum dado encontrado no Supabase');
      return null;
    }

    console.log('Dados carregados do Supabase:', data);
    return data as StorageItems;
  } catch (error) {
    console.error('Erro ao carregar dados do Supabase:', error);
    return null;
  }
};

// Função para salvar dados no Supabase
export const saveData = async (data: StorageItems): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase não configurado, usando apenas armazenamento local');
    return false;
  }

  try {
    const { error } = await supabase
      .from('sync_data')
      .upsert({
        expenses: data.expenses,
        projects: data.projects,
        stock: data.stock,
        employees: data.employees,
        lastSync: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao salvar dados no Supabase:', error);
      return false;
    }

    console.log('Dados salvos no Supabase com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados no Supabase:', error);
    return false;
  }
};

// Serviço de sincronização
export const syncService = {
  // Inicializa a sincronização
  init: async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      // Carrega dados iniciais
      const remoteData = await loadInitialData();
      if (remoteData) {
        // Se tiver dados remotos, atualiza o armazenamento local
        saveToStorage(remoteData);
      } else {
        // Se não tiver dados remotos, envia os dados locais para o Supabase
        const localData = getData();
        await saveData(localData);
      }
    } catch (error) {
      console.error('Erro ao inicializar sincronização:', error);
    }
  },

  // Configura atualizações em tempo real
  setupRealtimeUpdates: (callback: (data: StorageItems) => void) => {
    if (!isSupabaseConfigured()) {
      return () => {}; // Retorna uma função vazia se o Supabase não estiver configurado
    }

    const subscription = supabase
      .channel('sync_data_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sync_data' 
      }, (payload) => {
        console.log('Mudança detectada no Supabase:', payload);
        if (payload.new) {
          callback(payload.new as StorageItems);
        }
      })
      .subscribe();

    // Retorna uma função para cancelar a inscrição
    return () => {
      subscription.unsubscribe();
    };
  },

  // Sincroniza dados
  sync: async (data: StorageItems): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      // Salvar apenas localmente
      saveToStorage(data);
      return true;
    }

    try {
      // Salvar no Supabase e localmente
      const success = await saveData(data);
      if (success) {
        saveToStorage(data);
      }
      return success;
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      // Salvar localmente mesmo se falhar no Supabase
      saveToStorage(data);
      return false;
    }
  }
}; 