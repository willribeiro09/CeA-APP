import { Expense, Project, StockItem, Employee } from '../types';

interface StorageItems {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  stock: StockItem[];
  employees: Record<string, Employee[]>;
}

const STORAGE_KEY = 'cea-gutters-data';

export const storage = {
  save: (items: StorageItems) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      return false;
    }
  },

  load: (): StorageItems | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      return false;
    }
  }
}; 