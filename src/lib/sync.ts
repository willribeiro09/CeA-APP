import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';
import { onRealtimeUpdate } from './supabase';

// Identificador único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// ID FIXO compartilhado por todas as instalações do app
// Usando um UUID fixo para garantir que todos os usuários vejam os mesmos dados
const SHARED_UUID = "ce764a91-58e0-4c3d-a821-b52b16ca3e7c";
console.log('UUID compartilhado para sincronização:', SHARED_UUID);

// Intervalo de sincronização em milissegundos (5 segundos)
const SYNC_INTERVAL = 5000;

// Variáveis para controlar o estado da sincronização
let isSyncInProgress = false;
let isAppReady = false;
let lastKnownVersion = 0;
let isPollingActive = false;

// Função para marcar o app como pronto para interação
const setAppReady = () => {
  if (!isAppReady) {
    isAppReady = true;
    window.dispatchEvent(new CustomEvent('appReady'));
    console.log('App marcado como pronto para interação');
  }
};

// Função para garantir que os valores do Will estejam definidos
// Lidar com o problema de case-sensitivity entre willBaseRate e willbaserate
const ensureWillValues = (data: any): { willBaseRate: number, willBonus: number } => {
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
  unsubscribe: null as (() => void) | null,
  isInitialized: false,
  syncIntervalId: null as NodeJS.Timeout | null,

  init() {
    if (!supabase || this.isInitialized) return;
    
    console.log('Inicializando serviço de sincronização com ID:', SESSION_ID);
    this.isInitialized = true;

    // Limpar intervalo de sincronização anterior se existir
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    // Iniciar sincronização periódica automática (a cada 5 segundos)
    this.syncIntervalId = setInterval(() => {
      if (!isSyncInProgress) {
        const currentData = storage.load();
        if (currentData) {
          console.log('Sincronização automática iniciada...');
          this.sync(currentData).catch(error => {
            console.error('Erro na sincronização automática:', error);
          });
        }
      }
    }, SYNC_INTERVAL);

    // Forçar sincronização imediata ao inicializar
    this.forceSyncNow();

    // Configurar polling para receber atualizações
    this.setupPolling();
  },

  setupPolling() {
    // Verificar se o Supabase está disponível
    if (!supabase) {
      console.error('Não é possível configurar polling: Supabase não configurado');
      return;
    }

    // Limpar inscrição anterior se existir
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      isPollingActive = false;
    }

    // Criar nova inscrição via polling
    try {
      console.log('Configurando polling para sync_data...');
      
      this.unsubscribe = onRealtimeUpdate((data) => {
        console.log('Mudança recebida via polling:', data);
        if (data) {
          const newVersion = data.version;
          
          // Evitar processamento de versões antigas ou da mesma versão
          if (newVersion && newVersion <= lastKnownVersion) {
            console.log(`Ignorando atualização com versão ${newVersion} (já temos versão ${lastKnownVersion})`);
            return;
          }
          
          // Atualizar última versão conhecida
          if (newVersion) {
            lastKnownVersion = newVersion;
          }
          
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
      });
      
      isPollingActive = true;
      console.log('Polling para sync_data configurado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao configurar polling:', error);
      setTimeout(() => this.setupPolling(), 5000);
    }
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
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
        isPollingActive = false;
      }
      if (this.syncIntervalId) {
        clearInterval(this.syncIntervalId);
        this.syncIntervalId = null;
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
        
        // Atualizar a versão mais recente conhecida
        if (data[0].version) {
          lastKnownVersion = data[0].version;
          console.log('Versão atual do registro:', lastKnownVersion);
        }
        
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
      console.warn('Supabase não configurado, não é possível sincronizar');
      return false;
    }
    
    if (isSyncInProgress) {
      console.log('Sincronização já em andamento, aguardando...');
      return false;
    }
    
    isSyncInProgress = true;
    
    try {
      // Verificar e validar os dados antes de sincronizar
      if (!data.projects) {
        console.warn('Array de projetos não definido, inicializando como vazio');
        data.projects = [];
      } else if (!Array.isArray(data.projects)) {
        console.error('Dados de projetos não são um array! Tipo:', typeof data.projects);
        data.projects = [];
      }
      
      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data);
      
      console.log('Sincronizando dados com Supabase usando UUID compartilhado:', SHARED_UUID);
      console.log('Valores do Will a serem sincronizados:', willValues.willBaseRate, willValues.willBonus);
      
      // Testar primeiro o método RPC que resolve problemas de sincronização
      const syncResult = await this.syncWithRPC(data);
      
      // Verificar se o polling está ativo, caso contrário, tentar reiniciar
      if (!isPollingActive && this.isInitialized) {
        console.log('Polling não está ativo. Reiniciando...');
        this.setupPolling();
      }
      
      return syncResult;
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      return false;
    } finally {
      isSyncInProgress = false;
    }
  },
  
  async syncWithRPC(data: StorageItems): Promise<boolean> {
    try {
      const willValues = ensureWillValues(data);
      const currentTime = new Date().getTime();
      
      // Usar a função SQL sync_client_data para sincronizar com merge
      if (!supabase) {
        console.log('Supabase não configurado, salvando apenas localmente');
        storage.save(data);
        return true;
      }
      
      console.log('Tentando sincronizar usando função RPC sync_client_data...');
      const { data: syncResult, error: syncError } = await supabase
        .rpc('sync_client_data', {
          p_id: SHARED_UUID,
          p_expenses: data.expenses || {},
          p_projects: data.projects || [],
          p_stock: data.stock || [],
          p_employees: data.employees || {},
          p_willbaserate: willValues.willBaseRate, // Usar nome do parâmetro correto
          p_willbonus: willValues.willBonus, // Usar nome do parâmetro correto
          p_client_timestamp: currentTime,
          p_device_id: SESSION_ID
        });
      
      if (syncError) {
        console.error('Erro ao sincronizar usando RPC:', syncError);
        
        // Tentar o método direto como fallback
        console.log('Tentando salvar diretamente na tabela sync_data...');
        const { error: directSaveError } = await supabase
          .from('sync_data')
          .upsert({
            id: SHARED_UUID,
            expenses: data.expenses || {},
            projects: data.projects || [],
            stock: data.stock || [],
            employees: data.employees || {},
            willbaserate: willValues.willBaseRate, // Nome correto da coluna no DB
            willbonus: willValues.willBonus, // Nome correto da coluna no DB
            last_sync_timestamp: currentTime,
            updated_at: new Date().toISOString()
          });
        
        if (directSaveError) {
          console.error('Falha em todas as tentativas de sincronização:', directSaveError);
          return false;
        }
        
        console.log('Dados essenciais salvos com sucesso usando método direto');
        
        // Atualizar versão após salvamento direto
        const { data: newVersionData } = await supabase
          .from('sync_data')
          .select('version')
          .eq('id', SHARED_UUID)
          .single();
          
        if (newVersionData && newVersionData.version) {
          lastKnownVersion = newVersionData.version;
          console.log('Nova versão após salvamento:', lastKnownVersion);
        }
        
        return true;
      }
      
      console.log('Dados sincronizados com sucesso usando RPC:', syncResult);
      
      // Atualizar versão após RPC
      if (syncResult && syncResult.version) {
        lastKnownVersion = syncResult.version;
        console.log('Nova versão após RPC:', lastKnownVersion);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar usando RPC:', error);
      return false;
    }
  },

  // Função para mesclar dados locais com dados do servidor
  mergeData(serverData: StorageItems, localData: StorageItems): StorageItems {
    console.log('Mesclando dados do servidor com dados locais...');
    
    // Usar o valor mais recente para willBaseRate e willBonus
    const willBaseRate = localData.willBaseRate !== undefined ? 
      localData.willBaseRate : serverData.willBaseRate;
    const willBonus = localData.willBonus !== undefined ? 
      localData.willBonus : serverData.willBonus;
    
    return {
      expenses: { ...serverData.expenses, ...localData.expenses },
      projects: [...serverData.projects, ...localData.projects],
      stock: [...serverData.stock, ...localData.stock],
      employees: { ...serverData.employees, ...localData.employees },
      willBaseRate,
      willBonus,
      lastSync: new Date().getTime()
    };
  },

  // Função para forçar sincronização imediata
  async forceSyncNow(): Promise<void> {
    if (!supabase || isSyncInProgress) {
      // Se não há Supabase ou já está sincronizando, marcar como pronto mesmo assim
      setAppReady();
      return;
    }
    
    isSyncInProgress = true;
    
    try {
      console.log('Forçando sincronização imediata...');
      
      // Carregar dados mais recentes do Supabase
      const latestData = await this.loadLatestData();
      
      if (latestData) {
        // Salvar no armazenamento local
        storage.save(latestData);
        
        // Disparar evento para atualizar a UI
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: latestData 
        }));
        
        console.log('Sincronização forçada concluída com sucesso');
      } else {
        console.log('Nenhum dado encontrado para sincronização forçada');
      }
      
      // Marcar o app como pronto para interação após a primeira sincronização
      setAppReady();
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      
      // Mesmo com erro, marcar o app como pronto para interação
      setAppReady();
    } finally {
      isSyncInProgress = false;
    }
  }
};

export const loadInitialData = async (): Promise<StorageItems | null> => {
  if (!supabase) {
    console.log('Supabase não configurado, carregando dados locais');
    setAppReady();
    return storage.load();
  }

  try {
    // Tentar carregar dados do Supabase usando o UUID compartilhado
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .eq('id', SHARED_UUID)
      .limit(1);

    if (error) {
      console.warn('Erro ao carregar dados iniciais do Supabase:', error);
      setAppReady();
      return storage.load();
    }

    // Verificar se o array contém dados
    if (data && data.length > 0) {
      console.log('Dados carregados do Supabase:', data[0]);
      
      // Atualizar a versão conhecida
      if (data[0].version) {
        lastKnownVersion = data[0].version;
        console.log('Versão inicial do registro:', lastKnownVersion);
      }
      
      // Garantir que os valores do Will estejam definidos, considerando case sensitivity
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
    setAppReady();
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

// Função para verificar se o app está pronto para interação
export const isReady = () => isAppReady; 