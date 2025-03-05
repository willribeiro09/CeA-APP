import { createClient } from '@supabase/supabase-js';
import { Expense, Project, StockItem, Employee } from '../types';

// Obtém as variáveis de ambiente do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL ou chave anônima não configuradas. Verifique seu arquivo .env'
  );
}

// Cria o cliente do Supabase
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Tipos para as tabelas do Supabase
export type Tables = {
  expenses: Expense;
  projects: Project;
  stock_items: StockItem;
  employees: Employee;
}

/**
 * Verifica se o Supabase está configurado com as variáveis de ambiente necessárias
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
}; 