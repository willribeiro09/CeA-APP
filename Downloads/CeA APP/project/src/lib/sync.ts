import { supabase } from './supabase';
import { StorageItems, Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Identificador único para esta sessão do navegador
const SESSION_ID = Math.random().toString(36).substring(2, 15);
console.log('ID da sessão:', SESSION_ID);

// ID FIXO compartilhado por todas as instalações do app
// Usando um UUID fixo para garantir que todos os usuários vejam os mesmos dados
const SHARED_UUID = "ce764a91-58e0-4c3d-a821-b52b16ca3e7c";
console.log('UUID compartilhado para sincronização:', SHARED_UUID);

// Constantes para tipos de alteração
export const CHANGE_TYPE = {
  ADD: 'add' as const,
  UPDATE: 'update' as const,
  DELETE: 'delete' as const
};

// Tipo para os valores de tipo de alteração
type ChangeTypeValue = typeof CHANGE_TYPE[keyof typeof CHANGE_TYPE];

// Interface para eventos de alteração
interface ChangeEvent {
  id: string; // ID único do evento
  itemId: string; // ID do item alterado
  itemType: 'expense' | 'project' | 'stock' | 'employee' | 'willSettings';
  changeType: ChangeTypeValue;
  data: any; // Dados do item
  timestamp: number;
  sessionId: string;
  listName?: string; // Nome da lista para expense e employee
}

// Variável para controlar o último timestamp de mudança de visibilidade
let lastVisibilityChange = 0;

// Função para garantir que os valores do Will estejam definidos
const ensureWillValues = (data: any): { willBaseRate: number, willBonus: number } => {
  return {
    willBaseRate: typeof data.willBaseRate === 'number' ? data.willBaseRate : 200,
    willBonus: typeof data.willBonus === 'number' ? data.willBonus : 0
  };
};

// Função para gerar ID único para eventos
const generateChangeId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const syncService = {
  channelChanges: null as RealtimeChannel | null,
  channelData: null as RealtimeChannel | null,
  isInitialized: false,
  lastProcessedChangeId: '',
  pendingChanges: [] as ChangeEvent[],

  init() {
    if (!supabase || this.isInitialized) return;
    
    console.log('Inicializando serviço de sincronização com ID:', SESSION_ID);
    this.isInitialized = true;

    // Configurar detecção de visibilidade do documento
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Configurar canais de sincronização
    this.setupChangesChannel();
    this.setupDataChannel();
    
    // Forçar sincronização imediata ao inicializar
    this.forceSyncNow();
  },
  
  // Manipulador de eventos de visibilidade do documento
  handleVisibilityChange() {
    const now = Date.now();
    
    // Evitar múltiplas chamadas em curto período
    if (now - lastVisibilityChange < 1000) {
      return;
    }
    
    lastVisibilityChange = now;
    
    if (document.visibilityState === 'visible') {
      console.log('Documento voltou a ficar visível, forçando sincronização...');
      this.forceSyncNow();
    }
  },
  
  // Configurar canal para eventos de alterações específicas
  setupChangesChannel() {
    if (!supabase) {
      console.warn('Supabase não configurado, não é possível configurar canal de alterações');
      return;
    }
    
    // Limpar inscrição anterior se existir
    if (this.channelChanges) {
      this.channelChanges.unsubscribe();
    }
    
    // Criar nova inscrição para eventos de alteração
    this.channelChanges = supabase
      .channel('changes_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'item_changes' 
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.new) {
            this.processChangeEvent(payload.new as ChangeEvent);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Status da inscrição do canal de alterações:', status);
      });
  },
  
  // Configurar canal para dados completos (manter para compatibilidade)
  setupDataChannel() {
    if (!supabase) {
      console.warn('Supabase não configurado, não é possível configurar canal de dados');
      return;
    }
    
    // Limpar inscrição anterior se existir
    if (this.channelData) {
      this.channelData.unsubscribe();
    }
    
    // Criar nova inscrição para dados completos
    this.channelData = supabase
      .channel('data_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'sync_data' 
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Este canal é mantido para compatibilidade
          console.log('Alteração em dados completos detectada:', payload);
        }
      )
      .subscribe((status: string) => {
        console.log('Status da inscrição do canal de dados completos:', status);
      });
  },
  
  // Processar um evento de alteração recebido
  async processChangeEvent(changeEvent: ChangeEvent) {
    // Ignorar eventos gerados pela própria sessão
    if (changeEvent.sessionId === SESSION_ID) {
      console.log('Ignorando evento gerado pela sessão atual:', changeEvent.id);
      return;
    }
    
    // Verificar se já processamos este evento antes
    if (changeEvent.id === this.lastProcessedChangeId) {
      console.log('Evento já processado, ignorando:', changeEvent.id);
      return;
    }
    
    console.log('Processando evento de alteração:', changeEvent);
    this.lastProcessedChangeId = changeEvent.id;
    
    // Carregar dados locais atuais
    const localData = storage.load() || {
      expenses: {},
      projects: [],
      stock: [],
      employees: {},
      willBaseRate: 200,
      willBonus: 0,
      lastSync: Date.now()
    };
    
    let dataChanged = false;
    
    // Aplicar a alteração com base no tipo
    switch (changeEvent.itemType) {
      case 'expense':
        dataChanged = this.applyExpenseChange(localData, changeEvent);
        break;
      case 'project':
        dataChanged = this.applyProjectChange(localData, changeEvent);
        break;
      case 'stock':
        dataChanged = this.applyStockChange(localData, changeEvent);
        break;
      case 'employee':
        dataChanged = this.applyEmployeeChange(localData, changeEvent);
        break;
      case 'willSettings':
        dataChanged = this.applyWillSettingsChange(localData, changeEvent);
        break;
    }
    
    if (dataChanged) {
      // Atualizar timestamp de sincronização
      localData.lastSync = Date.now();
      
      // Salvar dados atualizados localmente
      storage.save(localData);
      
      // Disparar evento para atualizar a UI
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: localData 
      }));
    }
  },
  
  // Aplicar alteração em despesa
  applyExpenseChange(data: StorageItems, changeEvent: ChangeEvent): boolean {
    if (!changeEvent.listName) return false;
    
    const listName = changeEvent.listName;
    
    // Garantir que a lista existe
    if (!data.expenses[listName]) {
      data.expenses[listName] = [];
    }
    
    const expenses = data.expenses[listName];
    const existingIndex = expenses.findIndex(e => e.id === changeEvent.itemId);
    
    switch (changeEvent.changeType) {
      case CHANGE_TYPE.ADD:
        // Adicionar apenas se não existir
        if (existingIndex === -1) {
          expenses.push(changeEvent.data);
          console.log(`Despesa adicionada: ${changeEvent.itemId} em ${listName}`);
          return true;
        } else {
          // Se já existe, atualizar
          expenses[existingIndex] = changeEvent.data;
          console.log(`Despesa existente atualizada: ${changeEvent.itemId} em ${listName}`);
          return true;
        }
      
      case CHANGE_TYPE.UPDATE:
        // Atualizar se existir
        if (existingIndex !== -1) {
          expenses[existingIndex] = changeEvent.data;
          console.log(`Despesa atualizada: ${changeEvent.itemId} em ${listName}`);
          return true;
        }
        break;
      
      case CHANGE_TYPE.DELETE:
        // Remover se existir
        if (existingIndex !== -1) {
          expenses.splice(existingIndex, 1);
          console.log(`Despesa removida: ${changeEvent.itemId} de ${listName}`);
          return true;
        }
        break;
    }
    
    return false;
  },
  
  // Aplicar alteração em projeto
  applyProjectChange(data: StorageItems, changeEvent: ChangeEvent): boolean {
    const projects = data.projects;
    const existingIndex = projects.findIndex(p => p.id === changeEvent.itemId);
    
    switch (changeEvent.changeType) {
      case CHANGE_TYPE.ADD:
        // Adicionar apenas se não existir
        if (existingIndex === -1) {
          projects.push(changeEvent.data);
          console.log(`Projeto adicionado: ${changeEvent.itemId}`);
          return true;
        } else {
          // Se já existe, atualizar
          projects[existingIndex] = changeEvent.data;
          console.log(`Projeto existente atualizado: ${changeEvent.itemId}`);
          return true;
        }
      
      case CHANGE_TYPE.UPDATE:
        // Atualizar se existir
        if (existingIndex !== -1) {
          projects[existingIndex] = changeEvent.data;
          console.log(`Projeto atualizado: ${changeEvent.itemId}`);
          return true;
        }
        break;
      
      case CHANGE_TYPE.DELETE:
        // Remover se existir
        if (existingIndex !== -1) {
          projects.splice(existingIndex, 1);
          console.log(`Projeto removido: ${changeEvent.itemId}`);
          return true;
        }
        break;
    }
    
    return false;
  },
  
  // Aplicar alteração em item de estoque
  applyStockChange(data: StorageItems, changeEvent: ChangeEvent): boolean {
    const stock = data.stock;
    const existingIndex = stock.findIndex(s => s.id === changeEvent.itemId);
    
    switch (changeEvent.changeType) {
      case CHANGE_TYPE.ADD:
        // Adicionar apenas se não existir
        if (existingIndex === -1) {
          stock.push(changeEvent.data);
          console.log(`Item de estoque adicionado: ${changeEvent.itemId}`);
          return true;
        } else {
          // Se já existe, atualizar
          stock[existingIndex] = changeEvent.data;
          console.log(`Item de estoque existente atualizado: ${changeEvent.itemId}`);
          return true;
        }
      
      case CHANGE_TYPE.UPDATE:
        // Atualizar se existir
        if (existingIndex !== -1) {
          stock[existingIndex] = changeEvent.data;
          console.log(`Item de estoque atualizado: ${changeEvent.itemId}`);
          return true;
        }
        break;
      
      case CHANGE_TYPE.DELETE:
        // Remover se existir
        if (existingIndex !== -1) {
          stock.splice(existingIndex, 1);
          console.log(`Item de estoque removido: ${changeEvent.itemId}`);
          return true;
        }
        break;
    }
    
    return false;
  },
  
  // Aplicar alteração em funcionário
  applyEmployeeChange(data: StorageItems, changeEvent: ChangeEvent): boolean {
    if (!changeEvent.listName) return false;
    
    const listName = changeEvent.listName;
    
    // Garantir que a lista existe
    if (!data.employees[listName]) {
      data.employees[listName] = [];
    }
    
    const employees = data.employees[listName];
    const existingIndex = employees.findIndex(e => e.id === changeEvent.itemId);
    
    switch (changeEvent.changeType) {
      case CHANGE_TYPE.ADD:
        // Adicionar apenas se não existir
        if (existingIndex === -1) {
          employees.push(changeEvent.data);
          console.log(`Funcionário adicionado: ${changeEvent.itemId} em ${listName}`);
          return true;
        } else {
          // Se já existe, atualizar
          employees[existingIndex] = changeEvent.data;
          console.log(`Funcionário existente atualizado: ${changeEvent.itemId} em ${listName}`);
          return true;
        }
      
      case CHANGE_TYPE.UPDATE:
        // Atualizar se existir
        if (existingIndex !== -1) {
          employees[existingIndex] = changeEvent.data;
          console.log(`Funcionário atualizado: ${changeEvent.itemId} em ${listName}`);
          return true;
        }
        break;
      
      case CHANGE_TYPE.DELETE:
        // Remover se existir
        if (existingIndex !== -1) {
          employees.splice(existingIndex, 1);
          console.log(`Funcionário removido: ${changeEvent.itemId} de ${listName}`);
          return true;
        }
        break;
    }
    
    return false;
  },
  
  // Aplicar alteração nas configurações do Will
  applyWillSettingsChange(data: StorageItems, changeEvent: ChangeEvent): boolean {
    // Estrutura específica para alterações nas configurações do Will
    if (changeEvent.data) {
      if (changeEvent.data.willBaseRate !== undefined) {
        data.willBaseRate = changeEvent.data.willBaseRate;
      }
      
      if (changeEvent.data.willBonus !== undefined) {
        data.willBonus = changeEvent.data.willBonus;
      }
      
      console.log(`Configurações do Will atualizadas: ${JSON.stringify(changeEvent.data)}`);
      return true;
    }
    
    return false;
  },
  
  // Configurar atualizações em tempo real
  setupRealtimeUpdates(callback: (data: StorageItems) => void) {
    if (!supabase) return () => {};
    
    const handleDataUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('Evento de atualização recebido');
      callback(event.detail);
    };
    
    window.addEventListener('dataUpdated', handleDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate as EventListener);
      
      if (this.channelChanges) {
        this.channelChanges.unsubscribe();
      }
      
      if (this.channelData) {
        this.channelData.unsubscribe();
      }
      
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      
      this.isInitialized = false;
    };
  },
  
  // Publicar um evento de alteração
  async publishChangeEvent(changeEvent: Omit<ChangeEvent, 'id' | 'timestamp' | 'sessionId'>): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      // Preparar evento completo
      const fullChangeEvent: ChangeEvent = {
        ...changeEvent,
        id: generateChangeId(),
        timestamp: Date.now(),
        sessionId: SESSION_ID
      };
      
      // Adicionar aos eventos pendentes
      this.pendingChanges.push(fullChangeEvent);
      
      // Publicar no Supabase
      const { error } = await supabase
        .from('item_changes')
        .insert(fullChangeEvent);
      
      if (error) {
        console.error('Erro ao publicar evento de alteração:', error);
        return false;
      }
      
      console.log('Evento de alteração publicado com sucesso:', fullChangeEvent);
      return true;
    } catch (error) {
      console.error('Erro ao publicar evento de alteração:', error);
      return false;
    }
  },
  
  // Publicar vários eventos de alteração em lote
  async publishChangeEventsBatch(events: Array<Omit<ChangeEvent, 'id' | 'timestamp' | 'sessionId'>>): Promise<boolean> {
    if (!supabase || events.length === 0) return false;
    
    try {
      // Preparar eventos completos
      const fullChangeEvents: ChangeEvent[] = events.map(event => ({
        ...event,
        id: generateChangeId(),
        timestamp: Date.now(),
        sessionId: SESSION_ID
      }));
      
      // Publicar no Supabase
      const { error } = await supabase
        .from('item_changes')
        .insert(fullChangeEvents);
      
      if (error) {
        console.error('Erro ao publicar eventos de alteração em lote:', error);
        return false;
      }
      
      console.log(`${fullChangeEvents.length} eventos de alteração publicados com sucesso`);
      return true;
    } catch (error) {
      console.error('Erro ao publicar eventos de alteração em lote:', error);
      return false;
    }
  },
  
  // Carregar alterações recentes
  async loadRecentChanges(since: number): Promise<ChangeEvent[]> {
    if (!supabase) return [];
    
    try {
      // Obter alterações mais recentes que o timestamp fornecido
      const { data, error } = await supabase
        .from('item_changes')
        .select('*')
        .gt('timestamp', since)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Erro ao carregar alterações recentes:', error);
        return [];
      }
      
      return data as ChangeEvent[];
    } catch (error) {
      console.error('Erro ao carregar alterações recentes:', error);
      return [];
    }
  },
  
  // Criar evento de alteração para despesa
  createExpenseChange(expense: Expense, listName: string, changeType: ChangeTypeValue): Promise<boolean> {
    return this.publishChangeEvent({
      itemId: expense.id,
      itemType: 'expense',
      changeType,
      data: changeType !== CHANGE_TYPE.DELETE ? expense : null,
      listName
    });
  },
  
  // Criar evento de alteração para projeto
  createProjectChange(project: Project, changeType: ChangeTypeValue): Promise<boolean> {
    return this.publishChangeEvent({
      itemId: project.id,
      itemType: 'project',
      changeType,
      data: changeType !== CHANGE_TYPE.DELETE ? project : null
    });
  },
  
  // Criar evento de alteração para item de estoque
  createStockChange(stockItem: StockItem, changeType: ChangeTypeValue): Promise<boolean> {
    return this.publishChangeEvent({
      itemId: stockItem.id,
      itemType: 'stock',
      changeType,
      data: changeType !== CHANGE_TYPE.DELETE ? stockItem : null
    });
  },
  
  // Criar evento de alteração para funcionário
  createEmployeeChange(employee: Employee, listName: string, changeType: ChangeTypeValue): Promise<boolean> {
    return this.publishChangeEvent({
      itemId: employee.id,
      itemType: 'employee',
      changeType,
      data: changeType !== CHANGE_TYPE.DELETE ? employee : null,
      listName
    });
  },
  
  // Criar evento de alteração para Will Settings
  updateWillSettings(baseRate?: number, bonus?: number): Promise<boolean> {
    return this.publishChangeEvent({
      itemId: 'willSettings',
      itemType: 'willSettings',
      changeType: CHANGE_TYPE.UPDATE,
      data: {
        willBaseRate: baseRate,
        willBonus: bonus
      }
    });
  },
  
  // Forçar sincronização imediata
  async forceSyncNow(): Promise<StorageItems | null> {
    console.log('Forçando sincronização imediata...');
    
    if (!supabase) {
      console.warn('Supabase não configurado, não é possível forçar sincronização');
      return null;
    }
    
    try {
      // Obter dados locais atuais
      const localData = storage.load();
      
      if (!localData) {
        console.log('Nenhum dado local encontrado, carregando dados iniciais');
        return await loadInitialData();
      }
      
      // Determinar o timestamp da última sincronização
      const lastSync = typeof localData.lastSync === 'string' 
        ? parseInt(localData.lastSync, 10) 
        : (localData.lastSync || 0);
      
      console.log('Última sincronização:', new Date(lastSync).toLocaleString());
      
      // Carregar alterações desde a última sincronização
      const recentChanges = await this.loadRecentChanges(lastSync);
      
      if (recentChanges.length === 0) {
        console.log('Nenhuma alteração recente encontrada');
        return localData;
      }
      
      console.log(`${recentChanges.length} alterações recentes encontradas`);
      
      // Aplicar alterações uma a uma
      let dataChanged = false;
      
      for (const changeEvent of recentChanges) {
        // Ignorar eventos da própria sessão
        if (changeEvent.sessionId === SESSION_ID) {
          continue;
        }
        
        // Processar o evento
        await this.processChangeEvent(changeEvent);
        dataChanged = true;
      }
      
      if (dataChanged) {
        // Dados atualizados já foram salvos em processChangeEvent
        return storage.load();
      }
      
      return localData;
    } catch (error) {
      console.error('Erro ao forçar sincronização:', error);
      return storage.load();
    }
  },
  
  // Sincronizar dados locais com o servidor (legacy)
  async syncLegacy(data: StorageItems): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase não configurado, não é possível sincronizar');
      return false;
    }
    
    try {
      // Preparar dados para sincronização
      const syncData = {
        id: SHARED_UUID,
        expenses: data.expenses,
        projects: data.projects,
        stock: data.stock,
        employees: data.employees,
        willBaseRate: data.willBaseRate,
        willBonus: data.willBonus,
        updated_at: new Date().toISOString()
      };
      
      // Sincronizar com Supabase
      const { error } = await supabase
        .from('sync_data')
        .upsert(syncData);
      
      if (error) {
        console.error('Erro ao sincronizar dados:', error);
        return false;
      }
      
      console.log('Dados sincronizados com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      return false;
    }
  }
};

// Função para inicializar tabela de eventos de alteração
export const initChangeEventsTable = async () => {
  if (!supabase) return;
  
  try {
    // Verificar se a tabela existe
    const { error: queryError } = await supabase
      .from('item_changes')
      .select('id')
      .limit(1);
    
    // Se a tabela não existir, criar
    if (queryError && queryError.code === '42P01') {
      console.log('Tabela item_changes não encontrada, solicite ao administrador para criar a tabela');
    }
  } catch (error) {
    console.error('Erro ao verificar tabela de eventos de alteração:', error);
  }
};

// Função para carregar dados iniciais
export const loadInitialData = async (): Promise<StorageItems | null> => {
  if (!supabase) {
    console.log('Supabase não configurado, carregando dados locais');
    return storage.load();
  }

  try {
    // Inicializar tabela de eventos de alteração
    await initChangeEventsTable();
    
    // Primeiro, verificar se existem dados locais
    const localData = storage.load();
    
    if (localData) {
      console.log('Dados locais encontrados');
      
      // Forçar sincronização para obter alterações recentes
      syncService.forceSyncNow();
      
      return localData;
    }
    
    // Se não há dados locais, verificar se existem dados no Supabase usando UUID compartilhado
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .eq('id', SHARED_UUID)
      .limit(1);

    if (error) {
      console.warn('Erro ao carregar dados iniciais do Supabase:', error);
      return storage.load();
    }

    // Verificar se o array contém dados
    if (data && data.length > 0) {
      console.log('Dados encontrados no Supabase com UUID compartilhado');
      
      // Garantir que os valores do Will estejam definidos
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
    }
    
    // Se não encontrou dados, inicializar com estrutura vazia
    console.log('Nenhum dado encontrado, inicializando com estrutura vazia');
    const emptyData: StorageItems = {
      expenses: {},
      projects: [],
      stock: [],
      employees: {},
      willBaseRate: 200,
      willBonus: 0,
      lastSync: new Date().getTime()
    };
    
    // Salvar localmente
    storage.save(emptyData);
    return emptyData;
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    return storage.load();
  }
};

// Função para salvar um item e sincronizar
export const saveItem = async (
  itemType: 'expense' | 'project' | 'stock' | 'employee' | 'willSettings',
  item: any,
  changeType: ChangeTypeValue,
  listName?: string
): Promise<boolean> => {
  // Obter dados atuais
  const current = storage.load() || {
    expenses: {},
    projects: [],
    stock: [],
    employees: {},
    willBaseRate: 200,
    willBonus: 0,
    lastSync: Date.now()
  };
  
  // Criar uma cópia dos dados para trabalhar
  const data: StorageItems = JSON.parse(JSON.stringify(current));
  
  let success = false;
  
  switch (itemType) {
    case 'expense':
      if (!listName) {
        console.error('ListName é obrigatório para despesas');
        return false;
      }
      
      if (!data.expenses[listName]) {
        data.expenses[listName] = [];
      }
      
      if (changeType === CHANGE_TYPE.ADD) {
        const existingIndex = data.expenses[listName].findIndex(e => e.id === item.id);
        if (existingIndex === -1) {
          data.expenses[listName].push(item);
        } else {
          data.expenses[listName][existingIndex] = item;
        }
        success = true;
      } else if (changeType === CHANGE_TYPE.UPDATE) {
        const index = data.expenses[listName].findIndex(e => e.id === item.id);
        if (index !== -1) {
          data.expenses[listName][index] = item;
          success = true;
        }
      } else if (changeType === CHANGE_TYPE.DELETE) {
        const index = data.expenses[listName].findIndex(e => e.id === item.id);
        if (index !== -1) {
          data.expenses[listName].splice(index, 1);
          success = true;
        }
      }
      
      if (success) {
        // Publicar evento de alteração
        await syncService.createExpenseChange(item, listName, changeType);
      }
      break;
      
    case 'project':
      if (changeType === CHANGE_TYPE.ADD) {
        const existingIndex = data.projects.findIndex(p => p.id === item.id);
        if (existingIndex === -1) {
          data.projects.push(item);
        } else {
          data.projects[existingIndex] = item;
        }
        success = true;
      } else if (changeType === CHANGE_TYPE.UPDATE) {
        const index = data.projects.findIndex(p => p.id === item.id);
        if (index !== -1) {
          data.projects[index] = item;
          success = true;
        }
      } else if (changeType === CHANGE_TYPE.DELETE) {
        const index = data.projects.findIndex(p => p.id === item.id);
        if (index !== -1) {
          data.projects.splice(index, 1);
          success = true;
        }
      }
      
      if (success) {
        // Publicar evento de alteração
        await syncService.createProjectChange(item, changeType);
      }
      break;
      
    case 'stock':
      if (changeType === CHANGE_TYPE.ADD) {
        const existingIndex = data.stock.findIndex(s => s.id === item.id);
        if (existingIndex === -1) {
          data.stock.push(item);
        } else {
          data.stock[existingIndex] = item;
        }
        success = true;
      } else if (changeType === CHANGE_TYPE.UPDATE) {
        const index = data.stock.findIndex(s => s.id === item.id);
        if (index !== -1) {
          data.stock[index] = item;
          success = true;
        }
      } else if (changeType === CHANGE_TYPE.DELETE) {
        const index = data.stock.findIndex(s => s.id === item.id);
        if (index !== -1) {
          data.stock.splice(index, 1);
          success = true;
        }
      }
      
      if (success) {
        // Publicar evento de alteração
        await syncService.createStockChange(item, changeType);
      }
      break;
      
    case 'employee':
      if (!listName) {
        console.error('ListName é obrigatório para funcionários');
        return false;
      }
      
      if (!data.employees[listName]) {
        data.employees[listName] = [];
      }
      
      if (changeType === CHANGE_TYPE.ADD) {
        const existingIndex = data.employees[listName].findIndex(e => e.id === item.id);
        if (existingIndex === -1) {
          data.employees[listName].push(item);
        } else {
          data.employees[listName][existingIndex] = item;
        }
        success = true;
      } else if (changeType === CHANGE_TYPE.UPDATE) {
        const index = data.employees[listName].findIndex(e => e.id === item.id);
        if (index !== -1) {
          data.employees[listName][index] = item;
          success = true;
        }
      } else if (changeType === CHANGE_TYPE.DELETE) {
        const index = data.employees[listName].findIndex(e => e.id === item.id);
        if (index !== -1) {
          data.employees[listName].splice(index, 1);
          success = true;
        }
      }
      
      if (success) {
        // Publicar evento de alteração
        await syncService.createEmployeeChange(item, listName, changeType);
      }
      break;
      
    case 'willSettings':
      if (item.willBaseRate !== undefined) {
        data.willBaseRate = item.willBaseRate;
      }
      
      if (item.willBonus !== undefined) {
        data.willBonus = item.willBonus;
      }
      
      success = true;
      
      // Publicar evento de alteração
      await syncService.updateWillSettings(item.willBaseRate, item.willBonus);
      break;
      
    default:
      console.error(`Tipo de item desconhecido: ${itemType}`);
      return false;
  }
  
  if (success) {
    // Atualizar timestamp de sincronização
    data.lastSync = Date.now();
    
    // Salvar dados atualizados localmente
    storage.save(data);
    
    // Disparar evento para atualizar a UI
    window.dispatchEvent(new CustomEvent('dataUpdated', { 
      detail: data 
    }));
  }
  
  return success;
};

// Função legada para compatibilidade
export const saveData = (data: StorageItems) => {
  // Garantir que os valores do Will estejam definidos
  const willValues = ensureWillValues(data);
  data.willBaseRate = willValues.willBaseRate;
  data.willBonus = willValues.willBonus;
  
  console.log('Salvando dados com valores do Will:', data.willBaseRate, data.willBonus);
  
  // Salvar localmente primeiro para resposta imediata
  storage.save(data);
  
  // Atualizar Will Settings
  if (supabase) {
    syncService.updateWillSettings(data.willBaseRate, data.willBonus).catch(error => {
      console.error('Erro ao sincronizar valores do Will:', error);
    });
    
    // Manter compatibilidade com o modelo antigo
    syncService.syncLegacy(data).catch(error => {
      console.error('Erro ao sincronizar dados (legacy):', error);
    });
  }
}; 