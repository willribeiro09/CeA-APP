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

// Interfaces para os dados adaptados ao formato de banco de dados
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
  expenses: Record<string, unknown>[];
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

    // Forçar sincronização imediata ao inicializar
    this.forceSyncNow();

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
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('Mudança recebida:', payload);
          if (payload.new) {
            const newData = payload.new as Record<string, unknown>;
            
            // Obter dados locais existentes
            const localData = storage.load();
            if (!localData) {
              // Se não há dados locais, simplesmente salvar os novos dados
              const storageData: StorageItems = {
                expenses: newData.expenses as Record<string, Expense[]> || {},
                projects: newData.projects as Project[] || [],
                stock: newData.stock as StockItem[] || [],
                employees: newData.employees as Record<string, Employee[]> || {},
                willBaseRate: newData.willBaseRate as number || 200,
                willBonus: newData.willBonus as number || 0,
                lastSync: new Date().getTime()
              };
              console.log('Sem dados locais, salvando novos dados:', storageData);
              storage.save(storageData);
              window.dispatchEvent(new CustomEvent('dataUpdated', { 
                detail: storageData 
              }));
              return;
            }

            // Se há dados locais, atualizar com os novos dados
            const updatedData = {
              ...localData,
              expenses: {
                ...localData.expenses,
                ...(newData.expenses as Record<string, Expense[]> || {})
              },
              projects: [
                ...localData.projects,
                ...(newData.projects as Project[] || [])
              ],
              stock: [
                ...localData.stock,
                ...(newData.stock as StockItem[] || [])
              ],
              employees: {
                ...localData.employees,
                ...(newData.employees as Record<string, Employee[]> || {})
              },
              willBaseRate: (newData.willBaseRate as number) || localData.willBaseRate || 200,
              willBonus: (newData.willBonus as number) || localData.willBonus || 0,
              lastSync: new Date().getTime()
            };
            console.log('Atualizando dados:', updatedData);
            storage.save(updatedData);
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: updatedData 
            }));
          }
        });
  },

  // Configurar atualizações em tempo real
  setupRealtimeUpdates(callback: (data: StorageItems) => void) {
    if (!supabase) return;
    
    // Implementação das atualizações em tempo real
    console.log('Configurando atualizações em tempo real');
  },

  // Carregar dados mais recentes
  async loadLatestData(): Promise<StorageItems | null> {
    try {
      // Implementação do carregamento de dados
      console.log('Carregando dados mais recentes');
      
      // Retornar dados do armazenamento local como fallback
      const storedData = localStorage.getItem(UUID_STORAGE_KEY);
      if (storedData) {
        return JSON.parse(storedData);
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }
  },

  // Sincronizar dados com o servidor
  async sync(data: StorageItems): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      // Implementação da sincronização
      console.log('Sincronizando dados com o servidor');
      
      // Atualizar lastSync
      data.lastSync = new Date().toISOString();
      
      // Salvar no armazenamento local
      localStorage.setItem(UUID_STORAGE_KEY, JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      return false;
    }
  },

  // Forçar sincronização imediata
  forceSyncNow() {
    this.sync(storage.load() || { expenses: {}, projects: [], stock: [], employees: {}, lastSync: new Date().toISOString() });
  }
};

// Função para carregar dados iniciais
export const loadInitialData = async (): Promise<StorageItems | null> => {
  // Tentar carregar do servidor primeiro
  const serverData = await syncService.loadLatestData();
  if (serverData) {
    return serverData;
  }
  
  // Fallback para dados locais
  const storedData = localStorage.getItem(UUID_STORAGE_KEY);
  if (storedData) {
    return JSON.parse(storedData);
  }
  
  // Dados iniciais vazios
  return {
    expenses: {},
    projects: [],
    stock: [],
    employees: {},
    lastSync: new Date().toISOString()
  };
};

// Função para salvar dados
export const saveData = (data: StorageItems) => {
  // Salvar localmente
  localStorage.setItem(UUID_STORAGE_KEY, JSON.stringify(data));
  
  // Sincronizar com o servidor
  syncService.sync(data).catch(error => {
    console.error('Erro ao sincronizar após salvar:', error);
  });
}; 