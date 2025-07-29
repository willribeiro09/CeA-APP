import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Identificador único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// ID FIXO compartilhado por todas as instalações do app
// Usando um UUID fixo para garantir que todos os usuários vejam os mesmos dados
const SHARED_UUID = "00000000-0000-0000-0000-000000000000";
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
  // Mapeamento de camelCase para lowercase (correspondendo aos nomes no banco)
  const baseRate = typeof data.willBaseRate === 'number' ? 
    data.willBaseRate : 
    (typeof data.willbaserate === 'number' ? data.willbaserate : 200);
    
  const bonus = typeof data.willBonus === 'number' ? 
    data.willBonus : 
    (typeof data.willbonus === 'number' ? data.willbonus : 0);
    
  return {
    willBaseRate: baseRate,
    willBonus: bonus
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
            console.log('Dados recebidos do Supabase:', data);
          console.log('Valores do Will recebidos do Supabase:', data.willbaserate, data.willbonus);
          
          // Garantir que os valores do Will estejam definidos
          const willValues = ensureWillValues(data);
          
          const storageData: StorageItems = {
            expenses: data.expenses || {},
            projects: data.projects || [],
            stock: data.stock || [],
            employees: data.employees || {},
            willBaseRate: willValues.willBaseRate,
            willBonus: willValues.willBonus,
              lastSync: data.last_sync_timestamp || new Date().getTime()
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
      // Usar a função SQL get_changes_since para obter dados do servidor
      const { data, error } = await supabase
        .rpc('get_changes_since', {
          p_id: SHARED_UUID,
          p_last_sync_timestamp: 0 // Timestamp 0 garante que todos os dados sejam retornados
        });

      if (error) {
        console.error('Erro ao carregar dados com get_changes_since:', error);
        
        // Fallback para método tradicional
        const { data: fallbackData, error: fallbackError } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', SHARED_UUID)
        .limit(1);

        if (fallbackError) {
          console.error('Erro no fallback ao carregar dados mais recentes:', fallbackError);
        return null;
      }

        if (fallbackData && fallbackData.length > 0) {
          console.log('Dados recebidos pelo fallback:', fallbackData[0]);
          const willValues = ensureWillValues(fallbackData[0]);
          
          return {
            expenses: fallbackData[0].expenses || {},
            projects: fallbackData[0].projects || [],
            stock: fallbackData[0].stock || [],
            employees: fallbackData[0].employees || {},
            willBaseRate: willValues.willBaseRate,
            willBonus: willValues.willBonus,
            lastSync: fallbackData[0].last_sync_timestamp || new Date().getTime()
          };
        }
        
        return null;
      }

      if (data) {
        console.log('Dados recebidos via get_changes_since:', data);
        
        const willValues = ensureWillValues(data);
        
        return {
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          willBaseRate: willValues.willBaseRate,
          willBonus: willValues.willBonus,
          lastSync: data.last_sync_timestamp || new Date().getTime()
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
      // Verificar e validar os dados antes de sincronizar
      if (!data.projects) {
        console.warn('Array de projetos não definido, inicializando como vazio');
        data.projects = [];
      } else if (!Array.isArray(data.projects)) {
        console.error('Dados de projetos não são um array! Tipo:', typeof data.projects);
        data.projects = [];
      } else {
        console.log(`Sincronizando ${data.projects.length} projetos:`, 
          data.projects.map(p => `${p.id}: ${p.client}`).join(', '));
      }
      
      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data);
      
      console.log('Sincronizando dados com Supabase usando UUID compartilhado:', SHARED_UUID);
      console.log('Valores do Will a serem sincronizados:', willValues.willBaseRate, willValues.willBonus);
      
      // Usar a função SQL sync_client_data para sincronizar com merge
      const currentTime = new Date().getTime();
      
      const { data: syncResult, error: syncError } = await supabase
        .rpc('sync_client_data', {
          p_id: SHARED_UUID,
          p_expenses: data.expenses || {},
          p_projects: data.projects || [],
          p_stock: data.stock || [],
          p_employees: data.employees || {},
          p_willbaserate: willValues.willBaseRate,
          p_willbonus: willValues.willBonus,
          p_client_timestamp: currentTime,
          p_device_id: SESSION_ID
        });
      
      if (syncError) {
        console.error('Erro ao sincronizar com sync_client_data:', syncError);
        
        // Fallback para método tradicional
        console.log('Tentando método tradicional como fallback...');
        
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
            willbaserate: willValues.willBaseRate,
            willbonus: willValues.willBonus,
            last_sync_timestamp: currentTime
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
            willbaserate: willValues.willBaseRate,
            willbonus: willValues.willBonus,
            last_sync_timestamp: currentTime
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
      } else {
        console.log('Sincronização bem-sucedida via sync_client_data:', syncResult);
        
        // Atualizar timestamp local
        data.lastSync = currentTime;
      }

      // Salvar localmente
      storage.save(data);
      return true;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  }
};

export const loadInitialData = async (): Promise<StorageItems | null> => {
  // Primeiro, verificar se há dados no armazenamento local
  const localData = storage.load();
  
  // Se houver dados no armazenamento local e o Supabase não estiver configurado, usar dados locais
  if (localData && !supabase) {
    console.log('Usando dados do armazenamento local (Supabase não configurado)');
    return localData;
  }
  
  // Se o Supabase estiver configurado, tentar carregar dados mais recentes
  if (supabase) {
    try {
      const serverData = await syncService.loadLatestData();
      
      if (serverData) {
        console.log('Dados carregados do servidor');
        
        // Se também houver dados locais, verificar qual é mais recente
        if (localData) {
          const serverTimestamp = typeof serverData.lastSync === 'string' 
            ? parseInt(serverData.lastSync, 10) 
            : serverData.lastSync;
          
          const localTimestamp = typeof localData.lastSync === 'string' 
            ? parseInt(localData.lastSync, 10) 
            : localData.lastSync;
          
          // Se os dados locais forem mais recentes, mesclar dados e sincronizar
          if (localTimestamp > serverTimestamp) {
            console.log('Dados locais são mais recentes, sincronizando com o servidor');
            
            // Mesclar dados (preferindo dados locais em caso de conflito)
            const mergedData: StorageItems = {
              expenses: { ...serverData.expenses, ...localData.expenses },
              projects: [...serverData.projects, ...localData.projects.filter(p => 
                !serverData.projects.some(sp => sp.id === p.id))],
              stock: [...serverData.stock, ...localData.stock.filter(s => 
                !serverData.stock.some(ss => ss.id === s.id))],
              employees: { ...serverData.employees, ...localData.employees },
              willBaseRate: localData.willBaseRate !== undefined ? 
                localData.willBaseRate : serverData.willBaseRate,
              willBonus: localData.willBonus !== undefined ? 
                localData.willBonus : serverData.willBonus,
              lastSync: localTimestamp
            };
            
            // Sincronizar dados mesclados com o servidor
            await syncService.sync(mergedData);
            
            return mergedData;
          }
        }
        
        // Se não houver dados locais ou os dados do servidor forem mais recentes, usar dados do servidor
        storage.save(serverData);
        return serverData;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do servidor:', error);
    }
  }
  
  // Se não conseguir carregar dados do servidor ou não houver dados no servidor, usar dados locais
  if (localData) {
    console.log('Usando dados do armazenamento local');
    return localData;
  }
  
  // Se não houver dados locais nem no servidor, retornar estrutura vazia
  console.log('Nenhum dado encontrado, retornando estrutura vazia');
  return {
        expenses: {},
        projects: [],
        stock: [],
        employees: {},
        willBaseRate: 200,
        willBonus: 0,
        lastSync: new Date().getTime()
      };
};

export const saveData = (data: StorageItems) => {
  return syncService.sync(data);
}; 