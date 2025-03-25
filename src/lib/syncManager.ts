import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Identificador único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// ID FIXO compartilhado por todas as instalações do app
const SHARED_UUID = "ce764a91-58e0-4c3d-a821-b52b16ca3e7c";

// Estrutura para manter versões
interface SyncVersion {
  timestamp: number;
  checksum: string;
  session_id: string;
}

// Estrutura para controle de item
interface ItemChange {
  id: string;
  type: string; // 'expense', 'project', 'stock', 'employee'
  action: string; // 'create', 'update', 'delete'
  data: any;
  timestamp: number;
  session_id: string;
  applied: boolean;
}

// Armazenamento local para mudanças pendentes
let pendingChanges: ItemChange[] = [];

// Carrega pendentes do localStorage
const loadPendingChanges = () => {
  try {
    const saved = localStorage.getItem('pendingChanges');
    pendingChanges = saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Erro ao carregar mudanças pendentes:', error);
    pendingChanges = [];
  }
};

// Salva pendentes no localStorage
const savePendingChanges = () => {
  try {
    localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
  } catch (error) {
    console.error('Erro ao salvar mudanças pendentes:', error);
  }
};

// Gera checksum dos dados para comparar versões
const generateChecksum = (data: StorageItems): string => {
  try {
    return btoa(
      JSON.stringify({
        e: Object.keys(data.expenses || {}).length,
        p: (data.projects || []).length,
        s: (data.stock || []).length,
        em: Object.keys(data.employees || {}).length,
        t: new Date().getTime(),
      })
    );
  } catch (error) {
    console.error('Erro ao gerar checksum:', error);
    return `error-${new Date().getTime()}`;
  }
};

// Função para verificar se o app está retornando do segundo plano
let lastActiveTime = Date.now();
let isInBackground = false;

// Adicionar listeners para detectar quando o app está em segundo plano
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    isInBackground = true;
    lastActiveTime = Date.now();
  } else if (document.visibilityState === 'visible') {
    const timeInBackground = Date.now() - lastActiveTime;
    // Se esteve em segundo plano por mais de 1 segundo
    if (isInBackground && timeInBackground > 1000) {
      console.log(`App retornou do segundo plano após ${timeInBackground}ms`);
      // Força uma sincronização quando o app retorna do segundo plano
      syncManager.syncNow();
    }
    isInBackground = false;
  }
});

// Verifica e agrupa mudanças para o mesmo item
const consolidateChanges = (changes: ItemChange[]): ItemChange[] => {
  const itemMap = new Map<string, ItemChange>();
  
  // Agrupar por item + tipo
  changes.forEach(change => {
    const key = `${change.type}_${change.id}`;
    const existing = itemMap.get(key);
    
    // Se mudança mais recente ou não existir, usa esta
    if (!existing || change.timestamp > existing.timestamp) {
      itemMap.set(key, change);
    }
  });
  
  return Array.from(itemMap.values());
};

// Verifica e aplica mudanças do servidor para dados locais
const applyServerChanges = (localData: StorageItems, serverChanges: ItemChange[]): StorageItems => {
  // Clone profundo dos dados locais para não modificar o original
  const updatedData: StorageItems = JSON.parse(JSON.stringify(localData));
  
  // Aplicar cada mudança individual
  serverChanges.forEach(change => {
    try {
      switch (change.type) {
        case 'expense':
          if (change.action === 'delete') {
            if (updatedData.expenses && updatedData.expenses[change.id]) {
              delete updatedData.expenses[change.id];
            }
          } else {
            if (!updatedData.expenses) updatedData.expenses = {};
            updatedData.expenses[change.id] = change.data;
          }
          break;
          
        case 'project':
          if (change.action === 'delete') {
            updatedData.projects = (updatedData.projects || []).filter(p => p.id !== change.id);
          } else {
            if (!updatedData.projects) updatedData.projects = [];
            const index = updatedData.projects.findIndex(p => p.id === change.id);
            if (index >= 0) {
              updatedData.projects[index] = change.data;
            } else {
              updatedData.projects.push(change.data);
            }
          }
          break;
          
        case 'stock':
          if (change.action === 'delete') {
            updatedData.stock = (updatedData.stock || []).filter(s => s.id !== change.id);
          } else {
            if (!updatedData.stock) updatedData.stock = [];
            const index = updatedData.stock.findIndex(s => s.id === change.id);
            if (index >= 0) {
              updatedData.stock[index] = change.data;
            } else {
              updatedData.stock.push(change.data);
            }
          }
          break;
          
        case 'employee':
          if (change.action === 'delete') {
            if (updatedData.employees && updatedData.employees[change.id]) {
              delete updatedData.employees[change.id];
            }
          } else {
            if (!updatedData.employees) updatedData.employees = {};
            updatedData.employees[change.id] = change.data;
          }
          break;
          
        default:
          console.warn('Tipo de mudança desconhecido:', change.type);
      }
    } catch (error) {
      console.error('Erro ao aplicar mudança:', error, change);
    }
  });
  
  return updatedData;
};

// Gerenciador de sincronização com controle de conflitos
export const syncManager = {
  channel: null as RealtimeChannel | null,
  isInitialized: false,
  lastSyncTimestamp: 0,
  
  // Inicializa sistema de sincronização
  init() {
    if (!supabase || this.isInitialized) return;
    console.log('Inicializando gerenciador de sincronização com ID de sessão:', SESSION_ID);
    
    this.isInitialized = true;
    loadPendingChanges();
    
    // Limpar inscrição anterior se existir
    if (this.channel) {
      this.channel.unsubscribe();
    }
    
    // Inscrever na tabela item_changes para receber atualizações em tempo real
    this.channel = supabase
      .channel('item_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public',
          table: 'item_changes' 
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.new && payload.new.session_id !== SESSION_ID) {
            console.log('Mudança remota detectada:', payload.new);
            this.handleRemoteChange(payload.new);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Status da inscrição do canal de mudanças:', status);
      });
      
    // Verificar e aplicar mudanças pendentes a cada 10 segundos
    setInterval(() => {
      if (pendingChanges.length > 0) {
        console.log(`Verificando ${pendingChanges.length} mudanças pendentes...`);
        this.processPendingChanges();
      }
    }, 10000);
  },
  
  // Processa uma mudança remota recebida via realtime
  async handleRemoteChange(change: any) {
    try {
      // Ignorar mudanças feitas por esta sessão
      if (change.session_id === SESSION_ID) return;
      
      // Carregar dados locais
      const localData = storage.load();
      if (!localData) return;
      
      // Converter para o formato de mudança de item
      const itemChange: ItemChange = {
        id: change.item_id,
        type: change.item_type,
        action: change.change_type,
        data: change.data,
        timestamp: change.timestamp,
        session_id: change.session_id,
        applied: false
      };
      
      // Criar versão atualizada dos dados aplicando mudança
      const updatedData = applyServerChanges(localData, [itemChange]);
      
      // Salvar localmente
      storage.save(updatedData);
      
      // Notificar a UI
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: updatedData 
      }));
      
      console.log('Mudança remota aplicada com sucesso:', itemChange);
    } catch (error) {
      console.error('Erro ao processar mudança remota:', error);
    }
  },
  
  // Registra uma mudança local
  async registerChange(type: string, action: string, id: string, data: any) {
    try {
      const timestamp = Date.now();
      
      // Criar objeto de mudança
      const change: ItemChange = {
        id,
        type,
        action,
        data,
        timestamp,
        session_id: SESSION_ID,
        applied: false
      };
      
      // Adicionar à lista de pendentes
      pendingChanges.push(change);
      savePendingChanges();
      
      // Tentar aplicar imediatamente se possível
      this.processPendingChanges();
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar mudança:', error);
      return false;
    }
  },
  
  // Processa mudanças pendentes
  async processPendingChanges() {
    if (!supabase || pendingChanges.length === 0) return;
    
    try {
      // Ordenar por timestamp e consolidar (eliminar duplicatas)
      const changes = consolidateChanges(pendingChanges.sort((a, b) => a.timestamp - b.timestamp));
      
      // Processar cada mudança
      for (const change of changes) {
        if (change.applied) continue;
        
        // Enviar para o servidor
        const { error } = await supabase.from('item_changes').insert({
          id: `${change.id}_${change.timestamp}`,
          item_id: change.id,
          item_type: change.type,
          change_type: change.action,
          data: change.data,
          timestamp: change.timestamp,
          session_id: SESSION_ID,
          list_name: null
        });
        
        if (error) {
          console.error('Erro ao enviar mudança para o servidor:', error);
        } else {
          console.log('Mudança enviada com sucesso:', change);
          change.applied = true;
        }
      }
      
      // Remover mudanças aplicadas
      pendingChanges = pendingChanges.filter(change => !change.applied);
      savePendingChanges();
    } catch (error) {
      console.error('Erro ao processar mudanças pendentes:', error);
    }
  },
  
  // Sincroniza dados imediatamente (usado ao retornar do segundo plano)
  async syncNow() {
    if (!supabase) return false;
    
    try {
      console.log('Iniciando sincronização forçada...');
      
      // Processar mudanças pendentes primeiro
      await this.processPendingChanges();
      
      const localData = storage.load();
      if (!localData) return false;
      
      // Buscar mudanças do servidor desde a última sincronização
      const { data: changes, error } = await supabase
        .from('item_changes')
        .select('*')
        .gt('timestamp', this.lastSyncTimestamp)
        .not('session_id', 'eq', SESSION_ID)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar mudanças do servidor:', error);
        return false;
      }
      
      if (changes && changes.length > 0) {
        console.log(`Recebidas ${changes.length} mudanças do servidor`);
        
        // Converter para o formato ItemChange
        const itemChanges: ItemChange[] = changes.map(c => ({
          id: c.item_id,
          type: c.item_type,
          action: c.change_type,
          data: c.data,
          timestamp: c.timestamp,
          session_id: c.session_id,
          applied: false
        }));
        
        // Aplicar mudanças do servidor
        const updatedData = applyServerChanges(localData, itemChanges);
        
        // Salvar localmente
        storage.save(updatedData);
        
        // Notificar a UI
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: updatedData 
        }));
        
        console.log('Sincronização forçada concluída com sucesso');
      } else {
        console.log('Não há mudanças para sincronizar');
      }
      
      // Atualizar timestamp de última sincronização
      this.lastSyncTimestamp = Date.now();
      return true;
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      return false;
    }
  }
};

// Função auxiliar para registrar diferentes tipos de mudanças
export const registerDataChange = {
  expense: (action: string, id: string, data: Expense) => 
    syncManager.registerChange('expense', action, id, data),
    
  project: (action: string, id: string, data: Project) => 
    syncManager.registerChange('project', action, id, data),
    
  stock: (action: string, id: string, data: StockItem) => 
    syncManager.registerChange('stock', action, id, data),
    
  employee: (action: string, id: string, data: Employee) => 
    syncManager.registerChange('employee', action, id, data)
};

// Inicializar ao importar o módulo
loadPendingChanges(); 