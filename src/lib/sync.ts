import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Identificador único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// ID FIXO compartilhado por todas as instalações do app
// Usando um UUID fixo para garantir que todos os usuários vejam os mesmos dados
const SHARED_UUID = "ce764a91-58e0-4c3d-a821-b52b16ca3e7c";
console.log('UUID compartilhado para sincronização:', SHARED_UUID);

// Intervalo de sincronização em milissegundos (5 segundos)
const SYNC_INTERVAL = 5000;

// Canais de sincronização para cada tipo de dados
type SyncChannels = {
  expenses: RealtimeChannel | null;
  employees: RealtimeChannel | null;
  projects: RealtimeChannel | null;
  stock: RealtimeChannel | null;
  willSettings: RealtimeChannel | null;
};

// Interface para as despesas adaptadas ao formato de banco de dados
interface DBExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  project?: string;
  photo_url?: string;
  is_paid: boolean;
}

// Interface para os funcionários adaptados ao formato de banco de dados
interface DBEmployee {
  id: string;
  name: string;
  role?: string;
  base_rate: number;
  bonus: number;
  expenses: any[];
}

// Interface para os projetos adaptados ao formato de banco de dados
interface DBProject {
  id: string;
  name: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
}

// Interface para os itens de estoque adaptados ao formato de banco de dados
interface DBStockItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  project?: string;
}

// Função para garantir que os valores do Will estejam definidos
const ensureWillValues = (data: any): { willBaseRate: number, willBonus: number } => {
  return {
    willBaseRate: typeof data.willBaseRate === 'number' ? data.willBaseRate : 200,
    willBonus: typeof data.willBonus === 'number' ? data.willBonus : 0
  };
};

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
            console.log('Valores do Will recebidos do Supabase:', data.willBaseRate, data.willBonus);
            
            // Garantir que os valores do Will estejam definidos
            const willValues = ensureWillValues(data);
            
            const storageData: StorageItems = {
              expenses: data.expenses || {},
              projects: data.projects || [],
              stock: data.stock || [],
              employees: data.employees || {},
              willBaseRate: willValues.willBaseRate,
              willBonus: willValues.willBonus,
              lastSync: new Date().getTime()
            };
            
            console.log('Dados processados para armazenamento local:', storageData);
            console.log('Valores do Will após processamento:', storageData.willBaseRate, storageData.willBonus);
            
            // Salvar no armazenamento local
            storage.save(storageData);
            
            // Disparar evento para atualizar a UI
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
      console.log('Valores do Will no evento de atualização:', event.detail.willBaseRate, event.detail.willBonus);
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

  async loadLatestData(): Promise<StorageItems | null> {
    if (!supabase) return null;
    
    try {
      // Usar o UUID compartilhado para carregar dados
      const { data, error } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', SHARED_UUID)
        .limit(1);

      if (error) {
        console.error('Erro ao carregar dados mais recentes:', error);
        return null;
      }

      // Verificar se o array contém dados
      if (data && data.length > 0) {
        console.log('Dados recebidos do Supabase:', data[0]);
        
        // Garantir que os valores do Will estejam definidos
        const willValues = ensureWillValues(data[0]);
        
        return {
          expenses: data[0].expenses || {},
          projects: data[0].projects || [],
          stock: data[0].stock || [],
          employees: data[0].employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
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
      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data);
      
      console.log('Sincronizando dados com Supabase usando UUID compartilhado:', SHARED_UUID);
      console.log('Valores do Will a serem sincronizados:', willValues.willBaseRate, willValues.willBonus);
      
      // Primeiro, carregamos os dados existentes para garantir que não sobrescrevemos nada
      const { data: existingData, error: fetchError } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', SHARED_UUID)
        .limit(1);
      
      if (fetchError) {
        console.error('Erro ao buscar dados existentes:', fetchError);
        // Mesmo com erro, tentamos salvar no armazenamento local
        storage.save(data);
        return false;
      }
      
      let dataToSave;
      
      if (existingData && existingData.length > 0) {
        // Mesclamos os dados existentes com os novos dados
        console.log('Dados existentes encontrados, mesclando com novos dados');
        
        dataToSave = {
          id: SHARED_UUID,
          expenses: { ...existingData[0].expenses, ...data.expenses },
          projects: data.projects || existingData[0].projects || [],
          stock: data.stock || existingData[0].stock || [],
          employees: { ...existingData[0].employees, ...data.employees },
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          updated_at: new Date().toISOString()
        };
      } else {
        // Não encontramos dados existentes, salvamos os novos dados
        console.log('Nenhum dado existente encontrado, salvando novos dados');
        
        dataToSave = {
          id: SHARED_UUID,
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          updated_at: new Date().toISOString()
        };
      }
      
      console.log('Dados a serem salvos:', dataToSave);
      
      // Salvar no Supabase
      const { error } = await supabase
        .from('sync_data')
        .upsert(dataToSave);

      if (error) {
        console.error('Erro ao sincronizar com Supabase:', error);
        return false;
      }

      // Atualizar os valores do Will nos dados originais
      data.willBaseRate = willValues.willBaseRate;
      data.willBonus = willValues.willBonus;
      
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
    // Primeiro, verificar se existem dados no Supabase usando UUID compartilhado
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .eq('id', SHARED_UUID)
      .limit(1);

    if (error) {
      console.warn('Erro ao carregar dados iniciais do Supabase:', error);
      return storage.load();
    }

    // Verificar se o array contém dados
    if (data && data.length > 0) {
      console.log('Dados encontrados no Supabase com UUID compartilhado:', data[0]);
      
      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data[0]);
      
      const storageData: StorageItems = {
        expenses: data[0].expenses || {},
        projects: data[0].projects || [],
        stock: data[0].stock || [],
        employees: data[0].employees || {},
        willBaseRate: willValues.willBaseRate,
        willBonus: willValues.willBonus,
        lastSync: new Date().getTime()
      };
      
      console.log('Valores do Will carregados:', storageData.willBaseRate, storageData.willBonus);
      
      // Salvar no armazenamento local
      storage.save(storageData);
      return storageData;
    } else {
      console.log('Registro com UUID compartilhado não encontrado, procurando qualquer registro');
      
      // Se não encontrou com o UUID compartilhado, tentar encontrar qualquer registro
      const { data: anyData, error: anyError } = await supabase
        .from('sync_data')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (anyError) {
        console.warn('Erro ao procurar por qualquer registro no Supabase:', anyError);
      } else if (anyData && anyData.length > 0) {
        console.log('Encontrado outro registro no Supabase:', anyData[0]);
        
        // Garantir que os valores do Will estejam definidos
        const willValues = ensureWillValues(anyData[0]);
        
        const storageData: StorageItems = {
          expenses: anyData[0].expenses || {},
          projects: anyData[0].projects || [],
          stock: anyData[0].stock || [],
          employees: anyData[0].employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          lastSync: new Date().getTime()
        };
        
        console.log('Dados de outro registro carregados. Salvando com UUID compartilhado.');
        
        // Salvar esses dados com o UUID compartilhado
        const dataToSave = {
          id: SHARED_UUID,
          expenses: storageData.expenses,
          projects: storageData.projects,
          stock: storageData.stock,
          employees: storageData.employees,
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          updated_at: new Date().toISOString()
        };
        
        // Salvar no Supabase com o UUID compartilhado
        const { error: saveError } = await supabase
          .from('sync_data')
          .upsert(dataToSave);
          
        if (saveError) {
          console.error('Erro ao salvar dados com UUID compartilhado:', saveError);
        } else {
          console.log('Dados salvos com sucesso usando UUID compartilhado');
        }
        
        // Salvar no armazenamento local
        storage.save(storageData);
        return storageData;
      }
      
      // Se ainda não encontrou dados, verificar armazenamento local
      console.log('Nenhum registro encontrado no Supabase, verificando armazenamento local');
      const localData = storage.load();
      
      if (localData && (
        Object.keys(localData.expenses || {}).length > 0 || 
        (localData.projects || []).length > 0 || 
        (localData.stock || []).length > 0 || 
        Object.keys(localData.employees || {}).length > 0
      )) {
        console.log('Dados encontrados no armazenamento local:', localData);
        
        // Garantir que os valores do Will estejam definidos no localData
        const willValues = ensureWillValues(localData);
        localData.willBaseRate = willValues.willBaseRate;
        localData.willBonus = willValues.willBonus;
        
        // Sincronizar dados locais com Supabase
        await syncService.sync(localData);
        return localData;
      }
      
      // Se não encontrou dados em lugar nenhum, criar estrutura vazia
      console.log('Nenhum dado encontrado, inicializando com estrutura vazia');
      const emptyData: StorageItems = {
        expenses: {},
        projects: [],
        stock: [],
        employees: {},
        willBaseRate: 200,
        willBonus: 0,
        lastSync: new Date().getTime()
      };
      
      // NÃO sincronizamos dados vazios com o Supabase para evitar sobrescrever dados existentes
      // Apenas salvamos localmente
      storage.save(emptyData);
      return emptyData;
    }
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    return storage.load();
  }
};

export const saveData = (data: StorageItems) => {
  // Garantir que os valores do Will estejam definidos
  const willValues = ensureWillValues(data);
  data.willBaseRate = willValues.willBaseRate;
  data.willBonus = willValues.willBonus;
  
  console.log('Salvando dados com valores do Will:', data.willBaseRate, data.willBonus);
  
  // Salvar localmente primeiro para resposta imediata
  storage.save(data);
  
  // Sincronizar com Supabase
  if (supabase) {
    syncService.sync(data).catch(error => {
      console.error('Erro ao sincronizar dados:', error);
    });
  }
}; 