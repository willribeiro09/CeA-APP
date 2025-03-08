import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
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
              willBaseRate: data.willBaseRate || 200,
              willBonus: data.willBonus || 0,
              lastSync: new Date().getTime()
            };
            console.log('Dados processados para armazenamento local:', storageData);
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

  async loadLatestData(): Promise<StorageItems | null> {
    if (!supabase) return null;
    
    try {
      // Modificado: Usar .limit(1) em vez de .single() para evitar erro 406
      const { data, error } = await supabase
        .from('sync_data')
        .select('*')
        .eq('id', FIXED_UUID)
        .limit(1);

      if (error) {
        console.error('Erro ao carregar dados mais recentes:', error);
        return null;
      }

      // Modificado: Verificar se o array contém dados
      if (data && data.length > 0) {
        console.log('Dados recebidos do Supabase:', data[0]);
        return {
          expenses: data[0].expenses || {},
          projects: data[0].projects || [],
          stock: data[0].stock || [],
          employees: data[0].employees || {},
          willBaseRate: data[0].willBaseRate || 200,
          willBonus: data[0].willBonus || 0,
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
      console.log('Dados a serem salvos:', {
        id: FIXED_UUID,
        expenses: data.expenses,
        projects: data.projects,
        stock: data.stock,
        employees: data.employees,
        willBaseRate: data.willBaseRate,
        willBonus: data.willBonus,
        updated_at: new Date().toISOString()
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
    // Modificado: Usar .limit(1) em vez de .single() para evitar erro 406
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .eq('id', FIXED_UUID)
      .limit(1);

    if (error) {
      console.warn('Erro ao carregar dados iniciais do Supabase:', error);
      return storage.load();
    }

    // Modificado: Verificar se o array contém dados
    if (data && data.length > 0) {
      console.log('Dados carregados do Supabase:', data[0]);
      const storageData: StorageItems = {
        expenses: data[0].expenses || {},
        projects: data[0].projects || [],
        stock: data[0].stock || [],
        employees: data[0].employees || {},
        willBaseRate: data[0].willBaseRate || 200,
        willBonus: data[0].willBonus || 0,
        lastSync: new Date().getTime()
      };
      
      // Salvar no armazenamento local
      storage.save(storageData);
      return storageData;
    } else {
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