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
    console.log('Tentando carregar dados do Supabase...');
    
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

    console.log('Dados carregados do Supabase:', JSON.stringify(data));
    
    // Verificar se os dados têm a estrutura esperada
    const result: StorageItems = {
      expenses: data.expenses || {},
      projects: data.projects || [],
      stock: data.stock || [],
      employees: data.employees || {},
      lastSync: data.lastSync || new Date().toISOString()
    };
    
    console.log('Dados formatados para uso:', JSON.stringify(result));
    
    // Verificar especificamente os funcionários
    if (result.employees) {
      console.log('Funcionários encontrados:', JSON.stringify(result.employees));
      
      // Verificar se há funcionários específicos
      const allEmployees = Object.values(result.employees).flat();
      const matheusFound = allEmployees.some(emp => emp.name === 'Matheus' || emp.employeeName === 'Matheus');
      const pauloFound = allEmployees.some(emp => emp.name === 'Paulo' || emp.employeeName === 'Paulo');
      
      console.log(`Funcionário Matheus encontrado: ${matheusFound}`);
      console.log(`Funcionário Paulo encontrado: ${pauloFound}`);
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao carregar dados do Supabase:', error);
    return null;
  }
};

// Função para salvar dados no Supabase
export const saveData = async (data: StorageItems): Promise<boolean> => {
  console.log('Tentando salvar dados no Supabase:', JSON.stringify(data));

  if (!isSupabaseConfigured()) {
    console.log('Supabase não configurado, usando apenas armazenamento local');
    return false;
  }

  try {
    console.log('Enviando dados para o Supabase...');
    
    // Verificar se há funcionários antes de salvar
    if (data.employees) {
      console.log('Funcionários sendo salvos:', JSON.stringify(data.employees));
      
      // Verificar se há funcionários específicos
      const allEmployees = Object.values(data.employees).flat();
      const matheusFound = allEmployees.some(emp => emp.name === 'Matheus' || emp.employeeName === 'Matheus');
      const pauloFound = allEmployees.some(emp => emp.name === 'Paulo' || emp.employeeName === 'Paulo');
      
      console.log(`Funcionário Matheus sendo salvo: ${matheusFound}`);
      console.log(`Funcionário Paulo sendo salvo: ${pauloFound}`);
    }
    
    // Criar um objeto com os dados a serem salvos
    const dataToSave = {
      expenses: data.expenses || {},
      projects: data.projects || [],
      stock: data.stock || [],
      employees: data.employees || {},
      // Não incluir lastSync, pois será definido pelo servidor
    };
    
    console.log('Dados formatados para salvar no Supabase:', JSON.stringify(dataToSave));
    
    const { error } = await supabase
      .from('sync_data')
      .upsert(dataToSave);

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
      console.log('Supabase não configurado, usando apenas armazenamento local');
      return;
    }

    try {
      console.log('Inicializando sincronização...');
      
      // Carrega dados iniciais
      const remoteData = await loadInitialData();
      
      if (remoteData) {
        console.log('Dados remotos encontrados, atualizando armazenamento local');
        // Se tiver dados remotos, atualiza o armazenamento local
        saveToStorage(remoteData);
      } else {
        console.log('Nenhum dado remoto encontrado, enviando dados locais para o Supabase');
        // Se não tiver dados remotos, envia os dados locais para o Supabase
        const localData = getData();
        console.log('Dados locais:', JSON.stringify(localData));
        await saveData(localData);
      }
    } catch (error) {
      console.error('Erro ao inicializar sincronização:', error);
    }
  },

  // Configura atualizações em tempo real
  setupRealtimeUpdates: (callback: (data: StorageItems) => void) => {
    if (!isSupabaseConfigured()) {
      console.log('Supabase não configurado, não é possível configurar atualizações em tempo real');
      return () => {}; // Retorna uma função vazia se o Supabase não estiver configurado
    }

    console.log('Configurando atualizações em tempo real...');
    
    const subscription = supabase
      .channel('sync_data_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_data'
      }, (payload) => {
        console.log('Mudança detectada no Supabase:', payload);
        if (payload.new) {
          const newData = payload.new as any;
          console.log('Novos dados recebidos:', JSON.stringify(newData));
          
          // Converter os dados para o formato esperado
          const formattedData: StorageItems = {
            expenses: newData.expenses || {},
            projects: newData.projects || [],
            stock: newData.stock || [],
            employees: newData.employees || {},
            lastSync: newData.updated_at || new Date().toISOString()
          };
          
          callback(formattedData);
        }
      })
      .subscribe();

    console.log('Inscrição em atualizações em tempo real configurada');
    
    // Retorna uma função para cancelar a inscrição
    return () => {
      console.log('Cancelando inscrição em atualizações em tempo real');
      subscription.unsubscribe();
    };
  },

  // Sincroniza dados
  sync: async (data: StorageItems): Promise<boolean> => {
    console.log('Sincronizando dados...');
    
    if (!isSupabaseConfigured()) {
      console.log('Supabase não configurado, salvando apenas localmente');
      // Salvar apenas localmente
      saveToStorage(data);
      return true;
    }

    try {
      console.log('Salvando dados no Supabase e localmente');
      // Salvar no Supabase e localmente
      const success = await saveData(data);
      if (success) {
        console.log('Dados salvos no Supabase com sucesso, atualizando armazenamento local');
        saveToStorage(data);
        return true;
      } else {
        console.log('Falha ao salvar dados no Supabase, salvando apenas localmente');
        saveToStorage(data);
        return false;
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      console.log('Salvando apenas localmente devido a erro');
      saveToStorage(data);
      return false;
    }
  }
}; 