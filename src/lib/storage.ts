import { StorageItems } from '../types';

const STORAGE_KEY = 'expenses-app-data';

// Função para sincronizar entre abas/janelas
const setupStorageSync = () => {
  // Ouvir eventos de armazenamento de outras abas/janelas
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        console.log('Dados atualizados em outra aba/janela:', data);
        
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
      console.log('Salvando dados no armazenamento local:', data);
      const serialized = JSON.stringify({
        expenses: data.expenses || {},
        projects: data.projects || [],
        stock: data.stock || [],
        employees: data.employees || {},
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
      console.log('Carregando dados do armazenamento local...');
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        console.log('Nenhum dado encontrado no armazenamento local');
        return null;
      }
      
      const data = JSON.parse(serialized) as StorageItems;
      console.log('Dados carregados do armazenamento local:', data);
      return data;
    } catch (error) {
      console.error('Erro ao carregar do armazenamento local:', error);
      return null;
    }
  },
  
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Armazenamento local limpo');
    } catch (error) {
      console.error('Erro ao limpar armazenamento local:', error);
    }
  },
  
  setupSyncListener: (callback: (data: StorageItems) => void): (() => void) => {
    const handleStorageUpdate = (event: CustomEvent<StorageItems>) => {
      console.log('Evento de atualização do armazenamento local recebido:', event.detail);
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
    lastSync: new Date().getTime()
  };
};

// Função para salvar dados no armazenamento local
export const saveData = (items: StorageItems): boolean => {
  storage.save(items);
  return true;
}; 