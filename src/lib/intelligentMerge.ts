import { StorageItems, Expense, Project, StockItem, Employee } from '../types';

// Interface para itens com metadados de sincronização
export interface ItemWithMetadata {
  id: string;
  lastModified: number;
  modifiedBy: string; // SESSION_ID do dispositivo que fez a modificação
  version: number;
  isDeleted?: boolean;
}

// Interface para dados com metadados
export interface DataWithMetadata extends StorageItems {
  itemMetadata: Record<string, ItemWithMetadata>;
}

// Sistema de detecção de retorno do segundo plano
export class BackgroundDetector {
  private static instance: BackgroundDetector;
  private lastActiveTime: number = Date.now();
  private isInBackground: boolean = false;
  private listeners: Array<(wasInBackground: boolean) => void> = [];
  private readonly BACKGROUND_THRESHOLD = 30000; // 30 segundos

  static getInstance(): BackgroundDetector {
    if (!BackgroundDetector.instance) {
      BackgroundDetector.instance = new BackgroundDetector();
    }
    return BackgroundDetector.instance;
  }

  private constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Detectar quando a página perde/ganha foco
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleBackground();
      } else {
        this.handleForeground();
      }
    });

    // Detectar quando a janela perde/ganha foco
    window.addEventListener('blur', () => this.handleBackground());
    window.addEventListener('focus', () => this.handleForeground());

    // Detectar navegação de volta (mobile)
    window.addEventListener('pageshow', () => this.handleForeground());
    window.addEventListener('pagehide', () => this.handleBackground());

    // Detectar inatividade (fallback)
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, () => {
        this.lastActiveTime = Date.now();
      }, { passive: true });
    });

    // Verificar inatividade periodicamente
    setInterval(() => this.checkInactivity(), 5000);
  }

  private handleBackground() {
    if (!this.isInBackground) {
      console.log('🔄 App indo para segundo plano');
      this.isInBackground = true;
      this.lastActiveTime = Date.now();
    }
  }

  private handleForeground() {
    const wasInBackground = this.isInBackground;
    if (this.isInBackground) {
      const timeInBackground = Date.now() - this.lastActiveTime;
      console.log(`🔄 App voltando do segundo plano (${Math.round(timeInBackground/1000)}s offline)`);
      
      this.isInBackground = false;
      this.lastActiveTime = Date.now();
      
      // Notificar listeners se esteve em background por tempo significativo
      if (timeInBackground > this.BACKGROUND_THRESHOLD) {
        this.notifyListeners(true);
      }
    }
  }

  private checkInactivity() {
    const inactiveTime = Date.now() - this.lastActiveTime;
    if (!this.isInBackground && inactiveTime > this.BACKGROUND_THRESHOLD) {
      this.handleBackground();
    }
  }

  private notifyListeners(wasInBackground: boolean) {
    this.listeners.forEach(listener => {
      try {
        listener(wasInBackground);
      } catch (error) {
        console.error('Erro no listener de background:', error);
      }
    });
  }

  public onReturnFromBackground(callback: (wasInBackground: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public isCurrentlyInBackground(): boolean {
    return this.isInBackground;
  }
}

// Sistema de merge inteligente
export class IntelligentMerge {
  private static deviceId: string = Math.random().toString(36).substring(2, 15);

  // Adicionar metadados a um item
  static addMetadata<T extends { id: string }>(
    item: T, 
    existingMetadata?: ItemWithMetadata
  ): T & { _metadata: ItemWithMetadata } {
    const now = Date.now();
    
    return {
      ...item,
      _metadata: {
        id: item.id,
        lastModified: now,
        modifiedBy: this.deviceId,
        version: (existingMetadata?.version || 0) + 1,
        isDeleted: false
      }
    };
  }

  // Marcar item como deletado
  static markAsDeleted(itemId: string, existingMetadata?: ItemWithMetadata): ItemWithMetadata {
    return {
      id: itemId,
      lastModified: Date.now(),
      modifiedBy: this.deviceId,
      version: (existingMetadata?.version || 0) + 1,
      isDeleted: true
    };
  }

  // Merge inteligente de arrays de itens
  static mergeItemArrays<T extends { id: string }>(
    localItems: T[],
    serverItems: T[],
    localMetadata: Record<string, ItemWithMetadata> = {},
    serverMetadata: Record<string, ItemWithMetadata> = {},
    deletedIds: string[] = []
  ): { items: T[], metadata: Record<string, ItemWithMetadata> } {
    
    const merged = new Map<string, T>();
    const mergedMetadata: Record<string, ItemWithMetadata> = { ...serverMetadata };
    
    // Processar itens do servidor
    serverItems.forEach(serverItem => {
      const serveMeta = serverMetadata[serverItem.id];
      if (serveMeta && !serveMeta.isDeleted && !deletedIds.includes(serverItem.id)) {
        merged.set(serverItem.id, serverItem);
        mergedMetadata[serverItem.id] = serveMeta;
      }
    });

    // Processar itens locais
    localItems.forEach(localItem => {
      const localMeta = localMetadata[localItem.id];
      const serverMeta = serverMetadata[localItem.id];
      
      // Se o item foi deletado, pular
      if (deletedIds.includes(localItem.id)) {
        merged.delete(localItem.id);
        return;
      }

      // Se não há item no servidor, adicionar o local
      if (!serverMeta) {
        merged.set(localItem.id, localItem);
        mergedMetadata[localItem.id] = localMeta || this.addMetadata(localItem)._metadata;
        return;
      }

      // Se há conflito, usar o mais recente
      if (localMeta && serverMeta) {
        if (localMeta.lastModified > serverMeta.lastModified) {
          console.log(`📝 Item ${localItem.id}: usando versão local (mais recente)`);
          merged.set(localItem.id, localItem);
          mergedMetadata[localItem.id] = localMeta;
        } else if (localMeta.lastModified === serverMeta.lastModified) {
          // Em caso de empate, usar versão com maior número de versão
          if (localMeta.version > serverMeta.version) {
            merged.set(localItem.id, localItem);
            mergedMetadata[localItem.id] = localMeta;
          }
        }
        // Caso contrário, manter a versão do servidor que já está no map
      } else if (localMeta) {
        // Só há metadados locais, usar local
        merged.set(localItem.id, localItem);
        mergedMetadata[localItem.id] = localMeta;
      }
    });

    return {
      items: Array.from(merged.values()),
      metadata: mergedMetadata
    };
  }

  // Merge inteligente de objetos de mapa (expenses, employees)
  static mergeItemMaps<T extends { id: string }>(
    localMap: Record<string, T[]>,
    serverMap: Record<string, T[]>,
    localMetadata: Record<string, ItemWithMetadata> = {},
    serverMetadata: Record<string, ItemWithMetadata> = {},
    deletedIds: string[] = []
  ): { map: Record<string, T[]>, metadata: Record<string, ItemWithMetadata> } {
    
    const mergedMap: Record<string, T[]> = {};
    let mergedMetadata: Record<string, ItemWithMetadata> = { ...serverMetadata };

    // Obter todas as chaves únicas
    const allKeys = new Set([
      ...Object.keys(localMap),
      ...Object.keys(serverMap)
    ]);

    allKeys.forEach(key => {
      const localItems = localMap[key] || [];
      const serverItems = serverMap[key] || [];

      const merged = this.mergeItemArrays(
        localItems,
        serverItems,
        localMetadata,
        serverMetadata,
        deletedIds
      );

      mergedMap[key] = merged.items;
      mergedMetadata = { ...mergedMetadata, ...merged.metadata };
    });

    return {
      map: mergedMap,
      metadata: mergedMetadata
    };
  }

  // Merge completo de dados
  static mergeStorageData(
    localData: StorageItems,
    serverData: StorageItems,
    localMetadata: Record<string, ItemWithMetadata> = {},
    serverMetadata: Record<string, ItemWithMetadata> = {}
  ): StorageItems & { itemMetadata: Record<string, ItemWithMetadata> } {
    
    console.log('🔄 Iniciando merge inteligente de dados');
    console.log('📊 Dados locais:', {
      expenses: Object.keys(localData.expenses).length,
      projects: localData.projects.length,
      stock: localData.stock.length,
      employees: Object.keys(localData.employees).length
    });
    console.log('📊 Dados do servidor:', {
      expenses: Object.keys(serverData.expenses).length,
      projects: serverData.projects.length,
      stock: serverData.stock.length,
      employees: Object.keys(serverData.employees).length
    });

    // Combinar deletedIds de ambas as fontes
    const allDeletedIds = [
      ...(localData.deletedIds || []),
      ...(serverData.deletedIds || [])
    ];
    const uniqueDeletedIds = [...new Set(allDeletedIds)];

    // Merge de projetos
    const mergedProjects = this.mergeItemArrays(
      localData.projects,
      serverData.projects,
      localMetadata,
      serverMetadata,
      uniqueDeletedIds
    );

    // Merge de stock
    const mergedStock = this.mergeItemArrays(
      localData.stock,
      serverData.stock,
      localMetadata,
      serverMetadata,
      uniqueDeletedIds
    );

    // Merge de expenses
    const mergedExpenses = this.mergeItemMaps(
      localData.expenses,
      serverData.expenses,
      localMetadata,
      serverMetadata,
      uniqueDeletedIds
    );

    // Merge de employees
    const mergedEmployees = this.mergeItemMaps(
      localData.employees,
      serverData.employees,
      localMetadata,
      serverMetadata,
      uniqueDeletedIds
    );

    // Combinar metadados
    const finalMetadata = {
      ...mergedProjects.metadata,
      ...mergedStock.metadata,
      ...mergedExpenses.metadata,
      ...mergedEmployees.metadata
    };

    const result = {
      expenses: mergedExpenses.map,
      projects: mergedProjects.items,
      stock: mergedStock.items,
      employees: mergedEmployees.map,
      deletedIds: uniqueDeletedIds,
      willBaseRate: localData.willBaseRate !== undefined ? localData.willBaseRate : serverData.willBaseRate,
      willBonus: localData.willBonus !== undefined ? localData.willBonus : serverData.willBonus,
      lastSync: Math.max(localData.lastSync as number || 0, serverData.lastSync as number || 0),
      itemMetadata: finalMetadata
    };

    console.log('✅ Merge concluído:', {
      expenses: Object.keys(result.expenses).length,
      projects: result.projects.length,
      stock: result.stock.length,
      employees: Object.keys(result.employees).length,
      metadata: Object.keys(result.itemMetadata).length,
      deletedIds: result.deletedIds.length
    });

    return result;
  }

  // Verificar se precisa de sincronização
  static needsSync(localData: StorageItems, serverData: StorageItems): boolean {
    const localTime = localData.lastSync as number || 0;
    const serverTime = serverData.lastSync as number || 0;
    
    // Se a diferença for maior que 5 segundos, provavelmente há mudanças
    return Math.abs(localTime - serverTime) > 5000;
  }

  // Gerar relatório de conflitos
  static generateConflictReport(
    localData: StorageItems,
    serverData: StorageItems
  ): string[] {
    const conflicts: string[] = [];
    
    // Verificar conflitos em projetos
    localData.projects.forEach(localProject => {
      const serverProject = serverData.projects.find(p => p.id === localProject.id);
      if (serverProject && JSON.stringify(localProject) !== JSON.stringify(serverProject)) {
        conflicts.push(`Projeto "${localProject.name}" modificado em ambos os dispositivos`);
      }
    });

    // Verificar conflitos em stock
    localData.stock.forEach(localItem => {
      const serverItem = serverData.stock.find(s => s.id === localItem.id);
      if (serverItem && JSON.stringify(localItem) !== JSON.stringify(serverItem)) {
        conflicts.push(`Item de estoque "${localItem.name}" modificado em ambos os dispositivos`);
      }
    });

    return conflicts;
  }
}

// Sistema de notificação de conflitos
export class ConflictNotifier {
  private static showConflictToast(message: string) {
    // Disparar evento para mostrar notificação na UI
    window.dispatchEvent(new CustomEvent('syncConflict', {
      detail: { message, type: 'warning' }
    }));
  }

  static notifyConflicts(conflicts: string[]) {
    if (conflicts.length > 0) {
      const message = conflicts.length === 1 
        ? conflicts[0]
        : `${conflicts.length} conflitos detectados e resolvidos automaticamente`;
      
      this.showConflictToast(message);
      console.warn('⚠️ Conflitos de sincronização:', conflicts);
    }
  }
}
