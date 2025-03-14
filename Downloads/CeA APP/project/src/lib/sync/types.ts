import { RealtimeChannel } from '@supabase/supabase-js';

// Constantes para tipos de alteração
export const CHANGE_TYPE = {
  ADD: 'add' as const,
  UPDATE: 'update' as const,
  DELETE: 'delete' as const
};

// Tipo para valores de alteração
export type ChangeTypeValue = typeof CHANGE_TYPE[keyof typeof CHANGE_TYPE];

// Interface para eventos de alteração
export interface ChangeEvent {
  id: string;
  itemId: string;
  itemType: 'expense' | 'project' | 'stock' | 'employee' | 'willSettings';
  changeType: ChangeTypeValue;
  data: any | null;
  timestamp: number;
  sessionId: string;
  listName?: string;
}

// Canais de sincronização para cada tipo de dados
export type SyncChannels = {
  expenses: RealtimeChannel | null;
  employees: RealtimeChannel | null;
  projects: RealtimeChannel | null;
  stock: RealtimeChannel | null;
  willSettings: RealtimeChannel | null;
};

// Interface para as despesas adaptadas ao formato de banco de dados
export interface DBExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  project?: string;
  photo_url?: string;
  is_paid: boolean;
}

// Interface para os funcionários adaptados ao formato de banco de dados
export interface DBEmployee {
  id: string;
  name: string;
  role?: string;
  base_rate: number;
  bonus: number;
  expenses: any[];
}

// Interface para os projetos adaptados ao formato de banco de dados
export interface DBProject {
  id: string;
  name: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
}

// Interface para os itens de estoque adaptados ao formato de banco de dados
export interface DBStockItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  project?: string;
} 