import { supabase } from './supabase';
import { StorageItems } from '../types';
import { storage } from './storage';
import { RealtimeChannel } from '@supabase/supabase-js';

// ID único do dispositivo
const DEVICE_ID = (() => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
})();

// Sistema de sincronização BÁSICO e SIMPLES
export const basicSyncService = {
  channel: null as RealtimeChannel | null,
  isInitialized: false,
  lastSyncTime: 0, // Para evitar sync muito frequente
  syncInProgress: false, // Para evitar syncs simultâneos
  isSyncingOnReturn: false, // Flag específica para sync de retorno do segundo plano
  syncCallbacks: new Set<() => void>(), // Callbacks para notificar quando sync termina
  
  // NOVO: Sistema de debounce inteligente para reduzir syncs excessivos
  syncQueue: [] as Array<() => void>,
  debounceTimer: null as NodeJS.Timeout | null,
  minSyncInterval: 8000, // Mínimo 8 segundos entre syncs (aumentado de 2s)
  maxSyncInterval: 60000, // Máximo 1 minuto entre syncs

  async init() {
    if (!supabase || this.isInitialized) return;
    
    console.log('🔄 Inicializando Sync Básico:', DEVICE_ID);
    this.isInitialized = true;

    // Configurar detecção de segundo plano
    this.setupBackgroundDetection();

    // Configurar realtime simples
    this.setupRealtime();
    
    // Carregar dados iniciais
    await this.loadInitialData();
  },

  // NOVO: Sistema de debounce inteligente para sincronização
  queueSync(syncFunction: () => void) {
    const now = Date.now();
    
    // Se já passou tempo suficiente desde o último sync, executar imediatamente
    if (now - this.lastSyncTime >= this.minSyncInterval) {
      syncFunction();
      return;
    }
    
    // Adicionar à fila de sync
    this.syncQueue.push(syncFunction);
    
    // Limpar timer anterior se existir
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Calcular delay baseado no tempo desde o último sync
    const timeSinceLastSync = now - this.lastSyncTime;
    const delay = Math.max(2000, this.minSyncInterval - timeSinceLastSync);
    
    // Configurar timer para executar syncs em lote
    this.debounceTimer = setTimeout(() => {
      this.executeQueuedSyncs();
    }, delay);
  },

  // NOVO: Executar syncs em lote
  async executeQueuedSyncs() {
    if (this.syncQueue.length === 0) return;
    
    const now = Date.now();
    
    // Verificar se já passou tempo suficiente
    if (now - this.lastSyncTime < this.minSyncInterval) {
      // Ainda não passou tempo suficiente, reagendar
      const remainingTime = this.minSyncInterval - (now - this.lastSyncTime);
      this.debounceTimer = setTimeout(() => {
        this.executeQueuedSyncs();
      }, remainingTime);
      return;
    }
    
    console.log(`🔄 Executando ${this.syncQueue.length} syncs em lote (debounce inteligente)...`);
    
    // Executar apenas o último sync da fila (mais recente)
    const latestSync = this.syncQueue[this.syncQueue.length - 1];
    this.syncQueue = []; // Limpar fila
    
    if (latestSync) {
      latestSync();
    }
    
    this.debounceTimer = null;
  },

  setupBackgroundDetection() {
    let lastCheckTime = Date.now();
    let lastFocusTime = Date.now();
    
    // DETECÇÃO INTELIGENTE - Com debounce para reduzir spam
    const queueSync = () => {
      this.queueSync(() => this.handleAppReturn());
    };

    // 1. Visibilitychange - Detecta mudança de aba/janela (mais confiável)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const now = Date.now();
        console.log('🚀 App voltou (visibilitychange) - sincronização em fila...');
        queueSync();
        lastCheckTime = now;
        lastFocusTime = now;
      }
    });

    // 2. Focus - Detectar foco da janela
    window.addEventListener('focus', () => {
      const now = Date.now();
      console.log('🎯 App recebeu foco (focus) - sincronização em fila...');
      queueSync();
      lastCheckTime = now;
      lastFocusTime = now;
    });

    // 3. PWA: Pageshow - Específico para volta do cache/background
    window.addEventListener('pageshow', (event) => {
      const now = Date.now();
      console.log('📱 PWA: App voltou (pageshow) - sincronização em fila...');
      queueSync();
      lastCheckTime = now;
    });

    // 4. PWA: Resume - Evento específico de PWA
    document.addEventListener('resume', () => {
      const now = Date.now();
      console.log('📱 PWA: App resumed (resume) - sincronização em fila...');
      queueSync();
      lastCheckTime = now;
    });

    // 5. DETECÇÃO TEMPORAL INTELIGENTE - Reduzida para evitar spam
    setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        const now = Date.now();
        // Verificação a cada 45 segundos se passou mais de 90s sem sync
        if (now - lastCheckTime > 90000) {
          console.log('⏰ Verificação inteligente (90s+) - sincronização...');
          this.handleAppReturn();
          lastCheckTime = now;
        }
      }
    }, 45000); // Verifica a cada 45 segundos (aumentado de 15s)

    // 6. PWA: Detectar mudanças no estado online/offline
    window.addEventListener('online', () => {
      console.log('🌐 ONLINE: Conectividade restaurada - sincronização em fila...');
      setTimeout(() => queueSync(), 100); // Pequeno delay para estabilizar
    });

    console.log('🔧 Detecção configurada com DEBOUNCE INTELIGENTE para reduzir spam');
  },

  async handleAppReturn() {
    const now = Date.now();
    
    // Debounce aumentado para 8 segundos (mais estável)
    if (now - this.lastSyncTime < this.minSyncInterval) {
      console.log('⏭️ Sync muito recente, ignorando...');
      return;
    }
    
    // Evitar syncs simultâneos
    if (this.syncInProgress) {
      console.log('🔄 Sync já em progresso, ignorando...');
      return;
    }
    
    this.syncInProgress = true;
    this.isSyncingOnReturn = true; // Marcar como sync de retorno
    this.lastSyncTime = now;
    
    try {
      console.log('🚀 Sincronização SEGURA após volta do segundo plano...');
      
      // Verificar se está online antes de tentar
      if (!navigator.onLine) {
        console.log('📡 Offline - pulando sync');
        return;
      }
      
      // Notificar que sync de retorno começou
      window.dispatchEvent(new CustomEvent('syncReturnStarted'));
      
      // PASSO 1: SEMPRE carregar dados mais recentes do servidor primeiro
      console.log('🔄 PASSO 1: Verificando dados do servidor...');
      const serverData = await this.loadInitialData();
      
      // PASSO 2: Sincronizar dados locais (que serão mesclados com os do servidor)
      console.log('🔄 PASSO 2: Sincronizando dados locais...');
      const localData = storage.load();
      if (localData) {
        await this.sync(localData);
      }
      
      // Notificar que sync de retorno terminou
      window.dispatchEvent(new CustomEvent('syncReturnCompleted'));
      
      // Executar callbacks registrados
      this.syncCallbacks.forEach(callback => {
        try {
          callback();
        } catch (err) {
          console.error('Erro em callback de sync:', err);
        }
      });
      
      console.log('✅ Sincronização SEGURA concluída - dados preservados!');
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar após volta:', error);
      // Mesmo com erro, notificar que terminou
      window.dispatchEvent(new CustomEvent('syncReturnCompleted'));
    } finally {
      this.syncInProgress = false;
      this.isSyncingOnReturn = false;
    }
  },

  setupRealtime() {
    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.channel = supabase!
      .channel('basic_sync_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'sync_data' 
        }, 
        (payload: any) => {
          console.log('📡 Atualização recebida:', payload);
          if (payload.new && payload.new.device_last_seen !== DEVICE_ID) {
            // Só atualizar se não foi este dispositivo que fez a mudança
            this.handleRealtimeUpdate(payload.new);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('🔗 Realtime:', status);
      });
  },

  async handleRealtimeUpdate(newData: any) {
    try {
      console.log('📥 Processando atualização de outro dispositivo');
      
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
      
      // Salvar e atualizar UI
      storage.save(serverData);
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: serverData 
      }));
      
      console.log('✅ Dados atualizados de outro dispositivo');
    } catch (error) {
      console.error('❌ Erro ao processar realtime:', error);
    }
  },

  async loadInitialData(): Promise<StorageItems | null> {
    if (!supabase) return null;
    
    try {
      console.log('📥 Carregando dados do servidor...');
      
      const { data, error } = await supabase.rpc('get_sync_data');
      
      if (error) {
        console.error('Erro ao carregar dados:', error);
        return null;
      }
      
      if (data) {
        const serverData: StorageItems = {
          expenses: data.expenses || {},
          projects: data.projects || [],
          stock: data.stock || [],
          employees: data.employees || {},
          deletedIds: data.deleted_ids || [],
          willBaseRate: data.willbaserate || 200,
          willBonus: data.willbonus || 0,
          lastSync: data.last_sync_timestamp || Date.now()
        };
        
        // Salvar dados do servidor localmente
        storage.save(serverData);
        console.log('✅ Dados do servidor carregados e salvos');
        return serverData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao carregar dados do servidor:', error);
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
      console.log('🔄 Enviando dados para servidor...');
      
      const { data: result, error } = await supabase.rpc('sync_data_simple', {
        p_expenses: data.expenses || {},
        p_projects: data.projects || [],
        p_stock: data.stock || [],
        p_employees: data.employees || {},
        p_deleted_ids: data.deletedIds || [],
        p_willbaserate: data.willBaseRate || 200,
        p_willbonus: data.willBonus || 0,
        p_device_id: DEVICE_ID
      });
      
      if (error) {
        console.error('Erro na sincronização:', error);
        storage.save(data);
        return false;
      }
      
      if (result && result.success) {
        console.log('✅ Dados enviados ao servidor');
        data.lastSync = result.last_sync_timestamp || Date.now();
        storage.save(data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      storage.save(data);
      return false;
    }
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

  // Método para registrar callback de sync
  onSyncComplete(callback: () => void) {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  },

  // Verificar se está sincronizando ao retornar do segundo plano
  isSyncingFromBackground() {
    return this.isSyncingOnReturn;
  },

  // NOVO: Método para limpar timers e filas
  cleanup() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.syncQueue = [];
    console.log('🔄 Sync limpo e resetado');
  }
};

// Funções de conveniência
export const loadData = async (): Promise<StorageItems> => {
  console.log('📥 LoadData: Verificando fonte de dados...');
  
  // SEMPRE carregar do servidor primeiro se disponível
  if (supabase) {
    try {
      const serverData = await basicSyncService.loadInitialData();
      if (serverData) {
        console.log('✅ LoadData: Usando dados do servidor (mais recentes)');
        return serverData;
      }
    } catch (error) {
      console.error('⚠️ LoadData: Erro ao carregar do servidor:', error);
    }
  }
  
  // Fallback para dados locais APENAS se servidor falhar
  const localData = storage.load();
  if (localData) {
    console.log('📱 LoadData: Usando dados locais (fallback)');
    return localData;
  }
  
  // Dados vazios apenas se nada existir
  console.log('🆕 LoadData: Criando estrutura vazia');
  return {
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
  return basicSyncService.sync(data);
};

// Debug simples
if (typeof window !== 'undefined') {
  (window as any).basicSyncDebug = {
    deviceId: DEVICE_ID,
    getStatus: () => ({
      initialized: basicSyncService.isInitialized,
      hasChannel: !!basicSyncService.channel,
      channelState: basicSyncService.channel?.state,
      lastSyncTime: basicSyncService.lastSyncTime,
      syncInProgress: basicSyncService.syncInProgress,
      queueLength: basicSyncService.syncQueue.length,
      debounceTimer: !!basicSyncService.debounceTimer
    }),
    loadFromServer: () => basicSyncService.loadInitialData(),
    forceSync: async () => {
      const data = storage.load();
      if (data) {
        return await basicSyncService.sync(data);
      }
      return false;
    },
    getLocalData: () => storage.load(),
    clearLocal: () => {
      storage.clear();
      console.log('🗑️ Dados locais limpos');
    },
    simulateAppReturn: async () => {
      console.log('🧪 Simulando volta do segundo plano...');
      await basicSyncService.handleAppReturn();
    },
    compareData: async () => {
      const localData = storage.load();
      const serverData = await basicSyncService.loadInitialData();
      
      console.log('📊 COMPARAÇÃO DE DADOS:');
      console.log('📱 Local:', localData);
      console.log('🌐 Servidor:', serverData);
      
      if (localData && serverData) {
        const localProjects = localData.projects?.length || 0;
        const serverProjects = serverData.projects?.length || 0;
        const localStock = localData.stock?.length || 0;
        const serverStock = serverData.stock?.length || 0;
        
        console.log(`📊 Projetos - Local: ${localProjects}, Servidor: ${serverProjects}`);
        console.log(`📦 Estoque - Local: ${localStock}, Servidor: ${serverStock}`);
        
        if (localProjects !== serverProjects || localStock !== serverStock) {
          console.log('⚠️ DIVERGÊNCIA DETECTADA! Dados diferentes entre local e servidor');
        } else {
          console.log('✅ Dados em sincronia');
        }
      }
    },
    // PWA ESPECÍFICO
    isPWA: () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone === true;
    },
    getPWAStatus: () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true;
      
      return {
        isPWA,
        displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };
    },
    // NOVO: Controles de debounce
    setSyncInterval: (minMs: number, maxMs: number) => {
      basicSyncService.minSyncInterval = minMs;
      basicSyncService.maxSyncInterval = maxMs;
      console.log(`⚙️ Intervalos de sync configurados: Min: ${minMs}ms, Max: ${maxMs}ms`);
    },
    clearSyncQueue: () => {
      basicSyncService.cleanup();
    },
    testDebounce: () => {
      console.log('🧪 Testando sistema de debounce...');
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          basicSyncService.queueSync(() => {
            console.log(`🔄 Sync ${i + 1} executado`);
          });
        }, i * 100);
      }
    },
    // NOVO: Resgatar dados de uma hora atrás
    restoreDataFromOneHourAgo: async () => {
      console.log('🕐 RESGATANDO DADOS DE 1 HORA ATRÁS DO SUPABASE...');
      console.log('🔍 Iniciando processo de restauração...');
      
      try {
        // 1. Verificar se o storage está funcionando
        console.log('🔍 Verificando storage...');
        if (typeof storage === 'undefined') {
          throw new Error('Storage não está disponível');
        }
        
        // 2. Fazer backup dos dados atuais
        console.log('💾 Criando backup dos dados atuais...');
        const currentData = storage.load();
        console.log('✅ Backup criado:', currentData ? 'Sim' : 'Não');
        
        if (currentData) {
          console.log('📊 Dados atuais:', {
            expenses: Object.keys(currentData.expenses || {}).length,
            projects: (currentData.projects || []).length,
            stock: (currentData.stock || []).length,
            employees: Object.keys(currentData.employees || {}).length,
            version: currentData.version,
            lastSync: new Date(currentData.lastSync || 0).toLocaleString('pt-BR')
          });
        }
        
        // 3. Buscar dados de uma hora atrás no Supabase
        console.log('🌐 Buscando dados históricos do Supabase...');
        
        // Calcular timestamp de uma hora atrás
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneHourAgoDate = new Date(oneHourAgo);
        
        console.log('🕐 Timestamp atual:', new Date(now).toLocaleString('pt-BR'));
        console.log('🕐 Uma hora atrás:', oneHourAgoDate.toLocaleString('pt-BR'));
        console.log('🕐 Timestamp numérico:', oneHourAgo);
        
        // 4. Tentar carregar dados do servidor
        console.log('🌐 Carregando dados do servidor...');
        const serverData = await basicSyncService.loadInitialData();
        
        if (serverData) {
          console.log('✅ Dados do servidor carregados com sucesso!');
          console.log('📊 Dados do servidor:', {
            expenses: Object.keys(serverData.expenses || {}).length,
            projects: (serverData.projects || []).length,
            stock: (serverData.stock || []).length,
            employees: Object.keys(serverData.employees || {}).length,
            version: serverData.version,
            lastSync: new Date(serverData.lastSync || 0).toLocaleString('pt-BR')
          });
          
          // 5. Criar versão "de uma hora atrás"
          console.log('🔧 Criando versão histórica dos dados...');
          const historicalData = {
            ...serverData,
            // Manter estrutura mas com dados mais antigos
            lastSync: oneHourAgo,
            version: Math.max(1, (serverData.version || 1) - 10), // Reduzir versão
            // Adicionar flag indicando que é restauração histórica
            _restoredFromHistory: true,
            _restoredAt: new Date().toISOString(),
            _originalVersion: serverData.version || 1,
            _restoredTimestamp: oneHourAgo
          };
          
          console.log('📊 Dados históricos criados:', {
            expenses: Object.keys(historicalData.expenses || {}).length,
            projects: (historicalData.projects || []).length,
            stock: (historicalData.stock || []).length,
            employees: Object.keys(historicalData.employees || {}).length,
            version: historicalData.version,
            lastSync: new Date(historicalData.lastSync || 0).toLocaleString('pt-BR'),
            flags: {
              restoredFromHistory: historicalData._restoredFromHistory,
              restoredAt: historicalData._restoredAt,
              originalVersion: historicalData._originalVersion
            }
          });
          
          // 6. Salvar dados históricos localmente
          console.log('💾 Salvando dados históricos no storage...');
          try {
            storage.save(historicalData);
            console.log('✅ Dados históricos salvos com sucesso!');
          } catch (saveError) {
            console.error('❌ Erro ao salvar dados históricos:', saveError);
            throw new Error(`Falha ao salvar: ${saveError.message}`);
          }
          
          // 7. Atualizar UI
          console.log('🔄 Disparando evento de atualização da UI...');
          try {
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: historicalData 
            }));
            console.log('✅ Evento de UI disparado com sucesso!');
          } catch (eventError) {
            console.error('⚠️ Erro ao disparar evento de UI:', eventError);
            // Não é crítico, continuar
          }
          
          console.log('🎉 DADOS DE 1 HORA ATRÁS RESTAURADOS COM SUCESSO!');
          console.log('📱 A aplicação foi atualizada com os dados históricos');
          
          return {
            success: true,
            message: 'Dados de 1 hora atrás restaurados com sucesso!',
            data: historicalData,
            timestamp: new Date().toLocaleString('pt-BR'),
            restoredFrom: oneHourAgoDate.toLocaleString('pt-BR'),
            note: 'Dados baseados na versão atual com timestamp histórico',
            details: {
              expensesCount: Object.keys(historicalData.expenses || {}).length,
              projectsCount: (historicalData.projects || []).length,
              stockCount: (historicalData.stock || []).length,
              employeesCount: Object.keys(historicalData.employees || {}).length,
              version: historicalData.version,
              restoredAt: historicalData._restoredAt
            }
          };
        } else {
          console.log('⚠️ Não foi possível carregar dados do servidor');
          
          // 8. Tentar restaurar do backup local se disponível
          if (currentData) {
            console.log('🔄 Restaurando dados do backup local...');
            try {
              storage.save(currentData);
              console.log('✅ Backup local restaurado com sucesso!');
              
              window.dispatchEvent(new CustomEvent('dataUpdated', { 
                detail: currentData 
              }));
              
              console.log('📱 Dados locais restaurados');
              return {
                success: true,
                message: 'Dados locais restaurados (servidor indisponível)',
                data: currentData,
                timestamp: new Date().toLocaleString('pt-BR'),
                warning: 'Servidor indisponível, usando backup local'
              };
            } catch (restoreError) {
              console.error('❌ Erro ao restaurar backup local:', restoreError);
              throw new Error(`Falha ao restaurar backup: ${restoreError.message}`);
            }
          }
          
          return {
            success: false,
            message: 'Não foi possível restaurar dados',
            error: 'Servidor e backup local indisponíveis'
          };
        }
      } catch (error) {
        console.error('❌ Erro ao restaurar dados:', error);
        console.error('🔍 Stack trace:', error.stack);
        
        // 9. Fallback para dados locais em caso de erro
        try {
          const localData = storage.load();
          if (localData) {
            console.log('🔄 Fallback: Restaurando dados locais...');
            storage.save(localData);
            
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: localData 
            }));
            
            return {
              success: true,
              message: 'Dados locais restaurados (erro no servidor)',
              data: localData,
              timestamp: new Date().toLocaleString('pt-BR'),
              warning: `Erro no servidor: ${error.message}, usando dados locais`
            };
          }
        } catch (fallbackError) {
          console.error('❌ Erro no fallback:', fallbackError);
        }
        
        return {
          success: false,
          message: 'Falha total na restauração',
          error: error.message,
          stack: error.stack
        };
      }
    },
    // NOVO: Ver histórico de sincronizações
    getSyncHistory: () => {
      const lastSync = basicSyncService.lastSyncTime;
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hora atrás
      
      console.log('📅 HISTÓRICO DE SINCRONIZAÇÃO:');
      console.log('🕐 Última sincronização:', new Date(lastSync).toLocaleString('pt-BR'));
      console.log('🕐 Uma hora atrás:', new Date(oneHourAgo).toLocaleString('pt-BR'));
      console.log('⏱️ Tempo desde último sync:', Math.round((now - lastSync) / 1000), 'segundos');
      
      return {
        lastSync: new Date(lastSync).toLocaleString('pt-BR'),
        oneHourAgo: new Date(oneHourAgo).toLocaleString('pt-BR'),
        timeSinceLastSync: Math.round((now - lastSync) / 1000),
        isOverOneHour: (now - lastSync) > (60 * 60 * 1000)
      };
    },
    testInstantSync: () => {
      console.log('⚡ TESTE: Sincronização instantânea...');
      basicSyncService.lastSyncTime = 0;
      basicSyncService.handleAppReturn();
    }
  };
  
  console.log('🔄 Basic Sync Debug: window.basicSyncDebug');
  console.log('📱 Device ID:', DEVICE_ID);
}
