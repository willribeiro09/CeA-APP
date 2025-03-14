import { StorageData } from '../types';

// Chave para armazenamento local
const STORAGE_KEY = 'cea_app_data';

/**
 * Obtém os dados do armazenamento local
 */
export function getData(): StorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    
    // Retorna dados iniciais se não houver dados armazenados
    return {
      expenses: {},
      projects: [],
      employees: {},
      stock: [],
      willBaseRate: 0,
      willBonus: 0,
      lastSync: Date.now()
    };
  } catch (error) {
    console.error('Erro ao obter dados do armazenamento:', error);
    
    // Retorna dados iniciais em caso de erro
    return {
      expenses: {},
      projects: [],
      employees: {},
      stock: [],
      willBaseRate: 0,
      willBonus: 0,
      lastSync: Date.now()
    };
  }
}

/**
 * Salva os dados no armazenamento local
 */
export function saveData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar dados no armazenamento:', error);
  }
}

/**
 * Limpa os dados do armazenamento local
 */
export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao limpar dados do armazenamento:', error);
  }
}

/**
 * Exporta os dados para um arquivo JSON
 */
export function exportData(): void {
  try {
    const data = getData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `cea_app_backup_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
  }
}

/**
 * Importa os dados de um arquivo JSON
 */
export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData) as StorageData;
    
    // Verifica se os dados são válidos
    if (!data.expenses || !data.projects || !data.employees || !data.stock) {
      throw new Error('Dados inválidos');
    }
    
    // Salva os dados importados
    saveData(data);
    return true;
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    return false;
  }
} 