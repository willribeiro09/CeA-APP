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
      lastSync: data.updated_at || new Date().toISOString()
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
    }

    // ID fixo para garantir que sempre atualizamos o mesmo registro
    const FIXED_ID = '00000000-0000-0000-0000-000000000000';

    // Criar um objeto com os dados a serem salvos
    const dataToSave = {
      id: FIXED_ID,
      expenses: data.expenses || {},
      projects: data.projects || [],
      stock: data.stock || [],
      employees: data.employees || {}
    };

    console.log('Dados formatados para salvar no Supabase:', JSON.stringify(dataToSave));

    // Primeiro, verificar se já existe um registro com o ID fixo
    const { data: existingData, error: checkError } = await supabase
      .from('sync_data')
      .select('id')
      .eq('id', FIXED_ID)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar registro existente:', checkError);
      return false;
    }

    let saveError;
    
    if (existingData) {
      // Se existe, atualiza
      console.log('Registro existente encontrado, atualizando...');
      const { error } = await supabase
        .from('sync_data')
        .update(dataToSave)
        .eq('id', FIXED_ID);
      
      saveError = error;
    } else {
      // Se não existe, insere
      console.log('Registro não encontrado, inserindo novo...');
      const { error } = await supabase
        .from('sync_data')
        .insert(dataToSave);
      
      saveError = error;
    }

    if (saveError) {
      console.error('Erro ao salvar dados no Supabase:', saveError);
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
        // Salvar dados locais no Supabase
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
      return () => {};
    }

    console.log('Configurando atualizações em tempo real...');
    
    const subscription = supabase
      .channel('sync_data_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_data'
      }, async (payload) => {
        console.log('Recebida atualização em tempo real:', payload);
        
        // Carregar dados atualizados
        const updatedData = await loadInitialData();
        if (updatedData) {
          console.log('Dados atualizados carregados, chamando callback');
          callback(updatedData);
          
          // Atualizar armazenamento local
          saveToStorage(updatedData);
        }
      })
      .subscribe();

    // Retornar função para cancelar a inscrição
    return () => {
      console.log('Cancelando inscrição de atualizações em tempo real');
      subscription.unsubscribe();
    };
  },

  // Sincroniza dados
  sync: async (data: StorageItems): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      console.log('Supabase não configurado, salvando apenas localmente');
      saveToStorage(data);
      return true;
    }

    console.log('Sincronizando dados...');
    
    // Salvar no Supabase
    const success = await saveData(data);
    
    if (success) {
      console.log('Dados sincronizados com sucesso, atualizando armazenamento local');
      // Atualizar armazenamento local
      saveToStorage(data);
      return true;
    } else {
      console.error('Falha ao sincronizar dados');
      return false;
    }
  }
}; 