import { StorageItems } from '../types';

// Chave para o armazenamento local
const STORAGE_KEY = 'expenses-app-data';

// Função para garantir que os valores do Will estejam definidos
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

// Funções para manipulação de armazenamento
export const storage = {
  // Salvar dados no armazenamento local
  save: (data: StorageItems): boolean => {
    try {
      // Validar os dados antes de salvar
      if (!data) {
        console.error('Tentativa de salvar dados nulos');
        return false;
      }
      
      // Garantir que os arrays obrigatórios existam
      if (!data.projects) data.projects = [];
      if (!data.stock) data.stock = [];
      if (!data.expenses) data.expenses = {};
      if (!data.employees) data.employees = {};
      
      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data);
      
      // Estrutura de dados a ser salva
      const dataToSave: StorageItems = {
        expenses: data.expenses,
        projects: data.projects,
        stock: data.stock,
        employees: data.employees,
        willBaseRate: willValues.willBaseRate,
        willBonus: willValues.willBonus,
        lastSync: data.lastSync || new Date().getTime()
      };
      
      // Converter para string e salvar
      const jsonData = JSON.stringify(dataToSave);
      localStorage.setItem(STORAGE_KEY, jsonData);
      
      console.log('Dados salvos no armazenamento local:', data);
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados no armazenamento local:', error);
      return false;
    }
  },
  
  // Carregar dados do armazenamento local
  load: (): StorageItems | null => {
    try {
      const jsonData = localStorage.getItem(STORAGE_KEY);
      
      if (!jsonData) {
        console.log('Nenhum dado encontrado no armazenamento local');
        return null;
      }
      
      const data = JSON.parse(jsonData) as StorageItems;
      
      // Garantir que os arrays obrigatórios existam
      if (!data.projects) data.projects = [];
      if (!data.stock) data.stock = [];
      if (!data.expenses) data.expenses = {};
      if (!data.employees) data.employees = {};
      
      // Garantir que os valores do Will estejam definidos
      const willValues = ensureWillValues(data);
      data.willBaseRate = willValues.willBaseRate;
      data.willBonus = willValues.willBonus;
      
      return data;
    } catch (error) {
      console.error('Erro ao carregar dados do armazenamento local:', error);
      return null;
    }
  },
  
  // Limpar todos os dados do armazenamento local
  clear: (): boolean => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Dados do armazenamento local limpos');
      return true;
    } catch (error) {
      console.error('Erro ao limpar dados do armazenamento local:', error);
      return false;
    }
  },
  
  // Criar um backup dos dados
  backup: (): string | null => {
    try {
      const jsonData = localStorage.getItem(STORAGE_KEY);
      
      if (!jsonData) {
        console.log('Nenhum dado para fazer backup');
        return null;
      }
      
      // Adicionar timestamp ao backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `${STORAGE_KEY}-backup-${timestamp}`;
      
      localStorage.setItem(backupKey, jsonData);
      console.log('Backup criado com sucesso:', backupKey);
      
      return backupKey;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      return null;
    }
  },
  
  // Restaurar dados de um backup
  restore: (backupKey: string): boolean => {
    try {
      const backupData = localStorage.getItem(backupKey);
      
      if (!backupData) {
        console.error('Backup não encontrado:', backupKey);
        return false;
      }
      
      localStorage.setItem(STORAGE_KEY, backupData);
      console.log('Dados restaurados do backup:', backupKey);
      
      return true;
    } catch (error) {
      console.error('Erro ao restaurar dados do backup:', error);
      return false;
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