// Tipos para despesas
export interface Expense {
  id: string;
  name: string;
  amount: number; // Valor da despesa
  date: string;
  paid: boolean;
  category?: string;
  description?: string;
}

// Tipos para projetos
export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate?: string;
  status: 'in-progress' | 'completed';
  location?: string;
  value: number; // Valor do projeto
  invoiced: boolean;
  projectNumber?: string;
}

// Tipos para funcionários
export interface Employee {
  id: string;
  name: string;
  employeeName: string;
  role?: string;
  weekStartDate: string;
  daysWorked: number;
  dailyRate: number; // Taxa diária (equivalente a 'rate')
  rate: number; // Para compatibilidade com código existente
}

// Tipos para itens de estoque
export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  description: string;
  price: number;
  category: string;
}

// Tipos para UI
export type Category = 'expenses' | 'projects' | 'stock' | 'employees' | 'will';
export type ListName = 'expenses' | 'projects' | 'employees' | 'stock';
export type EmployeeName = 'Matheus' | 'Will' | 'Carlos' | 'Diego' | string;
export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

// Tipos para armazenamento
export interface StorageData {
  expenses: Record<string, Expense[]>;
  projects: Project[];
  employees: Record<string, Employee[]>;
  stock: StockItem[];
  willBaseRate: number;
  willBonus: number;
  lastSync?: number;
}

// Tipos para sincronização
export interface SyncData {
  id: string;
  data: StorageData;
  timestamp: number;
}

export type SyncStatus = 'connected' | 'disconnected' | 'syncing';

// Tipo para itens genéricos (usado em componentes de edição)
export type Item = Expense | Project | StockItem | Employee;

// Tipo para itens de armazenamento (compatibilidade com código existente)
export type StorageItems = StorageData; 