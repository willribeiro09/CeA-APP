import { StorageItems } from '../types';

const STORAGE_KEY = 'expenses-gutters-data';

export const storage = {
  save: (items: StorageItems) => {
    try {
      console.log('Salvando dados no armazenamento local:', JSON.stringify(items));
      
      // Garantir que todos os campos existam
      const dataToSave = {
        expenses: items.expenses || {},
        projects: items.projects || [],
        stock: items.stock || [],
        employees: items.employees || {},
        lastSync: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('Dados salvos no armazenamento local com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados no armazenamento local:', error);
      return false;
    }
  },

  load: (): StorageItems | null => {
    try {
      console.log('Carregando dados do armazenamento local...');
      const data = localStorage.getItem(STORAGE_KEY);
      
      if (!data) {
        console.log('Nenhum dado encontrado no armazenamento local');
        return null;
      }
      
      const parsedData = JSON.parse(data);
      console.log('Dados carregados do armazenamento local:', JSON.stringify(parsedData));
      
      // Verificar se os dados têm a estrutura esperada
      const result: StorageItems = {
        expenses: parsedData.expenses || {},
        projects: parsedData.projects || [],
        stock: parsedData.stock || [],
        employees: parsedData.employees || {},
        lastSync: parsedData.lastSync || Date.now()
      };
      
      // Verificar especificamente os funcionários
      if (result.employees) {
        console.log('Funcionários encontrados no armazenamento local:', JSON.stringify(result.employees));
        
        // Verificar se há funcionários específicos
        const allEmployees = Object.values(result.employees).flat();
        const matheusFound = allEmployees.some(emp => emp.name === 'Matheus' || emp.employeeName === 'Matheus');
        const pauloFound = allEmployees.some(emp => emp.name === 'Paulo' || emp.employeeName === 'Paulo');
        
        console.log(`Funcionário Matheus encontrado no armazenamento local: ${matheusFound}`);
        console.log(`Funcionário Paulo encontrado no armazenamento local: ${pauloFound}`);
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao carregar dados do armazenamento local:', error);
      return null;
    }
  },

  clear: () => {
    try {
      console.log('Limpando dados do armazenamento local...');
      localStorage.removeItem(STORAGE_KEY);
      console.log('Dados do armazenamento local limpos com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao limpar dados do armazenamento local:', error);
      return false;
    }
  },
  
  // Função para obter dados do armazenamento local
  getData: (): StorageItems => {
    const data = storage.load();
    if (!data) {
      console.log('Nenhum dado encontrado, retornando estrutura vazia');
      return {
        expenses: {},
        projects: [],
        stock: [],
        employees: {},
        lastSync: Date.now()
      };
    }
    return data;
  },

  // Função para salvar dados no armazenamento local
  saveData: (items: StorageItems): boolean => {
    return storage.save(items);
  }
};

// Função para obter dados do armazenamento local
export const getData = (): StorageItems => {
  return storage.getData();
};

// Função para salvar dados no armazenamento local
export const saveData = (items: StorageItems): boolean => {
  return storage.saveData(items);
}; 