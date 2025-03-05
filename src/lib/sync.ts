import { supabase } from './supabase';
import { Expense, Project, StockItem, Employee } from '../types';
import { storage } from './storage';

interface SyncData {
  items: {
    expenses: Record<string, Expense[]>;
    projects: Project[];
    stock: StockItem[];
    employees: Record<string, Employee[]>;
  };
  lastSync: number;
}

export const loadInitialData = async (): Promise<SyncData | null> => {
  try {
    const { data, error } = await supabase
      .from('sync_data')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    return null;
  }
};

export const saveData = async (data: SyncData): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('sync_data')
      .upsert(data);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return false;
  }
};

export const syncService = {
  init: async () => {
    const localData = storage.load();
    if (!localData) {
      const remoteData = await loadInitialData();
      if (remoteData) {
        storage.save(remoteData.items);
        return remoteData;
      }
    }
    return null;
  },

  sync: async (data: SyncData['items']) => {
    const success = await saveData({
      items: data,
      lastSync: Date.now()
    });
    return success;
  }
}; 