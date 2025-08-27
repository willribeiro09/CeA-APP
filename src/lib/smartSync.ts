import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ID único do dispositivo (persistente na sessão)
const DEVICE_ID = (() => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
})();

// Sistema de sincronização inteligente
export const smartSyncService = {
  channel: null as RealtimeChannel | null,
  isInitialized: false,
  isInBackground: false,
  pendingSync: false,
  lastServerData: null as StorageItems | null,
  syncPaused: false, // Nova flag para pausar sync temporariamente

  async init() {
    if (!supabase || this.isInitialized) return;
    
    console.log('🚀 Inicializando Smart Sync:', DEVICE_ID);
    this.isInitialized = true;

    // Configurar detecção de segundo plano
    this.setupBackgroundDetection();
    
    // Configurar realtime
    this.setupRealtime();
    
    // Carregar dados iniciais com merge inteligente
    await this.loadInitialData();
  },

  setupBackgroundDetection() {
    // Detectar quando app vai para segundo plano
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 App em segundo plano');
        this.isInBackground = true;
      } else {
        console.log('📱 App retornou do segundo plano');
        if (this.isInBackground) {
          this.handleForegroundReturn();
        }
        this.isInBackground = false;
      }
    });

    // Detectar blur/focus da janela
    window.addEventListener('blur', () => {
      this.isInBackground = true;
    });

    window.addEventListener('focus', () => {
      if (this.isInBackground) {
        this.handleForegroundReturn();
      }
      this.isInBackground = false;
    });
  },

  async handleForegroundReturn() {
    console.log('🔄 Sincronização suave após volta do segundo plano');
    this.pendingSync = true;
    
    try {
      // Carregar dados do servidor SEM bloquear interações
      const serverData = await this.loadFromServer();
      if (serverData) {
        // Fazer merge inteligente com dados locais
        const localData = storage.load();
        if (localData) {
          // Só fazer merge se houver diferenças significativas
          const hasSignificantChanges = this.hasSignificantChanges(localData, serverData);
          if (hasSignificantChanges) {
            const mergedData = this.intelligentMerge(localData, serverData);
            storage.save(mergedData);
            
            // Atualizar UI silenciosamente
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: mergedData 
            }));
            console.log('📊 Dados sincronizados silenciosamente');
          }
        } else {
          storage.save(serverData);
          window.dispatchEvent(new CustomEvent('dataUpdated', { 
            detail: serverData 
          }));
        }
      }
    } catch (error) {
      console.error('❌ Erro na sincronização de volta:', error);
    } finally {
      this.pendingSync = false;
    }
  },

  hasSignificantChanges(localData: StorageItems, serverData: StorageItems): boolean {
    // Comparar timestamps de última sincronização
    const localSync = localData.lastSync as number || 0;
    const serverSync = serverData.lastSync as number || 0;
    
    // Se servidor tem dados mais novos, há mudanças significativas
    if (serverSync > localSync + 5000) { // 5 segundos de diferença
      return true;
    }
    
    // Comparar quantidade de itens (mudanças estruturais)
    const localProjectsCount = localData.projects?.length || 0;
    const serverProjectsCount = serverData.projects?.length || 0;
    
    const localStockCount = localData.stock?.length || 0;
    const serverStockCount = serverData.stock?.length || 0;
    
    if (localProjectsCount !== serverProjectsCount || localStockCount !== serverStockCount) {
      return true;
    }
    
    return false;
  },

  intelligentMerge(localData: StorageItems, serverData: StorageItems): StorageItems {
    console.log('🧠 Executando merge inteligente...');
    
    const merged: StorageItems = {
      expenses: this.mergeExpenses(localData.expenses, serverData.expenses),
      projects: this.mergeProjects(localData.projects, serverData.projects),
      stock: this.mergeStock(localData.stock, serverData.stock),
      employees: this.mergeEmployees(localData.employees, serverData.employees),
      deletedIds: [...new Set([...(localData.deletedIds || []), ...(serverData.deletedIds || [])])],
      willBaseRate: serverData.willBaseRate || localData.willBaseRate || 200,
      willBonus: serverData.willBonus || localData.willBonus || 0,
      lastSync: Math.max(localData.lastSync as number, serverData.lastSync as number)
    };

    console.log('✅ Merge concluído');
    return merged;
  },

  mergeExpenses(local: Record<string, Expense[]>, server: Record<string, Expense[]>): Record<string, Expense[]> {
    const merged: Record<string, Expense[]> = {};
    const allCategories = new Set([...Object.keys(local), ...Object.keys(server)]);

    for (const category of allCategories) {
      const localExpenses = local[category] || [];
      const serverExpenses = server[category] || [];
      merged[category] = this.mergeArrayById(localExpenses, serverExpenses);
    }

    return merged;
  },

  mergeProjects(local: Project[], server: Project[]): Project[] {
    return this.mergeArrayById(local, server);
  },

  mergeStock(local: StockItem[], server: StockItem[]): StockItem[] {
    return this.mergeArrayById(local, server);
  },

  mergeEmployees(local: Record<string, Employee[]>, server: Record<string, Employee[]>): Record<string, Employee[]> {
    const merged: Record<string, Employee[]> = {};
    const allWeeks = new Set([...Object.keys(local), ...Object.keys(server)]);

    for (const week of allWeeks) {
      const localEmployees = local[week] || [];
      const serverEmployees = server[week] || [];
      merged[week] = this.mergeArrayById(localEmployees, serverEmployees);
    }

    return merged;
  },

  mergeArrayById<T extends { id: string; lastModified?: number; deviceId?: string }>(
    localArray: T[], 
    serverArray: T[]
  ): T[] {
    const itemMap = new Map<string, T>();

    // Adicionar itens locais
    for (const item of localArray) {
      itemMap.set(item.id, item);
    }

    // Adicionar/sobrescrever com itens do servidor se mais recentes
    for (const serverItem of serverArray) {
      const localItem = itemMap.get(serverItem.id);
      
      if (!localItem) {
        // Item novo do servidor
        itemMap.set(serverItem.id, serverItem);
      } else {
        // Comparar timestamps para decidir qual manter
        const serverTime = serverItem.lastModified || 0;
        const localTime = localItem.lastModified || 0;
        
        if (serverTime > localTime) {
          // Item do servidor é mais recente
          itemMap.set(serverItem.id, serverItem);
        }
        // Se local é mais recente ou igual, manter local
      }
    }

    return Array.from(itemMap.values());
  },

  setupRealtime() {
    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.channel = supabase!
      .channel(`sync_updates_${DEVICE_ID}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'sync_data' 
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Atualização realtime recebida:', payload);
          if (payload.new) {
            this.handleRealtimeUpdate(payload.new);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('🔗 Status realtime:', status);
      });
  },

  async handleRealtimeUpdate(newData: any) {
    if (this.syncPaused) {
      console.log('⏸️ Sync pausado, ignorando atualização realtime');
      return;
    }
    
    try {
      console.log('📥 Processando atualização realtime (modo suave)');
      
      const serverData: StorageItems = {
        expenses: newData.expenses || {},
        projects: newData.projects || [],
        stock: newData.stock || [],
        employees: newData.employees || {},
        deletedIds: newData.deleted_ids || [],
        willBaseRate: newData.willbaserate || 200,
        willBonus: newData.willbonus || 0,
        lastSync: newData.last_sync_timestamp || Date.now()
      };
      
      // Verificar se é uma atualização do próprio dispositivo
      const lastDeviceSeen = newData.device_last_seen;
      const currentDevice = localStorage.getItem('device_id');
      
      if (lastDeviceSeen === currentDevice) {
        console.log('⏭️ Ignorando atualização do próprio dispositivo');
        return;
      }
      
      // Só fazer merge se há mudanças significativas
      const localData = storage.load();
      if (localData) {
        const hasChanges = this.hasSignificantChanges(localData, serverData);
        if (hasChanges) {
          const mergedData = this.intelligentMerge(localData, serverData);
          storage.save(mergedData);
          
          // Atualizar UI de forma suave
          window.dispatchEvent(new CustomEvent('dataUpdated', { 
            detail: mergedData 
          }));
          console.log('✅ Dados atualizados via realtime com merge suave');
        } else {
          console.log('📊 Nenhuma mudança significativa detectada');
        }
      } else {
        storage.save(serverData);
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: serverData 
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao processar realtime:', error);
    }
  },

  async loadFromServer(): Promise<StorageItems | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase.rpc('get_sync_data');
      
      if (error) {
        console.error('Erro ao carregar dados do servidor:', error);
        return null;
      }
      
      if (data) {
        return {
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          deletedIds: data.deleted_ids || [],
          willBaseRate: data.willbaserate || 200,
          willBonus: data.willbonus || 0,
          lastSync: data.last_sync_timestamp || Date.now()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar dados do servidor:', error);
      return null;
    }
  },

  async loadInitialData(): Promise<StorageItems | null> {
    console.log('📥 Carregando dados iniciais com merge...');
    
    const localData = storage.load();
    const serverData = await this.loadFromServer();
    
    if (serverData && localData) {
      // Fazer merge inteligente
      const mergedData = this.intelligentMerge(localData, serverData);
      storage.save(mergedData);
      this.lastServerData = serverData;
      return mergedData;
    } else if (serverData) {
      // Só dados do servidor
      storage.save(serverData);
      this.lastServerData = serverData;
      return serverData;
    } else if (localData) {
      // Só dados locais
      return localData;
    }
    
    // Nenhum dado
    const emptyData: StorageItems = {
      expenses: {},
      projects: [],
      stock: [],
      employees: {},
      deletedIds: [],
      willBaseRate: 200,
      willBonus: 0,
      lastSync: Date.now()
    };
    
    storage.save(emptyData);
    return emptyData;
  },

  addTimestampToItem<T extends { lastModified?: number; deviceId?: string }>(item: T): T {
    return {
      ...item,
      lastModified: Date.now(),
      deviceId: DEVICE_ID
    };
  },

  async sync(data: StorageItems): Promise<boolean> {
    if (!supabase) {
      console.log('Supabase não configurado, salvando apenas localmente');
      storage.save(data);
      return true;
    }

    try {
      console.log('🔄 Sincronizando com timestamps...');
      
      // Adicionar timestamps aos novos itens
      const timestampedData = this.addTimestampsToData(data);
      
      // Tentar usar a função de sync inteligente primeiro
      let result, error;
      try {
        const intelligentResult = await supabase.rpc('intelligent_sync_data', {
          p_expenses: timestampedData.expenses || {},
          p_projects: timestampedData.projects || [],
          p_stock: timestampedData.stock || [],
          p_employees: timestampedData.employees || {},
          p_deleted_ids: timestampedData.deletedIds || [],
          p_willbaserate: timestampedData.willBaseRate || 200,
          p_willbonus: timestampedData.willBonus || 0,
          p_device_id: DEVICE_ID
        });
        
        if (intelligentResult.error) throw intelligentResult.error;
        
        // Se sucesso, usar dados merged do servidor
        if (intelligentResult.data && intelligentResult.data.merged) {
          const mergedData = intelligentResult.data.data;
          const updatedData: StorageItems = {
            expenses: mergedData.expenses || {},
            projects: mergedData.projects || [],
            stock: mergedData.stock || [],
            employees: mergedData.employees || {},
            deletedIds: mergedData.deleted_ids || [],
            willBaseRate: mergedData.willbaserate || 200,
            willBonus: mergedData.willbonus || 0,
            lastSync: intelligentResult.data.last_sync_timestamp || Date.now()
          };
          
          storage.save(updatedData);
          
          // Atualizar UI com dados merged
          window.dispatchEvent(new CustomEvent('dataUpdated', { 
            detail: updatedData 
          }));
          
          console.log('✅ Sincronização inteligente bem-sucedida com merge');
          return true;
        }
        
        result = intelligentResult.data;
        error = intelligentResult.error;
      } catch (intelligentError) {
        console.log('⚠️ Função inteligente falhou, usando fallback:', intelligentError);
        
        // Fallback para função simples
        const fallbackResult = await supabase.rpc('sync_data_simple', {
          p_expenses: timestampedData.expenses || {},
          p_projects: timestampedData.projects || [],
          p_stock: timestampedData.stock || [],
          p_employees: timestampedData.employees || {},
          p_deleted_ids: timestampedData.deletedIds || [],
          p_willbaserate: timestampedData.willBaseRate || 200,
          p_willbonus: timestampedData.willBonus || 0,
          p_device_id: DEVICE_ID
        });
        
        result = fallbackResult.data;
        error = fallbackResult.error;
      }
      
      if (error) {
        console.error('Erro na sincronização:', error);
        storage.save(timestampedData);
        return false;
      }
      
      if (result && result.success) {
        console.log('✅ Sincronização bem-sucedida');
        timestampedData.lastSync = result.last_sync_timestamp || Date.now();
        storage.save(timestampedData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      storage.save(data);
      return false;
    }
  },

  addTimestampsToData(data: StorageItems): StorageItems {
    const timestamped = { ...data };
    
    // Adicionar timestamps para expenses
    for (const category in timestamped.expenses) {
      timestamped.expenses[category] = timestamped.expenses[category].map(expense => 
        expense.lastModified ? expense : this.addTimestampToItem(expense)
      );
    }
    
    // Adicionar timestamps para projects
    timestamped.projects = timestamped.projects.map(project => 
      project.lastModified ? project : this.addTimestampToItem(project)
    );
    
    // Adicionar timestamps para stock
    timestamped.stock = timestamped.stock.map(item => 
      item.lastModified ? item : this.addTimestampToItem(item)
    );
    
    // Adicionar timestamps para employees
    for (const week in timestamped.employees) {
      timestamped.employees[week] = timestamped.employees[week].map(employee => 
        employee.lastModified ? employee : this.addTimestampToItem(employee)
      );
    }
    
    return timestamped;
  },

  setupRealtimeUpdates(callback: (data: StorageItems) => void) {
    if (!supabase) return () => {};

    const handleDataUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('🔄 Dados atualizados:', event.detail);
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

  // Pausar sincronização temporariamente
  pauseSync() {
    this.syncPaused = true;
    console.log('⏸️ Sincronização pausada');
  },

  // Resumir sincronização
  resumeSync() {
    this.syncPaused = false;
    console.log('▶️ Sincronização resumida');
  },

  // Verificar se sync está ativo
  isSyncActive(): boolean {
    return !this.syncPaused && this.isInitialized;
  }
};

// Funções de conveniência
export const loadData = async (): Promise<StorageItems> => {
  const data = await smartSyncService.loadInitialData();
  return data || {
    expenses: {},
    projects: [],
    stock: [],
    employees: {},
    deletedIds: [],
    willBaseRate: 200,
    willBonus: 0,
    lastSync: Date.now()
  };
};

export const saveData = (data: StorageItems): Promise<boolean> => {
  return smartSyncService.sync(data);
};

// Função para adicionar timestamps a um item
export const addTimestamp = <T extends { lastModified?: number; deviceId?: string }>(item: T): T => {
  return smartSyncService.addTimestampToItem(item);
};

// Debug global
if (typeof window !== 'undefined') {
  (window as any).smartSyncDebug = {
    deviceId: DEVICE_ID,
    getStatus: () => ({
      initialized: smartSyncService.isInitialized,
      isInBackground: smartSyncService.isInBackground,
      pendingSync: smartSyncService.pendingSync,
      syncPaused: smartSyncService.syncPaused,
      hasChannel: !!smartSyncService.channel,
      channelState: smartSyncService.channel?.state,
      isActive: smartSyncService.isSyncActive()
    }),
    loadData: () => smartSyncService.loadFromServer(),
    testMerge: (local: any, server: any) => smartSyncService.intelligentMerge(local, server),
    simulateBackground: () => {
      smartSyncService.isInBackground = true;
      document.dispatchEvent(new Event('visibilitychange'));
    },
    simulateForeground: () => {
      document.dispatchEvent(new Event('visibilitychange'));
    },
    forceSync: async () => {
      const data = storage.load();
      if (data) {
        return await smartSyncService.sync(data);
      }
      return false;
    },
    // NOVAS FUNÇÕES DE CONTROLE
    pauseSync: () => smartSyncService.pauseSync(),
    resumeSync: () => smartSyncService.resumeSync(),
    emergencyDisable: () => {
      smartSyncService.pauseSync();
      console.log('🚨 SYNC EMERGÊNCIA DESABILITADO - Use resumeSync() para reativar');
    },
    clearAndReload: async () => {
      smartSyncService.pauseSync();
      const data = await smartSyncService.loadFromServer();
      if (data) {
        storage.save(data);
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: data }));
        console.log('🔄 Dados recarregados do servidor');
      }
      smartSyncService.resumeSync();
    }
  };
  
  console.log('🧠 Smart Sync Debug disponível via: window.smartSyncDebug');
  console.log('📱 Device ID:', DEVICE_ID);
  console.log('🆘 Emergência: window.smartSyncDebug.emergencyDisable()');
}
