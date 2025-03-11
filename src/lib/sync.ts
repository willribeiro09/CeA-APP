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
        })
      .subscribe((status: string) => {
        console.log('Status da inscrição do canal:', status);
      });
  },

  // Configurar atualizações em tempo real
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

  // Carregar dados mais recentes
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

  // Sincronizar dados com o servidor
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

  // Função auxiliar para mesclar despesas por lista
  mergeExpenses(localExpenses: Record<string, Expense[]>, remoteExpenses: Record<string, Expense[]>): Record<string, Expense[]> {
    const result = { ...localExpenses };
    
    // Para cada lista em remoteExpenses
    Object.keys(remoteExpenses).forEach(listName => {
      if (!result[listName]) {
        // Se a lista não existe localmente, adicioná-la
        result[listName] = [...remoteExpenses[listName]];
      } else {
        // Se a lista existe, mesclar item por item
        const localList = result[listName];
        const remoteList = remoteExpenses[listName];
        
        // Atualizar itens existentes e adicionar novos
        remoteList.forEach(remoteItem => {
          const localIndex = localList.findIndex(item => item.id === remoteItem.id);
          if (localIndex >= 0) {
            // Item existe, atualizá-lo
            localList[localIndex] = remoteItem;
          } else {
            // Item novo, adicioná-lo
            localList.push(remoteItem);
          }
        });
        
        // Identificar itens excluídos (existem localmente mas não remotamente)
        result[listName] = localList.filter(localItem => 
          remoteList.some(remoteItem => remoteItem.id === localItem.id) || 
          !remoteExpenses[listName] // Manter se a lista remota nem existe
        );
      }
    });
    
    return result;
  },
  
  // Função auxiliar para mesclar projetos por ID
  mergeProjects(localProjects: Project[], remoteProjects: Project[]): Project[] {
    const result = [...localProjects];
    
    // Atualizar projetos existentes e adicionar novos
    remoteProjects.forEach(remoteProject => {
      const localIndex = result.findIndex(project => project.id === remoteProject.id);
      if (localIndex >= 0) {
        // Projeto existe, atualizá-lo
        result[localIndex] = remoteProject;
      } else {
        // Projeto novo, adicioná-lo
        result.push(remoteProject);
      }
    });
    
    // Identificar projetos excluídos (existem localmente mas não remotamente)
    return result.filter(localProject => 
      remoteProjects.some(remoteProject => remoteProject.id === localProject.id)
    );
  },
  
  // Função auxiliar para mesclar itens de estoque por ID
  mergeStock(localStock: StockItem[], remoteStock: StockItem[]): StockItem[] {
    const result = [...localStock];
    
    // Atualizar itens existentes e adicionar novos
    remoteStock.forEach(remoteItem => {
      const localIndex = result.findIndex(item => item.id === remoteItem.id);
      if (localIndex >= 0) {
        // Item existe, atualizá-lo
        result[localIndex] = remoteItem;
      } else {
        // Item novo, adicioná-lo
        result.push(remoteItem);
      }
    });
    
    // Identificar itens excluídos (existem localmente mas não remotamente)
    return result.filter(localItem => 
      remoteStock.some(remoteItem => remoteItem.id === localItem.id)
    );
  },
  
  // Função auxiliar para mesclar funcionários por semana e ID
  mergeEmployees(localEmployees: Record<string, Employee[]>, remoteEmployees: Record<string, Employee[]>): Record<string, Employee[]> {
    const result = { ...localEmployees };
    
    // Para cada semana em remoteEmployees
    Object.keys(remoteEmployees).forEach(weekStartDate => {
      if (!result[weekStartDate]) {
        // Se a semana não existe localmente, adicioná-la
        result[weekStartDate] = [...remoteEmployees[weekStartDate]];
      } else {
        // Se a semana existe, mesclar funcionário por funcionário
        const localList = result[weekStartDate];
        const remoteList = remoteEmployees[weekStartDate];
        
        // Atualizar funcionários existentes e adicionar novos
        remoteList.forEach(remoteEmployee => {
          const localIndex = localList.findIndex(employee => employee.id === remoteEmployee.id);
          if (localIndex >= 0) {
            // Funcionário existe, atualizá-lo
            localList[localIndex] = remoteEmployee;
          } else {
            // Funcionário novo, adicioná-lo
            localList.push(remoteEmployee);
          }
        });
        
        // Identificar funcionários excluídos (existem localmente mas não remotamente)
        result[weekStartDate] = localList.filter(localEmployee => 
          remoteList.some(remoteEmployee => remoteEmployee.id === localEmployee.id) || 
          !remoteEmployees[weekStartDate] // Manter se a semana remota nem existe
        );
      }
    });
    
    return result;
  },

  // Forçar sincronização imediata
  forceSyncNow() {
    const localData = storage.load();
    if (localData) {
      this.sync(localData).catch(error => {
        console.error('Erro ao forçar sincronização:', error);
      });
    } else {
      console.log('Nenhum dado local para sincronizar');
      this.sync({ 
        expenses: {}, 
        projects: [], 
        stock: [], 
        employees: {}, 
        lastSync: new Date().getTime() 
      });
    }
  }
};

// Função para carregar dados iniciais
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