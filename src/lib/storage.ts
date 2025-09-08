import { StorageItems } from '../types';

const STORAGE_KEY = 'expenses-app-data';

// Função para sincronizar entre abas/janelas
const setupStorageSync = () => {
  // Ouvir eventos de armazenamento de outras abas/janelas
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        
        
        // Disparar evento para atualizar a UI
        window.dispatchEvent(new CustomEvent('localStorageUpdated', { 
          detail: data 
        }));
      } catch (error) {
        console.error('Erro ao processar dados de outra aba:', error);
      }
    }
  });
};

// Inicializar sincronização entre abas
setupStorageSync();

export const storage = {
  save: (data: StorageItems): void => {
    try {
      
      const serialized = JSON.stringify({
        expenses: data.expenses || {},
        projects: data.projects || [],
        stock: data.stock || [],
        employees: data.employees || {},
        deletedIds: data.deletedIds || [],
        willBaseRate: data.willBaseRate || 200,
        willBonus: data.willBonus || 0,
        lastSync: new Date().getTime()
      });
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Erro ao salvar no armazenamento local:', error);
    }
  },
  
  load: (): StorageItems | null => {
    try {
      
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        
        return null;
      }
      
      const data = JSON.parse(serialized) as StorageItems;
      
      return data;
    } catch (error) {
      console.error('Erro ao carregar do armazenamento local:', error);
      return null;
    }
  },
  
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      
    } catch (error) {
      console.error('Erro ao limpar armazenamento local:', error);
    }
  },
  
  setupSyncListener: (callback: (data: StorageItems) => void): (() => void) => {
    const handleStorageUpdate = (event: CustomEvent<StorageItems>) => {
      
      callback(event.detail);
    };
    
    window.addEventListener('localStorageUpdated', handleStorageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('localStorageUpdated', handleStorageUpdate as EventListener);
    };
  }
};

export const getData = (): StorageItems => {
  const data = storage.load();
  if (data) {
    return data;
  }
  
  // Dados padrão se não houver nada salvo
  return {
    expenses: {},
    projects: [],
    stock: [],
    employees: {},
    deletedIds: [],
    willBaseRate: 200,
    willBonus: 0,
    lastSync: new Date().getTime()
  };
};

// Função para salvar dados no armazenamento local
export const saveData = (items: StorageItems): boolean => {
  storage.save(items);
  return true;
}; 
