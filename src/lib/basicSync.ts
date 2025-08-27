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

  setupBackgroundDetection() {
    // Detectar quando app volta do segundo plano (navegador)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📱 App voltou (visibilitychange) - verificando atualizações...');
        this.handleAppReturn();
      }
    });

    // Detectar focus da janela (navegador)
    window.addEventListener('focus', () => {
      console.log('🎯 App recebeu foco (focus) - verificando atualizações...');
      this.handleAppReturn();
    });

    // PWA: Detectar quando app volta do background (específico para PWA)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        console.log('📱 PWA: App voltou do cache (pageshow) - verificando atualizações...');
        this.handleAppReturn();
      }
    });

    // PWA: Detectar resume do app
    document.addEventListener('resume', () => {
      console.log('📱 PWA: App resumed (resume) - verificando atualizações...');
      this.handleAppReturn();
    });

    // PWA: Verificação adicional a cada foco (mais agressiva para PWA)
    let lastCheckTime = Date.now();
    window.addEventListener('focus', () => {
      const now = Date.now();
      // Se passou mais de 30 segundos desde a última verificação
      if (now - lastCheckTime > 30000) {
        console.log('📱 PWA: Verificação temporal (30s+) - atualizando...');
        this.handleAppReturn();
        lastCheckTime = now;
      }
    });

    // PWA: Verificação periódica quando app está ativo (para casos extremos)
    setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        const now = Date.now();
        if (now - lastCheckTime > 120000) { // 2 minutos
          console.log('📱 PWA: Verificação periódica (2min) - sincronizando...');
          this.handleAppReturn();
          lastCheckTime = now;
        }
      }
    }, 60000); // Verifica a cada 1 minuto
  },

  async handleAppReturn() {
    const now = Date.now();
    
    // Debounce: evitar sync muito frequente (mínimo 5 segundos)
    if (now - this.lastSyncTime < 5000) {
      console.log('⏭️ Sync recente, ignorando...');
      return;
    }
    
    // Evitar syncs simultâneos
    if (this.syncInProgress) {
      console.log('🔄 Sync já em progresso, ignorando...');
      return;
    }
    
    this.syncInProgress = true;
    this.lastSyncTime = now;
    
    try {
      console.log('🔄 Sincronizando dados após volta (PWA-safe)...');
      
      // Verificar se está online antes de tentar
      if (!navigator.onLine) {
        console.log('📡 Offline - pulando sync');
        return;
      }
      
      // SEMPRE carregar dados mais recentes do servidor
      const serverData = await this.loadInitialData();
      
      if (serverData) {
        console.log('✅ Dados atualizados do servidor após volta');
        // Disparar evento para atualizar UI
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: serverData 
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar após volta:', error);
    } finally {
      this.syncInProgress = false;
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
        
        console.log('✅ Dados carregados do servidor');
        storage.save(serverData);
        return serverData;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
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
      channelState: basicSyncService.channel?.state
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
             window.navigator.standalone === true;
    },
    getPWAInfo: () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone === true;
      console.log('📱 PWA Info:');
      console.log('- É PWA:', isPWA);
      console.log('- Online:', navigator.onLine);
      console.log('- Document hidden:', document.hidden);
      console.log('- Last sync:', new Date(basicSyncService.lastSyncTime).toLocaleTimeString());
      console.log('- Sync in progress:', basicSyncService.syncInProgress);
      return { isPWA, online: navigator.onLine, hidden: document.hidden };
    },
    forcePWASync: async () => {
      console.log('🚀 Forçando sync PWA (ignorando debounce)...');
      basicSyncService.lastSyncTime = 0; // Reset debounce
      basicSyncService.syncInProgress = false; // Reset lock
      await basicSyncService.handleAppReturn();
    }
  };
  
  console.log('🔄 Basic Sync Debug: window.basicSyncDebug');
  console.log('📱 Device ID:', DEVICE_ID);
}
