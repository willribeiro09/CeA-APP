import { supabase } from './supabase';
import { Expense, Project, StockItem, Employee, StorageItems } from '../types';
import { storage } from './storage';

// Função para carregar dados do Supabase
export const loadInitialData = async (): Promise<StorageItems | null> => {
  try {
    console.log("Tentando carregar dados do Supabase...");
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }

    if (!data) {
      console.log("Nenhum dado encontrado, criando registro inicial");
      // Se não houver dados, criar registro inicial
      const initialData: StorageItems = {
        expenses: {},
        projects: [],
        stock: [],
        employees: {},
        lastSync: Date.now()
      };

      const { error: insertError } = await supabase
        .from('sync_data')
        .insert(initialData);

      if (insertError) {
        console.error('Erro ao criar dados iniciais:', insertError);
        return null;
      }

      return initialData;
    }

    console.log("Dados carregados com sucesso:", data);
    return data;
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    return null;
  }
};

// Função para salvar dados no Supabase
export const saveData = async (data: StorageItems): Promise<boolean> => {
  try {
    console.log("Tentando salvar dados no Supabase:", data);
    const { error } = await supabase
      .from('sync_data')
      .upsert({
        expenses: data.expenses,
        projects: data.projects,
        stock: data.stock,
        employees: data.employees,
        lastSync: data.lastSync,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao salvar dados:', error);
      return false;
    }

    console.log("Dados salvos com sucesso");
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return false;
  }
};

// Serviço de sincronização
export const syncService = {
  // Inicializar sincronização
  init: async () => {
    try {
      const localData = storage.load();
      const remoteData = await loadInitialData();

      if (!localData && remoteData) {
        // Se não há dados locais mas há dados remotos, usar dados remotos
        storage.save(remoteData);
        return remoteData;
      } else if (localData && (!remoteData || localData.lastSync > remoteData.lastSync)) {
        // Se há dados locais mais recentes, enviar para o servidor
        const success = await saveData(localData);
        if (success) {
          return localData;
        }
      }

      return remoteData;
    } catch (error) {
      console.error('Erro na inicialização da sincronização:', error);
      return null;
    }
  },

  // Sincronizar dados
  sync: async (data: StorageItems) => {
    try {
      // Salvar localmente primeiro
      storage.save(data);

      // Depois tentar salvar no servidor
      const success = await saveData(data);

      return success;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  },

  // Configurar sincronização em tempo real
  setupRealtimeSync: () => {
    const channel = supabase
      .channel('sync_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_data'
        },
        async (payload) => {
          // Quando houver mudanças, atualizar dados locais
          const remoteData = await loadInitialData();
          if (remoteData) {
            storage.save(remoteData);
            // Disparar evento para atualizar a UI
            window.dispatchEvent(new CustomEvent('sync-update', { detail: remoteData }));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }
}; 