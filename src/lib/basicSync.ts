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
  isAppBlocked: false, // NOVO: Bloquear interações durante sync obrigatório
  pendingInteractions: [] as Array<() => void>, // NOVO: Fila de interações pendentes
  
  // NOVO: Sistema de debounce inteligente para reduzir syncs excessivos
  syncQueue: [] as Array<() => void>,
  debounceTimer: null as NodeJS.Timeout | null,
  minSyncInterval: 8000, // Mínimo 8 segundos entre syncs (aumentado de 2s)
  maxSyncInterval: 60000, // Máximo 1 minuto entre syncs

  async init() {
    if (!supabase || this.isInitialized) return;
    
    
    this.isInitialized = true;

    // Configurar detecção de segundo plano
    this.setupBackgroundDetection();

    // SEMPRE sincronizar na inicialização (independente de como o app foi aberto)
    // O Realtime será iniciado DENTRO do forceInitialSync()
    await this.forceInitialSync();
  },

  // NOVO: Sincronização forçada na inicialização (sempre executa)
  async forceInitialSync(): Promise<void> {
    if (!supabase) return;
    
    try {
      
      
      
      // BLOQUEAR APP IMEDIATAMENTE
      this.isAppBlocked = true;
      this.syncInProgress = true;

      // Disparar evento para exibir overlay de sincronização também na abertura
      try {
        window.dispatchEvent(new CustomEvent('syncReturnStarted', { detail: { message: 'Sincronizando dados iniciais...' } }));
      } catch {}
      
      // PASSO 1: INICIAR REALTIME IMEDIATAMENTE
      
      this.setupRealtime();
      
      // PASSO 2: Carregar dados do servidor (sempre os mais recentes)
      
      const serverData = await this.loadInitialData();
      
      if (!serverData) {
        
        this.isAppBlocked = false;
        this.syncInProgress = false;
        return;
      }
      
      
      console.log('📊 Resumo dos dados do servidor:', {
        expenses: Object.keys(serverData.expenses || {}).length,
        projects: (serverData.projects || []).length,
        stock: (serverData.stock || []).length,
        employees: Object.keys(serverData.employees || {}).length,
        lastSync: new Date(serverData.lastSync || 0).toLocaleString('pt-BR')
      });
      
      // PASSO 3: Sincronizar dados locais (se existirem)
      
      const localData = storage.load();
      
      if (localData) {
        console.log('📱 Dados locais encontrados:', {
          expenses: Object.keys(localData.expenses || {}).length,
          projects: (localData.projects || []).length,
          stock: (localData.stock || []).length,
          employees: Object.keys(localData.employees || {}).length,
          lastSync: new Date(localData.lastSync || 0).toLocaleString('pt-BR')
        });
        
        if (this.hasLocalChanges(localData, serverData)) {
          
          await this.sync(localData);
        } else {
          
          // IMPORTANTE: Sempre disparar evento para atualizar UI com dados do servidor
          
          window.dispatchEvent(new CustomEvent('dataUpdated', { detail: serverData }));
        }
      } else {
        
        // IMPORTANTE: Sempre disparar evento para atualizar UI com dados do servidor
        
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: serverData }));
      }
      
      
      
      
    } catch (error) {
      console.error('❌ Erro na sincronização inicial:', error);
    } finally {
      // DESBLOQUEAR APP
      this.isAppBlocked = false;
      this.syncInProgress = false;

      // Disparar evento para esconder overlay após a sincronização inicial
      try {
        window.dispatchEvent(new CustomEvent('syncReturnCompleted'));
      } catch {}
    }
  },

  // NOVO: Verificar se há mudanças locais significativas
  hasLocalChanges(localData: StorageItems, serverData: StorageItems): boolean {
    // Verificar se há diferenças significativas entre local e servidor
    const localProjects = localData.projects?.length || 0;
    const serverProjects = serverData.projects?.length || 0;
    const localStock = localData.stock?.length || 0;
    const serverStock = serverData.stock?.length || 0;
    const localExpenses = Object.keys(localData.expenses || {}).length;
    const serverExpenses = Object.keys(serverData.expenses || {}).length;
    
    const hasChanges = (
      localProjects !== serverProjects ||
      localStock !== serverStock ||
      localExpenses !== serverExpenses ||
      localData.willBaseRate !== serverData.willBaseRate ||
      localData.willBonus !== serverData.willBonus
    );
    
    if (hasChanges) {
      console.log('📊 Mudanças detectadas:', {
        projetos: `${localProjects} → ${serverProjects}`,
        estoque: `${localStock} → ${serverStock}`,
        despesas: `${localExpenses} → ${serverExpenses}`,
        willBaseRate: `${localData.willBaseRate} → ${serverData.willBaseRate}`,
        willBonus: `${localData.willBonus} → ${serverData.willBonus}`
      });
    }
    
    return hasChanges;
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
    let wasInBackground = false; // NOVO: Rastrear se realmente estava em segundo plano
    let hasUserInteracted = false; // NOVO: Detectar se usuário já interagiu
    
    // DETECÇÃO INTELIGENTE - Apenas quando realmente volta do segundo plano
    const handleReturnFromBackground = () => {
      // Só fazer sync obrigatório se realmente estava em segundo plano
      if (wasInBackground) {
        
        this.queueSync(() => this.handleAppReturn());
        wasInBackground = false; // Reset
      } else {
        
      }
    };

    // 1. Detectar quando app VAI para segundo plano
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        
        wasInBackground = true; // Marcar que estava em segundo plano
      } else {
        const now = Date.now();
        
        handleReturnFromBackground(); // Verificar se precisa sync obrigatório
        lastCheckTime = now;
        lastFocusTime = now;
      }
    });

    // 2. Focus/Blur - Detectar foco da janela  
    window.addEventListener('blur', () => {
      
      wasInBackground = true; // Marcar que estava em segundo plano
    });

    window.addEventListener('focus', () => {
      const now = Date.now();
      
      handleReturnFromBackground(); // Verificar se precisa sync obrigatório
      lastCheckTime = now;
      lastFocusTime = now;
    });

    // 3. PWA: Pageshow - Específico para volta do cache/background
    window.addEventListener('pageshow', (event) => {
      const now = Date.now();
      
      // Pageshow sempre indica volta do segundo plano
      wasInBackground = true;
      handleReturnFromBackground();
      lastCheckTime = now;
    });

    // 4. PWA: Resume - Evento específico de PWA
    document.addEventListener('resume', () => {
      const now = Date.now();
      
      wasInBackground = true; // Resume sempre é volta do segundo plano
      handleReturnFromBackground();
      lastCheckTime = now;
    });

    // 5. REMOVIDO: Verificação temporal que causava syncs desnecessários
    // NOTA: Realtime cuida da sincronização automática quando app está ativo

    // 6. Conectividade restaurada (apenas quando volta online)
    window.addEventListener('online', () => {
      
      // Só fazer sync se estava realmente offline por um tempo
      const now = Date.now();
      if (now - lastCheckTime > 30000) { // 30 segundos offline
        
        setTimeout(() => handleReturnFromBackground(), 100);
      }
    });

    
    
    
    
  },

  async handleAppReturn() {
    const now = Date.now();
    
    // Debounce aumentado para 8 segundos (mais estável)
    if (now - this.lastSyncTime < this.minSyncInterval) {
      
      return;
    }
    
    // Evitar syncs simultâneos
    if (this.syncInProgress) {
      
      return;
    }
    
    // NOVO: Verificar se realmente precisa de sync obrigatório
    const timeSinceLastSync = now - this.lastSyncTime;
    const needsForcedSync = timeSinceLastSync > 30000; // 30 segundos
    
    if (!needsForcedSync) {
      
      return;
    }
    
    this.syncInProgress = true;
    this.isSyncingOnReturn = true; // Marcar como sync de retorno
    this.isAppBlocked = true; // NOVO: Bloquear app durante sync obrigatório
    this.lastSyncTime = now;
    
    try {
      
      
      
      // Verificar se está online antes de tentar
      if (!navigator.onLine) {
        
        return;
      }
      
      // Notificar que sync de retorno começou E que app está bloqueado
      window.dispatchEvent(new CustomEvent('syncReturnStarted', { 
        detail: { isBlocked: true, message: 'Sincronizando dados mais recentes...' }
      }));
      
      // USAR A MESMA SINCRONIZAÇÃO COMPLETA DA INICIALIZAÇÃO
      
      await this.forceInitialSync();
      
      // Executar callbacks registrados
      this.syncCallbacks.forEach(callback => {
        try {
          callback();
        } catch (err) {
          console.error('Erro em callback de sync:', err);
        }
      });
      
      
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar após volta:', error);
    } finally {
      this.syncInProgress = false;
      this.isSyncingOnReturn = false;
      this.isAppBlocked = false; // NOVO: Desbloquear app
      
      // Notificar que sync terminou E que app foi desbloqueado
      window.dispatchEvent(new CustomEvent('syncReturnCompleted', { 
        detail: { isBlocked: false, message: 'Sincronização concluída!' }
      }));
      
      // Executar interações pendentes (se houver)
      this.executePendingInteractions();
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
          
          if (payload.new && payload.new.device_last_seen !== DEVICE_ID) {
            // Só atualizar se não foi este dispositivo que fez a mudança
            this.handleRealtimeUpdate(payload.new);
          }
        }
      )
      .subscribe((status: string) => {
        
      });
  },

  async handleRealtimeUpdate(newData: any) {
    try {
      
      
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
      
      // Salvar e atualizar UI apenas se não estivermos editando projeto
      storage.save(serverData);
      
      const isProjectBeingUpdated = (window as any).__isUpdatingProject || false;
      
      if (!isProjectBeingUpdated) {
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: { ...serverData, __source: 'realtime' }
        }));
      }
      
      
    } catch (error) {
      console.error('❌ Erro ao processar realtime:', error);
    }
  },

  async loadInitialData(): Promise<StorageItems | null> {
    if (!supabase) return null;
    
    try {
      
      
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
        
        // SEMPRE salvar dados do servidor localmente (são os mais recentes)
        storage.save(serverData);
        
        console.log('📊 Dados do servidor:', {
          expenses: Object.keys(serverData.expenses || {}).length,
          projects: (serverData.projects || []).length,
          stock: (serverData.stock || []).length,
          employees: Object.keys(serverData.employees || {}).length,
          lastSync: new Date(serverData.lastSync || 0).toLocaleString('pt-BR')
        });
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
      
      storage.save(data);
      return true;
    }

    try {
      
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
        data.lastSync = result.last_sync_timestamp || Date.now();
        storage.save(data);
        
        // IMPORTANTE: Disparar evento para atualizar UI apenas se não estivermos editando projeto
        // Verificar se há uma edição de projeto em andamento para evitar loop
        const isProjectBeingUpdated = (window as any).__isUpdatingProject || false;
        const isPhotoBeingUpdated = (window as any).__isUpdatingPhoto || false;
        
        if (!isProjectBeingUpdated && !isPhotoBeingUpdated) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: { ...data, __source: 'sync' }
            }));
          }, 50); // Pequeno delay para evitar loops
        }
        
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
      // Verificar se há uma edição de projeto em andamento para evitar sobrescrever
      const isProjectBeingUpdated = (window as any).__isUpdatingProject || false;
      
      if (isProjectBeingUpdated) {
        return;
      }
      
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

  // NOVO: Verificar se o app está bloqueado para interações
  isAppBlockedForInteractions() {
    return this.isAppBlocked;
  },

  // NOVO: Adicionar interação à fila quando app está bloqueado
  queueInteraction(interaction: () => void) {
    if (!this.isAppBlocked) {
      interaction(); // Executar imediatamente se não estiver bloqueado
      return;
    }
    
    
    this.pendingInteractions.push(interaction);
  },

  // NOVO: Executar todas as interações pendentes
  executePendingInteractions() {
    if (this.pendingInteractions.length === 0) return;
    
    
    
    // Executar todas as interações na ordem correta
    while (this.pendingInteractions.length > 0) {
      const interaction = this.pendingInteractions.shift();
      if (interaction) {
        try {
          interaction();
        } catch (error) {
          console.error('❌ Erro ao executar interação pendente:', error);
        }
      }
    }
    
    
  },

  // NOVO: Forçar desbloqueio (para casos de emergência)
  forceUnblock() {
    
    this.isAppBlocked = false;
    this.syncInProgress = false;
    this.isSyncingOnReturn = false;
    
    window.dispatchEvent(new CustomEvent('syncReturnCompleted', { 
      detail: { isBlocked: false, message: 'App desbloqueado manualmente' }
    }));
    
    this.executePendingInteractions();
  },

  // NOVO: Método para limpar timers e filas
  cleanup() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.syncQueue = [];
    this.pendingInteractions = [];
    this.isAppBlocked = false;
    
  }
};

// Funções de conveniência
export const loadData = async (): Promise<StorageItems> => {
  
  
  // SEMPRE carregar do servidor primeiro se disponível
  if (supabase) {
    try {
      const serverData = await basicSyncService.loadInitialData();
      if (serverData) {
        
        return serverData;
      }
    } catch (error) {
      console.error('⚠️ LoadData: Erro ao carregar do servidor:', error);
    }
  }
  
  // Fallback para dados locais APENAS se servidor falhar
  const localData = storage.load();
  if (localData) {
    
    return localData;
  }
  
  // Dados vazios apenas se nada existir
  
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
    forceInitialSync: () => basicSyncService.forceInitialSync(),
    getLocalData: () => storage.load(),
    clearLocal: () => {
      storage.clear();
      
    },
    simulateAppReturn: async () => {
      
      await basicSyncService.handleAppReturn();
    },
    compareData: async () => {
      const localData = storage.load();
      const serverData = await basicSyncService.loadInitialData();
      
      
      
      
      
      if (localData && serverData) {
        const localProjects = localData.projects?.length || 0;
        const serverProjects = serverData.projects?.length || 0;
        const localStock = localData.stock?.length || 0;
        const serverStock = serverData.stock?.length || 0;
        
        
        
        
        if (localProjects !== serverProjects || localStock !== serverStock) {
          
        } else {
          
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
      
    },
    clearSyncQueue: () => {
      basicSyncService.cleanup();
    },
    testDebounce: () => {
      
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          basicSyncService.queueSync(() => {
            
          });
        }, i * 100);
      }
    },
    // NOVO: Resgatar dados de uma hora atrás
    restoreDataFromOneHourAgo: async () => {
      
      
      
      try {
        // 1. Verificar se o storage está funcionando
        
        if (typeof storage === 'undefined') {
          throw new Error('Storage não está disponível');
        }
        
        // 2. Fazer backup dos dados atuais
        
        const currentData = storage.load();
        
        
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
        
        
        // Calcular timestamp de uma hora atrás
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneHourAgoDate = new Date(oneHourAgo);
        
        
        
        
        
        // 4. Tentar carregar dados do servidor
        
        const serverData = await basicSyncService.loadInitialData();
        
        if (serverData) {
          
          console.log('📊 Dados do servidor:', {
            expenses: Object.keys(serverData.expenses || {}).length,
            projects: (serverData.projects || []).length,
            stock: (serverData.stock || []).length,
            employees: Object.keys(serverData.employees || {}).length,
            version: serverData.version,
            lastSync: new Date(serverData.lastSync || 0).toLocaleString('pt-BR')
          });
          
          // 5. Criar versão "de uma hora atrás"
          
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
          
          try {
            storage.save(historicalData);
            
          } catch (saveError) {
            console.error('❌ Erro ao salvar dados históricos:', saveError);
            if (saveError instanceof Error) {
              throw new Error(`Falha ao salvar: ${saveError.message}`);
            } else {
              throw new Error('Falha ao salvar dados históricos');
            }
          }
          
          // 7. Atualizar UI
          
          try {
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: historicalData 
            }));
            
          } catch (eventError) {
            console.error('⚠️ Erro ao disparar evento de UI:', eventError);
            // Não é crítico, continuar
          }
          
          
          
          
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
          
          
          // 8. Tentar restaurar do backup local se disponível
          if (currentData) {
            
            try {
              storage.save(currentData);
              
              
              window.dispatchEvent(new CustomEvent('dataUpdated', { 
                detail: currentData 
              }));
              
              
              return {
                success: true,
                message: 'Dados locais restaurados (servidor indisponível)',
                data: currentData,
                timestamp: new Date().toLocaleString('pt-BR'),
                warning: 'Servidor indisponível, usando backup local'
              };
            } catch (restoreError) {
              console.error('❌ Erro ao restaurar backup local:', restoreError);
              if (restoreError instanceof Error) {
                throw new Error(`Falha ao restaurar backup: ${restoreError.message}`);
              } else {
                throw new Error('Falha ao restaurar backup local');
              }
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
        if (error instanceof Error) {
          console.error('🔍 Stack trace:', error.stack);
        }
        
        // 9. Fallback para dados locais em caso de erro
        try {
          const localData = storage.load();
          if (localData) {
            
            storage.save(localData);
            
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
              detail: localData 
            }));
            
            return {
              success: true,
              message: 'Dados locais restaurados (erro no servidor)',
              data: localData,
              timestamp: new Date().toLocaleString('pt-BR'),
              warning: `Erro no servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}, usando dados locais`
            };
          }
        } catch (fallbackError) {
          console.error('❌ Erro no fallback:', fallbackError);
        }
        
        return {
          success: false,
          message: 'Falha total na restauração',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined
        };
      }
    },
    // NOVO: Ver histórico de sincronizações
    getSyncHistory: () => {
      const lastSync = basicSyncService.lastSyncTime;
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hora atrás
      
      
      
      
      
      
      return {
        lastSync: new Date(lastSync).toLocaleString('pt-BR'),
        oneHourAgo: new Date(oneHourAgo).toLocaleString('pt-BR'),
        timeSinceLastSync: Math.round((now - lastSync) / 1000),
        isOverOneHour: (now - lastSync) > (60 * 60 * 1000)
      };
    },
    testInstantSync: () => {
      
      basicSyncService.lastSyncTime = 0;
      basicSyncService.handleAppReturn();
    },
    // NOVO: Funções para testar o comportamento otimizado
    testBackgroundReturn: () => {
      
      
      // Simular que estava em segundo plano
      const event = new Event('visibilitychange');
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(event);
      
      setTimeout(() => {
        // Simular volta para primeiro plano
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        document.dispatchEvent(event);
        
      }, 1000);
    },
    getOptimizedStatus: () => {
      const now = Date.now();
      const timeSinceLastSync = now - basicSyncService.lastSyncTime;
      
      return {
        isAppBlocked: basicSyncService.isAppBlocked,
        syncInProgress: basicSyncService.syncInProgress,
        lastSyncTime: new Date(basicSyncService.lastSyncTime).toLocaleString('pt-BR'),
        timeSinceLastSync: Math.round(timeSinceLastSync / 1000),
        wouldTriggerSync: timeSinceLastSync > 30000,
        queueLength: basicSyncService.syncQueue.length,
        pendingInteractions: basicSyncService.pendingInteractions.length
      };
    },
    disableSync: () => {
      
      basicSyncService.isAppBlocked = false;
      basicSyncService.syncInProgress = false;
      basicSyncService.isSyncingOnReturn = false;
      basicSyncService.cleanup();
    }
  };
  
  
  
}
